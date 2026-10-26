import { Router } from 'express';
import { listarDoUsuario, marcarLidas } from './notificacao.service.js';

const rotas = Router();

rotas.get('/', async (req, res) => res.json(await listarDoUsuario(req.usuario.id)));

rotas.patch('/lidas', async (req, res) => {
  await marcarLidas(req.usuario.id);
  res.json({ ok: true });
});

rotas.patch('/:id/lida', async (req, res) => {
  await marcarLidas(req.usuario.id, Number(req.params.id));
  res.json({ ok: true });
});

export default rotas;
