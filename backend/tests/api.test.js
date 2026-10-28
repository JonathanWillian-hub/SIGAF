import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
process.env.REPORT_ASYNC_THRESHOLD = '30';
const { criarApp } = await import('../src/app.js');
const { pool } = await import('../src/config/db.js');

const app = criarApp();
const SENHA = 'Sigaf@2026';
const tokens = {};
let criadoId;

async function entrar(email) {
  const r = await request(app).post('/api/auth/login').send({ email, senha: SENHA });
  assert.equal(r.status, 200);
  return r.body.token;
}

before(async () => {
  tokens.colaborador = await entrar('colaborador@sigaf.com');
  tokens.gestor = await entrar('gestor@sigaf.com');
  tokens.admin = await entrar('admin@sigaf.com');
});

after(async () => {
  if (criadoId) await request(app).delete(`/api/registros/${criadoId}`).set('Authorization', `Bearer ${tokens.gestor}`);
  await pool.end();
});

const auth = (perfil) => ({ Authorization: `Bearer ${tokens[perfil]}` });

describe('Autenticação e controle de acesso', () => {
  test('login com senha errada é recusado (401)', async () => {
    const r = await request(app).post('/api/auth/login').send({ email: 'gestor@sigaf.com', senha: 'errada' });
    assert.equal(r.status, 401);
  });
  test('login devolve token e perfil (RF05 passo 3)', async () => {
    const r = await request(app).post('/api/auth/login').send({ email: 'gestor@sigaf.com', senha: SENHA });
    assert.ok(r.body.token);
    assert.equal(r.body.usuario.perfil, 'GESTOR');
    assert.match(r.body.usuario.cpf, /^\*\*\*\./, 'CPF deve sair mascarado');
  });
  test('rota protegida sem token = 401', async () => {
    assert.equal((await request(app).get('/api/registros')).status, 401);
  });
  test('colaborador não acessa relatórios nem homologação (403)', async () => {
    assert.equal((await request(app).get('/api/relatorios').set(auth('colaborador'))).status, 403);
    assert.equal((await request(app).get('/api/homologacao/pendentes').set(auth('colaborador'))).status, 403);
  });
});

describe('RF01 / RF02: registro de atividade', () => {
  test('lista as 4 categorias', async () => {
    const r = await request(app).get('/api/apontamentos/categorias').set(auth('colaborador'));
    assert.deepEqual(r.body.map((c) => c.codigo), ['ATIVIDADE_EXTRAORDINARIA', 'SUBSTITUICAO', 'COBERTURA_HORARIO', 'APOIO_OPERACIONAL']);
  });
  test('A1: campos obrigatórios vazios = 422 com os campos', async () => {
    const r = await request(app).post('/api/registros').set(auth('colaborador')).send({});
    assert.equal(r.status, 422);
    assert.ok(r.body.campos.descricaoTarefas);
  });
  test('A2: fim antes do início = 422', async () => {
    const r = await request(app).post('/api/registros').set(auth('colaborador')).send({
      categoria: 'ATIVIDADE_EXTRAORDINARIA', data: '2026-10-20', horarioInicio: '18:00', horarioFim: '09:00', setorId: 1, descricaoTarefas: 'Inventário',
    });
    assert.equal(r.status, 422);
    assert.match(r.body.erro, /Inconsistência de horário/);
  });
  test('registro válido é salvo com "Registro salvo com sucesso"', async () => {
    const r = await request(app).post('/api/registros').set(auth('colaborador')).send({
      categoria: 'SUBSTITUICAO', substituidoId: 5, data: '2026-10-20', horarioInicio: '08:00', horarioFim: '12:00', setorId: 1,
      descricaoTarefas: 'Teste automatizado: cobertura da doca 3',
    });
    assert.equal(r.status, 201);
    assert.equal(r.body.mensagem, 'Registro salvo com sucesso');
    assert.equal(r.body.registro.status, 'PENDENTE');
    criadoId = r.body.registro.id;
  });
  test('colaborador sempre fica como executor do próprio registro', async () => {
    const r = await request(app).get(`/api/registros/${criadoId}`).set(auth('colaborador'));
    assert.equal(r.body.executorNome, 'Carlos Mendes');
  });
});

describe('RF03: consulta de histórico', () => {
  test('filtro por categoria devolve só substituições', async () => {
    const r = await request(app).get('/api/registros').query({ categoria: 'SUBSTITUICAO' }).set(auth('gestor'));
    assert.ok(r.body.total > 0);
    assert.ok(r.body.itens.every((i) => i.categoria === 'SUBSTITUICAO'));
  });
  test('A1: nenhum registro encontrado', async () => {
    const r = await request(app).get('/api/registros').query({ dataInicio: '2000-01-01', dataFim: '2000-01-02' }).set(auth('gestor'));
    assert.equal(r.body.total, 0);
    assert.equal(r.body.mensagem, 'Nenhum registro encontrado para os filtros informados');
  });
  test('gestor só enxerga registros da sua equipe', async () => {
    const r = await request(app).get('/api/registros').query({ porPagina: 100 }).set(auth('gestor'));
    assert.ok(r.body.itens.every((i) => i.setorNome === 'Logística & Expedição'));
  });
});

describe('Homologação + notificação', () => {
  test('rejeitar sem justificativa = 422', async () => {
    const r = await request(app).patch(`/api/homologacao/${criadoId}`).set(auth('gestor')).send({ decisao: 'REJEITAR' });
    assert.equal(r.status, 422);
  });
  test('aprovar muda status para HOMOLOGADO e notifica o colaborador', async () => {
    const r = await request(app).patch(`/api/homologacao/${criadoId}`).set(auth('gestor')).send({ decisao: 'APROVAR' });
    assert.equal(r.status, 200);
    assert.equal(r.body.registro.status, 'HOMOLOGADO');
    const n = await request(app).get('/api/notificacoes').set(auth('colaborador'));
    assert.equal(n.body.itens[0].titulo, 'Registro homologado');
  });
  test('RNF06: a homologação ficou registrada na auditoria', async () => {
    const r = await request(app).get('/api/auditoria').query({ acao: 'HOMOLOGACAO' }).set(auth('gestor'));
    assert.ok(r.body.itens.some((l) => l.entidadeId === criadoId && l.usuarioNome === 'Patrícia Moura'));
  });
});

describe('RF04: relatórios', () => {
  test('volume normal gera na hora e permite download', async () => {
    const r = await request(app).post('/api/relatorios').set(auth('gestor'))
      .send({ formato: 'CSV', dataInicioFiltro: '2026-10-01', dataFimFiltro: '2026-10-26' });
    assert.equal(r.status, 201);
    assert.equal(r.body.relatorio.status, 'CONCLUIDO');
    const arq = await request(app).get(r.body.relatorio.arquivoUrl).set(auth('gestor'));
    assert.equal(arq.status, 200);
    assert.match(arq.headers['content-type'], /text\/csv/);
  });
  test('A1: volume excedente vai para segundo plano (202)', async () => {
    const r = await request(app).post('/api/relatorios').set(auth('gestor'))
      .send({ formato: 'EXCEL', dataInicioFiltro: '2026-01-01', dataFimFiltro: '2026-12-31' });
    assert.equal(r.status, 202);
    assert.match(r.body.mensagem, /segundo plano/);
    await new Promise((ok) => setTimeout(ok, 1500));
  });
});

describe('RNF03: tempo de resposta', () => {
  test('consulta do dashboard responde em menos de 2 segundos', async () => {
    const r = await request(app).get('/api/dashboard').set(auth('gestor'));
    assert.ok(parseFloat(r.headers['x-response-time']) < 2000);
  });
});

describe('Gestor cria contas da equipe', () => {
  const sufixo = String(Date.now()).slice(-6);
  let novoId;

  test('gestor cria colaborador e o sistema força perfil e setor da equipe', async () => {
    const r = await request(app).post('/api/cadastros/usuarios').set(auth('gestor')).send({
      nome: 'Colaborador Teste', matricula: `T${sufixo}`, cpf: '529.982.247-25', email: `teste${sufixo}@sigaf.com`,
      senha: 'Senha@2026', perfil: 'ADMINISTRADOR', setorId: 6,
    });
    assert.equal(r.status, 201);
    assert.equal(r.body.perfil, 'COLABORADOR');
    assert.equal(r.body.setorNome, 'Logística & Expedição');
    novoId = r.body.id;
  });

  test('a conta criada pelo gestor consegue entrar no sistema', async () => {
    const r = await request(app).post('/api/auth/login').send({ email: `teste${sufixo}@sigaf.com`, senha: 'Senha@2026' });
    assert.equal(r.status, 200);
    assert.equal(r.body.usuario.perfil, 'COLABORADOR');
  });

  test('gestor vê só a própria equipe', async () => {
    const r = await request(app).get('/api/cadastros/usuarios').set(auth('gestor'));
    assert.ok(r.body.length > 0);
    assert.ok(r.body.every((u) => u.setorNome === 'Logística & Expedição'));
    assert.ok(r.body.some((u) => u.id === novoId && u.editavel));
  });

  test('gestor não altera usuário de outro setor', async () => {
    const todos = await request(app).get('/api/cadastros/usuarios').set(auth('admin'));
    const deFora = todos.body.find((u) => u.setorNome !== 'Logística & Expedição');
    const r = await request(app).put(`/api/cadastros/usuarios/${deFora.id}`).set(auth('gestor')).send({
      nome: deFora.nome, matricula: deFora.matricula, email: deFora.email, perfil: 'COLABORADOR',
    });
    assert.equal(r.status, 403);
  });

  test('colaborador não cria contas', async () => {
    const r = await request(app).post('/api/cadastros/usuarios').set(auth('colaborador')).send({});
    assert.equal(r.status, 403);
  });
});

describe('Meu perfil', () => {
  const FOTO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  test('mostra os dados do próprio usuário e o resumo das atividades', async () => {
    const r = await request(app).get('/api/perfil').set(auth('colaborador'));
    assert.equal(r.status, 200);
    assert.equal(r.body.usuario.email, 'colaborador@sigaf.com');
    assert.match(r.body.usuario.cpf, /^\*\*\*\./);
    assert.ok(r.body.resumo.atividades.total >= 1);
    assert.ok(Array.isArray(r.body.resumo.acessos));
  });

  test('o próprio usuário consegue ver o CPF completo', async () => {
    const r = await request(app).get('/api/perfil/cpf').set(auth('colaborador'));
    assert.match(r.body.cpf, /^\d{3}\.\d{3}\.\d{3}-\d{2}$/);
  });

  test('atualiza telefone e preferência de e-mail', async () => {
    const r = await request(app).put('/api/perfil').set(auth('colaborador')).send({ telefone: '(12) 99999-0000', notificarEmail: false });
    assert.equal(r.status, 200);
    assert.equal(r.body.usuario.telefone, '(12) 99999-0000');
    assert.equal(r.body.usuario.notificarEmail, false);
    await request(app).put('/api/perfil').set(auth('colaborador')).send({ telefone: '', notificarEmail: true });
  });

  test('telefone inválido = 422', async () => {
    const r = await request(app).put('/api/perfil').set(auth('colaborador')).send({ telefone: 'abc' });
    assert.equal(r.status, 422);
  });

  test('envia e remove a foto', async () => {
    const r = await request(app).put('/api/perfil/foto').set(auth('colaborador')).send({ foto: FOTO });
    assert.equal(r.status, 200);
    assert.equal(r.body.usuario.foto, FOTO);
    const sem = await request(app).put('/api/perfil/foto').set(auth('colaborador')).send({ foto: null });
    assert.equal(sem.body.usuario.foto, null);
  });

  test('arquivo que não é imagem = 422', async () => {
    const r = await request(app).put('/api/perfil/foto').set(auth('colaborador')).send({ foto: 'data:text/html;base64,PHNjcmlwdD4=' });
    assert.equal(r.status, 422);
  });

  test('troca de senha exige a senha atual correta', async () => {
    const errada = await request(app).put('/api/perfil/senha').set(auth('colaborador')).send({ senhaAtual: 'errada123', novaSenha: 'NovaSenha@1' });
    assert.equal(errada.status, 422);
    const ok = await request(app).put('/api/perfil/senha').set(auth('colaborador')).send({ senhaAtual: SENHA, novaSenha: 'NovaSenha@1' });
    assert.equal(ok.status, 200);
    const login = await request(app).post('/api/auth/login').send({ email: 'colaborador@sigaf.com', senha: 'NovaSenha@1' });
    assert.equal(login.status, 200);
    await request(app).put('/api/perfil/senha').set(auth('colaborador')).send({ senhaAtual: 'NovaSenha@1', novaSenha: SENHA });
  });
});

describe('Administrador é o suporte da plataforma, sem acesso aos dados da empresa', () => {
  test('não acessa registros, painel, homologação, relatórios nem auditoria (403)', async () => {
    for (const rota of ['/api/registros', '/api/dashboard', '/api/homologacao/pendentes', '/api/relatorios', '/api/auditoria', '/api/apontamentos/categorias']) {
      const r = await request(app).get(rota).set(auth('admin'));
      assert.equal(r.status, 403, rota);
    }
  });

  test('cria gestor com setor', async () => {
    const sufixo = String(Date.now()).slice(-6);
    const r = await request(app).post('/api/cadastros/usuarios').set(auth('admin')).send({
      nome: 'Gestora Teste', matricula: `G${sufixo}`, cpf: '529.982.247-25', email: `gestora${sufixo}@sigaf.com`,
      senha: 'Senha@2026', perfil: 'GESTOR', setorId: 6, cargo: 'Coordenadora',
    });
    assert.equal(r.status, 201);
    assert.equal(r.body.perfil, 'GESTOR');
    assert.equal(r.body.cargo, 'Coordenadora');
  });

  let colaboradorId;
  test('cria colaborador em qualquer setor', async () => {
    const sufixo = String(Date.now()).slice(-6);
    const r = await request(app).post('/api/cadastros/usuarios').set(auth('admin')).send({
      nome: 'Colaborador do Admin', matricula: `C${sufixo}`, cpf: '529.982.247-25', email: `colab${sufixo}@sigaf.com`,
      senha: 'Senha@2026', perfil: 'COLABORADOR', setorId: 2,
    });
    assert.equal(r.status, 201);
    assert.equal(r.body.perfil, 'COLABORADOR');
    colaboradorId = r.body.id;
  });

  test('colaborador sem setor = 422', async () => {
    const r = await request(app).post('/api/cadastros/usuarios').set(auth('admin')).send({
      nome: 'X', matricula: 'X1', cpf: '529.982.247-25', email: 'x1@sigaf.com', senha: 'Senha@2026', perfil: 'COLABORADOR',
    });
    assert.equal(r.status, 422);
    assert.ok(r.body.campos.setorId);
  });

  test('vê a situação de todas as contas e desativa um colaborador', async () => {
    const r = await request(app).get('/api/cadastros/usuarios').set(auth('admin'));
    const colab = r.body.find((u) => u.id === colaboradorId);
    assert.equal(colab.ativo, true);
    assert.equal(colab.editavel, true);
    assert.match(colab.cpf, /^\*\*\*\./);
    const put = await request(app).put(`/api/cadastros/usuarios/${colab.id}`).set(auth('admin')).send({
      nome: colab.nome, matricula: colab.matricula, email: colab.email, perfil: 'COLABORADOR', setorId: colab.setorId, ativo: false,
    });
    assert.equal(put.status, 200);
    assert.equal(put.body.ativo, false);
  });

  test('painel do sistema mostra contas e chamados, só para o administrador', async () => {
    const r = await request(app).get('/api/sistema/resumo').set(auth('admin'));
    assert.equal(r.status, 200);
    assert.ok(r.body.usuarios.ativos > 0);
    assert.ok(Array.isArray(r.body.setores));
    assert.equal((await request(app).get('/api/sistema/resumo').set(auth('gestor'))).status, 403);
  });
});

describe('Chamados de suporte', () => {
  let chamadoId;

  test('colaborador abre chamado e o suporte é notificado', async () => {
    const r = await request(app).post('/api/chamados').set(auth('colaborador')).send({
      titulo: 'Não consigo anexar o registro', categoria: 'PROBLEMA', prioridade: 'ALTA', descricao: 'Aparece um erro ao salvar.',
    });
    assert.equal(r.status, 201);
    assert.equal(r.body.chamado.status, 'ABERTO');
    chamadoId = r.body.chamado.id;
    const n = await request(app).get('/api/notificacoes').set(auth('admin'));
    assert.equal(n.body.itens[0].titulo, 'Novo chamado de suporte');
  });

  test('campos obrigatórios = 422', async () => {
    const r = await request(app).post('/api/chamados').set(auth('colaborador')).send({});
    assert.equal(r.status, 422);
    assert.ok(r.body.campos.titulo && r.body.campos.categoria && r.body.campos.descricao);
  });

  test('administrador não abre chamado', async () => {
    const r = await request(app).post('/api/chamados').set(auth('admin')).send({ titulo: 'a', categoria: 'DUVIDA', descricao: 'b' });
    assert.equal(r.status, 403);
  });

  test('outro usuário não vê o chamado de alguém', async () => {
    assert.equal((await request(app).get(`/api/chamados/${chamadoId}`).set(auth('gestor'))).status, 403);
    const lista = await request(app).get('/api/chamados').set(auth('gestor'));
    assert.ok(lista.body.itens.every((c) => c.id !== chamadoId));
  });

  test('suporte responde, o chamado entra em atendimento e o usuário é avisado', async () => {
    const r = await request(app).post(`/api/chamados/${chamadoId}/mensagens`).set(auth('admin')).send({ mensagem: 'Pode mandar um print?' });
    assert.equal(r.status, 201);
    assert.equal(r.body.chamado.status, 'EM_ATENDIMENTO');
    const n = await request(app).get('/api/notificacoes').set(auth('colaborador'));
    assert.equal(n.body.itens[0].titulo, 'Resposta do suporte');
    const d = await request(app).get(`/api/chamados/${chamadoId}`).set(auth('colaborador'));
    assert.equal(d.body.mensagens.length, 2);
    assert.ok(d.body.autores[d.body.mensagens[1].autorId]);
  });

  test('usuário marca como resolvido e não pode reabrir pelo status', async () => {
    const ok = await request(app).patch(`/api/chamados/${chamadoId}/status`).set(auth('colaborador')).send({ status: 'RESOLVIDO' });
    assert.equal(ok.body.chamado.status, 'RESOLVIDO');
    const nao = await request(app).patch(`/api/chamados/${chamadoId}/status`).set(auth('colaborador')).send({ status: 'EM_ATENDIMENTO' });
    assert.equal(nao.status, 403);
  });

  test('nova mensagem do usuário reabre o chamado resolvido', async () => {
    const r = await request(app).post(`/api/chamados/${chamadoId}/mensagens`).set(auth('colaborador')).send({ mensagem: 'Voltou a acontecer.' });
    assert.equal(r.body.chamado.status, 'ABERTO');
  });
});
