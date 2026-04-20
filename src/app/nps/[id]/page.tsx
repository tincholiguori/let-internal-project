'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend,
} from 'recharts';

const COLORS = ['#0B1E51','#288ec9','#32BB05','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6'];
const NPS_COLORS = { promoter: '#32BB05', passive: '#f59e0b', detractor: '#ef4444' };

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="bg-white rounded-xl border p-4">
      <p className="text-xs text-gray-500 font-medium">{label}</p>
      <p className="text-2xl font-bold mt-1" style={{ color }}>{value}</p>
      {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function NpsDashboard({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'overview' | 'detractors' | 'comments' | 'monthly'>('overview');
  const [searchDetractor, setSearchDetractor] = useState('');
  const [searchComment, setSearchComment] = useState('');
  const [filterContact, setFilterContact] = useState<'all' | 'yes' | 'no'>('all');
  const [filterScore, setFilterScore] = useState<string>('all');
  const [filterContactComm, setFilterContactComm] = useState<'all' | 'yes' | 'no'>('all');
  const [filterScoreComm, setFilterScoreComm] = useState<string>('all');

  useEffect(() => {
    fetch(`/api/nps/reports/${id}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); });
  }, [id]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-10 h-10 border-4 border-[#288ec9] border-t-transparent rounded-full animate-spin" /></div>;
  if (!data?.analysis) return <div className="min-h-screen flex items-center justify-center text-gray-400">No encontrado</div>;

  const a = data.analysis;

  const tabs = [
    { key: 'overview', label: 'General', count: null },
    { key: 'detractors', label: 'Detractores', count: a.detractors },
    { key: 'comments', label: 'Comentarios', count: (a.negativeComments || []).length },
    { key: 'monthly', label: 'Mensual', count: null },
  ];

  const pieData = [
    { name: 'Promotores (9-10)', value: a.promoters, color: NPS_COLORS.promoter },
    { name: 'Pasivos (7-8)', value: a.passives, color: NPS_COLORS.passive },
    { name: 'Detractores (0-6)', value: a.detractors, color: NPS_COLORS.detractor },
  ];

  const scoreData = Object.entries(a.scoreDistribution as Record<string, number>)
    .sort(([x], [y]) => parseInt(x) - parseInt(y))
    .map(([score, count]) => ({
      score, count: count as number,
      fill: parseInt(score) >= 9 ? NPS_COLORS.promoter : parseInt(score) >= 7 ? NPS_COLORS.passive : NPS_COLORS.detractor,
    }));

  const catData = Object.entries(a.commentCategories as Record<string, number>)
    .sort((x, y) => (y[1] as number) - (x[1] as number))
    .map(([name, value]) => ({ name, value }));

  const storeData = (a.storeBreakdown || []).slice(0, 15).map((s: any) => ({
    name: s.store, nps: s.nps, count: s.count,
    fill: s.nps >= 50 ? NPS_COLORS.promoter : s.nps >= 0 ? NPS_COLORS.passive : NPS_COLORS.detractor,
  }));

  const filteredDetractors = (a.detractorEntries || []).filter((e: any) => {
    if (searchDetractor) {
      const q = searchDetractor.toLowerCase();
      if (!(e.email || '').toLowerCase().includes(q) && !(e.comment || '').toLowerCase().includes(q) && !(e.store || '').toLowerCase().includes(q)) return false;
    }
    if (filterContact === 'yes' && !e.wantsContact) return false;
    if (filterContact === 'no' && e.wantsContact) return false;
    if (filterScore !== 'all' && String(e.npsScore) !== filterScore) return false;
    return true;
  });

  const filteredComments = (a.negativeComments || []).filter((e: any) => {
    if (searchComment) {
      const q = searchComment.toLowerCase();
      if (!(e.email || '').toLowerCase().includes(q) && !(e.comment || '').toLowerCase().includes(q)) return false;
    }
    if (filterContactComm === 'yes' && !e.wantsContact) return false;
    if (filterContactComm === 'no' && e.wantsContact) return false;
    if (filterScoreComm !== 'all' && String(e.npsScore) !== filterScoreComm) return false;
    return true;
  });

  const npsColor = a.overallNps >= 50 ? '#32BB05' : a.overallNps >= 0 ? '#f59e0b' : '#ef4444';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#0B1E51] text-white">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/nps" className="p-1.5 rounded-lg hover:bg-white/10">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </Link>
          <div>
            <h1 className="text-base font-bold">NPS Dashboard</h1>
            <p className="text-[11px] text-white/50">{data.filename} — {a.totalResponses} respuestas</p>
          </div>
        </div>
      </header>

      {/* Tabs bar — separate from header, clean white background */}
      <div className="bg-white border-b sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 flex gap-1">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key as any)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition ${
                tab === t.key
                  ? 'border-[#0B1E51] text-[#0B1E51]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}>
              {t.label}
              {t.count !== null && (
                <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                  tab === t.key ? 'bg-[#0B1E51] text-white' : 'bg-gray-100 text-gray-500'
                }`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">

        {/* ==================== GENERAL ==================== */}
        {tab === 'overview' && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
              <div className="col-span-2 bg-white rounded-xl border p-6 flex flex-col items-center justify-center">
                <p className="text-6xl font-black" style={{ color: npsColor }}>{a.overallNps}</p>
                <p className="text-sm font-semibold text-gray-500 mt-1">Puntaje NPS</p>
              </div>
              <StatCard label="Respuestas" value={a.totalResponses} color="#0B1E51" />
              <StatCard label="Promotores" value={a.promoters} sub={`${(a.promoters / a.totalResponses * 100).toFixed(0)}%`} color="#32BB05" />
              <StatCard label="Pasivos" value={a.passives} sub={`${(a.passives / a.totalResponses * 100).toFixed(0)}%`} color="#f59e0b" />
              <StatCard label="Detractores" value={a.detractors} sub={`${(a.detractors / a.totalResponses * 100).toFixed(0)}%`} color="#ef4444" />
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl border p-5">
                <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-4">Distribucion NPS</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart><Pie data={pieData} dataKey="value" cx="50%" cy="50%" outerRadius={95} innerRadius={50} label={({ value }: any) => value}>{pieData.map((d, i) => <Cell key={i} fill={d.color} />)}</Pie><Tooltip /><Legend /></PieChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-white rounded-xl border p-5">
                <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-4">Distribucion por puntaje</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={scoreData}><XAxis dataKey="score" /><YAxis /><Tooltip /><Bar dataKey="count" radius={[4, 4, 0, 0]}>{scoreData.map((d, i) => <Cell key={i} fill={d.fill} />)}</Bar></BarChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-white rounded-xl border p-5">
                <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-4">Temas de los comentarios</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={catData} layout="vertical" margin={{ left: 140 }}><XAxis type="number" /><YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 12 }} /><Tooltip /><Bar dataKey="value" radius={[0, 4, 4, 0]}>{catData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Bar></BarChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-white rounded-xl border p-5">
                <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-4">NPS por local</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={storeData} layout="vertical" margin={{ left: 60 }}><XAxis type="number" domain={[-100, 100]} /><YAxis type="category" dataKey="name" width={50} tick={{ fontSize: 12 }} /><Tooltip /><Bar dataKey="nps" radius={[0, 4, 4, 0]}>{storeData.map((d: any, i: number) => <Cell key={i} fill={d.fill} />)}</Bar></BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-xl border p-5">
              <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-4">Evolucion NPS mensual</h3>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={a.monthlyTrend}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" tick={{ fontSize: 11 }} /><YAxis domain={[0, 100]} /><Tooltip /><Line type="monotone" dataKey="nps" stroke="#0B1E51" strokeWidth={3} dot={{ fill: '#0B1E51', r: 5 }} name="NPS" /></LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        {/* ==================== DETRACTORES ==================== */}
        {tab === 'detractors' && (
          <>
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-red-800 text-base">Detractores — Puntaje 0 a 6</h3>
                  <p className="text-xs text-red-600 mt-0.5">{filteredDetractors.length} personas con experiencia negativa</p>
                </div>
                <input
                  type="text" value={searchDetractor} onChange={(e) => setSearchDetractor(e.target.value)}
                  placeholder="Buscar email, comentario, local..."
                  className="px-3 py-2 text-sm border border-red-200 rounded-lg bg-white w-full sm:w-64"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select value={filterContact} onChange={(e) => setFilterContact(e.target.value as any)}
                  className="px-3 py-1.5 text-xs border border-red-200 rounded-lg bg-white text-gray-700">
                  <option value="all">Contacto: Todos</option>
                  <option value="yes">Quiere contacto</option>
                  <option value="no">No quiere contacto</option>
                </select>
                <select value={filterScore} onChange={(e) => setFilterScore(e.target.value)}
                  className="px-3 py-1.5 text-xs border border-red-200 rounded-lg bg-white text-gray-700">
                  <option value="all">Puntaje: Todos</option>
                  {[0,1,2,3,4,5,6].map(n => <option key={n} value={String(n)}>{n}</option>)}
                </select>
                {(filterContact !== 'all' || filterScore !== 'all' || searchDetractor) && (
                  <button onClick={() => { setFilterContact('all'); setFilterScore('all'); setSearchDetractor(''); }}
                    className="text-xs text-red-600 font-medium hover:underline">Limpiar filtros</button>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl border overflow-x-auto">
              <table className="w-full text-sm min-w-[800px]">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="text-center p-3 w-14">NPS</th>
                    <th className="text-left p-3">Email</th>
                    <th className="text-left p-3 w-16">Local</th>
                    <th className="text-center p-3 w-14">Exp.</th>
                    <th className="text-left p-3">Comentario</th>
                    <th className="text-left p-3 w-28">Fecha</th>
                    <th className="text-center p-3 w-20">Contactar</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredDetractors.map((e: any, i: number) => (
                    <tr key={i} className="hover:bg-red-50/50">
                      <td className="p-3 text-center">
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-white text-xs font-bold ${e.npsScore <= 3 ? 'bg-red-600' : 'bg-red-400'}`}>{e.npsScore}</span>
                      </td>
                      <td className="p-3">
                        <a href={`mailto:${e.email}`} className="text-[#288ec9] hover:underline font-medium text-sm">{e.email || '—'}</a>
                      </td>
                      <td className="p-3 text-gray-600 text-xs">{e.store || '—'}</td>
                      <td className="p-3 text-center text-gray-700 font-medium text-xs">{e.experience}/5</td>
                      <td className="p-3 text-gray-700 text-xs max-w-sm">
                        {e.comment ? (
                          <span>{e.comment}</span>
                        ) : (
                          <span className="text-gray-500 italic">Sin comentario</span>
                        )}
                      </td>
                      <td className="p-3 text-gray-600 text-xs whitespace-nowrap">{e.date?.slice(0, 16)}</td>
                      <td className="p-3 text-center">
                        {e.wantsContact ? (
                          <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-orange-100 text-orange-700">SI</span>
                        ) : (
                          <span className="text-gray-400 text-xs">No</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredDetractors.length === 0 && <p className="text-center text-gray-400 py-8 text-sm">Sin resultados</p>}
            </div>
          </>
        )}

        {/* ==================== COMENTARIOS ==================== */}
        {tab === 'comments' && (
          <>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-[#0B1E51] text-base">Comentarios negativos y neutros</h3>
                  <p className="text-xs text-blue-600 mt-0.5">{filteredComments.length} respuestas con feedback (puntaje 0-7)</p>
                </div>
                <input
                  type="text" value={searchComment} onChange={(e) => setSearchComment(e.target.value)}
                  placeholder="Buscar en comentarios o email..."
                  className="px-3 py-2 text-sm border border-blue-200 rounded-lg bg-white w-full sm:w-64"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select value={filterContactComm} onChange={(e) => setFilterContactComm(e.target.value as any)}
                  className="px-3 py-1.5 text-xs border border-blue-200 rounded-lg bg-white text-gray-700">
                  <option value="all">Contacto: Todos</option>
                  <option value="yes">Quiere contacto</option>
                  <option value="no">No quiere contacto</option>
                </select>
                <select value={filterScoreComm} onChange={(e) => setFilterScoreComm(e.target.value)}
                  className="px-3 py-1.5 text-xs border border-blue-200 rounded-lg bg-white text-gray-700">
                  <option value="all">Puntaje: Todos</option>
                  {[0,1,2,3,4,5,6,7].map(n => <option key={n} value={String(n)}>{n}</option>)}
                </select>
                {(filterContactComm !== 'all' || filterScoreComm !== 'all' || searchComment) && (
                  <button onClick={() => { setFilterContactComm('all'); setFilterScoreComm('all'); setSearchComment(''); }}
                    className="text-xs text-[#288ec9] font-medium hover:underline">Limpiar filtros</button>
                )}
              </div>
            </div>

            <div className="space-y-3">
              {filteredComments.map((e: any, i: number) => (
                <div key={i} className={`bg-white rounded-xl border p-4 ${e.npsScore <= 6 ? 'border-l-4 border-l-red-400' : 'border-l-4 border-l-yellow-400'}`}>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-3">
                      <span className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 ${
                        e.npsScore <= 3 ? 'bg-red-600' : e.npsScore <= 6 ? 'bg-red-400' : 'bg-yellow-500'
                      }`}>{e.npsScore}</span>
                      <div>
                        <a href={`mailto:${e.email}`} className="text-sm font-semibold text-[#288ec9] hover:underline">{e.email || 'Sin email'}</a>
                        <p className="text-xs text-gray-500">{e.date?.slice(0, 16)} {e.store && `— Local ${e.store}`} — Experiencia: {e.experience}/5</p>
                      </div>
                    </div>
                    {e.wantsContact && (
                      <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-orange-100 text-orange-700 shrink-0">QUIERE CONTACTO</span>
                    )}
                  </div>
                  <div className="ml-12 bg-gray-50 rounded-lg p-3">
                    <p className="text-sm text-gray-800 leading-relaxed">
                      <span className="font-semibold text-gray-500 text-xs uppercase block mb-1">Que podriamos mejorar:</span>
                      {e.comment}
                    </p>
                  </div>
                </div>
              ))}
              {filteredComments.length === 0 && <p className="text-center text-gray-400 py-8 text-sm">Sin resultados</p>}
            </div>
          </>
        )}

        {/* ==================== MENSUAL ==================== */}
        {tab === 'monthly' && (
          <>
            <div className="bg-white rounded-xl border p-5">
              <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-4">Evolucion mensual</h3>
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={a.monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" tick={{ fontSize: 11 }} /><YAxis /><Tooltip /><Legend />
                  <Line type="monotone" dataKey="nps" stroke="#0B1E51" strokeWidth={3} name="NPS" dot={{ fill: '#0B1E51', r: 5 }} />
                  <Line type="monotone" dataKey="promoters" stroke="#32BB05" strokeWidth={2} name="Promotores" />
                  <Line type="monotone" dataKey="detractors" stroke="#ef4444" strokeWidth={2} name="Detractores" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="text-left p-3">Mes</th>
                    <th className="text-center p-3">NPS</th>
                    <th className="text-center p-3">Respuestas</th>
                    <th className="text-center p-3">Promotores</th>
                    <th className="text-center p-3">Pasivos</th>
                    <th className="text-center p-3">Detractores</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(a.monthlyTrend || []).map((m: any) => (
                    <tr key={m.month} className="hover:bg-gray-50">
                      <td className="p-3 font-medium text-gray-800">{m.month}</td>
                      <td className="p-3 text-center">
                        <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-bold text-white ${m.nps >= 50 ? 'bg-green-500' : m.nps >= 0 ? 'bg-yellow-500' : 'bg-red-500'}`}>{m.nps}</span>
                      </td>
                      <td className="p-3 text-center text-gray-600">{m.total}</td>
                      <td className="p-3 text-center text-green-600 font-semibold">{m.promoters}</td>
                      <td className="p-3 text-center text-yellow-600">{m.passives}</td>
                      <td className="p-3 text-center text-red-600 font-semibold">{m.detractors}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
