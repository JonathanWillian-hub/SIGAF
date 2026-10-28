import { Router } from 'express';
import { query, MINUTOS } from '../../config/db.js';
import { Usuario } from '../../domain/Usuario.js';
import { ipDe } from '../../middlewares/comuns.js';
import { ErroApp } from '../../utils/erros.js';
import { registrarLog } from '../auditoria/auditoria.service.js';

const rotas = Router();
const FOTO_VALIDA = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
const TAMANHO_MAXIMO_FOTO = 90000;

function formatarCpf(cpf) {
  const d = String(cpf || '').replace(/\D/g, '');
  return d.length === 11 ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}` : null;
}

async function resumoDo(usuarioId) {
  const [[totais], acessos] = await Promise.all([
    query(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE r.status = 'PENDENTE')::int AS pendentes,
              COUNT(*) FILTER (WHERE r.status = 'HOMOLOGADO')::int AS homologados,
              COUNT(*) FILTER (WHERE r.status = 'REJEITADO')::int AS rejeitados,
              COALESCE(SUM(${MINUTOS}) FILTER (WHERE r.status = 'HOMOLOGADO'), 0)::int AS "minutosHomologados"
         FROM registros_atividade r WHERE r.executor_id = ?`,
      [usuarioId],
    ),
    query(
      `SELECT data_hora AS "dataHora", ip FROM logs_auditoria
        WHERE usuario_id = ? AND acao = 'LOGIN' ORDER BY id DESC LIMIT 5`,
      [usuarioId],
    ),
  ]);
  return { atividades: totais, acessos };
}

rotas.get('/', async (req, res) => {
  res.json({ usuario: req.usuario, resumo: await resumoDo(req.usuario.id) });
});

rotas.get('/cpf', async (req, res) => {
  res.json({ cpf: formatarCpf(req.usuario.cpf) });
});

rotas.put('/', async (req, res) => {
  const { telefone, notificarEmail } = req.body || {};
  const tel = telefone ? String(telefone).trim() : null;
  if (tel && !/^[\d\s()+-]{8,20}$/.test(tel)) {
    throw new ErroApp('Verifique os dados do perfil.', 422, { telefone: 'Telefone inválido.' });
  }
  await query('UPDATE usuarios SET telefone = ?, notificar_email = ? WHERE id = ?', [tel, notificarEmail !== false, req.usuario.id]);
  await registrarLog({ usuarioId: req.usuario.id, acao: 'ALTERACAO', entidade: 'Perfil', entidadeId: req.usuario.id, detalhes: { telefone: Boolean(tel), notificarEmail: notificarEmail !== false }, ip: ipDe(req) });
  res.json({ usuario: await Usuario.buscarPorId(req.usuario.id), mensagem: 'Perfil atualizado.' });
});

rotas.put('/foto', async (req, res) => {
  const { foto } = req.body || {};
  if (foto !== null && foto !== undefined && foto !== '') {
    if (!FOTO_VALIDA.test(foto)) throw new ErroApp('Envie uma imagem JPG, PNG ou WEBP.', 422);
    if (foto.length > TAMANHO_MAXIMO_FOTO) throw new ErroApp('A foto ficou grande demais. Escolha outra imagem.', 422);
  }
  await query('UPDATE usuarios SET foto = ? WHERE id = ?', [foto || null, req.usuario.id]);
  await registrarLog({ usuarioId: req.usuario.id, acao: 'ALTERACAO', entidade: 'Perfil', entidadeId: req.usuario.id, detalhes: { foto: foto ? 'alterada' : 'removida' }, ip: ipDe(req) });
  res.json({ usuario: await Usuario.buscarPorId(req.usuario.id), mensagem: foto ? 'Foto atualizada.' : 'Foto removida.' });
});

rotas.put('/senha', async (req, res) => {
  const { senhaAtual, novaSenha } = req.body || {};
  const campos = {};
  if (!senhaAtual) campos.senhaAtual = 'Informe a senha atual.';
  if (!novaSenha) campos.novaSenha = 'Informe a nova senha.';
  else if (String(novaSenha).length < 8) campos.novaSenha = 'A senha deve ter ao menos 8 caracteres.';
  else if (novaSenha === senhaAtual) campos.novaSenha = 'A nova senha deve ser diferente da atual.';
  if (Object.keys(campos).length) throw new ErroApp('Verifique as senhas.', 422, campos);
  if (!(await req.usuario.autenticar(senhaAtual))) {
    throw new ErroApp('Senha atual incorreta.', 422, { senhaAtual: 'Senha atual incorreta.' });
  }
  await query('UPDATE usuarios SET senha_hash = ? WHERE id = ?', [await Usuario.gerarHashSenha(novaSenha), req.usuario.id]);
  await registrarLog({ usuarioId: req.usuario.id, acao: 'ALTERACAO', entidade: 'Perfil', entidadeId: req.usuario.id, detalhes: { senha: 'alterada' }, ip: ipDe(req) });
  res.json({ mensagem: 'Senha alterada com sucesso.' });
});

export default rotas;
