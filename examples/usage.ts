/**
 * AggreResearch - Example Usage
 *
 * Demonstrates how to use AggreResearch adapters
 */

import {
  UnifiedDataItem,
  SearchOptions,
  DataSourceAdapter
} from '../src/types';

// ============================================
// Example 1: Basic Search
// ============================================

async function basicSearchExample() {
  console.log('=== Basic Search Example ===\n');

  // Simulate search options
  const options: SearchOptions = {
    limit: 10,
    sortBy: 'relevance'
  };

  console.log('Search query: "AI Agent development"');
  console.log('Options:', JSON.stringify(options, null, 2));

  // In real usage, this would call the actual adapter
  // const results = await adapter.search('AI Agent development', options);
}

// ============================================
// Example 2: Multi-Source Search
// ============================================

async function multiSourceSearchExample() {
  console.log('=== Multi-Source Search Example ===\n');

  const sources = ['reddit', 'twitter', 'newsapi'];
  const query = 'GPT-5 release date';

  console.log(`Searching "${query}" across: ${sources.join(', ')}`);

  // In real usage:
  // const results = await Promise.all(
  //   sources.map(source => adapters[source].search(query))
  // );
}

// ============================================
// Example 3: Data Sync
// ============================================

async function dataSyncExample() {
  console.log('=== Data Sync Example ===\n');

  const lastSync = new Date('2024-01-01');
  console.log(`Fetching changes since: ${lastSync.toISOString()}`);

  // In real usage:
  // const changes = await adapter.fetchChanges(lastSync);
  // console.log(`Found ${changes.length} changes`);
}

// ============================================
// Example 4: Intent Analysis
// ============================================

function intentAnalysisExample() {
  console.log('=== Intent Analysis Example ===\n');

  const queries = [
    '帮我调研一下AI Agent的发展现状',
    '搜索Reddit上关于GPT-5的讨论',
    '同步我的Google Drive文档',
    '生成一份特斯拉股票的深度分析报告'
  ];

  const expectedIntents = [
    { query: queries[0], intent: 'research', workflow: 'Research' },
    { query: queries[1], intent: 'search', workflow: 'UnifiedSearch' },
    { query: queries[2], intent: 'sync', workflow: 'DataSync' },
    { query: queries[3], intent: 'deep_report', workflow: 'DeepReport' }
  ];

  expectedIntents.forEach(({ query, intent, workflow }) => {
    console.log(`Query: "${query}"`);
    console.log(`  → Intent: ${intent}`);
    console.log(`  → Workflow: ${workflow}\n`);
  });
}

// ============================================
// Example 5: Normalized Output
// ============================================

function normalizedOutputExample() {
  console.log('=== Normalized Output Example ===\n');

  // Simulated normalized output from different sources
  const redditItem: UnifiedDataItem = {
    id: 'reddit:abc123',
    type: 'message',
    content: 'I think GPT-5 will be released in 2024...',
    title: 'Discussion about GPT-5',
    metadata: {
      source: 'reddit',
      created: new Date(),
      author: 'user123',
      url: 'https://reddit.com/r/OpenAI/comments/abc123',
      tags: ['GPT-5', 'OpenAI']
    }
  };

  const notionItem: UnifiedDataItem = {
    id: 'notion:page-456',
    type: 'note',
    content: '# My Research Notes\n\nKey findings...',
    title: 'AI Research Notes',
    metadata: {
      source: 'notion',
      created: new Date(),
      modified: new Date(),
      author: 'me@example.com',
      url: 'https://notion.so/page-456'
    }
  };

  const calendarItem: UnifiedDataItem = {
    id: 'gcal:event-789',
    type: 'event',
    content: 'Weekly team sync to discuss project progress',
    title: 'Team Sync',
    metadata: {
      source: 'google-calendar',
      created: new Date(),
      author: 'organizer@example.com',
      url: 'https://calendar.google.com/event/789'
    }
  };

  console.log('Reddit Item:');
  console.log(JSON.stringify(redditItem, null, 2));
  console.log('\nNotion Item:');
  console.log(JSON.stringify(notionItem, null, 2));
  console.log('\nCalendar Item:');
  console.log(JSON.stringify(calendarItem, null, 2));
}

// ============================================
// Run Examples
// ============================================

async function main() {
  console.log('AggreResearch - Usage Examples\n');
  console.log('================================\n');

  await basicSearchExample();
  console.log('\n');

  await multiSourceSearchExample();
  console.log('\n');

  await dataSyncExample();
  console.log('\n');

  intentAnalysisExample();

  normalizedOutputExample();

  console.log('\n================================');
  console.log('Examples completed!');
}

main().catch(console.error);
