import { galleryDataManager } from "../src/storage/database/galleryDataManager";
import { promises as fs } from "fs";
import path from "path";

async function initDatabase() {
  try {
    console.log("开始初始化 Coze Coding PostgreSQL 数据库...");

    // 从备份文件读取配置
    const configPath = path.join(process.cwd(), "scripts", "backup", "gallery.json.bak");
    const raw = await fs.readFile(configPath, "utf-8");
    const config = JSON.parse(raw);

    // 保存配置到数据库
    console.log("正在保存配置到数据库...");
    await galleryDataManager.saveConfig(JSON.stringify(config, null, 2));

    console.log("数据库初始化完成！");
    console.log("- 配置已保存");
    console.log("- 热度数据将自动创建");
  } catch (error) {
    console.error("数据库初始化失败:", error);
    process.exit(1);
  }
}

initDatabase();
