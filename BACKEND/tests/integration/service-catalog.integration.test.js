const request = require('supertest');
const app = require('../../src/app');

describe('Service Catalog API Integration', () => {
  let validToken = '';
  let categoryId = '';
  let serviceId = '';

  beforeAll(async () => {
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@g360.com.br', password: 'L89*Eb5v@', tenantSlug: 'master' });
    validToken = loginRes.body.token;
  });

  // CATEGORIA CRUD
  it('should create a new TicketCategory', async () => {
    const res = await request(app)
      .post('/api/v1/service-catalog/categories')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ name: 'Categoria de Teste Jest' });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.name).toBe('Categoria de Teste Jest');
    categoryId = res.body.id;
  });

  it('should fetch TicketCategories', async () => {
    const res = await request(app)
      .get('/api/v1/service-catalog/categories')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    const cat = res.body.find(c => c.id === categoryId);
    expect(cat).toBeDefined();
  });

  it('should update a TicketCategory', async () => {
    const res = await request(app)
      .put(`/api/v1/service-catalog/categories/${categoryId}`)
      .set('Authorization', `Bearer ${validToken}`)
      .send({ name: 'Categoria Atualizada Jest' });

    expect(res.statusCode).toBe(200);
    expect(res.body.name).toBe('Categoria Atualizada Jest');
  });

  // SERVICE CRUD
  it('should create a new ServiceCatalog Item', async () => {
    const res = await request(app)
      .post('/api/v1/service-catalog')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ 
        name: 'Serviço de Teste', 
        description: 'Mock para SLA', 
        categoryId 
      });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.name).toBe('Serviço de Teste');
    serviceId = res.body.id;
  });

  it('should fetch ServiceCatalog items', async () => {
    const res = await request(app)
      .get(`/api/v1/service-catalog?categoryId=${categoryId}`)
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    const svc = res.body.find(s => s.id === serviceId);
    expect(svc).toBeDefined();
  });

  // DELETIONS
  it('should soft delete the Service', async () => {
    const res = await request(app)
      .delete(`/api/v1/service-catalog/${serviceId}`)
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.statusCode).toBe(204);
  });

  it('should soft delete the Category', async () => {
    const res = await request(app)
      .delete(`/api/v1/service-catalog/categories/${categoryId}`)
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.statusCode).toBe(204);
  });
});
