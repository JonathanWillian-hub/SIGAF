<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import AppLayout from './components/AppLayout.vue';
import Toasts from './components/Toasts.vue';

const rota = useRoute();
const publica = computed(() => rota.meta.publica);
const pronto = computed(() => rota.matched.length > 0);
</script>

<template>
  <template v-if="pronto">
    <RouterView v-if="publica" />
    <AppLayout v-else>
      <RouterView />
    </AppLayout>
  </template>
  <Toasts />
</template>
