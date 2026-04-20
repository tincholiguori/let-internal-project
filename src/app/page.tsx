'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface Report {
  id: string;
  filename: string;
  total_responses: number;
  created_at: string;
}

export default function HomePage() {
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');

  const loadReports = useCallback(async () => {
    const res = await fetch('/api/reports');
    const data = await res.json();
    setReports(data);
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handleUpload = async (file: File) => {
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      setError('Solo se aceptan archivos Excel (.xlsx, .xls) o CSV');
      return;
    }
    setError('');
    setUploading(true);
    const form = new FormData();
    form.append('file', file);

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al procesar');
      router.push(`/dashboard/${data.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/reports/${id}`, { method: 'DELETE' });
    loadReports();
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-[#0B1E51] text-white">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-lg font-black">M</div>
            <div>
              <h1 className="text-lg font-bold">Mosca Insights</h1>
              <p className="text-xs text-white/60">Dashboard de encuestas</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a href="/nps" className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium text-white transition">
              NPS
            </a>
            <button
              onClick={() => { fetch('/api/auth', { method: 'DELETE' }).then(() => window.location.href = '/login'); }}
              className="px-3 py-2 text-xs text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Upload area */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all mb-8 ${
            dragOver
              ? 'border-[#288ec9] bg-[#288ec9]/5 scale-[1.01]'
              : 'border-gray-300 hover:border-[#288ec9] bg-white'
          }`}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-[#288ec9] border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-500">Analizando datos...</p>
            </div>
          ) : (
            <>
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#0B1E51]/10 flex items-center justify-center">
                <svg className="w-8 h-8 text-[#0B1E51]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <p className="text-lg font-semibold text-gray-700 mb-1">
                Arrastra tu archivo Excel o haz clic para seleccionar
              </p>
              <p className="text-sm text-gray-400 mb-4">Formatos: .xlsx, .xls, .csv</p>
              <label className="inline-flex items-center gap-2 px-6 py-3 bg-[#0B1E51] text-white rounded-xl cursor-pointer hover:bg-[#0B1E51]/90 transition font-medium">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Subir archivo
                <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileInput} />
              </label>
            </>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-6">
            {error}
          </div>
        )}

        {/* Reports list */}
        {reports.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-4">Reportes anteriores</h2>
            <div className="space-y-3">
              {reports.map((r) => (
                <div
                  key={r.id}
                  className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between hover:shadow-md transition cursor-pointer"
                  onClick={() => router.push(`/dashboard/${r.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#32BB05]/10 flex items-center justify-center">
                      <svg className="w-5 h-5 text-[#32BB05]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-gray-900">{r.filename}</p>
                      <p className="text-xs text-gray-400">
                        {r.total_responses} respuestas
                        {' - '}
                        {new Date(r.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={`/api/reports/${r.id}/pdf`}
                      onClick={(e) => e.stopPropagation()}
                      className="px-3 py-1.5 text-xs font-medium bg-[#0B1E51] text-white rounded-lg hover:bg-[#0B1E51]/90"
                    >
                      PDF
                    </a>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(r.id); }}
                      className="px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
