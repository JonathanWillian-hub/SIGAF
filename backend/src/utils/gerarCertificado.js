// RNF01 - Gera um certificado autoassinado para rodar a API em HTTPS no ambiente local.
// Em produção use um certificado válido (ex.: Let's Encrypt), como previsto na tabela de viabilidade.
import fs from 'node:fs';
import path from 'node:path';
import selfsigned from 'selfsigned';
import { env } from '../config/env.js';

const pasta = path.join(env.raiz, 'certs');
fs.mkdirSync(pasta, { recursive: true });

const pems = await selfsigned.generate([{ name: 'commonName', value: 'localhost' }], {
  days: 365,
  keySize: 2048,
  algorithm: 'sha256',
  extensions: [{ name: 'subjectAltName', altNames: [{ type: 2, value: 'localhost' }, { type: 7, ip: '127.0.0.1' }] }],
});

fs.writeFileSync(path.join(pasta, 'chave.pem'), pems.private);
fs.writeFileSync(path.join(pasta, 'certificado.pem'), pems.cert);
console.log(`Certificado gerado em ${pasta}. Defina HTTPS_ENABLED=true no .env.`);
