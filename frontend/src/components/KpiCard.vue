<script setup>
defineProps({
  titulo: String,
  valor: [String, Number],
  unidade: String,
  detalhe: String,
  icone: [Object, Function],
  cor: { type: String, default: '' },
  destaque: Boolean,
  carregando: Boolean,
});
</script>

<template>
  <div class="kpi" :class="[cor, { destaque }]">
    <div class="topo">
      <span class="titulo">{{ titulo }}</span>
      <span v-if="icone" class="ico"><component :is="icone" :size="17" :stroke-width="1.8" /></span>
    </div>
    <div v-if="carregando" class="skeleton" style="height: 34px; width: 60%; margin: 6px 0" />
    <div v-else class="valor">{{ valor }}<small v-if="unidade">{{ unidade }}</small></div>
    <div class="detalhe"><slot>{{ detalhe }}</slot></div>
  </div>
</template>

<style scoped>
.kpi { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 18px 18px 16px; min-width: 0; }
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
