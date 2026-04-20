/**
 * One-off: PUT /project-tasks/:id?update=status-only com JWT de um user real.
 * Uso: node scripts/test-put-project-task-on-hold.js [taskId]
 */
require('dotenv').config();
const { prisma } = require('../src/config/database');
const jwt = require('jsonwebtoken');

const taskId = process.argv[2] || '381546ef-9af9-4743-9f80-fdcf0d66accc';

async function main() {
  const users = await prisma.user.findMany({ take: 40, include: { roles: true } });
  const u = users.find((x) => x.roles?.some((r) => /admin|super/i.test(r.name))) || users[0];
  if (!u) {
    console.error('Nenhum utilizador na BD.');
    process.exit(1);
  }
  const roleIds = u.roles.map((r) => r.id);
  const token = jwt.sign(
    {
      userId: u.id,
      email: u.email,
      roles: roleIds,
      tenantSlug: 'default',
      schemaName: 'public',
    },
    process.env.JWT_SECRET,
    { algorithm: 'HS256', expiresIn: '1h' },
  );

  const url = `http://localhost:8500/api/v1/project-tasks/${taskId}?update=status-only`;
  const r = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'X-Tenant-Slug': 'default',
    },
    body: JSON.stringify({ status: 'ON_HOLD' }),
  });
  const text = await r.text();
  console.log('user:', u.email, 'roles:', u.roles.map((x) => x.name).join(', '));
  console.log('PUT', url);
  console.log('HTTP', r.status);
  if (r.status === 422) {
    console.log(
      '\nSe 422 "Status inválido": o processo em :8500 pode ser antigo. Pare o backend e inicie de novo a partir de BACKEND (ex.: npm run dev).',
    );
  }
  try {
    const j = JSON.parse(text);
    console.log(JSON.stringify(j, null, 2));
  } catch {
    console.log(text);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
