# AggreResearch - 能力供应商架构

## 概述

能力供应商层负责封装底层调研能力，提供统一的接口抽象。

## 架构图

```
┌─────────────────────────────────────────────┐
│              AggreResearch Gateway          │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│              Router Layer                   │
│         (意图分析 + 能力选择)                 │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│           Adapter Layer                     │
│    (能力适配器 - 屏蔽底层差异)               │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│          Provider Layer                     │
│   (DeepResearch | Research | WebSearch...)  │
└─────────────────────────────────────────────┘
```

## 供应商列表

### 1. WebSearchProvider

| 属性 | 值 |
|------|-----|
| 用途 | 快速事实查询 |
| 调用方式 | Claude Code 内置 WebSearch |
| 特点 | 免费、无需API、速度快 |
| 适用场景 | 简单事实、定义、时效信息 |

### 2. ResearchProvider

| 属性 | 值 |
|------|-----|
| 用途 | 标准研究分析 |
| 调用方式 | Research Skill |
| 特点 | 多Agent并行、多源整合 |
| 适用场景 | 需要分析、多视角、整合提炼 |

### 3. DeepResearchProvider

| 属性 | 值 |
|------|-----|
| 用途 | 深度系统性研究 |
| 调用方式 | DeepResearch Skill |
| 特点 | 5阶段架构、知识基线、深度分析 |
| 适用场景 | 复杂决策、全面分析、学术研究 |

### 4. BrowserProvider

| 属性 | 值 |
|------|-----|
| 用途 | 网页内容验证与抓取 |
| 调用方式 | Browser Skill |
| 特点 | 动态内容、交互验证 |
| 适用场景 | 验证网页信息、抓取动态内容 |

### 5. OSINTProvider

| 属性 | 值 |
|------|-----|
| 用途 | 开源情报收集 |
| 调用方式 | OSINT Skill |
| 特点 | 人物/公司调查、公开情报 |
| 适用场景 | 背景调查、尽职调查 |

### 6. GeminiResearcherProvider

| 属性 | 值 |
|------|-----|
| 用途 | 多视角研究 |
| 调用方式 | GeminiResearcher Agent |
| 特点 | 多角度分析、场景规划 |
| 适用场景 | 需要不同视角、综合性分析 |

### 7. ClaudeResearcherProvider

| 属性 | 值 |
|------|-----|
| 用途 | 学术深度研究 |
| 调用方式 | ClaudeResearcher Agent |
| 特点 | 深度分析、学术资源 |
| 适用场景 | 学术研究、战略分析 |

---

## 搜索源供应商 (Search Providers)

### 通用搜索

| 供应商 | 用途 | API/工具 | 特点 |
|--------|------|----------|------|
| **WebSearch** | 通用搜索 | Claude Code 内置 | 免费、快速 |
| **Brave** | 隐私搜索 | Brave Search API | 无追踪、结果质量高 |
| **Exa** | AI语义搜索 | Exa API | 理解意图、精准匹配 |
| **Google** | 综合搜索 | SerpAPI / 自定义 | 最全结果 |
| **DuckDuckGo** | 隐私搜索 | DuckDuckGo API | 无追踪 |

### 专业搜索

| 供应商 | 用途 | 特点 |
|--------|------|------|
| **Wikipedia** | 百科知识 | 结构化、可验证 |
| **GitHub** | 代码搜索 | 项目、代码、Issue搜索 |
| **Arxiv** | 学术论文 | AI/ML/物理等 preprint |
| **Google Scholar** | 学术搜索 | 论文引用、学术资源 |
| **PubMed** | 医学文献 | 生物医学领域 |
| **Semantic Scholar** | 学术搜索 | AI驱动的论文理解 |

### 中文搜索

| 供应商 | 用途 | 特点 |
|--------|------|------|
| **秘塔AI搜索** | AI搜索 | 结构化结果、无广告 |
| **知乎** | 社区内容 | 专业讨论、深度回答 |
| **Bing** | 中文搜索 | 微软搜索 |

---

## 实时数据供应商 (Real-time Data)

### 金融数据

| 供应商 | 用途 | 数据 |
|--------|------|------|
| **Yahoo Finance** | 股票行情 | 实时价格、历史数据 |
| **Alpha Vantage** | 股票/外汇 | 技术指标、财报 |
| **Tencent Finance** | A股数据 | 沪深行情 |

### 天气数据

| 供应商 | 用途 | 数据 |
|--------|------|------|
| **OpenWeatherMap** | 天气API | 实时天气、预报 |
| **WeatherAPI** | 天气API | 分钟级预报 |

### 新闻数据

| 供应商 | 用途 | 数据 |
|--------|------|------|
| **NewsAPI** | 新闻聚合 | 全球新闻源 |
| **Reddit** | 社区热点 | 趋势讨论 |

---

## RAG供应商

### 向量存储

| 供应商 | 用途 | 特点 |
|--------|------|------|
| **SQLite + Embedding** | 轻量向量存储 | 无需额外服务 |
| **Chroma** | 向量数据库 | 开源、易用 |
| **Qdrant** | 向量数据库 | 高性能、云原生 |

### Embedding模型

| 模型 | 用途 | 特点 |
|------|------|------|
| **text-embedding-3-small** | OpenAI Embedding | 快速、便宜 |
| **bge-small-zh** | 中文Embedding | 中文优化 |
| **bge-base-zh** | 中文Embedding | 效果更好 |

## 适配器接口

```typescript
interface ResearchAdapter {
  // 供应商名称
  name: string;

  // 是否支持当前查询
  support(intent: QueryIntent): boolean;

  // 执行研究
  execute(request: ResearchRequest): Promise<RawResult>;

  // 结果归一化
  normalize(raw: RawResult): NormalizedResult;
}

// 查询意图
interface QueryIntent {
  query: string;
  complexity: 1 | 2 | 3;        // 复杂度
  timeliness: 'historical' | 'current' | 'future';
  multiPerspective: boolean;
  sourceRequirement?: string[];
}

// 归一化结果
interface NormalizedResult {
  content: string;
  sources: Source[];
  metadata: {
    provider: string;
    mode: string;
    duration: number;
  };
}
```

## 路由规则

### 优先级排序

1. **精确匹配** - 指定了特定供应商
2. **复杂度匹配** - 根据复杂度选择
3. **默认回退** - Research (Standard)

### 降级策略

```
DeepResearch 不可用 → Research (Extensive)
Research 不可用 → WebSearch + 深度总结
WebSearch 不可用 → 返回错误 + 建议
```

## 扩展新的供应商

### Step 1: 创建适配器

```typescript
class NewProviderAdapter implements ResearchAdapter {
  name = 'NewProvider';

  support(intent: QueryIntent): boolean {
    // 判断是否支持
    return intent.feature === 'special';
  }

  async execute(request: ResearchRequest): Promise<RawResult> {
    // 调用底层能力
  }

  normalize(raw: RawResult): NormalizedResult {
    // 归一化输出
  }
}
```

### Step 2: 注册适配器

```typescript
// 在 Router 中注册
adapters.register(new NewProviderAdapter());
```

### Step 3: 更新路由规则

在决策表中添加新的路由规则。
