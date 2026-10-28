import { query } from '../config/db.js';

/**
 * Classe Setor (Diagrama de Classes)
 *  - id, nome, codigo
 *  + listarProfissionais(): list
 */
export class Setor {
  constructor(dados = {}) {
    this.id = dados.id ?? null;
    this.nome = dados.nome;
    this.codigo = dados.codigo;
    this.ativo = dados.ativo === undefined ? true : Boolean(dados.ativo);
  }

  static async listar({ incluirInativos = false } = {}) {
    const linhas = await query(
      `SELECT * FROM setores ${incluirInativos ? '' : 'WHERE ativo'} ORDER BY nome`,
    );
    return linhas.map((l) => new Setor(l));
  }

  static async buscarPorId(id) {
    const [linha] = await query('SELECT * FROM setores WHERE id = ?', [id]);
    return linha ? new Setor(linha) : null;
  }

  /** + listarProfissionais(): list — profissionais lotados neste setor. */
  async listarProfissionais() {
    return query(
      `SELECT id, nome, matricula, perfil FROM usuarios
        WHERE setor_id = ? AND ativo ORDER BY nome`,
      [this.id],
    );
  }
}
