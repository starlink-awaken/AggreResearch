# AggreResearch

<div align="center">

**聚合搜索调研能力系统 - 统一入口，智能路由，结果归一化**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-Compatible-green.svg)](https://claude.ai/)

[English](#english-documentation) | [中文文档](#中文文档)

</div>

---

## 中文文档

### 🎯 核心价值

- **统一入口**：一个Skill解决80%调研场景
- **智能路由**：LLM意图分析，选择最优能力
- **结果归一化**：统一输出格式，屏蔽供应商差异
- **可扩展**：新能力可热插拔加入
- **错误处理**：统一的错误处理框架，确保意图执行

### 📦 安装

```bash
# 克隆仓库
git clone https://github.com/yourusername/AggreResearch.git

# 复制到 Claude Code Skills 目录
cp -r AggreResearch ~/.claude/skills/
```

### 🚀 快速开始

```
用户：帮我调研一下AI Agent的发展现状
→ 触发 Research 工作流
→ 自动路由到 Research skill (Standard模式)
→ 结果归一化返回

用户：搜索Reddit上关于GPT-5的讨论
→ 触发 UnifiedSearch 工作流
→ 路由到 CommunityAdapters
→ 返回Reddit搜索结果
```

### 📊 能力矩阵

| 能力 | 用途 | 路由触发 |
|------|------|---------|
| WebSearch | 快速事实查询 | 简单问题、时效性信息 |
| Research | 标准研究分析 | 需要分析、多视角 |
| DeepResearch | 深度系统性研究 | 复杂决策、全面分析 |
| RAG | 本地知识检索 | "根据我..."、"索引..." |
| DeepReport | Manus级深度报告 | "深度报告"、"全景分析" |
| DataSync | 个人数据同步 | "同步..."、"开启自动同步" |
| UnifiedSearch | 跨数据源搜索 | "搜索我..."、"汇总..." |
| AISearch | AI智能搜索 | Perplexity/Phind/You.com |

### 🔌 数据源适配器

#### 笔记类 (Notes)
| 数据源 | 状态 |
|--------|------|
| Obsidian | ✅ 已实现 |
| Notion | ✅ 已实现 |
| Logseq | ✅ 已实现 |

#### 云盘类 (Cloud Storage)
| 数据源 | 状态 |
|--------|------|
| Google Drive | ✅ 已实现 |
| Dropbox | ✅ 已实现 |

#### 社区类 (Community)
| 数据源 | 状态 |
|--------|------|
| Reddit | ✅ 已实现 |
| Discord | ✅ 已实现 |
| Telegram | ✅ 已实现 |

#### 社媒类 (Social Media)
| 数据源 | 状态 |
|--------|------|
| Twitter/X | ✅ 已实现 |
| LinkedIn | ✅ 已实现 |
| Apify爬虫 | ✅ 已实现 |

#### 新闻类 (News)
| 数据源 | 状态 |
|--------|------|
| NewsAPI | ✅ 已实现 |
| GNews | ✅ 已实现 |
| RSS | ✅ 已实现 |

#### 日历类 (Calendar)
| 数据源 | 状态 |
|--------|------|
| Google Calendar | ✅ 已实现 |
| Outlook Calendar | ✅ 已实现 |

#### 知识库类 (Knowledge Base)
| 数据源 | 状态 |
|--------|------|
| Confluence | ✅ 已实现 |

#### 代码类 (Code)
| 数据源 | 状态 |
|--------|------|
| DeepWiki | ✅ 已实现 |

### 📁 项目结构

```
AggreResearch/
├── README.md                   # 项目说明
├── LICENSE                     # MIT许可证
├── CONTRIBUTING.md             # 贡献指南
├── CHANGELOG.md                # 变更日志
├── docs/                       # 文档目录
│   └── adapters/              # 适配器文档
├── src/                        # 源代码
│   └── types/                 # TypeScript类型定义
├── examples/                   # 使用示例
└── skill/                      # Claude Code Skill文件
    ├── SKILL.md               # 入口文件
    ├── Providers.md           # 能力供应商
    ├── ErrorHandling.md       # 错误处理框架
    ├── Integrations.md        # 外部集成
    ├── Workflows/             # 工作流
    └── Adapters/              # 适配器实现
```

### ⚙️ 配置

在 `~/.claude/aggreresearch/config.json` 中配置：

```json
{
  "sources": {
    "obsidian": {
      "enabled": true,
      "vaultPath": "~/Obsidian/MyVault"
    },
    "notion": {
      "enabled": true,
      "token": "secret_xxx"
    },
    "google-drive": {
      "enabled": true,
      "clientId": "${GOOGLE_CLIENT_ID}",
      "clientSecret": "${GOOGLE_CLIENT_SECRET}",
      "refreshToken": "${GOOGLE_REFRESH_TOKEN}"
    },
    "reddit": {
      "enabled": true,
      "clientId": "${REDDIT_CLIENT_ID}",
      "clientSecret": "${REDDIT_CLIENT_SECRET}"
    }
  }
}
```

### 🔐 环境变量

```bash
# Google Drive
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REFRESH_TOKEN=your_refresh_token

# Twitter/X
TWITTER_BEARER_TOKEN=your_bearer_token

# Reddit
REDDIT_CLIENT_ID=your_client_id
REDDIT_CLIENT_SECRET=your_client_secret

# NewsAPI
NEWSAPI_KEY=your_api_key

# Discord
DISCORD_BOT_TOKEN=your_bot_token
```

### 🤝 贡献

欢迎贡献！请查看 [CONTRIBUTING.md](CONTRIBUTING.md)

### 📄 许可证

[MIT License](LICENSE)

---

## English Documentation

### 🎯 Core Values

- **Unified Entry**: One Skill solves 80% of research scenarios
- **Intelligent Routing**: LLM intent analysis, selecting optimal capabilities
- **Normalized Results**: Unified output format, hiding vendor differences
- **Extensible**: New capabilities can be hot-plugged
- **Error Handling**: Unified error handling framework ensuring intent execution

### 📦 Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/AggreResearch.git

# Copy to Claude Code Skills directory
cp -r AggreResearch ~/.claude/skills/
```

### 🚀 Quick Start

```
User: Research the current state of AI Agents
→ Triggers Research workflow
→ Auto-routes to Research skill (Standard mode)
→ Returns normalized results

User: Search Reddit discussions about GPT-5
→ Triggers UnifiedSearch workflow
→ Routes to CommunityAdapters
→ Returns Reddit search results
```

### 📊 Capability Matrix

| Capability | Usage | Trigger |
|------------|-------|---------|
| WebSearch | Quick fact queries | Simple questions, time-sensitive info |
| Research | Standard research analysis | Analysis needed, multiple perspectives |
| DeepResearch | Deep systematic research | Complex decisions, comprehensive analysis |
| RAG | Local knowledge retrieval | "Based on my...", "index..." |
| DeepReport | Manus-level deep reports | "Deep report", "comprehensive analysis" |
| DataSync | Personal data sync | "Sync...", "enable auto-sync" |
| UnifiedSearch | Cross-source search | "Search my...", "summarize..." |
| AISearch | AI-powered search | Perplexity/Phind/You.com |

### 🔌 Data Source Adapters

Supports 20+ data sources across categories:
- **Notes**: Obsidian, Notion, Logseq
- **Cloud Storage**: Google Drive, Dropbox
- **Community**: Reddit, Discord, Telegram
- **Social Media**: Twitter/X, LinkedIn, Apify
- **News**: NewsAPI, GNews, RSS
- **Calendar**: Google Calendar, Outlook
- **Knowledge Base**: Confluence
- **Code**: DeepWiki (GitHub)

### 📄 License

[MIT License](LICENSE)

---

<div align="center">

Made with ❤️ by the AggreResearch Team

</div>
