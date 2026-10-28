// Aplicação Express - API RESTful modular (RNF05)
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { query } from './config/db.js';
import { PerfilUsuario } from './domain/enums.js';
import { autenticar, autorizar } from './middlewares/autenticacao.js';
import { naoEncontrada, tempoResposta, tratarErros } from './middlewares/comuns.js';

import authRotas from './modules/auth/auth.routes.js';
import apontamentosRotas from './modules/apontamentos/apontamentos.routes.js';
import registrosRotas from './modules/registros/registros.routes.js';
import homologacaoRotas from './modules/homologacao/homologacao.routes.js';
import relatoriosRotas from './modules/relatorios/relatorios.routes.js';
import dashboardRotas from './modules/dashboard/dashboard.routes.js';
import notificacoesRotas from './modules/notificacoes/notificacoes.routes.js';
import cadastrosRotas from './modules/cadastros/cadastros.routes.js';
import auditoriaRotas from './modules/auditoria/auditoria.routes.js';

const { GESTOR, ADMINISTRADOR } = PerfilUsuario;

export function criarApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(tempoResposta); // RNF03
  app.use(helmet({ hsts: { maxAge: 31536000, includeSubDomains: true } })); // RNF01 (cabeçalhos de segurança + HSTS)
  app.use(cors({ exposedHeaders: ['X-Response-Time', 'Content-Disposition'] }));
  app.use(express.json({ limit: '100kb' }));

  // RNF02 - verificação de disponibilidade (monitoramento de uptime)
  app.get('/api/health', async (_req, res) => {
    let banco = 'ok';
    try { await query('SELECT 1'); } catch { banco = 'indisponivel'; }
    res.status(banco === 'ok' ? 200 : 503).json({ status: banco === 'ok' ? 'ok' : 'degradado', banco, uptimeSegundos: Math.round(process.uptime()) });
  });

  app.use('/api/auth', authRotas);
  app.use('/api/apontamentos', autenticar, apontamentosRotas);
  app.use('/api/registros', autenticar, registrosRotas);
  app.use('/api/homologacao', autenticar, autorizar(GESTOR, ADMINISTRADOR), homologacaoRotas);
  app.use('/api/relatorios', autenticar, autorizar(GESTOR, ADMINISTRADOR), relatoriosRotas);
  app.use('/api/dashboard', autenticar, dashboardRotas);
  app.use('/api/notificacoes', autenticar, notificacoesRotas);
  app.use('/api/cadastros', autenticar, cadastrosRotas);
  app.use('/api/auditoria', autenticar, autorizar(GESTOR, ADMINISTRADOR), auditoriaRotas);

  app.use('/api', naoEncontrada);
  app.use(tratarErros);
  return app;
}
