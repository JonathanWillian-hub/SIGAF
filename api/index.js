// Entrada da API na Vercel: o mesmo app Express do backend, rodando como função serverless.
// Toda chamada a /api/... é encaminhada para cá pelo vercel.json.
import { criarApp } from '../backend/src/app.js';

export default criarApp();
