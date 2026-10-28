<script setup>
import { computed, onMounted, ref } from 'vue';
import { UserCheck, UserX, Activity, LifeBuoy, ArrowRight, AlertTriangle, Plus, ShieldCheck } from 'lucide-vue-next';
import KpiCard from '../components/KpiCard.vue';
import { api } from '../services/api.js';
import { useAuth } from '../stores/auth.js';
import { PERFIS, PRIORIDADES_CHAMADO, STATUS_CHAMADO, dataHoraBR, numero } from '../utils/formatos.js';

const auth = useAuth();
const d = ref(null);
const carregando = ref(true);
const erro = ref('');

onMounted(async () => {
  try {
    d.value = await api.get('/sistema/resumo');
  } catch (e) {
    erro.value = e.message;
  } finally {
    carregando.value = false;
  }
});

const u = computed(() => d.value?.usuarios || { ativos: 0, inativos: 0, porPerfil: {} });
const ch = computed(() => d.value?.chamados?.totais || {});
const pendentes = computed(() => (ch.value.ABERTO || 0) + (ch.value.EM_ATENDIMENTO || 0));
const setoresSemGestor = computed(() => (d.value?.setores || []).filter((s) => s.ativo && !s.gestores));
const primeiroNome = computed(() => (auth.usuario?.nome || '').split(' ')[0]);
</script>

<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h1>Olá, {{ primeiroNome }}</h1>
        <p>Saúde da plataforma: contas, setores e chamados de suporte. Os registros de atividades ficam só com a empresa.</p>
      </div>
      <div class="page-actions">
        <RouterLink to="/cadastros" class="btn btn-primary acao-principal"><Plus :size="17" /> Novo usuário</RouterLink>
      </div>
    </div>

    <div v-if="erro" class="alerta erro mb-20"><div class="corpo"><strong>Não foi possível carregar o painel</strong><span>{{ erro }}</span></div></div>

    <div class="grid-kpi">
      <KpiCard titulo="Contas ativas" :valor="numero(u.ativos)" :icone="UserCheck" cor="verde" :carregando="carregando" :detalhe="`${numero(u.porPerfil.GESTOR?.ativos || 0)} gestores e ${numero(u.porPerfil.COLABORADOR?.ativos || 0)} colaboradores`" />
      <KpiCard titulo="Contas inativas" :valor="numero(u.inativos)" :icone="UserX" :carregando="carregando" detalhe="Bloqueadas para login" />
      <KpiCard titulo="Entraram nos últimos 7 dias" :valor="numero(d?.acessosUltimos7Dias)" unidade="pessoas" :icone="Activity" :carregando="carregando" detalhe="Usuários diferentes" />
      <RouterLink to="/chamados" class="kpi-link">
        <KpiCard titulo="Chamados para atender" :valor="numero(pendentes)" :icone="LifeBuoy" cor="laranja" :destaque="pendentes > 0" :carregando="carregando">
          <span class="laranja-txt">{{ numero(ch.ABERTO || 0) }} sem resposta <ArrowRight :size="13" /></span>
        </KpiCard>
      </RouterLink>
    </div>

    <div v-if="setoresSemGestor.length" class="alerta aviso mb-20">
      <span class="ico"><AlertTriangle :size="18" /></span>
      <div class="corpo">
        <strong>{{ setoresSemGestor.length === 1 ? 'Um setor está sem gestor' : `${setoresSemGestor.length} setores estão sem gestor` }}</strong>
        <span>{{ setoresSemGestor.map((s) => s.nome).join(', ') }}. Sem gestor, ninguém homologa os registros nem gera os relatórios desse setor.</span>
      </div>
      <RouterLink to="/cadastros" class="btn btn-sm">Cadastrar gestor</RouterLink>
    </div>

    <div class="colunas">
      <section class="card">
        <div class="card-head">
          <div><h2>Chamados em aberto</h2><p>Por prioridade e última atualização.</p></div>
          <RouterLink to="/chamados" class="btn btn-ghost btn-sm">Ver todos <ArrowRight :size="14" /></RouterLink>
        </div>
        <div v-if="carregando" class="skeleton" style="height: 140px" />
        <p v-else-if="!d?.chamados.recentes.length" class="muted vazio">Nenhum chamado esperando resposta. Tudo em dia.</p>
        <ul v-else class="chamados">
          <li v-for="c in d.chamados.recentes" :key="c.id">
            <RouterLink :to="`/chamados/${c.id}`" class="chamado">
              <span class="prio" :class="c.prioridade.toLowerCase()" :title="`Prioridade ${PRIORIDADES_CHAMADO[c.prioridade].rotulo}`" />
              <span class="stack corpo">
                <strong class="truncate">{{ c.titulo }}</strong>
                <span class="small muted">{{ c.solicitanteNome }}, {{ dataHoraBR(c.atualizadoEm) }}</span>
              </span>
              <span class="badge" :class="STATUS_CHAMADO[c.status].cor">{{ STATUS_CHAMADO[c.status].rotulo }}</span>
            </RouterLink>
          </li>
        </ul>
      </section>

      <section class="card">
        <div class="card-head">
          <div><h2>Contas por setor</h2><p>Quem está ativo em cada setor.</p></div>
          <RouterLink to="/cadastros" class="btn btn-ghost btn-sm">Gerenciar <ArrowRight :size="14" /></RouterLink>
        </div>
        <div v-if="carregando" class="skeleton" style="height: 140px" />
        <div v-else class="rolagem"><table class="tabela mini">
          <thead><tr><th>Setor</th><th>Gestores</th><th>Colaboradores</th><th>Inativos</th></tr></thead>
          <tbody>
            <tr v-for="s in d?.setores || []" :key="s.id" :class="{ apagado: !s.ativo }">
              <td><strong>{{ s.nome }}</strong> <span class="mono tiny muted">{{ s.codigo }}</span></td>
              <td><span :class="{ alerta_txt: s.ativo && !s.gestores }">{{ s.gestores || 'Nenhum' }}</span></td>
              <td>{{ s.colaboradores }}</td>
              <td class="muted">{{ s.inativos }}</td>
            </tr>
          </tbody>
        </table></div>
      </section>
    </div>

    <section class="card mt-16 perfis">
      <div class="card-head"><div><h2>Perfis de acesso</h2><p>O que cada perfil pode fazer no SIGAF.</p></div><ShieldCheck :size="18" class="muted" /></div>
      <div class="grid-3">
        <div v-for="(rotulo, cod) in PERFIS" :key="cod" class="perfil">
          <div class="row"><strong>{{ rotulo }}</strong><span class="spacer" /><span class="badge cinza">{{ numero(u.porPerfil[cod]?.ativos || 0) }} ativos</span></div>
          <span class="small text-2">{{ {
            COLABORADOR: 'Registra as próprias atividades e abre chamados de suporte.',
            GESTOR: 'Cadastra os colaboradores do setor, homologa registros e gera relatórios.',
            ADMINISTRADOR: 'Vocês: cadastram gestores e colaboradores, acompanham as contas e atendem os chamados. Sem acesso aos registros.',
          }[cod] }}</span>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.kpi-link { color: inherit; display: block; }
.kpi-link:hover { text-decoration: none; }
.laranja-txt { color: var(--orange); display: inline-flex; align-items: center; gap: 4px; }
.alerta .btn { flex: none; }
.vazio { padding: 18px 0; }
.colunas { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.colunas > .card { min-width: 0; }
.rolagem { overflow-x: auto; }
@media (max-width: 1100px) { .colunas { grid-template-columns: minmax(0, 1fr); } }

.chamados { list-style: none; margin: 0; padding: 0; }
.chamados li + li { border-top: 1px solid var(--border); }
.chamado { display: flex; align-items: center; gap: 12px; padding: 11px 0; color: var(--text); }
.chamado:hover { text-decoration: none; }
.chamado:hover strong { color: #c4b5fd; }
.chamado .corpo { flex: 1; min-width: 0; }
.prio { width: 4px; align-self: stretch; border-radius: 4px; flex: none; background: var(--surface-3); }
.prio.alta { background: var(--red); }
.prio.media { background: var(--amber); }

.tabela.mini th, .tabela.mini td { padding: 10px 8px; }
.tabela.mini th:first-child, .tabela.mini td:first-child { padding-left: 0; }
.apagado { opacity: .5; }
.alerta_txt { color: var(--orange); font-weight: 600; }

.perfis .grid-3 { gap: 12px; }
.perfil { display: flex; flex-direction: column; gap: 6px; padding: 14px; border: 1px solid var(--border); border-radius: 10px; background: var(--bg-elev); }

@media (max-width: 760px) {
  .tabela.mini th:nth-child(4), .tabela.mini td:nth-child(4) { display: none; }
}
</style>
