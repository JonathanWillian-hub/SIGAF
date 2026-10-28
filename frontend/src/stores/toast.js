import { reactive } from 'vue';

export const toasts = reactive([]);
let seq = 0;

export function avisar(mensagem, tipo = 'sucesso', duracao = 4200) {
  const id = ++seq;
  toasts.push({ id, mensagem, tipo });
  setTimeout(() => {
    const i = toasts.findIndex((t) => t.id === id);
    if (i >= 0) toasts.splice(i, 1);
  }, duracao);
}
