// Script de apoio a testes: cria gestores para os setores que ainda não têm
// e move os registros de teste 166/167 para o setor da Patrícia (Logística).
import { pool, query } from '../src/config/db.js';
import { Usuario } from '../src/domain/Usuario.js';

const GESTORES = [
  ['Fernanda Rocha', '200103', 'gestor.operacoes@sigaf.com', 3],
  ['Carlos Mendes', '200104', 'gestor.ti@sigaf.com', 4],
  ['Juliana Prado', '200105', 'gestor.rh@sigaf.com', 5],
  ['Eduardo Nunes', '200106', 'gestor.recepcao@sigaf.com', 6],
];

function gerarCpf() {
  const n = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
  const dv = (base) => {
    const soma = base.reduce((s, d, i) => s + d * (base.length + 1 - i), 0);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  n.push(dv(n));
  n.push(dv(n));
  return n.join('');
}

const hash = await Usuario.gerarHashSenha('Sigaf@2026');
for (const [nome, matricula, email, setorId] of GESTORES) {
  const [existe] = await query('SELECT id FROM usuarios WHERE email = ? OR matricula = ?', [email, matricula]);
  if (existe) { console.log(`já existe: ${email}`); continue; }
  await query(
    "INSERT INTO usuarios (nome, matricula, cpf, email, senha_hash, perfil, setor_id, cargo) VALUES (?,?,?,?,?,'GESTOR',?,'Gestor de setor')",
    [nome, matricula, Usuario.cpfCriptografado(gerarCpf()), email, hash, setorId],
  );
  console.log(`criado: ${email}`);
}

await query('UPDATE registros_atividade SET setor_id = 1 WHERE id IN (166, 167)');
console.log(await query(
  "SELECT u.nome, u.email, s.nome AS setor FROM usuarios u LEFT JOIN setores s ON s.id = u.setor_id WHERE u.perfil = 'GESTOR' ORDER BY u.setor_id",
));
await pool.end();
