import { promises as fs } from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

type ImageItem = {
  name: string;
  url: string;
  modifiedAt: number;
};

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.avif']);

async function readImageFilesRecursively(rootDir: string, currentDir: string): Promise<ImageItem[]> {
  const entries = await fs.readdir(currentDir, { withFileTypes: true });
  const items: ImageItem[] = [];

  for (const entry of entries) {
    const absolutePath = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      const nestedItems = await readImageFilesRecursively(rootDir, absolutePath);
      items.push(...nestedItems);
      continue;
    }

    const extension = path.extname(entry.name).toLowerCase();
    if (!IMAGE_EXTENSIONS.has(extension)) {
      continue;
    }

    const relativePath = path.relative(rootDir, absolutePath).split(path.sep).join('/');
    const stat = await fs.stat(absolutePath);
    items.push({
      name: entry.name,
      url: `/images/${relativePath}`,
      modifiedAt: stat.mtimeMs,
    });
  }

  return items;
}

export async function GET() {
  try {
    const imageRootDir = path.join(process.cwd(), 'public', 'images');
    const items = await readImageFilesRecursively(imageRootDir, imageRootDir);
    items.sort((leftItem, rightItem) => rightItem.modifiedAt - leftItem.modifiedAt);
    return NextResponse.json({ images: items });
  } catch {
    return NextResponse.json({ images: [] });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = (await request.json()) as { url?: string };
    const imageUrl = String(body?.url ?? '');
    if (!imageUrl.startsWith('/images/')) {
      return NextResponse.json({ error: '非法图片地址。' }, { status: 400 });
    }

    const imageRootDir = path.join(process.cwd(), 'public', 'images');
    const relativeImagePath = imageUrl.replace('/images/', '');
    const targetPath = path.resolve(imageRootDir, relativeImagePath);
    if (!targetPath.startsWith(path.resolve(imageRootDir))) {
      return NextResponse.json({ error: '非法删除路径。' }, { status: 400 });
    }

    await fs.unlink(targetPath);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: '删除失败或文件不存在。' }, { status: 500 });
  }
}
