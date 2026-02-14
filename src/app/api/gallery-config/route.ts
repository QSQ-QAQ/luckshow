import { promises as fs } from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import { GalleryConfig, normalizeGalleryConfig } from '@/lib/gallery';

export const runtime = 'nodejs';

const GALLERY_CONFIG_PATH = path.join(process.cwd(), 'public', 'gallery.json');

export async function GET() {
  try {
    const raw = await fs.readFile(GALLERY_CONFIG_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as GalleryConfig;
    return NextResponse.json(normalizeGalleryConfig(parsed));
  } catch {
    return NextResponse.json({ error: '读取 gallery 配置失败。' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as GalleryConfig;
    const normalized = normalizeGalleryConfig(body);
    await fs.writeFile(GALLERY_CONFIG_PATH, `${JSON.stringify(normalized, null, 2)}\n`, 'utf-8');
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: '保存 gallery 配置失败。' }, { status: 500 });
  }
}
