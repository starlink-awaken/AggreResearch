---
name: AggreResearch
description: 聚合搜索调研能力 - 统一入口，屏蔽底层复杂性，对外暴露简单接口。USE WHEN 用户需要搜索、查询、调研、研究、分析、整合、提炼、总结时。
---

# AggreResearch

聚合搜索调研能力系统 - 统一入口，智能路由，结果归一化。

## 核心价值

- **统一入口**：一个Skill解决80%调研场景
- **智能路由**：LLM意图分析，选择最优能力
- **结果归一化**：统一输出格式，屏蔽供应商差异
- **可扩展**：新能力可热插拔加入
- **错误处理**：统一的错误处理框架，确保意图执行

## 能力矩阵

| 能力 | 用途 | 路由触发 |
|------|------|---------|
| WebSearch | 快速事实查询 | 简单问题、时效性信息 |
| Research | 标准研究分析 | 需要分析、多视角 |
| DeepResearch | 深度系统性研究 | 复杂决策、全面分析 |
| Browser | 网页内容验证 | 验证网页、抓取动态内容 |
| OSINT | 背景调查 | 人物/公司调查、尽职调查 |
| **RAG** | 本地知识检索 | "根据我..."、"索引..." |
| **DeepReport** | Manus级深度报告 | "深度报告"、"全景分析" |
| **DataSync** | 个人数据同步 | "同步..."、"开启自动同步" |
| **UnifiedSearch** | 跨数据源搜索 | "搜索我..."、"汇总..." |
| **IntentAnalysis** | LLM意图分析 | 内部：理解用户真实意图 |
| **AISearch** | AI智能搜索 | Perplexity/Phind/You.com |

## 工作流路由

| 触发 | 工作流/能力 | 类型 |
|------|--------|------|
| "搜索" "查询" | `Workflows/QuickSearch.md` | 内部工作流 |
| "调研" "研究" "分析" | `Workflows/Research.md` | 内部工作流 |
| "深度研究" "全面分析" | DeepResearch Skill | 外部Skill调用 |
| "调查" "背景" | OSINT Skill | 外部Skill调用 |
| "索引" "RAG" | `Workflows/RAGIndex.md` | 内部工作流 |
| "查询笔记" "根据我" | `Workflows/RAGQuery.md` | 内部工作流 |
| "深度报告" "全景分析" | `Workflows/DeepReport.md` | 内部工作流 |
| "同步" "自动同步" | `Workflows/DataSync.md` | 内部工作流 |
| "搜索我" "汇总" | `Workflows/UnifiedSearch.md` | 内部工作流 |
| "意图分析" | `Workflows/IntentAnalysis.md` | 内部工作流 |

---

## 数据源适配器

### 笔记类 (Notes)

| 数据源 | 适配器 | 状态 |
|--------|--------|------|
| Obsidian | `Adapters/ObsidianAdapter.md` | ✅ 已实现 |
| Notion | `Adapters/NotionAdapter.md` | ✅ 已实现 |
| Logseq | `Adapters/KnowledgeToolAdapters.md` | ✅ 已实现 |
| 本地文件 | 已有 RAGIndex | ✅ |

### 云盘类 (Cloud Storage)

| 数据源 | 适配器 | 状态 |
|--------|--------|------|
| Google Drive | `Adapters/CloudStorageAdapters.md` | ✅ 已实现 |
| Dropbox | `Adapters/CloudStorageAdapters.md` | ✅ 已实现 |

### 社区类 (Community)

| 数据源 | 适配器 | 状态 |
|--------|--------|------|
| Reddit | `Adapters/CommunityAdapters.md` | ✅ 已实现 |
| Discord | `Adapters/CommunityAdapters.md` | ✅ 已实现 |
| Telegram | `Adapters/CommunityAdapters.md` | ✅ 已实现 |

### 社媒类 (Social Media)

| 数据源 | 适配器 | 状态 |
|--------|--------|------|
| Twitter/X | `Adapters/SocialMediaAdapters.md` | ✅ 已实现 |
| LinkedIn | `Adapters/SocialMediaAdapters.md` | ✅ 已实现 |
| Apify爬虫 | `Adapters/SocialMediaAdapters.md` | ✅ 已实现 |

### 新闻类 (News)

| 数据源 | 适配器 | 状态 |
|--------|--------|------|
| NewsAPI | `Adapters/NewsAdapters.md` | ✅ 已实现 |
| GNews | `Adapters/NewsAdapters.md` | ✅ 已实现 |
| RSS | `Adapters/NewsAdapters.md` | ✅ 已实现 |

### 日历类 (Calendar)

| 数据源 | 适配器 | 状态 |
|--------|--------|------|
| Google Calendar | `Adapters/CalendarAdapters.md` | ✅ 已实现 |
| Outlook Calendar | `Adapters/CalendarAdapters.md` | ✅ 已实现 |

### 知识库类 (Knowledge Base)

| 数据源 | 适配器 | 状态 |
|--------|--------|------|
| Confluence | `Adapters/KnowledgeToolAdapters.md` | ✅ 已实现 |

### 代码类 (Code)

| 数据源 | 适配器 | 状态 |
|--------|--------|------|
| DeepWiki | `Adapters/DeepWikiAdapter.md` | ✅ 已实现 |

---

## 搜索源支持

| 类型 | 搜索源 |
|------|--------|
| **AI搜索** | **Perplexity, Phind, You.com** |
| 通用 | WebSearch, Brave, Exa, Google, DuckDuckGo |
| 专业 | Wikipedia, GitHub, Arxiv, Google Scholar, PubMed |
| 中文 | 秘塔AI搜索, 知乎, Bing |
| 实时 | 股票(Alpha Vantage), 天气(OpenWeatherMap), 新闻 |
| 代码 | DeepWiki (GitHub代码库) |

## 外部集成

| 工具 | 用途 | 文档 |
|------|------|------|
| **AI-Research-SKILLS** | 83项专业AI研究技能 | `Integrations.md` |
| **DeepWiki** | GitHub代码库AI搜索 | `Adapters/DeepWikiAdapter.md` |
| **Chroma/FAISS** | 高性能向量检索 | AI-Research-SKILLS/15-rag |
| **LangChain** | Agent编排框架 | AI-Research-SKILLS/14-agents |

---

## 适配器文档索引

### 核心适配器
- `Adapters/ObsidianAdapter.md` - Obsidian笔记
- `Adapters/NotionAdapter.md` - Notion工作区

### 云盘适配器
- `Adapters/CloudStorageAdapters.md` - Google Drive, Dropbox

### 社区适配器
- `Adapters/CommunityAdapters.md` - Reddit, Discord, Telegram

### 社媒适配器
- `Adapters/SocialMediaAdapters.md` - Twitter/X, LinkedIn, Apify

### 新闻适配器
- `Adapters/NewsAdapters.md` - NewsAPI, GNews, RSS

### 日历适配器
- `Adapters/CalendarAdapters.md` - Google Calendar, Outlook

### 知识库适配器
- `Adapters/KnowledgeToolAdapters.md` - Confluence, Logseq

### AI搜索适配器
- `Adapters/AISearchAdapters.md` - Perplexity, Phind, You.com

### 代码搜索适配器
- `Adapters/DeepWikiAdapter.md` - GitHub代码库

---

## 快速使用

```
用户：帮我调研一下AI Agent的发展现状
→ 触发 Research 工作流
→ 自动路由到 Research skill (Standard模式)
→ 结果归一化返回

用户：给我深入分析量子计算在金融领域的应用
→ 触发 DeepResearch 工作流
→ 自动路由到 DeepResearch skill
→ 输出深度分析报告

用户：搜索Reddit上关于GPT-5的讨论
→ 触发 UnifiedSearch 工作流
→ 路由到 CommunityAdapters
→ 返回Reddit搜索结果

用户：同步我的Google Drive文档
→ 触发 DataSync 工作流
→ 路由到 CloudStorageAdapters
→ 增量同步并更新向量库
```

---

## 详细文档

- 架构设计：`SkillSearch('aggreresearch architecture')`
- 能力供应商：`Providers.md`
- 错误处理框架：`ErrorHandling.md`
- 意图分析：`Workflows/IntentAnalysis.md`
- 外部集成：`Integrations.md`

---

## 语义执行逻辑保证

### 强制性 (Must)
- ✅ QuickSearch: 必须执行WebSearch + 返回结果
- ✅ Research: 必须进行意图分析 + 路由 + 归一化
- ✅ RAGIndex: 必须扫描 + 提取 + 向量化 + 存储
- ✅ DeepReport: 必须执行5阶段 + 输出完整报告
- ✅ DataSync: 必须增量同步 + 状态保存

### 选择性 (May)
- 🔹 可选择不同数据源适配器
- 🔹 可调整参数（topK、chunkSize等）
- 🔹 可选择输出格式（Markdown/Excel）

### 禁止性 (Must Not)
- 🚫 QuickSearch: 不进行深度分析
- 🚫 UnifiedSearch: 只能搜索已同步数据
- 🚫 DataSync: 不会删除已有数据
