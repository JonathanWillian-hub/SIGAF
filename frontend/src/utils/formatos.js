export const CATEGORIAS = {
  ATIVIDADE_EXTRAORDINARIA: { rotulo: 'Extraordinária', completo: 'Atividade Extraordinária', cor: 'laranja' },
  SUBSTITUICAO: { rotulo: 'Substituição Temporária', completo: 'Substituição', cor: 'roxo' },
  COBERTURA_HORARIO: { rotulo: 'Cobertura de Horário', completo: 'Cobertura de Horário', cor: 'verde' },
  APOIO_OPERACIONAL: { rotulo: 'Apoio Operacional', completo: 'Apoio Operacional', cor: 'teal' },
};

export const STATUS = {
  PENDENTE: { rotulo: 'Pendente', cor: 'laranja' },
  HOMOLOGADO: { rotulo: 'Homologado', cor: 'verde' },
  REJEITADO: { rotulo: 'Rejeitado', cor: 'vermelho' },
};

export const PERFIS = { COLABORADOR: 'Colaborador', GESTOR: 'Gestor', ADMINISTRADOR: 'Administrador' };

export const dataBR = (d) => (d ? d.slice(0, 10).split('-').reverse().join('/') : 'Não informado');
export const dataHoraBR = (d) => (d ? `${dataBR(d)} ${d.slice(11, 16)}` : 'Não informado');
export const hora = (h) => (h ? h.slice(0, 5) : '');
export const horaCurta = (h) => (h ? (h.slice(3, 5) === '00' ? `${h.slice(0, 2)}h` : h.slice(0, 5)) : '');

export function duracao(min) {
  const m = Number(min) || 0;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h${String(r).padStart(2, '0')}` : `${h}h`;
}

export const numero = (n) => new Intl.NumberFormat('pt-BR').format(Number(n) || 0);
export const horasTotais = (min) => `${numero(Math.round((Number(min) || 0) / 60))}h`;

export function iniciais(nome) {
  return String(nome || '?').split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
}

export function hojeISO(deslocDias = 0) {
  const d = new Date();
  d.setDate(d.getDate() + deslocDias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const CATEGORIAS_CHAMADO = {
  DUVIDA: { rotulo: 'Dúvida', cor: 'azul' },
  PROBLEMA: { rotulo: 'Problema técnico', cor: 'vermelho' },
  ACESSO: { rotulo: 'Acesso e senha', cor: 'roxo' },
  SUGESTAO: { rotulo: 'Sugestão', cor: 'teal' },
};

export const PRIORIDADES_CHAMADO = {
  BAIXA: { rotulo: 'Baixa', cor: 'cinza' },
  MEDIA: { rotulo: 'Média', cor: 'laranja' },
  ALTA: { rotulo: 'Alta', cor: 'vermelho' },
};

export const STATUS_CHAMADO = {
  ABERTO: { rotulo: 'Aberto', cor: 'laranja' },
  EM_ATENDIMENTO: { rotulo: 'Em atendimento', cor: 'azul' },
  RESOLVIDO: { rotulo: 'Resolvido', cor: 'verde' },
};
