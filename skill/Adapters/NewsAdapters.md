---
name: AggreResearch/NewsAdapters
description: 新闻聚合适配器 - NewsAPI、GNews、RSS新闻源搜索
---

# 新闻聚合适配器

## 概述

集成多个新闻数据源，实现统一的新闻搜索和聚合。

---

## 1. NewsAPI Adapter

### 概述

NewsAPI 是最流行的新闻聚合 API 之一，支持全球新闻源。

### 配置

```json
{
  "enabled": true,
  "apiKey": "newsapi_api_key",
  "sources": ["bbc-news", "cnn", "techcrunch"],
  "language": "en",
  "country": "us"
}
```

### 实现

```typescript
interface NewsAPIConfig {
  enabled: boolean;
  apiKey: string;
  sources?: string[];
  language?: string;
  country?: string;
}

class NewsAPIAdapter implements DataSourceAdapter {
  name = 'newsapi';
  type = 'news' as const;

  private config: NewsAPIConfig;
  private baseUrl = 'https://newsapi.org/v2';

  constructor(config: NewsAPIConfig) {
    this.config = config;
  }

  async search(query: string, options?: NewsSearchOptions): Promise<NewsArticle[]> {
    const params = new URLSearchParams({
      q: query,
      apiKey: this.config.apiKey,
      language: options?.language || this.config.language || 'en',
      sortBy: options?.sortBy || 'publishedAt',
      pageSize: String(options?.limit || 100)
    });

    if (options?.from) {
      params.set('from', options.from.toISOString());
    }
    if (options?.to) {
      params.set('to', options.to.toISOString());
    }
    if (options?.sources?.length) {
      params.set('sources', options.sources.join(','));
    } else if (this.config.sources?.length) {
      params.set('sources', this.config.sources.join(','));
    }

    const response = await fetch(`${this.baseUrl}/everything?${params}`);

    if (!response.ok) {
      throw new Error(`NewsAPI error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.articles.map(this.normalizeArticle);
  }

  async getTopHeadlines(options?: HeadlinesOptions): Promise<NewsArticle[]> {
    const params = new URLSearchParams({
      apiKey: this.config.apiKey,
      pageSize: String(options?.limit || 100)
    });

    if (options?.country) {
      params.set('country', options.country);
    } else if (this.config.country) {
      params.set('country', this.config.country);
    }

    if (options?.category) {
      params.set('category', options.category);
    }

    if (options?.sources?.length) {
      params.set('sources', options.sources.join(','));
      params.delete('country'); // sources 和 country 不能同时使用
    }

    const response = await fetch(`${this.baseUrl}/top-headlines?${params}`);

    if (!response.ok) {
      throw new Error(`NewsAPI error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.articles.map(this.normalizeArticle);
  }

  async getSources(options?: SourcesOptions): Promise<NewsSource[]> {
    const params = new URLSearchParams({
      apiKey: this.config.apiKey
    });

    if (options?.category) {
      params.set('category', options.category);
    }
    if (options?.language) {
      params.set('language', options.language);
    }
    if (options?.country) {
      params.set('country', options.country);
    }

    const response = await fetch(`${this.baseUrl}/sources?${params}`);

    if (!response.ok) {
      throw new Error(`NewsAPI error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.sources;
  }

  normalize(raw: any): UnifiedDataItem {
    return {
      id: `newsapi:${Buffer.from(raw.url).toString('base64')}`,
      type: 'document',
      content: raw.description || raw.content || '',
      title: raw.title,
      metadata: {
        source: 'newsapi',
        created: new Date(raw.publishedAt),
        modified: new Date(raw.publishedAt),
        author: raw.author,
        url: raw.url,
        imageUrl: raw.urlToImage,
        publisher: raw.source?.name
      }
    };
  }

  private normalizeArticle(article: any): NewsArticle {
    return {
      id: Buffer.from(article.url).toString('base64'),
      title: article.title,
      description: article.description,
      content: article.content,
      author: article.author,
      source: article.source?.name,
      url: article.url,
      imageUrl: article.urlToImage,
      publishedAt: new Date(article.publishedAt)
    };
  }
}

interface NewsArticle {
  id: string;
  title: string;
  description?: string;
  content?: string;
  author?: string;
  source?: string;
  url: string;
  imageUrl?: string;
  publishedAt: Date;
}

interface NewsSource {
  id: string;
  name: string;
  description?: string;
  url?: string;
  category?: string;
  language?: string;
  country?: string;
}
```

### 特点

- ✅ 覆盖全球 70,000+ 新闻源
- ✅ 支持按来源、语言、国家过滤
- ✅ 支持头条和搜索两种模式
- ⚠️ 免费版有请求限制 (100 req/day)

---

## 2. GNews Adapter

### 概述

GNews 提供简洁的新闻 API，支持多语言。

### 配置

```json
{
  "enabled": true,
  "apiKey": "gnews_api_key",
  "lang": "en",
  "country": "us",
  "max": 100
}
```

### 实现

```typescript
interface GNewsConfig {
  enabled: boolean;
  apiKey: string;
  lang?: string;
  country?: string;
  max?: number;
}

class GNewsAdapter implements DataSourceAdapter {
  name = 'gnews';
  type = 'news' as const;

  private config: GNewsConfig;
  private baseUrl = 'https://gnews.io/api/v4';

  constructor(config: GNewsConfig) {
    this.config = config;
  }

  async search(query: string, options?: NewsSearchOptions): Promise<NewsArticle[]> {
    const params = new URLSearchParams({
      q: query,
      token: this.config.apiKey,
      lang: options?.lang || this.config.lang || 'en',
      country: options?.country || this.config.country || 'us',
      max: String(options?.limit || this.config.max || 100)
    });

    if (options?.from) {
      params.set('from', options.from.toISOString());
    }
    if (options?.to) {
      params.set('to', options.to.toISOString());
    }
    if (options?.in) {
      params.set('in', options.in); // title, description, content
    }
    if (options?.sortby) {
      params.set('sortby', options.sortby); // publishedAt, relevance
    }

    const response = await fetch(`${this.baseUrl}/search?${params}`);

    if (!response.ok) {
      throw new Error(`GNews error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.articles.map(this.normalizeArticle);
  }

  async getTopHeadlines(options?: GNewsHeadlinesOptions): Promise<NewsArticle[]> {
    const params = new URLSearchParams({
      token: this.config.apiKey,
      lang: options?.lang || this.config.lang || 'en',
      country: options?.country || this.config.country || 'us',
      max: String(options?.limit || this.config.max || 100)
    });

    if (options?.topic) {
      params.set('topic', options.topic);
      // breaking-news, world, nation, business, technology, entertainment, sports, science, health
    }

    const response = await fetch(`${this.baseUrl}/top-headlines?${params}`);

    if (!response.ok) {
      throw new Error(`GNews error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.articles.map(this.normalizeArticle);
  }

  normalize(raw: any): UnifiedDataItem {
    return {
      id: `gnews:${Buffer.from(raw.url).toString('base64')}`,
      type: 'document',
      content: raw.description || '',
      title: raw.title,
      metadata: {
        source: 'gnews',
        created: new Date(raw.publishedAt),
        modified: new Date(raw.publishedAt),
        url: raw.url,
        imageUrl: raw.image,
        publisher: raw.source?.name
      }
    };
  }

  private normalizeArticle(article: any): NewsArticle {
    return {
      id: Buffer.from(article.url).toString('base64'),
      title: article.title,
      description: article.description,
      content: article.content,
      author: null,
      source: article.source?.name,
      url: article.url,
      imageUrl: article.image,
      publishedAt: new Date(article.publishedAt)
    };
  }
}
```

### 特点

- ✅ 简洁的 API
- ✅ 多语言支持
- ✅ 主题分类
- ⚠️ 免费版 100 请求/天

---

## 3. RSS Adapter

### 概述

RSS 是最通用的内容订阅格式，支持几乎所有新闻网站和博客。

### 配置

```json
{
  "enabled": true,
  "feeds": [
    {
      "url": "https://feeds.bbci.co.uk/news/rss.xml",
      "name": "BBC News",
      "category": "news"
    },
    {
      "url": "https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml",
      "name": "NYT Technology",
      "category": "tech"
    }
  ],
  "cacheTTL": 3600
}
```

### 实现

```typescript
import Parser from 'rss-parser';

interface RSSFeedConfig {
  url: string;
  name?: string;
  category?: string;
}

interface RSSConfig {
  enabled: boolean;
  feeds: RSSFeedConfig[];
  cacheTTL?: number;
}

class RSSAdapter implements DataSourceAdapter {
  name = 'rss';
  type = 'news' as const;

  private config: RSSConfig;
  private parser: Parser;
  private cache: Map<string, { data: any; expiry: number }>;

  constructor(config: RSSConfig) {
    this.config = config;
    this.parser = new Parser({
      timeout: 10000,
      headers: {
        'User-Agent': 'AggreResearch/1.0'
      }
    });
    this.cache = new Map();
  }

  async fetchFeed(feedUrl: string): Promise<Parser.Output> {
    // 检查缓存
    const cached = this.cache.get(feedUrl);
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }

    const feed = await this.parser.parseURL(feedUrl);

    // 缓存结果
    this.cache.set(feedUrl, {
      data: feed,
      expiry: Date.now() + (this.config.cacheTTL || 3600) * 1000
    });

    return feed;
  }

  async fetchAllFeeds(): Promise<Map<string, Parser.Output>> {
    const results = new Map<string, Parser.Output>();

    await Promise.all(
      this.config.feeds.map(async (feedConfig) => {
        try {
          const feed = await this.fetchFeed(feedConfig.url);
          results.set(feedConfig.name || feedConfig.url, feed);
        } catch (error) {
          console.warn(`Failed to fetch ${feedConfig.url}:`, error);
        }
      })
    );

    return results;
  }

  async search(query: string, options?: NewsSearchOptions): Promise<NewsArticle[]> {
    const results: NewsArticle[] = [];
    const queryLower = query.toLowerCase();

    const feeds = options?.feeds
      ? this.config.feeds.filter(f => options.feeds?.includes(f.name || f.url))
      : this.config.feeds;

    for (const feedConfig of feeds) {
      try {
        const feed = await this.fetchFeed(feedConfig.url);

        for (const item of feed.items) {
          const titleMatch = item.title?.toLowerCase().includes(queryLower);
          const contentMatch = item.content?.toLowerCase().includes(queryLower) ||
                              item.contentSnippet?.toLowerCase().includes(queryLower);

          if (titleMatch || contentMatch) {
            results.push(this.itemToArticle(item, feedConfig, feed.title));
          }
        }
      } catch (error) {
        console.warn(`Search failed for ${feedConfig.url}:`, error);
      }
    }

    // 按日期排序
    results.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());

    return results.slice(0, options?.limit || 100);
  }

  async getRecent(options?: { limit?: number; feeds?: string[] }): Promise<NewsArticle[]> {
    const results: NewsArticle[] = [];

    const feeds = options?.feeds
      ? this.config.feeds.filter(f => options.feeds?.includes(f.name || f.url))
      : this.config.feeds;

    for (const feedConfig of feeds) {
      try {
        const feed = await this.fetchFeed(feedConfig.url);

        for (const item of feed.items) {
          results.push(this.itemToArticle(item, feedConfig, feed.title));
        }
      } catch (error) {
        console.warn(`Failed to get recent from ${feedConfig.url}:`, error);
      }
    }

    // 按日期排序
    results.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());

    return results.slice(0, options?.limit || 100);
  }

  async addFeed(feedConfig: RSSFeedConfig): Promise<void> {
    // 验证 feed 可访问
    await this.fetchFeed(feedConfig.url);

    // 添加到配置
    this.config.feeds.push(feedConfig);

    // 持久化
    await this.saveConfig();
  }

  async removeFeed(feedUrl: string): Promise<void> {
    this.config.feeds = this.config.feeds.filter(f => f.url !== feedUrl);
    this.cache.delete(feedUrl);
    await this.saveConfig();
  }

  private itemToArticle(item: Parser.Item, feedConfig: RSSFeedConfig, feedTitle?: string): NewsArticle {
    return {
      id: item.guid || Buffer.from(item.link || '').toString('base64'),
      title: item.title || 'Untitled',
      description: item.contentSnippet || item.summary,
      content: item.content || item['content:encoded'],
      author: item.creator || item.author,
      source: feedConfig.name || feedTitle,
      url: item.link,
      imageUrl: item.enclosure?.url || this.extractImage(item.content),
      publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
      category: feedConfig.category
    };
  }

  private extractImage(content?: string): string | null {
    if (!content) return null;
    const match = content.match(/<img[^>]+src="([^">]+)"/);
    return match ? match[1] : null;
  }

  private async saveConfig(): Promise<void> {
    const configPath = `~/.claude/aggreresearch/rss-config.json`;
    await fs.writeJson(configPath, this.config);
  }

  normalize(raw: Parser.Item): UnifiedDataItem {
    return {
      id: `rss:${raw.guid || Buffer.from(raw.link || '').toString('base64')}`,
      type: 'document',
      content: raw.contentSnippet || raw.content || '',
      title: raw.title || 'Untitled',
      metadata: {
        source: 'rss',
        created: raw.pubDate ? new Date(raw.pubDate) : new Date(),
        modified: raw.pubDate ? new Date(raw.pubDate) : new Date(),
        author: raw.creator || raw.author,
        url: raw.link,
        categories: raw.categories
      }
    };
  }
}
```

### 特点

- ✅ 通用标准
- ✅ 免费，无限制
- ✅ 支持任意网站
- ✅ 支持播客 (Podcast RSS)

---

## 4. 统一新闻接口

```typescript
// 新闻适配器注册表
const newsAdapters: Record<string, DataSourceAdapter> = {
  newsapi: new NewsAPIAdapter(config.newsapi),
  gnews: new GNewsAdapter(config.gnews),
  rss: new RSSAdapter(config.rss)
};

// 统一新闻搜索
async function searchNews(
  query: string,
  options?: NewsSearchOptions
): Promise<UnifiedDataItem[]> {
  const sources = options?.sources || ['newsapi', 'gnews', 'rss'];

  const searchPromises = sources.map(async (source) => {
    const adapter = newsAdapters[source];
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
  const flatResults = allResults.flat();

  // 去重 (基于 URL)
  const seen = new Set<string>();
  return flatResults.filter(item => {
    const url = item.metadata.url;
    if (seen.has(url)) return false;
    seen.add(url);
    return true;
  });
}
```

---

## 在 AggreResearch 中的使用

```typescript
// 新闻趋势分析
async function analyzeNewsTrends(topic: string): Promise<NewsTrendAnalysis> {
  const articles = await searchNews(topic, {
    limit: 200,
    from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 最近7天
    sortBy: 'publishedAt'
  });

  return {
    totalArticles: articles.length,
    sources: countBySource(articles),
    timeline: groupByDate(articles),
    sentiment: await analyzeSentiment(articles),
    topKeywords: extractKeywords(articles)
  };
}
```

---

## 配置示例

```json
{
  "news": {
    "enabled": true,
    "adapters": {
      "newsapi": {
        "enabled": true,
        "apiKey": "${NEWSAPI_KEY}",
        "language": "en"
      },
      "gnews": {
        "enabled": true,
        "apiKey": "${GNEWS_KEY}",
        "lang": "en"
      },
      "rss": {
        "enabled": true,
        "feeds": [
          { "url": "https://feeds.bbci.co.uk/news/rss.xml", "name": "BBC" },
          { "url": "https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml", "name": "NYT Tech" }
        ]
      }
    }
  }
}
```

---

## 错误处理

| 错误 | 处理 |
|------|------|
| API 限额 | 降级到其他源 |
| RSS 解析失败 | 跳过该 feed |
| 网络超时 | 使用缓存 |
| 内容为空 | 跳过该条目 |
