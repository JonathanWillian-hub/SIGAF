import { obterCliente, pool } from '../config/db.js';
import { env } from '../config/env.js';

const MIGRACOES = [
  'ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS cargo VARCHAR(80)',
  'ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS telefone VARCHAR(20)',
  'ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS foto TEXT',
  'ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS notificar_email BOOLEAN NOT NULL DEFAULT TRUE',
];

async function main() {
  const host = (() => { try { return new URL(env.db.url).host; } catch { return '?'; } })();
  console.log(`> Atualizando a estrutura do banco em ${host}...`);
  const cliente = await obterCliente();
  try {
    for (const sql of MIGRACOES) await cliente.query(sql);
  } finally {
    cliente.release();
  }
  console.log('> Banco atualizado.');
  await pool.end();
}

main().catch((e) => { console.error(e.message); process.exit(1); });
