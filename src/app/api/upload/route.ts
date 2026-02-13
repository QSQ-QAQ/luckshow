import { promises as fs } from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

function sanitizeFileName(fileName: string): string {
  const extension = path.extname(fileName).toLowerCase();
  const baseName = path.basename(fileName, extension);
  const safeBaseName = baseName.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/-+/g, '-').slice(0, 40);
  return `${safeBaseName || 'image'}-${Date.now()}${extension || '.png'}`;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const rawFile = formData.get('file');

    if (!(rawFile instanceof File)) {
      return NextResponse.json({ error: '未接收到图片文件。' }, { status: 400 });
    }

    const fileName = sanitizeFileName(rawFile.name);
    const targetDir = path.join(process.cwd(), 'public', 'images');
    const targetPath = path.join(targetDir, fileName);

    await fs.mkdir(targetDir, { recursive: true });

    const arrayBuffer = await rawFile.arrayBuffer();
    await fs.writeFile(targetPath, Buffer.from(arrayBuffer));

    return NextResponse.json({
      ok: true,
      url: `/images/${fileName}`,
      name: fileName,
    });
  } catch {
    return NextResponse.json({ error: '上传失败，请稍后重试。' }, { status: 500 });
  }
}
