---
name: AggreResearch/ErrorHandling
description: 统一错误处理框架 - 所有工作流必须遵循的错误处理规范
---

# AggreResearch 统一错误处理框架

## 概述

所有工作流必须遵循统一的错误处理规范，确保用户意图能够被正确执行或优雅降级。

## 错误类型定义

```typescript
// 错误类型枚举
enum ErrorType {
  TIMEOUT = 'timeout',           // 执行超时
  UNAVAILABLE = 'unavailable',   // 服务不可用
  INVALID_INPUT = 'invalid_input', // 输入无效
  PARTIAL_FAILURE = 'partial_failure', // 部分失败
  AUTH_FAILED = 'auth_failed',   // 认证失败
  RATE_LIMIT = 'rate_limit',     // API限流
  NETWORK_ERROR = 'network_error', // 网络错误
  NOT_FOUND = 'not_found',       // 资源不存在
}

// 错误严重级别
enum Severity {
  BLOCKING = 'blocking',     // 阻断性 - 必须停止
  RECOVERABLE = 'recoverable', // 可恢复 - 可以重试
  WARNING = 'warning',       // 警告 - 可以继续
}
```

## 错误响应格式

```typescript
interface WorkflowError {
  type: ErrorType;
  severity: Severity;
  message: string;
  source: string;           // 哪个工作流/适配器
  timestamp: Date;
  details?: any;            // 详细错误信息

  // 恢复选项
  recovery?: {
    action: 'retry' | 'fallback' | 'skip' | 'abort';
    maxRetries?: number;
    fallbackTo?: string;   // 降级到哪个工作流
  };
}

// 工作流执行结果
interface WorkflowResult<T = any> {
  success: boolean;
  data?: T;
  error?: WorkflowError;

  // 执行统计
  stats: {
    duration: number;
    attempts: number;
    partialResults?: any[];
  };
}
```

## 统一错误处理函数

```typescript
// 核心错误处理函数
async function withErrorHandling<T>(
  workflow: string,
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    timeout?: number;
    fallback?: () => Promise<T>;
  } = {}
): Promise<WorkflowResult<T>> {
  const { maxRetries = 3, timeout = 30000, fallback } = options;

  let attempts = 0;
  let lastError: WorkflowError | undefined;

  while (attempts < maxRetries) {
    try {
      // 检查超时
      const result = await Promise.race([
        operation(),
        new Promise((_, reject) =>
          setTimeout(() => reject(createError(ErrorType.TIMEOUT, 'Operation timeout')), timeout)
        )
      ]);

      return {
        success: true,
        data: result,
        stats: { duration: 0, attempts: attempts + 1 }
      };
    } catch (error) {
      attempts++;
      lastError = normalizeError(error, workflow, attempts);

      // 判断是否可重试
      if (lastError.severity === Severity.BLOCKING) {
        break;
      }

      // 指数退避
      if (attempts < maxRetries) {
        await sleep(Math.pow(2, attempts) * 1000);
      }
    }
  }

  // 尝试降级
  if (fallback) {
    try {
      const fallbackResult = await fallback();
      return {
        success: true,
        data: fallbackResult,
        error: lastError,
        stats: { duration: 0, attempts, note: 'Used fallback' }
      };
    } catch (fallbackError) {
      return {
        success: false,
        error: lastError,
        stats: { duration: 0, attempts }
      };
    }
  }

  return {
    success: false,
    error: lastError,
    stats: { duration: 0, attempts }
  };
}

// 创建标准错误
function createError(type: ErrorType, message: string, source?: string): WorkflowError {
  const config: Record<ErrorType, { severity: Severity, recovery: RecoveryAction }> = {
    [ErrorType.TIMEOUT]: { severity: Severity.RECOVERABLE, recovery: 'retry' },
    [ErrorType.UNAVAILABLE]: { severity: Severity.RECOVERABLE, recovery: 'fallback' },
    [ErrorType.INVALID_INPUT]: { severity: Severity.BLOCKING, recovery: 'abort' },
    [ErrorType.PARTIAL_FAILURE]: { severity: Severity.WARNING, recovery: 'skip' },
    [ErrorType.AUTH_FAILED]: { severity: Severity.BLOCKING, recovery: 'abort' },
    [ErrorType.RATE_LIMIT]: { severity: Severity.RECOVERABLE, recovery: 'retry' },
    [ErrorType.NETWORK_ERROR]: { severity: Severity.RECOVERABLE, recovery: 'retry' },
    [ErrorType.NOT_FOUND]: { severity: Severity.WARNING, recovery: 'skip' },
  };

  return {
    type,
    severity: config[type].severity,
    message,
    source: source || 'unknown',
    timestamp: new Date(),
    recovery: {
      action: config[type].recovery,
      maxRetries: config[type].recovery === 'retry' ? 3 : 0
    }
  };
}

// 规范化错误
function normalizeError(error: any, workflow: string, attempt: number): WorkflowError {
  if (error instanceof WorkflowError) {
    return error;
  }

  // 识别错误类型
  const message = error.message || String(error);

  if (message.includes('timeout')) {
    return createError(ErrorType.TIMEOUT, message, workflow);
  }
  if (message.includes('401') || message.includes('unauthorized')) {
    return createError(ErrorType.AUTH_FAILED, message, workflow);
  }
  if (message.includes('429') || message.includes('rate limit')) {
    return createError(ErrorType.RATE_LIMIT, message, workflow);
  }
  if (message.includes('ENOTFOUND') || message.includes('404')) {
    return createError(ErrorType.NOT_FOUND, message, workflow);
  }

  return createError(ErrorType.UNAVAILABLE, message, workflow);
}
```

---

## 各工作流错误处理规范

### QuickSearch

```typescript
// 错误处理配置
const QuickSearchErrorConfig = {
  timeout: 10000,          // 10秒超时
  maxRetries: 2,          // 最多重试2次

  // 错误响应策略
  strategies: {
    [ErrorType.TIMEOUT]: {
      action: 'fallback',
      fallbackTo: 'direct_answer', // 直接基于知识回答
    },
    [ErrorType.NOT_FOUND]: {
      action: 'return_partial', // 返回部分结果
    },
    [ErrorType.NETWORK_ERROR]: {
      action: 'retry_then_fallback',
      fallbackTo: 'cached_results',
    }
  }
};
```

### RAGQuery

```typescript
// RAG 查询错误处理
const RAGQueryErrorConfig = {
  timeout: 30000,

  // 复合错误处理
  strategies: {
    // RAG 失败但 Web 成功
    rag_failure_only: {
      condition: (errors) => errors.rag && !errors.web,
      action: 'use_web_only',
    },
    // Web 失败但 RAG 成功
    web_failure_only: {
      condition: (errors) => !errors.rag && errors.web,
      action: 'use_rag_only',
    },
    // 两者都失败
    both_failed: {
      condition: (errors) => errors.rag && errors.web,
      action: 'return_error_with_suggestions',
    }
  }
};
```

### DeepReport

```typescript
// DeepReport 错误处理 - 5个Phase分别处理
const DeepReportErrorConfig = {
  // 每个Phase的超时
  phaseTimeouts: {
    phase1_task_understanding: 10000,
    phase2_data_fetching: 60000,
    phase3_analysis: 30000,
    phase4_output: 20000,
    phase5_delivery: 10000,
  },

  // Phase失败策略
  phaseStrategies: {
    // Phase1 失败 - 终止整个流程
    phase1: { action: 'abort', notify: true },

    // Phase2 失败 - 尝试只用Web数据
    phase2: { action: 'fallback', fallbackTo: 'web_only' },

    // Phase3 失败 - 跳过交叉验证，只做基础分析
    phase3: { action: 'skip_validation' },

    // Phase4 失败 - 使用简化输出
    phase4: { action: 'use_simplified_output' },

    // Phase5 失败 - 返回内存中的报告
    phase5: { action: 'return_in_memory' },
  }
};
```

### UnifiedSearch

```typescript
// 统一搜索错误处理
const UnifiedSearchErrorConfig = {
  // 来源级别错误处理
  sourceLevel: {
    // 单个来源失败不影响其他来源
    isolate: true,

    // 来源失败策略
    onSourceError: (source: string, error: WorkflowError) => {
      console.warn(`Source ${source} failed: ${error.message}`);
      return { skipped: true, error: error.message };
    },
  },

  // 全部来源失败
  allSourcesFailed: {
    action: 'return_available_sources',
    includeSuggestions: true,
  },

  // 无结果返回
  noResults: {
    action: 'return_source_stats',
    suggestExpanding: true,
  }
};
```

---

## 错误响应模板

### 用户可见的错误消息

```typescript
// 根据错误类型生成用户友好的消息
function generateUserMessage(error: WorkflowError): string {
  const messages: Record<ErrorType, string> = {
    [ErrorType.TIMEOUT]: '请求超时，请稍后重试',
    [ErrorType.UNAVAILABLE]: '服务暂时不可用，已自动重试',
    [ErrorType.INVALID_INPUT]: '请检查输入内容后重试',
    [ErrorType.PARTIAL_FAILURE]: '部分结果可能不完整',
    [ErrorType.AUTH_FAILED]: '需要重新授权，请检查配置',
    [ErrorType.RATE_LIMIT]: '请求过于频繁，请稍后再试',
    [ErrorType.NETWORK_ERROR]: '网络连接不稳定，已重试',
    [ErrorType.NOT_FOUND]: '未找到相关内容',
  };

  return messages[error.type] || '发生错误，请重试';
}
```

### 详细错误日志

```typescript
// 记录详细错误日志
function logError(error: WorkflowError, context?: any): void {
  const logEntry = {
    timestamp: error.timestamp,
    type: error.type,
    severity: error.severity,
    message: error.message,
    source: error.source,
    context,
    recovery: error.recovery,
  };

  // 写入日志文件
  const logPath = '~/.claude/aggreresearch/logs/errors.json';
  const existing = fs.existsSync(logPath) ? JSON.parse(fs.readFileSync(logPath)) : [];
  existing.push(logEntry);

  // 只保留最近100条
  fs.writeFileSync(logPath, JSON.stringify(existing.slice(-100), null, 2));
}
```

---

## 成功标准定义

每个工作流必须定义明确的成功标准：

```typescript
interface SuccessCriteria {
  // 最小可接受结果
  minResults: number;

  // 超时阈值 (ms)
  timeout: number;

  // 重试策略
  retry: {
    maxAttempts: number;
    backoff: 'linear' | 'exponential';
  };

  // 降级链
  fallbackChain: string[];
}

// 工作流成功标准
const workflowCriteria: Record<string, SuccessCriteria> = {
  QuickSearch: {
    minResults: 1,
    timeout: 10000,
    retry: { maxAttempts: 2, backoff: 'exponential' },
    fallbackChain: ['WebSearch', 'cached', 'direct'],
  },

  Research: {
    minResults: 3,
    timeout: 60000,
    retry: { maxAttempts: 3, backoff: 'exponential' },
    fallbackChain: ['DeepResearch', 'Research', 'QuickSearch'],
  },

  RAGIndex: {
    minResults: 1,
    timeout: 120000,
    retry: { maxAttempts: 1, backoff: 'linear' },
    fallbackChain: ['continue_partial'],
  },

  RAGQuery: {
    minResults: 1,
    timeout: 30000,
    retry: { maxAttempts: 2, backoff: 'exponential' },
    fallbackChain: ['web_only', 'rag_only', 'empty'],
  },

  DeepReport: {
    minResults: 1,
    timeout: 300000,
    retry: { maxAttempts: 1, backoff: 'linear' },
    fallbackChain: ['simplified_report', 'outline_only', 'topics'],
  },

  DataSync: {
    minResults: 0,
    timeout: 600000,
    retry: { maxAttempts: 3, backoff: 'exponential' },
    fallbackChain: ['skip_failed_sources', 'retry_later'],
  },

  UnifiedSearch: {
    minResults: 0,
    timeout: 30000,
    retry: { maxAttempts: 1, backoff: 'linear' },
    fallbackChain: ['list_available_sources'],
  },
};
```
