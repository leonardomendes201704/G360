/**
 * LDAP/Active Directory Authentication Service
 * Provides connection and authentication against LDAP/AD servers
 */
// logger.info('Loading ldapjs...');
// const ldap = require('ldapjs'); // Lazy loaded
const UserRepository = require('../repositories/user.repository');
const logger = require('../config/logger');
// LdapService dependencies placeholder.

class LdapService {
    /**
     * Create LDAP client with given configuration
     */
    static createClient(config) {
        const ldap = require('ldapjs'); // Lazy load here
        const url = config.useSsl
            ? `ldaps://${config.host}:${config.port || 636}`
            : `ldap://${config.host}:${config.port || 389}`;

        return ldap.createClient({
            url,
            timeout: 10000,
            connectTimeout: 10000,
            tlsOptions: config.useSsl ? { rejectUnauthorized: false } : undefined
        });
    }

    /**
     * Test LDAP connection with provided configuration
     * @param {Object} config - LDAP configuration
     * @returns {Promise<Object>} - Test result
     */
    static async testConnection(config) {
        return new Promise((resolve, reject) => {
            const client = this.createClient(config);

            client.on('error', (err) => {
                client.destroy();
                reject(new Error(`Erro de conexão LDAP: ${err.message}`));
            });

            // Apenas testa o bind (autenticação do serviço)
            client.bind(config.bindDN, config.bindPassword, (err) => {
                if (err) {
                    client.destroy();
                    reject(new Error(`Falha na autenticação: ${err.message}`));
                    return;
                }

                // Conexão e autenticação bem-sucedidas
                client.unbind();
                resolve({
                    success: true,
                    message: `Conexão LDAP estabelecida com sucesso! Servidor: ${config.host}:${config.port}`
                });
            });
        });
    }

    /**
     * Authenticate user against LDAP server
     * @param {string} username - User's sAMAccountName or email
     * @param {string} password - User's password
     * @param {Object} config - LDAP configuration from Integration
     * @returns {Promise<Object>} - User data if authenticated
     */
    static async authenticate(username, password, config) {
        return new Promise((resolve, reject) => {
            const client = this.createClient(config);

            client.on('error', (err) => {
                client.destroy();
                reject(new Error(`Erro de conexão LDAP: ${err.message}`));
            });

            // First, bind with service account to search for user
            client.bind(config.bindDN, config.bindPassword, (bindErr) => {
                if (bindErr) {
                    client.destroy();
                    reject(new Error('Falha na conexão com o servidor LDAP.'));
                    return;
                }

                // Sanitize username to prevent LDAP injection
                const sanitizedUsername = username.replace(/[\\*()\0]/g, (c) => `\\${c.charCodeAt(0).toString(16).padStart(2, '0')}`);

                // Build search filter (support sAMAccountName or mail)
                const userFilter = config.userSearchFilter
                    ? config.userSearchFilter.replace('{{username}}', sanitizedUsername)
                    : `(|(sAMAccountName=${sanitizedUsername})(mail=${sanitizedUsername}))`;

                const searchOpts = {
                    filter: userFilter,
                    scope: 'sub',
                    attributes: ['dn', 'sAMAccountName', 'displayName', 'mail', 'memberOf']
                };

                client.search(config.baseDN, searchOpts, (searchErr, res) => {
                    if (searchErr) {
                        client.unbind();
                        reject(new Error('Erro ao buscar usuário no diretório.'));
                        return;
                    }

                    let userEntry = null;

                    res.on('searchEntry', (entry) => {
                        userEntry = {
                            dn: entry.dn.toString(),
                            username: entry.object?.sAMAccountName || username,
                            name: entry.object?.displayName || username,
                            email: entry.object?.mail || `${username}@${config.domain || 'local'}`,
                            groups: entry.object?.memberOf || []
                        };
                    });

                    res.on('error', (e) => {
                        client.unbind();
                        reject(new Error(`Erro na busca: ${e.message}`));
                    });

                    res.on('end', (result) => {
                        if (!userEntry) {
                            client.unbind();
                            reject(new Error('Usuário não encontrado no diretório.'));
                            return;
                        }

                        // Now attempt to bind with user's credentials to validate password
                        const userClient = this.createClient(config);

                        userClient.bind(userEntry.dn, password, (userBindErr) => {
                            userClient.destroy();
                            client.unbind();

                            if (userBindErr) {
                                reject(new Error('Credenciais inválidas.'));
                                return;
                            }

                            // Authentication successful
                            resolve(userEntry);
                        });
                    });
                });
            });
        });
    }

    /**
     * Authenticate LDAP user and get/create local user record
     * @param {string} username - LDAP username
     * @param {string} password - LDAP password
     * @param {Object} config - LDAP configuration
     * @returns {Promise<Object>} - Local user record
     */
    static async authenticateAndGetUser(prisma, username, password, config) {
        // 1. Authenticate against LDAP
        const ldapUser = await this.authenticate(username, password, config);

        // 2. Look up user in local database by email
        let localUser = await UserRepository.findByEmail(prisma, ldapUser.email);

        if (!localUser) {
            // User not in local DB - throw error (admin must import first)
            throw new Error(`Usuário ${ldapUser.email} não encontrado no sistema. Peça ao administrador para importá-lo.`);
        }

        if (!localUser.isActive) {
            throw new Error('Usuário inativo. Contacte o administrador.');
        }

        return localUser;
    }
}

module.exports = LdapService;
