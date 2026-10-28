import { Router } from 'express';
import { query, transacao } from '../../config/db.js';
import { PerfilUsuario } from '../../domain/enums.js';
import { ipDe } from '../../middlewares/comuns.js';
import { ErroApp, naoEncontrado, proibido } from '../../utils/erros.js';
import { registrarLog } from '../auditoria/auditoria.service.js';
import { notificar } from '../notificacoes/notificacao.service.js';

const rotas = Router();

export const CATEGORIAS_CHAMADO = ['DUVIDA', 'PROBLEMA', 'ACESSO', 'SUGESTAO'];
export const PRIORIDADES_CHAMADO = ['BAIXA', 'MEDIA', 'ALTA'];
export const STATUS_CHAMADO = ['ABERTO', 'EM_ATENDIMENTO', 'RESOLVIDO'];

const ehSuporte = (usuario) => usuario.perfil === PerfilUsuario.ADMINISTRADOR;

const CAMPOS = `c.id, c.titulo, c.categoria, c.prioridade, c.status,
  c.criado_em AS "criadoEm", c.atualizado_em AS "atualizadoEm", c.resolvido_em AS "resolvidoEm",
  c.solicitante_id AS "solicitanteId", u.nome AS "solicitanteNome", u.perfil AS "solicitantePerfil",
  s.nome AS "setorNome",
  (SELECT COUNT(*)::int FROM chamado_mensagens m WHERE m.chamado_id = c.id) AS "mensagens"`;

const BASE = `FROM chamados c
  JOIN usuarios u ON u.id = c.solicitante_id
  LEFT JOIN setores s ON s.id = u.setor_id`;

async function buscarChamado(id) {
  const [chamado] = await query(`SELECT ${CAMPOS} ${BASE} WHERE c.id = ?`, [id]);
  return chamado || null;
}

function conferirAcesso(usuario, chamado) {
  if (!chamado) throw naoEncontrado('Chamado');
  if (!ehSuporte(usuario) && chamado.solicitanteId !== usuario.id) throw proibido('Este chamado não é seu.');
}

async function avisarSuporte(titulo, mensagem, link) {
  const admins = await query("SELECT id FROM usuarios WHERE perfil = 'ADMINISTRADOR' AND ativo");
  await Promise.all(admins.map((a) => notificar({ usuarioId: a.id, titulo, mensagem, link })));
}

export const TIPOS_ANEXO = {
  'image/jpeg': 'imagem',
  'image/png': 'imagem',
  'image/webp': 'imagem',
  'image/gif': 'imagem',
  'application/pdf': 'documento',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'documento',
  'text/csv': 'documento',
};
const MAX_ANEXOS = 4;
const MAX_BYTES_ANEXO = 3 * 1024 * 1024;
const MAX_BYTES_TOTAL = 3.5 * 1024 * 1024;
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

function validarAnexos(lista) {
  if (lista === undefined || lista === null) return [];
  if (!Array.isArray(lista)) throw new ErroApp('Anexos inválidos.', 422);
  if (lista.length > MAX_ANEXOS) throw new ErroApp(`Envie no máximo ${MAX_ANEXOS} arquivos por mensagem.`, 422);
  let total = 0;
  const anexos = lista.map((a) => {
    const tipo = String(a?.tipo || '').toLowerCase();
    const conteudo = String(a?.conteudo || '').replace(/^data:[^;]+;base64,/, '');
    const nome = String(a?.nome || 'arquivo').trim().replace(/[\\/:*?"<>|]+/g, '_').slice(0, 160) || 'arquivo';
    if (!TIPOS_ANEXO[tipo]) throw new ErroApp(`O arquivo ${nome} não é permitido. Envie imagens, PDF, Excel ou CSV.`, 422);
    if (!conteudo || !BASE64.test(conteudo)) throw new ErroApp(`O arquivo ${nome} está corrompido.`, 422);
    const tamanho = Math.floor((conteudo.length * 3) / 4) - (conteudo.endsWith('==') ? 2 : conteudo.endsWith('=') ? 1 : 0);
    if (tamanho > MAX_BYTES_ANEXO) throw new ErroApp(`O arquivo ${nome} passa de 3 MB.`, 422);
    total += tamanho;
    return { nome, tipo, tamanho, conteudo };
  });
  if (total > MAX_BYTES_TOTAL) throw new ErroApp('Os arquivos somam mais de 3,5 MB. Envie em mensagens separadas.', 422);
  return anexos;
}

async function salvarAnexos(cx, mensagemId, anexos) {
  for (const a of anexos) {
    await cx.query(
      'INSERT INTO chamado_anexos (mensagem_id, nome, tipo, tamanho, conteudo) VALUES (?, ?, ?, ?, ?)',
      [mensagemId, a.nome, a.tipo, a.tamanho, a.conteudo],
    );
  }
}

function texto(valor, campo, limite) {
  const t = String(valor ?? '').trim();
  if (!t) return { erro: { [campo]: 'Campo obrigatório.' } };
  if (t.length > limite) return { erro: { [campo]: `Use no máximo ${limite} caracteres.` } };
  return { valor: t };
}

rotas.get('/', async (req, res) => {
  const onde = [];
  const params = [];
  if (!ehSuporte(req.usuario)) { onde.push('c.solicitante_id = ?'); params.push(req.usuario.id); }
  if (STATUS_CHAMADO.includes(req.query.status)) { onde.push('c.status = ?'); params.push(req.query.status); }
  if (req.query.busca) {
    onde.push('(c.titulo ILIKE ? OR u.nome ILIKE ?)');
    params.push(`%${req.query.busca}%`, `%${req.query.busca}%`);
  }
  const where = onde.length ? `WHERE ${onde.join(' AND ')}` : '';
  const filtroContagem = ehSuporte(req.usuario) ? '' : 'WHERE solicitante_id = ?';
  const [itens, contagem] = await Promise.all([
    query(
      `SELECT ${CAMPOS} ${BASE} ${where}
        ORDER BY CASE c.status WHEN 'ABERTO' THEN 0 WHEN 'EM_ATENDIMENTO' THEN 1 ELSE 2 END,
                 CASE c.prioridade WHEN 'ALTA' THEN 0 WHEN 'MEDIA' THEN 1 ELSE 2 END,
                 c.atualizado_em DESC
        LIMIT 200`,
      params,
    ),
    query(
      `SELECT status, COUNT(*)::int AS total FROM chamados ${filtroContagem} GROUP BY status`,
      ehSuporte(req.usuario) ? [] : [req.usuario.id],
    ),
  ]);
  const totais = Object.fromEntries(STATUS_CHAMADO.map((s) => [s, 0]));
  contagem.forEach((c) => { totais[c.status] = c.total; });
  res.json({ itens, totais });
});

rotas.post('/', async (req, res) => {
  if (ehSuporte(req.usuario)) throw proibido('O suporte responde chamados, mas não abre chamados.');
  const { categoria, prioridade = 'MEDIA' } = req.body || {};
  const titulo = texto(req.body?.titulo, 'titulo', 160);
  const descricao = texto(req.body?.descricao, 'descricao', 4000);
  const anexos = validarAnexos(req.body?.anexos);
  const campos = { ...titulo.erro, ...descricao.erro };
  if (!CATEGORIAS_CHAMADO.includes(categoria)) campos.categoria = 'Escolha a categoria.';
  if (!PRIORIDADES_CHAMADO.includes(prioridade)) campos.prioridade = 'Prioridade inválida.';
  if (Object.keys(campos).length) throw new ErroApp('Preencha os dados do chamado.', 422, campos);

  const id = await transacao(async (cx) => {
    const [c] = await cx.query(
      'INSERT INTO chamados (titulo, categoria, prioridade, solicitante_id) VALUES (?, ?, ?, ?) RETURNING id',
      [titulo.valor, categoria, prioridade, req.usuario.id],
    );
    const [m] = await cx.query('INSERT INTO chamado_mensagens (chamado_id, autor_id, mensagem) VALUES (?, ?, ?) RETURNING id', [c.id, req.usuario.id, descricao.valor]);
    await salvarAnexos(cx, m.id, anexos);
    await registrarLog({ usuarioId: req.usuario.id, acao: 'CRIACAO', entidade: 'Chamado', entidadeId: c.id, detalhes: { titulo: titulo.valor, categoria, prioridade }, ip: ipDe(req) }, cx);
    return c.id;
  });
  await avisarSuporte('Novo chamado de suporte', `${req.usuario.nome} abriu o chamado #${id}: ${titulo.valor}`, `/chamados/${id}`);
  res.status(201).json({ chamado: await buscarChamado(id), mensagem: `Chamado #${id} aberto. O suporte vai responder por aqui.` });
});

rotas.get('/:id', async (req, res) => {
  const chamado = await buscarChamado(Number(req.params.id));
  conferirAcesso(req.usuario, chamado);
  const mensagens = await query(
    `SELECT m.id, m.mensagem, m.criada_em AS "criadaEm", m.autor_id AS "autorId"
       FROM chamado_mensagens m WHERE m.chamado_id = ? ORDER BY m.id`,
    [chamado.id],
  );
  const anexos = mensagens.length
    ? await query(
      `SELECT id, mensagem_id AS "mensagemId", nome, tipo, tamanho FROM chamado_anexos
        WHERE mensagem_id IN (${mensagens.map(() => '?').join(',')}) ORDER BY id`,
      mensagens.map((m) => m.id),
    )
    : [];
  mensagens.forEach((m) => { m.anexos = anexos.filter((a) => a.mensagemId === m.id); });
  const ids = [...new Set(mensagens.map((m) => m.autorId))];
  const autores = ids.length
    ? await query(`SELECT id, nome, perfil, foto FROM usuarios WHERE id IN (${ids.map(() => '?').join(',')})`, ids)
    : [];
  res.json({ chamado, mensagens, autores: Object.fromEntries(autores.map((a) => [a.id, a])) });
});

rotas.post('/:id/mensagens', async (req, res) => {
  const chamado = await buscarChamado(Number(req.params.id));
  conferirAcesso(req.usuario, chamado);
  const anexos = validarAnexos(req.body?.anexos);
  const corpo = anexos.length && !String(req.body?.mensagem ?? '').trim() ? { valor: '' } : texto(req.body?.mensagem, 'mensagem', 4000);
  if (corpo.erro) throw new ErroApp('Escreva a mensagem ou anexe um arquivo.', 422, corpo.erro);

  const suporte = ehSuporte(req.usuario);
  let status = chamado.status;
  if (suporte && status === 'ABERTO') status = 'EM_ATENDIMENTO';
  if (!suporte && status === 'RESOLVIDO') status = 'ABERTO';

  await transacao(async (cx) => {
    const [m] = await cx.query('INSERT INTO chamado_mensagens (chamado_id, autor_id, mensagem) VALUES (?, ?, ?) RETURNING id', [chamado.id, req.usuario.id, corpo.valor]);
    await salvarAnexos(cx, m.id, anexos);
    await cx.query(
      `UPDATE chamados SET status = ?, atualizado_em = CURRENT_TIMESTAMP,
              resolvido_em = CASE WHEN ? = 'RESOLVIDO' THEN resolvido_em ELSE NULL END WHERE id = ?`,
      [status, status, chamado.id],
    );
  });

  const link = `/chamados/${chamado.id}`;
  if (suporte) {
    await notificar({ usuarioId: chamado.solicitanteId, titulo: 'Resposta do suporte', mensagem: `O suporte respondeu o chamado #${chamado.id}: ${chamado.titulo}`, link });
  } else {
    await avisarSuporte('Nova mensagem em chamado', `${req.usuario.nome} respondeu o chamado #${chamado.id}: ${chamado.titulo}`, link);
  }
  res.status(201).json({ chamado: await buscarChamado(chamado.id), mensagem: 'Mensagem enviada.' });
});

rotas.get('/:id/anexos/:anexoId', async (req, res) => {
  const chamado = await buscarChamado(Number(req.params.id));
  conferirAcesso(req.usuario, chamado);
  const [anexo] = await query(
    `SELECT a.nome, a.tipo, a.conteudo FROM chamado_anexos a
       JOIN chamado_mensagens m ON m.id = a.mensagem_id
      WHERE a.id = ? AND m.chamado_id = ?`,
    [Number(req.params.anexoId), chamado.id],
  );
  if (!anexo) throw naoEncontrado('Anexo');
  const imagem = TIPOS_ANEXO[anexo.tipo] === 'imagem';
  res.setHeader('Content-Type', anexo.tipo);
  res.setHeader('Content-Disposition', `${imagem ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(anexo.nome)}`);
  res.setHeader('Cache-Control', 'private, max-age=86400');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.send(Buffer.from(anexo.conteudo, 'base64'));
});

rotas.patch('/:id/status', async (req, res) => {
  const chamado = await buscarChamado(Number(req.params.id));
  conferirAcesso(req.usuario, chamado);
  const { status } = req.body || {};
  if (!STATUS_CHAMADO.includes(status)) throw new ErroApp('Status inválido.', 422, { status: 'Status inválido.' });
  const suporte = ehSuporte(req.usuario);
  if (!suporte && status !== 'RESOLVIDO') throw proibido('Você só pode marcar o seu chamado como resolvido.');

  await query(
    `UPDATE chamados SET status = ?, atualizado_em = CURRENT_TIMESTAMP,
            resolvido_em = CASE WHEN ? = 'RESOLVIDO' THEN CURRENT_TIMESTAMP ELSE NULL END WHERE id = ?`,
    [status, status, chamado.id],
  );
  await registrarLog({ usuarioId: req.usuario.id, acao: 'ALTERACAO', entidade: 'Chamado', entidadeId: chamado.id, detalhes: { status }, ip: ipDe(req) });

  const ROTULOS = { ABERTO: 'reaberto', EM_ATENDIMENTO: 'em atendimento', RESOLVIDO: 'resolvido' };
  const link = `/chamados/${chamado.id}`;
  if (suporte) {
    await notificar({ usuarioId: chamado.solicitanteId, titulo: 'Chamado atualizado', mensagem: `O chamado #${chamado.id} foi marcado como ${ROTULOS[status]}.`, link });
  } else {
    await avisarSuporte('Chamado resolvido pelo usuário', `${req.usuario.nome} marcou o chamado #${chamado.id} como resolvido.`, link);
  }
  res.json({ chamado: await buscarChamado(chamado.id), mensagem: `Chamado ${ROTULOS[status]}.` });
});

export default rotas;
