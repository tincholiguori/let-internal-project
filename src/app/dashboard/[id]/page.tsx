'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

const COLORS = ['#0B1E51','#288ec9','#32BB05','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316','#6366f1','#22c55e','#0ea5e9','#e11d48','#a855f7','#84cc16'];

interface Analysis {
  totalResponses: number;
  hijosFreq: Record<string, number>;
  cantHijosFreq: Record<string, number>;
  interesesFreq: Record<string, number>;
  productosFreq: Record<string, number>;
  talleresFreq: Record<string, number>;
  modalidadFreq: Record<string, number>;
  dispositivoFreq: Record<string, number>;
  topIntereses: [string, number][];
  topProductos: [string, number][];
  topTalleres: [string, number][];
  insights: string[];
}

function toChartData(freq: Record<string, number>, limit = 15) {
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, value]) => ({ name: name.length > 30 ? name.slice(0, 28) + '...' : name, value, fullName: name }));
}

function toPieData(freq: Record<string, number>) {
  const total = Object.values(freq).reduce((s, v) => s + v, 0);
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value, pct: ((value / total) * 100).toFixed(1) }));
}

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
      <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center mb-3`}>
        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}

function ChartSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
      <h3 className="text-sm font-bold text-[#0B1E51] uppercase tracking-wide mb-4">{title}</h3>
      {children}
    </div>
  );
}

export default function DashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<{ filename: string; analysis: Analysis } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/reports/${id}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#288ec9] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data?.analysis) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        Reporte no encontrado
      </div>
    );
  }

  const a = data.analysis;
  const conHijos = a.hijosFreq['Si'] || 0;
  const pctHijos = ((conHijos / a.totalResponses) * 100).toFixed(0);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-[#0B1E51] text-white sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="p-1.5 rounded-lg hover:bg-white/10">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <img
              src="https://www.mosca.com.uy/static/version1776454360/frontend/Mosca/vision/default/images/logo.png"
              alt="Mosca"
              className="h-8 w-auto"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <div>
              <h1 className="text-sm font-bold">Mosca Insights</h1>
              <p className="text-[10px] text-white/50">{data.filename}</p>
            </div>
          </div>
          <a
            href={`/api/reports/${id}/pdf`}
            className="flex items-center gap-2 px-4 py-2 bg-white text-[#0B1E51] rounded-lg text-sm font-semibold hover:bg-gray-100 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Exportar PDF
          </a>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Total respuestas" value={a.totalResponses} color="bg-[#0B1E51]" />
          <StatCard label="Con hijos" value={`${conHijos} (${pctHijos}%)`} color="bg-[#288ec9]" />
          <StatCard label="Taller #1" value={a.topTalleres[0]?.[0]?.split(',')[0] || '-'} color="bg-[#32BB05]" />
          <StatCard label="Producto #1" value={a.topProductos[0]?.[0] || '-'} color="bg-[#f59e0b]" />
        </div>

        {/* Insights */}
        <div className="bg-gradient-to-r from-[#0B1E51] to-[#288ec9] rounded-xl p-5 text-white">
          <h3 className="text-sm font-bold uppercase tracking-wide mb-3 text-white/80">Insights Accionables</h3>
          <div className="grid gap-2">
            {a.insights.map((ins, i) => (
              <p key={i} className="text-sm leading-relaxed">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/20 text-xs font-bold mr-2">{i + 1}</span>
                {ins}
              </p>
            ))}
          </div>
        </div>

        {/* Charts grid */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Pie: Hijos */}
          <ChartSection title="Tiene hijos/as">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={toPieData(a.hijosFreq)} dataKey="value" cx="50%" cy="50%" outerRadius={100} label={({ name, value }: any) => `${name} (${value})`}>
                  {toPieData(a.hijosFreq).map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </ChartSection>

          {/* Pie: Modalidad */}
          <ChartSection title="Modalidad preferida para talleres">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={toPieData(a.modalidadFreq)} dataKey="value" cx="50%" cy="50%" outerRadius={100} label={({ name, value }: any) => `${name} (${value})`}>
                  {toPieData(a.modalidadFreq).map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </ChartSection>

          {/* Pie: Dispositivo */}
          <ChartSection title="Dispositivo utilizado">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={toPieData(a.dispositivoFreq)} dataKey="value" cx="50%" cy="50%" outerRadius={100} label={({ name, value }: any) => `${name} (${value})`}>
                  {toPieData(a.dispositivoFreq).map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </ChartSection>

          {/* Pie: Cant hijos */}
          <ChartSection title="Cantidad de hijos por familia">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={toPieData(a.cantHijosFreq)} dataKey="value" cx="50%" cy="50%" outerRadius={100} label={({ name, value }: any) => `${name}: ${value}`}>
                  {toPieData(a.cantHijosFreq).map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </ChartSection>
        </div>

        {/* Full width bar charts */}
        <ChartSection title="Intereses de los hijos/as">
          <ResponsiveContainer width="100%" height={420}>
            <BarChart data={toChartData(a.interesesFreq, 13)} layout="vertical" margin={{ left: 180 }}>
              <XAxis type="number" />
              <YAxis type="category" dataKey="name" width={170} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v: any, _: any, props: any) => [v, props?.payload?.fullName || '']} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {toChartData(a.interesesFreq, 13).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartSection>

        <ChartSection title="Categorias de producto de interes">
          <ResponsiveContainer width="100%" height={420}>
            <BarChart data={toChartData(a.productosFreq, 13)} layout="vertical" margin={{ left: 220 }}>
              <XAxis type="number" />
              <YAxis type="category" dataKey="name" width={210} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v: any, _: any, props: any) => [v, props?.payload?.fullName || '']} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {toChartData(a.productosFreq, 13).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartSection>

        <ChartSection title="Tematicas de talleres mas solicitadas">
          <ResponsiveContainer width="100%" height={500}>
            <BarChart data={toChartData(a.talleresFreq, 15)} layout="vertical" margin={{ left: 260 }}>
              <XAxis type="number" />
              <YAxis type="category" dataKey="name" width={250} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v: any, _: any, props: any) => [v, props?.payload?.fullName || '']} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {toChartData(a.talleresFreq, 15).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartSection>

        {/* Word cloud simulation */}
        <ChartSection title="Nube de palabras — Intereses">
          <div className="flex flex-wrap gap-2 justify-center py-4">
            {Object.entries(a.interesesFreq)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 20)
              .map(([word, count], i) => {
                const maxCount = Object.values(a.interesesFreq).sort((a, b) => b - a)[0] || 1;
                const size = 14 + (count / maxCount) * 32;
                return (
                  <span
                    key={word}
                    className="font-bold transition-transform hover:scale-110 cursor-default"
                    style={{ fontSize: `${size}px`, color: COLORS[i % COLORS.length] }}
                    title={`${word}: ${count} menciones`}
                  >
                    {word}
                  </span>
                );
              })}
          </div>
        </ChartSection>

        <ChartSection title="Nube de palabras — Talleres">
          <div className="flex flex-wrap gap-2 justify-center py-4">
            {Object.entries(a.talleresFreq)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 20)
              .map(([word, count], i) => {
                const maxCount = Object.values(a.talleresFreq).sort((a, b) => b - a)[0] || 1;
                const size = 14 + (count / maxCount) * 32;
                return (
                  <span
                    key={word}
                    className="font-bold transition-transform hover:scale-110 cursor-default"
                    style={{ fontSize: `${size}px`, color: COLORS[i % COLORS.length] }}
                    title={`${word}: ${count} menciones`}
                  >
                    {word}
                  </span>
                );
              })}
          </div>
        </ChartSection>
      </main>
    </div>
  );
}
