---
name: AggreResearch/CloudStorageAdapters
description: 云盘适配器 - Google Drive、Dropbox云存储文件同步
---

# 云盘适配器

## 概述

集成主流云存储服务，实现文件的自动同步和搜索。

---

## 1. Google Drive Adapter

### 概述

Google Drive 是最流行的云存储服务之一，支持多种文件格式。

### 配置

```json
{
  "enabled": true,
  "clientId": "google_client_id",
  "clientSecret": "google_client_secret",
  "refreshToken": "refresh_token",
  "rootFolderId": "root_folder_id_optional",
  "mimeTypes": ["application/pdf", "text/plain", "application/vnd.google-apps.document"]
}
```

### OAuth 认证流程

```
1. 在 Google Cloud Console 创建项目
2. 启用 Google Drive API
3. 创建 OAuth 2.0 凭据
4. 配置授权回调 URL
5. 获取 refresh_token 用于长期访问
```

### 实现

```typescript
import { google } from 'googleapis';

interface GoogleDriveConfig {
  enabled: boolean;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  rootFolderId?: string;
  mimeTypes?: string[];
}

class GoogleDriveAdapter implements DataSourceAdapter {
  name = 'google-drive';
  type = 'cloud' as const;

  private config: GoogleDriveConfig;
  private drive: any;

  constructor(config: GoogleDriveConfig) {
    this.config = config;
  }

  async authenticate(): Promise<void> {
    const oauth2Client = new google.auth.OAuth2(
      this.config.clientId,
      this.config.clientSecret,
      'urn:ietf:wg:oauth:2.0:oob'
    );

    oauth2Client.setCredentials({
      refresh_token: this.config.refreshToken
    });

    this.drive = google.drive({ version: 'v3', auth: oauth2Client });
  }

  async fetchChanges(since: Date): Promise<DataItem[]> {
    if (!this.drive) await this.authenticate();

    const changes: DataItem[] = [];
    let pageToken: string | undefined;

    // 获取起始页令牌
    const { data: startToken } = await this.drive.changes.getStartPageToken();
    let savedStartPageToken = await this.getSavedPageToken();

    if (!savedStartPageToken) {
      // 首次同步，获取所有文件
      return this.fetchAll();
    }

    do {
      const response = await this.drive.changes.list({
        pageToken: savedStartPageToken,
        fields: 'changes(fileId,file(name,mimeType,modifiedTime,createdTime,webViewLink,parents),removed),nextPageToken,newStartPageToken',
        pageSize: 100
      });

      for (const change of response.data.changes || []) {
        if (change.removed) {
          // 文件被删除
          await this.removeFile(change.fileId);
        } else if (change.file) {
          // 文件新增或修改
          const item = await this.processFile(change.file);
          if (item) changes.push(item);
        }
      }

      pageToken = response.data.nextPageToken;
      if (response.data.newStartPageToken) {
        await this.savePageToken(response.data.newStartPageToken);
      }
    } while (pageToken);

    return changes;
  }

  async fetchAll(): Promise<DataItem[]> {
    if (!this.drive) await this.authenticate();

    const files: DataItem[] = [];
    let pageToken: string | undefined;

    const query = this.buildQuery();

    do {
      const response = await this.drive.files.list({
        q: query,
        pageToken,
        pageSize: 100,
        fields: 'nextPageToken,files(id,name,mimeType,modifiedTime,createdTime,webViewLink,parents,size)',
        orderBy: 'modifiedTime desc'
      });

      for (const file of response.data.files || []) {
        const item = await this.processFile(file);
        if (item) files.push(item);
      }

      pageToken = response.data.nextPageToken;
    } while (pageToken);

    return files;
  }

  async search(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    if (!this.drive) await this.authenticate();

    const searchQuery = `fullText contains '${query}'${this.buildQuery() ? ' and ' + this.buildQuery() : ''}`;

    const response = await this.drive.files.list({
      q: searchQuery,
      pageSize: options?.limit || 50,
      fields: 'files(id,name,mimeType,modifiedTime,createdTime,webViewLink)',
      orderBy: 'relevance'
    });

    return (response.data.files || []).map(file => ({
      id: file.id,
      title: file.name,
      content: null, // 需要单独获取
      url: file.webViewLink,
      mimeType: file.mimeType,
      modified: new Date(file.modifiedTime)
    }));
  }

  async getFileContent(fileId: string): Promise<string> {
    if (!this.drive) await this.authenticate();

    const file = await this.drive.files.get({
      fileId,
      fields: 'mimeType,name'
    });

    // Google Docs 需要导出
    if (file.data.mimeType === 'application/vnd.google-apps.document') {
      const response = await this.drive.files.export({
        fileId,
        mimeType: 'text/plain'
      }, { responseType: 'text' });
      return response.data;
    }

    // 普通文件直接下载
    if (file.data.mimeType.startsWith('text/') ||
        file.data.mimeType === 'application/json' ||
        file.data.mimeType === 'application/pdf') {
      const response = await this.drive.files.get({
        fileId,
        alt: 'media'
      }, { responseType: 'text' });
      return response.data;
    }

    throw new Error(`Unsupported mime type: ${file.data.mimeType}`);
  }

  private buildQuery(): string {
    const conditions: string[] = [];

    if (this.config.rootFolderId) {
      conditions.push(`'${this.config.rootFolderId}' in parents`);
    }

    if (this.config.mimeTypes?.length) {
      const mimeConditions = this.config.mimeTypes.map(m => `mimeType = '${m}'`);
      conditions.push(`(${mimeConditions.join(' or ')})`);
    }

    // 排除文件夹
    conditions.push("mimeType != 'application/vnd.google-apps.folder'");

    return conditions.join(' and ');
  }

  private async processFile(file: any): Promise<DataItem | null> {
    try {
      let content: string | null = null;

      // 尝试获取内容
      if (this.isTextBased(file.mimeType)) {
        content = await this.getFileContent(file.id);
      }

      return {
        id: `gdrive:${file.id}`,
        type: 'document',
        content,
        title: file.name,
        metadata: {
          source: 'google-drive',
          created: new Date(file.createdTime),
          modified: new Date(file.modifiedTime),
          url: file.webViewLink,
          mimeType: file.mimeType,
          size: file.size,
          parentId: file.parents?.[0]
        }
      };
    } catch (error) {
      console.warn(`Failed to process file ${file.id}:`, error);
      return null;
    }
  }

  private isTextBased(mimeType: string): boolean {
    const textBased = [
      'text/',
      'application/json',
      'application/xml',
      'application/vnd.google-apps.document',
      'application/vnd.google-apps.spreadsheet'
    ];
    return textBased.some(t => mimeType.startsWith(t) || mimeType === t);
  }

  private async getSavedPageToken(): Promise<string | null> {
    // 从状态文件读取
    const statePath = `~/.claude/aggreresearch/sync/google-drive-token.json`;
    try {
      const state = await fs.readJson(statePath);
      return state.pageToken;
    } catch {
      return null;
    }
  }

  private async savePageToken(token: string): Promise<void> {
    const statePath = `~/.claude/aggreresearch/sync/google-drive-token.json`;
    await fs.writeJson(statePath, { pageToken: token });
  }

  private async removeFile(fileId: string): Promise<void> {
    // 从本地存储删除
    console.log(`Removing file: ${fileId}`);
  }

  normalize(raw: any): UnifiedDataItem {
    return {
      id: `gdrive:${raw.id}`,
      type: 'document',
      content: raw.content,
      title: raw.name,
      metadata: {
        source: 'google-drive',
        created: new Date(raw.createdTime),
        modified: new Date(raw.modifiedTime),
        url: raw.webViewLink,
        mimeType: raw.mimeType
      }
    };
  }
}
```

### 特点

- ✅ 支持 Google Docs 原生格式
- ✅ 增量同步 (Changes API)
- ✅ 全文搜索
- ✅ 文件夹层级支持

---

## 2. Dropbox Adapter

### 概述

Dropbox 提供简洁的文件同步服务，API 友好。

### 配置

```json
{
  "enabled": true,
  "accessToken": "dropbox_access_token",
  "refreshToken": "refresh_token",
  "appKey": "app_key",
  "appSecret": "app_secret",
  "rootPath": "/Apps/AggreResearch"
}
```

### 实现

```typescript
interface DropboxConfig {
  enabled: boolean;
  accessToken: string;
  refreshToken?: string;
  appKey?: string;
  appSecret?: string;
  rootPath?: string;
}

class DropboxAdapter implements DataSourceAdapter {
  name = 'dropbox';
  type = 'cloud' as const;

  private config: DropboxConfig;
  private baseUrl = 'https://api.dropboxapi.com/2';
  private contentUrl = 'https://content.dropboxapi.com/2';

  constructor(config: DropboxConfig) {
    this.config = config;
  }

  async authenticate(): Promise<void> {
    // 如果有 refresh token，刷新 access token
    if (this.config.refreshToken && this.config.appKey && this.config.appSecret) {
      const response = await fetch('https://api.dropboxapi.com/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: this.config.refreshToken,
          client_id: this.config.appKey,
          client_secret: this.config.appSecret
        })
      });

      const data = await response.json();
      this.config.accessToken = data.access_token;
    }
  }

  async fetchChanges(since: Date): Promise<DataItem[]> {
    const cursor = await this.getSavedCursor();

    if (!cursor) {
      return this.fetchAll();
    }

    const changes: DataItem[] = [];
    let hasMore = true;
    let currentCursor = cursor;

    while (hasMore) {
      const response = await fetch(`${this.baseUrl}/files/list_folder/continue`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ cursor: currentCursor })
      });

      const data = await response.json();

      for (const entry of data.entries || []) {
        if (entry['.tag'] === 'file') {
          const item = await this.processEntry(entry);
          if (item) changes.push(item);
        }
      }

      hasMore = data.has_more;
      currentCursor = data.cursor;
    }

    await this.saveCursor(currentCursor);
    return changes;
  }

  async fetchAll(): Promise<DataItem[]> {
    const files: DataItem[] = [];
    let hasMore = true;
    let cursor: string | null = null;

    while (hasMore) {
      const endpoint = cursor ? 'list_folder/continue' : 'list_folder';
      const body = cursor
        ? { cursor }
        : {
            path: this.config.rootPath || '',
            recursive: true,
            include_deleted: false
          };

      const response = await fetch(`${this.baseUrl}/files/${endpoint}`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(body)
      });

      const data = await response.json();

      for (const entry of data.entries || []) {
        if (entry['.tag'] === 'file') {
          const item = await this.processEntry(entry);
          if (item) files.push(item);
        }
      }

      hasMore = data.has_more;
      cursor = data.cursor;
    }

    // 保存 cursor 用于后续增量同步
    if (cursor) {
      await this.saveCursor(cursor);
    }

    return files;
  }

  async search(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    const response = await fetch(`${this.baseUrl}/files/search_v2`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        query,
        options: {
          path: this.config.rootPath,
          max_results: options?.limit || 100,
          file_status: 'active'
        }
      })
    });

    const data = await response.json();

    return (data.matches || []).map((match: any) => ({
      id: match.metadata.metadata.id,
      title: match.metadata.metadata.name,
      content: null,
      url: this.getPreviewUrl(match.metadata.metadata.path_display),
      path: match.metadata.metadata.path_display,
      modified: new Date(match.metadata.metadata.server_modified)
    }));
  }

  async getFileContent(path: string): Promise<string> {
    const response = await fetch(`${this.contentUrl}/files/download`, {
      method: 'POST',
      headers: {
        ...this.getHeaders(),
        'Dropbox-API-Arg': JSON.stringify({ path })
      }
    });

    if (!response.ok) {
      throw new Error(`Dropbox download failed: ${response.statusText}`);
    }

    return response.text();
  }

  async getTemporaryLink(path: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/files/get_temporary_link`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ path })
    });

    const data = await response.json();
    return data.link;
  }

  private getHeaders(): HeadersInit {
    return {
      'Authorization': `Bearer ${this.config.accessToken}`,
      'Content-Type': 'application/json'
    };
  }

  private getPreviewUrl(path: string): string {
    // Dropbox 预览链接
    return `https://www.dropbox.com/home${path}`;
  }

  private async processEntry(entry: any): Promise<DataItem | null> {
    // 跳过不支持的非文本文件
    if (!this.isSupportedFile(entry.name)) {
      return null;
    }

    let content: string | null = null;
    if (this.isTextFile(entry.name)) {
      try {
        content = await this.getFileContent(entry.path_display);
      } catch (error) {
        console.warn(`Failed to get content for ${entry.path_display}`);
      }
    }

    return {
      id: `dropbox:${entry.id}`,
      type: 'document',
      content,
      title: entry.name,
      metadata: {
        source: 'dropbox',
        created: new Date(entry.client_modified),
        modified: new Date(entry.server_modified),
        path: entry.path_display,
        size: entry.size,
        rev: entry.rev
      }
    };
  }

  private isTextFile(filename: string): boolean {
    const textExtensions = ['.txt', '.md', '.json', '.csv', '.xml', '.yaml', '.yml'];
    return textExtensions.some(ext => filename.toLowerCase().endsWith(ext));
  }

  private isSupportedFile(filename: string): boolean {
    const supportedExtensions = [
      '.txt', '.md', '.json', '.csv', '.xml', '.yaml', '.yml',
      '.pdf', '.docx', '.xlsx', '.pptx'
    ];
    return supportedExtensions.some(ext => filename.toLowerCase().endsWith(ext));
  }

  private async getSavedCursor(): Promise<string | null> {
    const statePath = `~/.claude/aggreresearch/sync/dropbox-cursor.json`;
    try {
      const state = await fs.readJson(statePath);
      return state.cursor;
    } catch {
      return null;
    }
  }

  private async saveCursor(cursor: string): Promise<void> {
    const statePath = `~/.claude/aggreresearch/sync/dropbox-cursor.json`;
    await fs.writeJson(statePath, { cursor, updatedAt: new Date().toISOString() });
  }

  normalize(raw: any): UnifiedDataItem {
    return {
      id: `dropbox:${raw.id}`,
      type: 'document',
      content: raw.content,
      title: raw.name,
      metadata: {
        source: 'dropbox',
        created: new Date(raw.client_modified),
        modified: new Date(raw.server_modified),
        path: raw.path_display,
        url: this.getPreviewUrl(raw.path_display)
      }
    };
  }
}
```

### 特点

- ✅ 简洁的 API
- ✅ 增量同步 (Cursor 机制)
- ✅ 临时链接生成
- ✅ 文件夹递归

---

## 3. 统一云盘接口

```typescript
// 云盘适配器注册表
const cloudAdapters: Record<string, DataSourceAdapter> = {
  'google-drive': new GoogleDriveAdapter(config.googleDrive),
  'dropbox': new DropboxAdapter(config.dropbox)
};

// 统一云盘搜索
async function searchCloud(
  query: string,
  options?: CloudSearchOptions
): Promise<UnifiedDataItem[]> {
  const sources = options?.sources || ['google-drive', 'dropbox'];

  const searchPromises = sources.map(async (source) => {
    const adapter = cloudAdapters[source];
    if (!adapter || !config[source]?.enabled) return [];

    try {
      const results = await adapter.search(query, options);
      return results.map(r => adapter.normalize(r));
    } catch (error) {
      console.warn(`${source} search failed:`, error);
      return [];
    }
  });

  const allResults = await Promise.all(searchPromises);
  return allResults.flat();
}
```

---

## 配置示例

```json
{
  "cloudStorage": {
    "enabled": true,
    "adapters": {
      "google-drive": {
        "enabled": true,
        "clientId": "${GOOGLE_CLIENT_ID}",
        "clientSecret": "${GOOGLE_CLIENT_SECRET}",
        "refreshToken": "${GOOGLE_REFRESH_TOKEN}",
        "mimeTypes": [
          "application/pdf",
          "text/plain",
          "application/vnd.google-apps.document"
        ]
      },
      "dropbox": {
        "enabled": true,
        "accessToken": "${DROPBOX_ACCESS_TOKEN}",
        "refreshToken": "${DROPBOX_REFRESH_TOKEN}",
        "appKey": "${DROPBOX_APP_KEY}",
        "appSecret": "${DROPBOX_APP_SECRET}"
      }
    }
  }
}
```

---

## 错误处理

| 错误 | 处理 |
|------|------|
| Token 过期 | 使用 refresh token 刷新 |
| API 限流 | 指数退避重试 |
| 文件过大 | 跳过并记录警告 |
| 不支持的格式 | 跳过该文件 |
| 网络错误 | 重试 3 次 |
