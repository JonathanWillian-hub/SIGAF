import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { Usuario } from '../domain/Usuario.js';
import { ErroApp, proibido } from '../utils/erros.js';

export function gerarToken(usuario) {
  return jwt.sign({ sub: usuario.id, perfil: usuario.perfil }, env.jwtSecret, { expiresIn: env.jwtExpira });
}

export async function autenticar(req, _res, next) {
  const cabecalho = req.headers.authorization || '';
  const [tipo, token] = cabecalho.split(' ');
  if (tipo !== 'Bearer' || !token) return next(new ErroApp('Sessão não informada. Faça login.', 401));
  try {
    const payload = jwt.verify(token, env.jwtSecret);
    const usuario = await Usuario.buscarPorId(payload.sub);
    if (!usuario || !usuario.ativo) return next(new ErroApp('Usuário inativo ou inexistente.', 401));
    req.usuario = usuario;
    return next();
  } catch {
    return next(new ErroApp('Sessão expirada. Faça login novamente.', 401));
  }
}

export function autorizar(...perfis) {
  return (req, _res, next) => {
    if (!req.usuario) return next(new ErroApp('Não autenticado.', 401));
    if (!perfis.includes(req.usuario.perfil)) return next(proibido());
    return next();
  };
}
