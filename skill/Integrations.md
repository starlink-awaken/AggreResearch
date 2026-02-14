# AggreResearch - 外部能力集成

## 概述

集成外部专业能力库，扩展 AggreResearch 的研究能力。

---

## 1. AI-Research-SKILLS 集成

### 来源

[AI-Research-SKILLs](https://github.com/zechenzhangAGI/AI-research-SKILLs) - 83项AI研究技能

### 技能类别映射

| AI-Research-SKILLS 类别 | AggreResearch 映射 | 用途 |
|------------------------|-------------------|------|
| **15-rag** | RAGQuery/UnifiedSearch | 向量检索增强 |
| **16-prompt-engineering** | Research/DeepReport | 提示工程优化 |
| **14-agents** | Research Agent编排 | 多Agent协作 |
| **05-data-processing** | RAGIndex | 数据预处理 |
| **12-inference-serving** | 研究推理 | 模型推理优化 |
| **06-post-training** | DeepReport | 模型后训练分析 |

### 安装方式

```bash
# 方式1: NPM 安装
npx @orchestra-research/ai-research-skills

# 方式2: Claude Code 插件
/plugin marketplace add orchestra-research/AI-research-skills
/plugin install rag@ai-research-skills
/plugin install prompt-engineering@ai-research-skills
```

### 集成的核心技能

#### RAG 相关 (15-rag/)

| 技能 | 功能 | 集成方式 |
|------|------|---------|
| **chroma** | 向量数据库 | 替代/补充 SQLite 向量存储 |
| **faiss** | 相似性搜索 | 高性能向量检索 |
| **qdrant** | 云原生向量库 | 大规模向量管理 |
| **sentence-transformers** | 语义嵌入 | 文本向量化 |

#### 提示工程 (16-prompt-engineering/)

| 技能 | 功能 | 集成方式 |
|------|------|---------|
| 提示模板 | 标准化提示 | Research/DeepReport 输入优化 |
| Chain-of-Thought | 思维链 | DeepReport 分析增强 |
| Few-shot | 示例学习 | 意图分析训练 |

#### Agents (14-agents/)

| 技能 | 功能 | 集成方式 |
|------|------|---------|
| **LangChain** | Agent框架 | Research Agent 编排 |
| **LlamaIndex** | 数据索引 | RAG 索引增强 |
| **CrewAI** | 多Agent | DeepReport 多视角分析 |

### 使用示例

```typescript
// 集成 LangChain Agent
import { LangChainAdapter } from 'ai-research-skills/agents/langchain';

class ResearchWithLangChain extends ResearchAdapter {
  name = 'langchain-research';

  async execute(request: ResearchRequest): Promise<RawResult> {
    const agent = new LangChainAdapter({
      tools: ['web_search', 'rag_query', 'code_interpreter'],
      llm: 'claude-3-opus'
    });

    return await agent.run(request.query);
  }
}
```

---

## 2. DeepWiki 集成

### 来源

[DeepWiki](https://deepwiki.com) - AI驱动的GitHub代码库文档和搜索

### 功能特点

- 📚 **代码库索引** - 自动索引任意GitHub仓库
- 🔍 **语义搜索** - AI理解代码语义，而非关键词
- 💬 **对话式查询** - 自然语言与代码库对话
- 🤖 **Devin驱动** - 由Devin AI提供底层能力

### 集成方式

#### 方式1: MCP 工具 (推荐)

检查现有MCP服务器是否有 DeepWiki：

```bash
# 查看可用MCP工具
/mcp list
```

#### 方式2: API 集成

```typescript
class DeepWikiAdapter implements DataSourceAdapter {
  name = 'deepwiki';
  type = 'code' as const;

  private baseUrl = 'https://api.deepwiki.com/v1';

  async index(repoUrl: string): Promise<void> {
    // 索引GitHub仓库
    const response = await fetch(`${this.baseUrl}/repos/index`, {
      method: 'POST',
      body: JSON.stringify({ repo_url: repoUrl })
    });
    return response.json();
  }

  async search(query: string, repo?: string): Promise<SearchResult[]> {
    // 语义搜索代码库
    const response = await fetch(`${this.baseUrl}/search`, {
      method: 'POST',
      body: JSON.stringify({ query, repo })
    });
    return response.json();
  }

  async chat(question: string, repo: string): Promise<string> {
    // 对话式查询
    const response = await fetch(`${this.baseUrl}/chat`, {
      method: 'POST',
      body: JSON.stringify({ question, repo })
    });
    return response.json();
  }
}
```

### 在 AggreResearch 中的使用

```typescript
// 添加 DeepWiki 作为代码搜索来源
const deepWikiProvider = {
  name: 'DeepWiki',
  type: 'code',
  search: async (query: string) => {
    const adapter = new DeepWikiAdapter();
    return await adapter.search(query);
  }
};

// 在 UnifiedSearch 中注册
unifiedSearch.registerProvider(deepWikiProvider);
```

### 触发词

```
用户: "在DeepWiki里搜索React Hooks的实现"
用户: "帮我理解这个GitHub仓库的架构"
用户: "搜索某个开源项目的核心代码逻辑"
```

---

## 3. 集成后的能力矩阵

### 扩展后的搜索源

| 类型 | 搜索源 | 状态 |
|------|--------|------|
| 通用 | WebSearch, Brave, Exa, Google | ✅ |
| 专业 | Wikipedia, GitHub, Arxiv | ✅ |
| **代码** | **DeepWiki** | ⭐ 新增 |
| **向量** | **Chroma, FAISS, Qdrant** | ⭐ 新增 |
| 个人 | Obsidian, Notion, 本地 | ✅ |

### 扩展后的工作流

| 工作流 | 新增能力 |
|--------|---------|
| RAGQuery | Chroma/FAISS 高性能向量检索 |
| DeepReport | LangChain Agent 编排 |
| Research | CrewAI 多Agent协作 |
| UnifiedSearch | DeepWiki 代码库搜索 |

---

## 4. 配置示例

### ~/.claude/aggreresearch/config.json

```json
{
  "sources": {
    "obsidian": { "enabled": true, "vaultPath": "~/Obsidian/MyVault" },
    "notion": { "enabled": true, "token": "secret_xxx" },
    "deepwiki": { "enabled": true, "repos": ["facebook/react", "vercel/next.js"] },
    "ai-research-skills": {
      "enabled": true,
      "modules": ["rag", "prompt-engineering", "agents"]
    }
  },
  "vectorStore": {
    "provider": "chroma",
    "path": "~/.claude/aggreresearch/vectors"
  },
  "agents": {
    "orchestration": "langchain",
    "multiAgent": "crewai"
  }
}
```

---

## 5. 验证测试

```bash
# 测试 AI-Research-SKILLS 集成
"使用Chroma搜索我之前的研究笔记"

# 测试 DeepWiki 集成
"在DeepWiki搜索React的核心渲染逻辑"

# 测试组合能力
"结合DeepWiki的React代码和我的笔记，分析Hooks实现"
```
