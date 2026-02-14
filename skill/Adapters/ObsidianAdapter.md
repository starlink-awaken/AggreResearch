---
name: AggreResearch/ObsidianAdapter
description: Obsidian笔记适配器 - 读取Vault中的markdown文件并转换为统一格式
---

# Obsidian 适配器

## 概述

读取 Obsidian Vault 中的 markdown 文件，提取 frontmatter 和内容，转换为统一数据格式。

## 功能

- ✅ 读取 .md 文件
- ✅ 提取 frontmatter (YAML) 作为 metadata
- ✅ 支持内部链接 [[wiki-link]] 处理
- ✅ 支持代码块保持原格式
- ✅ 增量同步（基于文件修改时间）

## 配置

```json
{
  "enabled": true,
  "vaultPath": "~/Obsidian/MyVault",
  "ignoreFolders": [".obsidian", "_templates", "_assets", "node_modules"],
  "fileTypes": [".md"]
}
```

## 实现

```typescript
import * as fs from 'fs';
import * as path from 'path';
import matter from 'gray-matter';

class ObsidianAdapter implements DataSourceAdapter {
  name = 'obsidian';
  type = 'note' as const;

  private config: ObsidianConfig;

  constructor(config: ObsidianConfig) {
    this.config = config;
  }

  async authenticate(): Promise<void> {
    // Obsidian 本地文件无需认证
    // 验证 vaultPath 是否存在
    if (!fs.existsSync(this.config.vaultPath)) {
      throw new Error(`Obsidian vault not found: ${this.config.vaultPath}`);
    }
  }

  async fetchChanges(since: Date): Promise<ObsidianItem[]> {
    const files = await this.scanVault();
    const changed = files.filter(f => {
      const mtime = fs.statSync(f).mtime;
      return mtime > since;
    });

    return changed.map(f => this.readFile(f));
  }

  async fetchAll(): Promise<ObsidianItem[]> {
    const files = await this.scanVault();
    return files.map(f => this.readFile(f));
  }

  private async scanVault(): Promise<string[]> {
    const files: string[] = [];

    const scan = (dir: string) => {
      const entries = fs.readdirSync(dir);

      for (const entry of entries) {
        const fullPath = path.join(dir, entry);
        const stat = fs.statSync(fullPath);

        // 跳过忽略的文件夹
        if (stat.isDirectory()) {
          if (!this.config.ignoreFolders?.includes(entry)) {
            scan(fullPath);
          }
          continue;
        }

        // 只处理指定类型文件
        const ext = path.extname(entry);
        if (this.config.fileTypes?.includes(ext)) {
          files.push(fullPath);
        }
      }
    };

    scan(this.config.vaultPath);
    return files;
  }

  private readFile(filePath: string): ObsidianItem {
    const content = fs.readFileSync(filePath, 'utf-8');
    const stat = fs.statSync(filePath);

    // 解析 frontmatter
    const { data: frontmatter, content: body } = matter(content);

    // 计算相对路径
    const relativePath = path.relative(this.config.vaultPath, filePath);

    return {
      id: `obsidian:${relativePath}`,
      title: frontmatter.title || path.basename(filePath, '.md'),
      content: body,
      metadata: {
        source: 'obsidian',
        created: frontmatter.created || stat.birthtime,
        modified: stat.mtime,
        tags: frontmatter.tags || [],
        path: relativePath,
        frontmatter
      }
    };
  }

  normalize(item: ObsidianItem): UnifiedDataItem {
    return {
      id: item.id,
      type: 'note',
      content: item.content,
      title: item.title,
      metadata: {
        source: 'obsidian',
        created: new Date(item.metadata.created),
        modified: new Date(item.metadata.modified),
        tags: item.metadata.tags,
        path: item.metadata.path
      }
    };
  }
}
```

## Frontmatter 支持

Obsidian 的 YAML frontmatter 会被完整保留：

```yaml
---
title: My Note
tags: [research, ai, notes]
created: 2024-01-01
modified: 2024-01-15
aliases: [AI研究]
---

# 内容...
```

会被转换为：

```typescript
{
  title: "My Note",
  tags: ["research", "ai", "notes"],
  created: "2024-01-01",
  modified: "2024-01-15",
  aliases: ["AI研究"]
}
```

## 内部链接处理

```typescript
// 处理 [[wiki-links]]
function processWikiLinks(content: string): string {
  return content.replace(/\[\[([^\]]+)\]\]/g, (match, link) => {
    // 转换为可读的链接描述
    const parts = link.split('|');
    const text = parts.length > 1 ? parts[1] : parts[0];
    return `[${text}]`;
  });
}
```

## 使用示例

```bash
# 配置 Obsidian 同步
# 在 config.json 中添加:

{
  "sources": {
    "obsidian": {
      "enabled": true,
      "vaultPath": "~/Obsidian/我的知识库"
    }
  }
}
```

```typescript
// 手动同步
const adapter = new ObsidianAdapter({
  vaultPath: "~/Obsidian/我的知识库"
});

await adapter.authenticate();
const items = await adapter.fetchAll();

// 转换为 UDF 并索引
const udfItems = items.map(item => adapter.normalize(item));
await vectorStore.upsert(udfItems);
```

## 增量同步逻辑

```typescript
// 基于文件修改时间判断是否需要更新
async function shouldUpdate(item: ObsidianItem, vectorItem?: UnifiedDataItem): Promise<boolean> {
  if (!vectorItem) return true;

  const itemModified = new Date(item.metadata.modified).getTime();
  const vectorModified = new Date(vectorItem.metadata.modified).getTime();

  return itemModified > vectorModified;
}
```
