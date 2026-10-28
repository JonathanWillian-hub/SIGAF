import dotenv from 'dotenv';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
dotenv.config({ path: path.join(raiz, '.env'), quiet: true });

// Datas "de hoje" (filtros de 7, 30 e 90 dias) sempre no horário de Brasília,
// mesmo quando o servidor roda em UTC, como na Vercel.
process.env.TZ = process.env.APP_TIMEZONE || 'America/Sao_Paulo';

// Na Vercel só a pasta temporária aceita gravação de arquivos.
const naVercel = Boolean(process.env.VERCEL);

export const env = {
  raiz,
  porta: Number(process.env.PORT || 3333),
  ambiente: process.env.NODE_ENV || 'development',
  https: process.env.HTTPS_ENABLED === 'true',
  portaHttps: Number(process.env.HTTPS_PORT || 3443),
  // Banco PostgreSQL do Supabase (string de conexão do "Session pooler")
  db: {
    url: process.env.DATABASE_URL,
    schema: process.env.DB_SCHEMA || 'public',
    ssl: process.env.DB_SSL !== 'false',
    caSsl: process.env.DB_SSL_CA,
    maxConexoes: Number(process.env.DB_POOL_MAX || 10),
    fusoHorario: process.env.DB_TIMEZONE || 'America/Sao_Paulo',
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
  naVercel,
  pastaRelatorios: naVercel ? path.join(os.tmpdir(), 'sigaf-relatorios') : path.join(raiz, 'storage', 'relatorios'),
};
