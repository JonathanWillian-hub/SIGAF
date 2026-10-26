// Cria o banco SIGAF do zero (schema.sql) e popula com dados de demonstração.
// Uso: npm run db:setup     (ATENÇÃO: apaga e recria as tabelas)
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import { env } from '../config/env.js';
import { Usuario } from '../domain/Usuario.js';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const SENHA_PADRAO = 'Sigaf@2026';

// Gerador pseudoaleatório com semente fixa: o seed sai sempre igual.
function mulberry32(semente) {
  let a = semente;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(2026);
const escolher = (lista) => lista[Math.floor(rnd() * lista.length)];
const inteiro = (min, max) => min + Math.floor(rnd() * (max - min + 1));

function gerarCpf() {
  const d = Array.from({ length: 9 }, () => inteiro(0, 9));
  const dig = (n) => {
    const soma = d.slice(0, n).reduce((acc, v, i) => acc + v * (n + 1 - i), 0);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  d.push(dig(9));
  d.push(dig(10));
  return d.join('');
}

const fmtData = (dt) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;

const SETORES = [
  ['Logística & Expedição', 'LOG'],
  ['Manutenção Industrial', 'MAN'],
  ['Operações Gerais', 'OPE'],
  ['Tecnologia da Informação', 'TI'],
  ['Recursos Humanos', 'RH'],
  ['Recepção e Triagem', 'REC'],
];

const DISCIPLINAS = [
  ['Gestão de Pátio e Cargas', 'Movimentação, conferência e expedição de cargas'],
  ['Manutenção Preventiva', 'Rotinas planejadas de inspeção e manutenção'],
  ['Manutenção Corretiva', 'Atendimento a falhas e paradas de equipamentos'],
  ['Suporte Técnico', 'Atendimento a usuários, rede e equipamentos de TI'],
  ['Atendimento ao Público', 'Recepção, triagem e orientação'],
  ['Treinamento e Capacitação', 'Instrutoria e acompanhamento de turmas'],
  ['Fechamento de Ponto', 'Conferência de escalas, jornadas e espelho de ponto'],
  ['Inventário', 'Contagem e conciliação de estoque'],
];

// [nome, matricula, email, perfil, codigoSetor]
const USUARIOS = [
  ['Administrador SIGAF', '100001', 'admin@sigaf.com', 'ADMINISTRADOR', 'TI'],
  ['Patrícia Moura', '200101', 'gestor@sigaf.com', 'GESTOR', 'LOG'],
  ['Ricardo Teles', '200102', 'gestor.manutencao@sigaf.com', 'GESTOR', 'MAN'],
  ['Carlos Mendes', '448201', 'colaborador@sigaf.com', 'COLABORADOR', 'LOG'],
  ['Mariana Silva', '102930', 'mariana.silva@sigaf.com', 'COLABORADOR', 'LOG'],
  ['Luciano Prado', '348120', 'luciano.prado@sigaf.com', 'COLABORADOR', 'OPE'],
  ['Aline Santoro', '511902', 'aline.santoro@sigaf.com', 'COLABORADOR', 'OPE'],
  ['Rafael Fonseca', '291110', 'rafael.fonseca@sigaf.com', 'COLABORADOR', 'MAN'],
  ['Amanda Castro', '441020', 'amanda.castro@sigaf.com', 'COLABORADOR', 'MAN'],
  ['Bruno Lima', '321475', 'bruno.lima@sigaf.com', 'COLABORADOR', 'TI'],
  ['Carlos Eduardo', '902140', 'carlos.eduardo@sigaf.com', 'COLABORADOR', 'TI'],
  ['Gabriela Albuquerque', '900210', 'gabriela.albuquerque@sigaf.com', 'COLABORADOR', 'RH'],
  ['Felipe Antunes', '883190', 'felipe.antunes@sigaf.com', 'COLABORADOR', 'RH'],
  ['Juliana Rocha', '557310', 'juliana.rocha@sigaf.com', 'COLABORADOR', 'REC'],
  ['Thiago Martins', '612480', 'thiago.martins@sigaf.com', 'COLABORADOR', 'LOG'],
];

const TAREFAS = {
  LOG: ['Gestão de pátio e cargas críticas', 'Conferência e expedição de pedidos do turno', 'Recebimento e armazenagem de mercadorias', 'Organização da doca 3 e carregamento de caminhões'],
  MAN: ['Manutenção preventiva da subestação elétrica B', 'Troca de rolamentos da esteira principal', 'Inspeção dos compressores de ar', 'Correção de vazamento na linha hidráulica'],
  OPE: ['Triagem e etiquetagem do turno vespertino', 'Controle de produção da linha 2', 'Apoio na separação de materiais', 'Organização do almoxarifado'],
  TI: ['Suporte a coletores de dados e rede física', 'Configuração de estações de trabalho', 'Atendimento de chamados de impressoras', 'Backup e verificação do servidor de arquivos'],
  RH: ['Fechamento de escala e espelho de ponto', 'Integração de novos colaboradores', 'Conferência de banco de horas', 'Apoio no treinamento de segurança (NR-12)'],
  REC: ['Recepção e triagem de visitantes', 'Controle de acesso da portaria principal', 'Atendimento telefônico e agendamentos', 'Cadastro de prestadores de serviço'],
};

async function main() {
  console.log(`> Conectando ao MySQL em ${env.db.host}:${env.db.port}...`);
  const cx = await mysql.createConnection({
    host: env.db.host, port: env.db.port, user: env.db.user, password: env.db.password,
    multipleStatements: true, dateStrings: true,
  });

  const schema = (await fs.readFile(path.join(aqui, 'schema.sql'), 'utf8')).replaceAll('{{DB_NAME}}', `\`${env.db.database}\``);
  await cx.query(schema);
  console.log(`> Banco "${env.db.database}" criado.`);

  for (const [nome, codigo] of SETORES) await cx.query('INSERT INTO setores (nome, codigo) VALUES (?, ?)', [nome, codigo]);
  for (const [nome, desc] of DISCIPLINAS) await cx.query('INSERT INTO disciplinas (nome, descricao) VALUES (?, ?)', [nome, desc]);
  const [setores] = await cx.query('SELECT id, codigo FROM setores');
  const idSetor = Object.fromEntries(setores.map((s) => [s.codigo, s.id]));
  const [disciplinas] = await cx.query('SELECT id, nome FROM disciplinas');

  const hash = await Usuario.gerarHashSenha(SENHA_PADRAO);
  const usuarios = [];
  for (const [nome, matricula, email, perfil, setor] of USUARIOS) {
    const [r] = await cx.query(
      'INSERT INTO usuarios (nome, matricula, cpf, email, senha_hash, perfil, setor_id) VALUES (?,?,?,?,?,?,?)',
      [nome, matricula, Usuario.cpfCriptografado(gerarCpf()), email, hash, perfil, idSetor[setor]],
    );
    usuarios.push({ id: r.insertId, nome, perfil, setor });
  }
  console.log(`> ${usuarios.length} usuários criados (senha padrão: ${SENHA_PADRAO}).`);

  const colaboradores = usuarios.filter((u) => u.perfil === 'COLABORADOR');
  const gestorDe = { LOG: usuarios[1].id, MAN: usuarios[2].id };
  const adminId = usuarios[0].id;
  const disciplinaPorSetor = {
    LOG: ['Gestão de Pátio e Cargas', 'Inventário'], MAN: ['Manutenção Preventiva', 'Manutenção Corretiva'],
    OPE: ['Inventário', 'Gestão de Pátio e Cargas'], TI: ['Suporte Técnico'], RH: ['Fechamento de Ponto', 'Treinamento e Capacitação'],
    REC: ['Atendimento ao Público'],
  };
  const categorias = ['ATIVIDADE_EXTRAORDINARIA', 'ATIVIDADE_EXTRAORDINARIA', 'SUBSTITUICAO', 'SUBSTITUICAO', 'COBERTURA_HORARIO', 'APOIO_OPERACIONAL'];

  const hoje = new Date();
  let total = 0;
  for (let i = 0; i < 160; i += 1) {
    const executor = escolher(colaboradores);
    const categoria = escolher(categorias);
    const setor = categoria === 'APOIO_OPERACIONAL' && rnd() < 0.6 ? escolher(SETORES)[1] : executor.setor;
    let substituido = null;
    if (categoria === 'SUBSTITUICAO' || categoria === 'COBERTURA_HORARIO') {
      const candidatos = colaboradores.filter((c) => c.id !== executor.id && c.setor === executor.setor);
      substituido = (candidatos.length ? escolher(candidatos) : escolher(colaboradores.filter((c) => c.id !== executor.id))).id;
    }
    const diasAtras = i < 6 ? i % 3 : inteiro(0, 89);
    const dt = new Date(hoje);
    dt.setDate(dt.getDate() - diasAtras);
    // registros de hoje terminam antes do horário atual (nada "no futuro")
    const ini = diasAtras === 0 ? inteiro(6, 7) : inteiro(6, 17);
    const fim = diasAtras === 0 ? Math.min(ini + inteiro(2, 4), Math.max(hoje.getHours(), ini + 1)) : Math.min(ini + inteiro(2, 8), 23);
    const nomesDisc = disciplinaPorSetor[setor];
    const disciplina = rnd() < 0.85 ? disciplinas.find((d) => d.nome === escolher(nomesDisc))?.id : null;

    let status = 'PENDENTE';
    const sorteio = rnd();
    if (diasAtras > 6) status = sorteio < 0.84 ? 'HOMOLOGADO' : sorteio < 0.93 ? 'REJEITADO' : 'PENDENTE';
    else status = sorteio < 0.45 ? 'HOMOLOGADO' : sorteio < 0.52 ? 'REJEITADO' : 'PENDENTE';
    const homologador = status === 'PENDENTE' ? null : (gestorDe[setor] || adminId);
    const justificativa = status === 'REJEITADO' ? escolher([
      'Horário não confere com a escala do setor.', 'Descrição das tarefas insuficiente, detalhar as atividades.',
      'Substituição não autorizada previamente pela coordenação.',
    ]) : null;

    const criacao = `${fmtData(dt)} ${String(fim).padStart(2, '0')}:${String(inteiro(5, 55)).padStart(2, '0')}:00`;
    const agora = `${fmtData(hoje)} ${String(hoje.getHours()).padStart(2, '0')}:${String(hoje.getMinutes()).padStart(2, '0')}:00`;
    await cx.query(
      `INSERT INTO ${env.db.database}.registros_atividade
        (categoria, data, horario_inicio, horario_fim, descricao_tarefas, data_criacao, executor_id, substituido_id,
         disciplina_id, setor_id, criado_por_id, status, justificativa, homologado_por_id, homologado_em)
       VALUES (?,?,?,?,?,LEAST(?,?),?,?,?,?,?,?,?,?, ${homologador ? 'LEAST(DATE_ADD(?, INTERVAL 1 DAY), ?)' : '?'})`,
      [categoria, fmtData(dt), `${String(ini).padStart(2, '0')}:00:00`, `${String(fim).padStart(2, '0')}:00:00`,
        escolher(TAREFAS[setor]), criacao, agora, executor.id, substituido, disciplina || null, idSetor[setor], executor.id,
        status, justificativa, homologador, ...(homologador ? [criacao, agora] : [null])],
    );
    total += 1;
  }
  console.log(`> ${total} registros de atividade criados.`);

  await cx.query(
    `INSERT INTO ${env.db.database}.notificacoes (usuario_id, titulo, mensagem, link) VALUES
      (?, 'Bem-vindo ao SIGAF', 'Seus registros de atividades e substituições agora ficam centralizados aqui.', '/')`,
    [usuarios[3].id],
  );

  await cx.end();
  console.log('> Pronto! Acessos de demonstração:');
  console.log(`   Administrador: admin@sigaf.com        / ${SENHA_PADRAO}`);
  console.log(`   Gestor:        gestor@sigaf.com       / ${SENHA_PADRAO}`);
  console.log(`   Colaborador:   colaborador@sigaf.com  / ${SENHA_PADRAO}`);
}

main().catch((e) => {
  console.error('Falha ao montar o banco:', e.message);
  process.exit(1);
});
