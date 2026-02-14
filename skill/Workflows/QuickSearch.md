---
name: AggreResearch/QuickSearch
description: 快速搜索工作流 - 简单查询，高效响应
---

# AggreResearch - 快速搜索工作流

## 概述

处理简单事实查询，强调速度和效率。

## 执行流程

```
1. 解析查询 → 2. 提取关键实体 → 3. WebSearch → 4. 提炼总结
```

## 使用场景

| 场景 | 示例 |
|------|------|
| 事实性问题 | "Python创始人是谁？" |
| 定义查询 | "什么是量子计算？" |
| 简单比较 | "React vs Vue 区别" |
| 时效信息 | "今天天气如何" |

## 执行步骤

### Step 1: 解析查询

识别查询类型：

```typescript
interface QueryAnalysis {
  type: 'fact' | 'definition' | 'comparison' | 'status';
  entities: string[];
  timeConstraint: 'any' | 'recent' | 'current';
}
```

### Step 2: WebSearch 执行

使用内置WebSearch工具：

```typescript
async function quickSearch(query: string): Promise<QuickResult> {
  // 1. 搜索
  const results = await webSearch(query);

  // 2. 提取关键信息
  const summary = extractKeyInfo(results);

  // 3. 格式化输出
  return {
    answer: summary,
    sources: results.map(r => r.url),
    confidence: 'high',
  };
}
```

## 输出格式

```typescript
interface QuickResponse {
  answer: string;        // 直接回答（1-2句话）
  sources: string[];    // 参考链接
  confidence: 'high' | 'medium' | 'low';
}
```

## 示例

| 输入 | 输出 |
|------|------|
| "Python创始人" | Guido van Rossum，1991年创建Python... |
| "北京天气" | 当前北京天气：晴，12°C... |
