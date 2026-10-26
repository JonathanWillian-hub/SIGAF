<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  LayoutDashboard, CalendarClock, RefreshCcw, ClipboardCheck, BarChart3, History, Users,
  Search, Bell, Home, LogOut, HelpCircle,
} from 'lucide-vue-next';
import { useAuth } from '../stores/auth.js';
import { api } from '../services/api.js';
import { PERFIS, dataHoraBR } from '../utils/formatos.js';

const auth = useAuth();
const rota = useRoute();
const router = useRouter();

const menu = computed(() => [
  { to: '/', rotulo: 'Dashboard', icone: LayoutDashboard },
  { to: '/atividades', rotulo: 'Atividades', icone: CalendarClock },
  { to: '/substituicoes', rotulo: 'Substituições', icone: RefreshCcw },
  ...(auth.ehGestao ? [
    { to: '/homologacao', rotulo: 'Homologação', icone: ClipboardCheck },
    { to: '/relatorios', rotulo: 'Relatórios', icone: BarChart3 },
    { to: '/auditoria', rotulo: 'Auditoria', icone: History },
  ] : []),
  ...(auth.ehAdmin ? [{ to: '/cadastros', rotulo: 'Cadastros', icone: Users }] : []),
]);

const ativo = (to) => (to === '/' ? rota.path === '/' : rota.path.startsWith(to));

const busca = ref('');
function buscar() {
  router.push({ path: '/atividades', query: busca.value.trim() ? { busca: busca.value.trim() } : {} });
  busca.value = '';
}

// Notificações (Serviço de Notificação)
const notificacoes = ref({ itens: [], naoLidas: 0 });
const abrirNotif = ref(false);
const abrirUsuario = ref(false);
let timer;
async function carregarNotificacoes() {
  try { notificacoes.value = await api.get('/notificacoes'); } catch { /* silencioso */ }
}
async function marcarTodas() {
  await api.patch('/notificacoes/lidas');
  await carregarNotificacoes();
}
async function abrirNotificacao(n) {
  abrirNotif.value = false;
  if (!n.lida) await api.patch(`/notificacoes/${n.id}/lida`);
  carregarNotificacoes();
  if (n.link) router.push(n.link);
}
function fecharMenus(e) {
  if (!e.target.closest('.pop-notif')) abrirNotif.value = false;
  if (!e.target.closest('.pop-usuario')) abrirUsuario.value = false;
}
function sair() {
  auth.sair();
  router.push('/login');
}

onMounted(() => {
  carregarNotificacoes();
  timer = setInterval(carregarNotificacoes, 20000);
  document.addEventListener('click', fecharMenus);
});
onBeforeUnmount(() => {
  clearInterval(timer);
  document.removeEventListener('click', fecharMenus);
});

defineExpose({ carregarNotificacoes });
</script>

<template>
  <div class="layout">
    <aside class="sidebar">
      <RouterLink to="/" class="logo" title="SIGAF">
        <svg viewBox="0 0 64 64" width="22" height="22"><path d="M18 18l14 30 14-30" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" /></svg>
      </RouterLink>
      <nav class="nav">
        <RouterLink v-for="item in menu" :key="item.to" :to="item.to" class="nav-item" :class="{ ativo: ativo(item.to) }" :aria-label="item.rotulo">
          <component :is="item.icone" :size="20" :stroke-width="1.8" />
          <span class="dica">{{ item.rotulo }}</span>
          <span class="rotulo-mobile">{{ item.rotulo }}</span>
        </RouterLink>
      </nav>
      <div class="base">
        <a class="nav-item" href="https://github.com/JonathanWillian-hub/SIGAF" target="_blank" rel="noopener" aria-label="Ajuda">
          <HelpCircle :size="20" :stroke-width="1.8" /><span class="dica">Documentação</span>
        </a>
        <div class="avatar-mini" :title="auth.usuario?.nome">{{ auth.iniciais }}</div>
      </div>
    </aside>

    <div class="principal">
      <header class="topo">
        <div class="trilha">
          <RouterLink to="/" aria-label="Início"><Home :size="16" /></RouterLink>
          <span class="sep">/</span>
          <span class="atual">{{ rota.meta.titulo }}</span>
          <span v-if="auth.perfil" class="badge roxo tag-perfil">{{ PERFIS[auth.perfil] }}</span>
        </div>

        <form class="busca" role="search" @submit.prevent="buscar">
          <Search :size="16" />
          <input v-model="busca" placeholder="Buscar por colaborador, matrícula" aria-label="Buscar registros" />
          <kbd>/</kbd>
        </form>

        <div class="acoes">
          <div class="pop-notif">
            <button class="btn btn-ghost btn-icon sino" aria-label="Notificações" @click="abrirNotif = !abrirNotif">
              <Bell :size="19" />
              <span v-if="notificacoes.naoLidas" class="ponto">{{ notificacoes.naoLidas }}</span>
            </button>
            <div v-if="abrirNotif" class="pop">
              <div class="pop-head">
                <strong>Notificações</strong>
                <button v-if="notificacoes.naoLidas" class="btn btn-ghost btn-sm" @click="marcarTodas">Marcar todas como lidas</button>
              </div>
              <div v-if="!notificacoes.itens.length" class="vazio muted">Nenhuma notificação.</div>
              <button v-for="n in notificacoes.itens" :key="n.id" class="notif" :class="{ nova: !n.lida }" @click="abrirNotificacao(n)">
                <span class="titulo">{{ n.titulo }}</span>
                <span class="msg">{{ n.mensagem }}</span>
                <span class="quando">{{ dataHoraBR(n.criadaEm) }}</span>
              </button>
            </div>
          </div>

          <div class="pop-usuario">
            <button class="usuario" @click="abrirUsuario = !abrirUsuario">
              <span class="av">{{ auth.iniciais }}</span>
              <span class="info">
                <strong>{{ auth.usuario?.nome }}</strong>
                <small>{{ auth.usuario?.setorNome || 'Sem setor' }}</small>
              </span>
            </button>
            <div v-if="abrirUsuario" class="pop pop-menor">
              <div class="pop-head col">
                <strong>{{ auth.usuario?.nome }}</strong>
                <span class="muted small">{{ auth.usuario?.email }}</span>
                <span class="muted small mono">Mat. {{ auth.usuario?.matricula }}, {{ PERFIS[auth.perfil] }}</span>
              </div>
              <button class="item-menu" @click="sair"><LogOut :size="16" /> Sair do sistema</button>
            </div>
          </div>
        </div>
      </header>

      <main class="conteudo">
        <slot />
      </main>
    </div>
  </div>
</template>

<style scoped>
.layout { display: flex; min-height: 100vh; }
.sidebar {
  position: fixed; inset: 0 auto 0 0; width: var(--sidebar); background: var(--bg); border-right: 1px solid var(--border);
  display: flex; flex-direction: column; align-items: center; padding: 14px 0; z-index: 20;
}
.logo {
  width: 40px; height: 40px; border-radius: 10px; background: var(--surface-3); color: #c4b5fd;
  display: grid; place-items: center; margin-bottom: 22px;
}
.nav { display: flex; flex-direction: column; gap: 8px; }
.nav-item {
  position: relative; width: 42px; height: 42px; border-radius: 10px; display: grid; place-items: center;
  color: var(--muted); transition: background .15s, color .15s;
}
.nav-item:hover { background: var(--surface-2); color: var(--text); text-decoration: none; }
.nav-item.ativo { background: var(--surface-3); color: var(--text); box-shadow: inset 0 0 0 1px var(--border-strong); }
.nav-item.ativo::after { content: ''; position: absolute; top: 6px; right: 6px; width: 5px; height: 5px; border-radius: 50%; background: var(--accent); }
.dica {
  position: absolute; left: 52px; background: var(--surface-3); color: var(--text); border: 1px solid var(--border-strong);
  padding: 5px 10px; border-radius: 6px; font-size: 12.5px; white-space: nowrap; pointer-events: none;
  opacity: 0; transform: translateX(-4px); transition: all .12s; z-index: 30;
}
.nav-item:hover .dica { opacity: 1; transform: none; }
.rotulo-mobile { display: none; }
.base { margin-top: auto; display: flex; flex-direction: column; align-items: center; gap: 12px; padding-top: 12px; border-top: 1px solid var(--border); width: 40px; }
.avatar-mini { width: 30px; height: 30px; border-radius: 50%; background: var(--surface-3); display: grid; place-items: center; font-size: 11px; font-weight: 600; }

.principal { flex: 1; margin-left: var(--sidebar); min-width: 0; }
.topo {
  position: sticky; top: 0; z-index: 15; height: 60px; display: flex; align-items: center; gap: 16px;
  padding: 0 24px; background: rgba(17,17,19,.88); backdrop-filter: blur(10px); border-bottom: 1px solid var(--border);
}
.trilha { display: flex; align-items: center; gap: 8px; color: var(--muted); min-width: 0; }
.trilha a { color: var(--muted); display: grid; }
.trilha .atual { color: var(--text); font-weight: 500; background: var(--surface-2); border: 1px solid var(--border); padding: 3px 10px; border-radius: 6px; font-size: 13px; white-space: nowrap; }
.tag-perfil { font-size: 11px; padding: 2px 7px; }
.busca {
  margin-left: auto; display: flex; align-items: center; gap: 8px; height: 36px; width: 300px; padding: 0 10px;
  background: var(--surface); border: 1px solid var(--border); border-radius: 8px; color: var(--muted);
}
.busca:focus-within { border-color: var(--accent); }
.busca input { flex: 1; min-width: 0; background: transparent; border: 0; outline: none; color: var(--text); font: 13.5px var(--font); }
.busca kbd { font: 11px var(--mono); color: var(--muted); border: 1px solid var(--border-strong); border-radius: 4px; padding: 0 5px; }
.acoes { display: flex; align-items: center; gap: 8px; }
.sino { position: relative; }
.ponto {
  position: absolute; top: 2px; right: 1px; min-width: 16px; height: 16px; padding: 0 4px; border-radius: 8px;
  background: #fb7185; color: #fff; font-size: 10px; font-weight: 700; display: grid; place-items: center;
}
.pop-notif, .pop-usuario { position: relative; }
.pop {
  position: absolute; right: 0; top: 46px; width: 360px; max-height: 460px; overflow: auto; background: var(--surface-2);
  border: 1px solid var(--border-strong); border-radius: 12px; box-shadow: 0 18px 40px rgba(0,0,0,.5); z-index: 40;
}
.pop-menor { width: 260px; }
.pop-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 12px 14px; border-bottom: 1px solid var(--border); }
.pop-head.col { flex-direction: column; align-items: flex-start; gap: 2px; }
.vazio { padding: 18px 14px; }
.notif {
  display: flex; flex-direction: column; gap: 3px; width: 100%; text-align: left; background: transparent; border: 0;
  border-bottom: 1px solid var(--border); padding: 12px 14px; color: var(--text); cursor: pointer; font: inherit;
}
.notif:hover { background: var(--surface-3); }
.notif.nova { box-shadow: inset 3px 0 0 var(--accent); }
.notif .titulo { font-weight: 600; font-size: 13.5px; }
.notif .msg { color: var(--text-2); font-size: 12.5px; }
.notif .quando { color: var(--muted); font-size: 11.5px; }
.usuario { display: flex; align-items: center; gap: 10px; background: transparent; border: 1px solid transparent; border-radius: 10px; padding: 4px 8px 4px 4px; color: var(--text); cursor: pointer; font: inherit; }
.usuario:hover { background: var(--surface-2); }
.usuario .av { width: 32px; height: 32px; border-radius: 50%; background: var(--accent-soft); color: #c4b5fd; display: grid; place-items: center; font-weight: 600; font-size: 12px; }
.usuario .info { display: flex; flex-direction: column; text-align: left; line-height: 1.2; }
.usuario .info strong { font-size: 13px; font-weight: 600; }
.usuario .info small { color: var(--muted); font-size: 11.5px; }
.item-menu { display: flex; align-items: center; gap: 10px; width: 100%; padding: 12px 14px; background: transparent; border: 0; color: var(--red); cursor: pointer; font: 500 14px var(--font); }
.item-menu:hover { background: var(--surface-3); }

/* RNF04 - em telas pequenas o menu vira barra inferior */
@media (max-width: 1100px) { .busca { width: 220px; } .usuario .info { display: none; } }
@media (max-width: 760px) {
  .sidebar { inset: auto 0 0 0; width: 100%; height: 64px; flex-direction: row; padding: 0 6px; border-right: 0; border-top: 1px solid var(--border); }
  .logo, .base { display: none; }
  .nav { flex-direction: row; justify-content: space-around; width: 100%; gap: 2px; }
  .nav-item { flex: 1 1 0; width: auto; min-width: 0; max-width: 96px; height: 56px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; padding: 0 2px; }
  .nav-item.ativo::after { display: none; }
  .dica { display: none; }
  .rotulo-mobile { display: block; max-width: 100%; font-size: 9.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .principal { margin-left: 0; }
  .topo { padding: 0 12px; gap: 8px; }
  .busca { display: none; }
  .tag-perfil { display: none; }
  .acoes { margin-left: auto; }
  .pop { position: fixed; left: 12px; right: 12px; top: 64px; width: auto; }
}
</style>
