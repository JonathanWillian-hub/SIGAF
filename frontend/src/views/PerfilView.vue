<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import {
  Camera, Trash2, Eye, EyeOff, Mail, Phone, IdCard, Fingerprint, Building2, BadgeCheck, CalendarDays,
  Briefcase, ShieldCheck, Bell, KeyRound, Clock, CheckCircle2, XCircle, Hourglass, ListChecks, Monitor, Save,
} from 'lucide-vue-next';
import Avatar from '../components/Avatar.vue';
import KpiCard from '../components/KpiCard.vue';
import { api } from '../services/api.js';
import { useAuth } from '../stores/auth.js';
import { avisar } from '../stores/toast.js';
import { gsap, movimentoReduzido } from '../utils/animacoes.js';
import { PERFIS, dataBR, dataHoraBR, horasTotais, numero } from '../utils/formatos.js';

const auth = useAuth();
const u = computed(() => auth.usuario || {});
const resumo = ref(null);
const carregando = ref(true);
const aba = ref('dados');

const FUNCOES = {
  COLABORADOR: 'Registra as próprias atividades, substituições e coberturas.',
  GESTOR: 'Homologa os registros e cuida das contas da equipe do setor.',
  ADMINISTRADOR: 'Administra o sistema, os cadastros e os acessos de todos os setores.',
};

async function carregar() {
  carregando.value = true;
  try {
    const r = await api.get('/perfil');
    auth.definirUsuario(r.usuario);
    resumo.value = r.resumo;
    contato.value = { telefone: r.usuario.telefone || '', notificarEmail: r.usuario.notificarEmail !== false };
  } catch (e) {
    avisar(e.message, 'erro');
  } finally {
    carregando.value = false;
  }
}
onMounted(carregar);

const cpfCompleto = ref('');
const verCpf = ref(false);
async function alternarCpf() {
  if (!verCpf.value && !cpfCompleto.value) {
    try { cpfCompleto.value = (await api.get('/perfil/cpf')).cpf || ''; } catch (e) { avisar(e.message, 'erro'); return; }
  }
  verCpf.value = !verCpf.value;
}

const seletorFoto = ref(null);
const enviandoFoto = ref(false);

async function prepararFoto(arquivo) {
  if (!/^image\/(jpeg|png|webp)$/.test(arquivo.type)) throw new Error('Escolha uma imagem JPG, PNG ou WEBP.');
  if (arquivo.size > 10 * 1024 * 1024) throw new Error('A imagem deve ter no máximo 10 MB.');
  const endereco = URL.createObjectURL(arquivo);
  try {
    const img = new Image();
    img.src = endereco;
    await img.decode();
    const lado = Math.min(img.naturalWidth, img.naturalHeight);
    const tela = document.createElement('canvas');
    tela.width = 256;
    tela.height = 256;
    tela.getContext('2d').drawImage(img, (img.naturalWidth - lado) / 2, (img.naturalHeight - lado) / 2, lado, lado, 0, 0, 256, 256);
    let qualidade = 0.86;
    let dado = tela.toDataURL('image/jpeg', qualidade);
    while (dado.length > 85000 && qualidade > 0.4) {
      qualidade -= 0.1;
      dado = tela.toDataURL('image/jpeg', qualidade);
    }
    return dado;
  } finally {
    URL.revokeObjectURL(endereco);
  }
}

async function salvarFoto(foto) {
  enviandoFoto.value = true;
  try {
    const r = await api.put('/perfil/foto', { foto });
    auth.definirUsuario(r.usuario);
    avisar(r.mensagem);
    if (!movimentoReduzido()) gsap.fromTo('.capa .foto', { scale: 0.85 }, { scale: 1, duration: 0.6, ease: 'back.out(2)' });
  } catch (e) {
    avisar(e.message, 'erro');
  } finally {
    enviandoFoto.value = false;
  }
}

async function escolherFoto(evento) {
  const arquivo = evento.target.files?.[0];
  evento.target.value = '';
  if (!arquivo) return;
  try { await salvarFoto(await prepararFoto(arquivo)); } catch (e) { avisar(e.message, 'erro'); }
}

const contato = ref({ telefone: '', notificarEmail: true });
const errosContato = ref({});
const salvandoContato = ref(false);
async function salvarContato() {
  errosContato.value = {};
  salvandoContato.value = true;
  try {
    const r = await api.put('/perfil', contato.value);
    auth.definirUsuario(r.usuario);
    avisar(r.mensagem);
  } catch (e) {
    errosContato.value = e.campos || {};
    avisar(e.message, 'erro');
  } finally {
    salvandoContato.value = false;
  }
}

const senha = ref({ senhaAtual: '', novaSenha: '', confirmar: '' });
const errosSenha = ref({});
const salvandoSenha = ref(false);
const verSenhas = ref(false);
async function trocarSenha() {
  errosSenha.value = {};
  if (senha.value.novaSenha && senha.value.novaSenha !== senha.value.confirmar) {
    errosSenha.value = { confirmar: 'As senhas não conferem.' };
    return;
  }
  salvandoSenha.value = true;
  try {
    const r = await api.put('/perfil/senha', { senhaAtual: senha.value.senhaAtual, novaSenha: senha.value.novaSenha });
    avisar(r.mensagem);
    senha.value = { senhaAtual: '', novaSenha: '', confirmar: '' };
  } catch (e) {
    errosSenha.value = e.campos || {};
    avisar(e.message, 'erro');
  } finally {
    salvandoSenha.value = false;
  }
}

const forcaSenha = computed(() => {
  const s = senha.value.novaSenha;
  if (!s) return 0;
  return [s.length >= 8, /[A-Z]/.test(s) && /[a-z]/.test(s), /\d/.test(s), /[^A-Za-z0-9]/.test(s)].filter(Boolean).length;
});
const ROTULO_FORCA = ['', 'Fraca', 'Razoável', 'Boa', 'Forte'];

const atv = computed(() => resumo.value?.atividades || {});
const taxaAprovacao = computed(() => {
  const decididos = (atv.value.homologados || 0) + (atv.value.rejeitados || 0);
  return decididos ? Math.round((atv.value.homologados / decididos) * 100) : 0;
});

const conteudoAba = ref(null);
watch(aba, async () => {
  await nextTick();
  const alvo = conteudoAba.value?.firstElementChild;
  if (!alvo || movimentoReduzido()) return;
  gsap.fromTo(alvo.children, { autoAlpha: 0, y: 10 }, {
    autoAlpha: 1, y: 0, duration: 0.4, stagger: 0.06, ease: 'power2.out', clearProps: 'opacity,visibility,transform',
  });
});
</script>

<template>
  <div class="page perfil">
    <section class="capa">
      <div class="faixa" aria-hidden="true">
        <span class="orbe o1" /><span class="orbe o2" /><span class="grade-fundo" />
      </div>
      <div class="capa-corpo">
        <div class="foto">
          <Avatar :nome="u.nome" :foto="u.foto" :tamanho="104" redondo />
          <button class="trocar" type="button" :disabled="enviandoFoto" aria-label="Trocar foto" @click="seletorFoto.click()">
            <Camera :size="17" />
          </button>
          <input ref="seletorFoto" type="file" accept="image/jpeg,image/png,image/webp" hidden @change="escolherFoto" />
        </div>
        <div class="identidade">
          <h1>{{ u.nome }}</h1>
          <p class="text-2">{{ u.cargo || PERFIS[u.perfil] }}<span v-if="u.setorNome" class="muted">, {{ u.setorNome }}</span></p>
          <div class="selos">
            <span class="badge roxo"><ShieldCheck :size="13" /> {{ PERFIS[u.perfil] }}</span>
            <span class="badge" :class="u.ativo ? 'verde' : 'vermelho'"><span class="dot" /> {{ u.ativo ? 'Conta ativa' : 'Conta inativa' }}</span>
            <span class="badge cinza mono">Mat. {{ u.matricula }}</span>
          </div>
        </div>
        <div class="capa-acoes">
          <button class="btn btn-sm" type="button" :disabled="enviandoFoto" @click="seletorFoto.click()"><Camera :size="15" /> {{ u.foto ? 'Trocar foto' : 'Adicionar foto' }}</button>
          <button v-if="u.foto" class="btn btn-ghost btn-sm" type="button" :disabled="enviandoFoto" @click="salvarFoto(null)"><Trash2 :size="15" /> Remover</button>
        </div>
      </div>
    </section>

    <div class="abas">
      <div class="segment" role="tablist" aria-label="Seções do perfil">
        <button role="tab" :aria-selected="aba === 'dados'" :class="{ ativo: aba === 'dados' }" @click="aba = 'dados'">Meus dados</button>
        <button role="tab" :aria-selected="aba === 'config'" :class="{ ativo: aba === 'config' }" @click="aba = 'config'">Configurações</button>
        <button role="tab" :aria-selected="aba === 'atividade'" :class="{ ativo: aba === 'atividade' }" @click="aba = 'atividade'">Atividade</button>
      </div>
    </div>

    <div ref="conteudoAba" class="conteudo-aba">
      <div v-if="aba === 'dados'" key="dados" class="perfil-grade">
        <section class="card">
          <div class="card-head"><div><h2>Informações pessoais</h2><p>Dados do seu cadastro no SIGAF.</p></div></div>
          <dl class="dados">
            <div><dt><IdCard :size="15" /> Nome completo</dt><dd>{{ u.nome }}</dd></div>
            <div><dt><Mail :size="15" /> E-mail</dt><dd class="quebra">{{ u.email }}</dd></div>
            <div>
              <dt><Fingerprint :size="15" /> CPF</dt>
              <dd class="row">
                <span class="mono">{{ verCpf ? cpfCompleto : u.cpf }}</span>
                <button class="btn btn-ghost btn-icon mini" type="button" :aria-label="verCpf ? 'Ocultar CPF' : 'Mostrar CPF'" @click="alternarCpf">
                  <component :is="verCpf ? EyeOff : Eye" :size="15" />
                </button>
              </dd>
            </div>
            <div><dt><Phone :size="15" /> Telefone</dt><dd>{{ u.telefone || 'Não informado' }}</dd></div>
          </dl>
          <p class="nota muted small">Para corrigir nome, e-mail ou CPF, fale com seu gestor ou com o administrador.</p>
        </section>

        <section class="card">
          <div class="card-head"><div><h2>Vínculo</h2><p>Como você atua dentro do sistema.</p></div></div>
          <dl class="dados">
            <div><dt><BadgeCheck :size="15" /> Matrícula</dt><dd class="mono">{{ u.matricula }}</dd></div>
            <div><dt><ShieldCheck :size="15" /> Perfil de acesso</dt><dd>{{ PERFIS[u.perfil] }}</dd></div>
            <div><dt><Briefcase :size="15" /> Cargo</dt><dd>{{ u.cargo || 'Não informado' }}</dd></div>
            <div><dt><Building2 :size="15" /> Setor</dt><dd>{{ u.setorNome || 'Sem setor' }}</dd></div>
            <div><dt><CalendarDays :size="15" /> No SIGAF desde</dt><dd>{{ dataBR(u.criadoEm) }}</dd></div>
            <div>
              <dt><CheckCircle2 :size="15" /> Situação</dt>
              <dd><span class="badge" :class="u.ativo ? 'verde' : 'vermelho'"><span class="dot" /> {{ u.ativo ? 'Ativo' : 'Inativo' }}</span></dd>
            </div>
          </dl>
          <div class="funcao">
            <strong>O que você faz no SIGAF</strong>
            <span>{{ FUNCOES[u.perfil] }}</span>
          </div>
        </section>
      </div>

      <div v-else-if="aba === 'config'" key="config" class="perfil-grade">
        <section class="card">
          <div class="card-head"><div><h2>Contato e notificações</h2><p>Como o SIGAF fala com você.</p></div><Bell :size="18" class="muted" /></div>
          <form class="form" novalidate @submit.prevent="salvarContato">
            <div class="campo" :class="{ erro: errosContato.telefone }">
              <label for="telefone">Telefone</label>
              <input id="telefone" v-model="contato.telefone" class="input" inputmode="tel" placeholder="(12) 99999-0000" maxlength="20" />
              <span v-if="errosContato.telefone" class="msg-erro">{{ errosContato.telefone }}</span>
            </div>
            <label class="alternar">
              <input v-model="contato.notificarEmail" type="checkbox" />
              <span class="trilho"><span class="bolinha" /></span>
              <span class="stack">
                <strong>Avisos por e-mail</strong>
                <span class="muted small">Receber no e-mail quando um registro for homologado ou rejeitado.</span>
              </span>
            </label>
            <div class="rodape-form">
              <button class="btn btn-primary" type="submit" :disabled="salvandoContato"><Save :size="16" /> {{ salvandoContato ? 'Salvando...' : 'Salvar preferências' }}</button>
            </div>
          </form>
        </section>

        <section class="card">
          <div class="card-head"><div><h2>Segurança</h2><p>Troque sua senha de acesso.</p></div><KeyRound :size="18" class="muted" /></div>
          <form class="form" novalidate @submit.prevent="trocarSenha">
            <div class="campo" :class="{ erro: errosSenha.senhaAtual }">
              <label for="senha-atual">Senha atual</label>
              <input id="senha-atual" v-model="senha.senhaAtual" class="input" :type="verSenhas ? 'text' : 'password'" autocomplete="current-password" />
              <span v-if="errosSenha.senhaAtual" class="msg-erro">{{ errosSenha.senhaAtual }}</span>
            </div>
            <div class="campo" :class="{ erro: errosSenha.novaSenha }">
              <label for="senha-nova">Nova senha</label>
              <input id="senha-nova" v-model="senha.novaSenha" class="input" :type="verSenhas ? 'text' : 'password'" autocomplete="new-password" />
              <div class="forca" :data-nivel="forcaSenha" aria-hidden="true"><span v-for="n in 4" :key="n" :class="{ cheio: n <= forcaSenha }" /></div>
              <span v-if="errosSenha.novaSenha" class="msg-erro">{{ errosSenha.novaSenha }}</span>
              <span v-else class="ajuda">{{ forcaSenha ? `Força: ${ROTULO_FORCA[forcaSenha]}` : 'Mínimo de 8 caracteres.' }}</span>
            </div>
            <div class="campo" :class="{ erro: errosSenha.confirmar }">
              <label for="senha-confirmar">Confirmar nova senha</label>
              <input id="senha-confirmar" v-model="senha.confirmar" class="input" :type="verSenhas ? 'text' : 'password'" autocomplete="new-password" />
              <span v-if="errosSenha.confirmar" class="msg-erro">{{ errosSenha.confirmar }}</span>
            </div>
            <div class="rodape-form">
              <button class="btn btn-ghost btn-sm" type="button" @click="verSenhas = !verSenhas">
                <component :is="verSenhas ? EyeOff : Eye" :size="15" /> {{ verSenhas ? 'Ocultar' : 'Mostrar' }} senhas
              </button>
              <button class="btn btn-primary" type="submit" :disabled="salvandoSenha">{{ salvandoSenha ? 'Salvando...' : 'Alterar senha' }}</button>
            </div>
          </form>
        </section>
      </div>

      <div v-else key="atividade" class="atividade">
        <div class="grid-kpi">
          <KpiCard titulo="Registros feitos" :valor="numero(atv.total)" :icone="ListChecks" :carregando="carregando" detalhe="Desde o início" />
          <KpiCard titulo="Horas homologadas" :valor="horasTotais(atv.minutosHomologados)" :icone="Clock" cor="verde" :carregando="carregando" :detalhe="`${taxaAprovacao}% de aprovação`" />
          <KpiCard titulo="Aguardando" :valor="numero(atv.pendentes)" :icone="Hourglass" cor="laranja" :carregando="carregando" detalhe="Na fila do gestor" />
          <KpiCard titulo="Rejeitados" :valor="numero(atv.rejeitados)" :icone="XCircle" :carregando="carregando" detalhe="Com justificativa" />
        </div>
        <section class="card">
          <div class="card-head"><div><h2>Últimos acessos</h2><p>Se não reconhecer algum, troque sua senha.</p></div><Monitor :size="18" class="muted" /></div>
          <div v-if="carregando" class="skeleton" style="height: 120px" />
          <p v-else-if="!resumo?.acessos?.length" class="muted">Nenhum acesso registrado.</p>
          <ol v-else class="acessos">
            <li v-for="(a, i) in resumo.acessos" :key="i">
              <span class="ponto-linha" :class="{ atual: i === 0 }" />
              <span class="stack">
                <strong>{{ dataHoraBR(a.dataHora) }}</strong>
                <span class="muted small">{{ i === 0 ? 'Sessão atual' : 'Entrada no sistema' }}<template v-if="a.ip">, IP {{ a.ip }}</template></span>
              </span>
            </li>
          </ol>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.perfil { max-width: 1080px; }

.capa { position: relative; border: 1px solid var(--border); border-radius: 16px; overflow: hidden; background: var(--surface); margin-bottom: 18px; }
.faixa {
  position: relative; height: 128px; overflow: hidden;
  background: linear-gradient(120deg, #2e1065 0%, #4c1d95 45%, #6d28d9 100%);
}
.orbe { position: absolute; border-radius: 50%; filter: blur(2px); }
.o1 { width: 220px; height: 220px; right: -40px; top: -90px; background: radial-gradient(circle, rgba(196,181,253,.55), transparent 70%); }
.o2 { width: 160px; height: 160px; left: 30%; bottom: -100px; background: radial-gradient(circle, rgba(251,191,36,.28), transparent 70%); }
.grade-fundo {
  position: absolute; inset: 0; opacity: .18;
  background-image: linear-gradient(rgba(255,255,255,.25) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.25) 1px, transparent 1px);
  background-size: 28px 28px; mask-image: linear-gradient(90deg, transparent, #000 60%);
}
.capa-corpo { display: flex; align-items: flex-start; gap: 20px; padding: 0 24px 22px; margin-top: -52px; position: relative; flex-wrap: wrap; }
.foto { position: relative; border-radius: 50%; padding: 4px; background: var(--surface); box-shadow: 0 10px 30px rgba(0,0,0,.45); }
.trocar {
  position: absolute; right: 2px; bottom: 4px; width: 34px; height: 34px; border-radius: 50%; display: grid; place-items: center;
  background: var(--accent); color: var(--accent-ink); border: 3px solid var(--surface); cursor: pointer; transition: transform .15s;
}
.trocar:hover { transform: scale(1.08); }
.identidade { flex: 1; min-width: 220px; padding-top: 64px; }
.identidade h1 { font-size: 24px; }
.identidade p { margin-top: 2px; }
.selos { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
.capa-acoes { display: flex; gap: 8px; padding-top: 64px; }

.abas { margin-bottom: 16px; }
.perfil-grade { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; align-items: start; }

.dados { display: grid; grid-template-columns: 1fr 1fr; gap: 16px 18px; margin: 0; }
.dados > div { min-width: 0; }
.dados dt { display: flex; align-items: center; gap: 6px; color: var(--muted); font-size: 12px; margin-bottom: 4px; }
.dados dd { margin: 0; font-weight: 500; min-height: 24px; }
.dados .quebra { overflow-wrap: anywhere; }
.mini { width: 26px; height: 26px; }
.nota { margin-top: 18px; padding-top: 14px; border-top: 1px solid var(--border); }
.funcao {
  margin-top: 18px; padding: 12px 14px; border-radius: 10px; background: var(--accent-soft); border: 1px solid rgba(167,139,250,.3);
  display: flex; flex-direction: column; gap: 2px;
}
.funcao strong { font-size: 13px; color: #c4b5fd; }
.funcao span { color: var(--text-2); font-size: 13px; }

.form { display: flex; flex-direction: column; gap: 16px; }
.rodape-form { display: flex; justify-content: flex-end; align-items: center; gap: 8px; flex-wrap: wrap; }

.alternar { display: flex; align-items: flex-start; gap: 12px; cursor: pointer; padding: 12px; border: 1px solid var(--border); border-radius: 10px; background: var(--bg-elev); }
.alternar input { position: absolute; opacity: 0; pointer-events: none; }
.trilho { flex: none; width: 40px; height: 22px; border-radius: 999px; background: var(--surface-3); border: 1px solid var(--border-strong); position: relative; transition: background .2s; margin-top: 2px; }
.bolinha { position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 50%; background: var(--text-2); transition: transform .25s cubic-bezier(.3,1.5,.6,1), background .2s; }
.alternar input:checked + .trilho { background: var(--accent-strong); border-color: var(--accent); }
.alternar input:checked + .trilho .bolinha { transform: translateX(18px); background: #fff; }
.alternar input:focus-visible + .trilho { box-shadow: 0 0 0 3px var(--accent-soft); }

.forca { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; margin-top: 2px; }
.forca span { height: 4px; border-radius: 2px; background: var(--surface-3); transition: background .25s; }
.forca[data-nivel="1"] .cheio { background: var(--red); }
.forca[data-nivel="2"] .cheio { background: var(--amber); }
.forca[data-nivel="3"] .cheio { background: var(--teal); }
.forca[data-nivel="4"] .cheio { background: var(--green); }

.acessos { list-style: none; margin: 0; padding: 0; position: relative; }
.acessos::before { content: ''; position: absolute; left: 5px; top: 8px; bottom: 8px; width: 2px; background: var(--border); }
.acessos li { display: flex; gap: 14px; align-items: flex-start; padding: 8px 0; position: relative; }
.ponto-linha { width: 12px; height: 12px; border-radius: 50%; background: var(--surface-3); border: 2px solid var(--border-strong); margin-top: 4px; flex: none; z-index: 1; }
.ponto-linha.atual { background: var(--accent); border-color: #c4b5fd; box-shadow: 0 0 0 4px var(--accent-soft); }

@media (max-width: 900px) {
  .perfil-grade { grid-template-columns: 1fr; }
}
@media (max-width: 760px) {
  .faixa { height: 96px; }
  .capa-corpo { flex-direction: column; align-items: center; text-align: center; padding: 0 16px 18px; margin-top: -48px; gap: 12px; }
  .identidade, .capa-acoes { min-width: 0; padding-top: 0; }
  .identidade h1 { font-size: 21px; }
  .selos { justify-content: center; }
  .abas .segment { display: flex; width: 100%; }
  .abas .segment button { flex: 1; }
  .dados { grid-template-columns: 1fr; gap: 14px; }
}
</style>
