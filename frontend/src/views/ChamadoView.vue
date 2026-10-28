<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { ArrowLeft, Send, CheckCircle2, LifeBuoy, X, Download } from 'lucide-vue-next';
import Avatar from '../components/Avatar.vue';
import AnexosEntrada from '../components/AnexosEntrada.vue';
import AnexoItem from '../components/AnexoItem.vue';
import { api } from '../services/api.js';
import { useAuth } from '../stores/auth.js';
import { avisar } from '../stores/toast.js';
import { gsap, movimentoReduzido } from '../utils/animacoes.js';
import { CATEGORIAS_CHAMADO, PRIORIDADES_CHAMADO, STATUS_CHAMADO, PERFIS, dataHoraBR } from '../utils/formatos.js';

const auth = useAuth();
const rota = useRoute();
const suporte = computed(() => auth.ehAdmin);

const chamado = ref(null);
const mensagens = ref([]);
const autores = ref({});
const erro = ref('');
const resposta = ref('');
const anexos = ref([]);
const entradaAnexos = ref(null);
const ampliada = ref(null);
const enviando = ref(false);
const podeEnviar = computed(() => Boolean(resposta.value.trim() || anexos.value.length));
const lista = ref(null);

async function carregar({ animar = false } = {}) {
  try {
    const r = await api.get(`/chamados/${rota.params.id}`);
    const antes = mensagens.value.length;
    chamado.value = r.chamado;
    autores.value = r.autores;
    mensagens.value = r.mensagens;
    erro.value = '';
    if (r.mensagens.length > antes) {
      await nextTick();
      lista.value?.lastElementChild?.scrollIntoView({ block: 'nearest', behavior: antes ? 'smooth' : 'auto' });
      if (animar && antes && !movimentoReduzido()) {
        gsap.from([...lista.value.children].slice(antes), { autoAlpha: 0, y: 12, duration: 0.4, stagger: 0.08, ease: 'power2.out', clearProps: 'opacity,visibility,transform' });
      }
    }
  } catch (e) {
    erro.value = e.message;
  }
}

let timer;
const fecharComEsc = (e) => { if (e.key === 'Escape') ampliada.value = null; };
onMounted(() => {
  carregar();
  timer = setInterval(() => carregar({ animar: true }), 15000);
  document.addEventListener('keydown', fecharComEsc);
});
onBeforeUnmount(() => {
  clearInterval(timer);
  document.removeEventListener('keydown', fecharComEsc);
});
watch(() => rota.params.id, (id) => { if (id) { mensagens.value = []; carregar(); } });

const autor = (id) => autores.value[id] || { nome: 'Usuário', perfil: '' };
const minha = (m) => m.autorId === auth.usuario?.id;
const doSuporte = (m) => autor(m.autorId).perfil === 'ADMINISTRADOR';

async function enviar() {
  if (!podeEnviar.value) return;
  enviando.value = true;
  try {
    const r = await api.post(`/chamados/${chamado.value.id}/mensagens`, {
      mensagem: resposta.value,
      anexos: anexos.value.map(({ nome, tipo, conteudo }) => ({ nome, tipo, conteudo })),
    });
    resposta.value = '';
    anexos.value = [];
    chamado.value = r.chamado;
    await carregar({ animar: true });
  } catch (e) {
    avisar(e.message, 'erro');
  } finally {
    enviando.value = false;
  }
}

function atalho(e) {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) enviar();
}

async function mudarStatus(status) {
  try {
    const r = await api.patch(`/chamados/${chamado.value.id}/status`, { status });
    chamado.value = r.chamado;
    avisar(r.mensagem);
  } catch (e) {
    avisar(e.message, 'erro');
  }
}
</script>

<template>
  <div class="page chamado">
    <RouterLink to="/chamados" class="voltar small"><ArrowLeft :size="15" /> {{ suporte ? 'Todos os chamados' : 'Meus chamados' }}</RouterLink>

    <div v-if="erro" class="alerta erro"><div class="corpo"><strong>Não foi possível abrir o chamado</strong><span>{{ erro }}</span></div></div>

    <template v-else-if="chamado">
      <header class="cabeca card">
        <div class="titulo-linha">
          <span class="ico"><LifeBuoy :size="20" /></span>
          <div class="stack">
            <span class="mono muted small">Chamado #{{ chamado.id }}</span>
            <h1>{{ chamado.titulo }}</h1>
          </div>
        </div>
        <div class="selos">
          <span class="badge" :class="STATUS_CHAMADO[chamado.status].cor"><span class="dot" /> {{ STATUS_CHAMADO[chamado.status].rotulo }}</span>
          <span class="badge" :class="CATEGORIAS_CHAMADO[chamado.categoria].cor">{{ CATEGORIAS_CHAMADO[chamado.categoria].rotulo }}</span>
          <span class="badge" :class="PRIORIDADES_CHAMADO[chamado.prioridade].cor">Prioridade {{ PRIORIDADES_CHAMADO[chamado.prioridade].rotulo.toLowerCase() }}</span>
        </div>
        <div class="meta small muted">
          <span>Aberto por <strong class="text-2">{{ chamado.solicitanteNome }}</strong> ({{ PERFIS[chamado.solicitantePerfil] }}{{ chamado.setorNome ? `, ${chamado.setorNome}` : '' }})</span>
          <span>em {{ dataHoraBR(chamado.criadoEm) }}</span>
        </div>
        <div class="acoes">
          <template v-if="suporte">
            <label class="small muted" for="status-chamado">Situação</label>
            <select id="status-chamado" class="select" :value="chamado.status" @change="mudarStatus($event.target.value)">
              <option v-for="(s, cod) in STATUS_CHAMADO" :key="cod" :value="cod">{{ s.rotulo }}</option>
            </select>
          </template>
          <button v-else-if="chamado.status !== 'RESOLVIDO'" class="btn btn-success btn-sm" @click="mudarStatus('RESOLVIDO')">
            <CheckCircle2 :size="16" /> Meu problema foi resolvido
          </button>
        </div>
      </header>

      <section class="conversa card">
        <ol ref="lista" class="mensagens">
          <li v-for="m in mensagens" :key="m.id" class="msg" :class="{ minha: minha(m), suporte: doSuporte(m) }">
            <Avatar :nome="autor(m.autorId).nome" :foto="autor(m.autorId).foto" :tamanho="34" redondo />
            <div class="balao">
              <div class="quem small">
                <strong>{{ minha(m) ? 'Você' : autor(m.autorId).nome }}</strong>
                <span v-if="doSuporte(m)" class="selo-suporte">Suporte SIGAF</span>
                <span class="muted">{{ dataHoraBR(m.criadaEm) }}</span>
              </div>
              <p v-if="m.mensagem">{{ m.mensagem }}</p>
              <div v-if="m.anexos?.length" class="anexos">
                <AnexoItem v-for="a in m.anexos" :key="a.id" :chamado-id="chamado.id" :anexo="a" @ampliar="ampliada = $event" />
              </div>
            </div>
          </li>
        </ol>

        <div v-if="chamado.status === 'RESOLVIDO'" class="resolvido small">
          <CheckCircle2 :size="16" />
          <span>Chamado resolvido. {{ suporte ? 'Se precisar, mude a situação acima.' : 'Se o problema voltar, escreva abaixo e o chamado é reaberto.' }}</span>
        </div>

        <form class="responder" @submit.prevent="enviar" @dragover.prevent @drop.prevent="entradaAnexos?.soltar($event)">
          <textarea v-model="resposta" class="textarea" maxlength="4000" rows="3"
            :placeholder="suporte ? 'Escreva a resposta para o usuário. Cole um print com Ctrl + V.' : 'Escreva uma mensagem para o suporte. Cole um print com Ctrl + V.'"
            @keydown="atalho" @paste="entradaAnexos?.colar($event)" />
          <AnexosEntrada ref="entradaAnexos" v-model="anexos" />
          <div class="rodape">
            <span class="tiny muted so-desktop">Ctrl + Enter para enviar</span>
            <button class="btn btn-primary" type="submit" :disabled="enviando || !podeEnviar"><Send :size="16" /> {{ enviando ? 'Enviando...' : 'Enviar' }}</button>
          </div>
        </form>
      </section>
    </template>

    <div v-else class="skeleton" style="height: 260px" />

    <Teleport to="body">
      <div v-if="ampliada" class="visualizador" role="dialog" :aria-label="ampliada.nome" @click.self="ampliada = null">
        <div class="barra">
          <span class="truncate">{{ ampliada.nome }}</span>
          <button class="btn btn-sm" type="button" @click="ampliada.baixar()"><Download :size="15" /> Baixar</button>
          <button class="btn btn-ghost btn-icon" type="button" aria-label="Fechar" @click="ampliada = null"><X :size="18" /></button>
        </div>
        <img :src="ampliada.url" :alt="ampliada.nome" @click="ampliada = null" />
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.chamado { max-width: 920px; }
.voltar { display: inline-flex; align-items: center; gap: 6px; color: var(--muted); margin-bottom: 14px; }
.voltar:hover { color: var(--text); text-decoration: none; }

.cabeca { display: flex; flex-direction: column; gap: 12px; margin-bottom: 16px; }
.titulo-linha { display: flex; gap: 12px; align-items: center; }
.titulo-linha h1 { font-size: 21px; }
.ico { width: 42px; height: 42px; border-radius: 12px; display: grid; place-items: center; flex: none; background: var(--accent-soft); color: #c4b5fd; border: 1px solid rgba(167,139,250,.3); }
.selos { display: flex; flex-wrap: wrap; gap: 6px; }
.meta { display: flex; flex-wrap: wrap; gap: 4px 8px; }
.acoes { display: flex; align-items: center; gap: 10px; border-top: 1px solid var(--border); padding-top: 12px; }
.acoes .select { width: 200px; height: 36px; }

.mensagens { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 16px; }
.msg { display: flex; gap: 10px; align-items: flex-start; max-width: 86%; }
.msg.minha { flex-direction: row-reverse; align-self: flex-end; }
.balao { background: var(--surface-2); border: 1px solid var(--border); border-radius: 4px 14px 14px 14px; padding: 10px 14px; min-width: 0; }
.msg.minha .balao { background: rgba(167,139,250,.12); border-color: rgba(167,139,250,.3); border-radius: 14px 4px 14px 14px; }
.msg.suporte:not(.minha) .balao { border-color: rgba(94,234,212,.3); background: rgba(94,234,212,.06); }
.quem { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 8px; margin-bottom: 4px; }
.selo-suporte { font-size: 11px; padding: 1px 7px; border-radius: 999px; background: var(--teal-soft); color: var(--teal); }
.balao p { white-space: pre-wrap; overflow-wrap: anywhere; color: var(--text); }
.anexos { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
.msg.minha .anexos { justify-content: flex-end; }
.visualizador {
  position: fixed; inset: 0; z-index: 80; background: rgba(5,5,8,.88); backdrop-filter: blur(4px);
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 20px;
}
.visualizador .barra { display: flex; align-items: center; gap: 10px; width: min(1100px, 100%); color: var(--text-2); }
.visualizador .barra span { flex: 1; min-width: 0; }
.visualizador img { max-width: min(1100px, 100%); max-height: calc(100vh - 110px); border-radius: 10px; box-shadow: 0 20px 60px rgba(0,0,0,.6); cursor: zoom-out; }

.resolvido { display: flex; gap: 8px; align-items: center; margin-top: 18px; padding: 10px 12px; border-radius: 10px; background: var(--green-soft); color: var(--green); }
.responder { margin-top: 18px; padding-top: 16px; border-top: 1px solid var(--border); display: flex; flex-direction: column; gap: 10px; }
.responder .textarea { min-height: 84px; }
.rodape { display: flex; justify-content: space-between; align-items: center; gap: 10px; }

@media (max-width: 760px) {
  .titulo-linha h1 { font-size: 18px; }
  .msg { max-width: 100%; }
  .acoes { flex-wrap: wrap; }
  .acoes .select { flex: 1; }
  .rodape { justify-content: flex-end; }
}
</style>
