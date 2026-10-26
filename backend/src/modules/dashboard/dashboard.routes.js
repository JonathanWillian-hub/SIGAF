// RF05 - Painel Centralizado de Registros (Dashboard)
// Diagrama de Sequência RF05: "Solicita dados do Painel Central" -> alt Perfil Colaborador / Gestor-Admin
import { Router } from 'express';
import { query } from '../../config/db.js';
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
            COALESCE(SUM(TIMESTAMPDIFF(MINUTE, r.horario_inicio, r.horario_fim)),0) AS minutos,
            SUM(r.categoria='ATIVIDADE_EXTRAORDINARIA') AS extraordinarias,
            SUM(r.categoria='SUBSTITUICAO') AS substituicoes,
            SUM(r.categoria='COBERTURA_HORARIO') AS coberturas,
            SUM(r.categoria='APOIO_OPERACIONAL') AS apoios,
            COUNT(DISTINCT r.setor_id) AS setores,
            SUM(r.status='PENDENTE') AS pendentes,
            SUM(r.status='HOMOLOGADO') AS homologados,
            SUM(r.status='REJEITADO') AS rejeitados
       ${JOIN} ${where}`,
    params,
  );
  return Object.fromEntries(Object.entries(t).map(([k, v]) => [k, Number(v) || 0]));
}

rotas.get('/', async (req, res) => {
  const usuario = req.usuario;
  const escopo = usuario.visualizarDashboard(); // RF05 A1 - verifica nível de acesso
  const dias = [7, 30, 90].includes(Number(req.query.dias)) ? Number(req.query.dias) : 30;
  const atual = periodo(0, dias);
  const anterior = periodo(dias, dias);

  const [kpi, kpiAnterior, pendentesGeral] = await Promise.all([
    totais(atual, escopo),
    totais(anterior, escopo),
    totais({ status: 'PENDENTE' }, escopo),
  ]);

  const { where, params } = montarFiltro(atual, escopo);
  const porSetor = await query(
    `SELECT st.nome AS setor, COUNT(*) AS registros,
            SUM(TIMESTAMPDIFF(MINUTE, r.horario_inicio, r.horario_fim)) AS minutos
       ${JOIN} ${where} GROUP BY st.id, st.nome ORDER BY minutos DESC LIMIT 6`,
    params,
  );
  const porCategoria = await query(
    `SELECT r.categoria, COUNT(*) AS registros,
            SUM(TIMESTAMPDIFF(MINUTE, r.horario_inicio, r.horario_fim)) AS minutos
       ${JOIN} ${where} GROUP BY r.categoria`,
    params,
  );
  // Evolução semanal (últimas 8 semanas) para o gráfico de barras
  const desde = periodo(0, 56);
  const f8 = montarFiltro(desde, escopo);
  const porSemana = await query(
    `SELECT YEARWEEK(r.data, 3) AS semana, MIN(r.data) AS inicio, COUNT(*) AS registros,
            SUM(r.status='HOMOLOGADO') AS homologados, SUM(r.status='PENDENTE') AS pendentes,
            SUM(r.status='REJEITADO') AS rejeitados
       ${JOIN} ${f8.where} GROUP BY YEARWEEK(r.data, 3) ORDER BY semana`,
    f8.params,
  );

  const recentes = await listarRegistros({}, escopo, { pagina: 1, porPagina: 6 });

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

  if (escopo.escopo === 'PROPRIO') {
    // alt Perfil Colaborador: apenas resumo das próprias atividades e horas
    const [rej] = await query(
      `SELECT COUNT(*) AS n FROM registros_atividade WHERE status='REJEITADO' AND (executor_id=? OR criado_por_id=?)`,
      [usuario.id, usuario.id],
    );
    if (Number(rej.n)) resposta.alertas.push({ tipo: 'erro', titulo: 'Registros rejeitados para corrigir', valor: `${rej.n}`, link: '/atividades?status=REJEITADO' });
    if (pendentesGeral.registros) resposta.alertas.push({ tipo: 'info', titulo: 'Aguardando homologação do gestor', valor: `${pendentesGeral.registros}`, link: '/atividades?status=PENDENTE' });
  } else {
    // alt Perfil Gestor/Admin: métricas globais, substituições pendentes e alertas de alocação crítica
    const fEquipe = montarFiltro({ status: 'PENDENTE' }, escopo);
    const [antigos] = await query(
      `SELECT COUNT(*) AS n ${JOIN} ${fEquipe.where} AND r.data_criacao < NOW() - INTERVAL 3 DAY`,
      fEquipe.params,
    );
    const fSub = montarFiltro({ status: 'PENDENTE', categoria: 'SUBSTITUICAO' }, escopo);
    const [subPend] = await query(`SELECT COUNT(*) AS n ${JOIN} ${fSub.where}`, fSub.params);
    const fExtra = montarFiltro({ ...periodo(0, 7), categoria: 'ATIVIDADE_EXTRAORDINARIA' }, escopo);
    const [topExtra] = await query(
      `SELECT st.nome AS setor, SUM(TIMESTAMPDIFF(MINUTE, r.horario_inicio, r.horario_fim)) AS minutos
         ${JOIN} ${fExtra.where} GROUP BY st.id, st.nome ORDER BY minutos DESC LIMIT 1`,
      fExtra.params,
    );
    if (Number(subPend.n)) resposta.alertas.push({ tipo: 'aviso', titulo: 'Substituições aguardando homologação', valor: `${subPend.n} pendentes`, link: '/homologacao' });
    if (Number(antigos.n)) resposta.alertas.push({ tipo: 'erro', titulo: 'Pendências há mais de 3 dias', valor: `${antigos.n} registros`, link: '/homologacao' });
    if (topExtra) resposta.alertas.push({ tipo: 'aviso', titulo: `Horas extraordinárias em ${topExtra.setor}`, valor: `+${Math.round(Number(topExtra.minutos) / 60)}h (7 dias)`, link: '/atividades?categoria=ATIVIDADE_EXTRAORDINARIA' });
    if (kpi.rejeitados) resposta.alertas.push({ tipo: 'info', titulo: 'Registros rejeitados no período', valor: `${kpi.rejeitados}`, link: '/atividades?status=REJEITADO' });
  }

  res.json(resposta);
});

export default rotas;
