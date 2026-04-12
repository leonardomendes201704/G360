const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  // 1. Procurar o token no Header (Authorization: Bearer <token>)
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: 'Token não fornecido.' });
  }

  // O formato é "Bearer eyJhbGciOi..."
  const parts = authHeader.split(' ');

  if (parts.length !== 2) {
    return res.status(401).json({ message: 'Erro no formato do Token.' });
  }

  const [scheme, token] = parts;

  if (!/^Bearer$/i.test(scheme)) {
    return res.status(401).json({ message: 'Token mal formatado.' });
  }

  // 2. Verificar a validade do token
  jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] }, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: 'Token inválido ou expirado.' });
    }

    // 3. Injetar os dados do utilizador na requisição
    // payload inclui: userId, email, roles, tenantSlug, schemaName
    req.user = decoded;

    return next();
  });
};

module.exports = authMiddleware;
