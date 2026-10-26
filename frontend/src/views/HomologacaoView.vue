<script setup>
import { onMounted, ref } from 'vue';
import { Check, X, Eye, ClipboardCheck, PartyPopper } from 'lucide-vue-next';
import Badges from '../components/Badges.vue';
import Avatar from '../components/Avatar.vue';
import Modal from '../components/Modal.vue';
import Paginacao from '../components/Paginacao.vue';
import RegistroDetalhe from '../components/RegistroDetalhe.vue';
import { api } from '../services/api.js';
import { useAuth } from '../stores/auth.js';
import { avisar } from '../stores/toast.js';
import { CATEGORIAS, dataBR, dataHoraBR, duracao, horaCurta } from '../utils/formatos.js';

// Diagrama de Sequência "Pendentes de Homologação" (Gestor / Supervisor)
const auth = useAuth();
const lista = ref(null);
const pagina = ref(1);
const categoria = ref('');
const detalheId = ref(null);
const rejeitando = ref(null);
const justificativa = ref('');
const erroJust = ref('');
const enviando = ref(null);

// Passos 1-6: acessa a lista -> busca pendentes -> exibe para análise
async function carregar(p = 1) {
  pagina.value = p;
  lista.value = await api.get('/homologacao/pendentes', { pagina: p, porPagina: 10, categoria: categoria.value });
}
onMounted(carregar);

// Passos 7-13: seleciona e aciona Aprovar ou Rejeitar -> confirmação de status atualizado
async function decidir(item, decisao, texto = '') {
  enviando.value = item.id;
  try {
    const r = await api.patch(`/homologacao/${item.id}`, { decisao, justificativa: texto });
    avisar(r.mensagem);
    rejeitando.value = null;
    justificativa.value = '';
    await carregar(lista.value.itens.length === 1 && pagina.value > 1 ? pagina.value - 1 : pagina.value);
  } catch (e) {
    if (e.campos?.justificativa) erroJust.value = e.campos.justificativa;
    else avisar(e.message, 'erro');
  } finally {
    enviando.value = null;
  }
}

function abrirRejeicao(item) {
  rejeitando.value = item;
  justificativa.value = '';
  erroJust.value = '';
}
function confirmarRejeicao() {
  if (justificativa.value.trim().length < 5) {
    erroJust.value = 'Informe a justificativa (mínimo 5 caracteres).';
    return;
  }
  decidir(rejeitando.value, 'REJEITAR', justificativa.value.trim());
}
</script>

<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h1>Homologação</h1>
        <p>Pendentes de homologação. Aprove ou rejeite com justificativa, e o colaborador é notificado automaticamente.</p>
      </div>
      <div class="page-actions">
        <select v-model="categoria" class="select" style="width: 220px" aria-label="Filtrar por categoria" @change="carregar(1)">
          <option value="">Todas as categorias</option>
          <option v-for="(c, cod) in CATEGORIAS" :key="cod" :value="cod">{{ c.completo }}</option>
        </select>
      </div>
    </div>

    <div class="resumo card mb-16">
      <span class="ico"><ClipboardCheck :size="20" /></span>
      <div><strong>{{ lista?.total ?? '…' }}</strong> registro(s) aguardando sua análise<span class="muted">, {{ auth.perfil === 'GESTOR' ? `equipe de ${auth.usuario?.setorNome}` : 'todos os setores' }}.</span></div>
    </div>

    <div v-if="lista && !lista.total" class="card vazio">
      <PartyPopper :size="36" />
      <strong>Nenhuma pendência!</strong>
      <span class="muted">Todos os registros da sua equipe já foram analisados.</span>
    </div>

    <div v-else class="lista">
      <article v-for="it in lista?.itens || []" :key="it.id" class="item card">
        <div class="quem">
          <Avatar :nome="it.executorNome" :tamanho="40" />
          <div class="stack">
            <strong>{{ it.executorNome }}</strong>
            <span class="mono tiny muted">Mat. {{ it.executorMatricula }}, {{ it.setorNome }}</span>
          </div>
        </div>
        <div class="oque">
          <div class="row wrap">
            <Badges :categoria="it.categoria" />
            <span v-if="it.substituidoNome" class="small muted">{{ it.categoria === 'COBERTURA_HORARIO' ? 'Cobrindo' : 'Substituto de' }}: <span class="text-2">{{ it.substituidoNome }}</span></span>
          </div>
          <p class="tarefa">{{ it.descricaoTarefas }}</p>
          <span class="tiny muted">Enviado em {{ dataHoraBR(it.dataCriacao) }}</span>
        </div>
        <div class="quando">
          <strong>{{ dataBR(it.data) }}</strong>
          <span class="muted small">{{ horaCurta(it.horarioInicio) }} às {{ horaCurta(it.horarioFim) }}</span>
          <span class="chip-tempo">{{ duracao(it.minutos) }}</span>
        </div>
        <div class="acoes">
          <button class="btn btn-ghost btn-icon" title="Ver detalhes" :aria-label="`Ver registro ${it.id}`" @click="detalheId = it.id"><Eye :size="18" /></button>
          <template v-if="it.executorId !== auth.usuario.id">
            <button class="btn btn-danger btn-sm" :disabled="enviando === it.id" @click="abrirRejeicao(it)"><X :size="15" /> Rejeitar</button>
            <button class="btn btn-success btn-sm" :disabled="enviando === it.id" @click="decidir(it, 'APROVAR')"><Check :size="15" /> Aprovar</button>
          </template>
          <span v-else class="tiny muted">Registro próprio, outro gestor deve homologar</span>
        </div>
      </article>
    </div>

    <div v-if="lista?.totalPaginas > 1" class="row mt-16" style="justify-content: flex-end">
      <Paginacao :pagina="pagina" :total-paginas="lista.totalPaginas" @ir="carregar" />
    </div>

    <Modal v-if="rejeitando" titulo="Rejeitar registro" @fechar="rejeitando = null">
      <p class="text-2 mb-16">
        {{ CATEGORIAS[rejeitando.categoria].completo }} de <strong>{{ rejeitando.executorNome }}</strong> em {{ dataBR(rejeitando.data) }}
        (das {{ horaCurta(rejeitando.horarioInicio) }} às {{ horaCurta(rejeitando.horarioFim) }}).
      </p>
      <div class="campo" :class="{ erro: erroJust }">
        <label for="just">Justificativa da rejeição<span class="req">*</span></label>
        <textarea id="just" v-model="justificativa" class="textarea" placeholder="Explique o motivo para o colaborador corrigir o registro…" @input="erroJust = ''" />
        <span v-if="erroJust" class="msg-erro">{{ erroJust }}</span>
      </div>
      <template #rodape>
        <button class="btn btn-ghost" @click="rejeitando = null">Cancelar</button>
        <button class="btn btn-danger" :disabled="enviando" @click="confirmarRejeicao"><X :size="15" /> Confirmar rejeição</button>
      </template>
    </Modal>

    <RegistroDetalhe v-if="detalheId" :id="detalheId" @fechar="detalheId = null" @alterado="carregar(pagina)" />
  </div>
</template>

<style scoped>
.resumo { display: flex; align-items: center; gap: 14px; padding: 14px 16px; }
.resumo .ico { width: 38px; height: 38px; border-radius: 10px; background: var(--amber-soft); color: var(--amber); display: grid; place-items: center; }
.resumo strong { font-size: 18px; color: var(--orange); }
.lista { display: flex; flex-direction: column; gap: 10px; }
.item { display: grid; grid-template-columns: 220px 1fr 130px auto; gap: 18px; align-items: center; padding: 16px; }
.quem { display: flex; align-items: center; gap: 10px; min-width: 0; }
.oque { min-width: 0; display: flex; flex-direction: column; gap: 6px; }
.wrap { flex-wrap: wrap; }
.tarefa { color: var(--text-2); }
.quando { display: flex; flex-direction: column; gap: 2px; align-items: flex-start; }
.acoes { display: flex; align-items: center; gap: 8px; justify-content: flex-end; flex-wrap: wrap; max-width: 260px; }
.vazio { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 48px; text-align: center; }
.vazio svg { color: var(--accent); }
.req { color: var(--red); margin-left: 2px; }
@media (max-width: 1000px) {
  .item { grid-template-columns: 1fr auto; }
  .oque { grid-column: 1 / -1; grid-row: 2; }
  .acoes { grid-column: 1 / -1; justify-content: flex-start; max-width: none; }
}
</style>
