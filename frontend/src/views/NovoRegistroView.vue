<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  Zap, RefreshCcw, CalendarClock, Users, ArrowRight, ArrowLeft, Save, X, AlertTriangle, CheckCircle2, Plus, List,
} from 'lucide-vue-next';
import { api } from '../services/api.js';
import { avisar } from '../stores/toast.js';
import { RegistroAtividade } from '../domain/RegistroAtividade.js';
import { hojeISO, duracao } from '../utils/formatos.js';

// RF01 - Registro de Atividades e Substituições  |  RF02 - Detalhamento da Atividade Realizada
const rota = useRoute();
const router = useRouter();
const editando = computed(() => Boolean(rota.params.id));

const ICONES = { ATIVIDADE_EXTRAORDINARIA: Zap, SUBSTITUICAO: RefreshCcw, COBERTURA_HORARIO: CalendarClock, APOIO_OPERACIONAL: Users };

const etapa = ref(1); // 1 = categoria (RF01), 2 = formulário (RF02), 3 = sucesso
const categorias = ref([]);
const categoriaEscolhida = ref(null);
const formulario = ref(null); // configuração devolvida pelo Sistema de Apontamentos
const registro = reactive(new RegistroAtividade());
const erros = ref({});
const alertaHorario = ref('');
const mensagemErro = ref('');
const salvando = ref(false);
const carregando = ref(true);
const salvo = ref(null);

// Passos 1-7: acessa o módulo -> verifica autenticação/permissão -> exibe opções de categoria
onMounted(async () => {
  try {
    categorias.value = await api.get('/apontamentos/categorias');
    if (editando.value) {
      const atual = await api.get(`/registros/${rota.params.id}`);
      Object.assign(registro, new RegistroAtividade(atual));
      categoriaEscolhida.value = atual.categoria;
      await avancar();
    }
  } catch (e) {
    mensagemErro.value = e.message;
  } finally {
    carregando.value = false;
  }
});

// Passos 8-10: escolhe categoria e avança -> sistema habilita o formulário correspondente
async function avancar() {
  if (!categoriaEscolhida.value) return;
  carregando.value = true;
  try {
    formulario.value = await api.get('/apontamentos/formulario', { categoria: categoriaEscolhida.value });
    registro.categoria = categoriaEscolhida.value;
    if (!editando.value) {
      if (!registro.executorId) registro.executorId = formulario.value.padrao.executorId;
      if (!registro.setorId && formulario.value.padrao.setorId) registro.setorId = formulario.value.padrao.setorId;
      if (!registro.data) registro.data = hojeISO();
    }
    etapa.value = 2;
  } catch (e) {
    avisar(e.message, 'erro');
  } finally {
    carregando.value = false;
  }
}

// A1 - Cancelamento: descarta os dados preenchidos e retorna à tela anterior
function cancelar() {
  registro.cancelar();
  erros.value = {};
  avisar('Operação cancelada. Os dados preenchidos foram descartados.', 'info');
  if (window.history.state?.back) router.back();
  else router.push('/');
}

const minutos = computed(() => {
  if (!registro.horarioInicio || !registro.horarioFim || !registro.validarHorarios()) return 0;
  const [h1, m1] = registro.horarioInicio.split(':').map(Number);
  const [h2, m2] = registro.horarioFim.split(':').map(Number);
  return h2 * 60 + m2 - (h1 * 60 + m1);
});

// RF02 passos 2-4: revisa, confirma ("Salvar"), valida e persiste
async function salvar() {
  mensagemErro.value = '';
  alertaHorario.value = '';
  erros.value = registro.validar();
  if (erros.value.horarioFim?.startsWith('O horário de fim')) {
    alertaHorario.value = 'O horário de fim é anterior ao horário de início. Corrija os horários para continuar.';
  }
  if (Object.keys(erros.value).length) {
    if (!alertaHorario.value) mensagemErro.value = 'Preencha os campos obrigatórios destacados em vermelho.';
    return; // A1 - impede a submissão
  }
  salvando.value = true;
  try {
    const corpo = registro.paraEnvio();
    const resp = editando.value
      ? await api.put(`/registros/${rota.params.id}`, corpo)
      : await api.post('/registros', corpo);
    salvo.value = resp.registro;
    avisar(editando.value ? 'Registro atualizado com sucesso' : 'Registro salvo com sucesso');
    etapa.value = 3;
  } catch (e) {
    erros.value = e.campos || {};
    if (e.campos?.horarioFim?.startsWith('O horário de fim')) alertaHorario.value = e.message;
    else mensagemErro.value = e.message;
  } finally {
    salvando.value = false;
  }
}

function novo() {
  registro.cancelar();
  categoriaEscolhida.value = null;
  salvo.value = null;
  etapa.value = 1;
  if (editando.value) router.push('/atividades/nova');
}

const cfg = computed(() => formulario.value?.campos || {});
const op = computed(() => formulario.value?.opcoes || {});
const rotuloCat = computed(() => categorias.value.find((c) => c.codigo === registro.categoria)?.rotulo);
const limpaErro = (campo) => { if (erros.value[campo]) { const e = { ...erros.value }; delete e[campo]; erros.value = e; } };
</script>

<template>
  <div class="page estreita">
    <div class="page-head">
      <div>
        <h1>{{ editando ? 'Editar registro' : 'Novo Registro de Atividade' }}</h1>
        <p>Apontamento de atividades extraordinárias, substituições, coberturas e apoios operacionais</p>
      </div>
    </div>

    <ol class="passos">
      <li :class="{ ativo: etapa === 1, feito: etapa > 1 }"><span>1</span> Categoria</li>
      <li :class="{ ativo: etapa === 2, feito: etapa > 2 }"><span>2</span> Detalhamento</li>
      <li :class="{ ativo: etapa === 3 }"><span>3</span> Confirmação</li>
    </ol>

    <div v-if="mensagemErro && etapa !== 2" class="alerta erro mb-16"><div class="corpo"><span>{{ mensagemErro }}</span></div></div>

    <!-- ETAPA 1 - RF01: opções de categoria -->
    <section v-if="etapa === 1" class="card">
      <div class="card-head"><div><h2>Qual tipo de atividade você quer registrar?</h2><p>Selecione a categoria e avance para preencher os detalhes.</p></div></div>
      <div v-if="carregando" class="skeleton" style="height: 180px" />
      <div v-else class="cats" role="radiogroup" aria-label="Categoria da atividade">
        <button v-for="c in categorias" :key="c.codigo" type="button" class="cat" :class="{ sel: categoriaEscolhida === c.codigo }"
          role="radio" :aria-checked="categoriaEscolhida === c.codigo" @click="categoriaEscolhida = c.codigo" @dblclick="avancar">
          <span class="ico"><component :is="ICONES[c.codigo]" :size="20" /></span>
          <strong>{{ c.rotulo }}</strong>
          <span class="muted small">{{ c.descricao }}</span>
        </button>
      </div>
      <div class="rodape">
        <button class="btn btn-ghost" @click="cancelar"><X :size="16" /> Cancelar</button>
        <button class="btn btn-primary" :disabled="!categoriaEscolhida || carregando" @click="avancar">Avançar <ArrowRight :size="16" /></button>
      </div>
    </section>

    <!-- ETAPA 2 - RF02: formulário correspondente à categoria -->
    <form v-else-if="etapa === 2" class="card" novalidate @submit.prevent="salvar">
      <div class="card-head">
        <div><h2>{{ rotuloCat }}</h2><p>Campos marcados com <span class="req">*</span> são obrigatórios.</p></div>
        <button type="button" class="btn btn-sm" @click="etapa = 1"><ArrowLeft :size="14" /> Trocar categoria</button>
      </div>

      <div v-if="alertaHorario" class="alerta erro mb-16" role="alert">
        <span class="ico"><AlertTriangle :size="18" /></span>
        <div class="corpo"><strong>Inconsistência de horário</strong><span>{{ alertaHorario }}</span></div>
      </div>
      <div v-else-if="mensagemErro" class="alerta erro mb-16" role="alert">
        <span class="ico"><AlertTriangle :size="18" /></span>
        <div class="corpo"><strong>Não foi possível salvar</strong><span>{{ mensagemErro }}</span></div>
      </div>

      <div class="grade">
        <div class="campo" :class="{ erro: erros.executorId }">
          <label for="executor">Executor (quem realizou)<span class="req">*</span></label>
          <select id="executor" v-model="registro.executorId" class="select" :disabled="cfg.executorId?.travado" @change="limpaErro('executorId')">
            <option value="">Selecione…</option>
            <option v-for="u in op.executores" :key="u.id" :value="u.id">{{ u.nome }} (Mat. {{ u.matricula }})</option>
          </select>
          <span v-if="erros.executorId" class="msg-erro">{{ erros.executorId }}</span>
          <span v-else-if="cfg.executorId?.travado" class="ajuda">Colaboradores registram apenas atividades próprias.</span>
        </div>

        <div v-if="cfg.substituidoId?.habilitado" class="campo" :class="{ erro: erros.substituidoId }">
          <label for="substituido">Profissional substituído<span class="req">*</span></label>
          <select id="substituido" v-model="registro.substituidoId" class="select" @change="limpaErro('substituidoId')">
            <option value="">Selecione…</option>
            <option v-for="u in op.profissionais" :key="u.id" :value="u.id" :disabled="String(u.id) === String(registro.executorId)">{{ u.nome }} (Mat. {{ u.matricula }})</option>
          </select>
          <span v-if="erros.substituidoId" class="msg-erro">{{ erros.substituidoId }}</span>
        </div>
        <div v-else class="campo">
          <label>Profissional substituído</label>
          <input class="input" value="Não se aplica a esta categoria" disabled />
        </div>

        <div class="campo" :class="{ erro: erros.data }">
          <label for="data">Data<span class="req">*</span></label>
          <input id="data" v-model="registro.data" type="date" class="input" @input="limpaErro('data')" />
          <span v-if="erros.data" class="msg-erro">{{ erros.data }}</span>
        </div>

        <div class="horarios">
          <div class="campo" :class="{ erro: erros.horarioInicio }">
            <label for="ini">Horário de início<span class="req">*</span></label>
            <input id="ini" v-model="registro.horarioInicio" type="time" class="input" @input="limpaErro('horarioInicio'); alertaHorario = ''" />
            <span v-if="erros.horarioInicio" class="msg-erro">{{ erros.horarioInicio }}</span>
          </div>
          <div class="campo" :class="{ erro: erros.horarioFim }">
            <label for="fim">Horário de fim<span class="req">*</span></label>
            <input id="fim" v-model="registro.horarioFim" type="time" class="input" @input="limpaErro('horarioFim'); alertaHorario = ''" />
            <span v-if="erros.horarioFim" class="msg-erro">{{ erros.horarioFim }}</span>
            <span v-else-if="minutos" class="ajuda">Duração: {{ duracao(minutos) }}</span>
          </div>
        </div>

        <div class="campo" :class="{ erro: erros.setorId }">
          <label for="setor">Setor<span class="req">*</span></label>
          <select id="setor" v-model="registro.setorId" class="select" @change="limpaErro('setorId')">
            <option value="">Selecione…</option>
            <option v-for="s in op.setores" :key="s.id" :value="s.id">{{ s.nome }}</option>
          </select>
          <span v-if="erros.setorId" class="msg-erro">{{ erros.setorId }}</span>
        </div>

        <div class="campo">
          <label for="disciplina">Disciplina / contexto</label>
          <select id="disciplina" v-model="registro.disciplinaId" class="select">
            <option value="">Não informado</option>
            <option v-for="d in op.disciplinas" :key="d.id" :value="d.id">{{ d.nome }}</option>
          </select>
        </div>

        <div class="campo cheio" :class="{ erro: erros.descricaoTarefas }">
          <label for="tarefas">Descrição das tarefas executadas<span class="req">*</span></label>
          <textarea id="tarefas" v-model="registro.descricaoTarefas" class="textarea" maxlength="2000"
            placeholder="Descreva o que foi feito, entregas e observações relevantes…" @input="limpaErro('descricaoTarefas')" />
          <div class="row">
            <span v-if="erros.descricaoTarefas" class="msg-erro">{{ erros.descricaoTarefas }}</span>
            <span class="spacer" />
            <span class="ajuda">{{ registro.descricaoTarefas.length }}/2000</span>
          </div>
        </div>
      </div>

      <div class="rodape">
        <button type="button" class="btn btn-ghost" @click="cancelar"><X :size="16" /> Cancelar</button>
        <button class="btn btn-primary" :disabled="salvando"><Save :size="16" /> {{ salvando ? 'Salvando…' : 'Salvar' }}</button>
      </div>
    </form>

    <!-- ETAPA 3 - "Registro salvo com sucesso" -->
    <section v-else class="card sucesso">
      <CheckCircle2 :size="46" />
      <h2>{{ editando ? 'Registro atualizado com sucesso' : 'Registro salvo com sucesso' }}</h2>
      <p class="muted">Registro #{{ salvo?.id }} ({{ rotuloCat }}) enviado para homologação do gestor.</p>
      <div class="row">
        <button class="btn" @click="router.push({ path: '/atividades', query: { registro: salvo?.id } })"><List :size="16" /> Ver no histórico</button>
        <button class="btn btn-primary" @click="novo"><Plus :size="16" /> Novo registro</button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.estreita { max-width: 980px; }
.passos { list-style: none; display: flex; gap: 8px; padding: 0; margin: 0 0 18px; flex-wrap: wrap; }
.passos li { display: flex; align-items: center; gap: 8px; color: var(--muted); font-size: 13px; padding: 6px 12px 6px 6px; border: 1px solid var(--border); border-radius: 999px; }
.passos li span { width: 22px; height: 22px; border-radius: 50%; display: grid; place-items: center; background: var(--surface-3); font-size: 12px; font-weight: 600; }
.passos li.ativo { color: var(--text); border-color: rgba(167,139,250,.5); }
.passos li.ativo span { background: var(--accent); color: var(--accent-ink); }
.passos li.feito span { background: var(--green-soft); color: var(--green); }
.cats { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }

.cat {
  display: flex; flex-direction: column; align-items: flex-start; gap: 6px; text-align: left; padding: 16px; border-radius: 12px;
  border: 1px solid var(--border-strong); background: var(--bg-elev); color: var(--text); cursor: pointer; font: inherit; transition: all .15s;
}
.cat:hover { border-color: var(--muted); }
.cat.sel { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); background: rgba(167,139,250,.06); }
.cat .ico { width: 38px; height: 38px; border-radius: 10px; display: grid; place-items: center; background: var(--surface-3); color: #c4b5fd; margin-bottom: 4px; }
.cat.sel .ico { background: var(--accent); color: var(--accent-ink); }
.rodape { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--border); }
.grade { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px 18px; }
.horarios { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.cheio { grid-column: 1 / -1; }
.req { color: var(--red); margin-left: 2px; }
.sucesso { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 10px; padding: 44px 20px; }
.sucesso > svg { color: var(--green); }
.sucesso .row { margin-top: 12px; flex-wrap: wrap; justify-content: center; }
@media (max-width: 760px) {
  .cats, .grade { grid-template-columns: 1fr; }
  .rodape .btn { flex: 1; }
}
@media (max-width: 760px) {
  .passos { gap: 6px; flex-wrap: nowrap; margin-bottom: 14px; }
  .passos li { font-size: 12px; padding: 4px 9px 4px 4px; gap: 6px; }
  .passos li span { width: 19px; height: 19px; font-size: 11px; }
  .cat { display: grid; grid-template-columns: 36px 1fr; column-gap: 12px; row-gap: 2px; align-items: center; padding: 12px; }
  .cat .ico { grid-row: span 2; margin: 0; width: 36px; height: 36px; }
  .cat .small { font-size: 12px; }
}</style>
