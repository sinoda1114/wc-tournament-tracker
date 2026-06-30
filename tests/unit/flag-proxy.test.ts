import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GET } from '@/app/api/flag/[code]/route';
import { NextRequest } from 'next/server';

function makeReq(code: string) {
  return new NextRequest(`http://localhost/api/flag/${code}`);
}
function makeParams(code: string) {
  return { params: Promise.resolve({ code }) };
}

describe('GET /api/flag/[code]', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('PNG 画像を 30 日キャッシュ付きで返す', async () => {
    const body = new Uint8Array([0x89, 0x50, 0x4e, 0x47]); // PNG magic bytes
    const upstream = new Response(body, {
      status: 200,
      headers: { 'Content-Type': 'image/png' },
    });
    vi.mocked(fetch).mockResolvedValue(upstream);

    const res = await GET(makeReq('br'), makeParams('br'));

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('image/png');
    expect(res.headers.get('Cache-Control')).toContain('max-age=2592000');
    expect(fetch).toHaveBeenCalledWith('https://flagcdn.com/w80/br.png');
  });

  it('コードを小文字・英字のみにサニタイズして upstream に渡す', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(new Uint8Array(), { status: 200 }));
    await GET(makeReq('BR'), makeParams('BR'));
    expect(fetch).toHaveBeenCalledWith('https://flagcdn.com/w80/br.png');
  });

  it('コードが空なら 400 を返す', async () => {
    const res = await GET(makeReq(''), makeParams(''));
    expect(res.status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('upstream が 404 なら 404 を返す', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 404 }));
    const res = await GET(makeReq('xx'), makeParams('xx'));
    expect(res.status).toBe(404);
  });

  it('gb-eng (ハイフン含む) を通過させる', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(new Uint8Array(), { status: 200 }));
    await GET(makeReq('gb-eng'), makeParams('gb-eng'));
    expect(fetch).toHaveBeenCalledWith('https://flagcdn.com/w80/gb-eng.png');
  });
});
