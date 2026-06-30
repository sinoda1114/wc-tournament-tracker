import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const safeCode = code.toLowerCase().replace(/[^a-z-]/g, '');
  if (!safeCode) return NextResponse.json({ error: 'invalid' }, { status: 400 });

  const upstream = await fetch(`https://flagcdn.com/w80/${safeCode}.png`);
  if (!upstream.ok) return NextResponse.json({ error: 'not found' }, { status: 404 });

  return new NextResponse(upstream.body, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=2592000, immutable',
    },
  });
}
