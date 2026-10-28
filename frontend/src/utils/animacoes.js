import { gsap } from 'gsap';

export { gsap };

export const movimentoReduzido = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const AGRUPADORES = '.grid-kpi, .grid-2, .grid-3, .conteudo-aba, .perfil-grade';

function alvosDaPagina(raiz) {
  const pagina = raiz.matches?.('.page') ? raiz : raiz.querySelector?.('.page');
  if (!pagina) return [];
  return [...pagina.children].flatMap((filho) => (filho.matches(AGRUPADORES) ? [...filho.children] : [filho]));
}

export function entrarPagina(el, concluir) {
  const alvos = alvosDaPagina(el);
  if (!alvos.length || movimentoReduzido()) { concluir(); return; }
  gsap.fromTo(alvos, { autoAlpha: 0, y: 14 }, {
    autoAlpha: 1, y: 0, duration: 0.5, ease: 'power3.out', stagger: 0.05,
    clearProps: 'opacity,visibility,transform', onComplete: concluir,
  });
}

export function contar(de, para, aoAtualizar, duracao = 0.9) {
  if (movimentoReduzido()) { aoAtualizar(para); return null; }
  const estado = { v: de };
  return gsap.to(estado, {
    v: para, duration: duracao, ease: 'power2.out',
    onUpdate: () => aoAtualizar(Math.round(estado.v)),
  });
}
