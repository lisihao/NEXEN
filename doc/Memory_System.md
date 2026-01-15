# NEXEN 外化记忆系统设计

> 本文档详细描述外化记忆系统的架构、数据流和使用方法

---

## 1. 设计理念

### 1.1 为什么需要外化记忆？

**传统方式的问题**:
```
Agent → 输出 → 直接塞入Context → 下一个Agent
                      ↓
              上下文爆炸 (Token限制)
              信息冗余 (重复内容)
              难以检索 (无结构化)
              无法复盘 (人类不可读)
```

**NEXEN的解决方案**:
```
Agent → 输出 → 写入文件系统 → Archivist摘要 → 按需检索 → 精炼Context
                    ↓                   ↓              ↓
              结构化存储         智能浓缩        按需加载
              可追溯            分层管理        Token可控
              人类可读          自动索引        高质量上下文
```

### 1.2 核心优势

| 维度 | 传统方式 | NEXEN外化记忆 |
|------|---------|--------------|
| **上下文长度** | 爆炸式增长 | 稳定可控 |
| **Token成本** | 高（重复内容） | 低（按需检索） |
| **信息质量** | 噪声多 | 精炼高价值 |
| **可追溯性** | 难以回溯 | 完整记录 |
| **人类可读** | 差 | 层次分明，可复盘 |
| **跨会话复用** | 无 | knowledge_base持久化 |

---

## 2. 系统架构

### 2.1 三层记忆结构

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        External Memory System                               │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                     │
│  │  L2: insights │ →  │ L1: digest  │ →  │  L0: raw    │                     │
│  │  洞察精华层  │    │  摘要浓缩层  │    │  原始记录层  │                     │
│  │             │    │             │    │             │                     │
│  │  优先级: 高  │    │  优先级: 中  │    │  优先级: 低  │                     │
│  │  必读       │    │  相关性检索  │    │  按需引用    │                     │
│  └─────────────┘    └─────────────┘    └─────────────┘                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 层级定义

| 层级 | 目录 | 内容 | 检索方式 | Token预算 |
|------|------|------|---------|----------|
| **L2** | `insights/` | 关键发现、核心洞察 | 全部加载 | ~2000 |
| **L1** | `digest/` | Agent摘要、主题摘要 | 语义搜索 | ~4000 |
| **L0** | `raw/` | 原始思维链、工具输出 | 文件引用 | 按需 |

---

## 3. 目录结构详解

```
research_workspace/
│
├── .meta/                              # 系统元信息
│   ├── config.yaml                     # 系统配置
│   ├── agent_registry.yaml             # Agent注册表
│   └── session_index.json              # 会话索引
│
├── sessions/                           # 按研究会话组织
│   └── {session_id}/                   # 如: 2026-01-15_mamba_analysis
│       │
│       ├── manifest.yaml               # 会话元数据
│       │   # session_id: "2026-01-15_mamba_analysis"
│       │   # created: "2026-01-15T10:00:00Z"
│       │   # topic: "Mamba架构分析"
│       │   # status: "active"
│       │
│       ├── task_graph.json             # 任务依赖图
│       │
│       ├── raw/                        # 📁 L0 原始记录层
│       │   │
│       │   ├── explorer/               # 按Agent分类
│       │   │   ├── 20260115_102345_思维链.md
│       │   │   ├── 20260115_102345_工具调用.jsonl
│       │   │   └── 20260115_104512_推理结果.md
│       │   │
│       │   ├── historian/
│       │   │   └── 20260115_110023_技术演进.md
│       │   │
│       │   ├── genealogist/
│       │   │   └── 20260115_111534_人物调研.md
│       │   │
│       │   └── tool_outputs/           # 工具原始输出
│       │       ├── search_results/
│       │       │   └── ss_001.json
│       │       ├── code_execution/
│       │       └── api_responses/
│       │
│       ├── digest/                     # 📁 L1 摘要浓缩层
│       │   │
│       │   ├── by_agent/               # 按Agent维度
│       │   │   ├── explorer_digest.md
│       │   │   ├── historian_digest.md
│       │   │   └── genealogist_digest.md
│       │   │
│       │   ├── by_topic/               # 按主题维度
│       │   │   ├── mamba_pros.md
│       │   │   ├── mamba_cons.md
│       │   │   └── ssm_history.md
│       │   │
│       │   ├── by_person/              # 按人物维度
│       │   │   ├── albert_gu.md
│       │   │   └── tri_dao.md
│       │   │
│       │   ├── cross_agent/            # 跨Agent关联
│       │   │   └── consensus_points.md
│       │   │
│       │   └── timeline.md             # 时间线摘要
│       │
│       ├── insights/                   # 📁 L2 洞察精华层
│       │   ├── key_findings.md         # 关键发现 [必读]
│       │   ├── open_questions.md       # 待解决问题 [必读]
│       │   ├── action_items.md         # 行动建议
│       │   ├── contradictions.md       # 矛盾观点
│       │   ├── key_figures.md          # 关键人物
│       │   └── tech_timeline.md        # 技术时间线
│       │
│       └── artifacts/                  # 📁 产出物
│           ├── draft_paper.md
│           ├── figures/
│           └── code/
│
├── knowledge_base/                     # 长期知识库 (跨会话)
│   │
│   ├── papers/                         # 论文库
│   │   └── {paper_id}/
│   │       ├── metadata.yaml
│   │       ├── summary.md
│   │       └── notes.md
│   │
│   ├── concepts/                       # 概念定义
│   │   └── {concept_name}.md
│   │
│   ├── people/                         # 人物档案 (Genealogist)
│   │   └── {person_id}/
│   │       ├── profile.yaml
│   │       ├── summary.md
│   │       ├── timeline.md
│   │       └── publications.json
│   │
│   ├── graphs/                         # 关系图谱 (Genealogist)
│   │   ├── ai_pioneers.yaml
│   │   └── school_relations.yaml
│   │
│   ├── schools/                        # 学派档案 (Genealogist)
│   │   ├── toronto_school.md
│   │   └── montreal_school.md
│   │
│   ├── tech_history/                   # 技术演进 (Historian)
│   │   └── {tech_name}/
│   │       ├── evolution.yaml
│   │       ├── timeline.md
│   │       ├── axes/
│   │       │   └── efficiency_axis.yaml
│   │       └── branches/
│   │           └── efficient_attention.md
│   │
│   ├── thought_maps/                   # 思想地图
│   │   └── attention_evolution.md
│   │
│   └── glossary.yaml                   # 术语表
│
└── logs/                               # 系统日志
    ├── agent_activity.jsonl
    ├── model_calls.jsonl
    └── errors.log
```

---

## 4. 文件格式规范

### 4.1 原始思维链记录 (L0)

```markdown
<!-- raw/{agent}/{timestamp}_思维链.md -->
---
agent: Explorer
model: claude-sonnet-4
task_id: task_001
timestamp: 2026-01-15T10:23:45Z
tokens_used: 1523
duration_ms: 3421
---

## 任务
分析Mamba架构的优势

## 思维过程

### Step 1: 问题分解
我需要从以下维度分析Mamba:
- 计算复杂度
- 长序列建模能力
- 硬件效率

### Step 2: 文献检索
调用 Semantic Scholar API...
[查询: "Mamba state space model advantages"]
找到 23 篇相关论文

### Step 3: 关键发现
1. 线性时间复杂度 O(n) vs Transformer O(n²)
2. 选择性状态空间机制
3. ...

## 初步结论
[结论内容]

## 不确定点
- [ ] 实际推理速度对比数据需要验证
- [ ] 长度外推能力的边界条件

## 后续建议
- 建议Logician验证复杂度证明
- 建议Vision_Analyst分析性能曲线图
```

### 4.2 工具调用记录 (L0)

```jsonl
{"ts":"2026-01-15T10:23:46Z","agent":"Explorer","tool":"semantic_scholar","input":{"query":"Mamba SSM"},"output_file":"tool_outputs/search_results/ss_001.json","latency_ms":342,"status":"success"}
{"ts":"2026-01-15T10:23:48Z","agent":"Explorer","tool":"arxiv","input":{"id":"2312.00752"},"output_file":"tool_outputs/api_responses/arxiv_001.json","latency_ms":156,"status":"success"}
{"ts":"2026-01-15T10:24:01Z","agent":"Explorer","tool":"web_search","input":{"query":"Mamba vs Transformer benchmark"},"output_file":"tool_outputs/search_results/web_001.json","latency_ms":892,"status":"success"}
```

### 4.3 Agent摘要 (L1)

```markdown
<!-- digest/by_agent/explorer_digest.md -->
---
agent: Explorer
last_updated: 2026-01-15T11:30:00Z
raw_sources:
  - raw/explorer/20260115_102345_思维链.md
  - raw/explorer/20260115_104512_思维链.md
confidence: 0.85
---

## 核心发现

### 1. Mamba计算效率 [高置信度]
- 线性时间复杂度 O(n)，相比Transformer的O(n²)显著优势
- 来源: [思维链#1](../raw/explorer/20260115_102345_思维链.md#step-3)

### 2. 长序列处理 [中置信度]
- 在>8K token时优势明显
- ⚠️ 待验证: 128K长度外推能力
- 来源: [思维链#2](../raw/explorer/20260115_104512_思维链.md)

## 不确定点
- [ ] 实际推理延迟的benchmark数据
- [ ] 与Flash Attention 2的对比

## 与其他Agent的关联
- 🔗 Logician 正在验证复杂度证明
- ⚔️ Critic 对长度外推能力提出质疑
- 🔗 Historian 正在梳理SSM技术演进
```

### 4.4 关键洞察 (L2)

```markdown
<!-- insights/key_findings.md -->
---
last_updated: 2026-01-15T12:00:00Z
update_count: 5
---

## 🎯 关键发现

### 1. Mamba架构核心优势 [确认]
**结论**: Mamba在长序列任务上具有明显效率优势
**证据**:
- Explorer: 论文分析确认O(n)复杂度
- Logician: 数学证明已验证
- Builder: 实验复现确认
**置信度**: 95%

### 2. Mamba vs Transformer权衡 [部分确认]
**结论**: Mamba在某些任务上略逊于Transformer
**证据**:
- Critic: 指出在短序列任务上可能不如Transformer
- Explorer: 某些benchmark显示准确率略低
**置信度**: 70%
**待验证**: 需要更多对比实验

### 3. 关键人物洞察 [新发现]
**发现**: Albert Gu的研究路线可追溯到Stanford HazyLab
**来源**: Genealogist
**关联**: 与Chris Ré教授的系统优化思想有关

---

## ⚠️ 需要关注

1. **矛盾点**: Explorer和Critic对长度外推能力有分歧
2. **缺失**: 缺少在视觉任务上的详细分析
```

---

## 5. 检索机制

### 5.1 Memory Retriever 工作流程

```python
class MemoryRetriever:
    """分层记忆检索器"""

    PRIORITY_WEIGHTS = {
        "insights": 1.0,      # 最高优先级
        "digest": 0.7,        # 次优先级
        "raw": 0.3            # 按需访问
    }

    async def retrieve_context(
        self,
        query: str,
        agent: str,
        max_tokens: int = 8000
    ) -> RetrievedContext:
        """为Agent检索相关上下文"""

        results = []
        token_budget = max_tokens

        # Step 1: 必读 - insights层精华 (L2)
        insights = await self.load_insights([
            "key_findings.md",
            "open_questions.md"
        ])
        results.append(("L2_insights", insights))
        token_budget -= self.count_tokens(insights)

        # Step 2: 推荐 - 相关Agent摘要 (L1)
        relevant_digests = await self.search_digests(
            query,
            exclude_agent=agent,  # 不检索自己的
            top_k=3
        )
        for digest in relevant_digests:
            if token_budget < 1000:
                break
            results.append(("L1_digest", digest))
            token_budget -= self.count_tokens(digest)

        # Step 3: 可选 - 相关raw引用 (L0)
        if token_budget > 500:
            raw_refs = await self.search_raw(query, limit=3)
            # 只提供文件路径，不加载全文
            results.append(("L0_refs", raw_refs))

        return RetrievedContext(
            content=self.format_results(results),
            sources=self.extract_sources(results),
            token_count=max_tokens - token_budget
        )
```

### 5.2 检索触发规则

```yaml
# .meta/retrieval_rules.yaml

retrieval_triggers:

  # 任务开始时
  on_task_start:
    always_load:
      - "insights/key_findings.md"
      - "insights/open_questions.md"
    semantic_search:
      query_from: "task_description"
      search_in: ["digest/"]
      top_k: 3

  # Agent主动请求
  on_agent_request:
    commands:
      - "/recall {topic}"      # 检索特定主题
      - "/raw {file_path}"     # 读取原始记录
      - "/timeline"            # 获取时间线摘要

  # 跨Agent引用
  cross_reference:
    when: "mention_other_agent"
    action: "load digest/by_agent/{mentioned_agent}_digest.md"
```

### 5.3 上下文注入模板

```markdown
## 📚 研究记忆上下文

### 🎯 关键洞察 [必读 - L2]
{insights_content}

### 📋 相关Agent摘要 [推荐 - L1]
{agent_digests}

### 🔍 主题相关内容 [参考 - L1]
{topic_relevant_content}

### 📎 原始记录索引 [按需查阅 - L0]
以下文件可按需请求读取:
- raw/explorer/20260115_102345_思维链.md
- raw/historian/20260115_110023_技术演进.md

---
⚠️ 注意:
1. 优先基于「关键洞察」中的已有结论
2. 避免重复已完成的工作
3. 如发现矛盾，请明确标注
---
```

---

## 6. Archivist 工作机制

### 6.1 触发条件

| 触发类型 | 条件 | 动作 |
|---------|------|------|
| **增量触发** | raw/目录新增文件 | 处理新文件，更新digest |
| **定时触发** | 每15分钟 | 全局整理，更新insights |
| **会话结束** | 用户结束会话 | 完整摘要，归档到knowledge_base |

### 6.2 处理流程

```python
class ArchivistAgent:
    """档案管理员Agent"""

    async def process_new_raw(self, raw_file: Path):
        """处理新的原始记录"""

        # 1. 读取原始内容
        content = await self.read_file(raw_file)
        agent = self.extract_agent(raw_file)

        # 2. 提取关键信息
        extraction = await self.llm.extract(
            content,
            schema={
                "key_points": "list of important findings",
                "uncertainties": "list of uncertain items",
                "cross_references": "references to other agents",
                "action_items": "suggested next steps"
            }
        )

        # 3. 更新Agent级摘要
        await self.update_digest(
            f"digest/by_agent/{agent}_digest.md",
            extraction
        )

        # 4. 检测跨Agent关联
        if extraction.cross_references:
            await self.update_cross_agent_digest(extraction)

        # 5. 检测矛盾
        contradictions = await self.detect_contradictions(extraction)
        if contradictions:
            await self.update_file(
                "insights/contradictions.md",
                contradictions
            )

    async def generate_insights(self):
        """生成洞察精华 (L2层)"""

        # 读取所有digest
        all_digests = await self.read_all_digests()

        # 综合分析
        insights = await self.llm.synthesize(
            all_digests,
            output={
                "key_findings": "最重要的3-5个发现",
                "open_questions": "仍需解答的问题",
                "action_items": "建议的下一步行动",
                "contradictions": "需要解决的矛盾"
            }
        )

        # 写入insights层
        await self.write_insights(insights)
```

---

## 7. 最佳实践

### 7.1 Agent写入规范

1. **每次执行后立即写入raw/**
2. **使用统一的时间戳格式**: `YYYYMMDD_HHMMSS`
3. **包含完整的元数据头**
4. **标注不确定点和后续建议**
5. **引用来源文件时使用相对路径**

### 7.2 检索优化

1. **优先使用insights层**，避免直接读取raw
2. **语义搜索时限制top_k**，避免过多噪声
3. **对于特定细节才读取raw文件**
4. **利用Agent摘要了解其他Agent进展**

### 7.3 跨会话复用

1. **重要人物档案存入knowledge_base/people/**
2. **通用技术知识存入knowledge_base/concepts/**
3. **技术演进图存入knowledge_base/tech_history/**
4. **定期清理过时的session数据**

---

*NEXEN Memory System Documentation*
