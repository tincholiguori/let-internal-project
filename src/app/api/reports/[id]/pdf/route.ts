import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import PDFDocument from 'pdfkit';
import { createCanvas } from 'canvas';

export const dynamic = 'force-dynamic';

const COLORS = ['#0B1E51','#288ec9','#32BB05','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316','#6366f1','#22c55e','#0ea5e9','#e11d48','#a855f7','#84cc16'];

function drawBarChart(entries: [string, number][], width = 700, barH = 26) {
  const margin = { top: 20, right: 80, bottom: 20, left: 280 };
  const chartH = entries.length * (barH + 5);
  const height = margin.top + chartH + margin.bottom;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, width, height);
  const maxVal = entries[0]?.[1] || 1;
  const chartW = width - margin.left - margin.right;
  entries.forEach(([label, count], i) => {
    const y = margin.top + i * (barH + 5);
    const barW = (count / maxVal) * chartW;
    ctx.fillStyle = '#333';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(label.length > 38 ? label.slice(0, 36) + '...' : label, margin.left - 8, y + barH / 2 + 4);
    ctx.fillStyle = COLORS[i % COLORS.length];
    ctx.beginPath();
    ctx.roundRect(margin.left, y, barW, barH, 4);
    ctx.fill();
    ctx.fillStyle = '#333';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(String(count), margin.left + barW + 6, y + barH / 2 + 4);
  });
  return canvas.toBuffer('image/png');
}

function drawPieChart(freqMap: Record<string, number>, width = 460, height = 280) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  const entries = Object.entries(freqMap).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((s, e) => s + e[1], 0);
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, width, height);
  const cx = 140, cy = 140, r = 110;
  let startAngle = -Math.PI / 2;
  entries.forEach(([label, count], i) => {
    const slice = (count / total) * 2 * Math.PI;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, startAngle, startAngle + slice);
    ctx.fillStyle = COLORS[i % COLORS.length];
    ctx.fill();
    const ly = 30 + i * 24;
    ctx.fillRect(280, ly - 10, 14, 14);
    ctx.fillStyle = '#333';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${label} (${((count / total) * 100).toFixed(1)}%)`, 300, ly);
    startAngle += slice;
  });
  return canvas.toBuffer('image/png');
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(id) as any;
  if (!report) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const a = JSON.parse(report.analysis_json);

  const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });
  const chunks: Buffer[] = [];
  doc.on('data', (c: Buffer) => chunks.push(c));

  const finish = new Promise<Buffer>((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
  });

  // Cover
  doc.rect(0, 0, 595, 842).fill('#0B1E51');
  doc.fontSize(40).fillColor('white').font('Helvetica-Bold').text('Mosca', 0, 220, { align: 'center' });
  doc.fontSize(20).text('Reporte de Insights', 0, 280, { align: 'center' });
  doc.fontSize(14).fillColor('rgba(255,255,255,0.8)').text(`${a.totalResponses} respuestas analizadas`, 0, 330, { align: 'center' });
  doc.fontSize(11).text(`${report.filename} — ${new Date(report.created_at).toLocaleDateString('es-AR')}`, 0, 360, { align: 'center' });

  // Summary
  doc.addPage();
  doc.rect(0, 0, 595, 55).fill('#0B1E51');
  doc.fontSize(18).fillColor('white').font('Helvetica-Bold').text('Resumen Ejecutivo', 40, 16);

  doc.fillColor('#333').font('Helvetica').fontSize(10);
  let y = 75;
  (a.insights || []).forEach((ins: string, i: number) => {
    doc.font('Helvetica-Bold').fillColor('#0B1E51').text(`${i + 1}.`, 40, y, { continued: true });
    doc.font('Helvetica').fillColor('#333').text(' ' + ins, { width: 500 });
    y = doc.y + 8;
  });

  // Pie: Hijos
  doc.addPage();
  doc.rect(0, 0, 595, 55).fill('#0B1E51');
  doc.fontSize(18).fillColor('white').font('Helvetica-Bold').text('Tiene hijos/as + Modalidad', 40, 16);
  doc.image(drawPieChart(a.hijosFreq), 60, 70, { width: 460 });
  doc.font('Helvetica-Bold').fontSize(13).fillColor('#0B1E51').text('Modalidad preferida', 60, 380);
  doc.image(drawPieChart(a.modalidadFreq), 60, 400, { width: 460 });

  // Bar: Intereses
  doc.addPage();
  doc.rect(0, 0, 595, 55).fill('#0B1E51');
  doc.fontSize(18).fillColor('white').font('Helvetica-Bold').text('Intereses de los hijos/as', 40, 16);
  doc.image(drawBarChart(a.topIntereses), 0, 65, { width: 580 });

  // Bar: Productos
  doc.addPage();
  doc.rect(0, 0, 595, 55).fill('#0B1E51');
  doc.fontSize(18).fillColor('white').font('Helvetica-Bold').text('Categorías de producto', 40, 16);
  doc.image(drawBarChart(a.topProductos), 0, 65, { width: 580 });

  // Bar: Talleres
  doc.addPage();
  doc.rect(0, 0, 595, 55).fill('#0B1E51');
  doc.fontSize(18).fillColor('white').font('Helvetica-Bold').text('Talleres más solicitados', 40, 16);
  doc.image(drawBarChart(a.topTalleres), 0, 65, { width: 580 });

  // Footers
  const pc = doc.bufferedPageRange().count;
  for (let i = 0; i < pc; i++) {
    doc.switchToPage(i);
    doc.fontSize(8).fillColor('#999').text(`Mosca Insights — Pág ${i + 1}/${pc}`, 40, 820, { width: 515, align: 'center' });
  }

  doc.end();
  const buffer = await finish;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=mosca-insights-${id.slice(0, 8)}.pdf`,
    },
  });
}
