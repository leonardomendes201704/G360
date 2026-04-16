const path = require('path');
const { Client } = require(path.join(__dirname, '..', 'BACKEND', 'node_modules', 'pg'));

async function main() {
  const c = new Client({ connectionString: 'postgresql://postgres@127.0.0.1:5433/postgres' });
  await c.connect();
  await c.query('DROP DATABASE IF EXISTS g360');
  await c.query('DROP USER IF EXISTS g360_dev');
  await c.query("CREATE USER g360_dev WITH PASSWORD 'G360localDev2026'");
  await c.query('CREATE DATABASE g360 OWNER g360_dev');
  await c.query('GRANT ALL PRIVILEGES ON DATABASE g360 TO g360_dev');
  console.log('OK: database g360 + user g360_dev');
  await c.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
