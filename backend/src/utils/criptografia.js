import crypto from 'node:crypto';
import { env } from '../config/env.js';

const ALGORITMO = 'aes-256-gcm';

function chave() {
  if (!env.chaveCriptografia || env.chaveCriptografia.length !== 64) {
    throw new Error('ENCRYPTION_KEY deve ter 64 caracteres hexadecimais (32 bytes).');
  }
  return Buffer.from(env.chaveCriptografia, 'hex');
}

export function criptografar(texto) {
  const iv = crypto.randomBytes(12);
  const cifra = crypto.createCipheriv(ALGORITMO, chave(), iv);
  const conteudo = Buffer.concat([cifra.update(String(texto), 'utf8'), cifra.final()]);
  const tag = cifra.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${conteudo.toString('hex')}`;
}

export function descriptografar(valor) {
  if (!valor) return null;
  const [iv, tag, conteudo] = valor.split(':');
  const decifra = crypto.createDecipheriv(ALGORITMO, chave(), Buffer.from(iv, 'hex'));
  decifra.setAuthTag(Buffer.from(tag, 'hex'));
  return Buffer.concat([decifra.update(Buffer.from(conteudo, 'hex')), decifra.final()]).toString('utf8');
}

export function mascararCpf(cpf) {
  const d = String(cpf || '').replace(/\D/g, '');
  if (d.length !== 11) return '***.***.***-**';
  return `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**`;
}
