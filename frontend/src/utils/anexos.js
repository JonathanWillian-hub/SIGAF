export const TIPOS_ACEITOS = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv',
];
export const ACCEPT = `${TIPOS_ACEITOS.join(',')},.csv,.xlsx,.pdf`;
export const MAX_ARQUIVOS = 4;
const MAX_DOCUMENTO = 3 * 1024 * 1024;
export const MAX_TOTAL = 3.5 * 1024 * 1024;
const LADO_MAXIMO = 1600;

const ehImagem = (tipo) => tipo.startsWith('image/');

function tipoDe(arquivo) {
  if (arquivo.type) return arquivo.type === 'application/vnd.ms-excel' && /\.csv$/i.test(arquivo.name) ? 'text/csv' : arquivo.type;
  if (/\.csv$/i.test(arquivo.name)) return 'text/csv';
  if (/\.xlsx$/i.test(arquivo.name)) return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  if (/\.pdf$/i.test(arquivo.name)) return 'application/pdf';
  return '';
}

function lerComoDataUrl(blob) {
  return new Promise((ok, falha) => {
    const leitor = new FileReader();
    leitor.onload = () => ok(leitor.result);
    leitor.onerror = () => falha(new Error('Não foi possível ler o arquivo.'));
    leitor.readAsDataURL(blob);
  });
}

async function comprimirImagem(arquivo) {
  const endereco = URL.createObjectURL(arquivo);
  try {
    const img = new Image();
    img.src = endereco;
    await img.decode();
    const escala = Math.min(1, LADO_MAXIMO / Math.max(img.naturalWidth, img.naturalHeight));
    const tela = document.createElement('canvas');
    tela.width = Math.round(img.naturalWidth * escala);
    tela.height = Math.round(img.naturalHeight * escala);
    const ctx = tela.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, tela.width, tela.height);
    ctx.drawImage(img, 0, 0, tela.width, tela.height);
    const png = tela.toDataURL('image/png');
    if (png.length < 900 * 1024) return { tipo: 'image/png', dataUrl: png };
    let qualidade = 0.86;
    let jpg = tela.toDataURL('image/jpeg', qualidade);
    while (jpg.length > 1.2 * 1024 * 1024 && qualidade > 0.5) {
      qualidade -= 0.1;
      jpg = tela.toDataURL('image/jpeg', qualidade);
    }
    return { tipo: 'image/jpeg', dataUrl: jpg };
  } finally {
    URL.revokeObjectURL(endereco);
  }
}

export async function prepararAnexo(arquivo) {
  const tipo = tipoDe(arquivo);
  if (!TIPOS_ACEITOS.includes(tipo)) throw new Error(`${arquivo.name || 'Arquivo'}: envie imagens, PDF, Excel ou CSV.`);
  let nome = arquivo.name || `print-${new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '')}.png`;
  let final = { tipo, dataUrl: '' };
  if (ehImagem(tipo) && tipo !== 'image/gif') {
    final = await comprimirImagem(arquivo);
    if (final.tipo === 'image/jpeg') nome = nome.replace(/\.(png|webp)$/i, '.jpg');
  } else {
    if (arquivo.size > MAX_DOCUMENTO) throw new Error(`${nome} passa de 3 MB.`);
    final.dataUrl = await lerComoDataUrl(arquivo);
  }
  const conteudo = final.dataUrl.replace(/^data:[^;]+;base64,/, '');
  return {
    nome,
    tipo: final.tipo,
    conteudo,
    tamanho: Math.floor((conteudo.length * 3) / 4),
    previa: ehImagem(final.tipo) ? final.dataUrl : null,
  };
}

export function tamanhoLegivel(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;
}

export const imagem = (tipo) => ehImagem(tipo);
