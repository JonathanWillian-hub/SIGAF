<script setup>
import { onBeforeUnmount, ref, watch } from 'vue';
import { contar } from '../utils/animacoes.js';
import { numero } from '../utils/formatos.js';

const props = defineProps({
  titulo: String,
  valor: [String, Number],
  unidade: String,
  detalhe: String,
  icone: [Object, Function],
  cor: { type: String, default: '' },
  destaque: Boolean,
  carregando: Boolean,
});

const exibido = ref(props.valor);
let anterior = 0;
let animacao = null;

watch(() => [props.valor, props.carregando], ([valor, carregando]) => {
  if (carregando) return;
  const partes = /^(\d{1,3}(?:\.\d{3})+|\d+)(.*)$/s.exec(String(valor ?? ''));
  if (!partes) { exibido.value = valor; return; }
  const alvo = Number(partes[1].replace(/\./g, ''));
  animacao?.kill();
  animacao = contar(anterior, alvo, (v) => { exibido.value = numero(v) + partes[2]; });
  anterior = alvo;
}, { immediate: true });

onBeforeUnmount(() => animacao?.kill());
</script>

<template>
  <div class="kpi" :class="[cor, { destaque }]">
    <div class="topo">
      <span class="titulo">{{ titulo }}</span>
      <span v-if="icone" class="ico"><component :is="icone" :size="17" :stroke-width="1.8" /></span>
    </div>
    <div v-if="carregando" class="skeleton" style="height: 34px; width: 60%; margin: 6px 0" />
    <div v-else class="valor">{{ exibido }}<small v-if="unidade">{{ unidade }}</small></div>
    <div class="detalhe"><slot>{{ detalhe }}</slot></div>
  </div>
</template>

<style scoped>
.kpi {
  position: relative; overflow: hidden; background: linear-gradient(180deg, rgba(255,255,255,.025), transparent 60%), var(--surface);
  border: 1px solid var(--border); border-radius: var(--radius); padding: 18px 18px 16px; min-width: 0;
  transition: border-color .2s, transform .2s;
}
.kpi::before {
  content: ''; position: absolute; inset: -40% -30% auto auto; width: 160px; height: 160px; border-radius: 50%;
  background: radial-gradient(circle, rgba(167,139,250,.10), transparent 70%); pointer-events: none;
}
.kpi:hover { border-color: var(--border-strong); transform: translateY(-2px); }
.valor { font-variant-numeric: tabular-nums; }
.kpi.destaque { border-color: rgba(251,191,36,.45); box-shadow: inset 0 2px 0 var(--amber); }
.topo { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
.titulo { color: var(--text-2); font-size: 13px; }
.ico { width: 32px; height: 32px; border-radius: 8px; border: 1px solid var(--border-strong); display: grid; place-items: center; color: var(--text-2); flex: none; }
.valor { font-size: 30px; font-weight: 700; letter-spacing: -0.02em; margin: 8px 0 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.valor small { font-size: 15px; font-weight: 500; color: var(--muted); margin-left: 6px; }
.detalhe { color: var(--muted); font-size: 12.5px; }
.laranja .valor, .laranja .titulo { color: var(--orange); }
.laranja .ico { color: var(--orange); border-color: rgba(251,191,36,.4); background: var(--amber-soft); }
.vermelho .valor { color: #fca5a5; }
.verde .valor { color: var(--green); }
@media (max-width: 760px) {
  .valor { font-size: 24px; }
  .kpi { padding: 14px; }
  .ico { display: none; }
  .titulo { font-size: 12px; }
}
</style>
