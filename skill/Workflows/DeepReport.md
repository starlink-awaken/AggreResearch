---
name: AggreResearch/DeepReport
description: Manus级深度报告工作流 - 数据驱动、多阶段递进、完整交付
---

# AggreResearch - Manus级深度报告

## 概述

生成类似 Manus 风格的深度报告：数据驱动、结构化、可执行。

## 使用方式

```
用户: "生成一份特斯拉股票深度分析报告"
用户: "给我一份AI在医疗领域应用的全景分析"
用户: "深入调研Web3在金融领域的发展现状和前景"
```

## 核心特点

| 特点 | 说明 |
|------|------|
| 📊 数据驱动 | 实时数据 + 案例支撑 |
| 🔍 层层递进 | 5阶段递进分析 |
| 📋 结构化 | 清晰的章节结构 |
| ✅ 可执行 | 完整的行动计划 |
| 🌐 多源融合 | Web + RAG + 实时API |

## 执行流程

```
Phase 1: 任务理解 → Phase 2: 数据获取 → Phase 3: 深度分析 → Phase 4: 结构化输出 → Phase 5: 交付
```

---

## Phase 1: 任务理解

### 1.1 问题拆解 (5W1H)

```typescript
interface TaskAnalysis {
  what: string;      // 是什么
  why: string;       // 为什么
  who: string;       // 涉及谁
  when: string;     // 时间范围
  where: string;    // 领域/地域
  how: string;      // 如何发展
}

function analyzeTask(query: string): TaskAnalysis {
  // 使用LLM拆解问题
  const analysis = llm.analyze(`
    分析以下问题，提取5W1H要素：
    ${query}

    返回JSON格式：
    {what, why, who, when, where, how}
  `);
  return JSON.parse(analysis);
}
```

### 1.2 关键假设识别

```typescript
interface Assumption {
  statement: string;
  confidence: number;     // 0-1 置信度
  needVerify: boolean;    // 是否需要验证
}

function identifyAssumptions(analysis: TaskAnalysis): Assumption[] {
  // 识别需要验证的假设
  return [
    { statement: "假设1", confidence: 0.8, needVerify: true },
    { statement: "假设2", confidence: 0.6, needVerify: true },
  ];
}
```

### 1.3 分析框架设计

```typescript
interface AnalysisFramework {
  dimensions: string[];      // 分析维度
  methodology: string;      // 方法论
  dataNeeds: string[];      // 需要的数据
}

// 根据问题类型选择框架
function designFramework(analysis: TaskAnalysis): AnalysisFramework {
  const type = classifyQuery(analysis.what);

  switch (type) {
    case 'industry':
      return {
        dimensions: ['市场规模', '竞争格局', '技术趋势', '政策环境'],
        methodology: 'PEST + 波特五力',
        dataNeeds: ['行业报告', '公司财报', '政策文件']
      };
    case 'stock':
      return {
        dimensions: ['基本面', '技术面', '估值', '风险'],
        methodology: 'DCF +相对估值',
        dataNeeds: ['财务数据', '行情数据', '分析师预期']
      };
    case 'technology':
      return {
        dimensions: ['技术原理', '应用场景', '发展瓶颈', '未来趋势'],
        methodology: '技术成熟度分析',
        dataNeeds: ['论文', '专利', '产品数据']
      };
    default:
      return { dimensions: [], methodology: '综合分析', dataNeeds: [] };
  }
}
```

---

## Phase 2: 数据获取

### 2.1 实时API数据

```typescript
async function fetchRealTimeData(framework: AnalysisFramework): Promise<RealtimeData> {
  const results = await Promise.all([
    // 股票数据 (Yahoo Finance / Alpha Vantage)
    framework.methodology.includes('DCF') ?
      stockAPI.getData(symbol) : null,

    // 天气数据
    framework.dimensions.includes('天气') ?
      weatherAPI.getData(location) : null,

    // 新闻数据
    newsAPI.search({ query: topic, recent: true })
  ]);

  return {
    stock: results[0],
    weather: results[1],
    news: results[2]
  };
}
```

### 2.2 Web搜索多源

```typescript
async function multiSourceSearch(topic: string, framework: AnalysisFramework): Promise<SearchResults> {
  // 并行多源搜索
  const results = await Promise.all([
    // 通用搜索
    WebSearch(topic),

    // 专业来源 (Wiki, GitHub, Arxiv)
    specializedSearch.wiki(topic),
    specializedSearch.github(topic),
    specializedSearch.arxiv(topic),

    // 中文搜索 (秘塔)
    specializedSearch.mita(topic),
  ]);

  // 按来源分类
  return {
    general: results[0],
    wiki: results[1],
    github: results[2],
    arxiv: results[3],
    mita: results[4]
  };
}
```

### 2.3 RAG本地知识

```typescript
async function queryLocalKnowledge(topic: string, framework: AnalysisFramework): Promise<LocalKnowledge[]> {
  // 搜索已索引的本地知识库
  const results = await ragSearch(topic, {
    topK: 10,
    dimensions: framework.dimensions
  });

  return results;
}
```

---

## Phase 3: 深度分析

### 3.1 多维度分析

```typescript
async function multiDimensionalAnalysis(
  data: DataSources,
  framework: AnalysisFramework
): Promise<DimensionAnalysis[]> {
  // 每个维度并行分析
  const analyses = await Promise.all(
    framework.dimensions.map(async (dimension) => {
      const relevantData = extractRelevantData(data, dimension);

      return {
        dimension,
        findings: await analyzeDimension(dimension, relevantData),
        confidence: calculateConfidence(relevantData),
        evidence: relevantData.sources
      };
    })
  );

  return analyses;
}
```

### 3.2 交叉验证

```typescript
async function crossValidate(analyses: DimensionAnalysis[]): Promise<ValidationResult> {
  // 检查数据一致性
  const conflicts = findConflicts(analyses);

  // 多源验证
  const verifications = await Promise.all(
    conflicts.map(c => verifyClaim(c.claim, c.sources))
  );

  return {
    consistent: verifications.filter(v => v.consistent).length,
    conflicts: verifications.filter(v => !v.consistent),
    overallConfidence: calculateOverallConfidence(verifications)
  };
}
```

### 3.3 异常识别

```typescript
function identifyAnomalies(analyses: DimensionAnalysis[]): Anomaly[] {
  return analyses
    .flatMap(a => a.findings)
    .filter(f => f.confidence < 0.6 || isOutlier(f.data))
    .map(f => ({
      finding: f,
      possibleReasons: explainAnomaly(f),
      impact: assessImpact(f)
    }));
}
```

---

## Phase 4: 结构化输出

### 4.1 执行摘要 (1页)

```typescript
function generateExecutiveSummary(
  analyses: DimensionAnalysis[],
  validation: ValidationResult
): ExecutiveSummary {
  return {
    title: reportTitle,
    keyFindings: extractTopFindings(analyses, 5),
    overallAssessment: generateAssessment(analyses, validation),
    confidenceLevel: validation.overallConfidence,
    recommendation: generateRecommendation(analyses)
  };
}
```

### 4.2 详细分析 (多章节)

```typescript
interface ReportChapter {
  title: string;
  content: string;
  subsections: {
    heading: string;
    content: string;
    data?: ChartData | TableData;
  }[];
  sources: Source[];
}

function generateChapters(analyses: DimensionAnalysis[]): ReportChapter[] {
  return analyses.map(analysis => ({
    title: analysis.dimension,
    content: generateAnalysisText(analysis),
    subsections: generateSubsections(analysis),
    sources: analysis.evidence
  }));
}
```

### 4.3 行动建议

```typescript
interface ActionItem {
  priority: 'high' | 'medium' | 'low';
  action: string;
  rationale: string;
  expectedOutcome: string;
  risk?: string;
}

function generateActionItems(
  analyses: DimensionAnalysis[],
  anomalies: Anomaly[]
): ActionItem[] {
  // 基于分析结果生成可执行建议
  const actions = [
    // 从分析中提取行动项
    ...extractActionsFromAnalysis(analyses),
    // 从异常中提取行动项
    ...extractActionsFromAnomalies(anomalies)
  ];

  // 排序和优先级
  return rankActions(actions);
}
```

### 4.4 风险提示

```typescript
function generateRiskWarnings(
  analyses: DimensionAnalysis[],
  anomalies: Anomaly[]
): RiskWarning[] {
  return [
    {
      category: '数据风险',
      description: '某些数据来源可能存在滞后性',
      mitigation: '建议交叉验证关键数据'
    },
    {
      category: '预测风险',
      description: '未来预测基于当前趋势，存在不确定性',
      mitigation: '关注关键指标变化，及时调整'
    }
  ];
}
```

---

## Phase 5: 交付物生成

### 5.1 Markdown报告

```typescript
function generateMarkdownReport(
  summary: ExecutiveSummary,
  chapters: ReportChapter[],
  actions: ActionItem[],
  risks: RiskWarning[]
): string {
  return `
# ${title}

## 执行摘要
${summary.content}

${chapters.map(c => `
## ${c.title}
${c.content}
${c.subsections.map(s => `### ${s.heading}\n${s.content}`).join('\n')}
`).join('\n')}

## 行动建议
${actions.map(a => `- [${a.priority}] ${a.action}`).join('\n')}

## 风险提示
${risks.map(r => `- **${r.category}**: ${r.description}`).join('\n')}

---
*报告生成时间: ${timestamp}*
*数据来源: ${allSources.join(', ')}*
`;
}
```

### 5.2 Excel数据表 (可选)

```typescript
async function generateExcelData(
  analyses: DimensionAnalysis[],
  rawData: DataSources
): Promise<ExcelFile> {
  // 生成Excel文件，包含：
  // - 原始数据表
  // - 分析结果表
  // - 图表数据表

  return await excel.create({
    sheets: [
      { name: '原始数据', data: rawData },
      { name: '分析结果', data: analyses },
      { name: '图表数据', data: prepareChartData(analyses) }
    ]
  });
}
```

---

## 输出格式

```typescript
interface DeepReportResponse {
  // 执行摘要
  summary: {
    title: string;
    keyFindings: string[];
    overallAssessment: string;
    confidenceLevel: number;      // 0-1
    recommendation: string;
  };

  // 详细报告
  chapters: ReportChapter[];

  // 行动建议
  actionItems: ActionItem[];

  // 风险提示
  risks: RiskWarning[];

  // 原始数据 (可选)
  rawData?: {
    sources: Source[];
    timestamp: string;
  };

  // 交付物
  deliverables: {
    markdown: string;
    excel?: ExcelFile;
  };
}
```

---

## 使用示例

```
用户: "生成一份特斯拉股票深度分析报告"

→ Phase 1: 任务理解
  - 拆解: 股票投资分析
  - 框架: DCF + 相对估值 + 技术分析

→ Phase 2: 数据获取
  - 实时: TSLA股价、财务数据、分析师评级
  - Web: 最新财报解读、行业趋势、竞品对比
  - RAG: 笔记中的历史分析

→ Phase 3: 深度分析
  - 基本面: 营收、利润、现金流分析
  - 估值: DCF模型、相对估值
  - 风险: 竞争风险、供应链风险
  - 交叉验证: 多源数据一致性检查

→ Phase 4: 结构化输出
  - 执行摘要 (1页)
  - 详细章节 (基本面、估值、风险、建议)
  - 行动建议 (买入/持有/卖出理由)
  - 风险提示

→ Phase 5: 交付
  - Markdown报告
  - Excel数据表 (可选)
```

---

## 报告模板

```markdown
# [标题]

## 执行摘要
> 1句话总结 + 3-5个关键发现 + 置信度评分

## 一、[第一维度]
### 1.1 子维度
- 发现1 [来源]
- 发现2 [来源]

## 二、[第二维度]
...

## 三、综合建议
| 优先级 | 建议 | 理由 |
|--------|------|------|
| 高 | 建议1 | ... |
| 中 | 建议2 | ... |

## 四、风险提示
- 风险1: 描述 [应对措施]
- 风险2: 描述 [应对措施]

---
*数据来源: [列表]*
*生成时间: [时间]*
*置信度: [X]%*
```
