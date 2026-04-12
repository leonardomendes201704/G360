const request = require('supertest');
const app = require('../../src/app');

describe('Projects API Integration', () => {
  let authToken = '';
  let projectId = '';

  beforeAll(async () => {
    // Autenticar para obter o token para os testes
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@g360.com.br',
        password: 'L89*Eb5v@',
        tenantSlug: 'master'
      });
    
    authToken = res.body.token;
  });

  it('should create a new project', async () => {
    const res = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Integration Test Project',
        description: 'Created by Supertest in DB',
        startDate: '2026-04-01',
        endDate: '2026-12-31',
        type: 'INTERNO',
        priority: 'HIGH',
        status: 'PLANNING'
      });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.name).toBe('Integration Test Project');
    projectId = res.body.id;
  });

  it('should list projects and find the created one', async () => {
    const res = await request(app)
      .get('/api/v1/projects')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.statusCode).toBe(200);
    
    // Confirma que o projeto recém criado está no banco e foi retornado pela rota
    const list = Array.isArray(res.body) ? res.body : res.body.data;
    const found = list.find(p => p.id === projectId);
    expect(found).toBeDefined();
    expect(found.name).toBe('Integration Test Project');
  });

  it('should update the project', async () => {
    const res = await request(app)
      .put(`/api/v1/projects/${projectId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Updated Test Project',
        status: 'ACTIVE'
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.name).toBe('Updated Test Project');
    expect(res.body.status).toBe('ACTIVE');
  });

  it('should return 401 when trying to delete without token', async () => {
    const res = await request(app)
      .delete(`/api/v1/projects/${projectId}`);
    
    expect(res.statusCode).toBe(401);
  });

  it('should delete the project via soft delete', async () => {
    const res = await request(app)
      .delete(`/api/v1/projects/${projectId}`)
      .set('Authorization', `Bearer ${authToken}`);

    // As rotas de deleção costumam retornar 204 de No Content
    expect(res.statusCode).toBe(204);

    // Após o soft delete/delete, o getById deve falhar
    const checkRes = await request(app)
      .get(`/api/v1/projects/${projectId}`)
      .set('Authorization', `Bearer ${authToken}`);
      
    expect(checkRes.statusCode).toBe(404);
  });
});
