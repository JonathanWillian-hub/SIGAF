// Processador de Relatórios (Diagrama de Sequência RF04):
// consulta as atividades do período, consolida os dados e gera o arquivo (PDF / Excel / CSV).
import fs from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import path from 'node:path';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { env } from '../../config/env.js';
import { RotuloCategoria } from '../../domain/enums.js';
import { listarRegistros } from '../registros/registros.repository.js';

const ROTULO_STATUS = { PENDENTE: 'Pendente', HOMOLOGADO: 'Homologado', REJEITADO: 'Rejeitado' };
const EXTENSAO = { PDF: 'pdf', EXCEL: 'xlsx', CSV: 'csv' };

const dataBR = (d) => (d ? d.slice(0, 10).split('-').reverse().join('/') : '');
const hora = (h) => (h ? h.slice(0, 5) : '');
const horas = (min) => `${Math.floor(min / 60)}h${String(min % 60).padStart(2, '0')}`;

/** Consolida os dados: totais por categoria, status e setor. */
export function consolidar(registros) {
  const resumo = { total: registros.length, minutos: 0, porCategoria: {}, porStatus: {}, porSetor: {} };
  for (const r of registros) {
    const min = Number(r.minutos) || 0;
    resumo.minutos += min;
    resumo.porCategoria[r.categoria] = (resumo.porCategoria[r.categoria] || 0) + 1;
    resumo.porStatus[r.status] = (resumo.porStatus[r.status] || 0) + 1;
    const s = (resumo.porSetor[r.setorNome] ||= { registros: 0, minutos: 0 });
    s.registros += 1;
    s.minutos += min;
  }
  return resumo;
}

export async function processarRelatorio(relatorio, filtros, escopo, contexto) {
  const registros = await listarRegistros(filtros, escopo);
  const resumo = consolidar(registros);
  await fs.mkdir(env.pastaRelatorios, { recursive: true });
  const arquivo = path.join(env.pastaRelatorios, `relatorio-${relatorio.id}.${EXTENSAO[relatorio.formato]}`);

  if (relatorio.formato === 'PDF') await gerarPdf(arquivo, registros, resumo, contexto);
  else if (relatorio.formato === 'EXCEL') await gerarExcel(arquivo, registros, resumo, contexto);
  else await gerarCsv(arquivo, registros);

  return { arquivo, total: registros.length };
}

function linhaTabela(r) {
  return [
    dataBR(r.data),
    `${hora(r.horarioInicio)} às ${hora(r.horarioFim)}`,
    `${r.executorNome} (${r.executorMatricula})`,
    RotuloCategoria[r.categoria],
    r.substituidoNome || 'Não se aplica',
    r.setorNome,
    r.disciplinaNome || 'Não informado',
    horas(Number(r.minutos) || 0),
    ROTULO_STATUS[r.status],
    r.descricaoTarefas,
  ];
}

const CABECALHO = ['Data', 'Horário', 'Executor', 'Categoria', 'Substituído', 'Setor', 'Disciplina', 'Horas', 'Status', 'Tarefas executadas'];

async function gerarCsv(arquivo, registros) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const linhas = [CABECALHO.map(esc).join(';'), ...registros.map((r) => linhaTabela(r).map(esc).join(';'))];
  await fs.writeFile(arquivo, `﻿${linhas.join('\r\n')}`, 'utf8');
}

async function gerarExcel(arquivo, registros, resumo, ctx) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'SIGAF';
  wb.created = new Date();

  const ws = wb.addWorksheet('Registros');
  ws.addRow(['SIGAF, Relatório de Atividades Funcionais']).font = { bold: true, size: 14 };
  ws.addRow([`Período: ${dataBR(ctx.dataInicio)} a ${dataBR(ctx.dataFim)}, setor: ${ctx.setorNome}, profissional: ${ctx.profissionalNome}`]);
  ws.addRow([`Gerado em ${new Date().toLocaleString('pt-BR')} por ${ctx.solicitanteNome}`]);
  ws.addRow([]);
  const cab = ws.addRow(CABECALHO);
  cab.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  cab.eachCell((c) => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7C3AED' } }; });
  registros.forEach((r) => ws.addRow(linhaTabela(r)));
  [12, 13, 30, 24, 24, 26, 24, 9, 13, 60].forEach((w, i) => { ws.getColumn(i + 1).width = w; });

  const wr = wb.addWorksheet('Resumo');
  wr.addRow(['Indicador', 'Valor']).font = { bold: true };
  wr.addRow(['Total de registros', resumo.total]);
  wr.addRow(['Total de horas', horas(resumo.minutos)]);
  wr.addRow([]);
  wr.addRow(['Por categoria', 'Registros']).font = { bold: true };
  Object.entries(resumo.porCategoria).forEach(([k, v]) => wr.addRow([RotuloCategoria[k], v]));
  wr.addRow([]);
  wr.addRow(['Por status', 'Registros']).font = { bold: true };
  Object.entries(resumo.porStatus).forEach(([k, v]) => wr.addRow([ROTULO_STATUS[k], v]));
  wr.addRow([]);
  wr.addRow(['Por setor', 'Registros', 'Horas']).font = { bold: true };
  Object.entries(resumo.porSetor).forEach(([k, v]) => wr.addRow([k, v.registros, horas(v.minutos)]));
  wr.getColumn(1).width = 34;
  wr.getColumn(2).width = 14;
  wr.getColumn(3).width = 12;

  await wb.xlsx.writeFile(arquivo);
}

function gerarPdf(arquivo, registros, resumo, ctx) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 36, bufferPages: true, info: { Title: 'Relatório SIGAF', Author: 'SIGAF' } });
    const saida = doc.pipe(createWriteStream(arquivo));
    saida.on('finish', resolve);
    saida.on('error', reject);

    const roxo = '#7C3AED';
    const largura = doc.page.width - 72;

    doc.fillColor(roxo).fontSize(18).font('Helvetica-Bold').text('SIGAF', { continued: true })
      .fillColor('#333').font('Helvetica').text(': Relatório de Atividades Funcionais');
    doc.moveDown(0.3).fontSize(9).fillColor('#555')
      .text(`Período: ${dataBR(ctx.dataInicio)} a ${dataBR(ctx.dataFim)}, setor: ${ctx.setorNome}, profissional: ${ctx.profissionalNome}.`)
      .text(`Gerado em ${new Date().toLocaleString('pt-BR')} por ${ctx.solicitanteNome}`);

    // Resumo consolidado
    doc.moveDown(0.8);
    const y0 = doc.y;
    const cartoes = [
      ['Registros', String(resumo.total)],
      ['Horas registradas', horas(resumo.minutos)],
      ['Homologados', String(resumo.porStatus.HOMOLOGADO || 0)],
      ['Pendentes', String(resumo.porStatus.PENDENTE || 0)],
      ['Rejeitados', String(resumo.porStatus.REJEITADO || 0)],
    ];
    const lc = largura / cartoes.length;
    cartoes.forEach(([rot, val], i) => {
      const x = 36 + i * lc;
      doc.roundedRect(x, y0, lc - 8, 46, 4).fillAndStroke('#F5F3FF', '#DDD6FE');
      doc.fillColor('#6B7280').fontSize(8).font('Helvetica').text(rot, x + 8, y0 + 8, { width: lc - 24 });
      doc.fillColor('#111').fontSize(15).font('Helvetica-Bold').text(val, x + 8, y0 + 21, { width: lc - 24 });
    });
    doc.y = y0 + 58;
    doc.x = 36;

    const porCat = Object.entries(resumo.porCategoria).map(([k, v]) => `${RotuloCategoria[k]}: ${v}`).join(', ');
    doc.fillColor('#333').font('Helvetica').fontSize(9).text(`Por categoria: ${porCat || 'sem registros'}`, 36, doc.y, { width: largura });
    const porSetor = Object.entries(resumo.porSetor).map(([k, v]) => `${k}: ${horas(v.minutos)}`).join(', ');
    doc.fillColor('#333333').text(`Horas por setor: ${porSetor || 'sem registros'}`, { width: largura });
    doc.moveDown(0.8);

    // Tabela
    const cols = [
      { t: 'Data', w: 52 }, { t: 'Horário', w: 58 }, { t: 'Executor', w: 108 }, { t: 'Categoria', w: 86 },
      { t: 'Substituído', w: 88 }, { t: 'Setor', w: 92 }, { t: 'Horas', w: 36 }, { t: 'Status', w: 58 },
    ];
    cols.push({ t: 'Tarefas executadas', w: largura - cols.reduce((a, c) => a + c.w, 0) });

    const desenharCabecalho = () => {
      const y = doc.y;
      doc.rect(36, y, largura, 16).fill(roxo);
      let x = 36;
      doc.fillColor('#fff').font('Helvetica-Bold').fontSize(7.5);
      cols.forEach((c) => { doc.text(c.t, x + 3, y + 4.5, { width: c.w - 6, lineBreak: false }); x += c.w; });
      doc.y = y + 18;
    };
    desenharCabecalho();

    doc.font('Helvetica').fontSize(7.5);
    registros.forEach((r, i) => {
      const lin = linhaTabela(r);
      const valores = [lin[0], lin[1], lin[2], lin[3], lin[4], lin[5], lin[7], lin[8], lin[9]];
      const alturas = valores.map((v, j) => doc.heightOfString(String(v), { width: cols[j].w - 6 }));
      const h = Math.max(...alturas) + 6;
      if (doc.y + h > doc.page.height - 40) { doc.addPage(); desenharCabecalho(); doc.font('Helvetica').fontSize(7.5); }
      const y = doc.y;
      if (i % 2 === 0) doc.rect(36, y, largura, h).fill('#F8F7FC');
      let x = 36;
      doc.fillColor('#222');
      valores.forEach((v, j) => { doc.fillColor('#222222').text(String(v), x + 3, y + 3, { width: cols[j].w - 6 }); x += cols[j].w; });
      doc.y = y + h;
    });
    if (!registros.length) doc.fillColor('#666').text('Nenhum registro encontrado para os filtros informados.', 36, doc.y + 6);

    const paginas = doc.bufferedPageRange();
    for (let p = paginas.start; p < paginas.start + paginas.count; p += 1) {
      doc.switchToPage(p);
      doc.page.margins.bottom = 0;
      doc.fillColor('#999').fontSize(7).text(`SIGAF, página ${p + 1} de ${paginas.count}`, 36, doc.page.height - 26, { width: largura, align: 'right', lineBreak: false });
    }
    doc.end();
  });
}

