/**
 * Coze 扣子数据库 - luckshop 适配层
 *
 * 数据库ID: 7606578345710731310
 * 数据库名称: luckshop
 * 表结构: 单表多类型（record_type: config | heat）
 */

// 记录类型
export type RecordType = 'config' | 'heat';

// 数据记录接口
export interface LuckshopRecord {
  id: number;
  sys_platform: string;
  uuid: string;
  bstudio_create_time: string;
  record_type: RecordType;
  record_key: string;
  config_json?: string;
  heat?: number;
}

// 配置数据
export interface ConfigRecord extends Omit<LuckshopRecord, 'config_json' | 'heat'> {
  record_type: 'config';
  record_key: 'main';
  config_json: string;
}

// 热度数据
export interface HeatRecord extends Omit<LuckshopRecord, 'config_json' | 'heat'> {
  record_type: 'heat';
  record_key: string; // 商品ID
  heat: number;
}

/**
 * Coze 数据库客户端类
 */
export class CozeLuckshopClient {
  private databaseId: string;

  constructor(databaseId: string = '7606578345710731310') {
    this.databaseId = databaseId;
  }

  /**
   * 获取配置记录
   */
  async getConfig(): Promise<ConfigRecord | null> {
    try {
      // TODO: 替换为真实的 Coze API 调用
      // 示例（伪代码）：
      // const response = await fetch(`https://api.coze.cn/v1/database/${this.databaseId}/query`, {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Bearer ${process.env.COZE_API_TOKEN}`,
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({
      //     filter: {
      //       record_type: 'config',
      //       record_key: 'main',
      //     },
      //     limit: 1,
      //   }),
      // });
      // const data = await response.json();
      // return data.items[0] || null;

      // 临时模拟实现（读取本地文件）
      const fs = (await import('fs')).promises;
      const path = await import('path');
      const configPath = path.join(process.cwd(), 'public', 'gallery.json');
      const raw = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(raw);

      return {
        id: 1,
        sys_platform: 'coze',
        uuid: 'system',
        bstudio_create_time: new Date().toISOString(),
        record_type: 'config',
        record_key: 'main',
        config_json: JSON.stringify(config, null, 2),
      };
    } catch (error) {
      console.error('获取配置失败:', error);
      return null;
    }
  }

  /**
   * 保存配置
   */
  async saveConfig(configJson: string): Promise<boolean> {
    try {
      // TODO: 替换为真实的 Coze API 调用
      // 示例（伪代码）：
      // await fetch(`https://api.coze.cn/v1/database/${this.databaseId}/upsert`, {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Bearer ${process.env.COZE_API_TOKEN}`,
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({
      //     record_type: 'config',
      //     record_key: 'main',
      //     config_json,
      //   }),
      // });

      // 临时模拟实现（写入本地文件）
      const fs = (await import('fs')).promises;
      const path = await import('path');
      const configPath = path.join(process.cwd(), 'public', 'gallery.json');
      await fs.writeFile(configPath, configJson, 'utf-8');

      return true;
    } catch (error) {
      console.error('保存配置失败:', error);
      return false;
    }
  }

  /**
   * 获取所有热度数据
   */
  async getHeatData(): Promise<HeatRecord[]> {
    try {
      // TODO: 替换为真实的 Coze API 调用
      // 示例（伪代码）：
      // const response = await fetch(`https://api.coze.cn/v1/database/${this.databaseId}/query`, {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Bearer ${process.env.COZE_API_TOKEN}`,
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({
      //     filter: { record_type: 'heat' },
      //   }),
      // });
      // const data = await response.json();
      // return data.items;

      // 临时模拟实现（从文件中解析热度）
      const fs = (await import('fs')).promises;
      const path = await import('path');
      const configPath = path.join(process.cwd(), 'public', 'gallery.json');
      const raw = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(raw);

      const heatData: HeatRecord[] = [];
      let id = 1000;

      for (const group of config.groups) {
        for (const image of group.images) {
          if (image.heat > 0) {
            heatData.push({
              id: id++,
              sys_platform: 'coze',
              uuid: 'system',
              bstudio_create_time: new Date().toISOString(),
              record_type: 'heat',
              record_key: String(image.id),
              heat: image.heat,
            });
          }
        }
      }

      return heatData;
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
      // TODO: 替换为真实的 Coze API 调用
      // 示例（伪代码）：
      // // 1. 查询现有热度
      // const existing = await fetch(`https://api.coze.cn/v1/database/${this.databaseId}/query`, {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Bearer ${process.env.COZE_API_TOKEN}`,
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({
      //     filter: {
      //       record_type: 'heat',
      //       record_key: imageId,
      //     },
      //   }),
      // });
      // const data = await existing.json();
      //
      // // 2. 更新或插入
      // if (data.items.length > 0) {
      //   await fetch(`https://api.coze.cn/v1/database/${this.databaseId}/update`, {
      //     method: 'POST',
      //     body: JSON.stringify({
      //       id: data.items[0].id,
      //       heat: data.items[0].heat + 1,
      //     }),
      //   });
      // } else {
      //   await fetch(`https://api.coze.cn/v1/database/${this.databaseId}/insert`, {
      //     method: 'POST',
      //     body: JSON.stringify({
      //         record_type: 'heat',
      //         record_key: imageId,
      //         heat: 1,
      //       }),
      //   });
      // }

      // 临时模拟实现（修改本地文件）
      const fs = (await import('fs')).promises;
      const path = await import('path');
      const configPath = path.join(process.cwd(), 'public', 'gallery.json');
      const raw = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(raw);

      let found = false;
      for (const group of config.groups) {
        for (const image of group.images) {
          if (String(image.id) === imageId) {
            image.heat = (image.heat || 0) + 1;
            found = true;
            break;
          }
        }
        if (found) break;
      }

      if (found) {
        await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
        return true;
      }

      return false;
    } catch (error) {
      console.error('更新热度失败:', error);
      return false;
    }
  }
}

// 导出单例
export const cozeLuckshop = new CozeLuckshopClient('7606578345710731310');
