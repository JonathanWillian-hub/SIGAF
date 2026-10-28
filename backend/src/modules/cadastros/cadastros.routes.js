// Cadastros de apoio: Setores, Disciplinas e Usuários (manutenção pelo Administrador)
import { Router } from 'express';
import { query } from '../../config/db.js';
import { Setor } from '../../domain/Setor.js';
import { Disciplina } from '../../domain/Disciplina.js';
import { Usuario } from '../../domain/Usuario.js';
import { PerfilUsuario } from '../../domain/enums.js';
import { autorizar } from '../../middlewares/autenticacao.js';
import { ipDe } from '../../middlewares/comuns.js';
import { ErroApp, naoEncontrado } from '../../utils/erros.js';
import { registrarLog } from '../auditoria/auditoria.service.js';

const rotas = Router();
const somenteAdmin = autorizar(PerfilUsuario.ADMINISTRADOR);
const gestao = autorizar(PerfilUsuario.GESTOR, PerfilUsuario.ADMINISTRADOR);

function exigir(campos) {
  const erros = {};
  for (const [nome, valor] of Object.entries(campos)) {
    if (valor === undefined || valor === null || String(valor).trim() === '') erros[nome] = 'Campo obrigatório.';
  }
  if (Object.keys(erros).length) throw new ErroApp('Preencha os campos obrigatórios.', 422, erros);
}

const cpfValido = (cpf) => {
  const d = String(cpf || '').replace(/\D/g, '');
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
  const calc = (n) => {
    let soma = 0;
    for (let i = 0; i < n; i += 1) soma += Number(d[i]) * (n + 1 - i);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return calc(9) === Number(d[9]) && calc(10) === Number(d[10]);
};

/* ----------------------------- Setores ----------------------------- */
rotas.get('/setores', async (req, res) => res.json(await Setor.listar({ incluirInativos: req.query.todos === '1' })));

rotas.get('/setores/:id/profissionais', gestao, async (req, res) => {
  const setor = await Setor.buscarPorId(Number(req.params.id));
  if (!setor) throw naoEncontrado('Setor');
  res.json(await setor.listarProfissionais());
});

rotas.post('/setores', somenteAdmin, async (req, res) => {
  const { nome, codigo } = req.body || {};
  exigir({ nome, codigo });
  const [r] = await query('INSERT INTO setores (nome, codigo) VALUES (?, ?) RETURNING id', [nome.trim(), codigo.trim().toUpperCase()]);
  await registrarLog({ usuarioId: req.usuario.id, acao: 'CRIACAO', entidade: 'Setor', entidadeId: r.id, detalhes: { nome, codigo }, ip: ipDe(req) });
  res.status(201).json(await Setor.buscarPorId(r.id));
});

rotas.put('/setores/:id', somenteAdmin, async (req, res) => {
  const { nome, codigo, ativo = true } = req.body || {};
  exigir({ nome, codigo });
  const id = Number(req.params.id);
  if (!(await Setor.buscarPorId(id))) throw naoEncontrado('Setor');
  await query('UPDATE setores SET nome=?, codigo=?, ativo=? WHERE id=?', [nome.trim(), codigo.trim().toUpperCase(), Boolean(ativo), id]);
  await registrarLog({ usuarioId: req.usuario.id, acao: 'ALTERACAO', entidade: 'Setor', entidadeId: id, detalhes: { nome, codigo, ativo }, ip: ipDe(req) });
  res.json(await Setor.buscarPorId(id));
});

/* ---------------------------- Disciplinas ---------------------------- */
rotas.get('/disciplinas', async (req, res) => res.json(await Disciplina.listar({ incluirInativos: req.query.todos === '1' })));

rotas.post('/disciplinas', somenteAdmin, async (req, res) => {
  const { nome, descricao } = req.body || {};
  exigir({ nome });
  const [r] = await query('INSERT INTO disciplinas (nome, descricao) VALUES (?, ?) RETURNING id', [nome.trim(), descricao || null]);
  await registrarLog({ usuarioId: req.usuario.id, acao: 'CRIACAO', entidade: 'Disciplina', entidadeId: r.id, detalhes: { nome }, ip: ipDe(req) });
  res.status(201).json(await Disciplina.buscarPorId(r.id));
});

rotas.put('/disciplinas/:id', somenteAdmin, async (req, res) => {
  const { nome, descricao, ativo = true } = req.body || {};
  exigir({ nome });
  const id = Number(req.params.id);
  if (!(await Disciplina.buscarPorId(id))) throw naoEncontrado('Disciplina');
  await query('UPDATE disciplinas SET nome=?, descricao=?, ativo=? WHERE id=?', [nome.trim(), descricao || null, Boolean(ativo), id]);
  await registrarLog({ usuarioId: req.usuario.id, acao: 'ALTERACAO', entidade: 'Disciplina', entidadeId: id, detalhes: { nome, ativo }, ip: ipDe(req) });
  res.json(await Disciplina.buscarPorId(id));
});

/* ----------------------------- Usuários ----------------------------- */
rotas.get('/usuarios', gestao, async (_req, res) => {
  const linhas = await query(
    `SELECT u.*, s.nome AS setor_nome FROM usuarios u LEFT JOIN setores s ON s.id = u.setor_id ORDER BY u.nome`,
  );
  res.json(linhas.map((l) => Usuario.deLinha(l)));
});

function validarUsuario(dados, { novo }) {
  const { nome, matricula, cpf, email, perfil, senha } = dados;
  exigir(novo ? { nome, matricula, cpf, email, perfil, senha } : { nome, matricula, email, perfil });
  const erros = {};
  if (cpf && !cpfValido(cpf)) erros.cpf = 'CPF inválido.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) erros.email = 'E-mail inválido.';
  if (!Object.values(PerfilUsuario).includes(perfil)) erros.perfil = 'Perfil inválido.';
  if (senha && String(senha).length < 8) erros.senha = 'A senha deve ter ao menos 8 caracteres.';
  if (Object.keys(erros).length) throw new ErroApp('Verifique os dados do usuário.', 422, erros);
}

rotas.post('/usuarios', somenteAdmin, async (req, res) => {
  const dados = req.body || {};
  validarUsuario(dados, { novo: true });
  const [r] = await query(
    `INSERT INTO usuarios (nome, matricula, cpf, email, senha_hash, perfil, setor_id) VALUES (?,?,?,?,?,?,?) RETURNING id`,
    [dados.nome.trim(), dados.matricula.trim(), Usuario.cpfCriptografado(dados.cpf), dados.email.trim().toLowerCase(),
      await Usuario.gerarHashSenha(dados.senha), dados.perfil, Number(dados.setorId) || null],
  );
  await registrarLog({ usuarioId: req.usuario.id, acao: 'CRIACAO', entidade: 'Usuario', entidadeId: r.id, detalhes: { nome: dados.nome, perfil: dados.perfil }, ip: ipDe(req) });
  res.status(201).json(await Usuario.buscarPorId(r.id));
});

rotas.put('/usuarios/:id', somenteAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const atual = await Usuario.buscarPorId(id);
  if (!atual) throw naoEncontrado('Usuário');
  const dados = req.body || {};
  validarUsuario(dados, { novo: false });
  const sets = ['nome=?', 'matricula=?', 'email=?', 'perfil=?', 'setor_id=?', 'ativo=?'];
  const params = [dados.nome.trim(), dados.matricula.trim(), dados.email.trim().toLowerCase(), dados.perfil,
    Number(dados.setorId) || null, dados.ativo !== false];
  if (dados.cpf) { sets.push('cpf=?'); params.push(Usuario.cpfCriptografado(dados.cpf)); }
  if (dados.senha) { sets.push('senha_hash=?'); params.push(await Usuario.gerarHashSenha(dados.senha)); }
  await query(`UPDATE usuarios SET ${sets.join(', ')} WHERE id=?`, [...params, id]);
  await registrarLog({ usuarioId: req.usuario.id, acao: 'ALTERACAO', entidade: 'Usuario', entidadeId: id, detalhes: { nome: dados.nome, perfil: dados.perfil, ativo: dados.ativo !== false }, ip: ipDe(req) });
  res.json(await Usuario.buscarPorId(id));
});

export default rotas;
