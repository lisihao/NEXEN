# NEXEN Agentic Research Architecture Integration

> **Version**: 1.0
> **Date**: 2026-01-17
> **Status**: Implemented

## Overview

This document describes the integration of NEXEN's multi-agent research system into the web application. The implementation embeds the complete 14-agent collaborative research architecture into two primary modules:

- **AI Research**: Full multi-agent collaborative research execution
- **Research Team**: Agent configuration and management center

## Design Philosophy

The implementation preserves NEXEN's core design principles:

1. **Simulating Real Research Teams** - 14 specialized agents mirror academic research team roles
2. **Professional Division of Labor** - Each agent has distinct responsibilities and expertise
3. **Externalized Memory** - Hierarchical storage (L0/L1/L2) prevents context explosion
4. **Quality Control Loop** - Three-module pipeline ensures output quality
5. **Humanistic + Technical Perspectives** - Genealogist + Historian provide dual viewpoints

### Enhanced with Latest Research

Based on recent agentic research papers and startup products (2024-2025):

- **Independent Verification** - Critic agent for validation
- **Hierarchical Structure** - Coordinator-Worker pattern for fault tolerance
- **Structured Communication** - Typed messages between agents
- **Error Reflection** - Automatic retry and adjustment on failure

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         NEXEN Web Application                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────────┐         ┌──────────────────────────────────┐ │
│  │   Research Team      │         │         AI Research               │ │
│  │   (Agent Config)     │         │    (Multi-Agent Execution)        │ │
│  │                      │         │                                    │ │
│  │  - 14 Default Agents │         │  - Session Management             │ │
│  │  - Custom Agents     │◀───────▶│  - Task Decomposition             │ │
│  │  - Model Config      │         │  - Streaming Execution            │ │
│  │  - Persona/Traits    │         │  - Memory Visualization           │ │
│  │  - Pipeline Config   │         │  - Results Synthesis              │ │
│  └──────────────────────┘         └──────────────────────────────────┘ │
│            │                                    │                        │
│            └──────────────┬─────────────────────┘                        │
│                           ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │                        Backend API Layer                             ││
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐ ││
│  │  │ agent_profiles  │  │    research     │  │    WebSocket        │ ││
│  │  │     API         │  │      API        │  │    (Real-time)      │ ││
│  │  └─────────────────┘  └─────────────────┘  └─────────────────────┘ ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                           │                                              │
│                           ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │                      Database Layer (SQLite/PostgreSQL)              ││
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────────┐││
│  │  │ AgentProfile │  │ ResearchTask │  │      AgentExecution        │││
│  │  └──────────────┘  └──────────────┘  └────────────────────────────┘││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Agent Clusters

### Coordination Cluster (协调集群)
| Agent | Role | Primary Model |
|-------|------|---------------|
| Meta-Coordinator | Task decomposition, agent dispatch, synthesis | GPT-4o |

### Reasoning Cluster (推理集群)
| Agent | Role | Primary Model |
|-------|------|---------------|
| Logician | Logical reasoning, formal verification | GPT-4o |
| Critic | Method review, assumption questioning | GPT-4o |
| Connector | Cross-domain associations, analogical reasoning | GPT-4o |
| Genealogist | Scholar profiles, academic lineage | GPT-4o |
| Historian | Technology evolution, milestone identification | GPT-4o |

### Information Cluster (信息集群)
| Agent | Role | Primary Model |
|-------|------|---------------|
| Explorer | Literature search, trend discovery | GPT-4o |
| Social Scout | Social media monitoring, hot topics | GPT-4o |
| CN Specialist | Chinese literature, terminology translation | GPT-4o |
| Vision Analyst | Chart analysis, architecture diagrams | GPT-4o |

### Production Cluster (生产集群)
| Agent | Role | Primary Model |
|-------|------|---------------|
| Builder | Code implementation, prototyping | GPT-4o |
| Scribe | Paper writing, documentation | GPT-4o |
| Archivist | Memory management, knowledge indexing | GPT-4o-mini |
| Prompt Engineer | System prompt design, agent optimization | GPT-4o |

## Execution Pipeline

### Three-Module Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Agent Execution Pipeline                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────────┐ │
│  │    Module 1     │    │    Module 2     │    │      Module 3       │ │
│  │ Prompt Pipeline │───▶│ Memory Retrieval│───▶│ Context Preprocess  │ │
│  │                 │    │                 │    │                     │ │
│  │ - Generator     │    │ - Semantic Search│   │ - Deduplication     │ │
│  │ - Reviewer      │    │ - Digest Loading │   │ - Noise Reduction   │ │
│  │ - Refiner       │    │ - Token Budget   │   │ - Importance Rank   │ │
│  │ - Pass/Fail     │    │                 │    │                     │ │
│  └─────────────────┘    └─────────────────┘    └─────────────────────┘ │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Research Execution Flow

```
User Input (Research Question)
         │
         ▼
┌─────────────────────────────────────┐
│     1. Task Decomposition (LLM)     │
│     Meta-Coordinator analyzes and   │
│     breaks down into subtasks       │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│     2. Task Assignment              │
│     Assign tasks to appropriate     │
│     agents based on expertise       │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│     3. Parallel Group Execution     │
│     Execute independent tasks in    │
│     parallel within groups          │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│     4. Memory Storage               │
│     L0: Raw outputs                 │
│     L1: Agent digests               │
│     L2: Key insights                │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│     5. Synthesis                    │
│     Meta-Coordinator combines       │
│     all findings into final report  │
└─────────────────────────────────────┘
```

## Memory Hierarchy

| Layer | Content | Purpose |
|-------|---------|---------|
| **L0 - Raw** | Original agent outputs | Complete record for audit |
| **L1 - Digest** | Processed summaries per agent | Efficient context retrieval |
| **L2 - Insights** | Key findings, open questions | High-level knowledge |

## Key Files

### Backend
| File | Description |
|------|-------------|
| `app/db/models.py` | AgentProfile, AgentExecution, ResearchTask models |
| `app/api/agent_profiles.py` | Agent configuration management API |
| `app/api/research.py` | Multi-agent research collaboration API |

### Frontend
| File | Description |
|------|-------------|
| `lib/api.ts` | agentApi, researchApi TypeScript clients |
| `app/(main)/ai-teams/page.tsx` | Research Team - Agent configuration UI |
| `app/(main)/ai-research/page.tsx` | AI Research - Execution and visualization UI |

## Related Documents

- [Research Team Module Design](./modules/Research_Team_Module.md)
- [AI Research Module Design](./modules/AI_Research_Module.md)
- [Database Models Design](./modules/Database_Models.md)
- [API Design](./modules/API_Design.md)
