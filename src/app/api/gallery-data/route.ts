import { NextResponse } from 'next/server';
import { galleryDataManager } from '@/storage/database/galleryDataManager';
import { GalleryConfig, normalizeGalleryConfig, EMPTY_GALLERY_CONFIG, flattenGalleryImages } from '@/lib/gallery';

// 从 Coze Coding 数据库读取配置
async function getConfigFromDatabase(): Promise<GalleryConfig> {
  try {
    const configRecord = await galleryDataManager.getConfig();

    if (configRecord && configRecord.configJson) {
      return JSON.parse(configRecord.configJson) as GalleryConfig;
    }
  } catch (error) {
    console.error('Error reading from database:', error);
  }

  // 数据库为空，返回空配置
  return EMPTY_GALLERY_CONFIG;
}

export async function GET() {
  try {
    // 并行获取配置和热度数据
    const [config, heatRecords] = await Promise.all([
      getConfigFromDatabase(),
      galleryDataManager.getHeatData(),
    ]);

    // 构建热度映射
    const heatMap = new Map(
      heatRecords.map((r) => [r.imageId, r.heat])
    );

    // 合并热度数据到图片
    const normalizedConfig = normalizeGalleryConfig(config);
    const images = flattenGalleryImages(normalizedConfig, heatMap);

    return NextResponse.json({
      config: normalizedConfig,
      images,
    });
  } catch (error) {
    console.error('GET /api/gallery-data error:', error);
    return NextResponse.json({ error: '读取数据失败。' }, { status: 500 });
  }
}
