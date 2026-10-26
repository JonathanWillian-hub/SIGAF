import mysql from 'mysql2/promise';
import { env } from './env.js';

// Pool de conexões com o MySQL. dateStrings evita conversão de fuso em DATE/TIME.
export const pool = mysql.createPool({
  ...env.db,
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true,
  timezone: 'local',
});

export async function query(sql, params = []) {
  const [linhas] = await pool.query(sql, params);
  return linhas;
}

export async function transacao(fn) {
  const conexao = await pool.getConnection();
  try {
    await conexao.beginTransaction();
    const resultado = await fn(conexao);
    await conexao.commit();
    return resultado;
  } catch (erro) {
    await conexao.rollback();
    throw erro;
  } finally {
    conexao.release();
  }
}
