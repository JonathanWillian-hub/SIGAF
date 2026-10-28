<script setup>
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Eye, EyeOff, LogIn, Mail, Lock } from 'lucide-vue-next';
import { useAuth } from '../stores/auth.js';

const auth = useAuth();
const router = useRouter();
const rota = useRoute();

const email = ref('');
const senha = ref('');
const verSenha = ref(false);
const erros = ref({});
const mensagem = ref(rota.query.expirou ? 'Sua sessão expirou. Entre novamente.' : '');
const enviando = ref(false);
const ajudaSenha = ref(false);

const DEMO = [
  { perfil: 'Colaborador', email: 'colaborador@sigaf.com' },
  { perfil: 'Gestor', email: 'gestor@sigaf.com' },
  { perfil: 'Administrador', email: 'admin@sigaf.com' },
];

function usarDemo(d) {
  email.value = d.email;
  erros.value = {};
  document.getElementById('senha')?.focus();
}

async function entrar() {
  erros.value = {};
  mensagem.value = '';
  if (!email.value) erros.value.email = 'Informe o e-mail.';
  if (!senha.value) erros.value.senha = 'Informe a senha.';
  if (Object.keys(erros.value).length) return;
  enviando.value = true;
  try {
    await auth.login(email.value, senha.value);
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
    <span class="brilho b1" aria-hidden="true" />
    <span class="brilho b2" aria-hidden="true" />

    <div class="cartao">
      <section class="apresentacao">
        <div class="marca-clara">
          <svg viewBox="0 0 64 64" width="18" height="18" aria-hidden="true"><path d="M18 18l14 30 14-30" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" /></svg>
          SIGAF
        </div>
        <h1>Registre e acompanhe atividades funcionais em um só lugar</h1>
        <p>Substituições, coberturas e apoios com homologação do gestor e relatórios para prestação de contas.</p>

        <svg class="ilustracao" viewBox="0 0 360 250" role="img" aria-label="Ilustração de registros de atividades">
          <defs>
            <linearGradient id="lg-papel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff" /><stop offset="1" stop-color="#ede9fe" /></linearGradient>
            <filter id="sombra" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="10" stdDeviation="10" flood-color="#2e1065" flood-opacity=".35" /></filter>
          </defs>
          <ellipse cx="180" cy="232" rx="140" ry="12" fill="#2e1065" opacity=".25" />
          <g filter="url(#sombra)">
            <rect x="96" y="28" width="150" height="196" rx="16" fill="#4c1d95" />
            <rect x="106" y="40" width="130" height="176" rx="10" fill="url(#lg-papel)" />
            <rect x="141" y="20" width="60" height="22" rx="8" fill="#c4b5fd" />
            <rect x="153" y="26" width="36" height="8" rx="4" fill="#4c1d95" opacity=".5" />
          </g>
          <g>
            <circle cx="126" cy="72" r="8" fill="#a78bfa" /><path d="M122 72l3 3 6-6" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round" />
            <rect x="142" y="66" width="74" height="6" rx="3" fill="#c4b5fd" /><rect x="142" y="76" width="48" height="5" rx="2.5" fill="#ddd6fe" />
            <circle cx="126" cy="108" r="8" fill="#a78bfa" /><path d="M122 108l3 3 6-6" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round" />
            <rect x="142" y="102" width="64" height="6" rx="3" fill="#c4b5fd" /><rect x="142" y="112" width="56" height="5" rx="2.5" fill="#ddd6fe" />
            <circle cx="126" cy="144" r="8" fill="none" stroke="#c4b5fd" stroke-width="2.4" />
            <rect x="142" y="138" width="70" height="6" rx="3" fill="#ddd6fe" /><rect x="142" y="148" width="40" height="5" rx="2.5" fill="#ede9fe" />
            <rect x="118" y="176" width="106" height="24" rx="8" fill="#ede9fe" />
            <rect x="128" y="185" width="52" height="6" rx="3" fill="#a78bfa" />
          </g>
          <g filter="url(#sombra)" transform="translate(236 58) rotate(6)">
            <rect width="92" height="84" rx="14" fill="#ffffff" />
            <rect width="92" height="24" rx="14" fill="#fbbf24" /><rect y="12" width="92" height="12" fill="#fbbf24" />
            <g fill="#ddd6fe">
              <rect x="12" y="34" width="12" height="10" rx="3" /><rect x="30" y="34" width="12" height="10" rx="3" /><rect x="48" y="34" width="12" height="10" rx="3" /><rect x="66" y="34" width="12" height="10" rx="3" />
              <rect x="12" y="50" width="12" height="10" rx="3" /><rect x="30" y="50" width="12" height="10" rx="3" /><rect x="66" y="50" width="12" height="10" rx="3" />
              <rect x="12" y="66" width="12" height="10" rx="3" /><rect x="30" y="66" width="12" height="10" rx="3" />
            </g>
            <rect x="48" y="50" width="12" height="10" rx="3" fill="#8b5cf6" />
          </g>
          <g filter="url(#sombra)" transform="translate(40 120)">
            <circle cx="34" cy="34" r="34" fill="#ffffff" />
            <circle cx="34" cy="34" r="26" fill="none" stroke="#ede9fe" stroke-width="6" />
            <path d="M34 34 A26 26 0 0 1 58 24" fill="none" stroke="#a78bfa" stroke-width="6" stroke-linecap="round" />
            <path d="M34 20v14l9 6" stroke="#4c1d95" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round" />
          </g>
          <g filter="url(#sombra)" transform="translate(240 160)">
            <rect width="96" height="34" rx="17" fill="#ffffff" />
            <circle cx="18" cy="17" r="11" fill="#34d399" /><path d="M13 17l4 4 7-7" stroke="#fff" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round" />
            <rect x="36" y="11" width="46" height="5" rx="2.5" fill="#a7f3d0" /><rect x="36" y="20" width="32" height="4" rx="2" fill="#d1fae5" />
          </g>
        </svg>
      </section>

      <section class="formulario">
        <form novalidate @submit.prevent="entrar">
          <div class="marca">
            <span class="logo"><svg viewBox="0 0 64 64" width="20" height="20" aria-hidden="true"><path d="M18 18l14 30 14-30" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" /></svg></span>
            <strong>SIGAF</strong>
          </div>
          <h2>Bem-vindo de volta</h2>
          <p class="sub">Entre com seu e-mail corporativo para continuar</p>

          <div v-if="mensagem" class="alerta erro" role="alert"><div class="corpo"><span>{{ mensagem }}</span></div></div>

          <div class="campo" :class="{ erro: erros.email }">
            <label for="email" class="sr-only">E-mail</label>
            <div class="com-icone">
              <Mail :size="17" />
              <input id="email" v-model="email" class="input" type="email" autocomplete="username" placeholder="E-mail" />
            </div>
            <span v-if="erros.email" class="msg-erro">{{ erros.email }}</span>
          </div>

          <div class="campo" :class="{ erro: erros.senha }">
            <label for="senha" class="sr-only">Senha</label>
            <div class="com-icone">
              <Lock :size="17" />
              <input id="senha" v-model="senha" class="input" :type="verSenha ? 'text' : 'password'" autocomplete="current-password" placeholder="Senha" />
              <button type="button" class="olho" :aria-label="verSenha ? 'Ocultar senha' : 'Mostrar senha'" @click="verSenha = !verSenha">
                <EyeOff v-if="verSenha" :size="17" /><Eye v-else :size="17" />
              </button>
            </div>
            <span v-if="erros.senha" class="msg-erro">{{ erros.senha }}</span>
          </div>

          <button type="button" class="esqueci" @click="ajudaSenha = !ajudaSenha">Esqueceu a senha?</button>
          <p v-if="ajudaSenha" class="ajuda-senha">Peça ao administrador do SIGAF para redefinir sua senha em Cadastros.</p>

          <button class="btn btn-primary entrar" :disabled="enviando">
            <LogIn :size="17" /> {{ enviando ? 'Entrando…' : 'Entrar' }}
          </button>

          <div class="divisor"><span>acesso de demonstração</span></div>
          <div class="demos">
            <button v-for="d in DEMO" :key="d.email" type="button" class="demo" @click="usarDemo(d)">{{ d.perfil }}</button>
          </div>
          <p class="dica-demo">Senha de todos: <code>Sigaf@2026</code></p>
        </form>
      </section>
    </div>
  </div>
</template>

<style scoped>
.tela {
  position: relative; min-height: 100vh; display: grid; place-items: center; padding: 32px 20px; overflow: hidden;
  background: var(--bg);
}
.brilho { position: absolute; border-radius: 50%; filter: blur(70px); opacity: .5; pointer-events: none; }
.b1 { width: 340px; height: 340px; background: #7c3aed; top: -120px; right: -80px; opacity: .35; }
.b2 { width: 280px; height: 280px; background: #6366f1; bottom: -110px; left: -90px; opacity: .25; }

.cartao {
  position: relative; width: 100%; max-width: 960px; display: grid; grid-template-columns: 1.05fr 1fr; gap: 12px;
  padding: 12px; background: var(--surface); border: 1px solid var(--border); border-radius: 28px;
  box-shadow: 0 40px 90px rgba(0,0,0,.45);
}

.apresentacao {
  position: relative; display: flex; flex-direction: column; gap: 14px; padding: 36px 34px 20px; border-radius: 20px; overflow: hidden;
  color: #fff; background: radial-gradient(500px 300px at 90% 0%, rgba(255,255,255,.18), transparent 60%), linear-gradient(160deg, #8b5cf6 0%, #6d28d9 55%, #4c1d95 100%);
}
.marca-clara { display: inline-flex; align-items: center; gap: 8px; font-weight: 700; letter-spacing: .04em; font-size: 13px; opacity: .9; }
.apresentacao h1 { font-size: 28px; line-height: 1.18; max-width: 380px; }
.apresentacao p { color: rgba(255,255,255,.82); font-size: 14px; max-width: 360px; }
.ilustracao { width: 100%; max-width: 380px; margin: auto auto 0; }

.formulario { display: grid; place-items: center; padding: 34px 30px; }
.formulario form { width: 100%; max-width: 340px; display: flex; flex-direction: column; gap: 14px; }
.marca { display: flex; align-items: center; justify-content: center; gap: 10px; font-size: 18px; }
.logo { width: 36px; height: 36px; border-radius: 10px; background: var(--accent-soft); color: #c4b5fd; display: grid; place-items: center; }
.formulario h2 { text-align: center; font-size: 26px; margin-top: 6px; }
.sub { text-align: center; color: var(--muted); font-size: 13.5px; margin-top: -8px; margin-bottom: 6px; }

.com-icone { position: relative; display: flex; align-items: center; }
.com-icone > svg { position: absolute; left: 13px; color: var(--muted); pointer-events: none; }
.com-icone .input { height: 46px; padding-left: 40px; background: var(--bg-elev); border-radius: 12px; }
.olho { position: absolute; right: 6px; width: 34px; height: 34px; display: grid; place-items: center; border: 0; background: none; color: var(--muted); border-radius: 8px; cursor: pointer; }
.olho:hover { color: var(--text); background: var(--surface-2); }
.com-icone:has(.olho) .input { padding-right: 44px; }

.esqueci { align-self: flex-end; margin-top: -6px; background: none; border: 0; color: var(--accent); font: 500 12.5px var(--font); cursor: pointer; padding: 2px 0; }
.esqueci:hover { text-decoration: underline; }
.ajuda-senha { font-size: 12.5px; color: var(--text-2); background: var(--surface-2); border: 1px solid var(--border); border-radius: 10px; padding: 10px 12px; margin-top: -4px; }
.entrar { height: 46px; border-radius: 12px; font-size: 15px; }

.divisor { display: flex; align-items: center; gap: 10px; color: var(--muted); font-size: 12px; margin-top: 4px; }
.divisor::before, .divisor::after { content: ''; flex: 1; height: 1px; background: var(--border); }
.demos { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.demo {
  height: 40px; border-radius: 10px; border: 1px solid var(--border-strong); background: var(--bg-elev); color: var(--text);
  font: 500 13px var(--font); cursor: pointer; transition: border-color .15s, background .15s;
}
.demo:hover { border-color: var(--accent); background: var(--accent-soft); }
.dica-demo { text-align: center; color: var(--muted); font-size: 12px; }
code { font-family: var(--mono); color: var(--text-2); }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }

@media (max-width: 860px) {
  .cartao { grid-template-columns: 1fr; max-width: 460px; }
  .apresentacao { padding: 22px 22px 18px; gap: 8px; }
  .apresentacao h1 { font-size: 20px; }
  .apresentacao p, .ilustracao, .marca { display: none; }
  .formulario { padding: 18px 10px 14px; }
}
@media (max-width: 420px) {
  .tela { padding: 16px 12px; place-items: start center; }
  .cartao { border-radius: 22px; padding: 8px; }
  .apresentacao { border-radius: 16px; }
  .formulario h2 { font-size: 22px; }
}
</style>
