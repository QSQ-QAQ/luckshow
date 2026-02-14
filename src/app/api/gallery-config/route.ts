import { NextResponse } from 'next/server';
import { galleryDataManager } from '@/storage/database/galleryDataManager';
import { GalleryConfig, normalizeGalleryConfig, EMPTY_GALLERY_CONFIG } from '@/lib/gallery';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const configRecord = await galleryDataManager.getConfig();

    if (!configRecord) {
      return NextResponse.json(normalizeGalleryConfig(EMPTY_GALLERY_CONFIG));
    }

    const config = JSON.parse(configRecord.configJson) as GalleryConfig;
    return NextResponse.json(normalizeGalleryConfig(config));
  } catch (error) {
    console.error('GET /api/gallery-config error:', error);
    return NextResponse.json({ error: '读取 gallery 配置失败。' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as GalleryConfig;
    const normalized = normalizeGalleryConfig(body);
    const configJson = JSON.stringify(normalized, null, 2);

    await galleryDataManager.saveConfig(configJson);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('PUT /api/gallery-config error:', error);
    return NextResponse.json({ error: '保存 gallery 配置失败。' }, { status: 500 });
  }
}
