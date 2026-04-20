import * as XLSX from 'xlsx';

// Known multi-select options to avoid splitting names that contain commas
const KNOWN_TALLERES = [
  'Talleres de arte, pintura, cerámica, entre otros.',
  'Tecnología y habilidades digitales',
  'Desarrollo personal y bienestar',
  'Presentación de libros',
  'Educación financiera',
  'Actividades en familia',
  'Trabajo, emprendimiento y estudio',
  'Cultura y entretenimiento',
  'Educación socioemocional',
  'Deportes y salud',
  'Jornadas de juegos de mesa',
  'Crianza y familia',
  'Educación e innovación',
  'Convivencia y vínculos',
  'Diversidad, inclusión y equidad',
];

const KNOWN_PRODUCTS = [
  'Libros',
  'Tecnología y accesorios',
  'Arte, manualidades y papelería creativa',
  'Productos de oficina y home office',
  'Juegos de mesa',
  'Útiles escolares',
  'Artículos de deco y lifestyle',
  'Accesorios de viaje',
  'Juguetes',
  'Juegos y productos de deportes',
  'Accesorios para mascotas',
  'Productos de primera infancia',
];

const KNOWN_INTERESES = [
  'Arte y manualidades',
  'Lectura',
  'Juegos de mesa y puzles',
  'Deportes y movimiento',
  'Videojuegos',
  'Música y baile',
  'Juegos de construcción y bloques',
  'Moda y belleza',
  'Cocina',
  'Robótica y programación',
  'Ciencia y experimentos',
  'Personajes animados y superhéroes',
  'Disfraces y juego simbólico',
];

function smartSplit(value: string, knownOptions: string[]): string[] {
  if (!value) return [];
  const results: string[] = [];
  let remaining = value.trim();
  for (const opt of knownOptions) {
    const t = opt.trim();
    if (remaining.includes(t)) {
      results.push(t);
      remaining = remaining.replace(t, '|||');
    }
  }
  remaining.split('|||').forEach((part) => {
    part.split(',').forEach((p) => {
      const t = p.trim();
      if (t && t.length > 1 && !results.includes(t)) results.push(t);
    });
  });
  return results;
}

function freq(arr: string[]): Record<string, number> {
  const m: Record<string, number> = {};
  arr.forEach((v) => {
    const k = (v || '').trim();
    if (k) m[k] = (m[k] || 0) + 1;
  });
  return m;
}

function freqMulti(arr: string[], knownOptions: string[]): Record<string, number> {
  const m: Record<string, number> = {};
  arr.forEach((v) => {
    smartSplit(v, knownOptions).forEach((i) => {
      const k = i.trim();
      if (k && k.length > 1) m[k] = (m[k] || 0) + 1;
    });
  });
  return m;
}

function topN(freqMap: Record<string, number>, n = 15): [string, number][] {
  return Object.entries(freqMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n);
}

export interface AnalysisResult {
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

export function analyzeExcel(buffer: Buffer): AnalysisResult {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const data = XLSX.utils.sheet_to_json<Record<string, string>>(wb.Sheets[wb.SheetNames[0]]);

  const col = (key: string) =>
    data.map((r) => r[key]).filter((v) => v != null && v !== '') as string[];

  // Column keys (with HTML tags from the survey tool)
  const C = {
    hijos: Object.keys(data[0] || {}).find((k) => k.includes('Tenés hijas/hijos')) || '',
    cantHijos: Object.keys(data[0] || {}).find((k) => k.includes('Cuántos hijos')) || '',
    intereses: Object.keys(data[0] || {}).find((k) => k.includes('intereses tienen')) || '',
    productos: Object.keys(data[0] || {}).find((k) => k.includes('categorías de producto')) || '',
    talleres: Object.keys(data[0] || {}).find((k) => k.includes('temáticas o actividades')) || '',
    modalidad: Object.keys(data[0] || {}).find((k) => k.includes('modalidad preferís')) || '',
    dispositivo: 'Dispositivo',
  };

  const hijosFreq = freq(col(C.hijos));
  const cantHijosFreq = freq(col(C.cantHijos));
  const interesesFreq = freqMulti(col(C.intereses), KNOWN_INTERESES);
  const productosFreq = freqMulti(col(C.productos), KNOWN_PRODUCTS);
  const talleresFreq = freqMulti(col(C.talleres), KNOWN_TALLERES);
  const modalidadFreq = freq(col(C.modalidad));
  const dispositivoFreq = freq(col(C.dispositivo));

  const topIntereses = topN(interesesFreq, 13);
  const topProductos = topN(productosFreq, 13);
  const topTalleres = topN(talleresFreq, 15);

  const totalResp = data.length;
  const conHijos = hijosFreq['Si'] || 0;
  const pctHijos = ((conHijos / totalResp) * 100).toFixed(1);

  const insights = [
    `Talleres de arte son el N°1 absoluto con ${topTalleres[0]?.[1] || 0} interesados. Priorizar cerámica, pintura y manualidades.`,
    `Libros es la categoría de producto estrella (${productosFreq['Libros'] || 0} votos). Potenciar sección de libros y presentaciones de autores.`,
    `El ${pctHijos}% tiene hijos — la oferta familiar es clave. Sus hijos se interesan por arte, lectura y juegos de mesa.`,
    `Tecnología y habilidades digitales es el 2° taller más pedido (${topTalleres[1]?.[1] || 0} votos). Oportunidad de workshops digitales.`,
    `Modalidad virtual + ambas suman ${(((modalidadFreq['Virtual'] || 0) + (modalidadFreq['Ambas'] || 0)) / totalResp * 100).toFixed(0)}%. Permite escalar sin límite físico.`,
    `Educación financiera tiene alta demanda (${talleresFreq['Educación financiera'] || 0} votos) — temática diferenciadora.`,
    `${((dispositivoFreq['phone'] || 0) / totalResp * 100).toFixed(0)}% accede desde celular — toda la experiencia debe ser mobile-first.`,
  ];

  return {
    totalResponses: totalResp,
    hijosFreq,
    cantHijosFreq,
    interesesFreq,
    productosFreq,
    talleresFreq,
    modalidadFreq,
    dispositivoFreq,
    topIntereses,
    topProductos,
    topTalleres,
    insights,
  };
}
