import { eq, desc } from "drizzle-orm";
import { getDb } from "coze-coding-dev-sdk";
import { galleryConfig, imageHeat, GalleryConfig, InsertGalleryConfig, ImageHeat, InsertImageHeat } from "./shared/schema";
import * as schema from "./shared/schema";

export class GalleryDataManager {
  /**
   * 获取配置
   */
  async getConfig(): Promise<GalleryConfig | null> {
    try {
      const db = await getDb(schema);
      const result = await db.query.galleryConfig.findFirst({
        orderBy: [desc(galleryConfig.updatedAt)],
      });
      return result || null;
    } catch (error) {
      console.error('获取配置失败:', error);
      return null;
    }
  }

  /**
   * 保存配置
   */
  async saveConfig(configJson: string): Promise<GalleryConfig> {
    try {
      const db = await getDb(schema);
      const [result] = await db.insert(galleryConfig).values({
        configJson,
      }).returning();
      return result;
    } catch (error) {
      console.error('保存配置失败:', error);
      throw error;
    }
  }

  /**
   * 获取所有热度数据
   */
  async getHeatData(): Promise<ImageHeat[]> {
    try {
      const db = await getDb(schema);
      return await db.query.imageHeat.findMany();
    } catch (error) {
      console.error('获取热度数据失败:', error);
      return [];
    }
  }

  /**
   * 增加热度
   */
  async incrementHeat(imageId: string): Promise<boolean> {
    try {
      const db = await getDb(schema);
      
      // 查询现有热度
      const existing = await db.query.imageHeat.findFirst({
        where: eq(imageHeat.imageId, imageId),
      });

      if (existing) {
        // 更新热度
        await db.update(imageHeat)
          .set({
            heat: existing.heat + 1,
            updatedAt: new Date(),
          })
          .where(eq(imageHeat.id, existing.id));
      } else {
        // 新增热度记录
        await db.insert(imageHeat).values({
          imageId,
          heat: 1,
        });
      }

      return true;
    } catch (error) {
      console.error('更新热度失败:', error);
      return false;
    }
  }
}

export const galleryDataManager = new GalleryDataManager();
