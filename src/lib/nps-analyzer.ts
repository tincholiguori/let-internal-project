import * as XLSX from 'xlsx';

export interface NpsEntry {
  date: string;
  email: string;
  store: string;
  experience: number;
  npsScore: number;
  comment: string;
  wantsContact: boolean;
  category: 'promoter' | 'passive' | 'detractor';
}

export interface NpsMonthly {
  month: string;
  promoters: number;
  passives: number;
  detractors: number;
  total: number;
  nps: number;
}

export interface NpsAnalysis {
  totalResponses: number;
  overallNps: number;
  promoters: number;
  passives: number;
  detractors: number;
  avgExperience: number;
  wantContact: number;
  totalComments: number;
  scoreDistribution: Record<string, number>;
  experienceDistribution: Record<string, number>;
  storeBreakdown: { store: string; count: number; nps: number }[];
  monthlyTrend: NpsMonthly[];
  detractorEntries: NpsEntry[];
  negativeComments: NpsEntry[];
  allEntries: NpsEntry[];
  commentCategories: Record<string, number>;
}

function categorizeComment(comment: string): string[] {
  const lower = comment.toLowerCase();
  const cats: string[] = [];
  if (/atenci[oó]n|asesor|personal|vendedor|cajera|emplead/i.test(lower)) cats.push('Atención al cliente');
  if (/precio|caro|descuento|promoci[oó]n|oferta|tarjeta|banco|ita[uú]/i.test(lower)) cats.push('Precios y descuentos');
  if (/stock|variedad|surtido|falt[ao]|no hab[ií]a|agotad/i.test(lower)) cats.push('Stock y variedad');
  if (/caja|fila|cola|espera|demora|r[aá]pid|lent/i.test(lower)) cats.push('Tiempo de espera');
  if (/web|online|p[aá]gina|env[ií]o|delivery|compra online/i.test(lower)) cats.push('E-commerce');
  if (/local|limpi|orden|espacio|ambiente|estacion/i.test(lower)) cats.push('Local y ambiente');
  if (/product|calidad|marca/i.test(lower)) cats.push('Calidad de productos');
  if (/horario|hora/i.test(lower)) cats.push('Horarios');
  if (cats.length === 0 && lower.length > 5) cats.push('Otros');
  return cats;
}

function cleanEmail(raw: string): string {
  if (!raw) return '';
  return raw.replace(/<\d+>/, '').trim();
}

export function analyzeNps(buffer: Buffer): NpsAnalysis {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const data = XLSX.utils.sheet_to_json<Record<string, any>>(wb.Sheets[wb.SheetNames[0]]);

  // Collect ALL unique keys across every row (some keys only appear in rows that have that field filled)
  const allKeys = new Set<string>();
  data.forEach(r => Object.keys(r).forEach(k => allKeys.add(k)));
  const keys = [...allKeys];

  const scoreKey = keys.find(k => k.includes('escala del 0 al 10')) || '';
  const expKey = keys.find(k => k.includes('calificar')) || '';
  const commentKey = keys.find(k => k.includes('mejorar')) || '';
  const contactKey = keys.find(k => k.includes('contactemos')) || '';

  const allEntries: NpsEntry[] = [];
  const scoreDistribution: Record<string, number> = {};
  const experienceDistribution: Record<string, number> = {};
  const commentCategories: Record<string, number> = {};
  const storeMap: Record<string, { scores: number[]; total: number }> = {};
  const monthMap: Record<string, { p: number; pa: number; d: number; total: number }> = {};

  let totalScore = 0;
  let totalExp = 0;
  let expCount = 0;
  let wantContact = 0;
  let totalComments = 0;

  for (const row of data) {
    const npsScore = parseInt(row[scoreKey]);
    if (isNaN(npsScore)) continue;

    const experience = parseInt(row[expKey]) || 0;
    const comment = (row[commentKey] || '').toString().trim();
    const date = (row['Registro'] || '').toString();
    const email = cleanEmail((row['email'] || '').toString());
    const store = (row['icommkt_store_ultima_compra'] || '').toString().trim();
    const wants = (row[contactKey] || '').toString().trim() === 'Si';

    const category: 'promoter' | 'passive' | 'detractor' =
      npsScore >= 9 ? 'promoter' : npsScore >= 7 ? 'passive' : 'detractor';

    const entry: NpsEntry = { date, email, store, experience, npsScore, comment, wantsContact: wants, category };
    allEntries.push(entry);

    scoreDistribution[String(npsScore)] = (scoreDistribution[String(npsScore)] || 0) + 1;
    if (experience) {
      experienceDistribution[String(experience)] = (experienceDistribution[String(experience)] || 0) + 1;
      totalExp += experience;
      expCount++;
    }
    totalScore++;
    if (wants) wantContact++;
    if (comment && comment.length > 2) {
      totalComments++;
      categorizeComment(comment).forEach(cat => {
        commentCategories[cat] = (commentCategories[cat] || 0) + 1;
      });
    }

    if (store) {
      if (!storeMap[store]) storeMap[store] = { scores: [], total: 0 };
      storeMap[store].scores.push(npsScore);
      storeMap[store].total++;
    }

    const month = date.slice(0, 7);
    if (month) {
      if (!monthMap[month]) monthMap[month] = { p: 0, pa: 0, d: 0, total: 0 };
      monthMap[month].total++;
      if (npsScore >= 9) monthMap[month].p++;
      else if (npsScore <= 6) monthMap[month].d++;
      else monthMap[month].pa++;
    }
  }

  const promoters = allEntries.filter(e => e.category === 'promoter').length;
  const passives = allEntries.filter(e => e.category === 'passive').length;
  const detractors = allEntries.filter(e => e.category === 'detractor').length;
  const overallNps = parseFloat(((promoters - detractors) / totalScore * 100).toFixed(1));

  const storeBreakdown = Object.entries(storeMap)
    .map(([store, data]) => {
      const p = data.scores.filter(s => s >= 9).length;
      const d = data.scores.filter(s => s <= 6).length;
      return { store, count: data.total, nps: parseFloat(((p - d) / data.total * 100).toFixed(1)) };
    })
    .sort((a, b) => b.count - a.count);

  const monthlyTrend: NpsMonthly[] = Object.entries(monthMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, d]) => ({
      month,
      promoters: d.p,
      passives: d.pa,
      detractors: d.d,
      total: d.total,
      nps: parseFloat(((d.p - d.d) / d.total * 100).toFixed(1)),
    }));

  // ALL detractors (with or without comment) — sorted by date desc
  const detractorEntries = allEntries
    .filter(e => e.category === 'detractor')
    .sort((a, b) => b.date.localeCompare(a.date));

  // ALL negative comments (any score) — for the comments section
  const negativeComments = allEntries
    .filter(e => e.comment && e.comment.length > 3 && e.npsScore <= 7)
    .sort((a, b) => b.date.localeCompare(a.date));

  return {
    totalResponses: totalScore,
    overallNps,
    promoters,
    passives,
    detractors,
    avgExperience: expCount > 0 ? parseFloat((totalExp / expCount).toFixed(2)) : 0,
    wantContact,
    totalComments,
    scoreDistribution,
    experienceDistribution,
    storeBreakdown,
    monthlyTrend,
    detractorEntries,
    negativeComments,
    allEntries,
    commentCategories,
  };
}
