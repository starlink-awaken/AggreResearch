# Contributing to AggreResearch

Thank you for your interest in contributing to AggreResearch! This document provides guidelines and instructions for contributing.

## 🌟 Ways to Contribute

- **Report Bugs**: Submit issues for any bugs you find
- **Suggest Features**: Share your ideas for new features or improvements
- **Add Adapters**: Contribute new data source adapters
- **Improve Documentation**: Help improve our docs
- **Submit Pull Requests**: Fix bugs or add features

## 🛠️ Development Setup

### Prerequisites

- Node.js 18+
- TypeScript 5.0+
- Git

### Setup Steps

```bash
# Fork and clone the repository
git clone https://github.com/YOUR_USERNAME/AggreResearch.git
cd AggreResearch

# Install dependencies (if any)
npm install

# Create a branch for your changes
git checkout -b feature/your-feature-name
```

## 📝 Adding a New Adapter

### 1. Create the Adapter File

Create a new file in `skill/Adapters/` following this template:

```markdown
---
name: AggreResearch/YourAdapter
description: Brief description of your adapter
---

# YourAdapter Name

## Overview

Description of the data source and what it does.

## Configuration

\`\`\`json
{
  "enabled": true,
  "apiKey": "your_api_key"
}
\`\`\`

## Implementation

\`\`\`typescript
interface YourAdapterConfig {
  enabled: boolean;
  apiKey: string;
}

class YourAdapter implements DataSourceAdapter {
  name = 'your-adapter';
  type = 'data' as const;

  // Implementation...
}
\`\`\`

## Usage Examples

Examples of how to use the adapter.

## Error Handling

| Error | Handling |
|-------|----------|
| API Error | Retry with backoff |
```

### 2. Update SKILL.md

Add your adapter to the appropriate category in the data sources section.

### 3. Submit a Pull Request

## 🎨 Code Style

### TypeScript

- Use TypeScript strict mode
- Prefer `interface` over `type` for object shapes
- Use meaningful variable and function names
- Add JSDoc comments for public APIs

### Markdown

- Use proper heading hierarchy
- Include code examples with language hints
- Keep tables well-formatted

## 📋 Pull Request Checklist

- [ ] Code follows the project's style guidelines
- [ ] Documentation is updated
- [ ] Changes are tested
- [ ] Commit messages are clear and descriptive
- [ ] PR description explains the changes

## 🐛 Reporting Bugs

When reporting bugs, please include:

1. **Description**: Clear description of the bug
2. **Steps to Reproduce**: How to reproduce the issue
3. **Expected Behavior**: What you expected to happen
4. **Actual Behavior**: What actually happened
5. **Environment**: OS, Node version, etc.
6. **Screenshots**: If applicable

## 💡 Feature Requests

For feature requests, please include:

1. **Problem**: What problem does this solve?
2. **Solution**: Your proposed solution
3. **Alternatives**: Other solutions you've considered
4. **Impact**: Who would benefit from this feature?

## 📞 Contact

- Open an issue for bugs or feature requests
- Start a discussion for questions or ideas

## 📜 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to AggreResearch! 🎉
