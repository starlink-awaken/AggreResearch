---
name: AggreResearch/DataSync
description: 数据同步工作流 - 定时同步 + 变更检测 + 统一索引
---

# AggreResearch - 数据同步工作流

## 概述

自动化同步个人数据（笔记、云盘、社媒）到本地向量数据库，支持定时任务和增量更新。

## 使用方式

```
用户: "同步我的Obsidian笔记"
用户: "开启自动同步"
用户: "查看同步状态"
用户: "配置Notion同步"
```

## 核心概念

### 统一数据格式 (UDF)

```typescript
interface UnifiedDataItem {
  id: string;                    // 唯一标识 (source:id)
  type: 'document' | 'message' | 'event' | 'contact' | 'note';
  content: string;              // 文本内容
  title?: string;               // 标题

  metadata: {
    source: string;            // obsidian | notion | google-drive | twitter
    created: Date;
    modified: Date;
    tags?: string[];
    author?: string;
    url?: string;
    path?: string;              // 文件路径
  };
}
```

### 同步状态

```typescript
interface SyncState {
  lastSync: Date;
  items: number;
  sources: {
    [source: string]: {
      lastSync: Date;
      itemCount: number;
      status: 'synced' | 'syncing' | 'error';
      error?: string;
    };
  };
}
```

---

## 执行流程

```
1. 加载配置 → 2. 初始化适配器 → 3. 增量获取 → 4. 转换UDF → 5. 更新向量库 → 6. 保存状态
```

---

## Step 1: 加载配置

```typescript
interface SyncConfig {
  // 同步间隔 (分钟)
  interval: number;

  // 启用的数据源
  sources: {
    obsidian?: {
      enabled: boolean;
      vaultPath: string;
      ignoreFolders: string[];
    };
    notion?: {
      enabled: boolean;
      token: string;
      rootPageId?: string;
    };
    googleDrive?: {
      enabled: boolean;
      credentials: string;  // OAuth JSON
    };
    // ... 其他数据源
  };
}

// 加载配置
function loadConfig(): SyncConfig {
  // 从 ~/.claude/aggreresearch/config.json 加载
}
```

---

## Step 2: 初始化适配器

```typescript
// 已注册的适配器
const adapters: DataSourceAdapter[] = [
  new ObsidianAdapter(),
  new NotionAdapter(),
  new GoogleDriveAdapter(),
  new LocalFileAdapter(),
];

// 初始化已启用的适配器
async function initAdapters(config: SyncConfig): Promise<DataSourceAdapter[]> {
  const enabled = [];

  for (const adapter of adapters) {
    const sourceConfig = config.sources[adapter.name];
    if (sourceConfig?.enabled) {
      await adapter.authenticate(sourceConfig);
      enabled.push(adapter);
    }
  }

  return enabled;
}
```

---

## Step 3: 增量获取

```typescript
// 同步单个适配器
async function syncAdapter(
  adapter: DataSourceAdapter,
  state: SyncState
): Promise<SyncResult> {
  const sourceState = state.sources[adapter.name];
  const since = sourceState?.lastSync || new Date(0);

  console.log(`[${adapter.name}] Syncing since ${since}...`);

  try {
    // 获取变更
    const changes = await adapter.fetchChanges(since);

    // 转换为统一格式
    const items = changes.map(item => adapter.normalize(item));

    // 更新向量库
    await vectorStore.upsert(items);

    return {
      success: true,
      itemCount: items.length,
      adapter: adapter.name
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      adapter: adapter.name
    };
  }
}
```

---

## Step 4: 定时同步

```typescript
// 定时任务
class SyncScheduler {
  private interval: number;
  private timer?: NodeJS.Timeout;

  constructor(intervalMinutes: number = 60) {
    this.interval = intervalMinutes * 60 * 1000;
  }

  start() {
    console.log(`Sync scheduler started (interval: ${this.interval}ms)`);
    this.timer = setInterval(() => this.run(), this.interval);

    // 立即执行一次
    this.run();
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  async run() {
    console.log(`[${new Date().toISOString()}] Starting sync...`);
    const config = loadConfig();
    const adapters = await initAdapters(config);

    // 并行同步所有适配器
    const results = await Promise.all(
      adapters.map(adapter => syncAdapter(adapter, getState()))
    );

    // 保存状态
    saveState(results);

    console.log(`Sync completed: ${results.filter(r => r.success).length}/${results.length} succeeded`);
  }
}
```

---

## Step 5: 状态管理

```typescript
// 状态存储位置
const STATE_DIR = '~/.claude/aggreresearch/sync/';

// 加载状态
function loadState(): SyncState {
  const stateFile = path.join(STATE_DIR, 'state.json');
  if (fs.existsSync(stateFile)) {
    return JSON.parse(fs.readFileSync(stateFile));
  }
  return { lastSync: new Date(), items: 0, sources: {} };
}

// 保存状态
function saveState(results: SyncResult[]) {
  const state = loadState();
  state.lastSync = new Date();

  for (const result of results) {
    if (!state.sources[result.adapter]) {
      state.sources[result.adapter] = { lastSync: new Date(), itemCount: 0, status: 'synced' };
    }
    state.sources[result.adapter].lastSync = new Date();
    state.sources[result.adapter].itemCount += result.itemCount;
    state.sources[result.adapter].status = result.success ? 'synced' : 'error';
  }

  fs.writeFileSync(
    path.join(STATE_DIR, 'state.json'),
    JSON.stringify(state, null, 2)
  );
}
```

---

## 使用示例

### 示例1: 首次同步 Obsidian

```
用户: "同步我的Obsidian笔记"

→ 加载配置
→ 初始化 ObsidianAdapter
→ 读取 vaultPath 下的所有 .md 文件
→ 提取 frontmatter 和内容
→ 转换为 UDF 格式
→ 存入向量库
→ 保存同步状态

结果: 已索引 150 篇笔记
```

### 示例2: 增量同步 Notion

```
用户: "同步Notion"

→ 加载上次同步时间
→ 调用 Notion API 获取变更
→ 新增/修改 5 个页面
→ 更新向量库
→ 保存状态

结果: 新增 5 篇 Notion 页面
```

### 示例3: 开启定时同步

```
用户: "开启自动同步，每小时同步一次"

→ 创建 SyncScheduler(60)
→ 启动定时任务
→ 后台每60分钟执行一次同步
```

---

## 配置模板

### ~/.claude/aggreresearch/config.json

```json
{
  "sync": {
    "interval": 60,
    "enabled": true,
    "sources": {
      "obsidian": {
        "enabled": true,
        "vaultPath": "~/Obsidian/MyVault",
        "ignoreFolders": [".obsidian", "_templates", "_assets"]
      },
      "notion": {
        "enabled": false,
        "token": "secret_xxxxx",
        "rootPageId": "可选"
      },
      "localFiles": {
        "enabled": true,
        "paths": [
          "~/Documents/研究",
          "~/Dropbox/笔记"
        ]
      },
      "googleDrive": {
        "enabled": false,
        "credentials": "~/.claude/aggreresearch/credentials/google.json"
      }
    }
  },
  "vectorStore": {
    "path": "~/.claude/aggreresearch/vectors"
  }
}
```

---

## 错误处理

| 错误类型 | 处理策略 |
|----------|---------|
| 认证失败 | 标记状态为 error，发送通知 |
| API 限流 | 指数退避重试 |
| 文件不存在 | 跳过，更新索引 |
| 网络错误 | 重试3次，跳过 |
| 同步超时 | 保存当前进度，下次继续 |
