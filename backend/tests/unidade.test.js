import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { RegistroAtividade } from '../src/domain/RegistroAtividade.js';
import { Usuario } from '../src/domain/Usuario.js';
import { criptografar, descriptografar, mascararCpf } from '../src/utils/criptografia.js';

const valido = () => new RegistroAtividade({
  categoria: 'SUBSTITUICAO',
  executorId: 4,
  substituidoId: 5,
  data: '2026-10-24',
  horarioInicio: '14:00',
  horarioFim: '18:00',
  setorId: 1,
  descricaoTarefas: 'Conferência de cargas críticas na doca 3',
});

describe('RegistroAtividade (RF01/RF02/RN01)', () => {
  test('registro completo é válido', () => {
    assert.deepEqual(valido().validar(), {});
  });

  test('RF02 A1 / RN01: campos obrigatórios vazios são apontados', () => {
    const erros = new RegistroAtividade({}).validar();
    for (const campo of ['categoria', 'executorId', 'data', 'horarioInicio', 'horarioFim', 'setorId', 'descricaoTarefas']) {
      assert.ok(erros[campo], `esperava erro em ${campo}`);
    }
  });

  test('RF02 A2: horário de fim anterior ao início é rejeitado', () => {
    const r = valido();
    r.horarioFim = '08:00:00';
    assert.equal(r.validarHorarios(), false);
    assert.match(r.validar().horarioFim, /não pode ser anterior/);
  });

  test('horário de fim igual ao início também é inconsistente', () => {
    const r = valido();
    r.horarioFim = r.horarioInicio;
    assert.equal(r.validarHorarios(), false);
  });

  test('substituição exige profissional substituído diferente do executor', () => {
    const r = valido();
    r.substituidoId = null;
    assert.ok(r.validar().substituidoId);
    r.substituidoId = r.executorId;
    assert.match(r.validar().substituidoId, /si mesmo/);
  });

  test('atividade extraordinária não exige substituído', () => {
    const r = valido();
    r.categoria = 'ATIVIDADE_EXTRAORDINARIA';
    r.substituidoId = null;
    assert.deepEqual(r.validar(), {});
  });

  test('data inexistente (31/02) é recusada', () => {
    const r = valido();
    r.data = '2026-02-31';
    assert.match(r.validar().data, /inválida/);
  });

  test('RF01 A1: cancelar() descarta os dados preenchidos', () => {
    const r = valido();
    r.cancelar();
    assert.equal(r.categoria, undefined);
    assert.equal(r.descricaoTarefas, '');
    assert.equal(r.executorId, null);
  });
});

describe('Usuario.visualizarDashboard (RF05 A1, visão por perfil)', () => {
  test('colaborador vê só os próprios registros', () => {
    assert.deepEqual(new Usuario({ id: 7, perfil: 'COLABORADOR' }).visualizarDashboard(), { escopo: 'PROPRIO', usuarioId: 7 });
  });
  test('gestor vê a equipe do seu setor', () => {
    assert.deepEqual(new Usuario({ id: 2, perfil: 'GESTOR', setor_id: 1 }).visualizarDashboard(), { escopo: 'EQUIPE', setorId: 1 });
  });
  test('administrador vê tudo', () => {
    assert.deepEqual(new Usuario({ id: 1, perfil: 'ADMINISTRADOR' }).visualizarDashboard(), { escopo: 'TODOS' });
  });
});

describe('Criptografia AES-256 (RNF01)', () => {
  test('criptografa e descriptografa o CPF', () => {
    const cifrado = criptografar('12345678909');
    assert.notEqual(cifrado, '12345678909');
    assert.equal(descriptografar(cifrado), '12345678909');
  });
  test('o mesmo valor gera cifras diferentes (IV aleatório)', () => {
    assert.notEqual(criptografar('12345678909'), criptografar('12345678909'));
  });
  test('CPF exibido sempre mascarado', () => {
    assert.equal(mascararCpf('12345678909'), '***.456.789-**');
  });
});
