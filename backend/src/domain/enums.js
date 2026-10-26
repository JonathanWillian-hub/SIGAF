// <<enumeration>> PerfilUsuario
export const PerfilUsuario = Object.freeze({
  COLABORADOR: 'COLABORADOR',
  GESTOR: 'GESTOR',
  ADMINISTRADOR: 'ADMINISTRADOR',
});

// <<enumeration>> CategoriaAtividade
export const CategoriaAtividade = Object.freeze({
  ATIVIDADE_EXTRAORDINARIA: 'ATIVIDADE_EXTRAORDINARIA',
  SUBSTITUICAO: 'SUBSTITUICAO',
  COBERTURA_HORARIO: 'COBERTURA_HORARIO',
  APOIO_OPERACIONAL: 'APOIO_OPERACIONAL',
});

export const RotuloCategoria = Object.freeze({
  ATIVIDADE_EXTRAORDINARIA: 'Atividade Extraordinária',
  SUBSTITUICAO: 'Substituição',
  COBERTURA_HORARIO: 'Cobertura de Horário',
  APOIO_OPERACIONAL: 'Apoio Operacional',
});

// Categorias em que "Profissional Substituído" se aplica (RF02: "se aplicável")
export const CategoriasComSubstituido = Object.freeze([
  CategoriaAtividade.SUBSTITUICAO,
  CategoriaAtividade.COBERTURA_HORARIO,
]);

// Status de homologação (Diagrama de Sequência - Pendentes de Homologação)
export const StatusHomologacao = Object.freeze({
  PENDENTE: 'PENDENTE',
  HOMOLOGADO: 'HOMOLOGADO',
  REJEITADO: 'REJEITADO',
});

export const FormatoRelatorio = Object.freeze({ PDF: 'PDF', EXCEL: 'EXCEL', CSV: 'CSV' });

export const StatusRelatorio = Object.freeze({
  PROCESSANDO: 'PROCESSANDO',
  CONCLUIDO: 'CONCLUIDO',
  ERRO: 'ERRO',
});
