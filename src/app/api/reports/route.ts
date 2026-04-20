import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const db = getDb();
  const reports = db
    .prepare('SELECT id, filename, total_responses, created_at FROM reports ORDER BY created_at DESC')
    .all();
  return NextResponse.json(reports);
}
