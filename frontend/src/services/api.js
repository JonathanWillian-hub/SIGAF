const BASE = import.meta.env.VITE_API_URL || '/api';
const CHAVE_TOKEN = 'sigaf.token';

export class ErroApi extends Error {
  constructor(mensagem, status, campos) {
    super(mensagem);
    this.status = status;
    this.campos = campos || {};
  }
}

export const token = {
  obter: () => localStorage.getItem(CHAVE_TOKEN),
  salvar: (t) => localStorage.setItem(CHAVE_TOKEN, t),
  limpar: () => localStorage.removeItem(CHAVE_TOKEN),
};

function montarUrl(caminho, params) {
  const url = new URL(BASE + caminho, window.location.origin);
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
  });
  return url.pathname + url.search;
}

async function requisicao(metodo, caminho, { corpo, params, bruto = false } = {}) {
  const cabecalhos = {};
  const t = token.obter();
  if (t) cabecalhos.Authorization = `Bearer ${t}`;
  if (corpo !== undefined) cabecalhos['Content-Type'] = 'application/json';

  let resposta;
  try {
    resposta = await fetch(montarUrl(caminho, params), {
      method: metodo,
      headers: cabecalhos,
      body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
    });
  } catch {
    throw new ErroApi('Não foi possível conectar ao servidor. Verifique se a API está rodando.', 0);
  }

  if (resposta.status === 401 && !caminho.startsWith('/auth/login')) {
    token.limpar();
    localStorage.removeItem('sigaf.usuario');
    if (!window.location.pathname.startsWith('/login')) window.location.href = t ? '/login?expirou=1' : '/login';
  }
  if (bruto && resposta.ok) return resposta;

  const tipo = resposta.headers.get('content-type') || '';
  const dados = tipo.includes('application/json') ? await resposta.json() : null;
  if (!resposta.ok) throw new ErroApi(dados?.erro || `Erro ${resposta.status}`, resposta.status, dados?.campos);
  return { dados, status: resposta.status };
}

const so = (r) => r.dados;

export const api = {
  get: (c, params) => requisicao('GET', c, { params }).then(so),
  post: (c, corpo) => requisicao('POST', c, { corpo }).then((r) => ({ ...r.dados, _status: r.status })),
  put: (c, corpo) => requisicao('PUT', c, { corpo }).then(so),
  patch: (c, corpo) => requisicao('PATCH', c, { corpo }).then(so),
  del: (c) => requisicao('DELETE', c).then(so),

  async blob(caminho) {
    const resposta = await requisicao('GET', caminho.replace(/^\/api/, ''), { bruto: true });
    return resposta.blob();
  },

  async baixar(caminho) {
    const resposta = await requisicao('GET', caminho.replace(/^\/api/, ''), { bruto: true });
    const disp = resposta.headers.get('content-disposition') || '';
    const nome = /filename="?([^"]+)"?/.exec(disp)?.[1] || 'arquivo';
    const blob = await resposta.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nome;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return nome;
  },
};
