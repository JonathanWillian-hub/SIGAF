import { ErroApp } from '../utils/erros.js';

// RNF03 - Tempo de resposta: mede cada requisição, expõe no cabeçalho
// X-Response-Time e avisa no console quando passar de 2 segundos.
export function tempoResposta(req, res, next) {
  const inicio = process.hrtime.bigint();
  const fimOriginal = res.end;
  res.end = function fim(...args) {
    const ms = Number(process.hrtime.bigint() - inicio) / 1e6;
    if (!res.headersSent) res.setHeader('X-Response-Time', `${ms.toFixed(1)}ms`);
    if (ms > 2000) console.warn(`[RNF03] ${req.method} ${req.originalUrl} levou ${ms.toFixed(0)}ms (> 2s)`);
    return fimOriginal.apply(this, args);
  };
  next();
}

export function naoEncontrada(req, _res, next) {
  next(new ErroApp(`Rota ${req.method} ${req.originalUrl} não encontrada.`, 404));
}

// eslint-disable-next-line no-unused-vars
export function tratarErros(erro, _req, res, _next) {
  if (erro instanceof ErroApp) {
    return res.status(erro.status).json({ erro: erro.message, campos: erro.campos });
  }
  if (erro?.type === 'entity.parse.failed') {
    return res.status(400).json({ erro: 'JSON inválido no corpo da requisição.' });
  }
  // Códigos de erro do PostgreSQL
  if (erro?.code === '23505') {
    return res.status(409).json({ erro: 'Já existe um cadastro com esses dados (matrícula, e-mail ou código).' });
  }
  if (erro?.code === '23514' || erro?.code === '22007' || erro?.code === '22008') {
    return res.status(422).json({ erro: 'Dados inválidos para gravar no banco.' });
  }
  if (erro?.code === '23503') {
    return res.status(422).json({ erro: 'Referência inválida (setor, disciplina ou usuário inexistente).' });
  }
  console.error('[erro]', erro);
  return res.status(500).json({ erro: 'Erro interno no servidor.' });
}

export const ipDe = (req) => req.ip || req.socket?.remoteAddress || null;
