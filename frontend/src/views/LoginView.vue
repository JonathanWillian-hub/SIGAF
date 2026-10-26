<script setup>
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { LogIn, ShieldCheck, ClipboardList, BarChart3 } from 'lucide-vue-next';
import { useAuth } from '../stores/auth.js';

const auth = useAuth();
const router = useRouter();
const rota = useRoute();

const email = ref('');
const senha = ref('');
const erros = ref({});
const mensagem = ref(rota.query.expirou ? 'Sua sessão expirou. Entre novamente.' : '');
const enviando = ref(false);

const DEMO = [
  { perfil: 'Colaborador', email: 'colaborador@sigaf.com' },
  { perfil: 'Gestor', email: 'gestor@sigaf.com' },
  { perfil: 'Administrador', email: 'admin@sigaf.com' },
];

async function entrar() {
  erros.value = {};
  mensagem.value = '';
  if (!email.value) erros.value.email = 'Informe o e-mail.';
  if (!senha.value) erros.value.senha = 'Informe a senha.';
  if (Object.keys(erros.value).length) return;
  enviando.value = true;
  try {
    await auth.login(email.value, senha.value);
    // RF05 passo 2: após o login, direciona automaticamente para o Painel Central
    router.push(rota.query.voltar || '/');
  } catch (e) {
    mensagem.value = e.message;
    erros.value = e.campos || {};
  } finally {
    enviando.value = false;
  }
}
</script>

<template>
  <div class="tela">
    <section class="lado">
      <div class="marca">
        <span class="logo"><svg viewBox="0 0 64 64" width="24" height="24"><path d="M18 18l14 30 14-30" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" /></svg></span>
        <strong>SIGAF</strong>
      </div>
      <h1>Registro e gestão de atividades funcionais, em um só lugar.</h1>
      <p class="muted">Substituições, coberturas, apoios e atividades extraordinárias registradas de forma padronizada, sem e-mails, mensagens ou anotações soltas.</p>
      <ul>
        <li><ClipboardList :size="18" /> Apontamento rápido com validação dos dados</li>
        <li><ShieldCheck :size="18" /> Homologação pelo gestor e trilha de auditoria</li>
        <li><BarChart3 :size="18" /> Relatórios em PDF e Excel para prestação de contas</li>
      </ul>
      <small class="muted">SAGA SENAI, Análise e Desenvolvimento de Sistemas, 2026.</small>
    </section>

    <section class="form-lado">
      <form class="card form" novalidate @submit.prevent="entrar">
        <h2>Entrar no sistema</h2>
        <p class="muted small">Use seu e-mail corporativo e senha.</p>

        <div v-if="mensagem" class="alerta erro"><div class="corpo"><span>{{ mensagem }}</span></div></div>

        <div class="campo" :class="{ erro: erros.email }">
          <label for="email">E-mail</label>
          <input id="email" v-model="email" class="input" type="email" autocomplete="username" placeholder="nome@empresa.com" />
          <span v-if="erros.email" class="msg-erro">{{ erros.email }}</span>
        </div>
        <div class="campo" :class="{ erro: erros.senha }">
          <label for="senha">Senha</label>
          <input id="senha" v-model="senha" class="input" type="password" autocomplete="current-password" placeholder="••••••••" />
          <span v-if="erros.senha" class="msg-erro">{{ erros.senha }}</span>
        </div>
        <button class="btn btn-primary entrar" :disabled="enviando">
          <LogIn :size="17" /> {{ enviando ? 'Entrando…' : 'Entrar' }}
        </button>

        <div class="demo">
          <span class="muted small">Acessos de demonstração (senha <code>Sigaf@2026</code>):</span>
          <div class="row">
            <button v-for="d in DEMO" :key="d.email" type="button" class="btn btn-sm" @click="email = d.email; senha = ''">{{ d.perfil }}</button>
          </div>
        </div>
      </form>
    </section>
  </div>
</template>

<style scoped>
.tela { min-height: 100vh; display: grid; grid-template-columns: 1.1fr 1fr; }
.lado {
  padding: 56px 64px; display: flex; flex-direction: column; justify-content: center; gap: 20px;
  background: radial-gradient(900px 500px at 0% 0%, rgba(167,139,250,.14), transparent 60%), var(--bg-elev);
  border-right: 1px solid var(--border);
}
.marca { display: flex; align-items: center; gap: 12px; font-size: 18px; }
.logo { width: 42px; height: 42px; border-radius: 11px; background: var(--surface-3); color: #c4b5fd; display: grid; place-items: center; }
.lado h1 { font-size: 34px; line-height: 1.15; max-width: 560px; }
.lado p { max-width: 520px; font-size: 15px; }
.lado ul { list-style: none; padding: 0; margin: 4px 0 10px; display: flex; flex-direction: column; gap: 12px; }
.lado li { display: flex; align-items: center; gap: 10px; color: var(--text-2); }
.lado li svg { color: var(--accent); }
.form-lado { display: grid; place-items: center; padding: 32px 20px; }
.form { width: 100%; max-width: 400px; display: flex; flex-direction: column; gap: 16px; padding: 28px; }
.entrar { height: 42px; margin-top: 4px; }
.demo { border-top: 1px solid var(--border); padding-top: 14px; display: flex; flex-direction: column; gap: 8px; }
.demo .row { flex-wrap: wrap; gap: 6px; }
code { font-family: var(--mono); color: var(--text-2); }
@media (max-width: 900px) {
  .tela { grid-template-columns: 1fr; }
  .lado { padding: 32px 20px 24px; border-right: 0; border-bottom: 1px solid var(--border); }
  .lado h1 { font-size: 24px; }
  .lado ul, .lado small { display: none; }
}
</style>
