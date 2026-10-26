<script setup>
import { computed } from 'vue';
import { iniciais } from '../utils/formatos.js';

const props = defineProps({ nome: String, tamanho: { type: Number, default: 34 } });
const PALETA = [
  ['rgba(167,139,250,.18)', '#c4b5fd'], ['rgba(251,191,36,.16)', '#fdba74'], ['rgba(94,234,212,.14)', '#5eead4'],
  ['rgba(147,197,253,.16)', '#93c5fd'], ['rgba(244,114,182,.15)', '#f9a8d4'], ['rgba(52,211,153,.14)', '#6ee7b7'],
];
const cor = computed(() => {
  const s = [...String(props.nome || '')].reduce((a, c) => a + c.charCodeAt(0), 0);
  return PALETA[s % PALETA.length];
});
</script>

<template>
  <span class="av" :style="{ width: `${tamanho}px`, height: `${tamanho}px`, background: cor[0], color: cor[1], borderColor: cor[1] + '55' }">
    {{ iniciais(nome) }}
  </span>
</template>

<style scoped>
.av { display: inline-grid; place-items: center; border-radius: 8px; border: 1px solid; font-size: 12px; font-weight: 600; flex: none; }
</style>
