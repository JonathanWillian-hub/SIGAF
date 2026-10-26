import bcrypt from 'bcryptjs';
import { query } from '../config/db.js';
import { criptografar, descriptografar, mascararCpf } from '../utils/criptografia.js';
import { PerfilUsuario } from './enums.js';

/**
 * Classe Usuario (Diagrama de Classes)
 *  - id, nome, matricula, cpf, email, perfil: PerfilUsuario
 *  + autenticar(): boolean
 *  + visualizarDashboard(): void
 */
export class Usuario {
  constructor(dados = {}) {
    this.id = dados.id ?? null;
    this.nome = dados.nome;
    this.matricula = dados.matricula;
    this.cpf = dados.cpf; // em memória fica em texto puro; no banco, AES-256
    this.email = dados.email;
    this.perfil = dados.perfil ?? PerfilUsuario.COLABORADOR;
    this.setorId = dados.setor_id ?? dados.setorId ?? null;
    this.setorNome = dados.setor_nome ?? null;
    this.ativo = dados.ativo === undefined ? true : Boolean(dados.ativo);
    this.senhaHash = dados.senha_hash ?? null;
  }

  static deLinha(linha) {
    if (!linha) return null;
    return new Usuario({ ...linha, cpf: linha.cpf ? descriptografar(linha.cpf) : null });
  }

  static async buscarPorEmail(email) {
    const [linha] = await query(
      `SELECT u.*, s.nome AS setor_nome FROM usuarios u
         LEFT JOIN setores s ON s.id = u.setor_id WHERE u.email = ?`,
      [String(email).trim().toLowerCase()],
    );
    return Usuario.deLinha(linha);
  }

  static async buscarPorId(id) {
    const [linha] = await query(
      `SELECT u.*, s.nome AS setor_nome FROM usuarios u
         LEFT JOIN setores s ON s.id = u.setor_id WHERE u.id = ?`,
      [id],
    );
    return Usuario.deLinha(linha);
  }

  /** + autenticar(): boolean — confere a senha informada com o hash gravado. */
  async autenticar(senha) {
    if (!this.ativo || !this.senhaHash || !senha) return false;
    return bcrypt.compare(String(senha), this.senhaHash);
  }

  /**
   * + visualizarDashboard() — RF05 A1 (Visão Baseada em Perfis):
   * define qual recorte de registros o usuário enxerga no Painel Central.
   */
  visualizarDashboard() {
    if (this.perfil === PerfilUsuario.ADMINISTRADOR) return { escopo: 'TODOS' };
    if (this.perfil === PerfilUsuario.GESTOR) return { escopo: 'EQUIPE', setorId: this.setorId };
    return { escopo: 'PROPRIO', usuarioId: this.id };
  }

  ehGestao() {
    return this.perfil === PerfilUsuario.GESTOR || this.perfil === PerfilUsuario.ADMINISTRADOR;
  }

  static async gerarHashSenha(senha) {
    return bcrypt.hash(String(senha), 10);
  }

  static cpfCriptografado(cpf) {
    return criptografar(String(cpf).replace(/\D/g, ''));
  }

  /** Representação pública (nunca expõe hash; CPF sai mascarado). */
  toJSON() {
    return {
      id: this.id,
      nome: this.nome,
      matricula: this.matricula,
      cpf: mascararCpf(this.cpf),
      email: this.email,
      perfil: this.perfil,
      setorId: this.setorId,
      setorNome: this.setorNome,
      ativo: this.ativo,
    };
  }
}
