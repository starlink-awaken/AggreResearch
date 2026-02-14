# Changelog

All notable changes to AggreResearch will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-02-14

### Added

#### Core Features
- Unified entry point for all research scenarios
- LLM-based intelligent intent analysis
- Normalized output format across all data sources
- Unified error handling framework with 8 error types and 3 severity levels

#### Workflows
- **QuickSearch**: Fast fact-based queries with WebSearch
- **Research**: Standard research with analysis and multiple perspectives
- **RAGIndex**: Local file indexing with vector storage
- **RAGQuery**: Query personal knowledge base
- **DeepReport**: Manus-level 5-phase deep report generation
- **DataSync**: Incremental data synchronization
- **UnifiedSearch**: Cross-source unified search
- **IntentAnalysis**: LLM-powered intent understanding

#### Adapters

**Notes**
- Obsidian adapter with markdown parsing and frontmatter support
- Notion adapter with API integration
- Logseq adapter with journal support

**Cloud Storage**
- Google Drive adapter with OAuth and incremental sync
- Dropbox adapter with cursor-based sync

**Community**
- Reddit adapter with subreddit search
- Discord adapter with message history
- Telegram adapter with channel support

**Social Media**
- Twitter/X adapter with search and user timeline
- LinkedIn adapter with profile and company info
- Apify integration for social scraping

**News**
- NewsAPI adapter with source filtering
- GNews adapter with topic categories
- RSS adapter with feed management

**Calendar**
- Google Calendar adapter with daily/weekly summaries
- Outlook Calendar adapter with Microsoft Graph API

**Knowledge Base**
- Confluence adapter with CQL search
- DeepWiki adapter for GitHub code search

**AI Search**
- Perplexity adapter with Sonar models
- Phind adapter for developer queries
- You.com adapter for multi-modal search

#### External Integrations
- AI-Research-SKILLS (83 AI research skills)
- DeepWiki (GitHub code search)
- Chroma/FAISS vector stores
- LangChain agent framework

### Documentation
- Comprehensive README with bilingual support
- CONTRIBUTING guide
- MIT License
- Inline code documentation

---

## [0.1.0] - 2024-01-15

### Added
- Initial project structure
- Basic workflow framework
- Obsidian adapter prototype

---

## Future Roadmap

### [1.1.0] - Planned
- [ ] Web UI for configuration management
- [ ] Real-time sync monitoring dashboard
- [ ] Additional adapters (Instagram, TikTok, Slack)
- [ ] Performance optimizations

### [1.2.0] - Planned
- [ ] Multi-language support
- [ ] Custom adapter SDK
- [ ] Cloud deployment options
- [ ] Team collaboration features

---

[1.0.0]: https://github.com/yourusername/AggreResearch/releases/tag/v1.0.0
[0.1.0]: https://github.com/yourusername/AggreResearch/releases/tag/v0.1.0
