---
name: AggreResearch/SocialMediaAdapters
description: 社媒适配器 - Twitter/X、LinkedIn、Instagram社交媒体数据
---

# 社媒适配器

## 概述

集成主流社交媒体平台，获取公开内容和用户数据。

---

## 1. Twitter/X Adapter

### 概述

Twitter/X 是实时信息和公众舆论的主要来源。

### 配置

```json
{
  "enabled": true,
  "bearerToken": "twitter_bearer_token",
  "consumerKey": "consumer_key",
  "consumerSecret": "consumer_secret",
  "accessToken": "access_token",
  "accessSecret": "access_secret"
}
```

### 实现

```typescript
interface TwitterConfig {
  enabled: boolean;
  bearerToken: string;
  consumerKey?: string;
  consumerSecret?: string;
  accessToken?: string;
  accessSecret?: string;
}

class TwitterAdapter implements DataSourceAdapter {
  name = 'twitter';
  type = 'social' as const;

  private config: TwitterConfig;
  private baseUrl = 'https://api.twitter.com/2';

  constructor(config: TwitterConfig) {
    this.config = config;
  }

  private getHeaders(): HeadersInit {
    return {
      'Authorization': `Bearer ${this.config.bearerToken}`,
      'Content-Type': 'application/json'
    };
  }

  async search(query: string, options?: TwitterSearchOptions): Promise<Tweet[]> {
    const params = new URLSearchParams({
      query,
      max_results: String(options?.limit || 100),
      'tweet.fields': 'created_at,author_id,public_metrics,entities,context_annotations',
      'expansions': 'author_id',
      'user.fields': 'name,username,profile_image_url'
    });

    if (options?.startTime) {
      params.set('start_time', options.startTime.toISOString());
    }
    if (options?.endTime) {
      params.set('end_time', options.endTime.toISOString());
    }
    if (options?.sortOrder) {
      params.set('sort_order', options.sortOrder); // recency, relevancy
    }

    const response = await fetch(`${this.baseUrl}/tweets/search/recent?${params}`, {
      headers: this.getHeaders()
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Twitter rate limit exceeded');
      }
      throw new Error(`Twitter API error: ${response.statusText}`);
    }

    const data = await response.json();
    return this.normalizeTweets(data);
  }

  async getUserTweets(userId: string, options?: { limit?: number; excludeReplies?: boolean }): Promise<Tweet[]> {
    const params = new URLSearchParams({
      max_results: String(options?.limit || 100),
      'tweet.fields': 'created_at,public_metrics,entities',
      exclude: options?.excludeReplies ? 'replies,retweets' : 'retweets'
    });

    const response = await fetch(`${this.baseUrl}/users/${userId}/tweets?${params}`, {
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error(`Twitter API error: ${response.statusText}`);
    }

    const data = await response.json();
    return this.normalizeTweets(data);
  }

  async getUserByUsername(username: string): Promise<TwitterUser> {
    const params = new URLSearchParams({
      'user.fields': 'created_at,description,public_metrics,verified,location'
    });

    const response = await fetch(`${this.baseUrl}/users/by/username/${username}?${params}`, {
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error(`Twitter API error: ${response.statusText}`);
    }

    const data = await response.json();
    return this.normalizeUser(data.data);
  }

  async getTweet(tweetId: string): Promise<Tweet> {
    const params = new URLSearchParams({
      'tweet.fields': 'created_at,author_id,public_metrics,entities,context_annotations',
      'expansions': 'author_id',
      'user.fields': 'name,username'
    });

    const response = await fetch(`${this.baseUrl}/tweets/${tweetId}?${params}`, {
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error(`Twitter API error: ${response.statusText}`);
    }

    const data = await response.json();
    return this.normalizeTweet(data.data, data.includes?.users?.[0]);
  }

  async getTrendingTopics(woeid: number = 1): Promise<TrendingTopic[]> {
    const response = await fetch(`${this.baseUrl}/trends/${woeid}`, {
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error(`Twitter API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data[0].trends.map((t: any) => ({
      name: t.name,
      url: t.url,
      tweetVolume: t.tweet_volume
    }));
  }

  normalize(raw: any): UnifiedDataItem {
    return {
      id: `twitter:${raw.id}`,
      type: 'message',
      content: raw.text,
      title: null,
      metadata: {
        source: 'twitter',
        created: new Date(raw.created_at),
        modified: new Date(raw.created_at),
        author: raw.author?.username,
        authorId: raw.author_id,
        url: `https://twitter.com/i/web/status/${raw.id}`,
        metrics: raw.public_metrics,
        hashtags: raw.entities?.hashtags?.map((h: any) => h.tag),
        mentions: raw.entities?.mentions?.map((m: any) => m.username)
      }
    };
  }

  private normalizeTweets(data: any): Tweet[] {
    const users = new Map(data.includes?.users?.map((u: any) => [u.id, u]) || []);

    return (data.data || []).map((tweet: any) => {
      const author = users.get(tweet.author_id);
      return this.normalizeTweet(tweet, author);
    });
  }

  private normalizeTweet(tweet: any, author?: any): Tweet {
    return {
      id: tweet.id,
      text: tweet.text,
      author: author ? {
        id: author.id,
        name: author.name,
        username: author.username
      } : undefined,
      createdAt: new Date(tweet.created_at),
      metrics: tweet.public_metrics,
      hashtags: tweet.entities?.hashtags?.map((h: any) => h.tag) || [],
      urls: tweet.entities?.urls?.map((u: any) => u.expanded_url) || [],
      mentions: tweet.entities?.mentions?.map((m: any) => m.username) || []
    };
  }

  private normalizeUser(user: any): TwitterUser {
    return {
      id: user.id,
      name: user.name,
      username: user.username,
      description: user.description,
      location: user.location,
      verified: user.verified,
      followersCount: user.public_metrics?.followers_count,
      followingCount: user.public_metrics?.following_count,
      tweetCount: user.public_metrics?.tweet_count,
      createdAt: new Date(user.created_at)
    };
  }
}

interface Tweet {
  id: string;
  text: string;
  author?: { id: string; name: string; username: string };
  createdAt: Date;
  metrics?: {
    like_count: number;
    retweet_count: number;
    reply_count: number;
    quote_count: number;
  };
  hashtags: string[];
  urls: string[];
  mentions: string[];
}

interface TwitterUser {
  id: string;
  name: string;
  username: string;
  description?: string;
  location?: string;
  verified?: boolean;
  followersCount?: number;
  followingCount?: number;
  tweetCount?: number;
  createdAt: Date;
}

interface TrendingTopic {
  name: string;
  url: string;
  tweetVolume?: number;
}
```

### 特点

- ✅ 实时数据
- ✅ 趋势话题
- ✅ 用户分析
- ⚠️ API 限制较严 (Basic: 50 req/day)

---

## 2. LinkedIn Adapter

### 概述

LinkedIn 是职业社交网络，适合公司和人员研究。

### 配置

```json
{
  "enabled": true,
  "clientId": "linkedin_client_id",
  "clientSecret": "linkedin_client_secret",
  "accessToken": "access_token"
}
```

### 实现

```typescript
interface LinkedInConfig {
  enabled: boolean;
  clientId: string;
  clientSecret: string;
  accessToken: string;
}

class LinkedInAdapter implements DataSourceAdapter {
  name = 'linkedin';
  type = 'social' as const;

  private config: LinkedInConfig;
  private baseUrl = 'https://api.linkedin.com/v2';

  constructor(config: LinkedInConfig) {
    this.config = config;
  }

  private getHeaders(): HeadersInit {
    return {
      'Authorization': `Bearer ${this.config.accessToken}`,
      'Content-Type': 'application/json'
    };
  }

  async getProfile(): Promise<LinkedInProfile> {
    const response = await fetch(
      `${this.baseUrl}/me?projection=(id,firstName,lastName,headline,profilePicture(displayImage~:playableStreams))`,
      { headers: this.getHeaders() }
    );

    if (!response.ok) {
      throw new Error(`LinkedIn API error: ${response.statusText}`);
    }

    return response.json();
  }

  async getCompanyInfo(companyId: string): Promise<LinkedInCompany> {
    const response = await fetch(
      `${this.baseUrl}/organizations/${companyId}`,
      { headers: this.getHeaders() }
    );

    if (!response.ok) {
      throw new Error(`LinkedIn API error: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      id: data.id,
      name: data.name,
      universalName: data.vanityName,
      description: data.description,
      industry: data.industry,
      website: data.websiteUrl,
      founded: data.foundedYear,
      employeeCount: data.staffCount,
      specialties: data.specialties
    };
  }

  async searchPeople(query: string, options?: LinkedInSearchOptions): Promise<LinkedInPerson[]> {
    // LinkedIn API 搜索有限制，这里使用概念性实现
    const response = await fetch(
      `${this.baseUrl}/search?q=people&keywords=${encodeURIComponent(query)}`,
      { headers: this.getHeaders() }
    );

    if (!response.ok) {
      throw new Error(`LinkedIn API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.elements?.map(this.normalizePerson) || [];
  }

  async getShares(options?: { limit?: number }): Promise<LinkedInShare[]> {
    const response = await fetch(
      `${this.baseUrl}/shares?q=owners&owners=urn:li:organization:${options?.limit || 50}`,
      { headers: this.getHeaders() }
    );

    if (!response.ok) {
      throw new Error(`LinkedIn API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.elements || [];
  }

  normalize(raw: any): UnifiedDataItem {
    return {
      id: `linkedin:${raw.id}`,
      type: raw.type === 'share' ? 'message' : 'contact',
      content: raw.text?.text || raw.description || '',
      title: raw.title?.text || raw.headline || null,
      metadata: {
        source: 'linkedin',
        created: raw.created?.time ? new Date(raw.created.time) : new Date(),
        modified: raw.lastModified?.time ? new Date(raw.lastModified.time) : new Date(),
        author: raw.author?.name,
        url: raw.editableUrl,
        company: raw.organization?.name
      }
    };
  }

  private normalizePerson(person: any): LinkedInPerson {
    return {
      id: person.id,
      firstName: person.firstName,
      lastName: person.lastName,
      headline: person.headline,
      industry: person.industry,
      location: person.location?.name
    };
  }
}

interface LinkedInProfile {
  id: string;
  firstName: string;
  lastName: string;
  headline?: string;
  profilePicture?: { displayImage: string };
}

interface LinkedInCompany {
  id: string;
  name: string;
  universalName?: string;
  description?: string;
  industry?: string;
  website?: string;
  founded?: number;
  employeeCount?: number;
  specialties?: string[];
}

interface LinkedInPerson {
  id: string;
  firstName: string;
  lastName: string;
  headline?: string;
  industry?: string;
  location?: string;
}

interface LinkedInShare {
  id: string;
  text?: { text: string };
  created?: { time: number };
  owner: string;
}
```

### 特点

- ✅ 专业人脉
- ✅ 公司信息
- ⚠️ API 访问受限
- ⚠️ 需要 LinkedIn Partner

---

## 3. Apify 社交媒体爬虫

### 概述

使用 Apify 提供的爬虫服务获取社交媒体数据，无需官方 API。

### 配置

```json
{
  "enabled": true,
  "apifyToken": "apify_api_token",
  "actors": {
    "twitter": "apidojo/twitter-scraper",
    "instagram": "apify/instagram-scraper",
    "linkedin": "apify/linkedin-profile-scraper"
  }
}
```

### 实现

```typescript
interface ApifyConfig {
  enabled: boolean;
  apifyToken: string;
  actors: Record<string, string>;
}

class ApifySocialAdapter implements DataSourceAdapter {
  name = 'apify-social';
  type = 'social' as const;

  private config: ApifyConfig;
  private baseUrl = 'https://api.apify.com/v2';

  constructor(config: ApifyConfig) {
    this.config = config;
  }

  async scrapeTwitter(query: string, options?: TwitterScrapeOptions): Promise<any[]> {
    const actorId = this.config.actors.twitter;
    const runId = await this.runActor(actorId, {
      queries: query,
      tweetsDesired: options?.limit || 100,
      ...options
    });

    return this.getDatasetItems(runId);
  }

  async scrapeInstagram(username: string, options?: InstagramScrapeOptions): Promise<any[]> {
    const actorId = this.config.actors.instagram;
    const runId = await this.runActor(actorId, {
      usernames: [username],
      resultsLimit: options?.limit || 100,
      ...options
    });

    return this.getDatasetItems(runId);
  }

  async scrapeLinkedInProfile(profileUrl: string): Promise<any> {
    const actorId = this.config.actors.linkedin;
    const runId = await this.runActor(actorId, {
      profiles: [profileUrl]
    });

    const items = await this.getDatasetItems(runId);
    return items[0];
  }

  private async runActor(actorId: string, input: any): Promise<string> {
    const response = await fetch(
      `${this.baseUrl}/acts/${actorId}/runs?token=${this.config.apifyToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input })
      }
    );

    if (!response.ok) {
      throw new Error(`Apify API error: ${response.statusText}`);
    }

    const data = await response.json();

    // 等待完成
    return this.waitForRun(data.data.id);
  }

  private async waitForRun(runId: string): Promise<string> {
    const maxWait = 5 * 60 * 1000; // 5 minutes
    const startTime = Date.now();

    while (Date.now() - startTime < maxWait) {
      const response = await fetch(
        `${this.baseUrl}/actor-runs/${runId}?token=${this.config.apifyToken}`
      );

      const data = await response.json();
      const status = data.data.status;

      if (status === 'SUCCEEDED') {
        return data.data.defaultDatasetId;
      }

      if (status === 'FAILED' || status === 'ABORTED') {
        throw new Error(`Actor run failed: ${status}`);
      }

      await new Promise(r => setTimeout(r, 2000));
    }

    throw new Error('Actor run timeout');
  }

  private async getDatasetItems(datasetId: string): Promise<any[]> {
    const response = await fetch(
      `${this.baseUrl}/datasets/${datasetId}/items?token=${this.config.apifyToken}&clean=true`
    );

    if (!response.ok) {
      throw new Error(`Apify API error: ${response.statusText}`);
    }

    return response.json();
  }

  normalize(raw: any): UnifiedDataItem {
    const source = raw.source || 'apify-social';
    return {
      id: `${source}:${raw.id}`,
      type: 'message',
      content: raw.text || raw.caption || raw.description || '',
      title: null,
      metadata: {
        source,
        created: raw.createdAt ? new Date(raw.createdAt) : new Date(),
        modified: raw.createdAt ? new Date(raw.createdAt) : new Date(),
        author: raw.username || raw.author,
        url: raw.url,
        likes: raw.likes,
        comments: raw.comments,
        shares: raw.retweets || raw.shares
      }
    };
  }
}
```

### 特点

- ✅ 无需官方 API
- ✅ 支持多平台
- ✅ 批量数据获取
- ⚠️ 付费服务

---

## 配置示例

```json
{
  "socialMedia": {
    "enabled": true,
    "adapters": {
      "twitter": {
        "enabled": true,
        "bearerToken": "${TWITTER_BEARER_TOKEN}"
      },
      "linkedin": {
        "enabled": true,
        "clientId": "${LINKEDIN_CLIENT_ID}",
        "clientSecret": "${LINKEDIN_CLIENT_SECRET}",
        "accessToken": "${LINKEDIN_ACCESS_TOKEN}"
      },
      "apify": {
        "enabled": true,
        "apifyToken": "${APIFY_TOKEN}"
      }
    }
  }
}
```

---

## 错误处理

| 错误 | 处理 |
|------|------|
| Rate limit | 等待并重试 |
| Token 过期 | 使用 refresh token |
| 账号被封禁 | 切换到爬虫方案 |
| 内容不存在 | 跳过并记录 |
