import { promises as fs } from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import { GalleryConfig, normalizeGalleryConfig } from '@/lib/gallery';

export const runtime = 'nodejs';

const GALLERY_CONFIG_PATH = path.join(process.cwd(), 'public', 'gallery.json');

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { imageId?: string };
    const imageId = String(body?.imageId ?? '').trim();
    if (!imageId) {
      return NextResponse.json({ error: '缺少 imageId。' }, { status: 400 });
    }

    const raw = await fs.readFile(GALLERY_CONFIG_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as GalleryConfig;
    const normalized = normalizeGalleryConfig(parsed);

    let found = false;
    const nextConfig: GalleryConfig = {
      ...normalized,
      groups: normalized.groups.map((group) => ({
        ...group,
        images: group.images.map((image) => {
          if (String(image.id) !== imageId) {
            return image;
          }
          found = true;
          return {
            ...image,
            heat: (image.heat ?? 0) + 1,
          };
        }),
      })),
    };

    if (!found) {
      return NextResponse.json({ error: '未找到对应图片。' }, { status: 404 });
    }

    await fs.writeFile(GALLERY_CONFIG_PATH, `${JSON.stringify(nextConfig, null, 2)}\n`, 'utf-8');
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: '热度更新失败。' }, { status: 500 });
  }
}
