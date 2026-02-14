---
name: AggreResearch/NotionAdapter
description: Notion笔记适配器 - 通过API获取页面内容并转换为统一格式
---

# Notion 适配器

## 概述

通过 Notion API 获取页面内容，提取 block 文本，转换为统一数据格式。

## 功能

- ✅ 获取页面内容
- ✅ 处理各种 block 类型
- ✅ 提取数据库属性
- ✅ 支持页面层级
- ✅ 增量同步

## 配置

```json
{
  "enabled": true,
  "token": "secret_xxxxxxxxxxxx",
  "rootPageId": "可选，限制同步范围"
}
```

## 认证设置

### Step 1: 创建 Integration

1. 访问 [Notion My Integrations](https://www.notion.so/my-integrations)
2. 点击 "New integration"
3. 填写名称，如 "AggreResearch Sync"
4. 获取 "Internal Integration Secret" (token)

### Step 2: 授权页面

1. 在 Notion 中打开要同步的页面/数据库
2. 点击 `...` 菜单 → `Connect to` → 选择你的 Integration
3. 对每个要同步的页面重复此步骤

## 实现

```typescript
import { Client } from '@notionhq/client';

class NotionAdapter implements DataSourceAdapter {
  name = 'notion';
  type = 'note' as const;

  private client: Client;
  private config: NotionConfig;

  constructor(config: NotionConfig) {
    this.config = config;
    this.client = new Client({ auth: config.token });
  }

  async authenticate(): Promise<void> {
    // 测试 API 连接
    try {
      await this.client.users.me({});
    } catch (error) {
      throw new Error(`Notion authentication failed: ${error.message}`);
    }
  }

  async fetchChanges(since: Date): Promise<NotionItem[]> {
    // Notion API 不直接支持时间查询
    // 需要维护本地状态，对比 last_edited_time
    const pages = await this.fetchAllPages();
    return pages.filter(p => new Date(p.metadata.last_edited_time) > since);
  }

  async fetchAll(): Promise<NotionItem[]> {
    const pages: NotionItem[] = [];

    if (this.config.rootPageId) {
      // 从指定页面开始
      const page = await this.fetchPage(this.config.rootPageId);
      if (page) pages.push(page);
    } else {
      // 获取所有授权的页面
      pages.push(...await this.fetchAllPages());
    }

    return pages;
  }

  private async fetchAllPages(): Promise<NotionItem[]> {
    const pages: NotionItem[] = [];
    let cursor: string | undefined;

    do {
      const response = await this.client.search({
        filter: { property: 'object', value: 'page' },
        start_cursor: cursor,
        page_size: 100
      });

      for (const page of response.results) {
        if ('properties' in page) {
          const item = await this.pageToItem(page);
          pages.push(item);
        }
      }

      cursor = response.has_more ? response.next_cursor ?? undefined : undefined;
    } while (cursor);

    return pages;
  }

  private async fetchPage(pageId: string): Promise<NotionItem | null> {
    try {
      const page = await this.client.pages.retrieve({ page_id: pageId });
      return this.pageToItem(page);
    } catch (error) {
      console.error(`Failed to fetch page ${pageId}:`, error);
      return null;
    }
  }

  private async pageToItem(page: any): Promise<NotionItem> {
    // 获取页面内容
    const blocks = await this.fetchBlocks(page.id);

    // 提取标题
    const title = this.extractTitle(page);

    // 转换为文本
    const content = this.blocksToText(blocks);

    return {
      id: `notion:${page.id}`,
      title,
      content,
      metadata: {
        source: 'notion',
        created: page.created_time,
        modified: page.last_edited_time,
        url: page.url,
        properties: page.properties,
        tags: this.extractTags(page)
      }
    };
  }

  private async fetchBlocks(blockId: string): Promise<any[]> {
    const blocks: any[] = [];
    let cursor: string | undefined;

    do {
      const response = await this.client.blocks.children.list({
        block_id: blockId,
        start_cursor: cursor,
        page_size: 100
      });

      blocks.push(...response.results);

      // 处理子页面
      for (const block of response.results) {
        if (block.type === 'child_page') {
          const childBlocks = await this.fetchBlocks(block.id);
          blocks.push(...childBlocks);
        }
      }

      cursor = response.has_more ? response.next_cursor ?? undefined : undefined;
    } while (cursor);

    return blocks;
  }

  private extractTitle(page: any): string {
    const props = page.properties;

    // 尝试多种可能的标题属性
    const titleKeys = ['Name', 'title', 'Title', 'Page'];

    for (const key of titleKeys) {
      if (props[key]?.type === 'title') {
        const title = props[key].title;
        if (title?.length > 0) {
          return title.map((t: any) => t.plain_text).join('');
        }
      }
    }

    return 'Untitled';
  }

  private extractTags(page: any): string[] {
    const tags: string[] = [];
    const props = page.properties;

    for (const key of Object.keys(props)) {
      const prop = props[key];
      if (prop.type === 'multi_select') {
        for (const tag of prop.multi_select) {
          tags.push(tag.name);
        }
      }
    }

    return tags;
  }

  private blocksToText(blocks: any[]): string {
    const lines: string[] = [];

    for (const block of blocks) {
      const text = this.blockToText(block);
      if (text) {
        lines.push(text);
      }
    }

    return lines.join('\n\n');
  }

  private blockToText(block: any): string | null {
    const type = block.type;
    const obj = block[type];

    if (!obj) return null;

    switch (type) {
      case 'paragraph':
        return this.richTextToString(obj.rich_text);

      case 'heading_1':
        return `# ${this.richTextToString(obj.rich_text)}`;

      case 'heading_2':
        return `## ${this.richTextToString(obj.rich_text)}`;

      case 'heading_3':
        return `### ${this.richTextToString(obj.rich_text)}`;

      case 'bulleted_list_item':
        return `- ${this.richTextToString(obj.rich_text)}`;

      case 'numbered_list_item':
        return `1. ${this.richTextToString(obj.rich_text)}`;

      case 'to_do':
        const checkbox = obj.checked ? '[x]' : '[ ]';
        return `${checkbox} ${this.richTextToString(obj.rich_text)}`;

      case 'code':
        return `\`\`\`${obj.language || ''}\n${this.richTextToString(obj.rich_text)}\n\`\`\``;

      case 'quote':
        return `> ${this.richTextToString(obj.rich_text)}`;

      case 'callout':
        return `> 💡 ${this.richTextToString(obj.rich_text)}`;

      case 'divider':
        return '---';

      case 'image':
        const imgUrl = obj.type === 'external' ? obj.external.url : obj.file?.url;
        return `![image](${imgUrl})`;

      case 'child_page':
        return `[${obj.title}]`;

      default:
        // 未知类型，尝试获取文本
        if (obj.rich_text) {
          return this.richTextToString(obj.rich_text);
        }
        return null;
    }
  }

  private richTextToString(richText: any[]): string {
    if (!richText || !Array.isArray(richText)) return '';

    return richText
      .map((t: any) => {
        let text = t.plain_text;

        // 处理链接
        if (t.href) {
          text = `[${text}](${t.href})`;
        }

        // 处理格式
        if (t.annotations) {
          const { bold, italic, strikethrough, code, underline } = t.annotations;
          if (code) text = `\`${text}\``;
          if (bold) text = `**${text}**`;
          if (italic) text = `*${text}*`;
          if (strikethrough) text = `~~${text}~~`;
          if (underline) text = `_${text}_`;
        }

        return text;
      })
      .join('');
  }

  normalize(item: NotionItem): UnifiedDataItem {
    return {
      id: item.id,
      type: 'note',
      content: item.content,
      title: item.title,
      metadata: {
        source: 'notion',
        created: new Date(item.metadata.created),
        modified: new Date(item.metadata.modified),
        tags: item.metadata.tags,
        url: item.metadata.url
      }
    };
  }
}
```

## 支持的 Block 类型

| 类型 | 处理方式 |
|------|---------|
| paragraph | 普通文本 |
| heading_1/2/3 | 转换为 Markdown 标题 |
| bulleted_list_item | 无序列表 |
| numbered_list_item | 有序列表 |
| to_do | 待办事项 |
| code | 代码块 |
| quote | 引用 |
| callout | 提示框 |
| image | 图片链接 |
| divider | 分隔线 |
| child_page | 子页面 |

## 使用示例

```bash
# 配置 Notion 同步
# 在 config.json 中添加:

{
  "sources": {
    "notion": {
      "enabled": true,
      "token": "secret_xxxxxxxxxxxx",
      "rootPageId": "可选的根页面ID"
    }
  }
}
```

```typescript
// 手动同步
const adapter = new NotionAdapter({
  token: 'secret_xxxxx'
});

await adapter.authenticate();
const items = await adapter.fetchAll();

// 转换为 UDF 并索引
const udfItems = items.map(item => adapter.normalize(item));
await vectorStore.upsert(udfItems);
```

## 增量同步

```typescript
// 维护本地状态
interface NotionSyncState {
  pageId: string;
  lastEdited: string;
}

// 对比本地状态获取变更
async function getChanges(state: NotionSyncState[]): Promise<NotionItem[]> {
  const allPages = await adapter.fetchAll();

  return allPages.filter(page => {
    const localState = state.find(s => s.pageId === page.id);
    if (!localState) return true; // 新页面

    return new Date(page.metadata.modified) > new Date(localState.lastEdited);
  });
}
```

## 注意事项

1. **API 限制**: Notion API 每分钟 3 次请求，需实现限流
2. **页面大小**: 单页面 block 数量有限制，需处理分页
3. **权限**: 确保 Integration 已获得所有要同步页面的授权
4. **Token 安全**: Token 不要提交到代码仓库，使用环境变量
