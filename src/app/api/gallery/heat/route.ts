import { NextResponse } from 'next/server';
import { galleryDataManager } from '@/storage/database/galleryDataManager';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { imageId?: string };
    const imageId = String(body?.imageId ?? '').trim();

    if (!imageId) {
      return NextResponse.json({ error: '缺少 imageId。' }, { status: 400 });
    }

    const success = await galleryDataManager.incrementHeat(imageId);

    if (!success) {
      return NextResponse.json({ error: '热度更新失败。' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('POST /api/gallery/heat error:', error);
    return NextResponse.json({ error: '热度更新失败。' }, { status: 500 });
  }
}
