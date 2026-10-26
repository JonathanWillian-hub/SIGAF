<script setup>
import { onMounted, ref } from 'vue';
import { ShieldCheck } from 'lucide-vue-next';
import Paginacao from '../components/Paginacao.vue';
import { api } from '../services/api.js';
import { dataHoraBR, numero } from '../utils/formatos.js';

// RNF06 - Auditabilidade: logs com identificador do usuário, data e hora da ação
const ACOES = {
  CRIACAO: ['Criação', 'verde'], ALTERACAO: ['Alteração', 'azul'], ELIMINACAO: ['Eliminação', 'vermelho'],
  LOGIN: ['Login', 'cinza'], HOMOLOGACAO: ['Homologação', 'roxo'], REJEICAO: ['Rejeição', 'laranja'], RELATORIO: ['Relatório', 'teal'],
};
const logs = ref(null);
const pagina = ref(1);
const acao = ref('');
const aberto = ref(null);

async function carregar(p = 1) {
  pagina.value = p;
  logs.value = await api.get('/auditoria', { pagina: p, porPagina: 15, acao: acao.value });
}
onMounted(carregar);

function detalhes(json) {
  try { return JSON.stringify(JSON.parse(json), null, 2); } catch { return json; }
}
</script>

<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h1>Auditoria</h1>
        <p>Trilha de auditoria de criações, alterações, eliminações, homologações e acessos (RNF06).</p>
      </div>
      <div class="page-actions">
        <select v-model="acao" class="select" style="width: 200px" aria-label="Filtrar por ação" @change="carregar(1)">
          <option value="">Todas as ações</option>
          <option v-for="(a, cod) in ACOES" :key="cod" :value="cod">{{ a[0] }}</option>
        </select>
      </div>
    </div>

    <div class="alerta info mb-16">
      <span class="ico"><ShieldCheck :size="18" /></span>
      <div class="corpo"><strong>Registros imutáveis</strong><span>Os logs são gravados na mesma transação da operação e não podem ser editados pela interface.</span></div>
    </div>

    <div class="tabela-wrap">
      <div class="tabela-scroll">
        <table class="tabela">
          <thead><tr><th>Data e hora</th><th>Usuário</th><th>Ação</th><th>Entidade</th><th>Origem (IP)</th><th>Detalhes</th></tr></thead>
          <tbody>
            <template v-for="l in logs?.itens || []" :key="l.id">
              <tr>
                <td class="nowrap mono small">{{ dataHoraBR(l.dataHora) }}<span class="muted">:{{ l.dataHora.slice(17, 19) }}</span></td>
                <td><div class="stack"><span>{{ l.usuarioNome || 'Sistema' }}</span><span class="tiny muted mono">{{ l.usuarioMatricula ? `Mat. ${l.usuarioMatricula}` : '' }}</span></div></td>
                <td><span class="badge" :class="ACOES[l.acao]?.[1]">{{ ACOES[l.acao]?.[0] || l.acao }}</span></td>
                <td>{{ l.entidade }} <span v-if="l.entidadeId" class="mono muted">#{{ l.entidadeId }}</span></td>
                <td class="mono small muted">{{ l.ip || 'Não informado' }}</td>
                <td><button v-if="l.detalhes" class="btn btn-ghost btn-sm" @click="aberto = aberto === l.id ? null : l.id">{{ aberto === l.id ? 'Ocultar' : 'Ver' }}</button></td>
              </tr>
              <tr v-if="aberto === l.id"><td colspan="6"><pre>{{ detalhes(l.detalhes) }}</pre></td></tr>
            </template>
          </tbody>
        </table>
      </div>
      <div v-if="logs?.total" class="tabela-rodape">
        <span><strong>{{ numero(logs.total) }}</strong> eventos registrados</span>
        <Paginacao :pagina="pagina" :total-paginas="Math.ceil(logs.total / logs.porPagina)" @ir="carregar" />
      </div>
    </div>
  </div>
</template>

<style scoped>
pre { margin: 0; background: var(--bg-elev); border: 1px solid var(--border); border-radius: 8px; padding: 12px; font: 12px var(--mono); color: var(--text-2); overflow: auto; }
</style>
