---
name: AggreResearch/UnifiedSearch
description: 统一搜索工作流 - 跨数据源检索，支持指定来源过滤
---

# AggreResearch - 统一搜索

## 概述

跨所有已同步的个人数据源进行统一搜索，支持来源过滤和混合检索。

## 使用方式

```
用户: "搜索我所有笔记中关于AI Agent的内容"
用户: "只在Obsidian里搜索"
用户: "搜索Google Drive中的报告"
用户: "汇总搜索我所有的个人数据"
```

## 执行流程

```
1. 解析查询 → 2. 确定来源 → 3. 并行检索 → 4. 结果混合 → 5. 生成回答
```

---

## Step 1: 解析查询

```typescript
interface SearchQuery {
  text: string;              // 搜索文本
  sources?: string[];       // 指定来源 (obsidian, notion, google-drive...)
  type?: string[];          // 文件类型 (note, document, message...)
  timeRange?: {             // 时间范围
    start?: Date;
    end?: Date;
  };
  limit?: number;           // 返回数量
}

function parseQuery(input: string): SearchQuery {
  // 识别来源关键词
  const sourceKeywords: Record<string, string[]> = {
    'obsidian': ['obsidian', '我的笔记'],
    'notion': ['notion'],
    'google-drive': ['google drive', 'drive', '云盘'],
    'local': ['本地', '本地文件'],
    'twitter': ['推特', 'twitter', 'tweet'],
  };

  let sources: string[] | undefined;

  for (const [source, keywords] of Object.entries(sourceKeywords)) {
    if (keywords.some(k => input.includes(k))) {
      sources = sources || [];
      sources.push(source);
    }
  }

  return {
    text: input,
    sources,
    limit: 10
  };
}
```

---

## Step 2: 确定来源

```typescript
// 可用数据源
const availableSources = {
  obsidian: { enabled: true, itemCount: 150 },
  notion: { enabled: true, itemCount: 80 },
  'google-drive': { enabled: false, itemCount: 0 },
  local: { enabled: true, itemCount: 200 },
  twitter: { enabled: false, itemCount: 0 }
};

function resolveSources(query: SearchQuery): string[] {
  if (query.sources?.length) {
    // 用户指定了来源，过滤可用的
    return query.sources.filter(s => availableSources[s]?.enabled);
  }

  // 返回所有可用的数据源
  return Object.entries(availableSources)
    .filter(([_, v]) => v.enabled)
    .map(([k]) => k);
}
```

---

## Step 3: 并行检索

```typescript
async function searchSources(
  query: SearchQuery,
  sources: string[]
): Promise<SearchResult[]> {
  // 并行搜索所有来源
  const results = await Promise.all(
    sources.map(source => searchSource(query, source))
  );

  return results.flat();
}

async function searchSource(query: SearchQuery, source: string): Promise<SearchResult[]> {
  // 从向量库检索
  const vectorResults = await vectorStore.search({
    query: query.text,
    filter: { source },
    limit: query.limit
  });

  // 转换为 SearchResult 格式
  return vectorResults.map(item => ({
    item,
    source,
    relevance: item.score
  }));
}
```

---

## Step 4: 结果混合

```typescript
interface SearchResult {
  item: UnifiedDataItem;
  source: string;
  relevance: number;
}

function mixResults(results: SearchResult[], query: SearchQuery): MixedResult[] {
  // 按相关性排序
  const sorted = results.sort((a, b) => b.relevance - a.relevance);

  // 去重（相同内容）
  const seen = new Set<string>();
  const unique: SearchResult[] = [];

  for (const r of sorted) {
    const key = r.item.content.substring(0, 100);
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(r);
    }
  }

  // 按来源分组
  const bySource: Record<string, SearchResult[]> = {};
  for (const r of unique) {
    if (!bySource[r.source]) {
      bySource[r.source] = [];
    }
    bySource[r.source].push(r);
  }

  return unique.map(r => ({
    ...r,
    sourceLabel: getSourceLabel(r.source)
  }));
}

function getSourceLabel(source: string): string {
  const labels: Record<string, string> = {
    obsidian: '📝 Obsidian',
    notion: '📋 Notion',
    'google-drive': '☁️ Google Drive',
    local: '📁 本地文件',
    twitter: '🐦 Twitter'
  };
  return labels[source] || source;
}
```

---

## Step 5: 生成回答

```typescript
async function generateAnswer(
  query: SearchQuery,
  results: MixedResult[]
): Promise<SearchAnswer> {
  // 按来源分组显示
  const bySource = groupBySource(results);

  // 构建上下文
  const context = results
    .map((r, i) => `[${i + 1}] [${r.sourceLabel}] ${r.item.title || 'Untitled'}\n${r.item.content.substring(0, 500)}`)
    .join('\n\n---\n\n');

  const prompt = `
你是个人知识助手。用户搜索了自己已同步的个人数据。

用户问题：${query.text}

搜索结果（共 ${results.length} 条）：
${context}

要求：
1. 直接回答用户问题
2. 标注每条信息的来源
3. 如果没有结果，说明哪些来源可用
4. 保持简洁

回答：
`;

  const answer = await llm.generate(prompt);

  return {
    answer,
    results: bySource,
    summary: {
      total: results.length,
      sources: Object.keys(bySource)
    }
  };
}

function groupBySource(results: MixedResult[]): Record<string, MixedResult[]> {
  const grouped: Record<string, MixedResult[]> = {};

  for (const r of results) {
    if (!grouped[r.source]) {
      grouped[r.source] = [];
    }
    grouped[r.source].push(r);
  }

  return grouped;
}
```

---

## 输出格式

```typescript
interface SearchAnswer {
  answer: string;                    // LLM 生成的回答
  results: {                         // 按来源分组的结果
    [source: string]: {
      item: UnifiedDataItem;
      source: string;
      relevance: number;
      sourceLabel: string;
    }[];
  };
  summary: {
    total: number;
    sources: string[];
  };
}
```

---

## 使用示例

### 示例1: 搜索所有数据

```
用户: "搜索我所有笔记中关于AI Agent的内容"

→ 解析: {text: "AI Agent", sources: undefined}
→ 来源: [obsidian, notion, local]
→ 检索: 并行搜索3个来源
→ 混合: 按相关性排序，去重
→ 生成: 汇总回答

回答:
根据您的笔记，AI Agent 相关的记录如下：

📝 Obsidian (3条)
- AI Agent 研究笔记 (相关性: 0.95)
- Agent 架构设计 (相关性: 0.87)
...

📋 Notion (1条)
- AI 项目规划 (相关性: 0.82)
```

### 示例2: 指定来源

```
用户: "只在Obsidian里搜索关于prompt工程的内容"

→ 解析: {text: "prompt工程", sources: ["obsidian"]}
→ 来源: [obsidian]
→ 检索: 只搜索 Obsidian
→ 混合: 返回结果
→ 生成: 聚焦 Obsidian 的回答
```

### 示例3: 统计摘要

```
用户: "我目前同步了哪些数据？"

→ 返回:
📊 数据同步摘要:
- 📝 Obsidian: 150 篇笔记
- 📋 Notion: 80 篇页面
- 📁 本地文件: 200 个文档
- ☁️ Google Drive: 未连接
- 🐦 Twitter: 未连接

总计: 430 条可搜索内容
```

---

## 与 RAGQuery 的区别

| 维度 | RAGQuery | UnifiedSearch |
|------|----------|---------------|
| **数据源** | 本地 RAG + Web | 仅个人数据 |
| **来源** | 混合 | 可指定 |
| **用途** | 研究性查询 | 个人知识检索 |
| **示例** | "结合最新信息和我的笔记" | "搜索我所有笔记" |
