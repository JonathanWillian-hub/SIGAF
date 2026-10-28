import { Router } from 'express';
import { transacao } from '../../config/db.js';
import { RotuloCategoria } from '../../domain/enums.js';
import { ipDe } from '../../middlewares/comuns.js';
import { ErroApp, naoEncontrado, proibido } from '../../utils/erros.js';
import { registrarLog } from '../auditoria/auditoria.service.js';
import { notificar } from '../notificacoes/notificacao.service.js';
import { buscarDetalhe, contarRegistros, listarRegistros } from '../registros/registros.repository.js';

const rotas = Router();

rotas.get('/pendentes', async (req, res) => {
  const escopo = req.usuario.visualizarDashboard();
  const pagina = Math.max(Number(req.query.pagina) || 1, 1);
  const porPagina = Math.min(Number(req.query.porPagina) || 20, 100);
  const filtros = { status: 'PENDENTE', categoria: req.query.categoria, setorId: req.query.setorId };
  const [total, itens] = await Promise.all([
    contarRegistros(filtros, escopo),
    listarRegistros(filtros, escopo, { pagina, porPagina }),
  ]);
  res.json({ itens, total, pagina, porPagina, totalPaginas: Math.max(Math.ceil(total / porPagina), 1) });
});

rotas.patch('/:id', async (req, res) => {
  const { decisao, justificativa } = req.body || {};
  if (!['APROVAR', 'REJEITAR'].includes(decisao)) {
    throw new ErroApp('Informe a decisão: APROVAR ou REJEITAR.', 422, { decisao: 'Decisão inválida.' });
  }
  const texto = String(justificativa || '').trim();
  if (decisao === 'REJEITAR' && texto.length < 5) {
    throw new ErroApp('A justificativa é obrigatória para rejeitar.', 422, { justificativa: 'Informe a justificativa (mínimo 5 caracteres).' });
  }

  const registro = await buscarDetalhe(Number(req.params.id));
  if (!registro) throw naoEncontrado('Registro');
  const escopo = req.usuario.visualizarDashboard();
  if (escopo.escopo === 'EQUIPE' && escopo.setorId && registro.setorId !== escopo.setorId) throw proibido('Registro fora da sua equipe.');
  if (registro.executorId === req.usuario.id) throw proibido('Você não pode homologar um registro em que é o executor.');
  if (registro.status !== 'PENDENTE') throw new ErroApp('Este registro já foi analisado.', 409);

  const novoStatus = decisao === 'APROVAR' ? 'HOMOLOGADO' : 'REJEITADO';
  await transacao(async (cx) => {
    await cx.query(
      `UPDATE registros_atividade SET status=?, justificativa=?, homologado_por_id=?, homologado_em=NOW() WHERE id=?`,
      [novoStatus, decisao === 'REJEITAR' ? texto : (texto || null), req.usuario.id, registro.id],
    );
    await registrarLog({
      usuarioId: req.usuario.id,
      acao: decisao === 'APROVAR' ? 'HOMOLOGACAO' : 'REJEICAO',
      entidade: 'RegistroAtividade',
      entidadeId: registro.id,
      detalhes: { de: 'PENDENTE', para: novoStatus, justificativa: texto || null },
      ip: ipDe(req),
    }, cx);
  });

  const data = registro.data.split('-').reverse().join('/');
  await notificar({
    usuarioId: registro.executorId,
    titulo: novoStatus === 'HOMOLOGADO' ? 'Registro homologado' : 'Registro rejeitado',
    mensagem: novoStatus === 'HOMOLOGADO'
      ? `Seu registro de ${RotuloCategoria[registro.categoria]} em ${data} foi homologado por ${req.usuario.nome}.`
      : `Seu registro de ${RotuloCategoria[registro.categoria]} em ${data} foi rejeitado por ${req.usuario.nome}. Justificativa: ${texto}`,
    link: `/atividades?registro=${registro.id}`,
  });

  res.json({
    mensagem: novoStatus === 'HOMOLOGADO' ? 'Registro homologado com sucesso.' : 'Registro rejeitado com sucesso.',
    registro: await buscarDetalhe(registro.id),
  });
});

export default rotas;
