<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { Plus, Search, LifeBuoy, MessageSquare, ChevronRight } from 'lucide-vue-next';
import Modal from '../components/Modal.vue';
import AnexosEntrada from '../components/AnexosEntrada.vue';
import { api } from '../services/api.js';
import { useAuth } from '../stores/auth.js';
import { avisar } from '../stores/toast.js';
import { CATEGORIAS_CHAMADO, PRIORIDADES_CHAMADO, STATUS_CHAMADO, PERFIS, dataHoraBR } from '../utils/formatos.js';

const auth = useAuth();
const router = useRouter();
const suporte = computed(() => auth.ehAdmin);

const itens = ref([]);
const totais = ref({ ABERTO: 0, EM_ATENDIMENTO: 0, RESOLVIDO: 0 });
const status = ref('');
const busca = ref('');
const carregando = ref(true);

async function carregar() {
  carregando.value = true;
  try {
    const r = await api.get('/chamados', { status: status.value, busca: busca.value.trim() });
    itens.value = r.itens;
    totais.value = r.totais;
  } catch (e) {
    avisar(e.message, 'erro');
  } finally {
    carregando.value = false;
  }
}
onMounted(carregar);
watch(status, carregar);
let espera;
watch(busca, () => { clearTimeout(espera); espera = setTimeout(carregar, 300); });

const total = computed(() => Object.values(totais.value).reduce((a, b) => a + b, 0));

const novo = ref(false);
const form = reactive({ titulo: '', categoria: '', prioridade: 'MEDIA', descricao: '' });
const anexos = ref([]);
const entradaAnexos = ref(null);
const erros = ref({});
const enviando = ref(false);

function abrirNovo() {
  Object.assign(form, { titulo: '', categoria: '', prioridade: 'MEDIA', descricao: '' });
  anexos.value = [];
  erros.value = {};
  novo.value = true;
}

async function enviar() {
  erros.value = {};
  enviando.value = true;
  try {
    const r = await api.post('/chamados', { ...form, anexos: anexos.value.map(({ nome, tipo, conteudo }) => ({ nome, tipo, conteudo })) });
    avisar(r.mensagem);
    novo.value = false;
    router.push(`/chamados/${r.chamado.id}`);
  } catch (e) {
    erros.value = e.campos || {};
    if (!e.campos) avisar(e.message, 'erro');
  } finally {
    enviando.value = false;
  }
}
</script>

<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h1>{{ suporte ? 'Chamados' : 'Suporte' }}</h1>
        <p v-if="suporte">Pedidos de ajuda dos gestores e colaboradores. Responda e acompanhe até resolver.</p>
        <p v-else>Teve um problema ou ficou com dúvida? Abra um chamado e a equipe do SIGAF responde por aqui.</p>
      </div>
      <div v-if="!suporte" class="page-actions">
        <button class="btn btn-primary" @click="abrirNovo"><Plus :size="17" /> Abrir chamado</button>
      </div>
    </div>

    <div class="filtros mb-16">
      <div class="segment" role="group" aria-label="Situação do chamado">
        <button :class="{ ativo: status === '' }" @click="status = ''">Todos ({{ total }})</button>
        <button v-for="(s, cod) in STATUS_CHAMADO" :key="cod" :class="{ ativo: status === cod }" @click="status = cod">
          {{ s.rotulo }} ({{ totais[cod] || 0 }})
        </button>
      </div>
      <label v-if="suporte" class="busca">
        <Search :size="16" />
        <input v-model="busca" placeholder="Buscar por título ou pessoa" aria-label="Buscar chamados" />
      </label>
    </div>

    <div class="tabela-wrap">
      <div v-if="carregando" class="vazio"><div class="skeleton" style="height: 120px" /></div>
      <div v-else-if="!itens.length" class="vazio">
        <span class="ico-vazio"><LifeBuoy :size="26" /></span>
        <strong>{{ status ? 'Nenhum chamado nesta situação' : 'Nenhum chamado por enquanto' }}</strong>
        <span class="muted small">{{ suporte ? 'Quando alguém pedir ajuda, o chamado aparece aqui.' : 'Use o botão Abrir chamado quando precisar de ajuda.' }}</span>
        <button v-if="!suporte && !status" class="btn btn-primary mt-16" @click="abrirNovo"><Plus :size="16" /> Abrir chamado</button>
      </div>
      <ul v-else class="lista">
        <li v-for="c in itens" :key="c.id">
          <RouterLink :to="`/chamados/${c.id}`" class="item">
            <span class="prio" :class="c.prioridade.toLowerCase()" :title="`Prioridade ${PRIORIDADES_CHAMADO[c.prioridade].rotulo}`" />
            <div class="corpo">
              <div class="linha1">
                <span class="mono muted small">#{{ c.id }}</span>
                <strong class="truncate">{{ c.titulo }}</strong>
              </div>
              <div class="linha2 small muted">
                <span v-if="suporte" class="text-2">{{ c.solicitanteNome }}</span>
                <span v-if="suporte">{{ PERFIS[c.solicitantePerfil] }}{{ c.setorNome ? `, ${c.setorNome}` : '' }}</span>
                <span>{{ CATEGORIAS_CHAMADO[c.categoria].rotulo }}</span>
                <span>Atualizado em {{ dataHoraBR(c.atualizadoEm) }}</span>
              </div>
            </div>
            <span class="msgs small muted"><MessageSquare :size="14" /> {{ c.mensagens }}</span>
            <span class="badge" :class="STATUS_CHAMADO[c.status].cor"><span class="dot" /> {{ STATUS_CHAMADO[c.status].rotulo }}</span>
            <ChevronRight :size="18" class="muted seta" />
          </RouterLink>
        </li>
      </ul>
    </div>

    <Modal v-if="novo" titulo="Abrir chamado" @fechar="novo = false">
      <form id="form-chamado" class="grade" novalidate @submit.prevent="enviar">
        <div class="campo cheio" :class="{ erro: erros.titulo }">
          <label for="ch-titulo">Assunto<span class="req">*</span></label>
          <input id="ch-titulo" v-model="form.titulo" class="input" maxlength="160" placeholder="Resuma o que aconteceu" />
          <span v-if="erros.titulo" class="msg-erro">{{ erros.titulo }}</span>
        </div>
        <div class="campo" :class="{ erro: erros.categoria }">
          <label for="ch-cat">Categoria<span class="req">*</span></label>
          <select id="ch-cat" v-model="form.categoria" class="select">
            <option value="" disabled>Escolha</option>
            <option v-for="(c, cod) in CATEGORIAS_CHAMADO" :key="cod" :value="cod">{{ c.rotulo }}</option>
          </select>
          <span v-if="erros.categoria" class="msg-erro">{{ erros.categoria }}</span>
        </div>
        <div class="campo">
          <label for="ch-prio">Prioridade</label>
          <select id="ch-prio" v-model="form.prioridade" class="select">
            <option v-for="(p, cod) in PRIORIDADES_CHAMADO" :key="cod" :value="cod">{{ p.rotulo }}</option>
          </select>
        </div>
        <div class="campo cheio" :class="{ erro: erros.descricao }">
          <label for="ch-desc">Descrição<span class="req">*</span></label>
          <textarea id="ch-desc" v-model="form.descricao" class="textarea" maxlength="4000"
            placeholder="Conte o que você estava fazendo, o que esperava e o que aconteceu. Dá para colar um print com Ctrl + V."
            @paste="entradaAnexos?.colar($event)" />
          <span v-if="erros.descricao" class="msg-erro">{{ erros.descricao }}</span>
        </div>
        <div class="campo cheio" @dragover.prevent @drop.prevent="entradaAnexos?.soltar($event)">
          <label>Prints e arquivos <span class="muted">(opcional)</span></label>
          <AnexosEntrada ref="entradaAnexos" v-model="anexos" />
          <span class="ajuda">Imagens, PDF, Excel ou CSV. Até 4 arquivos, 3,5 MB no total.</span>
        </div>
      </form>
      <template #rodape>
        <button class="btn btn-ghost" @click="novo = false">Cancelar</button>
        <button class="btn btn-primary" form="form-chamado" :disabled="enviando">{{ enviando ? 'Enviando...' : 'Abrir chamado' }}</button>
      </template>
    </Modal>
  </div>
</template>

<style scoped>
.filtros { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; justify-content: space-between; }
.busca {
  display: flex; align-items: center; gap: 8px; height: 38px; width: 280px; padding: 0 10px;
  background: var(--surface); border: 1px solid var(--border); border-radius: 8px; color: var(--muted);
}
.busca:focus-within { border-color: var(--accent); }
.busca input { flex: 1; min-width: 0; background: transparent; border: 0; outline: none; color: var(--text); font: 13.5px var(--font); }

.lista { list-style: none; margin: 0; padding: 0; }
.lista li + li { border-top: 1px solid var(--border); }
.item { display: flex; align-items: center; gap: 14px; padding: 14px 16px; color: var(--text); transition: background .15s; }
.item:hover { background: rgba(167,139,250,.04); text-decoration: none; }
.item:hover .seta { transform: translateX(3px); color: var(--text); }
.seta { transition: transform .2s; flex: none; }
.prio { width: 4px; align-self: stretch; border-radius: 4px; flex: none; background: var(--surface-3); }
.prio.alta { background: var(--red); }
.prio.media { background: var(--amber); }
.corpo { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.linha1 { display: flex; align-items: baseline; gap: 8px; min-width: 0; }
.linha2 { display: flex; flex-wrap: wrap; gap: 4px 14px; }
.msgs { display: inline-flex; align-items: center; gap: 4px; flex: none; }

.vazio { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 40px 20px; text-align: center; }
.ico-vazio { width: 54px; height: 54px; border-radius: 16px; display: grid; place-items: center; background: var(--accent-soft); color: #c4b5fd; margin-bottom: 6px; }

.grade { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.cheio { grid-column: 1 / -1; }
.req { color: var(--red); margin-left: 2px; }

@media (max-width: 760px) {
  .segment { display: flex; width: 100%; overflow-x: auto; }
  .segment button { flex: 1 0 auto; white-space: nowrap; }
  .busca { width: 100%; }
  .item { flex-wrap: wrap; gap: 8px 12px; padding: 14px; }
  .corpo { flex: 1 1 calc(100% - 30px); }
  .msgs { margin-left: 18px; }
  .seta { display: none; }
  .grade { grid-template-columns: 1fr; }
}
</style>
