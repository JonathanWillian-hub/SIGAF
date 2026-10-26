import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
dotenv.config({ path: path.join(raiz, '.env'), quiet: true });

export const env = {
  raiz,
  porta: Number(process.env.PORT || 3333),
  ambiente: process.env.NODE_ENV || 'development',
  https: process.env.HTTPS_ENABLED === 'true',
  portaHttps: Number(process.env.HTTPS_PORT || 3443),
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'sigaf',
  },
  jwtSecret: process.env.JWT_SECRET || 'sigaf-dev-secret',
  jwtExpira: process.env.JWT_EXPIRES_IN || '8h',
  chaveCriptografia: process.env.ENCRYPTION_KEY,
  limiteRelatorioAssincrono: Number(process.env.REPORT_ASYNC_THRESHOLD || 100),
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM || 'SIGAF <nao-responda@sigaf.com.br>',
  },
  pastaRelatorios: path.join(raiz, 'storage', 'relatorios'),
};
