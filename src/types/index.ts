/**
 * AggreResearch - Unified Data Format Types
 *
 * Core type definitions for data normalization across all adapters
 */

// ============================================
// Core Data Types
// ============================================

/**
 * Unified data item format - all adapters normalize to this format
 */
export interface UnifiedDataItem {
  /** Unique identifier (format: "source:id") */
  id: string;

  /** Type of data */
  type: DataType;

  /** Text content */
  content: string;

  /** Title (optional) */
  title?: string | null;

  /** Metadata specific to source */
  metadata: DataMetadata;
}

export type DataType =
  | 'document'    // Files, wiki pages, articles
  | 'message'     // Chat messages, posts, tweets
  | 'event'       // Calendar events
  | 'contact'     // People, organizations
  | 'note';       // Personal notes

export interface DataMetadata {
  /** Source identifier */
  source: string;

  /** Creation timestamp */
  created?: Date;

  /** Last modification timestamp */
  modified?: Date;

  /** Author/creator */
  author?: string;

  /** URL to original content */
  url?: string;

  /** File path (for local files) */
  path?: string;

  /** Tags/categories */
  tags?: string[];

  /** Additional source-specific fields */
  [key: string]: any;
}

// ============================================
// Adapter Interface
// ============================================

/**
 * Base interface for all data source adapters
 */
export interface DataSourceAdapter {
  /** Adapter name */
  name: string;

  /** Adapter type */
  type: AdapterType;

  /** Authenticate with the data source */
  authenticate(): Promise<void>;

  /** Fetch changes since a given date (incremental sync) */
  fetchChanges(since: Date): Promise<UnifiedDataItem[]>;

  /** Fetch all data (full sync) */
  fetchAll(): Promise<UnifiedDataItem[]>;

  /** Search the data source */
  search(query: string, options?: SearchOptions): Promise<SearchResult[]>;

  /** Normalize raw data to unified format */
  normalize(raw: any): UnifiedDataItem;
}

export type AdapterType =
  | 'file'
  | 'cloud'
  | 'note'
  | 'social'
  | 'calendar'
  | 'news'
  | 'knowledge'
  | 'code';

// ============================================
// Search Types
// ============================================

export interface SearchOptions {
  /** Maximum results to return */
  limit?: number;

  /** Offset for pagination */
  offset?: number;

  /** Sort order */
  sortBy?: 'relevance' | 'date' | 'popularity';

  /** Sort direction */
  sortOrder?: 'asc' | 'desc';

  /** Filter by date range */
  dateRange?: {
    start?: Date;
    end?: Date;
  };

  /** Source-specific filters */
  [key: string]: any;
}

export interface SearchResult {
  /** Result identifier */
  id: string;

  /** Result title */
  title?: string | null;

  /** Content snippet */
  content?: string | null;

  /** URL to original */
  url?: string;

  /** Relevance score */
  score?: number;

  /** Author */
  author?: string;

  /** Creation/modification date */
  created?: Date;
  modified?: Date;
}

// ============================================
// Error Handling
// ============================================

export enum ErrorType {
  TIMEOUT = 'TIMEOUT',
  UNAVAILABLE = 'UNAVAILABLE',
  INVALID_INPUT = 'INVALID_INPUT',
  PARTIAL_FAILURE = 'PARTIAL_FAILURE',
  AUTH_FAILED = 'AUTH_FAILED',
  RATE_LIMIT = 'RATE_LIMIT',
  NETWORK_ERROR = 'NETWORK_ERROR',
  NOT_FOUND = 'NOT_FOUND'
}

export enum ErrorSeverity {
  BLOCKING = 'BLOCKING',     // Cannot proceed, need user intervention
  RECOVERABLE = 'RECOVERABLE', // Can continue with degraded functionality
  WARNING = 'WARNING'        // Minor issue, no impact on functionality
}

export interface AggreResearchError {
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  source?: string;
  recoverable: boolean;
  fallbackAvailable: boolean;
  retryCount?: number;
}

// ============================================
// Intent Analysis
// ============================================

export interface IntentAnalysis {
  intent: {
    primary: IntentType;
    secondary?: string;
    confidence: number;
  };
  entities: Entity[];
  requirements: SearchRequirements;
  sentiment: {
    urgency: 'low' | 'medium' | 'high';
    importance: number;
  };
  suggestedWorkflow: string;
  alternatives: string[];
}

export type IntentType =
  | 'search'
  | 'research'
  | 'sync'
  | 'analyze'
  | 'index'
  | 'query_personal'
  | 'deep_report'
  | 'other';

export interface Entity {
  type: 'topic' | 'person' | 'company' | 'location' | 'date' | 'source';
  value: string;
  confidence: number;
}

export interface SearchRequirements {
  depth: 'quick' | 'standard' | 'deep' | 'exhaustive';
  sources?: string[];
  format?: string;
  timeConstraint?: 'any' | 'recent' | 'current';
}

// ============================================
// Configuration
// ============================================

export interface AggreResearchConfig {
  sources: Record<string, SourceConfig>;
  vectorStore?: {
    provider: 'sqlite' | 'chroma' | 'faiss';
    path: string;
  };
  sync?: {
    interval: number;
    retryAttempts: number;
  };
}

export interface SourceConfig {
  enabled: boolean;
  [key: string]: any;
}

// ============================================
// Sync Types
// ============================================

export interface SyncState {
  lastSync: Date;
  status: 'idle' | 'syncing' | 'error';
  cursor?: string;
  error?: string;
  stats?: {
    total: number;
    added: number;
    updated: number;
    deleted: number;
  };
}

export interface SyncResult {
  source: string;
  success: boolean;
  itemsProcessed: number;
  duration: number;
  error?: AggreResearchError;
}
