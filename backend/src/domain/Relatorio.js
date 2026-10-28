import fs from 'node:fs/promises';
import path from 'node:path';
import { env } from '../config/env.js';
import { query } from '../config/db.js';
import { ErroApp } from '../utils/erros.js';
import { FormatoRelatorio, StatusRelatorio } from './enums.js';
import { contarRegistros } from '../modules/registros/registros.repository.js';
import { processarRelatorio } from '../modules/relatorios/processador.js';
import { registrarLog } from '../modules/auditoria/auditoria.service.js';
import { notificar } from '../modules/notificacoes/notificacao.service.js';
import { waitUntil } from '@vercel/functions';
import { Usuario } from './Usuario.js';

const REGEX_DATA = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Classe Relatorio (Diagrama de Classes)
 *  - id, formato, dataInicioFiltro, dataFimFiltro, status, dataGeracao, arquivoUrl
 *  - solicitante 1 (Usuario "solicita/gera") | setor 0..1 ("filtro")
 *  + solicitarGeracao(): void
 *  + baixarArquivo(): byte[]
 */
export class Relatorio {
  constructor(dados = {}) {
    this.id = dados.id ?? null;
    this.formato = dados.formato;
    this.dataInicioFiltro = dados.dataInicioFiltro ?? dados.data_inicio_filtro;
    this.dataFimFiltro = dados.dataFimFiltro ?? dados.data_fim_filtro;
    this.status = dados.status ?? StatusRelatorio.PROCESSANDO;
    this.dataGeracao = dados.dataGeracao ?? dados.data_geracao ?? null;
    this.arquivoUrl = dados.arquivoUrl ?? dados.arquivo_url ?? null;
    this.totalRegistros = dados.totalRegistros ?? dados.total_registros ?? null;
    this.solicitanteId = dados.solicitanteId ?? dados.solicitante_id;
    this.setorId = Number(dados.setorId ?? dados.setor_id) || null;
    this.profissionalId = Number(dados.profissionalId ?? dados.profissional_id) || null;
  }

  validar() {
    const erros = {};
    if (!Object.values(FormatoRelatorio).includes(this.formato)) erros.formato = 'Selecione PDF, Excel ou CSV.';
    if (!REGEX_DATA.test(this.dataInicioFiltro || '')) erros.dataInicioFiltro = 'Informe a data inicial.';
    if (!REGEX_DATA.test(this.dataFimFiltro || '')) erros.dataFimFiltro = 'Informe a data final.';
    if (!erros.dataInicioFiltro && !erros.dataFimFiltro && this.dataFimFiltro < this.dataInicioFiltro) {
      erros.dataFimFiltro = 'A data final não pode ser anterior à inicial.';
    }
    return erros;
  }

  /**
   * + solicitarGeracao(): void — RF04.
   * Volume normal: processa na hora (download automático).
   * A1 Volume excedente: processa em segundo plano e notifica quando pronto.
   * Retorna true quando a geração ficou em segundo plano.
   */
  async solicitarGeracao(solicitante, escopo, ip = null) {
    const erros = this.validar();
    if (Object.keys(erros).length) throw new ErroApp('Verifique os parâmetros do relatório.', 422, erros);

    const filtros = {
      dataInicio: this.dataInicioFiltro,
      dataFim: this.dataFimFiltro,
      setorId: this.setorId,
      profissionalId: this.profissionalId,
    };
    const total = await contarRegistros(filtros, escopo);

    const [r] = await query(
      `INSERT INTO relatorios (formato, data_inicio_filtro, data_fim_filtro, status, solicitante_id, setor_id, profissional_id, total_registros)
       VALUES (?, ?, ?, 'PROCESSANDO', ?, ?, ?, ?) RETURNING id`,
      [this.formato, this.dataInicioFiltro, this.dataFimFiltro, solicitante.id, this.setorId, this.profissionalId, total],
    );
    this.id = r.id;
    this.solicitanteId = solicitante.id;
    this.totalRegistros = total;
    await registrarLog({ usuarioId: solicitante.id, acao: 'RELATORIO', entidade: 'Relatorio', entidadeId: this.id, detalhes: { ...filtros, formato: this.formato, total }, ip });

    const contexto = await this.contexto(solicitante);
    const executar = async () => {
      try {
        await processarRelatorio(this, filtros, escopo, contexto);
        this.status = StatusRelatorio.CONCLUIDO;
        this.arquivoUrl = `/api/relatorios/${this.id}/arquivo`;
        await query(
          `UPDATE relatorios SET status='CONCLUIDO', data_geracao=NOW(), arquivo_url=? WHERE id=?`,
          [this.arquivoUrl, this.id],
        );
      } catch (erro) {
        this.status = StatusRelatorio.ERRO;
        await query(`UPDATE relatorios SET status='ERRO' WHERE id=?`, [this.id]);
        console.error('[relatorio] falha ao gerar', this.id, erro);
      }
    };

    if (total > env.limiteRelatorioAssincrono) {
      // Processamento assíncrono (segundo plano) + notificação ao final.
      // Na Vercel, o waitUntil mantém a função viva até terminar, mesmo depois da resposta.
      const tarefa = (async () => {
        await executar();
        await notificar({
          usuarioId: solicitante.id,
          titulo: this.status === StatusRelatorio.CONCLUIDO ? 'Relatório pronto para download' : 'Falha ao gerar relatório',
          mensagem: this.status === StatusRelatorio.CONCLUIDO
            ? `Seu relatório #${this.id} (${this.formato}, ${total} registros) está pronto para download.`
            : `Não foi possível gerar o relatório #${this.id}. Tente novamente.`,
          link: '/relatorios',
        });
      })().catch((erro) => console.error('[relatorio] falha no segundo plano', this.id, erro));
      try { waitUntil(tarefa); } catch { /* fora da Vercel a tarefa segue normalmente */ }
      return true;
    }
    await executar();
    if (this.status === StatusRelatorio.ERRO) throw new ErroApp('Não foi possível gerar o relatório.', 500);
    return false;
  }

  /**
   * + baixarArquivo(): byte[] — devolve o conteúdo do arquivo gerado.
   * Se o arquivo não estiver neste servidor (na Vercel cada acesso pode cair numa instância
   * diferente), ele é gerado de novo com os mesmos filtros e o mesmo escopo do solicitante.
   */
  async baixarArquivo() {
    if (this.status !== StatusRelatorio.CONCLUIDO) throw new ErroApp('O relatório ainda não está pronto.', 409);
    try {
      return await fs.readFile(this.caminhoArquivo());
    } catch (erro) {
      if (erro.code !== 'ENOENT') throw erro;
    }
    const solicitante = await Usuario.buscarPorId(this.solicitanteId);
    const filtros = {
      dataInicio: this.dataInicioFiltro,
      dataFim: this.dataFimFiltro,
      setorId: this.setorId,
      profissionalId: this.profissionalId,
    };
    await processarRelatorio(this, filtros, solicitante.visualizarDashboard(), await this.contexto(solicitante));
    return fs.readFile(this.caminhoArquivo());
  }

  caminhoArquivo() {
    const ext = { PDF: 'pdf', EXCEL: 'xlsx', CSV: 'csv' }[this.formato];
    return path.join(env.pastaRelatorios, `relatorio-${this.id}.${ext}`);
  }

  nomeArquivo() {
    const ext = { PDF: 'pdf', EXCEL: 'xlsx', CSV: 'csv' }[this.formato];
    const br = (d) => d.split('-').reverse().join('.');
    return `relatorio_sigaf_${this.id}_${br(this.dataInicioFiltro)}_a_${br(this.dataFimFiltro)}.${ext}`;
  }

  async contexto(solicitante) {
    const [setor] = this.setorId ? await query('SELECT nome FROM setores WHERE id=?', [this.setorId]) : [];
    const [prof] = this.profissionalId ? await query('SELECT nome FROM usuarios WHERE id=?', [this.profissionalId]) : [];
    return {
      dataInicio: this.dataInicioFiltro,
      dataFim: this.dataFimFiltro,
      setorNome: setor?.nome || 'Todos',
      profissionalNome: prof?.nome || 'Todos',
      solicitanteNome: solicitante.nome,
    };
  }

  static async buscarPorId(id) {
    const [linha] = await query('SELECT * FROM relatorios WHERE id = ?', [id]);
    return linha ? new Relatorio(linha) : null;
  }
}
