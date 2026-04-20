'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface NpsReport {
  id: string;
  filename: string;
  total_responses: number;
  overall_nps: number;
  created_at: string;
}

export default function NpsPage() {
  const router = useRouter();
  const [reports, setReports] = useState<NpsReport[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const res = await fetch('/api/nps/reports');
    setReports(await res.json());
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleUpload = async (file: File) => {
    setError('');
    setUploading(true);
    const form = new FormData();
    form.append('file', file);
    try {
      const res = await fetch('/api/nps/upload', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error');
      router.push(`/nps/${data.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <header className="bg-[#0B1E51] text-white">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="https://www.mosca.com.uy/static/version1776454360/frontend/Mosca/vision/default/images/logo.png" alt="Mosca" className="h-10 w-auto" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            <div>
              <h1 className="text-lg font-bold">NPS Dashboard</h1>
              <p className="text-xs text-white/60">Análisis de satisfacción</p>
            </div>
          </div>
          <Link href="/" className="px-3 py-1.5 text-xs bg-white/10 rounded-lg hover:bg-white/20">Encuestas</Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleUpload(f); }}
          className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all mb-8 ${dragOver ? 'border-[#288ec9] bg-[#288ec9]/5' : 'border-gray-300 bg-white'}`}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-[#288ec9] border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-500">Analizando NPS...</p>
            </div>
          ) : (
            <>
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#0B1E51]/10 flex items-center justify-center">
                <svg className="w-8 h-8 text-[#0B1E51]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <p className="text-lg font-semibold text-gray-700 mb-1">Subi tu reporte NPS (Excel)</p>
              <p className="text-sm text-gray-400 mb-4">Se analizará automáticamente</p>
              <label className="inline-flex items-center gap-2 px-6 py-3 bg-[#0B1E51] text-white rounded-xl cursor-pointer hover:bg-[#0B1E51]/90 font-medium">
                Subir archivo
                <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }} />
              </label>
            </>
          )}
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-6">{error}</div>}

        {reports.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-4">Reportes NPS</h2>
            <div className="space-y-3">
              {reports.map((r) => (
                <div key={r.id} className="bg-white rounded-xl border p-4 flex items-center justify-between hover:shadow-md transition cursor-pointer" onClick={() => router.push(`/nps/${r.id}`)}>
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-white text-sm ${r.overall_nps >= 50 ? 'bg-[#32BB05]' : r.overall_nps >= 0 ? 'bg-[#f59e0b]' : 'bg-[#ef4444]'}`}>
                      {r.overall_nps}
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-gray-900">{r.filename}</p>
                      <p className="text-xs text-gray-400">{r.total_responses} respuestas — {new Date(r.created_at).toLocaleDateString('es-AR')}</p>
                    </div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); fetch(`/api/nps/reports/${r.id}`, { method: 'DELETE' }).then(() => load()); }} className="text-xs text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg">Eliminar</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
