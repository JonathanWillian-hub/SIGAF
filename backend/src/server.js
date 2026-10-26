import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import path from 'node:path';
import { env } from './config/env.js';
import { criarApp } from './app.js';

const app = criarApp();

http.createServer(app).listen(env.porta, () => {
  console.log(`SIGAF API rodando em http://localhost:${env.porta}`);
});

// RNF01 - HTTPS: com HTTPS_ENABLED=true sobe também o servidor TLS
if (env.https) {
  const pasta = path.join(env.raiz, 'certs');
  const credenciais = {
    key: fs.readFileSync(path.join(pasta, 'chave.pem')),
    cert: fs.readFileSync(path.join(pasta, 'certificado.pem')),
  };
  https.createServer(credenciais, app).listen(env.portaHttps, () => {
    console.log(`SIGAF API (HTTPS) rodando em https://localhost:${env.portaHttps}`);
  });
}
