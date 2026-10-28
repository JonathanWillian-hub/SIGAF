import { Router } from 'express';
import { Usuario } from '../../domain/Usuario.js';
import { autenticar, gerarToken } from '../../middlewares/autenticacao.js';
import { ipDe } from '../../middlewares/comuns.js';
import { registrarLog } from '../auditoria/auditoria.service.js';
import { ErroApp } from '../../utils/erros.js';

const rotas = Router();

rotas.post('/login', async (req, res) => {
  const { email, senha } = req.body || {};
  const campos = {};
  if (!email) campos.email = 'Informe o e-mail.';
  if (!senha) campos.senha = 'Informe a senha.';
  if (Object.keys(campos).length) throw new ErroApp('Preencha e-mail e senha.', 422, campos);

  const usuario = await Usuario.buscarPorEmail(email);
  if (!usuario || !(await usuario.autenticar(senha))) {
    throw new ErroApp('E-mail ou senha inválidos.', 401);
  }
  await registrarLog({ usuarioId: usuario.id, acao: 'LOGIN', entidade: 'Usuario', entidadeId: usuario.id, ip: ipDe(req) });
  res.json({ token: gerarToken(usuario), usuario });
});

rotas.get('/me', autenticar, (req, res) => res.json({ usuario: req.usuario }));

export default rotas;
