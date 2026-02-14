---
name: AggreResearch/DeepWikiAdapter
description: DeepWiki适配器 - GitHub代码库的AI搜索和理解
---

# DeepWiki 适配器

## 概述

DeepWiki 是一个 AI 驱动的代码库文档平台，支持对任意 GitHub 仓库进行索引、搜索和对话式查询。

## 功能

- ✅ 索引任意 GitHub 仓库
- ✅ 语义代码搜索
- ✅ 对话式代码理解
- ✅ 多仓库搜索
- ✅ 代码架构分析

## 配置

```json
{
  "enabled": true,
  "repos": [
    "facebook/react",
    "vercel/next.js",
    "modelcontextprotocol/servers"
  ],
  "cacheResults": true,
  "cacheTTL": 3600
}
```

## 实现

```typescript
interface DeepWikiConfig {
  enabled: boolean;
  repos?: string[];         // 预索引的仓库列表
  apiKey?: string;          // API密钥（可选）
  baseUrl?: string;         // API地址
  cacheResults?: boolean;   // 是否缓存结果
  cacheTTL?: number;        // 缓存时间（秒）
}

class DeepWikiAdapter implements DataSourceAdapter {
  name = 'deepwiki';
  type = 'code' as const;

  private config: DeepWikiConfig;
  private baseUrl: string;
  private cache: Map<string, { data: any; expiry: number }>;

  constructor(config: DeepWikiConfig) {
    this.config = config;
    this.baseUrl = config.baseUrl || 'https://api.deepwiki.com/v1';
    this.cache = new Map();
  }

  async authenticate(): Promise<void> {
    // DeepWiki 可能不需要认证
    // 或者验证 API Key
    if (this.config.apiKey) {
      const response = await fetch(`${this.baseUrl}/verify`, {
        headers: { 'Authorization': `Bearer ${this.config.apiKey}` }
      });
      if (!response.ok) {
        throw new Error('DeepWiki authentication failed');
      }
    }
  }

  // 索引仓库
  async indexRepo(repoUrl: string): Promise<IndexResult> {
    const response = await fetch(`${this.baseUrl}/repos/index`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ repo_url: repoUrl })
    });

    if (!response.ok) {
      throw new Error(`Failed to index repo: ${response.statusText}`);
    }

    return response.json();
  }

  // 语义搜索
  async search(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    // 检查缓存
    const cacheKey = `search:${query}:${JSON.stringify(options)}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const response = await fetch(`${this.baseUrl}/search`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        query,
        repos: options?.repos || this.config.repos,
        limit: options?.limit || 10
      })
    });

    if (!response.ok) {
      throw new Error(`Search failed: ${response.statusText}`);
    }

    const results = await response.json();

    // 缓存结果
    this.setCache(cacheKey, results);

    return results;
  }

  // 对话式查询
  async chat(question: string, repo: string): Promise<ChatResult> {
    const response = await fetch(`${this.baseUrl}/chat`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        question,
        repo,
        context: 'full'  // full | summary | none
      })
    });

    if (!response.ok) {
      throw new Error(`Chat failed: ${response.statusText}`);
    }

    return response.json();
  }

  // 获取仓库结构
  async getStructure(repo: string): Promise<RepoStructure> {
    const response = await fetch(`${this.baseUrl}/repos/${repo}/structure`, {
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error(`Failed to get structure: ${response.statusText}`);
    }

    return response.json();
  }

  // 获取文件内容
  async getFile(repo: string, path: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/repos/${repo}/files/${path}`, {
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error(`Failed to get file: ${response.statusText}`);
    }

    return response.text();
  }

  // 转换为统一格式
  normalize(result: DeepWikiResult): UnifiedDataItem {
    return {
      id: `deepwiki:${result.repo}:${result.path}`,
      type: 'document',
      content: result.content || result.summary,
      title: result.title || result.path,
      metadata: {
        source: 'deepwiki',
        created: new Date(),
        modified: new Date(),
        url: `https://github.com/${result.repo}/blob/main/${result.path}`,
        path: result.path,
        repo: result.repo,
        language: this.detectLanguage(result.path)
      }
    };
  }

  // 辅助方法
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    };
    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }
    return headers;
  }

  private getFromCache(key: string): any | null {
    if (!this.config.cacheResults) return null;

    const cached = this.cache.get(key);
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  private setCache(key: string, data: any): void {
    if (!this.config.cacheResults) return;

    const ttl = (this.config.cacheTTL || 3600) * 1000;
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttl
    });
  }

  private detectLanguage(path: string): string {
    const ext = path.split('.').pop()?.toLowerCase();
    const langMap: Record<string, string> = {
      'ts': 'TypeScript',
      'tsx': 'TypeScript',
      'js': 'JavaScript',
      'jsx': 'JavaScript',
      'py': 'Python',
      'rs': 'Rust',
      'go': 'Go',
      'java': 'Java',
      'kt': 'Kotlin',
      'cpp': 'C++',
      'c': 'C',
      'rb': 'Ruby',
      'php': 'PHP',
      'md': 'Markdown',
      'json': 'JSON',
      'yaml': 'YAML',
      'yml': 'YAML'
    };
    return langMap[ext || ''] || 'Unknown';
  }
}

// 类型定义
interface SearchResult {
  repo: string;
  path: string;
  title?: string;
  content?: string;
  summary?: string;
  score: number;
  highlights?: string[];
}

interface ChatResult {
  answer: string;
  sources: {
    repo: string;
    path: string;
    excerpt: string;
  }[];
  confidence: number;
}

interface RepoStructure {
  name: string;
  description?: string;
  language: string;
  structure: {
    name: string;
    type: 'file' | 'directory';
    children?: RepoStructure['structure'][];
  }[];
}

interface IndexResult {
  repo: string;
  status: 'indexed' | 'pending' | 'failed';
  files: number;
  message?: string;
}
```

## 使用示例

### 示例1: 索引仓库

```typescript
const adapter = new DeepWikiAdapter({ enabled: true });

// 索引React仓库
const result = await adapter.indexRepo('https://github.com/facebook/react');
console.log(`Indexed ${result.files} files from ${result.repo}`);
```

### 示例2: 语义搜索

```typescript
// 搜索React Hooks实现
const results = await adapter.search('React hooks implementation', {
  repos: ['facebook/react'],
  limit: 10
});

for (const result of results) {
  console.log(`[${result.score}] ${result.repo}/${result.path}`);
  console.log(result.summary);
}
```

### 示例3: 对话式查询

```typescript
// 对话式理解代码
const answer = await adapter.chat(
  'How does React Fiber work?',
  'facebook/react'
);

console.log(answer.answer);
console.log('Sources:', answer.sources);
```

### 示例4: 集成到 UnifiedSearch

```typescript
// 在 UnifiedSearch 中使用
const query = "React 的调度机制是如何实现的？";

// DeepWiki 搜索代码库
const codeResults = await deepWikiAdapter.search(query, {
  repos: ['facebook/react']
});

// 转换为统一格式
const unifiedResults = codeResults.map(r => adapter.normalize(r));

// 与其他来源混合
const mixedResults = mixResults([
  ...ragResults,        // 个人笔记
  ...unifiedResults,    // DeepWiki 代码
  ...webResults         // 网络搜索
]);
```

## 与 RAGQuery 的区别

| 维度 | RAGQuery | DeepWiki |
|------|----------|----------|
| 数据源 | 个人笔记/本地文件 | GitHub 公开仓库 |
| 内容类型 | 文档、笔记 | 代码、技术文档 |
| 搜索方式 | 向量相似度 | 语义代码搜索 |
| 用途 | 查询个人知识 | 理解开源项目 |

## 错误处理

| 错误类型 | 处理 |
|----------|------|
| 仓库不存在 | 返回友好提示，建议检查URL |
| API限流 | 指数退避重试 |
| 索引进行中 | 返回pending状态，建议稍后查询 |
| 网络错误 | 重试3次，使用缓存fallback |
