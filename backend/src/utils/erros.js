// Erro de negócio com status HTTP e, opcionalmente, os campos inválidos.
export class ErroApp extends Error {
  constructor(mensagem, status = 400, campos = undefined) {
    super(mensagem);
    this.status = status;
    this.campos = campos;
  }
}

export const naoEncontrado = (o = 'Registro') => new ErroApp(`${o} não encontrado.`, 404);
export const proibido = (m = 'Você não tem permissão para esta ação.') => new ErroApp(m, 403);
