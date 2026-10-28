import { query } from '../../config/db.js';

const SELECT_BASE = `
  SELECT r.id, r.categoria, r.data, r.horario_inicio AS "horarioInicio", r.horario_fim AS "horarioFim",
         (EXTRACT(EPOCH FROM (r.horario_fim - r.horario_inicio)) / 60)::int AS minutos,
         r.descricao_tarefas AS "descricaoTarefas", r.data_criacao AS "dataCriacao",
         r.status, r.justificativa, r.homologado_em AS "homologadoEm",
         r.executor_id AS "executorId", e.nome AS "executorNome", e.matricula AS "executorMatricula",
         r.substituido_id AS "substituidoId", s.nome AS "substituidoNome", s.matricula AS "substituidoMatricula",
         r.setor_id AS "setorId", st.nome AS "setorNome",
         r.disciplina_id AS "disciplinaId", d.nome AS "disciplinaNome",
         r.criado_por_id AS "criadoPorId", c.nome AS "criadoPorNome",
         h.nome AS "homologadoPorNome"
    FROM registros_atividade r
    JOIN usuarios e      ON e.id = r.executor_id
    LEFT JOIN usuarios s ON s.id = r.substituido_id
    JOIN setores st      ON st.id = r.setor_id
    LEFT JOIN disciplinas d ON d.id = r.disciplina_id
    JOIN usuarios c      ON c.id = r.criado_por_id
    LEFT JOIN usuarios h ON h.id = r.homologado_por_id`;

export function montarFiltro(filtros = {}, escopo = { escopo: 'TODOS' }) {
  const onde = [];
  const params = [];

  if (escopo.escopo === 'PROPRIO') {
    onde.push('(r.executor_id = ? OR r.criado_por_id = ?)');
    params.push(escopo.usuarioId, escopo.usuarioId);
  } else if (escopo.escopo === 'EQUIPE' && escopo.setorId) {
    onde.push('r.setor_id = ?');
    params.push(escopo.setorId);
  } else if (escopo.escopo !== 'TODOS') {
    onde.push('1 = 0');
  }

  if (filtros.dataInicio) { onde.push('r.data >= ?'); params.push(filtros.dataInicio); }
  if (filtros.dataFim) { onde.push('r.data <= ?'); params.push(filtros.dataFim); }
  if (filtros.setorId) { onde.push('r.setor_id = ?'); params.push(Number(filtros.setorId)); }
  if (filtros.categoria) { onde.push('r.categoria = ?'); params.push(filtros.categoria); }
  if (filtros.status) { onde.push('r.status = ?'); params.push(filtros.status); }
  if (filtros.profissionalId) {
    onde.push('(r.executor_id = ? OR r.substituido_id = ?)');
    params.push(Number(filtros.profissionalId), Number(filtros.profissionalId));
  }
  if (filtros.profissional) {
    const termo = `%${String(filtros.profissional).trim()}%`;
    onde.push('(e.nome ILIKE ? OR e.matricula ILIKE ? OR s.nome ILIKE ?)');
    params.push(termo, termo, termo);
  }
  if (filtros.busca) {
    const termo = `%${String(filtros.busca).trim()}%`;
    onde.push('(e.nome ILIKE ? OR e.matricula ILIKE ? OR s.nome ILIKE ? OR r.descricao_tarefas ILIKE ? OR st.nome ILIKE ?)');
    params.push(termo, termo, termo, termo, termo);
  }

  return { where: onde.length ? `WHERE ${onde.join(' AND ')}` : '', params };
}

export async function contarRegistros(filtros, escopo) {
  const { where, params } = montarFiltro(filtros, escopo);
  const [{ total }] = await query(
    `SELECT COUNT(*) AS total FROM registros_atividade r
       JOIN usuarios e ON e.id = r.executor_id
       LEFT JOIN usuarios s ON s.id = r.substituido_id
       JOIN setores st ON st.id = r.setor_id ${where}`,
    params,
  );
  return Number(total);
}

export async function resumirRegistros(filtros, escopo) {
  const { where, params } = montarFiltro(filtros, escopo);
  const [t] = await query(
    `SELECT COUNT(*) AS registros,
            COALESCE(SUM((EXTRACT(EPOCH FROM (r.horario_fim - r.horario_inicio)) / 60)::int),0) AS minutos,
            COUNT(*) FILTER (WHERE r.status='PENDENTE') AS pendentes, COUNT(*) FILTER (WHERE r.status='HOMOLOGADO') AS homologados,
            COUNT(*) FILTER (WHERE r.status='REJEITADO') AS rejeitados,
            COUNT(*) FILTER (WHERE r.categoria='SUBSTITUICAO') AS substituicoes,
            COUNT(*) FILTER (WHERE r.categoria IN ('COBERTURA_HORARIO','APOIO_OPERACIONAL')) AS "coberturasApoios",
            COUNT(DISTINCT r.setor_id) AS setores,
            COUNT(DISTINCT r.substituido_id) AS substituidos
       FROM registros_atividade r
       JOIN usuarios e ON e.id = r.executor_id
       LEFT JOIN usuarios s ON s.id = r.substituido_id
       JOIN setores st ON st.id = r.setor_id ${where}`,
    params,
  );
  return Object.fromEntries(Object.entries(t).map(([k, v]) => [k, Number(v) || 0]));
}

export async function listarRegistros(filtros, escopo, { pagina, porPagina } = {}) {
  const { where, params } = montarFiltro(filtros, escopo);
  let sql = `${SELECT_BASE} ${where} ORDER BY r.data DESC, r.horario_inicio DESC, r.id DESC`;
  const p = [...params];
  if (porPagina) {
    sql += ' LIMIT ? OFFSET ?';
    p.push(Number(porPagina), (Math.max(Number(pagina) || 1, 1) - 1) * Number(porPagina));
  }
  return query(sql, p);
}

export async function buscarDetalhe(id) {
  const [linha] = await query(`${SELECT_BASE} WHERE r.id = ?`, [id]);
  return linha || null;
}
