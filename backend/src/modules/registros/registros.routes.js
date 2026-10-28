import { Router } from 'express';
import { RegistroAtividade } from '../../domain/RegistroAtividade.js';
import { Usuario } from '../../domain/Usuario.js';
import { ipDe } from '../../middlewares/comuns.js';
import { ErroApp, naoEncontrado, proibido } from '../../utils/erros.js';
import { buscarDetalhe, contarRegistros, listarRegistros, resumirRegistros } from './registros.repository.js';

const rotas = Router();

function podeVer(usuario, registro) {
  const escopo = usuario.visualizarDashboard();
  if (escopo.escopo === 'EQUIPE') return Boolean(escopo.setorId) && registro.setorId === escopo.setorId;
  if (escopo.escopo === 'PROPRIO') return registro.executorId === usuario.id || registro.criadoPorId === usuario.id;
  return false;
}

function podeEditar(usuario, registro) {
  if (usuario.perfil === 'GESTOR') return podeVer(usuario, registro);
  const dono = registro.executorId === usuario.id || registro.criadoPorId === usuario.id;
  return dono && registro.status !== 'HOMOLOGADO';
}

async function conferirExecutor(usuario, registro) {
  if (usuario.perfil === 'COLABORADOR') {
    registro.executorId = usuario.id;
    return;
  }
  if (usuario.perfil === 'GESTOR' && usuario.setorId && registro.executorId && registro.executorId !== usuario.id) {
    const executor = await Usuario.buscarPorId(registro.executorId);
    if (executor && executor.setorId !== usuario.setorId) {
      throw new ErroApp('Gestores só podem registrar atividades de profissionais da sua equipe.', 403, { executorId: 'Profissional fora da sua equipe.' });
    }
  }
}

rotas.get('/', async (req, res) => {
  const escopo = req.usuario.visualizarDashboard();
  const pagina = Math.max(Number(req.query.pagina) || 1, 1);
  const porPagina = Math.min(Math.max(Number(req.query.porPagina) || 10, 1), 100);
  const filtros = {
    dataInicio: req.query.dataInicio,
    dataFim: req.query.dataFim,
    setorId: req.query.setorId,
    categoria: req.query.categoria,
    status: req.query.status,
    profissional: req.query.profissional,
    profissionalId: req.query.profissionalId,
    busca: req.query.busca,
  };
  const [total, itens, resumo] = await Promise.all([
    contarRegistros(filtros, escopo),
    listarRegistros(filtros, escopo, { pagina, porPagina }),
    resumirRegistros(filtros, escopo),
  ]);
  res.json({
    itens,
    total,
    resumo,
    pagina,
    porPagina,
    totalPaginas: Math.max(Math.ceil(total / porPagina), 1),
    mensagem: total === 0 ? 'Nenhum registro encontrado para os filtros informados' : undefined,
  });
});

rotas.get('/:id', async (req, res) => {
  const registro = await buscarDetalhe(Number(req.params.id));
  if (!registro) throw naoEncontrado('Registro');
  if (!podeVer(req.usuario, registro)) throw proibido();
  res.json(registro);
});

rotas.post('/', async (req, res) => {
  const registro = new RegistroAtividade(req.body || {});
  await conferirExecutor(req.usuario, registro);
  const erros = registro.validar();
  if (Object.keys(erros).length) {
    const msg = erros.horarioFim?.startsWith('O horário de fim')
      ? 'Inconsistência de horário: o horário de fim é anterior ao horário de início.'
      : 'Preencha os campos obrigatórios destacados.';
    throw new ErroApp(msg, 422, erros);
  }
  await registro.salvar(req.usuario.id, ipDe(req));
  res.status(201).json({ mensagem: 'Registro salvo com sucesso', registro: await buscarDetalhe(registro.id) });
});

rotas.put('/:id', async (req, res) => {
  const atual = await buscarDetalhe(Number(req.params.id));
  if (!atual) throw naoEncontrado('Registro');
  if (!podeEditar(req.usuario, atual)) throw proibido('Este registro não pode mais ser alterado por você.');

  const registro = new RegistroAtividade({ ...req.body, id: atual.id });
  await conferirExecutor(req.usuario, registro);
  const erros = registro.validar();
  if (Object.keys(erros).length) throw new ErroApp('Preencha os campos obrigatórios destacados.', 422, erros);
  await registro.salvar(req.usuario.id, ipDe(req));
  res.json({ mensagem: 'Registro atualizado com sucesso', registro: await buscarDetalhe(registro.id) });
});

rotas.delete('/:id', async (req, res) => {
  const atual = await buscarDetalhe(Number(req.params.id));
  if (!atual) throw naoEncontrado('Registro');
  if (!podeEditar(req.usuario, atual)) throw proibido('Este registro não pode ser excluído por você.');
  const registro = new RegistroAtividade(atual);
  await registro.excluir(req.usuario.id, ipDe(req));
  res.json({ mensagem: 'Registro excluído.' });
});

export default rotas;
