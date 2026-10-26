<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { Plus, RefreshCcw, ShieldCheck, Users, ClipboardCheck, Search, Bell, Eye, SearchX } from 'lucide-vue-next';
import KpiCard from '../components/KpiCard.vue';
import Badges from '../components/Badges.vue';
import Avatar from '../components/Avatar.vue';
import Paginacao from '../components/Paginacao.vue';
import RegistroDetalhe from '../components/RegistroDetalhe.vue';
import { api } from '../services/api.js';
import { dataBR, duracao, hojeISO, numero } from '../utils/formatos.js';

// Tela "Substituições" do protótipo: controle e homologação de substituições temporárias
const router = useRouter();
const dias = ref(30);
const filtros = reactive({ busca: '', status: '' });
const pagina = ref(1);
const resultado = ref(null);
const detalheId = ref(null);

async function buscar(p = 1) {
  pagina.value = p;
  resultado.value = await api.get('/registros', {
    categoria: 'SUBSTITUICAO',
    dataInicio: dias.value ? hojeISO(-(dias.value - 1)) : '',
    dataFim: dias.value ? hojeISO() : '',
    busca: filtros.busca,
    status: filtros.status,
    pagina: p,
    porPagina: 8,
  });
}
function mudarPeriodo(n) { dias.value = dias.value === n ? null : n; buscar(); }
onMounted(buscar);

const r = computed(() => resultado.value?.resumo || {});
const taxa = computed(() => (r.value.registros ? ((r.value.homologados / r.value.registros) * 100).toFixed(1) : '0.0').replace('.', ','));
const plural = (n, um, varios) => `${numero(n)} ${Number(n) === 1 ? um : varios}`;
const de = computed(() => (resultado.value?.total ? (pagina.value - 1) * 8 + 1 : 0));
const ate = computed(() => Math.min(pagina.value * 8, resultado.value?.total || 0));
</script>

<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h1>Substituições</h1>
        <p>Controle e homologação de substituições temporárias, trocas de posto e coberturas de afastamento.</p>
      </div>
      <div class="page-actions">
        <div class="segment" role="group" aria-label="Período">
          <button v-for="n in [30, 90]" :key="n" :class="{ ativo: dias === n }" @click="mudarPeriodo(n)">{{ n }} dias</button>
        </div>
        <button class="btn btn-primary" @click="router.push('/atividades/nova')"><Plus :size="17" /> Nova Substituição</button>
      </div>
    </div>

    <div class="grid-kpi">
      <KpiCard titulo="Substituições no período" :valor="numero(r.registros)" unidade="casos" :icone="RefreshCcw" :carregando="!resultado"
        :detalhe="`${Math.round((r.minutos || 0) / 60)}h cobertas`" />
      <KpiCard titulo="Taxa de Homologação" :valor="`${taxa}%`" :icone="ShieldCheck" :carregando="!resultado" cor="verde"
        :detalhe="`${plural(r.homologados, 'homologada', 'homologadas')} e ${plural(r.rejeitados, 'rejeitada', 'rejeitadas')}`" />
      <KpiCard titulo="Profissionais substituídos" :valor="numero(r.substituidos)" unidade="colaboradores" :icone="Users" :carregando="!resultado"
        detalhe="Substitutos devidamente alocados" />
      <KpiCard titulo="Pendentes de Homologação" :valor="numero(r.pendentes)" unidade="pendências" :icone="ClipboardCheck" cor="laranja" destaque :carregando="!resultado"
        detalhe="Aguardando validação de escala do gestor" />
    </div>

    <div v-if="r.pendentes" class="alerta aviso mb-16">
      <span class="ico"><Bell :size="18" /></span>
      <div class="corpo"><span><strong style="display:inline;color:var(--orange)">Atenção:</strong> {{ r.pendentes }} substituição(ões) ainda sem homologação do gestor neste período.</span></div>
    </div>

    <form class="card busca mb-16" @submit.prevent="buscar(1)">
      <Search :size="17" class="muted" />
      <input v-model="filtros.busca" class="input" placeholder="Buscar por titular, substituto, matrícula ou setor…" aria-label="Buscar substituições" />
      <select v-model="filtros.status" class="select status" aria-label="Status" @change="buscar(1)">
        <option value="">Todos os status</option><option value="PENDENTE">Pendente</option><option value="HOMOLOGADO">Homologado</option><option value="REJEITADO">Rejeitado</option>
      </select>
      <button class="btn">Buscar</button>
    </form>

    <div class="tabela-wrap">
      <div class="tabela-scroll">
        <table class="tabela">
          <thead>
            <tr><th>Colaborador titular<br />(afastado)</th><th>Colaborador substituto<br />(em exercício)</th><th>Setor</th><th>Período da<br />substituição</th><th>Horas</th><th>Status de<br />homologação</th><th class="dir">Ações</th></tr>
          </thead>
          <tbody>
            <tr v-for="it in resultado?.itens || []" :key="it.id">
              <td><div class="stack"><span>{{ it.substituidoNome }}</span><span class="tiny muted mono">Mat. {{ it.substituidoMatricula }}</span></div></td>
              <td><div class="row"><Avatar :nome="it.executorNome" :tamanho="30" /><div class="stack"><span>{{ it.executorNome }}</span><span class="tiny muted mono">Mat. {{ it.executorMatricula }}</span></div></div></td>
              <td><div>{{ it.setorNome }}</div><div v-if="it.disciplinaNome" class="tiny muted">{{ it.disciplinaNome }}</div></td>
              <td class="nowrap">{{ dataBR(it.data) }}<br /><span class="chip-tempo">{{ it.horarioInicio.slice(0, 5) }} às {{ it.horarioFim.slice(0, 5) }}</span></td>
              <td class="nowrap"><strong>{{ duracao(it.minutos) }}</strong></td>
              <td><Badges :status="it.status" /></td>
              <td class="dir"><button class="btn btn-ghost btn-icon" title="Ver detalhes" :aria-label="`Ver substituição ${it.id}`" @click="detalheId = it.id"><Eye :size="18" /></button></td>
            </tr>
          </tbody>
        </table>
        <div v-if="resultado && !resultado.total" class="vazio">
          <SearchX :size="32" /><strong>Nenhum registro encontrado para os filtros informados</strong>
          <button class="btn" @click="filtros.busca = ''; filtros.status = ''; dias = null; buscar()">Limpar busca</button>
        </div>
      </div>
      <div v-if="resultado?.total" class="tabela-rodape">
        <span>Mostrando <strong>{{ de }} a {{ ate }}</strong> de <strong>{{ resultado.total }}</strong> substituições</span>
        <Paginacao :pagina="pagina" :total-paginas="resultado.totalPaginas" @ir="buscar" />
      </div>
    </div>

    <RegistroDetalhe v-if="detalheId" :id="detalheId" @fechar="detalheId = null" @alterado="buscar(pagina)" />
  </div>
</template>

<style scoped>
.busca { display: flex; align-items: center; gap: 10px; padding: 12px 14px; }
.busca .input { flex: 1; }
.busca .status { width: 190px; }
.dir { text-align: right; }
.vazio { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 40px 16px; color: var(--muted); }
.vazio strong { color: var(--text); }
@media (max-width: 760px) { .busca { flex-wrap: wrap; } .busca .status { width: 100%; } .busca > svg { display: none; } }
</style>
