import { NextResponse } from 'next/server';
import { overlaySession } from '@/lib/store';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const s = overlaySession((await params).token);
  return NextResponse.json(s ? { featured: s.engine.featured, mode: 'demo' } : { error: 'Overlay session expired.' }, { status: s ? 200 : 404, headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } });
}
