import { query } from '../../config/db.js';

export async function registrarLog({ usuarioId, acao, entidade, entidadeId = null, detalhes = null, ip = null }, conexao = { query }) {
  await conexao.query(
    `INSERT INTO logs_auditoria (usuario_id, acao, entidade, entidade_id, detalhes, ip)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [usuarioId ?? null, acao, entidade, entidadeId, detalhes ? JSON.stringify(detalhes) : null, ip],
  );
}

export async function listarLogs({ pagina = 1, porPagina = 20, acao, entidade, usuarioId } = {}) {
  const onde = [];
  const params = [];
  if (acao) { onde.push('l.acao = ?'); params.push(acao); }
  if (entidade) { onde.push('l.entidade = ?'); params.push(entidade); }
  if (usuarioId) { onde.push('l.usuario_id = ?'); params.push(usuarioId); }
  const where = onde.length ? `WHERE ${onde.join(' AND ')}` : '';
  const limite = Math.min(Number(porPagina) || 20, 100);
  const offset = (Math.max(Number(pagina) || 1, 1) - 1) * limite;

  const [{ total }] = await query(`SELECT COUNT(*) AS total FROM logs_auditoria l ${where}`, params);
  const itens = await query(
    `SELECT l.id, l.acao, l.entidade, l.entidade_id AS "entidadeId", l.detalhes, l.ip,
            l.data_hora AS "dataHora", u.nome AS "usuarioNome", u.matricula AS "usuarioMatricula"
       FROM logs_auditoria l LEFT JOIN usuarios u ON u.id = l.usuario_id
       ${where} ORDER BY l.id DESC LIMIT ? OFFSET ?`,
    [...params, limite, offset],
  );
  return { itens, total: Number(total), pagina: Number(pagina) || 1, porPagina: limite };
}
