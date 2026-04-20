const request = require('supertest');
const app = require('../../src/app');

/**
 * Garante que o PUT de tarefa de projeto com corpo { status } só
 * (fluxo Kanban) passa validação (200), e que status inválido retorna 422.
 * Requer base de dados e .env.test (ver tests/integration/setup.js).
 */
describe('Project tasks: Kanban PUT (status only)', () => {
  let authToken = '';
  let projectId = '';
  let taskId = '';
  const loginBody = {
    email: 'admin@g360.com.br',
    password: 'L89*Eb5v@',
    tenantSlug: 'master',
  };

  beforeAll(async () => {
    const res = await request(app).post('/api/v1/auth/login').send(loginBody);
    if (res.statusCode !== 200 || !res.body?.token) {
      throw new Error(
        `Login falhou (status ${res.statusCode}): ` + JSON.stringify(res.body),
      );
    }
    authToken = res.body.token;
  });

  it('deve criar projeto e tarefa, depois PUT { status: IN_PROGRESS } = 200', async () => {
    const p = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'E2E Kanban project-tasks',
        description: 'integration',
        startDate: '2026-04-01',
        endDate: '2026-12-31',
        type: 'INTERNO',
        priority: 'HIGH',
        status: 'PLANNING',
      });
    expect(p.statusCode).toBe(201);
    projectId = p.body.id;

    const t = await request(app)
      .post('/api/v1/project-tasks')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        projectId,
        title: 'Tarefa Kanban',
        status: 'TODO',
        priority: 'MEDIUM',
      });
    expect(t.statusCode).toBe(201);
    taskId = t.body.id;

    const up = await request(app)
      .put(`/api/v1/project-tasks/${taskId}?update=status-only`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('Content-Type', 'application/json')
      .send({ status: 'IN_PROGRESS' });

    expect(up.statusCode).toBe(200);
    expect(up.body.status).toBe('IN_PROGRESS');
  });

  it('deve rejeitar status inválido com 422', async () => {
    expect(taskId).toBeTruthy();
    const bad = await request(app)
      .put(`/api/v1/project-tasks/${taskId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ status: 'NÃO_EXISTE' });
    expect(bad.statusCode).toBe(422);
    expect(String(bad.body?.message || '')).toMatch(/Status inválido|status/i);
  });

  it('com ?update=status-only, eco extra no corpo ainda muda coluna (200)', async () => {
    const p = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'E2E echo extra',
        startDate: '2026-04-01',
        endDate: '2026-12-31',
        type: 'INTERNO',
        priority: 'MEDIUM',
        status: 'PLANNING',
      });
    expect(p.statusCode).toBe(201);
    const t = await request(app)
      .post('/api/v1/project-tasks')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ projectId: p.body.id, title: 'Echo', status: 'TODO', priority: 'LOW' });
    expect(t.statusCode).toBe(201);
    const id = t.body.id;
    const up = await request(app)
      .put(`/api/v1/project-tasks/${id}?update=status-only`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        id,
        projectId: p.body.id,
        title: 'não',
        status: 'DONE',
        description: 'echo',
        progress: 0,
      });
    expect(up.statusCode).toBe(200);
    expect(up.body.status).toBe('DONE');
    await request(app).delete(`/api/v1/project-tasks/${id}`).set('Authorization', `Bearer ${authToken}`);
    await request(app).delete(`/api/v1/projects/${p.body.id}`).set('Authorization', `Bearer ${authToken}`);
  });

  it('deve apagar tarefa e projeto (limpeza)', async () => {
    if (taskId) {
      const d1 = await request(app)
        .delete(`/api/v1/project-tasks/${taskId}`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(d1.statusCode).toBe(204);
    }
    if (projectId) {
      const d2 = await request(app)
        .delete(`/api/v1/projects/${projectId}`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(d2.statusCode).toBe(204);
    }
  });
});
