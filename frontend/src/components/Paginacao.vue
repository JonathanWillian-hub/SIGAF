<script setup>
import { computed } from 'vue';
import { ChevronLeft, ChevronRight } from 'lucide-vue-next';

const props = defineProps({ pagina: Number, totalPaginas: Number });
const emit = defineEmits(['ir']);

const paginas = computed(() => {
  const t = props.totalPaginas || 1;
  const p = props.pagina || 1;
  const set = new Set([1, t, p - 1, p, p + 1].filter((n) => n >= 1 && n <= t));
  const lista = [...set].sort((a, b) => a - b);
  const out = [];
  lista.forEach((n, i) => {
    if (i && n - lista[i - 1] > 1) out.push('…');
    out.push(n);
  });
  return out;
});
</script>

<template>
  <div class="pag">
    <button class="btn btn-ghost btn-icon" :disabled="pagina <= 1" aria-label="Página anterior" @click="emit('ir', pagina - 1)"><ChevronLeft :size="16" /></button>
    <template v-for="(n, i) in paginas" :key="i">
      <span v-if="n === '…'" class="ret">…</span>
      <button v-else class="num" :class="{ ativo: n === pagina }" @click="emit('ir', n)">{{ n }}</button>
    </template>
    <button class="btn btn-ghost btn-icon" :disabled="pagina >= totalPaginas" aria-label="Próxima página" @click="emit('ir', pagina + 1)"><ChevronRight :size="16" /></button>
  </div>
</template>

<style scoped>
.pag { display: flex; align-items: center; gap: 4px; }
.num { min-width: 32px; height: 32px; border-radius: 8px; border: 1px solid transparent; background: transparent; color: var(--text-2); cursor: pointer; font: 500 13px var(--font); }
.num:hover { background: var(--surface-2); }
.num.ativo { background: var(--accent); color: var(--accent-ink); font-weight: 700; }
.ret { color: var(--muted); padding: 0 4px; }
</style>
