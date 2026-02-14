# 数据库使用指南

本项目使用 **Coze Coding PostgreSQL 数据库** 进行数据持久化。

---

## 🚀 快速开始

### 1. 创建数据库表

```bash
pnpm db:push
```

### 2. 导入初始数据

```bash
pnpm db:init
```

### 3. 启动应用

```bash
pnpm dev
```

---

## 📊 数据库结构

### gallery_config（配置表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | serial | 主键 |
| configJson | text | 配置 JSON |
| updatedAt | timestamp | 更新时间 |

### image_heat（热度表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | serial | 主键 |
| imageId | text | 图片 ID（唯一） |
| heat | integer | 热度值 |
| updatedAt | timestamp | 更新时间 |

---

## 🔧 代码示例

### 读取配置

```typescript
import { galleryDataManager } from "@/storage/database/galleryDataManager";

const configRecord = await galleryDataManager.getConfig();
if (configRecord) {
  const config = JSON.parse(configRecord.configJson);
}
```

### 保存配置

```typescript
await galleryDataManager.saveConfig(JSON.stringify(config, null, 2));
```

### 查询热度

```typescript
const heatData = await galleryDataManager.getHeatData();
const heatMap = new Map(heatData.map(r => [r.imageId, r.heat]));
```

### 增加热度

```typescript
await galleryDataManager.incrementHeat(imageId);
```

---

## 📁 相关文件

| 文件 | 说明 |
|------|------|
| `src/storage/database/shared/schema.ts` | 数据库表定义 |
| `src/storage/database/galleryDataManager.ts` | 数据管理器 |
| `scripts/init-coze-db.ts` | 数据库初始化脚本 |
| `scripts/backup/gallery.json.bak` | 初始数据备份 |

---

## 🔧 可用命令

| 命令 | 说明 |
|------|------|
| `pnpm db:push` | 创建数据库表 |
| `pnpm db:init` | 导入初始数据 |
| `pnpm db:studio` | 打开 Drizzle Studio 管理工具 |

---

## ⚠️ 重要说明

### Coze 扣子数据库（已废弃）

- ❌ Coze 扣子数据库无法通过代码访问
- ❌ 不提供 REST API 或 SDK
- ❌ 只能在平台界面操作

### Coze Coding PostgreSQL（正在使用）

- ✅ 可以通过代码访问
- ✅ 使用 Drizzle ORM
- ✅ 数据真正持久化
- ✅ 部署后正常工作

---

## 🎯 API 路由

| 路由 | 说明 |
|------|------|
| `/api/gallery-config` | 配置管理 |
| `/api/gallery-data` | 数据查询 |
| `/api/gallery/heat` | 热度统计 |

---

## 📝 数据备份

### 备份位置

`scripts/backup/gallery.json.bak`

### 恢复数据

```bash
pnpm db:init
```

脚本会自动从备份文件读取数据并导入到数据库。

---

## ❓ 常见问题

### Q1: 需要配置环境变量吗？

**不需要！**

Coze Coding PostgreSQL 数据库已经自动配置好了，`getDb()` 函数会自动处理连接。

### Q2: 数据会丢失吗？

**不会！**

数据存储在 Coze Coding 的 PostgreSQL 数据库中，持久化保存。

### Q3: 可以在界面查看数据吗？

**可以！**

运行 `pnpm db:studio` 打开 Drizzle Studio，可以查看和管理数据库。
