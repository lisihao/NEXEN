# API Design Document

> **Module**: Multi-Agent Research System
> **Version**: 1.0
> **Date**: 2026-01-17

## Overview

本文档描述 NEXEN 多智能体研究系统的 REST API 设计，包括 Agent Profile 管理 API 和 Research Session API。

## Base URL

```
http://localhost:8000/api
```

## Authentication

所有 API 需要 Bearer Token 认证：

```http
Authorization: Bearer {jwt_token}
```

---

## Agent Profile API

### Base Path: `/agents/profiles`

#### 1. Get User's Agent Profiles

获取当前用户的所有 Agent 配置。

```http
GET /agents/profiles
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `cluster` | string | No | Filter by cluster (reasoning, information, production, coordination) |
| `is_enabled` | boolean | No | Filter by enabled status |

**Response:**

```json
{
    "profiles": [
        {
            "id": "uuid-string",
            "user_id": "uuid-string",
            "agent_type": "explorer",
            "display_name": "Explorer",
            "display_name_cn": "探索者",
            "cluster": "information",
            "role_model": "openai/gpt-4o",
            "fallback_model": "google/gemini-2.0-pro",
            "temperature": 0.7,
            "max_tokens": 4000,
            "persona": "你是一个充满好奇心的研究探索者...",
            "traits": {
                "risk_preference": "medium",
                "creativity": "high"
            },
            "responsibilities": ["文献检索", "趋势发现"],
            "pipeline_config": {...},
            "data_sources": ["arxiv", "semantic_scholar"],
            "enabled_skills": ["/survey"],
            "is_custom": false,
            "is_enabled": true,
            "created_at": "2026-01-17T10:00:00Z",
            "updated_at": "2026-01-17T10:00:00Z"
        }
    ],
    "total": 14
}
```

#### 2. Get Default Agent Templates

获取 14 个默认 Agent 模板（不保存到数据库）。

```http
GET /agents/profiles/defaults
```

**Response:**

```json
{
    "agents": [
        {
            "agent_type": "meta_coordinator",
            "display_name": "Meta-Coordinator",
            "display_name_cn": "元协调者",
            "cluster": "coordination",
            "role_model": "openai/gpt-4o",
            "fallback_model": "google/gemini-2.0-pro",
            "temperature": 0.7,
            "max_tokens": 4000,
            "persona": "你是一位资深的AI研究PI...",
            "traits": {...},
            "responsibilities": ["分解复杂研究任务", ...],
            "pipeline_config": {...},
            "data_sources": [],
            "enabled_skills": []
        },
        // ... 13 more agents
    ]
}
```

#### 3. Initialize Default Agents

为当前用户初始化 14 个默认 Agent 配置。

```http
POST /agents/profiles/init-defaults
```

**Response:**

```json
{
    "message": "Default agents initialized",
    "created_count": 14
}
```

#### 4. Create Custom Agent Profile

创建自定义 Agent 配置。

```http
POST /agents/profiles
```

**Request Body:**

```json
{
    "agent_type": "custom_explorer",
    "display_name": "Custom Explorer",
    "display_name_cn": "自定义探索者",
    "cluster": "information",
    "role_model": "openai/gpt-4o",
    "fallback_model": "anthropic/claude-opus-4",
    "temperature": 0.8,
    "max_tokens": 6000,
    "persona": "你是一个专注于深度学习领域的探索者...",
    "traits": {
        "risk_preference": "high",
        "creativity": "very_high"
    },
    "responsibilities": ["深度学习文献检索", "前沿趋势分析"],
    "data_sources": ["arxiv", "papers_with_code"],
    "enabled_skills": ["/survey", "/paper-deep-dive"]
}
```

**Response:** Same as single profile object with `is_custom: true`

#### 5. Get Single Agent Profile

```http
GET /agents/profiles/{profile_id}
```

#### 6. Update Agent Profile

```http
PUT /agents/profiles/{profile_id}
```

**Request Body:** Partial update supported

```json
{
    "temperature": 0.5,
    "persona": "Updated persona...",
    "is_enabled": false
}
```

#### 7. Delete Agent Profile

仅可删除自定义 Agent。

```http
DELETE /agents/profiles/{profile_id}
```

**Response:**

```json
{
    "message": "Agent profile deleted"
}
```

#### 8. Clone Agent Profile

克隆现有 Agent 配置。

```http
POST /agents/profiles/{profile_id}/clone
```

**Response:** New profile with `is_custom: true` and "(Clone)" suffix

#### 9. Test Agent

使用简单任务测试 Agent。

```http
POST /agents/profiles/{profile_id}/test
```

**Request Body:**

```json
{
    "task": "请简要分析 Transformer 架构的核心创新点"
}
```

**Response:**

```json
{
    "agent_id": "uuid-string",
    "agent_type": "explorer",
    "task": "请简要分析 Transformer 架构的核心创新点",
    "result": "Transformer 架构的核心创新包括...",
    "tokens_used": 1234,
    "duration_ms": 2500,
    "model_used": "openai/gpt-4o"
}
```

---

## Research Session API

### Base Path: `/research/sessions`

#### 1. List Sessions

```http
GET /research/sessions
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `status` | string | No | Filter by status |
| `page` | integer | No | Page number (default: 1) |
| `page_size` | integer | No | Items per page (default: 20) |

**Response:**

```json
{
    "sessions": [
        {
            "id": "uuid-string",
            "user_id": "uuid-string",
            "name": "SSM 技术演进分析",
            "task": "分析 State Space Models 的技术演进...",
            "status": "completed",
            "current_stage": "synthesis",
            "progress": 100,
            "workspace_path": "/workspace/sessions/xxx",
            "total_tokens": 15234,
            "total_cost": 0.45,
            "created_at": "2026-01-17T10:00:00Z",
            "updated_at": "2026-01-17T11:30:00Z",
            "completed_at": "2026-01-17T11:30:00Z"
        }
    ],
    "total": 5,
    "page": 1,
    "page_size": 20
}
```

#### 2. Create Session

```http
POST /research/sessions
```

**Request Body:**

```json
{
    "name": "Mamba 架构深度解读",
    "task": "深入分析 Mamba 架构的设计原理、与 Transformer 的对比以及潜在应用场景"
}
```

**Response:** Session object

#### 3. Get Session Details

```http
GET /research/sessions/{session_id}
```

#### 4. Update Session

```http
PUT /research/sessions/{session_id}
```

**Request Body:**

```json
{
    "name": "Updated session name",
    "status": "archived"
}
```

#### 5. Delete Session

```http
DELETE /research/sessions/{session_id}
```

#### 6. Execute Research (SSE Streaming)

启动多 Agent 协作研究。返回 Server-Sent Events 流。

```http
POST /research/sessions/{session_id}/execute
```

**Response:** `Content-Type: text/event-stream`

**Event Types:**

```
data: {"type": "session_started", "data": {"session_id": "xxx", "message": "研究开始"}}

data: {"type": "decomposition_complete", "data": {"tasks": [...], "message": "任务分解完成"}}

data: {"type": "group_started", "data": {"group": 0, "tasks": 3}}

data: {"type": "task_started", "data": {"task_id": "xxx", "agent_type": "explorer", "description": "..."}}

data: {"type": "task_progress", "data": {"task_id": "xxx", "message": "正在检索论文...", "progress": 25}}

data: {"type": "task_completed", "data": {"task_id": "xxx", "agent_type": "explorer", "result": "...", "progress": 33}}

data: {"type": "task_failed", "data": {"task_id": "xxx", "error": "...", "progress": 33}}

data: {"type": "group_completed", "data": {"group": 0}}

data: {"type": "synthesis_started", "data": {"message": "开始综合分析..."}}

data: {"type": "synthesis_complete", "data": {"synthesis": "完整研究报告..."}}

data: {"type": "session_completed", "data": {"session_id": "xxx", "total_tokens": 15234, "duration_ms": 120000}}

data: {"type": "error", "data": {"error": "错误信息"}}
```

#### 7. Get Tasks

```http
GET /research/sessions/{session_id}/tasks
```

**Response:**

```json
{
    "tasks": [
        {
            "id": "uuid-string",
            "session_id": "uuid-string",
            "parent_task_id": null,
            "description": "检索 State Space Models 相关论文",
            "assigned_agent": "explorer",
            "priority": "high",
            "status": "completed",
            "dependencies": [],
            "execution_order": 0,
            "execution_group": 0,
            "output": "找到 23 篇相关论文...",
            "created_at": "2026-01-17T10:00:00Z",
            "updated_at": "2026-01-17T10:15:00Z"
        }
    ],
    "total": 8
}
```

#### 8. Get Executions

```http
GET /research/sessions/{session_id}/executions
```

**Response:**

```json
{
    "executions": [
        {
            "id": "uuid-string",
            "session_id": "uuid-string",
            "agent_profile_id": "uuid-string",
            "research_task_id": "uuid-string",
            "agent_type": "explorer",
            "agent_name": "Explorer",
            "task_description": "检索相关论文",
            "status": "completed",
            "input_context": {...},
            "output_result": "找到以下论文...",
            "structured_output": {
                "key_findings": ["S4 首次实现长序列建模", "..."],
                "uncertainties": ["硬件优化上限不确定"],
                "suggestions": ["建议深入研究选择性机制"]
            },
            "tokens_used": 1234,
            "duration_ms": 15000,
            "model_used": "openai/gpt-4o",
            "confidence": 0.85,
            "raw_output_path": "/workspace/sessions/xxx/L0/explorer/output.md",
            "error_message": null,
            "retry_count": 0,
            "started_at": "2026-01-17T10:00:00Z",
            "completed_at": "2026-01-17T10:00:15Z"
        }
    ],
    "total": 12
}
```

#### 9. Get Memory Layers

```http
GET /research/sessions/{session_id}/memory
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `layer` | string | No | Filter by layer (L0, L1, L2) |

**Response:**

```json
{
    "layers": [
        {
            "layer": "L2",
            "files": [
                {
                    "name": "key_findings.md",
                    "path": "/workspace/sessions/xxx/L2/key_findings.md",
                    "size": 2048,
                    "modified_at": "2026-01-17T11:00:00Z"
                },
                {
                    "name": "open_questions.md",
                    "path": "/workspace/sessions/xxx/L2/open_questions.md",
                    "size": 1024,
                    "modified_at": "2026-01-17T11:00:00Z"
                }
            ]
        },
        {
            "layer": "L1",
            "files": [...]
        },
        {
            "layer": "L0",
            "files": [...]
        }
    ]
}
```

#### 10. Get Memory Content

```http
GET /research/sessions/{session_id}/memory/content
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `path` | string | Yes | File path to read |

**Response:**

```json
{
    "layer": "L2",
    "path": "/workspace/sessions/xxx/L2/key_findings.md",
    "content": "# Key Findings\n\n1. SSM 起源于控制理论...\n2. S4 首次实现长序列建模...\n"
}
```

---

## Error Responses

### Standard Error Format

```json
{
    "detail": "Error message describing what went wrong"
}
```

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Missing or invalid token |
| 403 | Forbidden - Access denied |
| 404 | Not Found - Resource doesn't exist |
| 409 | Conflict - Resource already exists |
| 500 | Internal Server Error |

### Common Error Examples

```json
// 401 Unauthorized
{
    "detail": "Could not validate credentials"
}

// 404 Not Found
{
    "detail": "Agent profile not found"
}

// 403 Forbidden
{
    "detail": "Cannot delete default agents"
}

// 400 Bad Request
{
    "detail": "Invalid agent_type: must be one of [meta_coordinator, explorer, ...]"
}
```

---

## Rate Limiting

| Endpoint Type | Rate Limit |
|---------------|------------|
| Standard API | 100 requests/minute |
| Execute Research | 10 requests/minute |
| Test Agent | 20 requests/minute |

Rate limit headers in response:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642345678
```

---

## Frontend API Client

### TypeScript Interface

```typescript
// Agent API
export const agentApi = {
    getProfiles: () => get<{ profiles: AgentProfile[]; total: number }>('/agents/profiles'),
    getDefaults: () => get<{ agents: DefaultAgentTemplate[] }>('/agents/profiles/defaults'),
    initDefaults: () => post<{ message: string; created_count: number }>('/agents/profiles/init-defaults'),
    createProfile: (data: AgentProfileCreate) => post<AgentProfile>('/agents/profiles', data),
    getProfile: (id: string) => get<AgentProfile>(`/agents/profiles/${id}`),
    updateProfile: (id: string, data: AgentProfileUpdate) => put<AgentProfile>(`/agents/profiles/${id}`, data),
    deleteProfile: (id: string) => del(`/agents/profiles/${id}`),
    cloneProfile: (id: string) => post<AgentProfile>(`/agents/profiles/${id}/clone`),
    testAgent: (id: string, task: string) => post<AgentTestResult>(`/agents/profiles/${id}/test`, { task }),
};

// Research API
export const researchApi = {
    getSessions: (params?: { status?: string; page?: number; page_size?: number }) =>
        get<{ sessions: ResearchSession[]; total: number }>('/research/sessions', params),
    createSession: (data: { name: string; task: string }) =>
        post<ResearchSession>('/research/sessions', data),
    getSession: (id: string) => get<ResearchSession>(`/research/sessions/${id}`),
    updateSession: (id: string, data: Partial<ResearchSession>) =>
        put<ResearchSession>(`/research/sessions/${id}`, data),
    deleteSession: (id: string) => del(`/research/sessions/${id}`),
    executeResearch: (id: string, onEvent: (e: ResearchEvent) => void, onError?: (e: string) => void) =>
        streamSSE(`/research/sessions/${id}/execute`, onEvent, onError),
    getTasks: (id: string) => get<{ tasks: ResearchTaskItem[]; total: number }>(`/research/sessions/${id}/tasks`),
    getExecutions: (id: string) => get<{ executions: AgentExecution[]; total: number }>(`/research/sessions/${id}/executions`),
    getMemory: (id: string, layer?: string) => get<{ layers: MemoryLayer[] }>(`/research/sessions/${id}/memory`, { layer }),
    getMemoryContent: (id: string, path: string) => get<MemoryContent>(`/research/sessions/${id}/memory/content`, { path }),
};
```
