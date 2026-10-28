<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  LayoutDashboard, CalendarClock, RefreshCcw, ClipboardCheck, BarChart3, History, Users,
  Search, Bell, LogOut, HelpCircle, Plus, MoreHorizontal, X,
} from 'lucide-vue-next';
import { useAuth } from '../stores/auth.js';
import { api } from '../services/api.js';
import { PERFIS, dataHoraBR } from '../utils/formatos.js';

const auth = useAuth();
const rota = useRoute();
const router = useRouter();

const menu = computed(() => [
  { to: '/', rotulo: 'Dashboard', curto: 'Início', icone: LayoutDashboard },
  { to: '/atividades', rotulo: 'Atividades', curto: 'Atividades', icone: CalendarClock },
  { to: '/substituicoes', rotulo: 'Substituições', curto: 'Substituições', icone: RefreshCcw },
  ...(auth.ehGestao ? [
    { to: '/homologacao', rotulo: 'Homologação', curto: 'Homologar', icone: ClipboardCheck },
    { to: '/relatorios', rotulo: 'Relatórios', curto: 'Relatórios', icone: BarChart3 },
    { to: '/auditoria', rotulo: 'Auditoria', curto: 'Auditoria', icone: History },
  ] : []),
  ...(auth.ehAdmin ? [{ to: '/cadastros', rotulo: 'Cadastros', curto: 'Cadastros', icone: Users }] : []),
]);

// RNF04: no celular a barra de baixo mostra no máximo 4 itens; o resto fica em "Mais".
const menuCelular = computed(() => menu.value.slice(0, 4));
const menuMais = computed(() => menu.value.slice(4));
const abrirMais = ref(false);
const maisAtivo = computed(() => menuMais.value.some((i) => ativo(i.to)));

const ativo = (to) => (to === '/' ? rota.path === '/' : rota.path.startsWith(to));
// Atalho de novo registro só nas telas de consulta, para não cobrir formulários
const mostrarAtalhoNovo = computed(() => ['/', '/atividades', '/substituicoes'].includes(rota.path));

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
  abrirMais.value = false;
  auth.sair();
  router.push('/login');
}

watch(() => rota.fullPath, () => { abrirMais.value = false; });

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
    <!-- Computador: menu lateral de ícones (protótipo) -->
    <aside class="sidebar">
      <RouterLink to="/" class="logo" title="SIGAF">
        <svg viewBox="0 0 64 64" width="22" height="22"><path d="M18 18l14 30 14-30" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" /></svg>
      </RouterLink>
      <nav class="nav">
        <RouterLink v-for="item in menu" :key="item.to" :to="item.to" class="nav-item" :class="{ ativo: ativo(item.to) }" :aria-label="item.rotulo">
          <component :is="item.icone" :size="20" :stroke-width="1.8" />
          <span class="dica">{{ item.rotulo }}</span>
        </RouterLink>
      </nav>
      <div class="base">
        <a class="nav-item" href="https://github.com/JonathanWillian-hub/SIGAF" target="_blank" rel="noopener" aria-label="Ajuda">
          <HelpCircle :size="20" :stroke-width="1.8" /><span class="dica">Documentação</span>
        </a>
      </div>
    </aside>

    <div class="principal">
      <header class="topo">
        <RouterLink to="/" class="logo-celular" aria-label="Início">
          <svg viewBox="0 0 64 64" width="18" height="18"><path d="M18 18l14 30 14-30" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" /></svg>
        </RouterLink>
        <span class="titulo-topo">{{ rota.meta.titulo }}</span>
        <span class="marca-topo">SIGAF</span>

        <form class="busca" role="search" @submit.prevent="buscar">
          <Search :size="16" />
          <input v-model="busca" placeholder="Buscar por colaborador ou matrícula" aria-label="Buscar registros" />
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
                <button v-if="notificacoes.naoLidas" class="btn btn-ghost btn-sm" @click="marcarTodas">Marcar como lidas</button>
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
            <button class="usuario" :aria-label="`Conta de ${auth.usuario?.nome}`" @click="abrirUsuario = !abrirUsuario">
              <span class="av">{{ auth.iniciais }}</span>
              <span class="info">
                <strong>{{ auth.usuario?.nome }}</strong>
                <small>{{ PERFIS[auth.perfil] }}</small>
              </span>
            </button>
            <div v-if="abrirUsuario" class="pop pop-menor">
              <div class="pop-head col">
                <strong>{{ auth.usuario?.nome }}</strong>
                <span class="muted small">{{ auth.usuario?.email }}</span>
                <span class="muted small">{{ PERFIS[auth.perfil] }}, {{ auth.usuario?.setorNome || 'sem setor' }}</span>
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

    <!-- Celular: barra inferior com até 4 itens + "Mais" -->
    <nav class="barra-celular" aria-label="Menu principal">
      <RouterLink v-for="item in menuCelular" :key="item.to" :to="item.to" class="item-celular" :class="{ ativo: ativo(item.to) }">
        <component :is="item.icone" :size="21" :stroke-width="1.8" />
        <span>{{ item.curto }}</span>
      </RouterLink>
      <button v-if="menuMais.length" type="button" class="item-celular" :class="{ ativo: maisAtivo || abrirMais }" @click="abrirMais = true">
        <MoreHorizontal :size="21" :stroke-width="1.8" />
        <span>Mais</span>
      </button>
    </nav>

    <RouterLink v-if="mostrarAtalhoNovo" to="/atividades/nova" class="fab" aria-label="Novo registro">
      <Plus :size="24" :stroke-width="2.2" />
    </RouterLink>

    <Teleport to="body">
      <div v-if="abrirMais" class="folha-fundo" @click.self="abrirMais = false">
        <div class="folha" role="dialog" aria-label="Mais opções">
          <div class="folha-topo">
            <div class="stack">
              <strong>{{ auth.usuario?.nome }}</strong>
              <span class="muted small">{{ PERFIS[auth.perfil] }}, {{ auth.usuario?.setorNome || 'sem setor' }}</span>
            </div>
            <button class="btn btn-ghost btn-icon" aria-label="Fechar" @click="abrirMais = false"><X :size="18" /></button>
          </div>
          <RouterLink v-for="item in menuMais" :key="item.to" :to="item.to" class="folha-item" :class="{ ativo: ativo(item.to) }">
            <component :is="item.icone" :size="19" /> {{ item.rotulo }}
          </RouterLink>
          <button class="folha-item sair" @click="sair"><LogOut :size="19" /> Sair do sistema</button>
        </div>
      </div>
    </Teleport>
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
.base { margin-top: auto; padding-top: 12px; border-top: 1px solid var(--border); }

.principal { flex: 1; margin-left: var(--sidebar); min-width: 0; }
.topo {
  position: sticky; top: 0; z-index: 15; height: 60px; display: flex; align-items: center; gap: 16px;
  padding: 0 24px; background: rgba(17,17,19,.88); backdrop-filter: blur(10px); border-bottom: 1px solid var(--border);
}
.logo-celular, .marca-topo { display: none; }
.titulo-topo { font-weight: 600; font-size: 14px; color: var(--text-2); white-space: nowrap; }
.busca {
  margin-left: auto; display: flex; align-items: center; gap: 8px; height: 36px; width: 300px; padding: 0 10px;
  background: var(--surface); border: 1px solid var(--border); border-radius: 8px; color: var(--muted);
}
.busca:focus-within { border-color: var(--accent); }
.busca input { flex: 1; min-width: 0; background: transparent; border: 0; outline: none; color: var(--text); font: 13.5px var(--font); }
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

.barra-celular, .fab { display: none; }

/* RNF04 - celular: barra inferior enxuta, botão flutuante e topo simples */
@media (max-width: 1100px) { .busca { width: 220px; } .usuario .info { display: none; } }
@media (max-width: 760px) {
  .sidebar { display: none; }
  .principal { margin-left: 0; }
  .topo { height: 54px; padding: 0 12px 0 16px; gap: 10px; }
  .logo-celular { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 8px; background: var(--surface-3); color: #c4b5fd; }
  .titulo-topo { display: none; }
  .marca-topo { display: block; font-weight: 700; font-size: 15px; letter-spacing: .03em; }
  .busca { display: none; }
  .acoes { margin-left: auto; gap: 2px; }
  .usuario { padding: 2px; }
  .pop { position: fixed; left: 12px; right: 12px; top: 60px; width: auto; }

  .barra-celular {
    position: fixed; inset: auto 0 0 0; z-index: 20; display: flex; height: calc(62px + env(safe-area-inset-bottom));
    padding: 4px 6px env(safe-area-inset-bottom); background: rgba(17,17,19,.96); backdrop-filter: blur(10px);
    border-top: 1px solid var(--border);
  }
  .item-celular {
    flex: 1 1 0; min-width: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px;
    color: var(--muted); font: 500 10.5px var(--font); background: none; border: 0; border-radius: 10px; cursor: pointer;
  }
  .item-celular span { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .item-celular:hover { text-decoration: none; }
  .item-celular.ativo { color: #c4b5fd; }
  .item-celular.ativo svg { filter: drop-shadow(0 0 6px rgba(167,139,250,.45)); }

  .fab {
    position: fixed; right: 16px; bottom: calc(76px + env(safe-area-inset-bottom)); z-index: 21; display: grid; place-items: center;
    width: 52px; height: 52px; border-radius: 16px; background: var(--accent); color: var(--accent-ink);
    box-shadow: 0 10px 24px rgba(139,92,246,.35);
  }
}

.folha-fundo { position: fixed; inset: 0; z-index: 60; background: rgba(0,0,0,.55); display: flex; align-items: flex-end; }
.folha {
  width: 100%; background: var(--surface); border-top: 1px solid var(--border-strong); border-radius: 18px 18px 0 0;
  padding: 8px 10px calc(14px + env(safe-area-inset-bottom)); animation: subir .18s ease-out;
}
@keyframes subir { from { transform: translateY(30px); opacity: 0; } }
.folha-topo { display: flex; align-items: center; justify-content: space-between; padding: 10px 8px 12px; border-bottom: 1px solid var(--border); margin-bottom: 6px; }
.folha-item {
  display: flex; align-items: center; gap: 12px; width: 100%; padding: 14px 10px; border-radius: 10px; color: var(--text);
  font: 500 15px var(--font); background: none; border: 0; cursor: pointer; text-align: left;
}
.folha-item:hover { background: var(--surface-2); text-decoration: none; }
.folha-item.ativo { color: #c4b5fd; }
.folha-item.sair { color: var(--red); }
</style>
