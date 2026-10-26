<script setup>
import { CATEGORIAS, STATUS } from '../utils/formatos.js';

defineProps({ categoria: String, status: String });
</script>

<template>
  <span v-if="categoria" class="badge" :class="CATEGORIAS[categoria]?.cor">{{ CATEGORIAS[categoria]?.rotulo }}</span>
  <span v-else-if="status" class="badge" :class="STATUS[status]?.cor"><span class="dot" />{{ STATUS[status]?.rotulo }}</span>
</template>
