import { Router } from 'express';
import { MINUTOS, query } from '../../config/db.js';
import { montarFiltro, listarRegistros } from '../registros/registros.repository.js';

const rotas = Router();

const JOIN = `FROM registros_atividade r
  JOIN usuarios e ON e.id = r.executor_id
  LEFT JOIN usuarios s ON s.id = r.substituido_id
  JOIN setores st ON st.id = r.setor_id`;

function periodo(diasAtras, duracao) {
  const fim = new Date();
  fim.setDate(fim.getDate() - diasAtras);
  const ini = new Date(fim);
  ini.setDate(ini.getDate() - (duracao - 1));
  const f = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { dataInicio: f(ini), dataFim: f(fim) };
}

async function totais(filtros, escopo) {
  const { where, params } = montarFiltro(filtros, escopo);
  const [t] = await query(
    `SELECT COUNT(*) AS registros,
            COALESCE(SUM((EXTRACT(EPOCH FROM (r.horario_fim - r.horario_inicio)) / 60)::int),0) AS minutos,
            COUNT(*) FILTER (WHERE r.categoria='ATIVIDADE_EXTRAORDINARIA') AS extraordinarias,
            COUNT(*) FILTER (WHERE r.categoria='SUBSTITUICAO') AS substituicoes,
            COUNT(*) FILTER (WHERE r.categoria='COBERTURA_HORARIO') AS coberturas,
            COUNT(*) FILTER (WHERE r.categoria='APOIO_OPERACIONAL') AS apoios,
            COUNT(DISTINCT r.setor_id) AS setores,
            COUNT(*) FILTER (WHERE r.status='PENDENTE') AS pendentes,
            COUNT(*) FILTER (WHERE r.status='HOMOLOGADO') AS homologados,
            COUNT(*) FILTER (WHERE r.status='REJEITADO') AS rejeitados
       ${JOIN} ${where}`,
    params,
  );
  return Object.fromEntries(Object.entries(t).map(([k, v]) => [k, Number(v) || 0]));
}

rotas.get('/', async (req, res) => {
  const usuario = req.usuario;
  const escopo = usuario.visualizarDashboard();
  const dias = [7, 30, 90].includes(Number(req.query.dias)) ? Number(req.query.dias) : 30;
  const atual = periodo(0, dias);
  const anterior = periodo(dias, dias);

  const { where, params } = montarFiltro(atual, escopo);
  const f8 = montarFiltro(periodo(0, 56), escopo);
  const fEquipe = montarFiltro({ status: 'PENDENTE' }, escopo);
  const fSub = montarFiltro({ status: 'PENDENTE', categoria: 'SUBSTITUICAO' }, escopo);
  const fExtra = montarFiltro({ ...periodo(0, 7), categoria: 'ATIVIDADE_EXTRAORDINARIA' }, escopo);
  const gestao = escopo.escopo !== 'PROPRIO';

  const [kpi, kpiAnterior, pendentesGeral, porSetor, porCategoria, porSemana, recentes, rejProprios, antigos, subPend, topExtra] = await Promise.all([
    totais(atual, escopo),
    totais(anterior, escopo),
    totais({ status: 'PENDENTE' }, escopo),
    query(
      `SELECT st.nome AS setor, COUNT(*) AS registros, SUM(${MINUTOS}) AS minutos
         ${JOIN} ${where} GROUP BY st.id, st.nome ORDER BY minutos DESC LIMIT 6`,
      params,
    ),
    query(`SELECT r.categoria, COUNT(*) AS registros, SUM(${MINUTOS}) AS minutos ${JOIN} ${where} GROUP BY r.categoria`, params),
    query(
      `SELECT date_trunc('week', r.data)::date AS semana, MIN(r.data) AS inicio, COUNT(*) AS registros,
              COUNT(*) FILTER (WHERE r.status='HOMOLOGADO') AS homologados, COUNT(*) FILTER (WHERE r.status='PENDENTE') AS pendentes,
              COUNT(*) FILTER (WHERE r.status='REJEITADO') AS rejeitados
         ${JOIN} ${f8.where} GROUP BY 1 ORDER BY semana`,
      f8.params,
    ),
    listarRegistros({}, escopo, { pagina: 1, porPagina: 6 }),
    gestao ? [] : query(
      `SELECT COUNT(*) AS n FROM registros_atividade WHERE status='REJEITADO' AND (executor_id=? OR criado_por_id=?)`,
      [usuario.id, usuario.id],
    ),
    gestao ? query(`SELECT COUNT(*) AS n ${JOIN} ${fEquipe.where} AND r.data_criacao < NOW() - INTERVAL '3 days'`, fEquipe.params) : [],
    gestao ? query(`SELECT COUNT(*) AS n ${JOIN} ${fSub.where}`, fSub.params) : [],
    gestao ? query(
      `SELECT st.nome AS setor, SUM(${MINUTOS}) AS minutos
         ${JOIN} ${fExtra.where} GROUP BY st.id, st.nome ORDER BY minutos DESC LIMIT 1`,
      fExtra.params,
    ) : [],
  ]);

  const variacao = kpiAnterior.minutos ? Math.round(((kpi.minutos - kpiAnterior.minutos) / kpiAnterior.minutos) * 100) : null;

  const resposta = {
    perfil: usuario.perfil,
    escopo: escopo.escopo,
    dias,
    periodo: atual,
    kpis: { ...kpi, variacaoMinutos: variacao, pendentesGeral: pendentesGeral.registros },
    porSetor: porSetor.map((s) => ({ ...s, registros: Number(s.registros), minutos: Number(s.minutos) })),
    porCategoria: porCategoria.map((c) => ({ ...c, registros: Number(c.registros), minutos: Number(c.minutos) })),
    porSemana: porSemana.map((s) => ({
      inicio: s.inicio, registros: Number(s.registros), homologados: Number(s.homologados),
      pendentes: Number(s.pendentes), rejeitados: Number(s.rejeitados),
    })),
    recentes,
    alertas: [],
  };

  if (!gestao) {
    const [rej] = rejProprios;
    if (Number(rej.n)) resposta.alertas.push({ tipo: 'erro', titulo: 'Registros rejeitados para corrigir', valor: `${rej.n}`, link: '/atividades?status=REJEITADO' });
    if (pendentesGeral.registros) resposta.alertas.push({ tipo: 'info', titulo: 'Aguardando homologação do gestor', valor: `${pendentesGeral.registros}`, link: '/atividades?status=PENDENTE' });
  } else {
    const [[antigo], [sub], [extra]] = [antigos, subPend, topExtra];
    if (Number(sub.n)) resposta.alertas.push({ tipo: 'aviso', titulo: 'Substituições aguardando homologação', valor: `${sub.n} pendentes`, link: '/homologacao' });
    if (Number(antigo.n)) resposta.alertas.push({ tipo: 'erro', titulo: 'Pendências há mais de 3 dias', valor: `${antigo.n} registros`, link: '/homologacao' });
    if (extra) resposta.alertas.push({ tipo: 'aviso', titulo: `Horas extraordinárias em ${extra.setor}`, valor: `+${Math.round(Number(extra.minutos) / 60)}h (7 dias)`, link: '/atividades?categoria=ATIVIDADE_EXTRAORDINARIA' });
    if (kpi.rejeitados) resposta.alertas.push({ tipo: 'info', titulo: 'Registros rejeitados no período', valor: `${kpi.rejeitados}`, link: '/atividades?status=REJEITADO' });
  }

  res.json(resposta);
});

export default rotas;
