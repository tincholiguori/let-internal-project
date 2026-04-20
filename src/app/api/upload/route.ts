import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '@/lib/db';
import { analyzeExcel } from '@/lib/analyzer';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const analysis = analyzeExcel(buffer);
  const id = uuidv4();

  const db = getDb();
  db.prepare(
    'INSERT INTO reports (id, filename, total_responses, analysis_json) VALUES (?, ?, ?, ?)',
  ).run(id, file.name, analysis.totalResponses, JSON.stringify(analysis));

  return NextResponse.json({ id, filename: file.name, totalResponses: analysis.totalResponses });
}
