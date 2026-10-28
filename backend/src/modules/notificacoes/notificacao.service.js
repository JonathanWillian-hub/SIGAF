import nodemailer from 'nodemailer';
import { env } from '../../config/env.js';
import { query } from '../../config/db.js';

let transporte = null;
function obterTransporte() {
  if (!env.smtp.host) return null;
  if (!transporte) {
    transporte = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.port === 465,
      auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
    });
  }
  return transporte;
}

export async function notificar({ usuarioId, titulo, mensagem, link = null }) {
  const [r] = await query(
    'INSERT INTO notificacoes (usuario_id, titulo, mensagem, link) VALUES (?, ?, ?, ?) RETURNING id',
    [usuarioId, titulo, mensagem, link],
  );

  const smtp = obterTransporte();
  if (smtp) {
    const [u] = await query('SELECT email, nome, notificar_email FROM usuarios WHERE id = ?', [usuarioId]);
    if (u?.email && u.notificar_email !== false) {
      smtp.sendMail({ from: env.smtp.from, to: u.email, subject: `[SIGAF] ${titulo}`, text: `Olá, ${u.nome}.\n\n${mensagem}` })
        .catch((e) => console.warn('[notificacao] falha ao enviar e-mail:', e.message));
    }
  }
  return r.id;
}

export async function listarDoUsuario(usuarioId, limite = 20) {
  const [itens, [{ naoLidas }]] = await Promise.all([
    query(
      `SELECT id, titulo, mensagem, link, lida, criada_em AS "criadaEm" FROM notificacoes
        WHERE usuario_id = ? ORDER BY id DESC LIMIT ?`,
      [usuarioId, limite],
    ),
    query('SELECT COUNT(*) AS "naoLidas" FROM notificacoes WHERE usuario_id = ? AND lida = false', [usuarioId]),
  ]);
  return { itens: itens.map((n) => ({ ...n, lida: Boolean(n.lida) })), naoLidas: Number(naoLidas) };
}

export async function marcarLidas(usuarioId, id = null) {
  if (id) await query('UPDATE notificacoes SET lida = true WHERE id = ? AND usuario_id = ?', [id, usuarioId]);
  else await query('UPDATE notificacoes SET lida = true WHERE usuario_id = ?', [usuarioId]);
}
