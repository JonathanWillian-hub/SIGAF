<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import {
  Plus, Clock, RefreshCcw, Users, ClipboardCheck, TrendingUp, TrendingDown, AlertTriangle, AlertCircle, Info, ArrowRight,
} from 'lucide-vue-next';
import KpiCard from '../components/KpiCard.vue';
import Badges from '../components/Badges.vue';
import Avatar from '../components/Avatar.vue';
import RegistroDetalhe from '../components/RegistroDetalhe.vue';
import { api } from '../services/api.js';
import { useAuth } from '../stores/auth.js';
import { CATEGORIAS, dataBR, duracao, horaCurta, horasTotais, numero } from '../utils/formatos.js';

// RF05 - Painel Centralizado de Registros
const auth = useAuth();
const router = useRouter();
const dias = ref(30);
const d = ref(null);
const carregando = ref(true);
const erro = ref('');
const detalheId = ref(null);

async function carregar() {
  carregando.value = true;
  try {
    d.value = await api.get('/dashboard', { dias: dias.value });
    erro.value = '';
  } catch (e) { erro.value = e.message; } finally { carregando.value = false; }
}
onMounted(carregar);
watch(dias, carregar);

const k = computed(() => d.value?.kpis || {});
const escopoTexto = computed(() => ({
  PROPRIO: 'Exibindo apenas os seus registros',
  EQUIPE: `Registros da equipe de ${auth.usuario?.setorNome || 'seu setor'}`,
  TODOS: 'Registros de todos os setores',
}[d.value?.escopo] || ''));

const maxSetor = computed(() => Math.max(1, ...(d.value?.porSetor || []).map((s) => s.minutos)));
const maxSemana = computed(() => Math.max(1, ...(d.value?.porSemana || []).map((s) => s.registros)));
const ICONE_ALERTA = { erro: AlertCircle, aviso: AlertTriangle, info: Info };

</script>

<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h1>{{ d?.escopo === 'PROPRIO' ? 'Meu painel' : 'Dashboard' }}</h1>
        <p>Visão operacional consolidada em tempo real.<span v-if="escopoTexto" class="text-2"> {{ escopoTexto }}.</span></p>
      </div>
      <div class="page-actions">
        <div class="segment" role="group" aria-label="Período">
          <button v-for="n in [7, 30, 90]" :key="n" :class="{ ativo: dias === n }" @click="dias = n">{{ n }} dias</button>
        </div>
        <button class="btn btn-primary acao-principal" @click="router.push('/atividades/nova')"><Plus :size="17" /> Novo Registro</button>
      </div>
    </div>

    <div v-if="erro" class="alerta erro mb-20"><div class="corpo"><strong>Não foi possível carregar o painel</strong><span>{{ erro }}</span></div></div>

    <div class="grid-kpi">
      <KpiCard :titulo="`Horas registradas em ${dias} dias`" :valor="horasTotais(k.minutos)" :icone="Clock" :carregando="carregando">
        <span v-if="k.variacaoMinutos !== null && k.variacaoMinutos !== undefined" class="var" :class="{ neg: k.variacaoMinutos < 0 }">
          <component :is="k.variacaoMinutos < 0 ? TrendingDown : TrendingUp" :size="14" />
          {{ k.variacaoMinutos > 0 ? '+' : '' }}{{ k.variacaoMinutos }}% vs. {{ dias }} dias anteriores
        </span>
        <span v-else>{{ numero(k.registros) }} registros no período</span>
      </KpiCard>
      <KpiCard titulo="Substituições" :valor="numero(k.substituicoes)" unidade="casos" :icone="RefreshCcw" :carregando="carregando"
        :detalhe="`${numero(k.extraordinarias)} atividades extraordinárias`" />
      <KpiCard titulo="Coberturas & Apoios" :valor="numero(k.coberturas + k.apoios)" unidade="alocações" :icone="Users" :carregando="carregando"
        :detalhe="`${k.setores || 0} setor(es) atendido(s)`" />
      <RouterLink :to="auth.ehGestao ? '/homologacao' : '/atividades?status=PENDENTE'" class="kpi-link">
        <KpiCard titulo="Pendentes de Homologação" :valor="numero(k.pendentesGeral)" unidade="registros" :icone="ClipboardCheck" cor="laranja" destaque :carregando="carregando">
          <span class="laranja-txt">{{ auth.ehGestao ? 'Resolver pendências' : 'Aguardando o gestor' }} <ArrowRight :size="13" /></span>
        </KpiCard>
      </RouterLink>
    </div>

    <div class="grid-3">
      <section class="card grafico">
        <div class="card-head"><div><h2>Status de Homologação</h2><p>Registros por semana (últimas 8 semanas)</p></div></div>
        <div v-if="d?.porSemana?.length" class="barras">
          <div v-for="s in d.porSemana" :key="s.inicio" class="barra-col" :title="`${s.registros} registros: ${s.homologados} homologados, ${s.pendentes} pendentes e ${s.rejeitados} rejeitados`">
            <div class="pilha" :style="{ height: `${(s.registros / maxSemana) * 100}%` }">
              <span class="seg pend" :style="{ flex: s.pendentes }" />
              <span class="seg rej" :style="{ flex: s.rejeitados }" />
              <span class="seg hom" :style="{ flex: s.homologados }" />
            </div>
            <span class="rot">{{ dataBR(s.inicio).slice(0, 5) }}</span>
          </div>
        </div>
        <p v-else class="muted">Sem registros nas últimas semanas.</p>
        <div class="legenda">
          <span><i class="hom" /> Homologado</span><span><i class="pend" /> Pendente</span><span><i class="rej" /> Rejeitado</span>
        </div>
      </section>

      <section class="card grafico">
        <div class="card-head">
          <div><h2>Atividades por Setor</h2><p>Carga horária acumulada em {{ dias }} dias</p></div>
          <RouterLink to="/atividades" class="small">Ver todos</RouterLink>
        </div>
        <div v-if="d?.porSetor?.length" class="setores">
          <div v-for="(s, i) in d.porSetor" :key="s.setor" class="setor-linha" :class="{ primeiro: i === 0 }">
            <div class="preench" :style="{ width: `${Math.max((s.minutos / maxSetor) * 100, 6)}%` }" />
            <span class="nome truncate">{{ s.setor }}</span>
            <span class="h">{{ horasTotais(s.minutos) }}</span>
          </div>
        </div>
        <p v-else class="muted">Nenhuma atividade no período.</p>
      </section>

      <section class="card alertas-card">
        <div class="card-head">
          <div>
            <h2>{{ d?.escopo === 'PROPRIO' ? 'Meus avisos' : 'Alertas de Alocação Crítica' }}</h2>
            <p>{{ d?.escopo === 'PROPRIO' ? 'Situação dos seus registros' : 'Ações preventivas imediatas' }}</p>
          </div>
        </div>
        <div v-if="d?.alertas?.length" class="alertas">
          <RouterLink v-for="a in d.alertas" :key="a.titulo" :to="a.link" class="al" :class="a.tipo">
            <component :is="ICONE_ALERTA[a.tipo]" :size="16" />
            <span class="t">{{ a.titulo }}</span>
            <span class="v">{{ a.valor }}</span>
          </RouterLink>
        </div>
        <div v-else class="tudo-ok muted">Nenhum alerta no momento. Tudo em dia!</div>
      </section>
    </div>

    <section class="tabela-wrap mt-20 recentes">
      <div class="recentes-head">
        <h2>Atividades recentes</h2>
        <RouterLink to="/atividades" class="btn btn-sm">Ver todas <ArrowRight :size="14" /></RouterLink>
      </div>
      <div class="tabela-scroll">
        <table class="tabela tabela-cartoes">
          <tbody>
            <tr v-for="r in d?.recentes || []" :key="r.id" class="clicavel" @click="detalheId = r.id">
              <td class="c-esq"><div class="row"><Avatar :nome="r.executorNome" /><div class="stack"><strong>{{ r.executorNome }}</strong><span class="mono tiny muted">Mat. {{ r.executorMatricula }}</span></div></div></td>
              <td><Badges :categoria="r.categoria" /><div v-if="r.substituidoNome" class="tiny muted mt4">{{ r.categoria === 'COBERTURA_HORARIO' ? 'Cobrindo' : 'Substituto de' }}: <span class="text-2">{{ r.substituidoNome }}</span></div></td>
              <td class="text-2 c-oculta">{{ r.setorNome }}</td>
              <td class="nowrap">{{ dataBR(r.data) }}<span class="so-celular tiny muted">, {{ horaCurta(r.horarioInicio) }} às {{ horaCurta(r.horarioFim) }}, {{ r.setorNome }}</span><div class="tiny muted so-desktop">{{ horaCurta(r.horarioInicio) }} às {{ horaCurta(r.horarioFim) }} (<span :style="{ color: CATEGORIAS[r.categoria]?.cor === 'laranja' ? 'var(--orange)' : 'var(--accent)' }">{{ duracao(r.minutos) }}</span>)</div></td>
              <td class="c-canto"><Badges :status="r.status" /></td>
            </tr>
            <tr v-if="d && !d.recentes.length"><td class="muted">Nenhum registro ainda. Use "Novo Registro" para começar.</td></tr>
          </tbody>
        </table>
      </div>
    </section>

    <RegistroDetalhe v-if="detalheId" :id="detalheId" @fechar="detalheId = null" @alterado="carregar" />
  </div>
</template>

<style scoped>
.kpi-link { display: block; color: inherit; border-radius: var(--radius); }
.kpi-link:hover { text-decoration: none; }
.kpi-link:hover :deep(.kpi) { border-color: var(--orange); }
.var { display: inline-flex; align-items: center; gap: 4px; color: #c4b5fd; }
.var.neg { color: var(--orange); }
.laranja-txt { display: inline-flex; align-items: center; gap: 5px; color: var(--orange); }

.barras { height: 190px; display: flex; align-items: flex-end; gap: 10px; padding-top: 10px; }
.barra-col { flex: 1; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: 8px; min-width: 0; }
.pilha { width: 100%; max-width: 44px; display: flex; flex-direction: column; border-radius: 6px 6px 3px 3px; overflow: hidden; min-height: 4px; }
.seg { display: block; min-height: 0; }
.seg.hom, .legenda .hom { background: var(--accent); }
.seg.pend, .legenda .pend { background: #fbbf24; }
.seg.rej, .legenda .rej { background: #f87171; }
.rot { font-size: 11px; color: var(--muted); }
.legenda { display: flex; gap: 14px; margin-top: 14px; font-size: 12px; color: var(--muted); flex-wrap: wrap; }
.legenda i { display: inline-block; width: 9px; height: 9px; border-radius: 2px; margin-right: 5px; }

.setores { display: flex; flex-direction: column; gap: 10px; }
.setor-linha { position: relative; height: 38px; display: flex; align-items: center; justify-content: space-between; padding: 0 12px; border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
.preench { position: absolute; inset: 0 auto 0 0; background: var(--surface-3); }
.setor-linha.primeiro .preench { background: rgba(167,139,250,.22); }
.setor-linha .nome, .setor-linha .h { position: relative; font-size: 13px; }
.setor-linha .h { font-weight: 600; }
.setor-linha.primeiro .h { color: #c4b5fd; }

.alertas { display: flex; flex-direction: column; gap: 10px; }
.al { display: flex; align-items: center; gap: 10px; padding: 12px; border: 1px solid var(--border); border-radius: 10px; color: var(--text); background: var(--bg-elev); }
.al:hover { text-decoration: none; border-color: var(--border-strong); }
.al .t { flex: 1; font-size: 13px; }
.al .v { font-size: 12px; font-weight: 600; white-space: nowrap; }
.al.erro svg, .al.erro .v { color: #fca5a5; }
.al.aviso svg, .al.aviso .v { color: var(--orange); }
.al.info svg { color: var(--muted); }
.al.info .v { color: var(--text-2); }
.tudo-ok { padding: 30px 0; text-align: center; }

.recentes-head { display: flex; align-items: center; justify-content: space-between; padding: 16px; border-bottom: 1px solid var(--border); gap: 12px; }
.clicavel { cursor: pointer; }
.mt4 { margin-top: 4px; }

/* Celular: o mais útil primeiro (indicadores, alertas e recentes); gráficos por último */
@media (max-width: 760px) {
  .page { display: flex; flex-direction: column; }
  .grid-3 { display: contents; }
  .grid-3 > .card { margin-bottom: 14px; }
  .grid-kpi { order: 1; margin-bottom: 14px; }
  .card.alertas-card { order: 2; }
  .recentes { order: 3; margin-top: 0; margin-bottom: 14px; }
  .card.grafico { order: 4; }
  .barras { height: 140px; gap: 6px; }
  .recentes-head { padding: 12px 16px; }
}
</style>
