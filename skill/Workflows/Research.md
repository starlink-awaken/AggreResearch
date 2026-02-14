---
name: AggreResearch/Research
description: 标准研究工作流 - 自动路由，智能选择合适的研究能力
---

# AggreResearch - 标准研究工作流

## 概述

自动分析查询意图，路由到合适的研究能力，返回归一化结果。

## 执行流程

```
1. 意图分析 → 2. 能力路由 → 3. 执行研究 → 4. 结果归一化
```

## Step 1: 意图分析

分析用户查询，提取以下特征：

| 特征 | 判断依据 |
|------|---------|
| 复杂度 | 简单事实(1) / 需要分析(2) / 深度研究(3) |
| 时效性 | 历史信息 / 当前事件 / 未来预测 |
| 多视角 | 单角度 / 需要多视角 / 需要对立观点 |
| 来源要求 | 无特定 / 指定来源 / 需要验证 |

## Step 2: 能力路由

基于意图分析结果，自动选择最优能力：

### 路由决策表

| 复杂度 | 时效性 | 多视角 | 路由目标 |
|--------|--------|--------|---------|
| 1 | 任意 | 任意 | WebSearch → 简单总结 |
| 2 | 历史 | 单角度 | Research (Quick) |
| 2 | 任意 | 多视角 | Research (Standard) |
| 3 | 任意 | 任意 | DeepResearch |
| - | 当前 | 任意 | + Browser 验证 |

### 能力适配器

每个底层能力都有适配器，屏蔽差异：

```typescript
// 适配器接口
interface ResearchAdapter {
  name: string;
  support(query: QueryIntent): boolean;
  execute(request: ResearchRequest): Promise<ResearchResult>;
  normalize(result: any): NormalizedResult;
}

// 已注册适配器
const adapters = [
  WebSearchAdapter,      // 快速事实
  ResearchAdapter,       // 标准研究
  DeepResearchAdapter,   // 深度研究
  BrowserAdapter,        // 网页验证
  OSINTAdapter,          // 背景调查
];
```

## Step 3: 执行研究

调用底层能力执行研究：

```typescript
async function executeResearch(intent: QueryIntent): Promise<NormalizedResult> {
  // 1. 选择适配器
  const adapter = selectAdapter(intent);

  // 2. 执行研究
  const rawResult = await adapter.execute({
    query: intent.query,
    mode: intent.mode,
  });

  // 3. 结果归一化
  return adapter.normalize(rawResult);
}
```

## Step 4: 结果归一化

统一输出格式：

```typescript
interface AggreResponse {
  content: string;         // 核心内容（Markdown格式）
  sources: {               // 来源列表
    title: string;
    url: string;
    reliability: 'high' | 'medium' | 'low';
  }[];
  metadata: {              // 元信息
    mode: string;          // 使用的模式
    duration: number;      // 耗时(ms)
    agents: string[];      // 调用的Agent
    intent: QueryIntent;  // 分析的意图
  };
}
```

## 使用示例

### 示例1: 简单查询
```
用户: "Python的创始人是谁？"
→ 意图分析: {复杂度:1, 时效性:历史, 多视角:单}
→ 路由: WebSearch
→ 结果: 归一化输出
```

### 示例2: 标准研究
```
用户: "AI Agent有哪些最新的发展？"
→ 意图分析: {复杂度:2, 时效性:当前, 多视角:多}
→ 路由: Research (Standard)
→ 结果: 多来源整合报告
```

### 示例3: 深度研究
```
用户: "给我深入分析Web3在金融领域的应用前景"
→ 意图分析: {复杂度:3, 时效性:未来, 多视角:是}
→ 路由: DeepResearch
→ 结果: 结构化深度报告
```

## 错误处理

| 错误类型 | 处理策略 |
|----------|---------|
| 能力不可用 | 降级到备选能力 |
| 超时 | 返回部分结果 + 警告 |
| 无结果 | 提供建议 + 备选方案 |
