import { defineStore } from 'pinia';
import { api, token } from '../services/api.js';

const CHAVE_USUARIO = 'sigaf.usuario';

export const useAuth = defineStore('auth', {
  state: () => ({
    usuario: JSON.parse(localStorage.getItem(CHAVE_USUARIO) || 'null'),
  }),
  getters: {
    logado: (s) => Boolean(s.usuario && token.obter()),
    perfil: (s) => s.usuario?.perfil,
    ehGestao: (s) => s.usuario?.perfil === 'GESTOR',
    ehAdmin: (s) => s.usuario?.perfil === 'ADMINISTRADOR',
    iniciais: (s) => (s.usuario?.nome || '?').split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase(),
  },
  actions: {
    async login(email, senha) {
      const { token: t, usuario } = await api.post('/auth/login', { email, senha });
      token.salvar(t);
      this.definirUsuario(usuario);
    },
    async atualizar() {
      const { usuario } = await api.get('/auth/me');
      this.definirUsuario(usuario);
    },
    definirUsuario(usuario) {
      this.usuario = usuario;
      try { localStorage.setItem(CHAVE_USUARIO, JSON.stringify(usuario)); } catch { localStorage.setItem(CHAVE_USUARIO, JSON.stringify({ ...usuario, foto: null })); }
    },
    sair() {
      token.limpar();
      localStorage.removeItem(CHAVE_USUARIO);
      this.usuario = null;
    },
  },
});
