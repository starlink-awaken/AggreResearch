---
name: AggreResearch/RAGIndex
description: 本地文件索引工作流 - 手动指定文件/目录，提取文本并生成向量存储
---

# AggreResearch - RAG索引工作流

## 概述

将本地文件（Markdown、TXT、PDF）索引到向量数据库，支持语义检索。

## 使用方式

```
用户: "索引 ~/Documents/研究笔记/"
用户: "索引这个文件 /path/to/report.pdf"
用户: "把 ~/Dropbox/知识库 纳入索引"
```

## 执行流程

```
1. 接收文件/目录 → 2. 文件扫描 → 3. 文本提取 → 4. 分块 → 5. 向量化 → 6. 存储
```

## Step 1: 接收输入

```typescript
interface IndexRequest {
  // 手动指定的文件/目录路径
  paths: string[];

  // 选项
  options?: {
    recursive?: boolean;      // 递归扫描子目录 (默认: true)
    fileTypes?: string[];     // 限制文件类型 (默认: ['.md', '.txt', '.pdf'])
    chunkSize?: number;       // 分块大小 (默认: 512)
    chunkOverlap?: number;    // 分块重叠 (默认: 50)
  };
}
```

## Step 2: 文件扫描

扫描指定路径，收集需要索引的文件：

```typescript
async function scanFiles(paths: string[], options: Options): Promise<FileInfo[]> {
  const files: FileInfo[] = [];

  for (const path of paths) {
    if (fs.statSync(path).isDirectory()) {
      // 递归扫描目录
      const dirFiles = await scanDir(path, options);
      files.push(...dirFiles);
    } else {
      // 单个文件
      files.push({ path, type: getFileType(path) });
    }
  }

  return files.filter(f => options.fileTypes.includes(f.type));
}
```

## Step 3: 文本提取

根据文件类型调用不同的提取器：

| 文件类型 | 提取方式 |
|---------|---------|
| .md | 直接读取，保留结构 |
| .txt | 直接读取 |
| .pdf | Documents skill 的 PDF 提取 |

```typescript
async function extractText(file: FileInfo): Promise<string> {
  switch (file.type) {
    case '.md':
    case '.txt':
      return fs.readFileSync(file.path, 'utf-8');
    case '.pdf':
      // 调用 Documents skill 提取
      return await extractPDF(file.path);
    default:
      throw new Error(`Unsupported type: ${file.type}`);
  }
}
```

## Step 4: 文本分块

将长文本分割为适合检索的块：

```typescript
interface TextChunk {
  id: string;
  content: string;
  metadata: {
    file: string;
    index: number;
    charStart: number;
    charEnd: number;
  };
}

function chunkText(text: string, options: ChunkOptions): TextChunk[] {
  const chunks: TextChunk[] = [];
  const { chunkSize = 512, chunkOverlap = 50 } = options;

  // 简单按段落 + 长度分块
  const paragraphs = text.split(/\n\n+/);
  let currentChunk = "";
  let chunkIndex = 0;

  for (const para of paragraphs) {
    if (currentChunk.length + para.length > chunkSize && currentChunk.length > 0) {
      chunks.push({
        id: `chunk_${chunkIndex}`,
        content: currentChunk.trim(),
        metadata: { file: "", index: chunkIndex++, ... }
      });
      currentChunk = para;
    } else {
      currentChunk += "\n\n" + para;
    }
  }

  return chunks;
}
```

## Step 5: 向量化

使用 embedding 模型将文本转为向量：

```typescript
async function embedText(chunks: TextChunk[]): Promise<VectorChunk[]> {
  // 使用 text-embedding-3-small 或 bge-small-zh
  const embeddings = await embeddingModel.embed(
    chunks.map(c => c.content)
  );

  return chunks.map((chunk, i) => ({
    ...chunk,
    vector: embeddings[i]
  }));
}
```

## Step 6: 存储

存储到 SQLite 向量数据库：

```typescript
interface VectorStore {
  // 存储向量
  async insert(vectors: VectorChunk[]): Promise<void>;

  // 语义检索
  async search(query: string[], topK: number): Promise<检索结果[]>;

  // 删除索引
  async delete(filePath: string): Promise<void>;
}
```

**存储位置**：`~/.claude/aggreresearch/vectors/`

```
vectors/
├── index.db        # SQLite 数据库
└── chunks/         # 原始文本块
```

## 输出格式

```typescript
interface IndexResponse {
  status: 'success' | 'partial' | 'failed';
  indexed: number;         // 索引成功数
  failed: number;          // 失败数
  files: {
    path: string;
    chunks: number;
    status: 'indexed' | 'skipped' | 'failed';
  }[];
  storage: {
    location: string;
    totalChunks: number;
  };
}
```

## 使用示例

```
用户: "索引 ~/Documents/研究笔记/AI/"
→ 扫描目录，找到 12 个 .md 文件
→ 提取文本，分块 (共 156 块)
→ 生成向量，存入向量库
→ 返回: 索引成功，12 个文件，156 个知识块
```

## 错误处理

| 错误类型 | 处理 |
|----------|------|
| 文件不存在 | 跳过，返回失败列表 |
| 不支持格式 | 跳过，提醒支持格式 |
| 向量化失败 | 重试3次，失败则跳过该文件 |
| 存储失败 | 回滚，报告错误 |
