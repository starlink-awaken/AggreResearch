---
name: AggreResearch/IntentAnalysis
description: 智能意图分析工作流 - 使用LLM理解用户真实意图，替代简单的关键词匹配
---

# AggreResearch - 智能意图分析

## 概述

使用 LLM 进行深度意图分析，理解用户的真实需求，替代简单的关键词匹配。

## 问题背景

### 简单关键词匹配的局限性

```
用户: "帮我查一下苹果的最新消息"
关键词匹配: "查" → QuickSearch
结果: 返回苹果公司的最新消息

用户: "帮我查一下我上次说的那个问题"
关键词匹配: "查" → QuickSearch
结果: 错误！用户想查询自己的笔记
```

### LLM 意图分析的优势

- 理解上下文和隐含意图
- 处理模糊和多义表达
- 识别用户的真实目标

---

## 意图分析流程

```
1. 用户输入 → 2. 预处理 → 3. LLM分析 → 4. 意图确定 → 5. 工作流路由
```

---

## Step 1: 预处理

```typescript
interface RawInput {
  text: string;
  context?: {
    recentQueries?: string[];
    activeWorkflow?: string;
    userPreferences?: Record<string, any>;
  };
}

// 预处理
function preprocess(input: RawInput): PreprocessedInput {
  // 清理输入
  const cleaned = input.text
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s\u4e00-\u9fff]/g, ' ');

  // 提取关键信息
  const entities = extractEntities(cleaned);

  // 判断语言
  const language = detectLanguage(cleaned);

  return {
    original: input.text,
    cleaned,
    entities,
    language,
    context: input.context,
  };
}
```

---

## Step 2: LLM 意图分析

```typescript
interface IntentAnalysis {
  // 意图分类
  intent: {
    primary: string;        // 主要意图: search, research, sync, analyze, etc.
    secondary?: string;    // 次要意图
    confidence: number;     // 置信度 0-1
  };

  // 实体识别
  entities: {
    type: 'topic' | 'person' | 'company' | 'location' | 'date' | 'source';
    value: string;
    confidence: number;
  }[];

  // 需求理解
  requirements: {
    depth: 'quick' | 'standard' | 'deep' | 'exhaustive';
    sources?: string[];    // 指定的数据源
    format?: string;       // 期望的输出格式
    timeConstraint?: 'any' | 'recent' | 'current';
  };

  // 情感分析
  sentiment: {
    urgency: 'low' | 'medium' | 'high';
    importance: number;
  };

  // 建议的工作流
  suggestedWorkflow: string;
  alternatives: string[];
}

// LLM 意图分析
async function analyzeIntent(input: PreprocessedInput): Promise<IntentAnalysis> {
  const prompt = `
分析用户的查询意图。

查询: "${input.original}"

背景信息:
${input.context?.recentQueries ? `最近查询: ${input.context.recentQueries.join(', ')}` : ''}

请返回JSON格式的分析结果:
{
  "intent": {
    "primary": "主要意图 (search/research/sync/analyze/index/query_personal/deep_report/other)",
    "secondary": "次要意图 (可选)",
    "confidence": 0-1之间的置信度
  },
  "entities": [
    {"type": "topic|person|company|location|date|source", "value": "实体值", "confidence": 0-1}
  ],
  "requirements": {
    "depth": "quick(简单回答)|standard(标准分析)|deep(深度分析)|exhaustive(全面研究)",
    "sources": ["指定的数据源，可选，如 obsidian, notion, web"],
    "format": "期望的输出格式，可选",
    "timeConstraint": "any|recent|current"
  },
  "sentiment": {
    " urgency": "low|medium|high",
    "importance": 0-1
  },
  "suggestedWorkflow": "建议的工作流名称",
  "alternatives": ["备选工作流"]
}

只返回JSON，不要其他内容。
`;

  const response = await llm.generate(prompt, { format: 'json' });
  return JSON.parse(response);
}
```

---

## Step 3: 意图到工作流的映射

```typescript
// 意图到工作流的映射表
const intentToWorkflow: Record<string, {
  workflow: string;
  confidence: number;  // 需要达到的最低置信度
  requires?: string[]; // 必需的条件
}> = {
  // 搜索类
  'search': { workflow: 'QuickSearch', confidence: 0.5 },
  'query': { workflow: 'QuickSearch', confidence: 0.5 },

  // 研究类
  'research': { workflow: 'Research', confidence: 0.6 },
  'analyze': { workflow: 'Research', confidence: 0.6 },
  'investigate': { workflow: 'Research', confidence: 0.6 },

  // 深度研究
  'deep_report': { workflow: 'DeepReport', confidence: 0.7 },
  'comprehensive': { workflow: 'DeepReport', confidence: 0.7 },
  'exhaustive': { workflow: 'DeepReport', confidence: 0.7 },

  // 个人数据
  'query_personal': { workflow: 'UnifiedSearch', confidence: 0.6 },
  'search_my': { workflow: 'UnifiedSearch', confidence: 0.5 },
  'based_on_my': { workflow: 'RAGQuery', confidence: 0.5 },

  // 索引
  'index': { workflow: 'RAGIndex', confidence: 0.7 },
  'sync': { workflow: 'DataSync', confidence: 0.7 },

  // 其他
  'other': { workflow: 'Research', confidence: 0.3 },
};
```

---

## Step 4: 工作流路由

```typescript
interface RoutingDecision {
  workflow: string;
  params: Record<string, any>;
  reasoning: string;
  confidence: number;
}

function routeToWorkflow(analysis: IntentAnalysis): RoutingDecision {
  const mapping = intentToWorkflow[analysis.intent.primary];

  // 置信度检查
  if (mapping && analysis.intent.confidence >= mapping.confidence) {
    return {
      workflow: mapping.workflow,
      params: buildWorkflowParams(analysis),
      reasoning: `意图[${analysis.intent.primary}]置信度${analysis.intent.confidence}，匹配工作流[${mapping.workflow}]`,
      confidence: analysis.intent.confidence,
    };
  }

  // 置信度不足，尝试备选
  if (analysis.alternatives.length > 0) {
    for (const alt of analysis.alternatives) {
      const altMapping = intentToWorkflow[alt];
      if (altMapping && analysis.intent.confidence >= altMapping.confidence * 0.8) {
        return {
          workflow: altMapping.workflow,
          params: buildWorkflowParams(analysis),
          reasoning: `主要意图置信度不足，使用备选[${alt}]`,
          confidence: analysis.intent.confidence * 0.8,
        };
      }
    }
  }

  // 默认回退
  return {
    workflow: 'Research',
    params: buildWorkflowParams(analysis),
    reasoning: '无法确定意图，使用默认工作流',
    confidence: 0.3,
  };
}

function buildWorkflowParams(analysis: IntentAnalysis): Record<string, any> {
  return {
    // 从意图分析构建工作流参数
    query: analysis.entities.find(e => e.type === 'topic')?.value || '',
    depth: analysis.requirements.depth,
    sources: analysis.requirements.sources,
    timeConstraint: analysis.requirements.timeConstraint,
    format: analysis.requirements.format,
  };
}
```

---

## 完整执行流程

```typescript
interface IntentRouterResult {
  input: RawInput;
  analysis: IntentAnalysis;
  decision: RoutingDecision;
  executed?: boolean;
  result?: any;
}

// 完整的意图路由流程
async function routeIntent(input: RawInput): Promise<IntentRouterResult> {
  // Step 1: 预处理
  const preprocessed = preprocess(input);

  // Step 2: LLM 意图分析
  const analysis = await analyzeIntent(preprocessed);

  // Step 3: 路由决策
  const decision = routeToWorkflow(analysis);

  console.log(`意图分析: ${JSON.stringify(analysis, null, 2)}`);
  console.log(`路由决策: ${JSON.stringify(decision, null, 2)}`);

  return {
    input,
    analysis,
    decision,
  };
}

// 示例执行
async function main() {
  const result = await routeIntent({
    text: "帮我查一下我上次说的那个AI Agent的问题",
    context: {
      recentQueries: ["AI Agent的发展趋势", "什么是RAG"],
    }
  });

  console.log(result.decision);
  // 输出:
  // {
  //   workflow: "RAGQuery",
  //   params: { query: "AI Agent", depth: "standard", ... },
  //   reasoning: "意图[query_personal]置信度0.85，匹配工作流[RAGQuery]",
  //   confidence: 0.85
  // }
}
```

---

## 意图分析示例

### 示例1: 简单搜索

```
输入: "Python的创始人是谁"
分析: {
  intent: { primary: "search", confidence: 0.95 },
  entities: [{ type: "topic", value: "Python创始人" }],
  requirements: { depth: "quick" },
  suggestedWorkflow: "QuickSearch"
}
路由: QuickSearch
```

### 示例2: 个人知识查询

```
输入: "根据我之前的笔记，总结prompt工程的最佳实践"
分析: {
  intent: { primary: "query_personal", confidence: 0.88 },
  entities: [{ type: "topic", value: "prompt工程" }],
  requirements: { depth: "standard", sources: ["personal"] },
  suggestedWorkflow: "RAGQuery"
}
路由: RAGQuery
```

### 示例3: 深度报告

```
输入: "生成一份特斯拉股票的深度分析报告，包含财务数据和技术指标"
分析: {
  intent: { primary: "deep_report", confidence: 0.92 },
  entities: [
    { type: "company", value: "特斯拉", confidence: 0.98 },
    { type: "topic", value: "股票分析", confidence: 0.95 }
  ],
  requirements: { depth: "exhaustive", format: "report" },
  suggestedWorkflow: "DeepReport"
}
路由: DeepReport
```

### 示例4: 模糊意图

```
输入: "看看这个东西"
分析: {
  intent: { primary: "other", confidence: 0.35 },
  entities: [{ type: "topic", value: "东西", confidence: 0.2 }],
  requirements: { depth: "standard" },
  suggestedWorkflow: "Research",
  alternatives: ["search"]
}
路由: Research (置信度不足，使用默认)
```

---

## 错误处理

```typescript
// 意图分析失败的回退
async function safeAnalyzeIntent(input: RawInput): Promise<IntentAnalysis> {
  try {
    return await analyzeIntent(input);
  } catch (error) {
    // LLM 分析失败，使用规则回退
    console.warn('Intent analysis failed, using fallback:', error.message);
    return fallbackIntentAnalysis(input);
  }
}

// 基于规则的回退
function fallbackIntentAnalysis(input: RawInput): IntentAnalysis {
  const text = input.text.toLowerCase();

  // 关键词匹配回退
  if (text.includes('搜索') || text.includes('查询') || text.includes('查')) {
    return {
      intent: { primary: 'search', confidence: 0.4 },
      entities: [],
      requirements: { depth: 'quick' },
      sentiment: { urgency: 'low', importance: 0.5 },
      suggestedWorkflow: 'QuickSearch',
      alternatives: [],
    };
  }

  // 默认
  return {
    intent: { primary: 'other', confidence: 0.2 },
    entities: [],
    requirements: { depth: 'standard' },
    sentiment: { urgency: 'low', importance: 0.5 },
    suggestedWorkflow: 'Research',
    alternatives: ['search'],
  };
}
```

---

## 与现有工作流的集成

```typescript
// 增强的工作流执行器
async function executeWithIntent(input: RawInput): Promise<any> {
  // 1. 意图分析
  const { analysis, decision } = await routeIntent(input);

  // 2. 记录日志
  logIntent(input, analysis, decision);

  // 3. 执行工作流
  const workflow = getWorkflow(decision.workflow);
  const result = await workflow.execute(decision.params);

  // 4. 反馈学习
  await learnFromExecution(input, analysis, decision, result);

  return result;
}
```
