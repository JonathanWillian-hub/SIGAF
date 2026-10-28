import { query } from '../config/db.js';

export class Disciplina {
  constructor(dados = {}) {
    this.id = dados.id ?? null;
    this.nome = dados.nome;
    this.descricao = dados.descricao ?? null;
    this.ativo = dados.ativo === undefined ? true : Boolean(dados.ativo);
  }

  static async listar({ incluirInativos = false } = {}) {
    const linhas = await query(
      `SELECT * FROM disciplinas ${incluirInativos ? '' : 'WHERE ativo'} ORDER BY nome`,
    );
    return linhas.map((l) => new Disciplina(l));
  }

  static async buscarPorId(id) {
    const [linha] = await query('SELECT * FROM disciplinas WHERE id = ?', [id]);
    return linha ? new Disciplina(linha) : null;
  }
}
