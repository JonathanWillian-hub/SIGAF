import { query, transacao } from '../config/db.js';
import { registrarLog } from '../modules/auditoria/auditoria.service.js';
import { CategoriaAtividade, CategoriasComSubstituido, StatusHomologacao } from './enums.js';

const REGEX_DATA = /^\d{4}-\d{2}-\d{2}$/;
const REGEX_HORA = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

function normalizarHora(h) {
  if (!h) return h;
  const t = String(h).trim();
  return t.length === 5 ? `${t}:00` : t;
}

function dataValida(d) {
  if (!REGEX_DATA.test(d || '')) return false;
  const dt = new Date(`${d}T00:00:00`);
  return !Number.isNaN(dt.getTime()) && dt.toISOString().slice(0, 10) === d;
}

/**
 * Classe RegistroAtividade (Diagrama de Classes)
 *  - id, categoria: CategoriaAtividade, data, horarioInicio, horarioFim,
 *    descricaoTarefas, dataCriacao
 *  - executor 1, substituido 0..1 (Usuario) | disciplina 0..1 | setor 1
 *  + validarHorarios(): boolean
 *  + salvar(): boolean
 *  + cancelar(): void
 */
export class RegistroAtividade {
  constructor(dados = {}) {
    this.id = dados.id ?? null;
    this.categoria = dados.categoria;
    this.data = dados.data;
    this.horarioInicio = normalizarHora(dados.horarioInicio ?? dados.horario_inicio);
    this.horarioFim = normalizarHora(dados.horarioFim ?? dados.horario_fim);
    this.descricaoTarefas = (dados.descricaoTarefas ?? dados.descricao_tarefas ?? '').toString().trim();
    this.dataCriacao = dados.dataCriacao ?? dados.data_criacao ?? null;
    this.executorId = Number(dados.executorId ?? dados.executor_id) || null;
    this.substituidoId = Number(dados.substituidoId ?? dados.substituido_id) || null;
    this.disciplinaId = Number(dados.disciplinaId ?? dados.disciplina_id) || null;
    this.setorId = Number(dados.setorId ?? dados.setor_id) || null;
    this.status = dados.status ?? StatusHomologacao.PENDENTE;
    this.justificativa = dados.justificativa ?? null;
    this.criadoPorId = dados.criado_por_id ?? dados.criadoPorId ?? null;
  }

  /** + validarHorarios(): boolean — RF02 A2: fim não pode ser anterior/igual ao início. */
  validarHorarios() {
    if (!REGEX_HORA.test(this.horarioInicio || '') || !REGEX_HORA.test(this.horarioFim || '')) return false;
    return this.horarioFim > this.horarioInicio;
  }

  /**
   * Validação completa (RF02 passo 3 / A1 / A2 e RN01).
   * Retorna um objeto { campo: mensagem } — vazio quando está tudo certo.
   */
  validar() {
    const erros = {};
    const obrigatorio = 'Campo obrigatório.';

    if (!Object.values(CategoriaAtividade).includes(this.categoria)) erros.categoria = 'Selecione uma categoria válida.';
    if (!this.executorId) erros.executorId = obrigatorio;
    if (!this.data) erros.data = obrigatorio;
    else if (!dataValida(this.data)) erros.data = 'Data inválida (use AAAA-MM-DD).';
    if (!this.horarioInicio) erros.horarioInicio = obrigatorio;
    else if (!REGEX_HORA.test(this.horarioInicio)) erros.horarioInicio = 'Horário inválido (use HH:MM).';
    if (!this.horarioFim) erros.horarioFim = obrigatorio;
    else if (!REGEX_HORA.test(this.horarioFim)) erros.horarioFim = 'Horário inválido (use HH:MM).';
    if (!this.setorId) erros.setorId = obrigatorio;
    if (!this.descricaoTarefas) erros.descricaoTarefas = obrigatorio;
    else if (this.descricaoTarefas.length < 5) erros.descricaoTarefas = 'Descreva as tarefas (mínimo 5 caracteres).';
    else if (this.descricaoTarefas.length > 2000) erros.descricaoTarefas = 'Máximo de 2000 caracteres.';

    if (CategoriasComSubstituido.includes(this.categoria)) {
      if (!this.substituidoId) erros.substituidoId = 'Informe o profissional substituído.';
      else if (this.substituidoId === this.executorId) erros.substituidoId = 'O executor não pode substituir a si mesmo.';
    }

    if (!erros.horarioInicio && !erros.horarioFim && !this.validarHorarios()) {
      erros.horarioFim = 'O horário de fim não pode ser anterior ao horário de início.';
    }
    return erros;
  }

  /** + salvar(): boolean — persiste (insert/update) e gera log de auditoria (RNF06). */
  async salvar(usuarioId, ip = null) {
    return transacao(async (conexao) => {
      const valores = [
        this.categoria, this.data, this.horarioInicio, this.horarioFim, this.descricaoTarefas,
        this.executorId,
        CategoriasComSubstituido.includes(this.categoria) ? this.substituidoId : null,
        this.disciplinaId, this.setorId,
      ];
      if (this.id) {
        await conexao.query(
          `UPDATE registros_atividade SET categoria=?, data=?, horario_inicio=?, horario_fim=?,
              descricao_tarefas=?, executor_id=?, substituido_id=?, disciplina_id=?, setor_id=?,
              status='PENDENTE', justificativa=NULL, homologado_por_id=NULL, homologado_em=NULL
            WHERE id=?`,
          [...valores, this.id],
        );
        this.status = StatusHomologacao.PENDENTE;
        await registrarLog({ usuarioId, acao: 'ALTERACAO', entidade: 'RegistroAtividade', entidadeId: this.id, detalhes: this.resumo(), ip }, conexao);
      } else {
        const [r] = await conexao.query(
          `INSERT INTO registros_atividade (categoria, data, horario_inicio, horario_fim, descricao_tarefas,
              executor_id, substituido_id, disciplina_id, setor_id, criado_por_id)
           VALUES (?,?,?,?,?,?,?,?,?,?) RETURNING id`,
          [...valores, usuarioId],
        );
        this.id = r.id;
        this.criadoPorId = usuarioId;
        await registrarLog({ usuarioId, acao: 'CRIACAO', entidade: 'RegistroAtividade', entidadeId: this.id, detalhes: this.resumo(), ip }, conexao);
      }
      return true;
    });
  }

  /** + cancelar(): void — RF01 A1: descarta os dados preenchidos (nada é gravado). */
  cancelar() {
    this.categoria = undefined;
    this.data = undefined;
    this.horarioInicio = undefined;
    this.horarioFim = undefined;
    this.descricaoTarefas = '';
    this.executorId = null;
    this.substituidoId = null;
    this.disciplinaId = null;
    this.setorId = null;
  }

  async excluir(usuarioId, ip = null) {
    await transacao(async (conexao) => {
      await conexao.query('DELETE FROM registros_atividade WHERE id = ?', [this.id]);
      await registrarLog({ usuarioId, acao: 'ELIMINACAO', entidade: 'RegistroAtividade', entidadeId: this.id, detalhes: this.resumo(), ip }, conexao);
    });
  }

  resumo() {
    return {
      categoria: this.categoria, data: this.data, horarioInicio: this.horarioInicio, horarioFim: this.horarioFim,
      executorId: this.executorId, substituidoId: this.substituidoId, setorId: this.setorId, disciplinaId: this.disciplinaId,
    };
  }

  static async buscarPorId(id) {
    const [linha] = await query('SELECT * FROM registros_atividade WHERE id = ?', [id]);
    return linha ? new RegistroAtividade(linha) : null;
  }
}
