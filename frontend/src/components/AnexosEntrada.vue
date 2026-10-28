<script setup>
import { computed, ref } from 'vue';
import { Paperclip, X, FileText, FileSpreadsheet, Loader2 } from 'lucide-vue-next';
import { ACCEPT, MAX_ARQUIVOS, MAX_TOTAL, prepararAnexo, tamanhoLegivel } from '../utils/anexos.js';
import { avisar } from '../stores/toast.js';

const anexos = defineModel({ type: Array, default: () => [] });
const seletor = ref(null);
const preparando = ref(0);

const total = computed(() => anexos.value.reduce((s, a) => s + a.tamanho, 0));

async function adicionar(arquivos) {
  for (const arquivo of arquivos) {
    if (anexos.value.length + preparando.value >= MAX_ARQUIVOS) {
      avisar(`Envie no máximo ${MAX_ARQUIVOS} arquivos por mensagem.`, 'erro');
      break;
    }
    preparando.value += 1;
    try {
      const anexo = await prepararAnexo(arquivo);
      if (total.value + anexo.tamanho > MAX_TOTAL) throw new Error('Os arquivos passam de 3,5 MB juntos. Envie o restante em outra mensagem.');
      anexos.value = [...anexos.value, anexo];
    } catch (e) {
      avisar(e.message, 'erro');
    } finally {
      preparando.value -= 1;
    }
  }
}

function escolher(evento) {
  adicionar([...(evento.target.files || [])]);
  evento.target.value = '';
}

function colar(evento) {
  const arquivos = [...(evento.clipboardData?.items || [])]
    .filter((i) => i.kind === 'file')
    .map((i) => i.getAsFile())
    .filter(Boolean);
  if (!arquivos.length) return;
  evento.preventDefault();
  adicionar(arquivos);
}

function soltar(evento) {
  adicionar([...(evento.dataTransfer?.files || [])]);
}

function remover(i) {
  anexos.value = anexos.value.filter((_, idx) => idx !== i);
}

defineExpose({ colar, soltar, abrir: () => seletor.value?.click() });
</script>

<template>
  <div class="anexos-entrada">
    <div v-if="anexos.length || preparando" class="lista">
      <div v-for="(a, i) in anexos" :key="i" class="item" :title="a.nome">
        <img v-if="a.previa" :src="a.previa" alt="" />
        <span v-else class="doc"><component :is="a.tipo === 'application/pdf' ? FileText : FileSpreadsheet" :size="20" /></span>
        <span class="info">
          <span class="nome truncate">{{ a.nome }}</span>
          <span class="tiny muted">{{ tamanhoLegivel(a.tamanho) }}</span>
        </span>
        <button type="button" class="tirar" :aria-label="`Remover ${a.nome}`" @click="remover(i)"><X :size="14" /></button>
      </div>
      <div v-if="preparando" class="item carregando"><Loader2 :size="18" class="gira" /><span class="small muted">Preparando...</span></div>
    </div>
    <button type="button" class="btn btn-ghost btn-sm anexar" :disabled="anexos.length >= MAX_ARQUIVOS" @click="seletor.click()">
      <Paperclip :size="15" /> Anexar print ou arquivo
    </button>
    <input ref="seletor" type="file" :accept="ACCEPT" multiple hidden @change="escolher" />
  </div>
</template>

<style scoped>
.anexos-entrada { display: flex; flex-direction: column; gap: 8px; align-items: flex-start; }
.lista { display: flex; flex-wrap: wrap; gap: 8px; width: 100%; }
.item {
  position: relative; display: flex; align-items: center; gap: 8px; width: 200px; max-width: 100%; padding: 6px 30px 6px 6px;
  border: 1px solid var(--border-strong); border-radius: 10px; background: var(--bg-elev);
}
.item img { width: 40px; height: 40px; object-fit: cover; border-radius: 6px; flex: none; }
.doc { width: 40px; height: 40px; border-radius: 6px; display: grid; place-items: center; background: var(--accent-soft); color: #c4b5fd; flex: none; }
.info { display: flex; flex-direction: column; min-width: 0; }
.nome { font-size: 12.5px; }
.tirar {
  position: absolute; top: 6px; right: 6px; width: 20px; height: 20px; border-radius: 50%; border: 0; display: grid; place-items: center;
  background: var(--surface-3); color: var(--text-2); cursor: pointer;
}
.tirar:hover { background: var(--red-soft); color: var(--red); }
.carregando { justify-content: center; padding-right: 10px; }
.gira { animation: girar 1s linear infinite; color: var(--accent); }
@keyframes girar { to { transform: rotate(360deg); } }
.anexar { padding-left: 6px; }
</style>
