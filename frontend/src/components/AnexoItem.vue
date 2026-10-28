<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { FileText, FileSpreadsheet, Download, ImageOff } from 'lucide-vue-next';
import { api } from '../services/api.js';
import { avisar } from '../stores/toast.js';
import { imagem, tamanhoLegivel } from '../utils/anexos.js';

const props = defineProps({ chamadoId: { type: Number, required: true }, anexo: { type: Object, required: true } });
const emit = defineEmits(['ampliar']);

const endereco = computed(() => `/chamados/${props.chamadoId}/anexos/${props.anexo.id}`);
const ehImagem = computed(() => imagem(props.anexo.tipo));
const url = ref('');
const falhou = ref(false);

onMounted(async () => {
  if (!ehImagem.value) return;
  try {
    url.value = URL.createObjectURL(await api.blob(endereco.value));
  } catch {
    falhou.value = true;
  }
});
onBeforeUnmount(() => { if (url.value) URL.revokeObjectURL(url.value); });

async function baixar() {
  try {
    const blob = await api.blob(endereco.value);
    const link = document.createElement('a');
    const temp = URL.createObjectURL(blob);
    link.href = temp;
    link.download = props.anexo.nome;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(temp), 2000);
  } catch (e) {
    avisar(e.message, 'erro');
  }
}
</script>

<template>
  <button v-if="ehImagem" type="button" class="miniatura" :title="anexo.nome" @click="url && emit('ampliar', { url, nome: anexo.nome, baixar })">
    <img v-if="url" :src="url" :alt="anexo.nome" />
    <span v-else-if="falhou" class="vazio"><ImageOff :size="18" /></span>
    <span v-else class="vazio skeleton" />
  </button>
  <button v-else type="button" class="arquivo" :title="`Baixar ${anexo.nome}`" @click="baixar">
    <span class="doc"><component :is="anexo.tipo === 'application/pdf' ? FileText : FileSpreadsheet" :size="18" /></span>
    <span class="info">
      <span class="nome truncate">{{ anexo.nome }}</span>
      <span class="tiny muted">{{ tamanhoLegivel(anexo.tamanho) }}</span>
    </span>
    <Download :size="15" class="muted" />
  </button>
</template>

<style scoped>
.miniatura {
  width: 132px; height: 96px; padding: 0; border-radius: 10px; overflow: hidden; cursor: zoom-in;
  border: 1px solid var(--border-strong); background: var(--bg-elev); transition: transform .15s, border-color .15s;
}
.miniatura:hover { transform: translateY(-1px); border-color: var(--accent); }
.miniatura img { width: 100%; height: 100%; object-fit: cover; display: block; }
.vazio { display: grid; place-items: center; width: 100%; height: 100%; color: var(--muted); }
.arquivo {
  display: flex; align-items: center; gap: 10px; width: 230px; max-width: 100%; padding: 8px 10px; text-align: left;
  border: 1px solid var(--border-strong); border-radius: 10px; background: var(--bg-elev); color: var(--text); cursor: pointer; font: inherit;
}
.arquivo:hover { border-color: var(--accent); }
.doc { width: 34px; height: 34px; border-radius: 8px; display: grid; place-items: center; background: var(--accent-soft); color: #c4b5fd; flex: none; }
.info { display: flex; flex-direction: column; min-width: 0; flex: 1; }
.nome { font-size: 12.5px; }
</style>
