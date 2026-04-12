const request = require('supertest');
const app = require('../../src/app');

describe('Ticket API Integration', () => {
  let validToken = '';
  let testTicketId = '';

  beforeAll(async () => {
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@g360.com.br', password: 'L89*Eb5v@', tenantSlug: 'master' });
    validToken = loginRes.body.token;
  });

  it('should create a new Ticket', async () => {
    const res = await request(app)
      .post('/api/v1/tickets')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        title: 'Notebook não liga (Test)',
        description: 'Estou tentando ligar e não dá tela.',
        priority: 'HIGH'
      });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('code');
    expect(res.body.title).toBe('Notebook não liga (Test)');
    testTicketId = res.body.id;
  });

  it('should fetch Tickets (Index)', async () => {
    const res = await request(app)
      .get('/api/v1/tickets')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    const found = res.body.find(t => t.id === testTicketId);
    expect(found).toBeDefined();
  });

  it('should fetch Ticket Details', async () => {
    const res = await request(app)
      .get(`/api/v1/tickets/${testTicketId}`)
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.id).toBe(testTicketId);
    expect(res.body).toHaveProperty('messages');
  });

  it('should add a Message to the Ticket', async () => {
    const res = await request(app)
      .post(`/api/v1/tickets/${testTicketId}/messages`)
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        content: 'Já tentou tirar da tomada?',
        isInternal: false
      });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('content', 'Já tentou tirar da tomada?');
  });

  it('should UPDATE the Ticket Status to RESOLVED', async () => {
    const res = await request(app)
      .patch(`/api/v1/tickets/${testTicketId}/status`)
      .set('Authorization', `Bearer ${validToken}`)
      .send({ status: 'RESOLVED' });

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('RESOLVED');
  });
});
