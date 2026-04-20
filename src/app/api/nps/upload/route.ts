import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '@/lib/db';
import { analyzeNps } from '@/lib/nps-analyzer';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const analysis = analyzeNps(buffer);
  const id = uuidv4();

  // Don't store allEntries in DB to save space — only aggregated + detractors + negative comments
  const { allEntries, detractorEntries, negativeComments, ...aggregated } = analysis;
  const toStore = {
    ...aggregated,
    detractorEntries: detractorEntries.slice(0, 500),
    negativeComments: negativeComments.slice(0, 500),
  };

  const db = getDb();
  db.prepare(
    'INSERT INTO nps_reports (id, filename, total_responses, overall_nps, analysis_json) VALUES (?, ?, ?, ?, ?)',
  ).run(id, file.name, analysis.totalResponses, analysis.overallNps, JSON.stringify(toStore));

  return NextResponse.json({ id, filename: file.name, totalResponses: analysis.totalResponses, nps: analysis.overallNps });
}
