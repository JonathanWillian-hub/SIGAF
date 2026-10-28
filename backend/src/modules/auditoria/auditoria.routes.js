import { Router } from 'express';
import { listarLogs } from './auditoria.service.js';

const rotas = Router();

rotas.get('/', async (req, res) => {
  res.json(await listarLogs({
    pagina: req.query.pagina,
    porPagina: req.query.porPagina,
    acao: req.query.acao,
    entidade: req.query.entidade,
  }));
});

export default rotas;
