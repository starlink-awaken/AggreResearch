---
name: AggreResearch/KnowledgeToolAdapters
description: 知识工具适配器 - Confluence、Logseq等知识管理工具
---

# 知识工具适配器

## 概述

集成企业知识库和个人知识管理工具。

---

## 1. Confluence Adapter

### 概述

Confluence 是 Atlassian 的企业知识库和协作平台。

### 配置

```json
{
  "enabled": true,
  "baseUrl": "https://your-domain.atlassian.net/wiki",
  "email": "user@example.com",
  "apiToken": "confluence_api_token",
  "spaces": ["ENG", "PRODUCT", "DOCS"]
}
```

### 实现

```typescript
interface ConfluenceConfig {
  enabled: boolean;
  baseUrl: string;
  email: string;
  apiToken: string;
  spaces?: string[];
}

class ConfluenceAdapter implements DataSourceAdapter {
  name = 'confluence';
  type = 'knowledge' as const;

  private config: ConfluenceConfig;

  constructor(config: ConfluenceConfig) {
    this.config = config;
  }

  private getHeaders(): HeadersInit {
    const auth = Buffer.from(`${this.config.email}:${this.config.apiToken}`).toString('base64');
    return {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }

  async search(query: string, options?: ConfluenceSearchOptions): Promise<ConfluencePage[]> {
    const cql = this.buildCQL(query, options);

    const params = new URLSearchParams({
      cql,
      limit: String(options?.limit || 50),
      expand: 'content.body.view,content.space,content.history'
    });

    const response = await fetch(
      `${this.config.baseUrl}/rest/api/content/search?${params}`,
      { headers: this.getHeaders() }
    );

    if (!response.ok) {
      throw new Error(`Confluence API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.results.map(this.normalizePage);
  }

  async getPage(pageId: string): Promise<ConfluencePage> {
    const response = await fetch(
      `${this.config.baseUrl}/rest/api/content/${pageId}?expand=body.view,space,history,version`,
      { headers: this.getHeaders() }
    );

    if (!response.ok) {
      throw new Error(`Confluence API error: ${response.statusText}`);
    }

    const data = await response.json();
    return this.normalizePage(data);
  }

  async getSpaceContent(spaceKey: string, options?: { limit?: number; depth?: string }): Promise<ConfluencePage[]> {
    const params = new URLSearchParams({
      spaceKey,
      limit: String(options?.limit || 100),
      depth: options?.depth || 'root',
      expand: 'body.view'
    });

    const response = await fetch(
      `${this.config.baseUrl}/rest/api/space/${spaceKey}/content?${params}`,
      { headers: this.getHeaders() }
    );

    if (!response.ok) {
      throw new Error(`Confluence API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.results?.map(this.normalizePage) || [];
  }

  async getChildPages(pageId: string, options?: { limit?: number }): Promise<ConfluencePage[]> {
    const params = new URLSearchParams({
      limit: String(options?.limit || 50),
      expand: 'body.view'
    });

    const response = await fetch(
      `${this.config.baseUrl}/rest/api/content/${pageId}/child/page?${params}`,
      { headers: this.getHeaders() }
    );

    if (!response.ok) {
      throw new Error(`Confluence API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.results?.map(this.normalizePage) || [];
  }

  async getSpaces(): Promise<ConfluenceSpace[]> {
    const response = await fetch(
      `${this.config.baseUrl}/rest/api/space?limit=100`,
      { headers: this.getHeaders() }
    );

    if (!response.ok) {
      throw new Error(`Confluence API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.results?.map((s: any) => ({
      key: s.key,
      name: s.name,
      type: s.type,
      description: s.description?.plain?.value
    })) || [];
  }

  private buildCQL(query: string, options?: ConfluenceSearchOptions): string {
    const conditions: string[] = [`text ~ "${query}"`];

    if (options?.spaces?.length) {
      const spaceConditions = options.spaces.map(s => `space = "${s}"`).join(' OR ');
      conditions.push(`(${spaceConditions})`);
    } else if (this.config.spaces?.length) {
      const spaceConditions = this.config.spaces.map(s => `space = "${s}"`).join(' OR ');
      conditions.push(`(${spaceConditions})`);
    }

    if (options?.type) {
      conditions.push(`type = "${options.type}"`);
    }

    if (options?.contributor) {
      conditions.push(`contributor = "${options.contributor}"`);
    }

    return conditions.join(' AND ');
  }

  normalize(raw: any): UnifiedDataItem {
    return {
      id: `confluence:${raw.id}`,
      type: 'document',
      content: raw.body?.view?.value || '',
      title: raw.title,
      metadata: {
        source: 'confluence',
        created: raw.history?.createdDate ? new Date(raw.history.createdDate) : undefined,
        modified: raw.history?.lastUpdated?.date ? new Date(raw.history.lastUpdated.date) : undefined,
        author: raw.history?.createdBy?.displayName,
        space: raw.space?.key,
        spaceName: raw.space?.name,
        url: `${this.config.baseUrl}${raw._links?.webui}`,
        version: raw.version?.number
      }
    };
  }

  private normalizePage(page: any): ConfluencePage {
    return {
      id: page.id,
      title: page.title,
      type: page.type,
      content: page.body?.view?.value,
      space: {
        key: page.space?.key,
        name: page.space?.name
      },
      created: page.history?.createdDate ? new Date(page.history.createdDate) : undefined,
      modified: page.history?.lastUpdated?.date ? new Date(page.history.lastUpdated.date) : undefined,
      author: page.history?.createdBy?.displayName,
      version: page.version?.number,
      url: page._links?.webui
    };
  }
}

interface ConfluencePage {
  id: string;
  title: string;
  type: string;
  content?: string;
  space?: { key: string; name: string };
  created?: Date;
  modified?: Date;
  author?: string;
  version?: number;
  url?: string;
}

interface ConfluenceSpace {
  key: string;
  name: string;
  type: string;
  description?: string;
}

interface ConfluenceSearchOptions {
  spaces?: string[];
  type?: string;
  contributor?: string;
  limit?: number;
}
```

### 特点

- ✅ 企业知识库
- ✅ CQL 强大搜索
- ✅ 空间管理
- ✅ 版本历史

---

## 2. Logseq Adapter

### 概述

Logseq 是隐私优先的开源知识管理工具，使用本地 Markdown/ORG 文件。

### 配置

```json
{
  "enabled": true,
  "graphPath": "~/Logseq/graph",
  "fileType": "md",
  "includeJournal": true
}
```

### 实现

```typescript
interface LogseqConfig {
  enabled: boolean;
  graphPath: string;
  fileType?: 'md' | 'org';
  includeJournal?: boolean;
}

class LogseqAdapter implements DataSourceAdapter {
  name = 'logseq';
  type = 'note' as const;

  private config: LogseqConfig;

  constructor(config: LogseqConfig) {
    this.config = config;
  }

  async fetchAll(): Promise<LogseqPage[]> {
    const pagesDir = `${this.config.graphPath}/pages`;
    const journalsDir = `${this.config.graphPath}/journals`;
    const pages: LogseqPage[] = [];

    // 读取普通页面
    const pageFiles = await fs.readdir(pagesDir);
    for (const file of pageFiles) {
      if (file.endsWith(`.${this.config.fileType || 'md'}`)) {
        const page = await this.parsePage(`${pagesDir}/${file}`);
        if (page) pages.push(page);
      }
    }

    // 读取日志
    if (this.config.includeJournal) {
      try {
        const journalFiles = await fs.readdir(journalsDir);
        for (const file of journalFiles) {
          if (file.endsWith(`.${this.config.fileType || 'md'}`)) {
            const page = await this.parsePage(`${journalsDir}/${file}`, true);
            if (page) pages.push(page);
          }
        }
      } catch (error) {
        console.warn('Journals directory not found');
      }
    }

    return pages;
  }

  async search(query: string, options?: SearchOptions): Promise<LogseqPage[]> {
    const allPages = await this.fetchAll();
    const queryLower = query.toLowerCase();

    return allPages.filter(page => {
      const titleMatch = page.title?.toLowerCase().includes(queryLower);
      const contentMatch = page.content?.toLowerCase().includes(queryLower);
      const tagMatch = page.tags?.some(tag => tag.toLowerCase().includes(queryLower));

      return titleMatch || contentMatch || tagMatch;
    }).slice(0, options?.limit || 100);
  }

  async getBacklinks(pageName: string): Promise<string[]> {
    const allPages = await this.fetchAll();
    const backlinks: string[] = [];

    for (const page of allPages) {
      const linkPattern1 = new RegExp(`\\[\\[${pageName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]\\]`, 'gi');
      const linkPattern2 = new RegExp(`\\[\\[${pageName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\/.*\\]\\]`, 'gi');

      if (linkPattern1.test(page.content || '') || linkPattern2.test(page.content || '')) {
        backlinks.push(page.title || page.fileName);
      }
    }

    return backlinks;
  }

  async getTags(): Promise<string[]> {
    const allPages = await this.fetchAll();
    const tags = new Set<string>();

    for (const page of allPages) {
      // 从 frontmatter 提取
      if (page.tags) {
        page.tags.forEach(t => tags.add(t));
      }

      // 从内容提取 :: tag 格式
      const tagPattern = /::\s*([a-zA-Z\u4e00-\u9fff][a-zA-Z0-9\u4e00-\u9fff_-]*)/g;
      const content = page.content || '';
      let match;
      while ((match = tagPattern.exec(content)) !== null) {
        tags.add(match[1]);
      }
    }

    return Array.from(tags).sort();
  }

  private async parsePage(filePath: string, isJournal: boolean = false): Promise<LogseqPage | null> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const fileName = path.basename(filePath, `.${this.config.fileType || 'md'}`);

      // 解析 frontmatter
      const frontmatter = this.parseFrontmatter(content);
      const mainContent = this.stripFrontmatter(content);

      // 提取双向链接
      const links = this.extractLinks(mainContent);

      // 提取标签
      const tags = this.extractTags(mainContent, frontmatter);

      return {
        fileName,
        title: frontmatter.title || this.formatTitle(fileName, isJournal),
        content: mainContent,
        isJournal,
        tags,
        links,
        properties: frontmatter,
        createdAt: (await fs.stat(filePath)).birthtime,
        modifiedAt: (await fs.stat(filePath)).mtime
      };
    } catch (error) {
      console.warn(`Failed to parse ${filePath}:`, error);
      return null;
    }
  }

  private parseFrontmatter(content: string): Record<string, any> {
    const properties: Record<string, any> = {};

    // Logseq 格式: :: property value
    const propPattern = /^::\s*(\w+)\s*::\s*(.+)$/gm;
    let match;
    while ((match = propPattern.exec(content)) !== null) {
      properties[match[1]] = match[2].trim();
    }

    // YAML frontmatter
    if (content.startsWith('---')) {
      const endIdx = content.indexOf('---', 3);
      if (endIdx !== -1) {
        const yaml = content.slice(3, endIdx).trim();
        // 简单解析，实际可用 yaml 库
        yaml.split('\n').forEach(line => {
          const [key, ...values] = line.split(':');
          if (key && values.length) {
            properties[key.trim()] = values.join(':').trim();
          }
        });
      }
    }

    return properties;
  }

  private stripFrontmatter(content: string): string {
    // 移除 YAML frontmatter
    let result = content.replace(/^---[\s\S]*?---\n?/, '');

    // 移除 Logseq 属性行
    result = result.replace(/^::\s*\w+\s*::\s*.+$/gm, '');

    return result.trim();
  }

  private extractLinks(content: string): string[] {
    const links: string[] = [];
    const linkPattern = /\[\[([^\]]+)\]\]/g;
    let match;
    while ((match = linkPattern.exec(content)) !== null) {
      // 处理嵌套链接 [[page/child]]
      const link = match[1].split('/')[0];
      links.push(link);
    }
    return [...new Set(links)];
  }

  private extractTags(content: string, frontmatter: Record<string, any>): string[] {
    const tags: string[] = [];

    // 从 frontmatter 提取
    if (frontmatter.tags) {
      if (Array.isArray(frontmatter.tags)) {
        tags.push(...frontmatter.tags);
      } else {
        tags.push(...frontmatter.tags.split(',').map((t: string) => t.trim()));
      }
    }

    // 从内容提取 #tag 格式
    const hashTagPattern = /#([a-zA-Z\u4e00-\u9fff][a-zA-Z0-9\u4e00-\u9fff_-]*)/g;
    let match;
    while ((match = hashTagPattern.exec(content)) !== null) {
      tags.push(match[1]);
    }

    return [...new Set(tags)];
  }

  private formatTitle(fileName: string, isJournal: boolean): string {
    if (isJournal) {
      // 日志文件名通常是日期格式
      return fileName.replace(/_/g, '-');
    }
    return fileName.replace(/_/g, ' ');
  }

  normalize(raw: LogseqPage): UnifiedDataItem {
    return {
      id: `logseq:${raw.fileName}`,
      type: 'note',
      content: raw.content || '',
      title: raw.title,
      metadata: {
        source: 'logseq',
        created: raw.createdAt,
        modified: raw.modifiedAt,
        tags: raw.tags,
        links: raw.links,
        isJournal: raw.isJournal,
        properties: raw.properties
      }
    };
  }
}

interface LogseqPage {
  fileName: string;
  title?: string;
  content?: string;
  isJournal: boolean;
  tags?: string[];
  links?: string[];
  properties?: Record<string, any>;
  createdAt?: Date;
  modifiedAt?: Date;
}
```

### 特点

- ✅ 本地优先
- ✅ 双向链接
- ✅ 日志支持
- ✅ 标签系统

---

## 3. 统一知识库接口

```typescript
// 知识库适配器注册表
const knowledgeAdapters: Record<string, DataSourceAdapter> = {
  confluence: new ConfluenceAdapter(config.confluence),
  logseq: new LogseqAdapter(config.logseq),
  obsidian: new ObsidianAdapter(config.obsidian),
  notion: new NotionAdapter(config.notion)
};

// 统一知识搜索
async function searchKnowledge(
  query: string,
  options?: KnowledgeSearchOptions
): Promise<UnifiedDataItem[]> {
  const sources = options?.sources || Object.keys(knowledgeAdapters);

  const searchPromises = sources.map(async (source) => {
    const adapter = knowledgeAdapters[source];
    if (!adapter || !config[source]?.enabled) return [];

    try {
      const results = await adapter.search(query, options);
      return results.map(r => adapter.normalize(r));
    } catch (error) {
      console.warn(`${source} search failed:`, error);
      return [];
    }
  });

  const allResults = await Promise.all(searchPromises);
  return allResults.flat();
}
```

---

## 配置示例

```json
{
  "knowledge": {
    "enabled": true,
    "adapters": {
      "confluence": {
        "enabled": true,
        "baseUrl": "https://company.atlassian.net/wiki",
        "email": "${CONFLUENCE_EMAIL}",
        "apiToken": "${CONFLUENCE_API_TOKEN}",
        "spaces": ["ENG", "PRODUCT"]
      },
      "logseq": {
        "enabled": true,
        "graphPath": "~/Logseq/graph",
        "includeJournal": true
      }
    }
  }
}
```

---

## 错误处理

| 错误 | 处理 |
|------|------|
| API 限流 | 指数退避 |
| 认证失败 | 提示重新配置 |
| 文件读取失败 | 跳过并记录 |
| 解析错误 | 使用原始内容 |
