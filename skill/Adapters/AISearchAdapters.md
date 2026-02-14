---
name: AggreResearch/AISearchAdapters
description: AI搜索适配器 - Perplexity、Phind、You.com等AI搜索能力
---

# AI搜索适配器

## 概述

集成主流AI搜索服务，提供比传统关键词搜索更智能的搜索体验。

## AI搜索 vs 传统搜索

| 维度 | 传统搜索 | AI搜索 |
|------|---------|--------|
| 理解方式 | 关键词匹配 | 语义理解 |
| 返回内容 | 链接列表 | 直接生成答案 |
| 上下文 | 无 | 多轮对话理解 |
| 引用 | 无 | 带引用来源 |

---

## 1. Perplexity Adapter

### 概述

Perplexity 提供 Sonar 模型 API，支持搜索增强的 LLM 生成。

### 配置

```json
{
  "enabled": true,
  "apiKey": "pplx-xxxxx",
  "model": "sonar-small-online",
  "maxTokens": 4096
}
```

### 实现

```typescript
import { Perplexity } from '@perplexity/api';

class PerplexityAdapter implements SearchAdapter {
  name = 'perplexity';
  type = 'ai-search' as const;

  private client: Perplexity;
  private config: PerplexityConfig;

  constructor(config: PerplexityConfig) {
    this.config = config;
    this.client = new Perplexity(config.apiKey);
  }

  async search(query: string, options?: SearchOptions): Promise<SearchResult> {
    const response = await this.client.chat.completions.create({
      model: this.config.model || 'sonar-small-online',
      messages: [
        {
          role: 'system',
          content: '你是一个专业的AI搜索助手。请提供准确、全面、有来源的答案。'
        },
        {
          role: 'user',
          content: query
        }
      ],
      max_tokens: this.config.maxTokens || 4096,
      temperature: 0.2
    });

    return this.normalize(response, query);
  }

  // 流式响应支持
  async *searchStream(query: string): AsyncGenerator<SearchChunk> {
    const stream = await this.client.chat.completions.create({
      model: this.config.model || 'sonar-small-online',
      messages: [{ role: 'user', content: query }],
      stream: true
    });

    for await (const chunk of stream) {
      yield {
        content: chunk.choices[0]?.delta?.content || '',
        done: chunk.choices[0]?.finish_reason === 'stop'
      };
    }
  }

  private normalize(response: any, query: string): SearchResult {
    const content = response.choices[0]?.message?.content || '';

    // 提取引用（Perplexity会在答案中包含引用）
    const citations = this.extractCitations(content);

    return {
      content,
      citations,
      query,
      provider: 'perplexity',
      model: this.config.model,
      usage: response.usage
    };
  }

  private extractCitations(content: string): Citation[] {
    // 从内容中提取引用来源
    const matches = content.match(/\[(\d+)\]/g) || [];
    // 实际实现需要解析Perplexity的引用格式
    return [];
  }
}
```

### 使用示例

```typescript
const perplexity = new PerplexityAdapter({
  apiKey: process.env.PERPLEXITY_API_KEY
});

const result = await perplexity.search("量子计算在金融领域的应用前景");

console.log(result.content);
// 输出直接生成的答案，带引用

console.log(result.citations);
// 输出引用来源列表
```

---

## 2. Phind Adapter

### 概述

Phind 专注于开发者搜索，提供代码和技术问题解答。

### 配置

```json
{
  "enabled": true,
  "apiKey": "phind-xxxxx",
  "model": "Phind-CodeLlama-34B-v2"
}
```

### 实现

```typescript
class PhindAdapter implements SearchAdapter {
  name = 'phind';
  type = 'ai-search' as const;

  private config: PhindConfig;
  private baseUrl = 'https://https://www.phind.com/api';

  async search(query: string, options?: SearchOptions): Promise<SearchResult> {
    // Phind 使用搜索 + LLM 生成的组合
    const response = await fetch(`${this.baseUrl}/search/agent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify({
        query,
        language: options?.language || 'zh-CN',
        num_results: options?.numResults || 10
      })
    });

    const data = await response.json();

    return {
      content: data.answer || data.results?.[0]?.snippet,
      results: data.results?.map(r => ({
        title: r.title,
        url: r.url,
        snippet: r.snippet
      })),
      query,
      provider: 'phind'
    };
  }
}
```

### 特点

- ✅ 代码搜索能力强
- ✅ 技术文档理解好
- ✅ 多语言支持
- ✅ 免费版本可用

---

## 3. You.com Adapter

### 概述

You.com 提供多模态AI搜索，支持新闻、图片、视频等。

### 配置

```json
{
  "enabled": true,
  "apiKey": "you-xxxxx",
  "sources": ["web", "news", "wikipedia"]
}
```

### 实现

```typescript
class YouComAdapter implements SearchAdapter {
  name = 'youcom';
  type = 'ai-search' as const;

  private config: YouComConfig;
  private baseUrl = 'https://api.you.com';

  async search(query: string, options?: SearchOptions): Promise<SearchResult> {
    const response = await fetch(`${this.baseUrl}/search`, {
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'X-Api-Key': this.config.apiKey
      },
      params: {
        query,
        sources: this.config.sources?.join(',') || 'web'
      }
    });

    const data = await response.json();

    return {
      content: data.answer || this.formatResults(data.results),
      results: data.results?.map(r => ({
        title: r.title,
        url: r.url,
        snippet: r.snippet,
        source: r.source
      })),
      query,
      provider: 'youcom'
    };
  }

  private formatResults(results: any[]): string {
    return results
      .slice(0, 5)
      .map((r, i) => `${i + 1}. ${r.title}\n${r.snippet}`)
      .join('\n\n');
  }
}
```

### 特点

- ✅ 多模态搜索
- ✅ 新闻/图片/视频
- ✅ 免费层级可用
- ✅ 中文支持

---

## 4. 统一AI搜索接口

```typescript
// AI搜索适配器注册表
const aiSearchAdapters: Record<string, SearchAdapter> = {
  perplexity: new PerplexityAdapter(config.perplexity),
  phind: new PhindAdapter(config.phind),
  youcom: new YouComAdapter(config.youcom)
};

// 自动选择最优适配器
async function aiSearch(query: string, options?: SearchOptions): Promise<SearchResult> {
  // 根据查询类型选择适配器
  if (isCodeQuery(query)) {
    return aiSearchAdapters.phind.search(query, options);
  }

  if (isGeneralQuery(query)) {
    // 并行搜索多个源，结果合并
    const results = await Promise.all([
      aiSearchAdapters.perplexity.search(query, options),
      aiSearchAdapters.youcom.search(query, options)
    ]);
    return mergeResults(results);
  }

  // 默认使用 Perplexity
  return aiSearchAdapters.perplexity.search(query, options);
}
```

---

## 在工作流中的使用

### QuickSearch 增强

```typescript
// 优先使用AI搜索
async function quickSearch(query: string): Promise<QuickResult> {
  // 首先尝试AI搜索
  if (aiSearchEnabled) {
    try {
      const aiResult = await aiSearch(query);
      if (aiResult.confidence > 0.8) {
        return {
          content: aiResult.content,
          sources: aiResult.citations,
          type: 'ai-generated'
        };
      }
    } catch (e) {
      console.warn('AI search failed, fallback to traditional');
    }
  }

  // 回退到传统搜索
  return traditionalSearch(query);
}
```

### DeepReport 数据获取

```typescript
// DeepReport Phase 2 数据获取
async function fetchData(topic: string): Promise<DataSources> {
  return {
    // AI搜索获取最新信息
    aiSearch: await aiSearch(topic),

    // 传统搜索作为补充
    webSearch: await webSearch(topic),

    // 本地知识
    rag: await ragSearch(topic)
  };
}
```

---

## 配置示例

```json
{
  "aiSearch": {
    "enabled": true,
    "adapters": {
      "perplexity": {
        "enabled": true,
        "apiKey": "${PERPLEXITY_API_KEY}",
        "model": "sonar-small-online"
      },
      "phind": {
        "enabled": true,
        "apiKey": "${PHIND_API_KEY}"
      },
      "youcom": {
        "enabled": true,
        "apiKey": "${YOUCOM_API_KEY}"
      }
    },
    "fallback": "traditional",
    "timeout": 15000
  }
}
```

---

## 对比选择指南

| 场景 | 推荐适配器 | 原因 |
|------|-----------|------|
| 通用问题 | Perplexity | 答案准确，引用完整 |
| 代码/技术 | Phind | 开发者优化 |
| 新闻/时事 | You.com | 多源聚合 |
| 中国内容 | 秘塔AI搜索 | 中文优化 |
| 综合研究 | Perplexity + You.com | 多源验证 |

---

## 错误处理

| 错误 | 处理 |
|------|------|
| API限额 | 降级到免费搜索 |
| 超时 | 回退传统搜索 |
| 认证失败 | 标记错误，跳过 |
| 网络错误 | 重试+降级 |
