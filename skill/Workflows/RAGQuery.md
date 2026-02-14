---
name: AggreResearch/RAGQuery
description: RAG查询工作流 - 语义检索 + 混合搜索 + 结果生成
---

# AggreResearch - RAG查询工作流

## 概述

结合本地知识库（语义检索）和网络搜索（实时信息），返回综合答案。

## 使用方式

```
用户: "根据我之前的笔记，AI Agent的发展趋势是什么？"
用户: "结合我的知识库和最新信息，分析量子计算现状"
用户: "在我索引的文件里查找关于prompt工程的内容"
```

## 执行流程

```
1. 意图分析 → 2. 本地RAG检索 → 3. Web搜索 → 4. 结果混合 → 5. LLM生成
```

## Step 1: 意图分析

判断是否需要使用本地知识库：

```typescript
interface QueryIntent {
  query: string;
  needRAG: boolean;           // 是否需要RAG
  needWebSearch: boolean;     // 是否需要Web搜索
  focusLocal?: string;        // 指定本地知识范围
}
```

**判断规则**：
| 触发词 | needRAG |
|--------|---------|
| "根据我..." | true |
| "我的笔记" | true |
| "我索引的" | true |
| "结合...和..." | true (两者都需要) |

## Step 2: 本地RAG检索

如果需要RAG，执行语义检索：

```typescript
async function ragSearch(query: string, options: SearchOptions): Promise<RAGResult[]> {
  // 1. 查询向量化
  const queryVector = await embedText(query);

  // 2. 向量检索 (Top-K)
  const results = await vectorStore.search(queryVector, options.topK || 5);

  // 3. 结果格式化
  return results.map(r => ({
    content: r.chunk.content,
    source: r.chunk.metadata.file,
    score: r.score,
    excerpt: extractExcerpt(r.chunk.content, query)
  }));
}
```

## Step 3: Web搜索

如果需要Web搜索，执行实时信息获取：

```typescript
async function webSearch(query: string): Promise<WebResult[]> {
  const results = await WebSearch(query);

  // 获取详细内容
  const detailed = await Promise.all(
    results.slice(0, 3).map(r => WebFetch(r.url))
  );

  return detailed.map((content, i) => ({
    title: results[i].title,
    url: results[i].url,
    content: content.substring(0, 2000)  // 截取前2000字符
  }));
}
```

## Step 4: 结果混合

将RAG和Web结果按相关性混合排序：

```typescript
interface MixedResult {
  content: string;
  source: {
    type: 'rag' | 'web';
    title: string;
    url?: string;
  };
  relevance: number;      // 0-1 相关度
  recency?: number;        // 时效性分数
}

// 混合算法
function mixResults(ragResults: RAGResult[], webResults: WebResult[]): MixedResult[] {
  const all = [
    ...ragResults.map(r => ({
      content: r.content,
      source: { type: 'rag' as const, title: r.source },
      relevance: r.score
    })),
    ...webResults.map(w => ({
      content: w.content,
      source: { type: 'web' as const, title: w.title, url: w.url },
      relevance: 0.8  // Web结果默认相关度
    }))
  ];

  // 按相关度排序
  return all.sort((a, b) => b.relevance - a.relevance);
}
```

## Step 5: LLM生成

使用混合结果生成答案：

```typescript
async function generateAnswer(
  query: string,
  mixedResults: MixedResult[]
): Promise<FinalAnswer> {
  const context = mixedResults
    .map((r, i) => `[${i + 1}] [${r.source.type}] ${r.source.title}\n${r.content}`)
    .join('\n\n---\n\n');

  const prompt = `
你是研究助手。基于以下参考资料回答用户问题。

用户问题：${query}

参考资料：
${context}

要求：
1. 直接回答问题
2. 标注信息来源
3. 如有冲突，说明不同观点
4. 保持客观中立

回答：
`;

  const answer = await llm.generate(prompt);

  return {
    content: answer,
    sources: mixedResults.map(r => ({
      type: r.source.type,
      title: r.source.title,
      url: r.source.url
    }))
  };
}
```

## 输出格式

```typescript
interface RAGQueryResponse {
  answer: string;                    // 生成的回答
  sources: {                         // 来源列表
    type: 'rag' | 'web';
    title: string;
    url?: string;
    relevance: number;
  }[];
  metadata: {
    ragResults: number;              // RAG返回数
    webResults: number;              // Web返回数
    usedRAG: boolean;               // 是否使用了RAG
    usedWeb: boolean;                // 是否使用了Web搜索
  };
}
```

## 使用示例

```
用户: "根据我之前的笔记，总结prompt工程的最佳实践"

→ 意图分析: needRAG=true, needWebSearch=false
→ RAG检索: 找到3条相关笔记
→ 混合结果: 3条RAG结果
→ LLM生成: 基于笔记内容生成总结

回答:
根据您的笔记，prompt工程的最佳实践包括：

1. 明确角色设定 [rag:笔记/prompt技巧.md]
2. 结构化输出要求 [rag:笔记/prompt技巧.md]
3. few-shot示例 [rag:笔记/高级prompt.md]
...
```

```
用户: "结合最新信息和我的知识库，分析AI Agent的发展"

→ 意图分析: needRAG=true, needWebSearch=true
→ RAG检索: 找到2条相关笔记
→ Web搜索: 获取最新AI Agent资讯
→ 混合: 4条结果混合
→ LLM生成: 综合分析和回答

回答:
综合我的知识库和最新信息，AI Agent的发展趋势如下：
...
```

## 高级选项

```typescript
interface AdvancedOptions {
  // 检索选项
  rag?: {
    topK?: number;           // 返回Top-K结果 (默认: 5)
    minRelevance?: number;   // 最低相关度阈值 (默认: 0.5)
    fileFilter?: string[];   // 指定文件范围
  };

  // Web选项
  web?: {
    maxResults?: number;     // 最大结果数 (默认: 5)
    recency?: 'day' | 'week' | 'month' | 'any';  // 时效性
  };

  // 生成选项
  generate?: {
    style?: 'concise' | 'detailed' | 'academic';
    includeSources?: boolean;
  };
}
```
