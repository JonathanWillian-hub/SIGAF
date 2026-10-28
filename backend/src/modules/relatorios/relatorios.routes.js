// Módulo de Relatórios e Prestação de Contas (RF04)
import { Router } from 'express';
import { query } from '../../config/db.js';
import { Relatorio } from '../../domain/Relatorio.js';
import { Setor } from '../../domain/Setor.js';
import { ipDe } from '../../middlewares/comuns.js';
import { naoEncontrado, proibido } from '../../utils/erros.js';

const rotas = Router();

const TIPOS = {
  PDF: 'application/pdf',
  EXCEL: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  CSV: 'text/csv; charset=utf-8',
};

// Passo 2: "Solicita parâmetros de emissão e formato de saída"
rotas.get('/parametros', async (req, res) => {
  const escopo = req.usuario.visualizarDashboard();
  let setores = await Setor.listar();
  let profissionais;
  if (escopo.escopo === 'EQUIPE' && escopo.setorId) {
    setores = setores.filter((s) => s.id === escopo.setorId);
    profissionais = await new Setor({ id: escopo.setorId }).listarProfissionais();
  } else {
    profissionais = await query('SELECT id, nome, matricula FROM usuarios WHERE ativo ORDER BY nome');
  }
  res.json({
    setores,
    profissionais,
    formatos: [
      { codigo: 'PDF', rotulo: 'PDF' },
      { codigo: 'EXCEL', rotulo: 'Excel (.xlsx)' },
      { codigo: 'CSV', rotulo: 'CSV' },
    ],
  });
});

rotas.get('/', async (req, res) => {
  const proprios = req.usuario.perfil !== 'ADMINISTRADOR';
  const itens = await query(
    `SELECT r.id, r.formato, r.data_inicio_filtro AS "dataInicioFiltro", r.data_fim_filtro AS "dataFimFiltro",
            r.status, r.data_geracao AS "dataGeracao", r.arquivo_url AS "arquivoUrl", r.total_registros AS "totalRegistros",
            r.criado_em AS "criadoEm", s.nome AS "setorNome", p.nome AS "profissionalNome", u.nome AS "solicitanteNome"
       FROM relatorios r
       JOIN usuarios u ON u.id = r.solicitante_id
       LEFT JOIN setores s ON s.id = r.setor_id
       LEFT JOIN usuarios p ON p.id = r.profissional_id
       ${proprios ? 'WHERE r.solicitante_id = ?' : ''}
      ORDER BY r.id DESC LIMIT 50`,
    proprios ? [req.usuario.id] : [],
  );
  res.json(itens);
});

// Passos 4-9: solicita geração -> processador -> download automático ou segundo plano
rotas.post('/', async (req, res) => {
  const escopo = req.usuario.visualizarDashboard();
  const relatorio = new Relatorio({ ...req.body, solicitanteId: req.usuario.id });
  if (escopo.escopo === 'EQUIPE' && escopo.setorId) {
    if (relatorio.setorId && relatorio.setorId !== escopo.setorId) throw proibido('Você só pode emitir relatórios da sua equipe.');
  }
  const assincrono = await relatorio.solicitarGeracao(req.usuario, escopo, ipDe(req));
  if (assincrono) {
    return res.status(202).json({
      assincrono: true,
      mensagem: 'O relatório está sendo gerado em segundo plano. Você será notificado quando estiver pronto para download.',
      relatorio,
    });
  }
  return res.status(201).json({ assincrono: false, mensagem: 'Relatório gerado com sucesso.', relatorio });
});

// + baixarArquivo(): byte[]
rotas.get('/:id/arquivo', async (req, res) => {
  const relatorio = await Relatorio.buscarPorId(Number(req.params.id));
  if (!relatorio) throw naoEncontrado('Relatório');
  if (req.usuario.perfil !== 'ADMINISTRADOR' && relatorio.solicitanteId !== req.usuario.id) throw proibido();
  const bytes = await relatorio.baixarArquivo();
  res.setHeader('Content-Type', TIPOS[relatorio.formato]);
  res.setHeader('Content-Disposition', `attachment; filename="${relatorio.nomeArquivo()}"`);
  res.send(bytes);
});

export default rotas;
