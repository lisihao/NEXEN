# NEXEN

**Next-generation EXpert ENgine** - 多Agent AI研究助手系统

---

## 简介

NEXEN是一个**异构多模型、多Agent协作**的AI研究助手系统，专为高级研究人员设计。系统通过14个具有不同"研究性格"的Agent协作，辅助完成文献调研、技术分析、论文写作等研究任务。

## 核心特性

- **异构多模型**: 不同Agent使用最适合其任务的AI模型 (Claude, GPT, Gemini, Grok, Qwen等)
- **外化记忆**: 中间结果写入文件系统，按需检索，避免上下文爆炸
- **人物谱系追踪**: Genealogist Agent追踪研究者师承和思想传承
- **技术历史梳理**: Historian Agent追踪技术演进脉络和分叉
- **三模块流水线**: 每个Agent执行前经过提示词优化、记忆检索、上下文预处理
- **技能编排**: 40+预定义技能，一键触发多Agent协作

## Agent列表

| Agent | 模型 | 职责 |
|-------|------|------|
| Meta-Coordinator | Claude Opus | 任务分解、决策 |
| Logician | OpenAI o3 | 逻辑推理、证明 |
| Critic | o3-mini | 审查、找漏洞 |
| Connector | Claude Sonnet | 跨域关联 |
| Genealogist | Claude Opus | 人物谱系、师承 |
| Historian | Claude Opus | 技术演进、分叉 |
| Explorer | Claude Sonnet | 文献检索 |
| Social Scout | Grok 3 | 社交监控 |
| CN Specialist | Qwen/DeepSeek | 中文资源 |
| Vision Analyst | Gemini 2 Pro | 图表分析 |
| Builder | Claude Sonnet | 代码实现 |
| Scribe | Claude Sonnet | 文档写作 |
| Archivist | Claude Sonnet | 记忆管理 |
| Prompt Engineer | Gemini 3 Pro | 提示词优化 |

## 文档

详细文档请参阅 [doc/](./doc/) 目录:

- [系统架构设计](./doc/NEXEN_Research_Agent_Architecture.md) - 完整架构说明
- [Agent配置详解](./doc/Agent_Configurations.md) - 各Agent配置参数
- [技能参考手册](./doc/Skills_Reference.md) - 所有技能的使用方法
- [外化记忆系统](./doc/Memory_System.md) - 记忆系统设计

## 快速开始

### 示例技能

```bash
# 快速领域综述
/survey "State Space Models"

# 论文深度解读
/paper-deep-dive 2312.00752

# 人物档案查询
/who "Geoffrey Hinton"

# 技术演进图谱
/evolution "Attention Mechanism"

# 学术谱系追溯
/lineage "Ilya Sutskever" --depth 3
```

## 系统架构

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         NEXEN Research Agent System                         │
└─────────────────────────────────────────────────────────────────────────────┘

                          ┌──────────────────────┐
                          │    User Interface    │
                          └──────────┬───────────┘
                                     │
                          ┌──────────▼───────────┐
                          │   Meta-Coordinator   │
                          └──────────┬───────────┘
                                     │
         ┌───────────────────────────┼───────────────────────────┐
         │                           │                           │
         ▼                           ▼                           ▼
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│  Model Router   │       │  Memory System  │       │  Skill Engine   │
└────────┬────────┘       └────────┬────────┘       └────────┬────────┘
         │                         │                         │
         └─────────────────────────┼─────────────────────────┘
                                   │
                          ┌────────▼────────┐
                          │  Agent Pool     │
                          │  (14 Agents)    │
                          └────────┬────────┘
                                   │
                          ┌────────▼────────┐
                          │ External Memory │
                          │ File System     │
                          └─────────────────┘
```

## License

MIT

---

*NEXEN - Empowering Research with Multi-Agent Intelligence*
