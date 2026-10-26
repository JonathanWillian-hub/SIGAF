<script setup>
import { CheckCircle2, AlertTriangle, Info } from 'lucide-vue-next';
import { toasts } from '../stores/toast.js';
</script>

<template>
  <div class="toasts" aria-live="polite">
    <TransitionGroup name="toast">
      <div v-for="t in toasts" :key="t.id" class="toast" :class="t.tipo" role="status">
        <CheckCircle2 v-if="t.tipo === 'sucesso'" :size="18" />
        <AlertTriangle v-else-if="t.tipo === 'erro'" :size="18" />
        <Info v-else :size="18" />
        <span>{{ t.mensagem }}</span>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toasts { position: fixed; right: 20px; bottom: 20px; display: flex; flex-direction: column; gap: 10px; z-index: 100; max-width: min(420px, calc(100vw - 32px)); }
.toast {
  display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-radius: 10px;
  background: var(--surface-2); border: 1px solid var(--border-strong); box-shadow: 0 10px 30px rgba(0,0,0,.4); font-weight: 500;
}
.toast.sucesso { border-color: rgba(52,211,153,.45); color: var(--green); }
.toast.sucesso span { color: var(--text); }
.toast.erro { border-color: rgba(248,113,113,.5); color: var(--red); }
.toast.erro span { color: var(--text); }
.toast.info { color: var(--blue); }
.toast.info span { color: var(--text); }
.toast-enter-active, .toast-leave-active { transition: all .25s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(10px); }
@media (max-width: 760px) { .toasts { bottom: 84px; right: 16px; left: 16px; max-width: none; } }
</style>
