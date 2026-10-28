import { Router } from 'express';
import { query } from '../../config/db.js';

const rotas = Router();

rotas.get('/resumo', async (_req, res) => {
  const [perfis, setores, chamados, recentes, [acessos]] = await Promise.all([
    query(
      `SELECT perfil, COUNT(*) FILTER (WHERE ativo)::int AS ativos, COUNT(*) FILTER (WHERE NOT ativo)::int AS inativos
         FROM usuarios GROUP BY perfil`,
    ),
    query(
      `SELECT s.id, s.nome, s.codigo, s.ativo,
              COUNT(u.id) FILTER (WHERE u.perfil = 'GESTOR' AND u.ativo)::int AS gestores,
              COUNT(u.id) FILTER (WHERE u.perfil = 'COLABORADOR' AND u.ativo)::int AS colaboradores,
              COUNT(u.id) FILTER (WHERE NOT u.ativo)::int AS inativos
         FROM setores s LEFT JOIN usuarios u ON u.setor_id = s.id
        GROUP BY s.id ORDER BY s.nome`,
    ),
    query('SELECT status, COUNT(*)::int AS total FROM chamados GROUP BY status'),
    query(
      `SELECT c.id, c.titulo, c.status, c.prioridade, c.atualizado_em AS "atualizadoEm", u.nome AS "solicitanteNome"
         FROM chamados c JOIN usuarios u ON u.id = c.solicitante_id
        WHERE c.status <> 'RESOLVIDO'
        ORDER BY CASE c.prioridade WHEN 'ALTA' THEN 0 WHEN 'MEDIA' THEN 1 ELSE 2 END, c.atualizado_em DESC
        LIMIT 6`,
    ),
    query(
      `SELECT COUNT(DISTINCT usuario_id)::int AS "ultimos7Dias" FROM logs_auditoria
        WHERE acao = 'LOGIN' AND data_hora >= CURRENT_TIMESTAMP - INTERVAL '7 days'`,
    ),
  ]);

  const usuarios = { ativos: 0, inativos: 0, porPerfil: {} };
  perfis.forEach((p) => {
    usuarios.ativos += p.ativos;
    usuarios.inativos += p.inativos;
    usuarios.porPerfil[p.perfil] = { ativos: p.ativos, inativos: p.inativos };
  });
  const totaisChamados = { ABERTO: 0, EM_ATENDIMENTO: 0, RESOLVIDO: 0 };
  chamados.forEach((c) => { totaisChamados[c.status] = c.total; });

  res.json({
    usuarios,
    acessosUltimos7Dias: acessos.ultimos7Dias,
    setores,
    chamados: { totais: totaisChamados, recentes },
  });
});

export default rotas;
