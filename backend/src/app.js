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
import perfilRotas from './modules/perfil/perfil.routes.js';
import chamadosRotas from './modules/chamados/chamados.routes.js';
import sistemaRotas from './modules/sistema/sistema.routes.js';

const { COLABORADOR, GESTOR, ADMINISTRADOR } = PerfilUsuario;
const daEmpresa = autorizar(COLABORADOR, GESTOR);
const soGestor = autorizar(GESTOR);

export function criarApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(tempoResposta);
  app.use(helmet({ hsts: { maxAge: 31536000, includeSubDomains: true } }));
  app.use(cors({ exposedHeaders: ['X-Response-Time', 'Content-Disposition'] }));
  const jsonPadrao = express.json({ limit: '100kb' });
  const jsonComAnexos = express.json({ limit: '5mb' });
  app.use((req, res, next) => (req.path.startsWith('/api/chamados') ? jsonComAnexos : jsonPadrao)(req, res, next));

  app.get('/api/health', async (_req, res) => {
    let banco = 'ok';
    try { await query('SELECT 1'); } catch { banco = 'indisponivel'; }
    res.status(banco === 'ok' ? 200 : 503).json({ status: banco === 'ok' ? 'ok' : 'degradado', banco, uptimeSegundos: Math.round(process.uptime()) });
  });

  app.use('/api/auth', authRotas);
  app.use('/api/apontamentos', autenticar, daEmpresa, apontamentosRotas);
  app.use('/api/registros', autenticar, daEmpresa, registrosRotas);
  app.use('/api/homologacao', autenticar, soGestor, homologacaoRotas);
  app.use('/api/relatorios', autenticar, autorizar(GESTOR, ADMINISTRADOR), relatoriosRotas);
  app.use('/api/dashboard', autenticar, daEmpresa, dashboardRotas);
  app.use('/api/notificacoes', autenticar, notificacoesRotas);
  app.use('/api/cadastros', autenticar, cadastrosRotas);
  app.use('/api/perfil', autenticar, perfilRotas);
  app.use('/api/chamados', autenticar, chamadosRotas);
  app.use('/api/sistema', autenticar, autorizar(ADMINISTRADOR), sistemaRotas);
  app.use('/api/auditoria', autenticar, soGestor, auditoriaRotas);

  app.use('/api', naoEncontrada);
  app.use(tratarErros);
  return app;
}
