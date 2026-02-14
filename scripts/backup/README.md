# 备份文件说明

## gallery.json.bak

这是 `public/gallery.json` 的备份文件。

### 用途

此文件用于数据库初始化时的初始数据源。

### 使用场景

- 当数据库为空时，运行 `pnpm db:init-coze` 脚本会读取此文件
- 将配置数据导入到 Coze Coding PostgreSQL 数据库中

### 重要说明

- ⚠️ 日常使用中不再直接读取此文件
- ✅ 所有配置和热度数据都存储在数据库中
- ✅ 此文件仅用于初始化和灾难恢复

### 恢复方法

如果需要从备份恢复数据：

1. 将此文件复制到 `public/gallery.json`
2. 运行 `pnpm db:init-coze` 导入到数据库

### 更新备份

当需要更新备份时：

```bash
# 从数据库导出配置（需要编写导出脚本）
# 或者手动运行 API 获取配置
# 保存到 scripts/backup/gallery.json.bak
```
