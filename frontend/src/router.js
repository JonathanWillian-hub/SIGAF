import { createRouter, createWebHistory } from 'vue-router';
import { useAuth } from './stores/auth.js';

const GESTAO = ['GESTOR', 'ADMINISTRADOR'];

const routes = [
  { path: '/login', name: 'login', component: () => import('./views/LoginView.vue'), meta: { publica: true, titulo: 'Entrar' } },
  { path: '/', name: 'dashboard', component: () => import('./views/DashboardView.vue'), meta: { titulo: 'Dashboard' } },
  { path: '/atividades', name: 'atividades', component: () => import('./views/AtividadesView.vue'), meta: { titulo: 'Atividades' } },
  { path: '/atividades/nova', name: 'novo-registro', component: () => import('./views/NovoRegistroView.vue'), meta: { titulo: 'Novo Registro' } },
  { path: '/atividades/:id/editar', name: 'editar-registro', component: () => import('./views/NovoRegistroView.vue'), meta: { titulo: 'Editar Registro' } },
  { path: '/substituicoes', name: 'substituicoes', component: () => import('./views/SubstituicoesView.vue'), meta: { titulo: 'Substituições' } },
  { path: '/homologacao', name: 'homologacao', component: () => import('./views/HomologacaoView.vue'), meta: { titulo: 'Homologação', perfis: GESTAO } },
  { path: '/relatorios', name: 'relatorios', component: () => import('./views/RelatoriosView.vue'), meta: { titulo: 'Relatórios', perfis: GESTAO } },
  { path: '/auditoria', name: 'auditoria', component: () => import('./views/AuditoriaView.vue'), meta: { titulo: 'Auditoria', perfis: GESTAO } },
  { path: '/cadastros', name: 'cadastros', component: () => import('./views/CadastrosView.vue'), meta: { titulo: 'Cadastros', perfis: GESTAO } },
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
  if (to.name === 'login' && auth.logado) return { name: 'dashboard' };
  if (to.meta.perfis && !to.meta.perfis.includes(auth.perfil)) return { name: 'dashboard' };
  return true;
});

router.afterEach((to) => {
  document.title = to.meta.titulo ? `${to.meta.titulo} | SIGAF` : 'SIGAF';
});
