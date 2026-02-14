---
name: AggreResearch/CommunityAdapters
description: 社区数据适配器 - Reddit、Discord、Telegram社区内容搜索
---

# 社区数据适配器

## 概述

集成主流社区平台，搜索和获取社区讨论内容。

---

## 1. Reddit Adapter

### 概述

Reddit 是全球最大的社区讨论平台，拥有海量用户生成内容。

### 配置

```json
{
  "enabled": true,
  "clientId": "reddit_client_id",
  "clientSecret": "reddit_client_secret",
  "userAgent": "AggreResearch/1.0",
  "subreddits": ["programming", "MachineLearning", "artificial"]
}
```

### 实现

```typescript
interface RedditConfig {
  enabled: boolean;
  clientId: string;
  clientSecret: string;
  userAgent: string;
  subreddits?: string[];
}

class RedditAdapter implements DataSourceAdapter {
  name = 'reddit';
  type = 'social' as const;

  private config: RedditConfig;
  private baseUrl = 'https://oauth.reddit.com';
  private accessToken: string | null = null;

  constructor(config: RedditConfig) {
    this.config = config;
  }

  async authenticate(): Promise<void> {
    const response = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': this.config.userAgent
      },
      body: 'grant_type=client_credentials'
    });

    const data = await response.json();
    this.accessToken = data.access_token;
  }

  async search(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    if (!this.accessToken) await this.authenticate();

    const params = new URLSearchParams({
      q: query,
      limit: String(options?.limit || 25),
      sort: options?.sort || 'relevance',
      t: options?.timeRange || 'all'
    });

    // 如果指定了subreddit
    if (options?.subreddit) {
      const response = await fetch(
        `${this.baseUrl}/r/${options.subreddit}/search?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'User-Agent': this.config.userAgent
          }
        }
      );
      const data = await response.json();
      return this.normalizeResults(data.data.children);
    }

    // 全站搜索
    const response = await fetch(`${this.baseUrl}/search?${params}`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'User-Agent': this.config.userAgent
      }
    });
    const data = await response.json();
    return this.normalizeResults(data.data.children);
  }

  async getPost(subreddit: string, postId: string): Promise<RedditPost> {
    if (!this.accessToken) await this.authenticate();

    const response = await fetch(
      `${this.baseUrl}/r/${subreddit}/comments/${postId}`,
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'User-Agent': this.config.userAgent
        }
      }
    );
    const data = await response.json();
    return this.normalizePost(data);
  }

  async getComments(subreddit: string, postId: string, options?: { limit?: number; depth?: number }): Promise<RedditComment[]> {
    if (!this.accessToken) await this.authenticate();

    const params = new URLSearchParams({
      limit: String(options?.limit || 100),
      depth: String(options?.depth || 5)
    });

    const response = await fetch(
      `${this.baseUrl}/r/${subreddit}/comments/${postId}?${params}`,
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'User-Agent': this.config.userAgent
        }
      }
    );
    const data = await response.json();
    return this.normalizeComments(data[1].data.children);
  }

  normalize(raw: any): UnifiedDataItem {
    return {
      id: `reddit:${raw.data.id}`,
      type: 'message',
      content: raw.data.selftext || raw.data.title,
      title: raw.data.title,
      metadata: {
        source: 'reddit',
        created: new Date(raw.data.created_utc * 1000),
        modified: new Date(raw.data.created_utc * 1000),
        author: raw.data.author,
        url: `https://reddit.com${raw.data.permalink}`,
        subreddit: raw.data.subreddit,
        score: raw.data.score,
        numComments: raw.data.num_comments,
        tags: [raw.data.link_flair_text].filter(Boolean)
      }
    };
  }

  private normalizeResults(children: any[]): SearchResult[] {
    return children.map(child => ({
      id: child.data.id,
      title: child.data.title,
      content: child.data.selftext,
      url: `https://reddit.com${child.data.permalink}`,
      score: child.data.score,
      author: child.data.author,
      subreddit: child.data.subreddit,
      created: new Date(child.data.created_utc * 1000)
    }));
  }
}
```

### 特点

- ✅ 拥有大量高质量讨论
- ✅ 支持按subreddit过滤
- ✅ 支持评论搜索
- ✅ 免费API可用

---

## 2. Discord Adapter

### 概述

Discord 是游戏和开发者社区的主要沟通平台。

### 配置

```json
{
  "enabled": true,
  "botToken": "discord_bot_token",
  "guilds": ["123456789", "987654321"],
  "channels": ["channel_id_1", "channel_id_2"]
}
```

### 实现

```typescript
interface DiscordConfig {
  enabled: boolean;
  botToken: string;
  guilds?: string[];
  channels?: string[];
}

class DiscordAdapter implements DataSourceAdapter {
  name = 'discord';
  type = 'social' as const;

  private config: DiscordConfig;
  private baseUrl = 'https://discord.com/api/v10';

  constructor(config: DiscordConfig) {
    this.config = config;
  }

  private getHeaders(): HeadersInit {
    return {
      'Authorization': `Bot ${this.config.botToken}`,
      'Content-Type': 'application/json'
    };
  }

  async search(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    // Discord API 不直接支持搜索，需要遍历频道
    const results: SearchResult[] = [];
    const channels = options?.channels || this.config.channels || [];

    for (const channelId of channels) {
      const messages = await this.getChannelMessages(channelId, {
        limit: options?.limit || 100
      });

      // 本地过滤匹配的消息
      const filtered = messages.filter(msg =>
        msg.content.toLowerCase().includes(query.toLowerCase())
      );

      results.push(...filtered.map(msg => this.messageToResult(msg, channelId)));
    }

    return results.slice(0, options?.limit || 25);
  }

  async getChannelMessages(channelId: string, options?: { limit?: number; before?: string }): Promise<DiscordMessage[]> {
    const params = new URLSearchParams({
      limit: String(options?.limit || 100)
    });
    if (options?.before) params.set('before', options.before);

    const response = await fetch(
      `${this.baseUrl}/channels/${channelId}/messages?${params}`,
      { headers: this.getHeaders() }
    );

    if (!response.ok) {
      throw new Error(`Discord API error: ${response.statusText}`);
    }

    return response.json();
  }

  async getGuildChannels(guildId: string): Promise<DiscordChannel[]> {
    const response = await fetch(
      `${this.baseUrl}/guilds/${guildId}/channels`,
      { headers: this.getHeaders() }
    );

    if (!response.ok) {
      throw new Error(`Discord API error: ${response.statusText}`);
    }

    return response.json();
  }

  normalize(raw: DiscordMessage): UnifiedDataItem {
    return {
      id: `discord:${raw.id}`,
      type: 'message',
      content: raw.content,
      title: null,
      metadata: {
        source: 'discord',
        created: new Date(raw.timestamp),
        modified: new Date(raw.edited_timestamp || raw.timestamp),
        author: raw.author.username,
        authorId: raw.author.id,
        channelId: raw.channel_id,
        url: `https://discord.com/channels/@me/${raw.channel_id}/${raw.id}`,
        attachments: raw.attachments?.map((a: any) => a.url),
        reactions: raw.reactions?.map((r: any) => ({ emoji: r.emoji.name, count: r.count }))
      }
    };
  }

  private messageToResult(msg: DiscordMessage, channelId: string): SearchResult {
    return {
      id: msg.id,
      title: null,
      content: msg.content,
      url: `https://discord.com/channels/@me/${channelId}/${msg.id}`,
      author: msg.author.username,
      created: new Date(msg.timestamp)
    };
  }
}

interface DiscordMessage {
  id: string;
  content: string;
  author: { id: string; username: string; };
  timestamp: string;
  edited_timestamp: string | null;
  channel_id: string;
  attachments?: { url: string }[];
  reactions?: { emoji: { name: string }; count: number }[];
}
```

### 特点

- ✅ 实时消息获取
- ✅ 支持多服务器/频道
- ✅ 附件支持
- ⚠️ 需要Bot权限

---

## 3. Telegram Adapter

### 概述

Telegram 是注重隐私的即时通讯平台，拥有大量技术社区。

### 配置

```json
{
  "enabled": true,
  "apiId": 12345,
  "apiHash": "telegram_api_hash",
  "channels": ["@channel1", "@channel2"],
  "sessionName": "aggreresearch_session"
}
```

### 实现

```typescript
interface TelegramConfig {
  enabled: boolean;
  apiId: number;
  apiHash: string;
  channels?: string[];
  sessionName?: string;
}

class TelegramAdapter implements DataSourceAdapter {
  name = 'telegram';
  type = 'social' as const;

  private config: TelegramConfig;
  private client: TelegramClient | null = null;

  constructor(config: TelegramConfig) {
    this.config = config;
  }

  async authenticate(): Promise<void> {
    // 使用 gramjs 或 telethon 库
    // 这里是概念性实现
    const { TelegramClient } = await import('telegram');

    this.client = new TelegramClient(
      this.config.sessionName || 'session',
      this.config.apiId,
      this.config.apiHash,
      { connectionRetries: 5 }
    );

    await this.client.connect();
  }

  async search(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    if (!this.client) await this.authenticate();

    const results: SearchResult[] = [];
    const channels = options?.channels || this.config.channels || [];

    for (const channel of channels) {
      try {
        const messages = await this.client.getMessages(channel, {
          limit: options?.limit || 100,
          search: query
        });

        for (const msg of messages) {
          results.push(this.messageToResult(msg, channel));
        }
      } catch (error) {
        console.warn(`Failed to search in ${channel}:`, error);
      }
    }

    return results;
  }

  async getChannelInfo(channel: string): Promise<TelegramChannelInfo> {
    if (!this.client) await this.authenticate();

    const entity = await this.client.getEntity(channel);
    return {
      id: entity.id.toString(),
      title: entity.title || 'Unknown',
      username: entity.username || null,
      membersCount: (entity as any).participantsCount || 0
    };
  }

  normalize(raw: TelegramMessage): UnifiedDataItem {
    return {
      id: `telegram:${raw.id}`,
      type: 'message',
      content: raw.message || raw.text || '',
      title: null,
      metadata: {
        source: 'telegram',
        created: new Date(raw.date * 1000),
        modified: new Date(raw.date * 1000),
        author: raw.fromId?.toString() || 'Unknown',
        channelId: raw.peerId?.toString(),
        views: raw.views,
        forwards: raw.forwards,
        replies: raw.replies?.replies,
        mediaType: raw.media?.className
      }
    };
  }

  private messageToResult(msg: TelegramMessage, channel: string): SearchResult {
    return {
      id: msg.id.toString(),
      title: null,
      content: msg.message || msg.text || '',
      url: `https://t.me/${channel.replace('@', '')}/${msg.id}`,
      author: msg.fromId?.toString(),
      created: new Date(msg.date * 1000),
      views: msg.views
    };
  }
}
```

### 特点

- ✅ 隐私友好
- ✅ 大型技术社区
- ✅ 支持频道和群组
- ✅ 原生搜索API

---

## 4. 统一社区搜索接口

```typescript
// 社区数据适配器注册表
const communityAdapters: Record<string, DataSourceAdapter> = {
  reddit: new RedditAdapter(config.reddit),
  discord: new DiscordAdapter(config.discord),
  telegram: new TelegramAdapter(config.telegram)
};

// 统一社区搜索
async function searchCommunity(
  query: string,
  options?: CommunitySearchOptions
): Promise<UnifiedDataItem[]> {
  const sources = options?.sources || ['reddit', 'discord', 'telegram'];
  const results: UnifiedDataItem[] = [];

  // 并行搜索多个平台
  const searchPromises = sources.map(async (source) => {
    const adapter = communityAdapters[source];
    if (!adapter || !config[source]?.enabled) return [];

    try {
      const searchResults = await adapter.search(query, options);
      return searchResults.map(r => adapter.normalize(r));
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

## 在 AggreResearch 中的使用

### 社区观点收集

```typescript
// 在 Research 工作流中使用
async function gatherCommunityOpinions(topic: string): Promise<CommunityInsights> {
  const results = await searchCommunity(topic, {
    sources: ['reddit', 'discord', 'telegram'],
    limit: 50,
    timeRange: 'week'
  });

  return {
    totalPosts: results.length,
    platforms: {
      reddit: results.filter(r => r.metadata.source === 'reddit').length,
      discord: results.filter(r => r.metadata.source === 'discord').length,
      telegram: results.filter(r => r.metadata.source === 'telegram').length
    },
    items: results,
    summary: await summarizeCommunitySentiment(results)
  };
}
```

---

## 错误处理

| 错误 | 处理 |
|------|------|
| API限流 | 指数退避重试 |
| 认证失效 | 重新认证 |
| 频道/服务器不可访问 | 跳过并记录警告 |
| 内容过滤 | 返回空结果，记录原因 |

---

## 配置示例

```json
{
  "community": {
    "enabled": true,
    "adapters": {
      "reddit": {
        "enabled": true,
        "clientId": "${REDDIT_CLIENT_ID}",
        "clientSecret": "${REDDIT_CLIENT_SECRET}",
        "userAgent": "AggreResearch/1.0"
      },
      "discord": {
        "enabled": true,
        "botToken": "${DISCORD_BOT_TOKEN}",
        "channels": ["123456789"]
      },
      "telegram": {
        "enabled": true,
        "apiId": "${TELEGRAM_API_ID}",
        "apiHash": "${TELEGRAM_API_HASH}",
        "channels": ["@channel1", "@channel2"]
      }
    },
    "timeout": 30000
  }
}
```
