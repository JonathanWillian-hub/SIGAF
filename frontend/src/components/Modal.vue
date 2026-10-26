<script setup>
import { onBeforeUnmount, onMounted } from 'vue';
import { X } from 'lucide-vue-next';

const props = defineProps({ titulo: String, largura: { type: String, default: '560px' } });
const emit = defineEmits(['fechar']);
const esc = (e) => { if (e.key === 'Escape') emit('fechar'); };
onMounted(() => document.addEventListener('keydown', esc));
onBeforeUnmount(() => document.removeEventListener('keydown', esc));
void props;
</script>

<template>
  <Teleport to="body">
    <div class="fundo" @mousedown.self="emit('fechar')">
      <div class="modal" role="dialog" aria-modal="true" :aria-label="titulo" :style="{ maxWidth: largura }">
        <header>
          <h2>{{ titulo }}</h2>
          <button class="btn btn-ghost btn-icon" aria-label="Fechar" @click="emit('fechar')"><X :size="18" /></button>
        </header>
        <div class="corpo"><slot /></div>
        <footer v-if="$slots.rodape"><slot name="rodape" /></footer>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.fundo { position: fixed; inset: 0; background: rgba(0,0,0,.6); backdrop-filter: blur(3px); display: grid; place-items: center; padding: 16px; z-index: 60; }
.modal { width: 100%; max-height: calc(100vh - 32px); overflow: auto; background: var(--surface); border: 1px solid var(--border-strong); border-radius: 14px; box-shadow: 0 30px 80px rgba(0,0,0,.6); }
header { display: flex; align-items: center; justify-content: space-between; padding: 16px 18px; border-bottom: 1px solid var(--border); position: sticky; top: 0; background: var(--surface); }
.corpo { padding: 18px; }
footer { display: flex; justify-content: flex-end; gap: 10px; padding: 14px 18px; border-top: 1px solid var(--border); }
</style>
