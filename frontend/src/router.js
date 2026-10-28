import { createRouter, createWebHistory } from 'vue-router';
import { useAuth } from './stores/auth.js';

const GESTAO = ['GESTOR', 'ADMINISTRADOR'];
const EMPRESA = ['COLABORADOR', 'GESTOR'];
const GESTOR = ['GESTOR'];
const ADMIN = ['ADMINISTRADOR'];

export const inicioDo = (perfil) => (perfil === 'ADMINISTRADOR' ? '/sistema' : '/');

const routes = [
  { path: '/login', name: 'login', component: () => import('./views/LoginView.vue'), meta: { publica: true, titulo: 'Entrar' } },
  { path: '/', name: 'dashboard', component: () => import('./views/DashboardView.vue'), meta: { titulo: 'Dashboard', perfis: EMPRESA } },
  { path: '/atividades', name: 'atividades', component: () => import('./views/AtividadesView.vue'), meta: { titulo: 'Atividades', perfis: EMPRESA } },
  { path: '/atividades/nova', name: 'novo-registro', component: () => import('./views/NovoRegistroView.vue'), meta: { titulo: 'Novo Registro', perfis: EMPRESA } },
  { path: '/atividades/:id/editar', name: 'editar-registro', component: () => import('./views/NovoRegistroView.vue'), meta: { titulo: 'Editar Registro', perfis: EMPRESA } },
  { path: '/substituicoes', name: 'substituicoes', component: () => import('./views/SubstituicoesView.vue'), meta: { titulo: 'Substituições', perfis: EMPRESA } },
  { path: '/homologacao', name: 'homologacao', component: () => import('./views/HomologacaoView.vue'), meta: { titulo: 'Homologação', perfis: GESTOR } },
  { path: '/relatorios', name: 'relatorios', component: () => import('./views/RelatoriosView.vue'), meta: { titulo: 'Relatórios', perfis: GESTAO } },
  { path: '/auditoria', name: 'auditoria', component: () => import('./views/AuditoriaView.vue'), meta: { titulo: 'Auditoria', perfis: GESTOR } },
  { path: '/cadastros', name: 'cadastros', component: () => import('./views/CadastrosView.vue'), meta: { titulo: 'Cadastros', perfis: GESTAO } },
  { path: '/sistema', name: 'sistema', component: () => import('./views/SistemaView.vue'), meta: { titulo: 'Painel do sistema', perfis: ADMIN } },
  { path: '/chamados', name: 'chamados', component: () => import('./views/ChamadosView.vue'), meta: { titulo: 'Suporte' } },
  { path: '/chamados/:id', name: 'chamado', component: () => import('./views/ChamadoView.vue'), meta: { titulo: 'Chamado' } },
  { path: '/perfil', name: 'perfil', component: () => import('./views/PerfilView.vue'), meta: { titulo: 'Meu perfil' } },
  { path: '/:pathMatch(.*)*', redirect: '/' },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
});

router.beforeEach((to) => {
  const auth = useAuth();
  if (!to.meta.publica && !auth.logado) return { name: 'login', query: to.fullPath !== '/' ? { voltar: to.fullPath } : {} };
  if (to.name === 'login' && auth.logado) return inicioDo(auth.perfil);
  if (to.meta.perfis && !to.meta.perfis.includes(auth.perfil)) return inicioDo(auth.perfil);
  return true;
});

router.afterEach((to) => {
  document.title = to.meta.titulo ? `${to.meta.titulo} | SIGAF` : 'SIGAF';
});
