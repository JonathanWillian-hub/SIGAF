<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { Plus, Pencil, Users, Building2, BookOpen } from 'lucide-vue-next';
import Modal from '../components/Modal.vue';
import Avatar from '../components/Avatar.vue';
import { api } from '../services/api.js';
import { avisar } from '../stores/toast.js';
import { PERFIS } from '../utils/formatos.js';

// Manutenção dos cadastros de apoio (Usuário, Setor, Disciplina) — perfil Administrador
const aba = ref('usuarios');
const usuarios = ref([]);
const setores = ref([]);
const disciplinas = ref([]);
const editando = ref(null); // { tipo, dados }
const erros = ref({});
const salvando = ref(false);

async function carregar() {
  [usuarios.value, setores.value, disciplinas.value] = await Promise.all([
    api.get('/cadastros/usuarios'),
    api.get('/cadastros/setores', { todos: 1 }),
    api.get('/cadastros/disciplinas', { todos: 1 }),
  ]);
}
onMounted(carregar);

const VAZIO = {
  usuarios: { nome: '', matricula: '', cpf: '', email: '', perfil: 'COLABORADOR', setorId: '', senha: '', ativo: true },
  setores: { nome: '', codigo: '', ativo: true },
  disciplinas: { nome: '', descricao: '', ativo: true },
};
const form = reactive({});

function abrir(tipo, item = null) {
  erros.value = {};
  Object.keys(form).forEach((k) => delete form[k]);
  Object.assign(form, VAZIO[tipo], item ? { ...item, cpf: '', senha: '' } : {});
  editando.value = { tipo, id: item?.id || null };
}

async function salvar() {
  salvando.value = true;
  erros.value = {};
  const { tipo, id } = editando.value;
  try {
    if (id) await api.put(`/cadastros/${tipo}/${id}`, { ...form });
    else await api.post(`/cadastros/${tipo}`, { ...form });
    avisar(id ? 'Cadastro atualizado com sucesso.' : 'Cadastro criado com sucesso.');
    editando.value = null;
    carregar();
  } catch (e) {
    erros.value = e.campos || {};
    if (!e.campos) avisar(e.message, 'erro');
  } finally {
    salvando.value = false;
  }
}

const titulo = computed(() => {
  if (!editando.value) return '';
  const nomes = { usuarios: 'usuário', setores: 'setor', disciplinas: 'disciplina' };
  return `${editando.value.id ? 'Editar' : 'Novo'} ${nomes[editando.value.tipo]}`;
});
</script>

<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h1>Cadastros</h1>
        <p>Usuários, setores e disciplinas usados nos registros de atividades.</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-primary" @click="abrir(aba)"><Plus :size="17" /> {{ { usuarios: 'Novo usuário', setores: 'Novo setor', disciplinas: 'Nova disciplina' }[aba] }}</button>
      </div>
    </div>

    <div class="segment mb-16" role="tablist">
      <button :class="{ ativo: aba === 'usuarios' }" @click="aba = 'usuarios'"><Users :size="14" /> Usuários ({{ usuarios.length }})</button>
      <button :class="{ ativo: aba === 'setores' }" @click="aba = 'setores'"><Building2 :size="14" /> Setores ({{ setores.length }})</button>
      <button :class="{ ativo: aba === 'disciplinas' }" @click="aba = 'disciplinas'"><BookOpen :size="14" /> Disciplinas ({{ disciplinas.length }})</button>
    </div>

    <div class="tabela-wrap">
      <div class="tabela-scroll">
        <table v-if="aba === 'usuarios'" class="tabela">
          <thead><tr><th>Nome</th><th>Matrícula</th><th>CPF</th><th>E-mail</th><th>Perfil</th><th>Setor</th><th>Situação</th><th /></tr></thead>
          <tbody>
            <tr v-for="u in usuarios" :key="u.id">
              <td><div class="row"><Avatar :nome="u.nome" :tamanho="30" />{{ u.nome }}</div></td>
              <td class="mono">{{ u.matricula }}</td>
              <td class="mono muted" title="Armazenado com criptografia AES-256">{{ u.cpf }}</td>
              <td class="text-2">{{ u.email }}</td>
              <td><span class="badge" :class="{ ADMINISTRADOR: 'roxo', GESTOR: 'azul', COLABORADOR: 'cinza' }[u.perfil]">{{ PERFIS[u.perfil] }}</span></td>
              <td class="text-2">{{ u.setorNome || 'Sem setor' }}</td>
              <td><span class="badge" :class="u.ativo ? 'verde' : 'vermelho'">{{ u.ativo ? 'Ativo' : 'Inativo' }}</span></td>
              <td><button class="btn btn-ghost btn-icon" :aria-label="`Editar ${u.nome}`" @click="abrir('usuarios', u)"><Pencil :size="16" /></button></td>
            </tr>
          </tbody>
        </table>
        <table v-else-if="aba === 'setores'" class="tabela">
          <thead><tr><th>Código</th><th>Nome</th><th>Situação</th><th /></tr></thead>
          <tbody>
            <tr v-for="s in setores" :key="s.id">
              <td class="mono">{{ s.codigo }}</td><td>{{ s.nome }}</td>
              <td><span class="badge" :class="s.ativo ? 'verde' : 'vermelho'">{{ s.ativo ? 'Ativo' : 'Inativo' }}</span></td>
              <td><button class="btn btn-ghost btn-icon" :aria-label="`Editar ${s.nome}`" @click="abrir('setores', s)"><Pencil :size="16" /></button></td>
            </tr>
          </tbody>
        </table>
        <table v-else class="tabela">
          <thead><tr><th>Nome</th><th>Descrição</th><th>Situação</th><th /></tr></thead>
          <tbody>
            <tr v-for="d in disciplinas" :key="d.id">
              <td>{{ d.nome }}</td><td class="text-2">{{ d.descricao || 'Sem descrição' }}</td>
              <td><span class="badge" :class="d.ativo ? 'verde' : 'vermelho'">{{ d.ativo ? 'Ativo' : 'Inativo' }}</span></td>
              <td><button class="btn btn-ghost btn-icon" :aria-label="`Editar ${d.nome}`" @click="abrir('disciplinas', d)"><Pencil :size="16" /></button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <Modal v-if="editando" :titulo="titulo" @fechar="editando = null">
      <form id="form-cad" class="grade" novalidate @submit.prevent="salvar">
        <template v-if="editando.tipo === 'usuarios'">
          <div class="campo cheio" :class="{ erro: erros.nome }"><label for="c-nome">Nome<span class="req">*</span></label><input id="c-nome" v-model="form.nome" class="input" /><span v-if="erros.nome" class="msg-erro">{{ erros.nome }}</span></div>
          <div class="campo" :class="{ erro: erros.matricula }"><label for="c-mat">Matrícula<span class="req">*</span></label><input id="c-mat" v-model="form.matricula" class="input" /><span v-if="erros.matricula" class="msg-erro">{{ erros.matricula }}</span></div>
          <div class="campo" :class="{ erro: erros.cpf }"><label for="c-cpf">CPF<span v-if="!editando.id" class="req">*</span></label><input id="c-cpf" v-model="form.cpf" class="input" :placeholder="editando.id ? 'Manter atual' : '000.000.000-00'" /><span v-if="erros.cpf" class="msg-erro">{{ erros.cpf }}</span></div>
          <div class="campo cheio" :class="{ erro: erros.email }"><label for="c-email">E-mail<span class="req">*</span></label><input id="c-email" v-model="form.email" type="email" class="input" /><span v-if="erros.email" class="msg-erro">{{ erros.email }}</span></div>
          <div class="campo" :class="{ erro: erros.perfil }"><label for="c-perfil">Perfil<span class="req">*</span></label>
            <select id="c-perfil" v-model="form.perfil" class="select"><option v-for="(p, cod) in PERFIS" :key="cod" :value="cod">{{ p }}</option></select></div>
          <div class="campo"><label for="c-setor">Setor (lotação)</label>
            <select id="c-setor" v-model="form.setorId" class="select"><option value="">Sem setor</option><option v-for="s in setores" :key="s.id" :value="s.id">{{ s.nome }}</option></select></div>
          <div class="campo" :class="{ erro: erros.senha }"><label for="c-senha">Senha<span v-if="!editando.id" class="req">*</span></label><input id="c-senha" v-model="form.senha" type="password" class="input" autocomplete="new-password" :placeholder="editando.id ? 'Manter atual' : 'Mínimo 8 caracteres'" /><span v-if="erros.senha" class="msg-erro">{{ erros.senha }}</span></div>
        </template>
        <template v-else-if="editando.tipo === 'setores'">
          <div class="campo cheio" :class="{ erro: erros.nome }"><label for="s-nome">Nome<span class="req">*</span></label><input id="s-nome" v-model="form.nome" class="input" /><span v-if="erros.nome" class="msg-erro">{{ erros.nome }}</span></div>
          <div class="campo" :class="{ erro: erros.codigo }"><label for="s-cod">Código<span class="req">*</span></label><input id="s-cod" v-model="form.codigo" class="input" maxlength="20" /><span v-if="erros.codigo" class="msg-erro">{{ erros.codigo }}</span></div>
        </template>
        <template v-else>
          <div class="campo cheio" :class="{ erro: erros.nome }"><label for="d-nome">Nome<span class="req">*</span></label><input id="d-nome" v-model="form.nome" class="input" /><span v-if="erros.nome" class="msg-erro">{{ erros.nome }}</span></div>
          <div class="campo cheio"><label for="d-desc">Descrição</label><input id="d-desc" v-model="form.descricao" class="input" /></div>
        </template>
        <label v-if="editando.id" class="check cheio"><input v-model="form.ativo" type="checkbox" /> Cadastro ativo</label>
      </form>
      <template #rodape>
        <button class="btn btn-ghost" @click="editando = null">Cancelar</button>
        <button class="btn btn-primary" form="form-cad" :disabled="salvando">{{ salvando ? 'Salvando…' : 'Salvar' }}</button>
      </template>
    </Modal>
  </div>
</template>

<style scoped>
.segment button { display: inline-flex; align-items: center; gap: 6px; }
.grade { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.cheio { grid-column: 1 / -1; }
.req { color: var(--red); margin-left: 2px; }
.check { display: flex; align-items: center; gap: 8px; color: var(--text-2); }
@media (max-width: 560px) { .grade { grid-template-columns: 1fr; } }
</style>
