// Postgres local de desenvolvimento (PGlite), para rodar e testar o SIGAF sem internet.
// Uso: npm run db:local   e no .env: DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5433/postgres  DB_SSL=false
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';

const pasta = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.pglite');
const porta = Number(process.env.PGLITE_PORT || 5433);

const db = await PGlite.create(pasta);
const servidor = new PGLiteSocketServer({ db, port: porta, host: '127.0.0.1', maxConnections: 20 });
await servidor.start();
console.log(`Postgres local (PGlite) em postgresql://postgres:postgres@127.0.0.1:${porta}/postgres`);

const encerrar = async () => {
  await servidor.stop();
  await db.close();
  process.exit(0);
};
process.on('SIGINT', encerrar);
process.on('SIGTERM', encerrar);
