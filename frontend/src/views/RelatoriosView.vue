<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { FileText, FileSpreadsheet, FileDown, Download, Loader2, Clock, CheckCircle2, AlertTriangle } from 'lucide-vue-next';
import { api } from '../services/api.js';
import { avisar } from '../stores/toast.js';
import { dataBR, dataHoraBR, hojeISO, numero } from '../utils/formatos.js';

const params = ref({ setores: [], profissionais: [], formatos: [] });
const form = reactive({ dataInicioFiltro: hojeISO(-29), dataFimFiltro: hojeISO(), setorId: '', profissionalId: '', formato: 'PDF' });
const erros = ref({});
const gerando = ref(false);
const aviso = ref(null);
const historico = ref([]);
let timer = null;

const ICONE = { PDF: FileText, EXCEL: FileSpreadsheet, CSV: FileDown };
const DESC = { PDF: 'Documento formatado para impressão e prestação de contas', EXCEL: 'Planilha com abas de registros e resumo', CSV: 'Dados brutos para importação em outros sistemas' };

async function carregarHistorico() {
  historico.value = await api.get('/relatorios');
  const processando = historico.value.some((h) => h.status === 'PROCESSANDO');
  clearTimeout(timer);
  if (processando) timer = setTimeout(carregarHistorico, 2500);
}

onMounted(async () => {
  params.value = await api.get('/relatorios/parametros');
  carregarHistorico();
});
onBeforeUnmount(() => clearTimeout(timer));

function atalho(dias) {
  form.dataInicioFiltro = hojeISO(-(dias - 1));
  form.dataFimFiltro = hojeISO();
}

async function gerar() {
  erros.value = {};
  aviso.value = null;
  if (!form.dataInicioFiltro) erros.value.dataInicioFiltro = 'Informe a data inicial.';
  if (!form.dataFimFiltro) erros.value.dataFimFiltro = 'Informe a data final.';
  if (form.dataInicioFiltro && form.dataFimFiltro && form.dataFimFiltro < form.dataInicioFiltro) erros.value.dataFimFiltro = 'A data final não pode ser anterior à inicial.';
  if (Object.keys(erros.value).length) return;

  gerando.value = true;
  try {
    const r = await api.post('/relatorios', { ...form });
    if (r.assincrono) {
      aviso.value = { tipo: 'info', titulo: 'Relatório em processamento', texto: r.mensagem };
    } else {
      const nome = await api.baixar(r.relatorio.arquivoUrl);
      aviso.value = { tipo: 'sucesso', titulo: 'Relatório gerado com sucesso', texto: `${numero(r.relatorio.totalRegistros)} registros consolidados. Download iniciado (${nome}).` };
      avisar('Relatório gerado e baixado.');
    }
    carregarHistorico();
  } catch (e) {
    erros.value = e.campos || {};
    aviso.value = { tipo: 'erro', titulo: 'Não foi possível gerar', texto: e.message };
  } finally {
    gerando.value = false;
  }
}

async function baixar(h) {
  try { await api.baixar(h.arquivoUrl); } catch (e) { avisar(e.message, 'erro'); }
}

const profissionaisFiltrados = computed(() => params.value.profissionais);
</script>

<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h1>Relatórios</h1>
        <p>Prestação de contas: consolide as atividades por período, setor e profissional e exporte em PDF, Excel ou CSV.</p>
      </div>
    </div>

    <div class="layout">
      <form class="card" novalidate @submit.prevent="gerar">
        <div class="card-head"><div><h2>Parâmetros de emissão</h2><p>Período de início e fim, setor e profissional específico.</p></div></div>

        <div class="atalhos">
          <button v-for="n in [7, 30, 90]" :key="n" type="button" class="btn btn-sm" @click="atalho(n)">Últimos {{ n }} dias</button>
        </div>

        <div class="grade">
          <div class="campo" :class="{ erro: erros.dataInicioFiltro }">
            <label for="r-ini">Início do período<span class="req">*</span></label>
            <input id="r-ini" v-model="form.dataInicioFiltro" type="date" class="input" />
            <span v-if="erros.dataInicioFiltro" class="msg-erro">{{ erros.dataInicioFiltro }}</span>
          </div>
          <div class="campo" :class="{ erro: erros.dataFimFiltro }">
            <label for="r-fim">Fim do período<span class="req">*</span></label>
            <input id="r-fim" v-model="form.dataFimFiltro" type="date" class="input" />
            <span v-if="erros.dataFimFiltro" class="msg-erro">{{ erros.dataFimFiltro }}</span>
          </div>
          <div class="campo">
            <label for="r-setor">Setor</label>
            <select id="r-setor" v-model="form.setorId" class="select">
              <option value="">{{ params.setores.length === 1 ? 'Minha equipe' : 'Todos os setores' }}</option>
              <option v-for="s in params.setores" :key="s.id" :value="s.id">{{ s.nome }}</option>
            </select>
          </div>
          <div class="campo">
            <label for="r-prof">Profissional</label>
            <select id="r-prof" v-model="form.profissionalId" class="select">
              <option value="">Todos os profissionais</option>
              <option v-for="p in profissionaisFiltrados" :key="p.id" :value="p.id">{{ p.nome }} (Mat. {{ p.matricula }})</option>
            </select>
          </div>
        </div>

        <fieldset class="formatos">
          <legend>Formato de saída</legend>
          <label v-for="f in params.formatos" :key="f.codigo" class="formato" :class="{ sel: form.formato === f.codigo }">
            <input v-model="form.formato" type="radio" name="formato" :value="f.codigo" class="sr" />
            <component :is="ICONE[f.codigo]" :size="22" />
            <span><strong>{{ f.rotulo }}</strong><small>{{ DESC[f.codigo] }}</small></span>
          </label>
        </fieldset>

        <div v-if="aviso" class="alerta mt-16" :class="aviso.tipo" role="status">
          <span class="ico"><Clock v-if="aviso.tipo === 'info'" :size="18" /><CheckCircle2 v-else-if="aviso.tipo === 'sucesso'" :size="18" /><AlertTriangle v-else :size="18" /></span>
          <div class="corpo"><strong>{{ aviso.titulo }}</strong><span>{{ aviso.texto }}</span></div>
        </div>

        <div class="rodape">
          <button class="btn btn-primary" :disabled="gerando">
            <Loader2 v-if="gerando" :size="16" class="gira" /><Download v-else :size="16" />
            {{ gerando ? 'Gerando…' : 'Gerar relatório' }}
          </button>
        </div>
      </form>

      <section class="tabela-wrap">
        <div class="hist-head"><h2>Relatórios gerados</h2><span class="muted small">Atualiza automaticamente</span></div>
        <div class="tabela-scroll">
          <table class="tabela tabela-cartoes">
            <thead><tr><th>#</th><th>Período / filtros</th><th>Registros</th><th>Status</th><th class="dir">Arquivo</th></tr></thead>
            <tbody>
              <tr v-for="h in historico" :key="h.id">
                <td class="mono muted c-oculta">{{ h.id }}</td>
                <td class="c-esq">
                  <div class="nowrap">{{ dataBR(h.dataInicioFiltro) }} a {{ dataBR(h.dataFimFiltro) }}</div>
                  <div class="tiny muted">{{ h.setorNome || 'Todos os setores' }}, {{ h.profissionalNome || 'todos os profissionais' }}, gerado em {{ dataHoraBR(h.criadoEm) }}</div>
                </td>
                <td class="c-oculta">{{ numero(h.totalRegistros) }}</td>
                <td class="c-canto">
                  <span v-if="h.status === 'CONCLUIDO'" class="badge verde"><span class="dot" />Pronto</span>
                  <span v-else-if="h.status === 'PROCESSANDO'" class="badge laranja"><Loader2 :size="12" class="gira" />Processando</span>
                  <span v-else class="badge vermelho">Erro</span>
                </td>
                <td class="dir">
                  <button class="btn btn-sm" :disabled="h.status !== 'CONCLUIDO'" @click="baixar(h)">
                    <component :is="ICONE[h.formato]" :size="15" /> {{ h.formato === 'EXCEL' ? 'XLSX' : h.formato }}
                  </button>
                </td>
              </tr>
              <tr v-if="!historico.length"><td colspan="5" class="muted">Nenhum relatório gerado ainda.</td></tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.layout { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr); gap: 18px; align-items: start; }
.atalhos { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; }
.grade { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.req { color: var(--red); margin-left: 2px; }
.formatos { border: 0; padding: 0; margin: 18px 0 0; display: flex; flex-direction: column; gap: 8px; }
.formatos legend { font-size: 12.5px; font-weight: 500; color: var(--text-2); margin-bottom: 8px; }
.formato { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border: 1px solid var(--border-strong); border-radius: 10px; cursor: pointer; background: var(--bg-elev); }
.formato svg { color: var(--muted); flex: none; }
.formato span { display: flex; flex-direction: column; }
.formato small { color: var(--muted); font-size: 12px; }
.formato.sel { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
.formato.sel svg { color: #c4b5fd; }
.sr { position: absolute; opacity: 0; pointer-events: none; }
.rodape { display: flex; justify-content: flex-end; margin-top: 18px; padding-top: 16px; border-top: 1px solid var(--border); }
.hist-head { display: flex; align-items: center; justify-content: space-between; padding: 16px; border-bottom: 1px solid var(--border); }
.dir { text-align: right; }
.gira { animation: gira 1s linear infinite; }
@keyframes gira { to { transform: rotate(360deg); } }
@media (max-width: 1100px) { .layout { grid-template-columns: 1fr; } }
@media (max-width: 560px) { .grade { grid-template-columns: 1fr; } .rodape .btn { flex: 1; } }
</style>
