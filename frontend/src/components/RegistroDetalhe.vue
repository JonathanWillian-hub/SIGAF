<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { Pencil, Trash2 } from 'lucide-vue-next';
import Modal from './Modal.vue';
import Badges from './Badges.vue';
import Avatar from './Avatar.vue';
import { api } from '../services/api.js';
import { useAuth } from '../stores/auth.js';
import { avisar } from '../stores/toast.js';
import { CATEGORIAS, dataBR, dataHoraBR, duracao, hora } from '../utils/formatos.js';

// RF03 passos 13.3 a 13.8: solicitar e exibir detalhes completos do registro
const props = defineProps({ id: Number });
const emit = defineEmits(['fechar', 'alterado']);
const auth = useAuth();
const router = useRouter();
const r = ref(null);
const erro = ref('');

onMounted(async () => {
  try { r.value = await api.get(`/registros/${props.id}`); } catch (e) { erro.value = e.message; }
});

const podeEditar = computed(() => {
  if (!r.value) return false;
  if (auth.ehGestao) return true;
  const dono = r.value.executorId === auth.usuario.id || r.value.criadoPorId === auth.usuario.id;
  return dono && r.value.status !== 'HOMOLOGADO';
});

async function excluir() {
  if (!confirm('Excluir este registro? A ação ficará registrada na auditoria.')) return;
  try {
    await api.del(`/registros/${props.id}`);
    avisar('Registro excluído.');
    emit('alterado');
    emit('fechar');
  } catch (e) { avisar(e.message, 'erro'); }
}
</script>

<template>
  <Modal :titulo="r ? `Registro #${r.id}` : 'Detalhes do registro'" largura="640px" @fechar="emit('fechar')">
    <p v-if="erro" class="muted">{{ erro }}</p>
    <div v-else-if="!r" class="skeleton" style="height: 220px" />
    <div v-else class="det">
      <div class="row wrap">
        <Badges :categoria="r.categoria" />
        <Badges :status="r.status" />
        <span class="muted small">Criado em {{ dataHoraBR(r.dataCriacao) }} por {{ r.criadoPorNome }}</span>
      </div>

      <div v-if="r.status === 'REJEITADO'" class="alerta erro">
        <div class="corpo"><strong>Rejeitado por {{ r.homologadoPorNome }}</strong><span>{{ r.justificativa }}</span></div>
      </div>
      <div v-else-if="r.status === 'HOMOLOGADO'" class="alerta sucesso">
        <div class="corpo"><strong>Homologado por {{ r.homologadoPorNome }}</strong><span>em {{ dataHoraBR(r.homologadoEm) }}<template v-if="r.justificativa">. {{ r.justificativa }}</template></span></div>
      </div>

      <dl class="grade">
        <div>
          <dt>Executor</dt>
          <dd class="pessoa"><Avatar :nome="r.executorNome" :tamanho="28" /> <span>{{ r.executorNome }} <small class="mono muted">Mat. {{ r.executorMatricula }}</small></span></dd>
        </div>
        <div>
          <dt>Profissional substituído</dt>
          <dd v-if="r.substituidoNome" class="pessoa"><Avatar :nome="r.substituidoNome" :tamanho="28" /> <span>{{ r.substituidoNome }} <small class="mono muted">Mat. {{ r.substituidoMatricula }}</small></span></dd>
          <dd v-else class="muted">Não se aplica</dd>
        </div>
        <div><dt>Data</dt><dd>{{ dataBR(r.data) }}</dd></div>
        <div><dt>Horário</dt><dd>{{ hora(r.horarioInicio) }} às {{ hora(r.horarioFim) }} <span class="chip-tempo">{{ duracao(r.minutos) }}</span></dd></div>
        <div><dt>Setor</dt><dd>{{ r.setorNome }}</dd></div>
        <div><dt>Disciplina / contexto</dt><dd>{{ r.disciplinaNome || 'Não informado' }}</dd></div>
        <div class="cheio"><dt>Tarefas executadas</dt><dd class="tarefas">{{ r.descricaoTarefas }}</dd></div>
        <div class="cheio"><dt>Categoria</dt><dd>{{ CATEGORIAS[r.categoria]?.completo }}</dd></div>
      </dl>
    </div>

    <template v-if="r && podeEditar" #rodape>
      <button class="btn btn-danger" @click="excluir"><Trash2 :size="16" /> Excluir</button>
      <button class="btn" @click="router.push(`/atividades/${r.id}/editar`)"><Pencil :size="16" /> Editar</button>
    </template>
  </Modal>
</template>

<style scoped>
.det { display: flex; flex-direction: column; gap: 16px; }
.wrap { flex-wrap: wrap; }
.grade { display: grid; grid-template-columns: 1fr 1fr; gap: 16px 20px; margin: 0; }
.grade dt { color: var(--muted); font-size: 12px; margin-bottom: 4px; }
.grade dd { margin: 0; }
.grade .cheio { grid-column: 1 / -1; }
.pessoa { display: flex; align-items: center; gap: 8px; }
.tarefas { background: var(--bg-elev); border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px; white-space: pre-wrap; }
@media (max-width: 560px) { .grade { grid-template-columns: 1fr; } }
</style>
