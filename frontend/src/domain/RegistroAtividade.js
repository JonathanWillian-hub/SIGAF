// Espelho da classe RegistroAtividade (Diagrama de Classes) no front-end:
// valida antes de enviar (RF02 A1/A2) e implementa cancelar() (RF01 A1).
export const CATEGORIAS_COM_SUBSTITUIDO = ['SUBSTITUICAO', 'COBERTURA_HORARIO'];

export class RegistroAtividade {
  constructor(dados = {}) {
    this.id = dados.id ?? null;
    this.categoria = dados.categoria ?? null;
    this.executorId = dados.executorId ?? '';
    this.substituidoId = dados.substituidoId ?? '';
    this.data = dados.data ?? '';
    this.horarioInicio = (dados.horarioInicio ?? '').slice(0, 5);
    this.horarioFim = (dados.horarioFim ?? '').slice(0, 5);
    this.setorId = dados.setorId ?? '';
    this.disciplinaId = dados.disciplinaId ?? '';
    this.descricaoTarefas = dados.descricaoTarefas ?? '';
  }

  exigeSubstituido() {
    return CATEGORIAS_COM_SUBSTITUIDO.includes(this.categoria);
  }

  /** + validarHorarios(): boolean */
  validarHorarios() {
    if (!this.horarioInicio || !this.horarioFim) return true;
    return this.horarioFim > this.horarioInicio;
  }

  /** Campos obrigatórios (RN01) + consistência de horário. Retorna { campo: mensagem }. */
  validar() {
    const erros = {};
    const obrig = 'Campo obrigatório.';
    if (!this.executorId) erros.executorId = obrig;
    if (this.exigeSubstituido()) {
      if (!this.substituidoId) erros.substituidoId = 'Informe o profissional substituído.';
      else if (String(this.substituidoId) === String(this.executorId)) erros.substituidoId = 'O executor não pode substituir a si mesmo.';
    }
    if (!this.data) erros.data = obrig;
    if (!this.horarioInicio) erros.horarioInicio = obrig;
    if (!this.horarioFim) erros.horarioFim = obrig;
    if (!this.setorId) erros.setorId = obrig;
    if (!this.descricaoTarefas.trim()) erros.descricaoTarefas = obrig;
    else if (this.descricaoTarefas.trim().length < 5) erros.descricaoTarefas = 'Descreva as tarefas (mínimo 5 caracteres).';
    if (!erros.horarioInicio && !erros.horarioFim && !this.validarHorarios()) {
      erros.horarioFim = 'O horário de fim não pode ser anterior ao horário de início.';
    }
    return erros;
  }

  /** + cancelar(): void — descarta os dados preenchidos. */
  cancelar() {
    Object.assign(this, new RegistroAtividade());
  }

  paraEnvio() {
    return {
      categoria: this.categoria,
      executorId: Number(this.executorId) || null,
      substituidoId: this.exigeSubstituido() ? Number(this.substituidoId) || null : null,
      data: this.data,
      horarioInicio: this.horarioInicio,
      horarioFim: this.horarioFim,
      setorId: Number(this.setorId) || null,
      disciplinaId: Number(this.disciplinaId) || null,
      descricaoTarefas: this.descricaoTarefas.trim(),
    };
  }
}
