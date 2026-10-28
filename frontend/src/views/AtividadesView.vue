<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Plus, Clock, RefreshCcw, Users, ClipboardCheck, Filter, Eye, ListChecks, SearchX, TrendingUp } from 'lucide-vue-next';
import KpiCard from '../components/KpiCard.vue';
import Badges from '../components/Badges.vue';
import Avatar from '../components/Avatar.vue';
import Paginacao from '../components/Paginacao.vue';
import RegistroDetalhe from '../components/RegistroDetalhe.vue';
import { api } from '../services/api.js';
import { useAuth } from '../stores/auth.js';
import { CATEGORIAS, STATUS, dataBR, duracao, hojeISO, horaCurta, horasTotais, numero } from '../utils/formatos.js';

// RF03 - Consulta de Histórico de Registros
const auth = useAuth();
const rota = useRoute();
const router = useRouter();

const periodo = ref(null); // 7, 30, 90 ou null (todo o histórico)
const filtros = reactive({ busca: '', dataInicio: '', dataFim: '', setorId: '', categoria: '', status: '' });
const pagina = ref(1);
const resultado = ref(null);
const carregando = ref(false);
const erro = ref('');
const setores = ref([]);
const detalheId = ref(null);
const mostrarFiltros = ref(true);

function lerQuery() {
  filtros.busca = rota.query.busca || '';
  filtros.status = rota.query.status || '';
  filtros.categoria = rota.query.categoria || '';
  if (rota.query.registro) detalheId.value = Number(rota.query.registro);
}

// Passos 9-12: "Preencher filtros e acionar busca" -> "Consultar com filtros aplicados"
async function buscar(p = 1) {
  pagina.value = p;
  carregando.value = true;
  try {
    resultado.value = await api.get('/registros', { ...filtros, pagina: p, porPagina: 10 });
    erro.value = '';
  } catch (e) { erro.value = e.message; } finally { carregando.value = false; }
}

function aplicarPeriodo(n) {
  periodo.value = periodo.value === n ? null : n;
  filtros.dataInicio = periodo.value ? hojeISO(-(n - 1)) : '';
  filtros.dataFim = periodo.value ? hojeISO() : '';
  buscar();
}

function limpar() {
  Object.assign(filtros, { busca: '', dataInicio: '', dataFim: '', setorId: '', categoria: '', status: '' });
  periodo.value = null;
  router.replace({ query: {} });
  buscar();
}

const ativos = computed(() => Object.values(filtros).filter(Boolean).length);
const r = computed(() => resultado.value?.resumo || {});
const de = computed(() => (resultado.value?.total ? (pagina.value - 1) * 10 + 1 : 0));
const ate = computed(() => Math.min(pagina.value * 10, resultado.value?.total || 0));

onMounted(async () => {
  lerQuery();
  // setores (para o filtro) e registros chegam ao mesmo tempo
  const [lista] = await Promise.all([api.get('/cadastros/setores'), buscar()]);
  setores.value = lista;
});
watch(() => rota.query.busca, (v, antigo) => { if (v !== antigo) { lerQuery(); buscar(); } });
</script>

<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h1>Atividades</h1>
        <p>Registro, acompanhamento e histórico de atividades operacionais</p>
      </div>
      <div class="page-actions">
        <div class="segment" role="group" aria-label="Período">
          <button v-for="n in [7, 30, 90]" :key="n" :class="{ ativo: periodo === n }" @click="aplicarPeriodo(n)">{{ n }} dias</button>
        </div>
        <button class="btn btn-primary" @click="router.push('/atividades/nova')"><Plus :size="17" /> Nova Atividade</button>
      </div>
    </div>

    <div class="grid-kpi">
      <KpiCard titulo="Total de Horas Registradas" :valor="horasTotais(r.minutos)" :icone="Clock" :carregando="!resultado">
        <span class="roxo-txt"><TrendingUp :size="13" /> {{ numero(r.registros) }} registros no filtro</span>
      </KpiCard>
      <KpiCard titulo="Substituições" :valor="numero(r.substituicoes)" unidade="casos" :icone="RefreshCcw" :carregando="!resultado"
        :detalhe="`Taxa de homologação em ${r.registros ? Math.round((r.homologados / r.registros) * 100) : 0}%`" />
      <KpiCard titulo="Coberturas & Apoios" :valor="numero(r.coberturasApoios)" unidade="alocações" :icone="Users" :carregando="!resultado"
        :detalhe="`${r.setores || 0} setores atendidos`" />
      <KpiCard titulo="Pendentes de Homologação" :valor="numero(r.pendentes)" unidade="registros" :icone="ClipboardCheck" cor="laranja" destaque :carregando="!resultado"
        :detalhe="auth.ehGestao ? 'Requer atenção imediata do gestor' : 'Aguardando validação do gestor'" />
    </div>

    <!-- Passo 8: lista padronizada e filtros disponíveis (data, profissional, setor, tipo) -->
    <form class="card filtros mb-16" @submit.prevent="buscar(1)">
      <div class="filtros-topo">
        <button type="button" class="btn btn-ghost btn-sm" @click="mostrarFiltros = !mostrarFiltros">
          <Filter :size="15" /> Filtros <span v-if="ativos" class="badge roxo">{{ ativos }}</span>
        </button>
        <input v-model="filtros.busca" class="input busca" placeholder="Profissional, matrícula, setor ou tarefa…" aria-label="Buscar" />
        <button class="btn btn-primary">Buscar</button>
        <button v-if="ativos" type="button" class="btn" @click="limpar">Limpar</button>
      </div>
      <div v-show="mostrarFiltros" class="filtros-grade">
        <div class="campo"><label for="f-ini">Data inicial</label><input id="f-ini" v-model="filtros.dataInicio" type="date" class="input" @change="periodo = null" /></div>
        <div class="campo"><label for="f-fim">Data final</label><input id="f-fim" v-model="filtros.dataFim" type="date" class="input" @change="periodo = null" /></div>
        <div class="campo">
          <label for="f-setor">Setor</label>
          <select id="f-setor" v-model="filtros.setorId" class="select"><option value="">Todos</option><option v-for="s in setores" :key="s.id" :value="s.id">{{ s.nome }}</option></select>
        </div>
        <div class="campo">
          <label for="f-cat">Tipo de atividade</label>
          <select id="f-cat" v-model="filtros.categoria" class="select"><option value="">Todos</option><option v-for="(c, cod) in CATEGORIAS" :key="cod" :value="cod">{{ c.completo }}</option></select>
        </div>
        <div class="campo">
          <label for="f-status">Status</label>
          <select id="f-status" v-model="filtros.status" class="select"><option value="">Todos</option><option v-for="(s, cod) in STATUS" :key="cod" :value="cod">{{ s.rotulo }}</option></select>
        </div>
      </div>
    </form>

    <div v-if="erro" class="alerta erro mb-16"><div class="corpo"><span>{{ erro }}</span></div></div>

    <div class="tabela-wrap">
      <div class="tabela-scroll">
        <table class="tabela">
          <thead>
            <tr>
              <th>Responsável</th><th>Tipo de atividade</th><th>Setor &amp; disciplina</th><th>Data e horário</th>
              <th>Tarefas executadas</th><th>Status</th><th class="dir">Ações</th>
            </tr>
          </thead>
          <tbody :class="{ carregando }">
            <tr v-for="it in resultado?.itens || []" :key="it.id" :class="{ destaque: it.status === 'PENDENTE' }">
              <td>
                <div class="row"><Avatar :nome="it.executorNome" /><div class="stack"><strong class="nowrap">{{ it.executorNome }}</strong><span class="mono tiny muted">Mat. {{ it.executorMatricula }}</span></div></div>
              </td>
              <td>
                <Badges :categoria="it.categoria" />
                <div v-if="it.substituidoNome" class="tiny muted mt4">{{ it.categoria === 'COBERTURA_HORARIO' ? 'Cobrindo' : 'Substituto de' }}: <span class="text-2">{{ it.substituidoNome }}</span></div>
              </td>
              <td><div class="text-2">{{ it.setorNome }}</div><div v-if="it.disciplinaNome" class="tiny muted">{{ it.disciplinaNome }}</div></td>
              <td class="nowrap">{{ dataBR(it.data) }}<div class="tiny muted">{{ horaCurta(it.horarioInicio) }} às {{ horaCurta(it.horarioFim) }} (<span class="h">{{ duracao(it.minutos) }}</span>)</div></td>
              <td class="tarefa"><span class="clamp-2">{{ it.descricaoTarefas }}</span></td>
              <td><Badges :status="it.status" /></td>
              <td class="dir">
                <button class="btn btn-ghost btn-icon" :aria-label="`Ver detalhes do registro ${it.id}`" title="Ver detalhes" @click="detalheId = it.id">
                  <ListChecks v-if="it.status === 'PENDENTE' && auth.ehGestao" :size="18" class="laranja" />
                  <Eye v-else :size="18" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- A1 - Nenhum registro encontrado -->
        <div v-if="resultado && !resultado.total" class="vazio">
          <SearchX :size="34" />
          <strong>{{ resultado.mensagem || 'Nenhum registro encontrado para os filtros informados' }}</strong>
          <span class="muted">Tente ampliar o período ou remover alguns filtros.</span>
          <button class="btn" @click="limpar">Limpar busca</button>
        </div>
      </div>
      <div v-if="resultado?.total" class="tabela-rodape">
        <span>Mostrando <strong>{{ de }} a {{ ate }}</strong> de <strong>{{ numero(resultado.total) }}</strong> atividades</span>
        <Paginacao :pagina="pagina" :total-paginas="resultado.totalPaginas" @ir="buscar" />
      </div>
    </div>

    <RegistroDetalhe v-if="detalheId" :id="detalheId" @fechar="detalheId = null" @alterado="buscar(pagina)" />
  </div>
</template>

<style scoped>
.roxo-txt { display: inline-flex; align-items: center; gap: 4px; color: #c4b5fd; }
.filtros { padding: 14px 16px; }
.filtros-topo { display: flex; gap: 10px; align-items: center; }
.filtros-topo .busca { flex: 1; }
.filtros-grade { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 12px; margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--border); }
.dir { text-align: right; }
.tarefa { min-width: 220px; max-width: 340px; color: var(--text-2); }
.h { color: #c4b5fd; }
.laranja { color: var(--orange); }
.mt4 { margin-top: 4px; }
tbody.carregando { opacity: .5; }
.vazio { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 44px 16px; text-align: center; color: var(--muted); }
.vazio strong { color: var(--text); font-size: 15px; }
.vazio .btn { margin-top: 8px; }
@media (max-width: 1100px) { .filtros-grade { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
@media (max-width: 760px) {
  .filtros-topo { flex-wrap: wrap; }
  .filtros-topo .busca { flex-basis: 100%; order: -1; }
  .filtros-grade { grid-template-columns: 1fr 1fr; }
}
</style>
