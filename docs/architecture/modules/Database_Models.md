# Database Models Design

> **Module**: Multi-Agent Research System
> **File**: `web/backend/app/db/models.py`
> **Version**: 1.0
> **Date**: 2026-01-17

## Overview

本文档描述 NEXEN 多智能体研究系统新增的数据库模型设计。这些模型支持 Agent 配置管理、研究任务分解和执行追踪。

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Entity Relationship Diagram                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│    ┌──────────┐         ┌─────────────────┐         ┌──────────────┐   │
│    │   User   │─────────│  AgentProfile   │         │ ResearchSess │   │
│    └──────────┘  1:N    └─────────────────┘         │    ion       │   │
│         │                       │                    └──────────────┘   │
│         │                       │                          │            │
│         │                       │ 1:N                      │ 1:N        │
│         │                       ▼                          ▼            │
│         │               ┌─────────────────┐        ┌──────────────┐    │
│         │               │ AgentExecution  │◀───────│ ResearchTask │    │
│         │               └─────────────────┘  1:1   └──────────────┘    │
│         │                       ▲                          │            │
│         │                       │                          │            │
│         └───────────────────────┼──────────────────────────┘            │
│                                 │                                        │
│                          (via session_id)                               │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Models

### 1. AgentProfile

Agent 配置档案，存储每个 Agent 的详细配置信息。

```python
class AgentProfile(Base):
    __tablename__ = "agent_profiles"

    # Primary Key
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))

    # Foreign Key
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)

    # Agent Identity
    agent_type = Column(String(50), nullable=False)      # meta_coordinator, explorer, etc.
    display_name = Column(String(100), nullable=False)   # English name
    display_name_cn = Column(String(100), nullable=False) # Chinese name
    cluster = Column(String(20), nullable=False)         # reasoning, information, production, coordination

    # Model Configuration
    role_model = Column(String(100), nullable=False, default="openai/gpt-4o")
    fallback_model = Column(String(100), nullable=True)
    temperature = Column(Float, default=0.7)
    max_tokens = Column(Integer, default=4000)

    # Persona Configuration
    persona = Column(Text, nullable=True)                # System prompt
    traits = Column(JSON, default=dict)                  # {"risk_preference": "medium", ...}
    responsibilities = Column(JSON, default=list)        # ["任务1", "任务2", ...]

    # Pipeline Configuration
    pipeline_config = Column(JSON, default=dict)         # Module 1/2/3 settings

    # Tools & Sources
    data_sources = Column(JSON, default=list)            # ["arxiv", "semantic_scholar"]
    enabled_skills = Column(JSON, default=list)          # ["/survey", "/paper-deep-dive"]

    # Status
    is_custom = Column(Boolean, default=False)           # User-created vs default
    is_enabled = Column(Boolean, default=True)           # Active/inactive

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="agent_profiles")
    executions = relationship("AgentExecution", back_populates="agent_profile")

    # Indexes
    __table_args__ = (
        Index("idx_agent_profiles_user_type", "user_id", "agent_type"),
    )
```

#### Field Details

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | FK(User) | Owner user |
| `agent_type` | String(50) | Agent identifier (meta_coordinator, explorer, etc.) |
| `display_name` | String(100) | Display name in English |
| `display_name_cn` | String(100) | Display name in Chinese |
| `cluster` | String(20) | Agent cluster classification |
| `role_model` | String(100) | Primary LLM model |
| `fallback_model` | String(100) | Fallback model if primary fails |
| `temperature` | Float | Generation temperature (0.0-1.0) |
| `max_tokens` | Integer | Maximum output tokens |
| `persona` | Text | System prompt / character description |
| `traits` | JSON | Personality traits dict |
| `responsibilities` | JSON | List of duties |
| `pipeline_config` | JSON | Module 1/2/3 configuration |
| `data_sources` | JSON | Available data sources |
| `enabled_skills` | JSON | Enabled skills/tools |
| `is_custom` | Boolean | User-created flag |
| `is_enabled` | Boolean | Active status |

### 2. AgentExecution

Agent 执行记录，追踪每次 Agent 任务执行的详细信息。

```python
class AgentExecution(Base):
    __tablename__ = "agent_executions"

    # Primary Key
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))

    # Foreign Keys
    session_id = Column(String(36), ForeignKey("research_sessions.id"), nullable=False, index=True)
    agent_profile_id = Column(String(36), ForeignKey("agent_profiles.id"), nullable=True)
    research_task_id = Column(String(36), ForeignKey("research_tasks.id"), nullable=True)

    # Agent Info
    agent_type = Column(String(50), nullable=False)
    agent_name = Column(String(100), nullable=False)

    # Task Info
    task_description = Column(Text, nullable=False)
    status = Column(String(20), default="pending")       # pending, running, completed, failed

    # Input/Output
    input_context = Column(JSON, nullable=True)          # Context provided to agent
    output_result = Column(Text, nullable=True)          # Raw output text
    structured_output = Column(JSON, nullable=True)      # {key_findings, uncertainties, suggestions}

    # Performance Metrics
    tokens_used = Column(Integer, default=0)
    duration_ms = Column(Integer, default=0)
    model_used = Column(String(100), nullable=True)
    confidence = Column(Float, nullable=True)            # 0.0-1.0

    # Storage
    raw_output_path = Column(String(500), nullable=True) # L0 storage path

    # Error Handling
    error_message = Column(Text, nullable=True)
    retry_count = Column(Integer, default=0)

    # Timestamps
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)

    # Relationships
    session = relationship("ResearchSession", back_populates="executions")
    agent_profile = relationship("AgentProfile", back_populates="executions")
    research_task = relationship("ResearchTask", back_populates="execution")

    # Indexes
    __table_args__ = (
        Index("idx_agent_executions_session", "session_id"),
        Index("idx_agent_executions_status", "status"),
    )
```

#### Field Details

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `session_id` | FK(ResearchSession) | Parent research session |
| `agent_profile_id` | FK(AgentProfile) | Agent configuration used |
| `research_task_id` | FK(ResearchTask) | Associated research task |
| `agent_type` | String(50) | Agent type identifier |
| `agent_name` | String(100) | Agent display name |
| `task_description` | Text | Task assigned to agent |
| `status` | String(20) | Execution status |
| `input_context` | JSON | Context data provided |
| `output_result` | Text | Raw output text |
| `structured_output` | JSON | Parsed findings |
| `tokens_used` | Integer | Token consumption |
| `duration_ms` | Integer | Execution time |
| `model_used` | String(100) | Actual model used |
| `confidence` | Float | Output confidence score |
| `raw_output_path` | String(500) | File path for L0 storage |
| `error_message` | Text | Error details if failed |
| `retry_count` | Integer | Number of retries |
| `started_at` | DateTime | Execution start time |
| `completed_at` | DateTime | Execution end time |

### 3. ResearchTask

研究任务，由 Meta-Coordinator 分解生成的子任务。

```python
class ResearchTask(Base):
    __tablename__ = "research_tasks"

    # Primary Key
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))

    # Foreign Keys
    session_id = Column(String(36), ForeignKey("research_sessions.id"), nullable=False, index=True)
    parent_task_id = Column(String(36), ForeignKey("research_tasks.id"), nullable=True)

    # Task Definition
    description = Column(Text, nullable=False)
    assigned_agent = Column(String(50), nullable=False)  # Agent type

    # Execution Control
    priority = Column(String(20), default="medium")      # critical, high, medium, low
    status = Column(String(20), default="pending")       # pending, in_progress, completed, failed, skipped
    dependencies = Column(JSON, default=list)            # [task_id, ...]
    execution_order = Column(Integer, default=0)
    execution_group = Column(Integer, default=0)         # For parallel execution

    # Output
    output = Column(Text, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    session = relationship("ResearchSession", back_populates="tasks")
    parent_task = relationship("ResearchTask", remote_side=[id])
    execution = relationship("AgentExecution", back_populates="research_task", uselist=False)

    # Indexes
    __table_args__ = (
        Index("idx_research_tasks_session", "session_id"),
        Index("idx_research_tasks_status", "status"),
        Index("idx_research_tasks_group", "session_id", "execution_group"),
    )
```

#### Field Details

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `session_id` | FK(ResearchSession) | Parent research session |
| `parent_task_id` | FK(self) | Parent task for subtasks |
| `description` | Text | Task description |
| `assigned_agent` | String(50) | Agent type to execute |
| `priority` | String(20) | Task priority level |
| `status` | String(20) | Current task status |
| `dependencies` | JSON | List of dependent task IDs |
| `execution_order` | Integer | Order within group |
| `execution_group` | Integer | Group for parallel execution |
| `output` | Text | Task output/result |

## Existing Model Updates

### ResearchSession (Updated)

Added relationships to new models:

```python
class ResearchSession(Base):
    # ... existing fields ...

    # New relationships
    tasks = relationship("ResearchTask", back_populates="session", cascade="all, delete-orphan")
    executions = relationship("AgentExecution", back_populates="session", cascade="all, delete-orphan")
```

### User (Updated)

Added relationship to AgentProfile:

```python
class User(Base):
    # ... existing fields ...

    # New relationship
    agent_profiles = relationship("AgentProfile", back_populates="user", cascade="all, delete-orphan")
```

## Status Enumerations

### Task Status

```python
class TaskStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"
```

### Task Priority

```python
class TaskPriority(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
```

### Execution Status

```python
class ExecutionStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
```

### Agent Cluster

```python
class AgentCluster(str, Enum):
    REASONING = "reasoning"
    INFORMATION = "information"
    PRODUCTION = "production"
    COORDINATION = "coordination"
```

## JSON Field Schemas

### traits (AgentProfile)

```json
{
    "risk_preference": "very_low|low|medium|high|very_high",
    "creativity": "very_low|low|medium|high|very_high",
    "rigor": "very_low|low|medium|high|very_high",
    "formalization": "very_low|low|medium|high|very_high"
}
```

### pipeline_config (AgentProfile)

```json
{
    "module1": {
        "generator_model": "string",
        "reviewer_model": "string",
        "refiner_model": "string",
        "template_type": "string",
        "pass_threshold": 40,
        "max_iterations": 3,
        "special_instructions": "string"
    },
    "module2": {
        "analyzer_model": "string",
        "default_insights": ["key_findings.md", "open_questions.md"],
        "agent_digests": [],
        "semantic_search_enabled": true,
        "semantic_top_k": 3,
        "token_budget": 8000,
        "focus_topics": []
    },
    "module3": {
        "preprocessor_model": "string",
        "tasks": ["deduplication", "noise_reduction", "importance_ranking"],
        "temperature": 0.3,
        "max_tokens": 4000
    }
}
```

### structured_output (AgentExecution)

```json
{
    "key_findings": ["string", "..."],
    "uncertainties": ["string", "..."],
    "suggestions": ["string", "..."],
    "references": ["string", "..."]
}
```

## Migration Notes

When applying these model changes:

1. **Database Migration**: Use Alembic to generate and apply migrations
2. **Index Creation**: Ensure all indexes are created for query performance
3. **Foreign Key Constraints**: Handle cascade deletes appropriately
4. **JSON Field Validation**: Use Pydantic for JSON field validation at API layer

```bash
# Generate migration
alembic revision --autogenerate -m "Add multi-agent research models"

# Apply migration
alembic upgrade head
```
