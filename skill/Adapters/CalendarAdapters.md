---
name: AggreResearch/CalendarAdapters
description: 日历适配器 - Google Calendar、Outlook日历事件同步
---

# 日历适配器

## 概述

集成日历服务，获取日程事件并支持时间线分析。

---

## 1. Google Calendar Adapter

### 概述

Google Calendar 是最流行的日历服务。

### 配置

```json
{
  "enabled": true,
  "clientId": "google_client_id",
  "clientSecret": "google_client_secret",
  "refreshToken": "refresh_token",
  "calendarIds": ["primary", "work@company.com"]
}
```

### 实现

```typescript
import { google } from 'googleapis';

interface GoogleCalendarConfig {
  enabled: boolean;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  calendarIds?: string[];
}

class GoogleCalendarAdapter implements DataSourceAdapter {
  name = 'google-calendar';
  type = 'calendar' as const;

  private config: GoogleCalendarConfig;
  private calendar: any;

  constructor(config: GoogleCalendarConfig) {
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

    this.calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  }

  async getEvents(options?: CalendarOptions): Promise<CalendarEvent[]> {
    if (!this.calendar) await this.authenticate();

    const calendarIds = options?.calendarIds || this.config.calendarIds || ['primary'];
    const events: CalendarEvent[] = [];

    for (const calendarId of calendarIds) {
      try {
        const response = await this.calendar.events.list({
          calendarId,
          timeMin: options?.timeMin?.toISOString() || new Date().toISOString(),
          timeMax: options?.timeMax?.toISOString() ||
                   new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          maxResults: options?.limit || 250,
          singleEvents: true,
          orderBy: 'startTime',
          showDeleted: false
        });

        for (const event of response.data.items || []) {
          events.push(this.normalizeEvent(event, calendarId));
        }
      } catch (error) {
        console.warn(`Failed to get events from ${calendarId}:`, error);
      }
    }

    // 按时间排序
    events.sort((a, b) => a.start.getTime() - b.start.getTime());

    return events;
  }

  async searchEvents(query: string, options?: CalendarOptions): Promise<CalendarEvent[]> {
    if (!this.calendar) await this.authenticate();

    const calendarIds = options?.calendarIds || this.config.calendarIds || ['primary'];
    const events: CalendarEvent[] = [];

    for (const calendarId of calendarIds) {
      try {
        const response = await this.calendar.events.list({
          calendarId,
          q: query,
          timeMin: options?.timeMin?.toISOString() || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
          timeMax: options?.timeMax?.toISOString() || new Date().toISOString(),
          maxResults: options?.limit || 100,
          singleEvents: true,
          orderBy: 'startTime'
        });

        for (const event of response.data.items || []) {
          events.push(this.normalizeEvent(event, calendarId));
        }
      } catch (error) {
        console.warn(`Failed to search events in ${calendarId}:`, error);
      }
    }

    return events;
  }

  async getEvent(calendarId: string, eventId: string): Promise<CalendarEvent> {
    if (!this.calendar) await this.authenticate();

    const response = await this.calendar.events.get({
      calendarId,
      eventId
    });

    return this.normalizeEvent(response.data, calendarId);
  }

  async getDailySummary(date: Date): Promise<DailySummary> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const events = await this.getEvents({
      timeMin: startOfDay,
      timeMax: endOfDay
    });

    return {
      date: startOfDay,
      totalEvents: events.length,
      events: events,
      busyHours: this.calculateBusyHours(events),
      categories: this.groupByCategory(events),
      firstEvent: events[0],
      lastEvent: events[events.length - 1]
    };
  }

  async getWeeklySummary(startDate: Date): Promise<WeeklySummary> {
    const summaries: DailySummary[] = [];
    let currentDate = new Date(startDate);

    for (let i = 0; i < 7; i++) {
      const summary = await this.getDailySummary(currentDate);
      summaries.push(summary);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return {
      startDate,
      endDate: currentDate,
      dailySummaries: summaries,
      totalEvents: summaries.reduce((sum, s) => sum + s.totalEvents, 0),
      totalBusyHours: summaries.reduce((sum, s) => sum + s.busyHours, 0),
      topCategories: this.getTopCategories(summaries)
    };
  }

  normalize(raw: any): UnifiedDataItem {
    return {
      id: `gcal:${raw.id}`,
      type: 'event',
      content: raw.description || '',
      title: raw.summary,
      metadata: {
        source: 'google-calendar',
        created: raw.created ? new Date(raw.created) : undefined,
        modified: raw.updated ? new Date(raw.updated) : undefined,
        start: raw.start?.dateTime ? new Date(raw.start.dateTime) : undefined,
        end: raw.end?.dateTime ? new Date(raw.end.dateTime) : undefined,
        location: raw.location,
        organizer: raw.organizer?.displayName,
        attendees: raw.attendees?.map((a: any) => a.email),
        status: raw.status,
        url: raw.htmlLink
      }
    };
  }

  private normalizeEvent(event: any, calendarId: string): CalendarEvent {
    return {
      id: event.id,
      calendarId,
      title: event.summary || 'Untitled',
      description: event.description,
      start: event.start?.dateTime
        ? new Date(event.start.dateTime)
        : new Date(event.start?.date || ''),
      end: event.end?.dateTime
        ? new Date(event.end.dateTime)
        : new Date(event.end?.date || ''),
      location: event.location,
      organizer: event.organizer?.displayName || event.organizer?.email,
      attendees: event.attendees?.map((a: any) => ({
        email: a.email,
        name: a.displayName,
        response: a.responseStatus
      })),
      isAllDay: !event.start?.dateTime,
      status: event.status,
      htmlLink: event.htmlLink,
      recurrence: event.recurrence,
      reminders: event.reminders
    };
  }

  private calculateBusyHours(events: CalendarEvent[]): number {
    let totalMs = 0;
    for (const event of events) {
      if (!event.isAllDay) {
        totalMs += event.end.getTime() - event.start.getTime();
      }
    }
    return totalMs / (1000 * 60 * 60); // 转换为小时
  }

  private groupByCategory(events: CalendarEvent[]): Record<string, number> {
    const groups: Record<string, number> = {};
    for (const event of events) {
      // 根据 title 简单分类
      const category = this.guessCategory(event.title);
      groups[category] = (groups[category] || 0) + 1;
    }
    return groups;
  }

  private guessCategory(title: string): string {
    const lower = title.toLowerCase();
    if (lower.includes('meeting') || lower.includes('会议')) return 'Meeting';
    if (lower.includes('call') || lower.includes('电话')) return 'Call';
    if (lower.includes('lunch') || lower.includes('午餐')) return 'Meal';
    if (lower.includes('gym') || lower.includes('运动')) return 'Exercise';
    return 'Other';
  }

  private getTopCategories(summaries: DailySummary[]): { category: string; count: number }[] {
    const totals: Record<string, number> = {};
    for (const summary of summaries) {
      for (const [cat, count] of Object.entries(summary.categories)) {
        totals[cat] = (totals[cat] || 0) + count;
      }
    }
    return Object.entries(totals)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);
  }
}

interface CalendarEvent {
  id: string;
  calendarId: string;
  title: string;
  description?: string;
  start: Date;
  end: Date;
  location?: string;
  organizer?: string;
  attendees?: { email: string; name?: string; response?: string }[];
  isAllDay: boolean;
  status?: string;
  htmlLink?: string;
  recurrence?: string[];
  reminders?: { useDefault: boolean; overrides?: any[] };
}

interface DailySummary {
  date: Date;
  totalEvents: number;
  events: CalendarEvent[];
  busyHours: number;
  categories: Record<string, number>;
  firstEvent?: CalendarEvent;
  lastEvent?: CalendarEvent;
}

interface WeeklySummary {
  startDate: Date;
  endDate: Date;
  dailySummaries: DailySummary[];
  totalEvents: number;
  totalBusyHours: number;
  topCategories: { category: string; count: number }[];
}
```

### 特点

- ✅ 多日历支持
- ✅ 每日/每周摘要
- ✅ 搜索功能
- ✅ 参与者信息

---

## 2. Outlook Calendar Adapter

### 概述

Microsoft Outlook 日历服务，企业用户常用。

### 配置

```json
{
  "enabled": true,
  "clientId": "outlook_client_id",
  "clientSecret": "outlook_client_secret",
  "tenantId": "common",
  "refreshToken": "refresh_token"
}
```

### 实现

```typescript
interface OutlookCalendarConfig {
  enabled: boolean;
  clientId: string;
  clientSecret: string;
  tenantId: string;
  refreshToken: string;
}

class OutlookCalendarAdapter implements DataSourceAdapter {
  name = 'outlook-calendar';
  type = 'calendar' as const;

  private config: OutlookCalendarConfig;
  private accessToken: string | null = null;
  private baseUrl = 'https://graph.microsoft.com/v1.0';

  constructor(config: OutlookCalendarConfig) {
    this.config = config;
  }

  async authenticate(): Promise<void> {
    const response = await fetch(
      `https://login.microsoftonline.com/${this.config.tenantId}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          refresh_token: this.config.refreshToken,
          grant_type: 'refresh_token',
          scope: 'https://graph.microsoft.com/.default'
        })
      }
    );

    if (!response.ok) {
      throw new Error('Outlook authentication failed');
    }

    const data = await response.json();
    this.accessToken = data.access_token;
  }

  private getHeaders(): HeadersInit {
    return {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json'
    };
  }

  async getEvents(options?: CalendarOptions): Promise<CalendarEvent[]> {
    if (!this.accessToken) await this.authenticate();

    const params = new URLSearchParams({
      '$orderby': 'start/dateTime',
      '$top': String(options?.limit || 100)
    });

    if (options?.timeMin) {
      params.set('$filter', `start/dateTime ge '${options.timeMin.toISOString()}'`);
    }
    if (options?.timeMax) {
      const existingFilter = params.get('$filter');
      const newFilter = `end/dateTime le '${options.timeMax.toISOString()}'`;
      params.set('$filter', existingFilter ? `${existingFilter} and ${newFilter}` : newFilter);
    }

    const response = await fetch(
      `${this.baseUrl}/me/calendarView?${params}`,
      { headers: this.getHeaders() }
    );

    if (!response.ok) {
      throw new Error(`Outlook API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.value.map(this.normalizeEvent);
  }

  async searchEvents(query: string, options?: CalendarOptions): Promise<CalendarEvent[]> {
    if (!this.accessToken) await this.authenticate();

    const params = new URLSearchParams({
      '$search': `"${query}"`,
      '$top': String(options?.limit || 50)
    });

    const response = await fetch(
      `${this.baseUrl}/me/events?${params}`,
      { headers: this.getHeaders() }
    );

    if (!response.ok) {
      throw new Error(`Outlook API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.value.map(this.normalizeEvent);
  }

  normalize(raw: any): UnifiedDataItem {
    return {
      id: `outlook:${raw.id}`,
      type: 'event',
      content: raw.body?.content || '',
      title: raw.subject,
      metadata: {
        source: 'outlook-calendar',
        created: raw.createdDateTime ? new Date(raw.createdDateTime) : undefined,
        modified: raw.lastModifiedDateTime ? new Date(raw.lastModifiedDateTime) : undefined,
        start: raw.start?.dateTime ? new Date(raw.start.dateTime) : undefined,
        end: raw.end?.dateTime ? new Date(raw.end.dateTime) : undefined,
        location: raw.location?.displayName,
        organizer: raw.organizer?.emailAddress?.name,
        attendees: raw.attendees?.map((a: any) => a.emailAddress?.address),
        status: raw.showAs,
        url: raw.webLink
      }
    };
  }

  private normalizeEvent(event: any): CalendarEvent {
    return {
      id: event.id,
      calendarId: 'primary',
      title: event.subject || 'Untitled',
      description: event.body?.content,
      start: new Date(event.start?.dateTime || event.start?.date),
      end: new Date(event.end?.dateTime || event.end?.date),
      location: event.location?.displayName,
      organizer: event.organizer?.emailAddress?.name,
      attendees: event.attendees?.map((a: any) => ({
        email: a.emailAddress?.address,
        name: a.emailAddress?.name,
        response: a.status?.response
      })),
      isAllDay: event.isAllDay,
      status: event.showAs,
      htmlLink: event.webLink
    };
  }
}
```

### 特点

- ✅ Microsoft 生态集成
- ✅ 企业账户支持
- ✅ Teams 会议信息
- ✅ 搜索功能

---

## 3. 统一日历接口

```typescript
// 日历适配器注册表
const calendarAdapters: Record<string, DataSourceAdapter> = {
  'google-calendar': new GoogleCalendarAdapter(config.googleCalendar),
  'outlook-calendar': new OutlookCalendarAdapter(config.outlookCalendar)
};

// 统一日历搜索
async function searchCalendar(
  query: string,
  options?: CalendarSearchOptions
): Promise<UnifiedDataItem[]> {
  const sources = options?.sources || ['google-calendar', 'outlook-calendar'];

  const searchPromises = sources.map(async (source) => {
    const adapter = calendarAdapters[source];
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

// 获取今日日程
async function getTodaySchedule(): Promise<DailySummary[]> {
  const today = new Date();
  const summaries: DailySummary[] = [];

  for (const [name, adapter] of Object.entries(calendarAdapters)) {
    if (!config[name]?.enabled) continue;

    try {
      if ('getDailySummary' in adapter) {
        const summary = await (adapter as any).getDailySummary(today);
        summaries.push(summary);
      }
    } catch (error) {
      console.warn(`${name} daily summary failed:`, error);
    }
  }

  return summaries;
}
```

---

## 配置示例

```json
{
  "calendar": {
    "enabled": true,
    "adapters": {
      "google-calendar": {
        "enabled": true,
        "clientId": "${GOOGLE_CLIENT_ID}",
        "clientSecret": "${GOOGLE_CLIENT_SECRET}",
        "refreshToken": "${GOOGLE_CALENDAR_REFRESH_TOKEN}",
        "calendarIds": ["primary", "work@example.com"]
      },
      "outlook-calendar": {
        "enabled": true,
        "clientId": "${OUTLOOK_CLIENT_ID}",
        "clientSecret": "${OUTLOOK_CLIENT_SECRET}",
        "tenantId": "common",
        "refreshToken": "${OUTLOOK_REFRESH_TOKEN}"
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
| 日历不存在 | 跳过该日历 |
| API 限流 | 指数退避重试 |
| 网络错误 | 重试 3 次 |
