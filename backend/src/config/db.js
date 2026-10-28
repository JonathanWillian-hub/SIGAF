// Conexão com o PostgreSQL do Supabase.
// As consultas do sistema usam "?" como marcador; aqui ele vira $1, $2... do Postgres.
import fs from 'node:fs';
import pg from 'pg';
import { attachDatabasePool } from '@vercel/functions';
import { env } from './env.js';

// Datas, horários e carimbos de tempo voltam como texto (ex.: "2026-10-26", "14:00:00",
// "2026-10-26 13:07:00"), do mesmo jeito que o front-end já espera.
pg.types.setTypeParser(1082, (v) => v); // date
pg.types.setTypeParser(1083, (v) => v); // time
pg.types.setTypeParser(1114, (v) => v.slice(0, 19)); // timestamp
pg.types.setTypeParser(20, (v) => Number(v)); // bigint (COUNT, SUM) vira número

// timestamptz: o instante é convertido aqui para o horário de Brasília, sem depender do fuso
// configurado na conexão (no pooler em modo transação, usado na Vercel, não dá para fixar o fuso).
const formatoBrasilia = new Intl.DateTimeFormat('sv-SE', {
  timeZone: env.db.fusoHorario, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
});
pg.types.setTypeParser(1184, (v) => {
  const iso = v.replace(' ', 'T').replace(/([+-]\d\d)$/, '$1:00');
  const data = new Date(iso);
  return Number.isNaN(data.getTime()) ? v.slice(0, 19) : formatoBrasilia.format(data);
});

// Porta 6543 = pooler do Supabase em modo transação (indicado para serverless, como a Vercel).
// Nesse modo não se guarda configuração de sessão, então o SET só é feito na porta 5432 ou no banco local.
const modoTransacao = (() => { try { return new URL(env.db.url).port === '6543'; } catch { return false; } })();

if (!env.db.url) {
  console.error('DATABASE_URL não definida. Copie .env.example para .env e cole a string de conexão do Supabase.');
}
if (!/^[a-z_][a-z0-9_]*$/.test(env.db.schema)) throw new Error('DB_SCHEMA inválido.');

// RNF01: conexão sempre criptografada. Com DB_SSL_CA (certificado baixado no painel do Supabase,
// em Database > SSL Configuration) o certificado do servidor também é validado.
function configurarSsl() {
  if (!env.db.ssl) return false;
  if (env.db.caSsl) return { ca: fs.readFileSync(env.db.caSsl, 'utf8'), rejectUnauthorized: true };
  console.warn('[db] DB_SSL_CA não definido: conexão criptografada, mas sem validar o certificado do Supabase.');
  return { rejectUnauthorized: false };
}

export const pool = new pg.Pool({
  connectionString: env.db.url,
  ssl: configurarSsl(),
  max: env.db.maxConexoes,
  // Na Vercel, conexões paradas são fechadas logo para não esgotar o pooler do Supabase.
  idleTimeoutMillis: env.naVercel ? 5000 : 10000,
});
if (env.naVercel) attachDatabasePool(pool);

// Cada conexão nova é preparada uma vez (schema do SIGAF e fuso de Brasília) antes de ser usada.
const preparadas = new WeakSet();
export async function obterCliente() {
  if (modoTransacao && env.db.schema !== 'public') {
    throw new Error('No modo transação (porta 6543) as tabelas precisam estar no schema public.');
  }
  const cliente = await pool.connect();
  if (!modoTransacao && !preparadas.has(cliente)) {
    try {
      await cliente.query(`SET search_path TO ${env.db.schema}, public; SET TIME ZONE '${env.db.fusoHorario}'`);
      preparadas.add(cliente);
    } catch (erro) {
      cliente.release(erro);
      throw erro;
    }
  }
  return cliente;
}

export function converterMarcadores(sql) {
  let n = 0;
  return sql.replace(/\?/g, () => `$${++n}`);
}

async function executar(cliente, sql, params = []) {
  const r = await cliente.query(converterMarcadores(sql), params);
  return r.rows;
}

/** Executa uma consulta e devolve as linhas. */
export async function query(sql, params = []) {
  const cliente = await obterCliente();
  try {
    return await executar(cliente, sql, params);
  } finally {
    cliente.release();
  }
}

/** Executa várias consultas na mesma transação (tudo ou nada). */
export async function transacao(fn) {
  const cliente = await obterCliente();
  try {
    await cliente.query('BEGIN');
    const resultado = await fn({ query: (sql, params) => executar(cliente, sql, params) });
    await cliente.query('COMMIT');
    return resultado;
  } catch (erro) {
    await cliente.query('ROLLBACK');
    throw erro;
  } finally {
    cliente.release();
  }
}

/** Expressão SQL com a duração do registro em minutos. */
export const MINUTOS = `(EXTRACT(EPOCH FROM (r.horario_fim - r.horario_inicio)) / 60)::int`;
