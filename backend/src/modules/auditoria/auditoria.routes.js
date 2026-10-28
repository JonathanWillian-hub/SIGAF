import { Router } from 'express';
import { listarLogs } from './auditoria.service.js';

const rotas = Router();

rotas.get('/', async (req, res) => {
  res.json(await listarLogs({
    pagina: req.query.pagina,
    porPagina: req.query.porPagina,
    acao: req.query.acao,
    entidade: req.query.entidade,
    setorId: req.usuario.setorId ?? -1,
  }));
});

export default rotas;
