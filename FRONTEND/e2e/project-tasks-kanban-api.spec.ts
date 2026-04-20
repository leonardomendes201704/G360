import { test, expect } from '@playwright/test';

/**
 * Chama a API de autenticação e PUT de tarefa (mesmo contrato do Kanban).
 * Requer backend em `E2E_API_BASE` ou http://127.0.0.1:8500.
 * Não inicia o backend: suba com `npm start` no BACKEND ou `SKIP=1` para saltar.
 */
const API =
  process.env.E2E_API_BASE ||
  process.env.PLAYWRIGHT_API_URL ||
  'http://127.0.0.1:8500';

test.describe('API: project-task PUT (status only, Kanban)', () => {
  test.skip(!!process.env.SKIP_API_E2E, 'SKIP_API_E2E=1');

  test('PUT { status: IN_PROGRESS } após login retorna 200', async ({ request }) => {
    const login = await request.post(`${API}/api/v1/auth/login`, {
      data: {
        email: 'admin@g360.com.br',
        password: 'L89*Eb5v@',
        tenantSlug: 'master',
      },
      headers: { 'Content-Type': 'application/json' },
    });

    if (login.status() === 0 || login.status() >= 500) {
      test.skip(true, `API indisponível em ${API} (status ${login.status()})`);
    }
    if (login.status() !== 200) {
      test.skip(true, `Login falhou (status ${login.status()}). Ver credenciais/DB.`);
    }
    const { token } = (await login.json()) as { token: string };
    expect(token).toBeTruthy();

    const createProject = await request.post(`${API}/api/v1/projects`, {
      data: {
        name: 'E2E API Kanban ' + Date.now(),
        description: 'playwright',
        startDate: '2026-04-01',
        endDate: '2026-12-31',
        type: 'INTERNO',
        priority: 'HIGH',
        status: 'PLANNING',
      },
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    if (createProject.status() !== 201) {
      const t = await createProject.text();
      test.skip(true, 'Criar projeto falhou: ' + createProject.status() + ' ' + t);
    }
    const project = (await createProject.json()) as { id: string };

    const createTask = await request.post(`${API}/api/v1/project-tasks`, {
      data: {
        projectId: project.id,
        title: 'Tarefa E2E',
        status: 'TODO',
        priority: 'MEDIUM',
      },
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    expect(createTask.status()).toBe(201);
    const task = (await createTask.json()) as { id: string };

    const put = await request.put(
      `${API}/api/v1/project-tasks/${task.id}?update=status-only`,
      {
        data: { status: 'IN_PROGRESS' },
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      },
    );
    if (put.status() === 422) {
      const j = (await put.json().catch(() => ({}))) as { message?: string; errors?: unknown[] };
      throw new Error(
        `PUT status-only devolveu 422. Corpo: ${JSON.stringify(j)}. Base API: ${API}`,
      );
    }
    expect(put.status()).toBe(200);
    const out = (await put.json()) as { status: string };
    expect(out.status).toBe('IN_PROGRESS');

    await request.delete(`${API}/api/v1/project-tasks/${task.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    await request.delete(`${API}/api/v1/projects/${project.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  });
});
