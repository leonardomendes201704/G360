const request = require('supertest');
const app = require('../../src/app');

describe('Suppliers API Integration', () => {
  let authToken = '';
  let supplierId = '';

  beforeAll(async () => {
    // Autenticar para obter o token para Super Admin
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@g360.com.br',
        password: 'L89*Eb5v@',
        tenantSlug: 'master'
      });
      
    authToken = res.body.token;
  });

  it('should create a new supplier', async () => {
    const res = await request(app)
      .post('/api/v1/suppliers')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Tech Corp Fornecedor Teste',
        tradeName: 'Tech Corp',
        document: '12345678000199',
        documentType: 'CNPJ',
        email: 'contato@techcorp.test',
        classification: 'ESTRATEGICO'
      });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.name).toBe('Tech Corp Fornecedor Teste');
    supplierId = res.body.id;
  });

  it('should list suppliers and find the created one', async () => {
    const res = await request(app)
      .get('/api/v1/suppliers')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.statusCode).toBe(200);
    
    // Lida com resposta direta ou paginada
    const list = Array.isArray(res.body) ? res.body : res.body.data;
    expect(Array.isArray(list)).toBe(true);

    const found = list.find(s => s.id === supplierId);
    expect(found).toBeDefined();
    expect(found.document).toBe('12345678000199');
  });

  it('should get supplier by ID', async () => {
    const res = await request(app)
      .get(`/api/v1/suppliers/${supplierId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.id).toBe(supplierId);
  });

  it('should update the supplier classification', async () => {
    const res = await request(app)
      .put(`/api/v1/suppliers/${supplierId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        classification: 'CRITICO'
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.classification).toBe('CRITICO');
  });

  it('should delete the supplier (soft delete ou hard delete depende do service)', async () => {
    const res = await request(app)
      .delete(`/api/v1/suppliers/${supplierId}`)
      .set('Authorization', `Bearer ${authToken}`);

    // As rotas de deleção podem retornar 204 No Content ou 200
    expect([200, 204]).toContain(res.statusCode);

    // Após o delete, o getById deve falhar
    const checkRes = await request(app)
      .get(`/api/v1/suppliers/${supplierId}`)
      .set('Authorization', `Bearer ${authToken}`);
      
    expect(checkRes.statusCode).toBe(404);
  });
});
