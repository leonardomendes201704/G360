const request = require('supertest');
const app = require('../../src/app');

// Supertest já cuidará de abrir e fechar a conexão HTTP temporária no app.listen não exportado
describe('Auth API Integration', () => {

  let validToken = '';
  let validRefreshToken = '';

  it('should FAIL to login with incorrect password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@g360.com.br',
        password: 'wrong_password',
        tenantSlug: 'master'
      });
      
    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty('status', 'error');
    expect(res.body).toHaveProperty('message');
  });

  it('should LOGIN with correct credentials', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@g360.com.br',
        password: 'L89*Eb5v@',
        tenantSlug: 'master'
      });
      
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('user');
    expect(res.body.user).toHaveProperty('email', 'admin@g360.com.br');
    
    // Armazena tokens para uso nas próximas rotas
    validToken = res.body.token;
  });

  it('should fetch ME profile data', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('email', 'admin@g360.com.br');
    expect(res.body).not.toHaveProperty('password'); // Segurança
  });

  it('should FAIL to fetch ME profile without token', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me');

    expect(res.statusCode).toBe(401);
  });
});
