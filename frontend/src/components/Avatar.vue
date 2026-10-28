<script setup>
import { computed } from 'vue';
import { iniciais } from '../utils/formatos.js';

const props = defineProps({ nome: String, foto: String, tamanho: { type: Number, default: 34 }, redondo: Boolean });
const PALETA = [
  ['rgba(167,139,250,.18)', '#c4b5fd'], ['rgba(251,191,36,.16)', '#fdba74'], ['rgba(94,234,212,.14)', '#5eead4'],
  ['rgba(147,197,253,.16)', '#93c5fd'], ['rgba(244,114,182,.15)', '#f9a8d4'], ['rgba(52,211,153,.14)', '#6ee7b7'],
];
const cor = computed(() => {
  const s = [...String(props.nome || '')].reduce((a, c) => a + c.charCodeAt(0), 0);
  return PALETA[s % PALETA.length];
});
const estilo = computed(() => ({
  width: `${props.tamanho}px`,
  height: `${props.tamanho}px`,
  fontSize: `${Math.max(11, Math.round(props.tamanho * 0.36))}px`,
  borderRadius: props.redondo ? '50%' : `${Math.max(8, Math.round(props.tamanho * 0.24))}px`,
  ...(props.foto ? {} : { background: cor.value[0], color: cor.value[1], borderColor: cor.value[1] + '55' }),
}));
</script>

<template>
  <span class="av" :class="{ comfoto: foto }" :style="estilo">
    <img v-if="foto" :src="foto" :alt="`Foto de ${nome}`" />
    <template v-else>{{ iniciais(nome) }}</template>
  </span>
</template>

<style scoped>
.av { display: inline-grid; place-items: center; border: 1px solid; font-weight: 600; flex: none; overflow: hidden; }
.av.comfoto { border-color: var(--border-strong); background: var(--surface-3); }
.av img { width: 100%; height: 100%; object-fit: cover; display: block; }
</style>
