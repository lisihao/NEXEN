"""
Research API - Multi-Agent Collaborative Research System.

Provides endpoints for:
- Research session management
- Multi-agent task execution
- Task decomposition and tracking
- Memory system access
- Streaming research execution
"""

import asyncio
import json
import uuid
import sys
from datetime import datetime
from typing import Optional, List, AsyncGenerator

from fastapi import APIRouter, BackgroundTasks, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import (
    User, UserSettings, ResearchSession, AgentProfile,
    AgentExecution, ResearchTask
)
from app.auth.deps import get_current_active_user
from app.auth.security import decrypt_api_key

router = APIRouter()


# =============================================================================
# Default Agent Types for Task Assignment
# =============================================================================

AGENT_CAPABILITIES = {
    "meta_coordinator": ["task_decomposition", "synthesis", "decision"],
    "explorer": ["literature_search", "trend_analysis", "survey"],
    "logician": ["logical_reasoning", "mathematical_proof", "verification"],
    "critic": ["critique", "review", "assumption_questioning"],
    "connector": ["cross_domain", "analogy", "innovation"],
    "genealogist": ["people_profiling", "academic_lineage", "school_identification"],
    "historian": ["tech_evolution", "milestone_identification", "trend_prediction"],
    "social_scout": ["social_media", "hotspot_tracking", "sentiment_analysis"],
    "cn_specialist": ["chinese_content", "translation", "domestic_ecosystem"],
    "vision_analyst": ["image_analysis", "chart_interpretation", "visual_comparison"],
    "builder": ["code_implementation", "experiment_design", "prototyping"],
    "scribe": ["writing", "documentation", "report_generation"],
    "archivist": ["memory_management", "summarization", "indexing"],
    "prompt_engineer": ["prompt_design", "agent_optimization"],
}


# =============================================================================
# Pydantic Models
# =============================================================================

class SessionCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    task: str = Field(..., min_length=1, description="Research task description")


class SessionUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    status: Optional[str] = None


class SessionResponse(BaseModel):
    id: str
    user_id: str
    name: str
    description: Optional[str]
    status: str
    task_count: int = 0
    execution_count: int = 0
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SessionDetailResponse(SessionResponse):
    tasks: List[dict] = []
    executions: List[dict] = []
    research_results: dict = {}


class SessionListResponse(BaseModel):
    sessions: List[SessionResponse]
    total: int


class TaskResponse(BaseModel):
    id: str
    session_id: str
    description: str
    assigned_agent: str
    priority: str
    status: str
    dependencies: List[str]
    execution_order: int
    execution_group: int
    output: Optional[str]
    created_at: datetime
    updated_at: datetime


class TaskListResponse(BaseModel):
    tasks: List[TaskResponse]
    total: int


class ExecutionResponse(BaseModel):
    id: str
    session_id: str
    agent_type: str
    agent_name: str
    task_description: str
    status: str
    output_result: Optional[str]
    structured_output: dict
    tokens_used: int
    duration_ms: int
    model_used: Optional[str]
    started_at: Optional[datetime]
    completed_at: Optional[datetime]


class ExecutionListResponse(BaseModel):
    executions: List[ExecutionResponse]
    total: int


class MemoryResponse(BaseModel):
    layer: str
    files: List[dict]


class ExecuteRequest(BaseModel):
    max_agents: int = Field(default=5, ge=1, le=14)


# =============================================================================
# Helper Functions
# =============================================================================

def get_user_api_keys(user: User, db: Session) -> dict[str, str]:
    """Get decrypted API keys for a user."""
    settings = db.query(UserSettings).filter(UserSettings.user_id == user.id).first()
    if not settings:
        return {}

    keys = {}
    if settings.openai_api_key:
        keys["openai"] = decrypt_api_key(settings.openai_api_key)
    if settings.anthropic_api_key:
        keys["anthropic"] = decrypt_api_key(settings.anthropic_api_key)
    if settings.google_api_key:
        keys["google"] = decrypt_api_key(settings.google_api_key)

    return keys


def assign_agent_for_task(task_description: str) -> str:
    """Simple rule-based agent assignment based on task keywords."""
    task_lower = task_description.lower()

    # Keyword-based assignment
    if any(kw in task_lower for kw in ["文献", "论文", "检索", "survey", "paper", "literature"]):
        return "explorer"
    if any(kw in task_lower for kw in ["人物", "作者", "师承", "谱系", "who", "lineage"]):
        return "genealogist"
    if any(kw in task_lower for kw in ["演进", "历史", "起源", "timeline", "evolution", "history"]):
        return "historian"
    if any(kw in task_lower for kw in ["证明", "推理", "数学", "逻辑", "proof", "logic"]):
        return "logician"
    if any(kw in task_lower for kw in ["批判", "审查", "问题", "critique", "review"]):
        return "critic"
    if any(kw in task_lower for kw in ["跨领域", "联系", "类比", "cross", "connect"]):
        return "connector"
    if any(kw in task_lower for kw in ["代码", "实现", "实验", "code", "implement"]):
        return "builder"
    if any(kw in task_lower for kw in ["写作", "报告", "文档", "write", "report"]):
        return "scribe"
    if any(kw in task_lower for kw in ["社交", "twitter", "热点", "social"]):
        return "social_scout"
    if any(kw in task_lower for kw in ["中文", "国内", "chinese"]):
        return "cn_specialist"
    if any(kw in task_lower for kw in ["图", "图表", "架构", "visual", "chart"]):
        return "vision_analyst"

    # Default to explorer for general research tasks
    return "explorer"


async def decompose_task_with_llm(
    task: str,
    api_keys: dict,
    max_subtasks: int = 5
) -> List[dict]:
    """Use LLM to decompose a research task into subtasks."""
    import litellm

    # Determine model
    if api_keys.get("openai"):
        model = "openai/gpt-4o"
        api_key = api_keys["openai"]
    elif api_keys.get("anthropic"):
        model = "anthropic/claude-3-5-sonnet-20241022"
        api_key = api_keys["anthropic"]
    elif api_keys.get("google"):
        model = "google/gemini-2.0-pro"
        api_key = api_keys["google"]
    else:
        raise ValueError("No API key available")

    system_prompt = """你是一个研究任务分解专家。请将用户的研究任务分解为具体的子任务。

每个子任务应该：
1. 可以独立执行
2. 有明确的目标
3. 可以被分配给特定类型的Agent

可用的Agent类型：
- explorer: 文献检索、趋势分析
- logician: 逻辑推理、数学证明
- critic: 批判审查、假设质疑
- connector: 跨领域联系、类比推理
- genealogist: 人物档案、学术师承
- historian: 技术演进、里程碑识别
- builder: 代码实现、实验设计
- scribe: 写作、报告生成

请以JSON格式返回，包含以下字段：
{
  "subtasks": [
    {
      "description": "子任务描述",
      "assigned_agent": "agent类型",
      "priority": "high/medium/low",
      "execution_group": 0  // 同组可并行执行
    }
  ]
}"""

    try:
        response = await litellm.acompletion(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"请分解以下研究任务（最多{max_subtasks}个子任务）：\n\n{task}"}
            ],
            max_tokens=2000,
            temperature=0.3,
            api_key=api_key,
            response_format={"type": "json_object"},
        )

        result_text = response.choices[0].message.content
        result = json.loads(result_text)

        subtasks = result.get("subtasks", [])[:max_subtasks]

        # Validate and normalize subtasks
        validated = []
        for i, st in enumerate(subtasks):
            validated.append({
                "description": st.get("description", f"子任务 {i+1}"),
                "assigned_agent": st.get("assigned_agent", "explorer"),
                "priority": st.get("priority", "medium"),
                "execution_group": st.get("execution_group", i),
                "execution_order": i,
            })

        return validated

    except Exception as e:
        print(f"Task decomposition failed: {e}", file=sys.stderr)
        # Fallback: single task assigned to explorer
        return [{
            "description": task,
            "assigned_agent": assign_agent_for_task(task),
            "priority": "high",
            "execution_group": 0,
            "execution_order": 0,
        }]


async def execute_agent_task(
    task_description: str,
    agent_type: str,
    agent_profile: Optional[AgentProfile],
    api_keys: dict,
) -> dict:
    """Execute a task with a specific agent."""
    import litellm

    # Get agent configuration
    if agent_profile:
        persona = agent_profile.persona
        temperature = agent_profile.temperature
        max_tokens = agent_profile.max_tokens
        model = agent_profile.role_model
    else:
        # Use defaults from agent_profiles.py
        from app.api.agent_profiles import DEFAULT_AGENTS
        default = next((a for a in DEFAULT_AGENTS if a["agent_type"] == agent_type), None)
        if default:
            persona = default["persona"]
            temperature = default["temperature"]
            max_tokens = default["max_tokens"]
            model = default["role_model"]
        else:
            persona = "你是一个专业的研究助手。"
            temperature = 0.7
            max_tokens = 4000
            model = "openai/gpt-4o"

    # Get API key for model
    api_key = None
    if "openai" in model and api_keys.get("openai"):
        api_key = api_keys["openai"]
    elif "anthropic" in model and api_keys.get("anthropic"):
        api_key = api_keys["anthropic"]
    elif "google" in model and api_keys.get("google"):
        api_key = api_keys["google"]
    elif api_keys.get("openai"):
        model = "openai/gpt-4o"
        api_key = api_keys["openai"]
    else:
        raise ValueError("No suitable API key")

    start_time = datetime.utcnow()

    try:
        response = await litellm.acompletion(
            model=model,
            messages=[
                {"role": "system", "content": persona},
                {"role": "user", "content": task_description}
            ],
            max_tokens=max_tokens,
            temperature=temperature,
            api_key=api_key,
        )

        end_time = datetime.utcnow()
        duration_ms = int((end_time - start_time).total_seconds() * 1000)

        result = response.choices[0].message.content
        tokens_used = response.usage.total_tokens if response.usage else 0

        return {
            "status": "completed",
            "output_result": result,
            "tokens_used": tokens_used,
            "duration_ms": duration_ms,
            "model_used": model,
            "error_message": None,
        }

    except Exception as e:
        end_time = datetime.utcnow()
        duration_ms = int((end_time - start_time).total_seconds() * 1000)

        return {
            "status": "failed",
            "output_result": None,
            "tokens_used": 0,
            "duration_ms": duration_ms,
            "model_used": model,
            "error_message": str(e),
        }


async def stream_research_execution(
    session: ResearchSession,
    tasks: List[ResearchTask],
    agent_profiles: dict,
    api_keys: dict,
    db: Session,
) -> AsyncGenerator[str, None]:
    """Execute research tasks and stream progress."""

    yield f"data: {json.dumps({'type': 'started', 'message': '研究开始', 'total_tasks': len(tasks)})}\n\n"

    # Group tasks by execution_group for parallel execution
    groups = {}
    for task in tasks:
        group = task.execution_group
        if group not in groups:
            groups[group] = []
        groups[group].append(task)

    completed_tasks = 0
    all_results = []

    # Execute groups in order
    for group_num in sorted(groups.keys()):
        group_tasks = groups[group_num]

        yield f"data: {json.dumps({'type': 'group_started', 'group': group_num, 'tasks': len(group_tasks)})}\n\n"

        # Execute all tasks in group sequentially
        for task in group_tasks:
            # Notify task started
            yield f"data: {json.dumps({'type': 'task_started', 'task_id': task.id, 'agent': task.assigned_agent, 'description': task.description})}\n\n"

            # Update task status
            task.status = "in_progress"
            db.commit()

            # Get agent profile if exists
            agent_profile = agent_profiles.get(task.assigned_agent)

            # Execute
            result = await execute_agent_task(
                task_description=task.description,
                agent_type=task.assigned_agent,
                agent_profile=agent_profile,
                api_keys=api_keys,
            )

            # Create execution record
            execution = AgentExecution(
                session_id=session.id,
                agent_profile_id=agent_profile.id if agent_profile else None,
                research_task_id=task.id,
                agent_type=task.assigned_agent,
                agent_name=agent_profile.display_name if agent_profile else task.assigned_agent,
                task_description=task.description,
                status=result["status"],
                output_result=result["output_result"],
                tokens_used=result["tokens_used"],
                duration_ms=result["duration_ms"],
                model_used=result["model_used"],
                error_message=result["error_message"],
                started_at=datetime.utcnow(),
                completed_at=datetime.utcnow() if result["status"] == "completed" else None,
            )
            db.add(execution)

            # Update task
            task.status = result["status"]
            task.output = result["output_result"]
            db.commit()

            completed_tasks += 1

            # Notify task completed
            yield f"data: {json.dumps({'type': 'task_completed', 'task_id': task.id, 'agent': task.assigned_agent, 'status': result['status'], 'tokens': result['tokens_used'], 'progress': completed_tasks / len(tasks)})}\n\n"

            if result["output_result"]:
                all_results.append({
                    "agent": task.assigned_agent,
                    "task": task.description,
                    "result": result["output_result"][:500] + "..." if len(result["output_result"]) > 500 else result["output_result"]
                })

    # Synthesis phase
    yield f"data: {json.dumps({'type': 'synthesis_started', 'message': '正在综合研究结果...'})}\n\n"

    # Simple synthesis - combine all results
    synthesis_prompt = f"""请综合以下研究结果，生成一份完整的研究报告：

{json.dumps(all_results, ensure_ascii=False, indent=2)}

请按以下结构组织：
# 研究概述
# 主要发现
# 关键洞察
# 结论与建议
"""

    synthesis_result = await execute_agent_task(
        task_description=synthesis_prompt,
        agent_type="scribe",
        agent_profile=agent_profiles.get("scribe"),
        api_keys=api_keys,
    )

    # Update session with results
    session.research_results = {
        "tasks": [t.to_dict() for t in tasks],
        "synthesis": synthesis_result.get("output_result", ""),
        "completed_at": datetime.utcnow().isoformat(),
    }
    session.status = "completed"
    db.commit()

    yield f"data: {json.dumps({'type': 'synthesis_completed', 'result': synthesis_result.get('output_result', '')[:1000]})}\n\n"
    yield f"data: {json.dumps({'type': 'completed', 'message': '研究完成'})}\n\n"


# =============================================================================
# Session Endpoints
# =============================================================================

@router.get("/sessions", response_model=SessionListResponse)
async def list_sessions(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """List all research sessions for the current user."""
    query = db.query(ResearchSession).filter(ResearchSession.user_id == current_user.id)

    if status:
        query = query.filter(ResearchSession.status == status)

    sessions = query.order_by(ResearchSession.updated_at.desc()).all()

    return SessionListResponse(
        sessions=[SessionResponse(
            id=s.id,
            user_id=s.user_id,
            name=s.name,
            description=s.description,
            status=s.status,
            task_count=len(s.research_tasks) if s.research_tasks else 0,
            execution_count=len(s.agent_executions) if s.agent_executions else 0,
            created_at=s.created_at,
            updated_at=s.updated_at,
        ) for s in sessions],
        total=len(sessions)
    )


@router.post("/sessions", response_model=SessionDetailResponse)
async def create_session(
    request: SessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Create a new research session with task decomposition."""
    # Get API keys
    api_keys = get_user_api_keys(current_user, db)
    if not api_keys:
        raise HTTPException(status_code=400, detail="请先在设置页面配置 API Keys")

    # Create session
    session = ResearchSession(
        user_id=current_user.id,
        name=request.name,
        description=request.description,
        status="active",
        messages=[{"role": "user", "content": request.task, "timestamp": datetime.utcnow().isoformat()}],
        research_results={"original_task": request.task},
    )
    db.add(session)
    db.flush()

    # Decompose task
    subtasks = await decompose_task_with_llm(request.task, api_keys)

    # Create research tasks
    created_tasks = []
    for st in subtasks:
        task = ResearchTask(
            session_id=session.id,
            description=st["description"],
            assigned_agent=st["assigned_agent"],
            priority=st["priority"],
            execution_group=st["execution_group"],
            execution_order=st["execution_order"],
            status="pending",
        )
        db.add(task)
        created_tasks.append(task)

    db.commit()
    db.refresh(session)

    return SessionDetailResponse(
        id=session.id,
        user_id=session.user_id,
        name=session.name,
        description=session.description,
        status=session.status,
        task_count=len(created_tasks),
        execution_count=0,
        created_at=session.created_at,
        updated_at=session.updated_at,
        tasks=[t.to_dict() for t in created_tasks],
        executions=[],
        research_results=session.research_results or {},
    )


@router.get("/sessions/{session_id}", response_model=SessionDetailResponse)
async def get_session(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get session details including tasks and executions."""
    session = db.query(ResearchSession).filter(
        ResearchSession.id == session_id,
        ResearchSession.user_id == current_user.id
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    tasks = db.query(ResearchTask).filter(
        ResearchTask.session_id == session_id
    ).order_by(ResearchTask.execution_order).all()

    executions = db.query(AgentExecution).filter(
        AgentExecution.session_id == session_id
    ).order_by(AgentExecution.created_at).all()

    return SessionDetailResponse(
        id=session.id,
        user_id=session.user_id,
        name=session.name,
        description=session.description,
        status=session.status,
        task_count=len(tasks),
        execution_count=len(executions),
        created_at=session.created_at,
        updated_at=session.updated_at,
        tasks=[t.to_dict() for t in tasks],
        executions=[e.to_dict() for e in executions],
        research_results=session.research_results or {},
    )


@router.put("/sessions/{session_id}", response_model=SessionResponse)
async def update_session(
    session_id: str,
    request: SessionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Update session details."""
    session = db.query(ResearchSession).filter(
        ResearchSession.id == session_id,
        ResearchSession.user_id == current_user.id
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if request.name is not None:
        session.name = request.name
    if request.description is not None:
        session.description = request.description
    if request.status is not None:
        session.status = request.status

    db.commit()
    db.refresh(session)

    return SessionResponse(
        id=session.id,
        user_id=session.user_id,
        name=session.name,
        description=session.description,
        status=session.status,
        task_count=len(session.research_tasks) if session.research_tasks else 0,
        execution_count=len(session.agent_executions) if session.agent_executions else 0,
        created_at=session.created_at,
        updated_at=session.updated_at,
    )


@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Delete a research session."""
    session = db.query(ResearchSession).filter(
        ResearchSession.id == session_id,
        ResearchSession.user_id == current_user.id
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    db.delete(session)
    db.commit()

    return {"message": "Session deleted"}


# =============================================================================
# Execution Endpoints
# =============================================================================

@router.post("/sessions/{session_id}/execute")
async def execute_research(
    session_id: str,
    request: ExecuteRequest = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Execute research tasks with streaming progress updates."""
    session = db.query(ResearchSession).filter(
        ResearchSession.id == session_id,
        ResearchSession.user_id == current_user.id
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Get API keys
    api_keys = get_user_api_keys(current_user, db)
    if not api_keys:
        raise HTTPException(status_code=400, detail="请先在设置页面配置 API Keys")

    # Get tasks
    tasks = db.query(ResearchTask).filter(
        ResearchTask.session_id == session_id,
        ResearchTask.status == "pending"
    ).order_by(ResearchTask.execution_order).all()

    if not tasks:
        raise HTTPException(status_code=400, detail="No pending tasks to execute")

    # Get user's agent profiles
    profiles = db.query(AgentProfile).filter(
        AgentProfile.user_id == current_user.id,
        AgentProfile.is_enabled == True
    ).all()
    agent_profiles = {p.agent_type: p for p in profiles}

    # Return streaming response
    return StreamingResponse(
        stream_research_execution(session, tasks, agent_profiles, api_keys, db),
        media_type="text/event-stream",
    )


@router.get("/sessions/{session_id}/tasks", response_model=TaskListResponse)
async def get_session_tasks(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get all tasks for a session."""
    session = db.query(ResearchSession).filter(
        ResearchSession.id == session_id,
        ResearchSession.user_id == current_user.id
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    tasks = db.query(ResearchTask).filter(
        ResearchTask.session_id == session_id
    ).order_by(ResearchTask.execution_order).all()

    return TaskListResponse(
        tasks=[TaskResponse(
            id=t.id,
            session_id=t.session_id,
            description=t.description,
            assigned_agent=t.assigned_agent,
            priority=t.priority,
            status=t.status,
            dependencies=t.dependencies or [],
            execution_order=t.execution_order,
            execution_group=t.execution_group,
            output=t.output,
            created_at=t.created_at,
            updated_at=t.updated_at,
        ) for t in tasks],
        total=len(tasks)
    )


@router.get("/sessions/{session_id}/executions", response_model=ExecutionListResponse)
async def get_session_executions(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get all agent executions for a session."""
    session = db.query(ResearchSession).filter(
        ResearchSession.id == session_id,
        ResearchSession.user_id == current_user.id
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    executions = db.query(AgentExecution).filter(
        AgentExecution.session_id == session_id
    ).order_by(AgentExecution.created_at).all()

    return ExecutionListResponse(
        executions=[ExecutionResponse(
            id=e.id,
            session_id=e.session_id,
            agent_type=e.agent_type,
            agent_name=e.agent_name,
            task_description=e.task_description,
            status=e.status,
            output_result=e.output_result,
            structured_output=e.structured_output or {},
            tokens_used=e.tokens_used,
            duration_ms=e.duration_ms,
            model_used=e.model_used,
            started_at=e.started_at,
            completed_at=e.completed_at,
        ) for e in executions],
        total=len(executions)
    )


@router.get("/sessions/{session_id}/memory")
async def get_session_memory(
    session_id: str,
    layer: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get memory contents for a session (L0/L1/L2)."""
    session = db.query(ResearchSession).filter(
        ResearchSession.id == session_id,
        ResearchSession.user_id == current_user.id
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # For now, return session's research_results as L2 insights
    # In full implementation, this would read from file-based memory system
    memory = {
        "l2_insights": session.research_results or {},
        "l1_digests": [],
        "l0_raw": [],
    }

    # Get execution outputs as L0 raw data
    executions = db.query(AgentExecution).filter(
        AgentExecution.session_id == session_id
    ).all()

    for e in executions:
        if e.output_result:
            memory["l0_raw"].append({
                "agent": e.agent_type,
                "task": e.task_description,
                "output": e.output_result,
                "timestamp": e.created_at.isoformat() if e.created_at else None,
            })

    if layer == "l2":
        return {"layer": "l2", "content": memory["l2_insights"]}
    elif layer == "l1":
        return {"layer": "l1", "content": memory["l1_digests"]}
    elif layer == "l0":
        return {"layer": "l0", "content": memory["l0_raw"]}
    else:
        return memory


# =============================================================================
# Legacy endpoint for backward compatibility
# =============================================================================

@router.post("")
async def create_research_task_legacy(
    request: dict,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Legacy endpoint for simple research tasks."""
    task_text = request.get("task") or request.get("query") or ""

    if not task_text:
        raise HTTPException(status_code=400, detail="Task description required")

    # Create session using new endpoint
    session_request = SessionCreate(
        name=task_text[:50] + "..." if len(task_text) > 50 else task_text,
        task=task_text,
    )

    return await create_session(session_request, db, current_user)
