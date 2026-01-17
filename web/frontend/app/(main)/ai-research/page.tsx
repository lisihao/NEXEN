'use client';

import { useState, useEffect, useRef } from 'react';
import {
    Play,
    Plus,
    RefreshCw,
    Bot,
    CheckCircle2,
    Circle,
    AlertCircle,
    ChevronRight,
    Clock,
    Folder,
    FileText,
    Layers,
    Brain,
    Search,
    Wrench,
    Users as UsersIcon,
    Loader2,
    X,
    Archive,
    Trash2,
    Eye,
    BarChart3,
    GitBranch,
} from 'lucide-react';
import {
    researchApi,
    ResearchSession,
    ResearchTaskItem,
    AgentExecution,
    ResearchEvent,
    MemoryLayer,
} from '@/lib/api';

// =============================================================================
// Types & Constants
// =============================================================================

type AgentCluster = 'reasoning' | 'information' | 'production' | 'coordination';

const CLUSTER_CONFIG: Record<AgentCluster, { label: string; icon: React.ElementType; color: string }> = {
    reasoning: { label: '推理', icon: Brain, color: 'text-purple-600' },
    information: { label: '信息', icon: Search, color: 'text-blue-600' },
    production: { label: '生产', icon: Wrench, color: 'text-green-600' },
    coordination: { label: '协调', icon: UsersIcon, color: 'text-orange-600' },
};

const AGENT_ICONS: Record<string, string> = {
    meta_coordinator: '🎯',
    logician: '🧮',
    critic: '🔬',
    connector: '🔗',
    genealogist: '📜',
    historian: '🏛️',
    explorer: '🔍',
    social_scout: '📡',
    cn_specialist: '🇨🇳',
    vision_analyst: '👁️',
    builder: '🛠️',
    scribe: '✍️',
    archivist: '📚',
    prompt_engineer: '💡',
};

const STATUS_CONFIG = {
    pending: { label: '待处理', color: 'text-gray-500', bg: 'bg-gray-100' },
    in_progress: { label: '进行中', color: 'text-blue-600', bg: 'bg-blue-100' },
    running: { label: '运行中', color: 'text-blue-600', bg: 'bg-blue-100' },
    completed: { label: '已完成', color: 'text-green-600', bg: 'bg-green-100' },
    failed: { label: '失败', color: 'text-red-600', bg: 'bg-red-100' },
    skipped: { label: '跳过', color: 'text-gray-500', bg: 'bg-gray-100' },
    active: { label: '活跃', color: 'text-blue-600', bg: 'bg-blue-100' },
    archived: { label: '归档', color: 'text-gray-500', bg: 'bg-gray-100' },
};

type ViewTab = 'overview' | 'agents' | 'tasks' | 'memory' | 'results';

// =============================================================================
// Main Component
// =============================================================================

export default function AIResearchPage() {
    // Session state
    const [sessions, setSessions] = useState<ResearchSession[]>([]);
    const [selectedSession, setSelectedSession] = useState<ResearchSession | null>(null);
    const [tasks, setTasks] = useState<ResearchTaskItem[]>([]);
    const [executions, setExecutions] = useState<AgentExecution[]>([]);
    const [memoryLayers, setMemoryLayers] = useState<MemoryLayer[]>([]);

    // UI state
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<ViewTab>('overview');

    // Execution state
    const [isExecuting, setIsExecuting] = useState(false);
    const [executionLogs, setExecutionLogs] = useState<ResearchEvent[]>([]);
    const [currentProgress, setCurrentProgress] = useState(0);
    const [synthesis, setSynthesis] = useState<string | null>(null);

    // Modal state
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newSessionName, setNewSessionName] = useState('');
    const [newSessionTask, setNewSessionTask] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    const logsEndRef = useRef<HTMLDivElement>(null);

    // =============================================================================
    // Data Fetching
    // =============================================================================

    useEffect(() => {
        fetchSessions();
    }, []);

    useEffect(() => {
        if (selectedSession) {
            fetchSessionDetails(selectedSession.id);
        }
    }, [selectedSession?.id]);

    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [executionLogs]);

    const fetchSessions = async () => {
        try {
            setIsLoading(true);
            const res = await researchApi.getSessions();
            setSessions(res.sessions);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load sessions');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchSessionDetails = async (sessionId: string) => {
        try {
            const [tasksRes, executionsRes, memoryRes] = await Promise.all([
                researchApi.getTasks(sessionId),
                researchApi.getExecutions(sessionId),
                researchApi.getMemory(sessionId),
            ]);
            setTasks(tasksRes.tasks);
            setExecutions(executionsRes.executions);
            setMemoryLayers(memoryRes.layers);
        } catch (err) {
            console.error('Failed to fetch session details:', err);
        }
    };

    // =============================================================================
    // Handlers
    // =============================================================================

    const handleCreateSession = async () => {
        if (!newSessionName.trim() || !newSessionTask.trim() || isCreating) return;
        setIsCreating(true);
        setError(null);

        try {
            const session = await researchApi.createSession({
                name: newSessionName,
                task: newSessionTask,
            });
            setSessions([session, ...sessions]);
            setSelectedSession(session);
            setShowCreateModal(false);
            setNewSessionName('');
            setNewSessionTask('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create session');
        } finally {
            setIsCreating(false);
        }
    };

    const handleSelectSession = async (session: ResearchSession) => {
        setSelectedSession(session);
        setTasks([]);
        setExecutions([]);
        setMemoryLayers([]);
        setExecutionLogs([]);
        setSynthesis(null);
        setActiveTab('overview');
    };

    const handleDeleteSession = async (session: ResearchSession) => {
        if (!confirm(`确定要删除 "${session.name}" 吗？`)) return;

        try {
            await researchApi.deleteSession(session.id);
            setSessions(sessions.filter((s) => s.id !== session.id));
            if (selectedSession?.id === session.id) {
                setSelectedSession(null);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete session');
        }
    };

    const handleExecuteResearch = async () => {
        if (!selectedSession || isExecuting) return;
        setIsExecuting(true);
        setExecutionLogs([]);
        setCurrentProgress(0);
        setSynthesis(null);
        setActiveTab('agents');
        setError(null);

        try {
            await researchApi.executeResearch(
                selectedSession.id,
                (event: ResearchEvent) => {
                    setExecutionLogs((prev) => [...prev, event]);

                    // Handle different event types
                    switch (event.type) {
                        case 'decomposition_complete':
                            if (event.data.tasks) {
                                setTasks(event.data.tasks);
                            }
                            break;
                        case 'task_completed':
                        case 'task_failed':
                            if (event.data.progress) {
                                setCurrentProgress(event.data.progress);
                            }
                            break;
                        case 'synthesis_complete':
                            if (event.data.synthesis) {
                                setSynthesis(event.data.synthesis);
                            }
                            setActiveTab('results');
                            break;
                        case 'session_completed':
                            fetchSessionDetails(selectedSession.id);
                            break;
                    }
                },
                (error: string) => {
                    setError(error);
                }
            );

            // Refresh session data
            const updatedSession = await researchApi.getSession(selectedSession.id);
            setSelectedSession(updatedSession);
            setSessions(sessions.map((s) => (s.id === updatedSession.id ? updatedSession : s)));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Research execution failed');
        } finally {
            setIsExecuting(false);
        }
    };

    // =============================================================================
    // Render Helpers
    // =============================================================================

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'pending':
                return <Circle className="h-4 w-4 text-gray-400" />;
            case 'running':
            case 'in_progress':
                return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
            case 'completed':
                return <CheckCircle2 className="h-4 w-4 text-green-500" />;
            case 'failed':
                return <AlertCircle className="h-4 w-4 text-red-500" />;
            default:
                return <Circle className="h-4 w-4 text-gray-400" />;
        }
    };

    // =============================================================================
    // Render
    // =============================================================================

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
        );
    }

    return (
        <div className="flex h-full">
            {/* Left Sidebar - Sessions */}
            <div className="w-72 flex-shrink-0 border-r border-gray-200 bg-white">
                <div className="border-b border-gray-200 p-4">
                    <div className="flex items-center justify-between">
                        <h2 className="font-semibold text-gray-900">研究会话</h2>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="flex items-center gap-1 rounded-lg bg-blue-500 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-blue-600"
                        >
                            <Plus className="h-3.5 w-3.5" />
                            新建
                        </button>
                    </div>
                </div>

                <div className="overflow-y-auto p-2" style={{ maxHeight: 'calc(100vh - 120px)' }}>
                    {sessions.length > 0 ? (
                        sessions.map((session) => (
                            <div
                                key={session.id}
                                onClick={() => handleSelectSession(session)}
                                className={`mb-1 cursor-pointer rounded-lg border p-3 transition-all ${
                                    selectedSession?.id === session.id
                                        ? 'border-blue-300 bg-blue-50 ring-2 ring-blue-100'
                                        : 'border-transparent hover:bg-gray-50'
                                }`}
                            >
                                <div className="flex items-start gap-3">
                                    <div className="mt-0.5">{getStatusIcon(session.status)}</div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-medium text-gray-900 truncate">
                                            {session.name}
                                        </h4>
                                        <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">
                                            {session.task}
                                        </p>
                                        <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
                                            <span className="flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                {new Date(session.created_at).toLocaleDateString()}
                                            </span>
                                            {session.total_tokens > 0 && (
                                                <span>{session.total_tokens.toLocaleString()} tokens</span>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteSession(session);
                                        }}
                                        className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="py-8 text-center text-sm text-gray-500">
                            暂无研究会话
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex flex-1 flex-col overflow-hidden">
                {selectedSession ? (
                    <>
                        {/* Header */}
                        <div className="border-b border-gray-200 bg-white px-6 py-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h1 className="text-xl font-bold text-gray-900">
                                        {selectedSession.name}
                                    </h1>
                                    <p className="text-sm text-gray-500">{selectedSession.task}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span
                                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                                            STATUS_CONFIG[selectedSession.status as keyof typeof STATUS_CONFIG]?.bg || 'bg-gray-100'
                                        } ${STATUS_CONFIG[selectedSession.status as keyof typeof STATUS_CONFIG]?.color || 'text-gray-600'}`}
                                    >
                                        {STATUS_CONFIG[selectedSession.status as keyof typeof STATUS_CONFIG]?.label || selectedSession.status}
                                    </span>
                                    <button
                                        onClick={handleExecuteResearch}
                                        disabled={isExecuting || selectedSession.status === 'completed'}
                                        className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 px-4 py-2 text-sm font-medium text-white hover:from-blue-600 hover:to-purple-600 disabled:from-gray-300 disabled:to-gray-300"
                                    >
                                        {isExecuting ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                研究中...
                                            </>
                                        ) : (
                                            <>
                                                <Play className="h-4 w-4" />
                                                {selectedSession.status === 'completed' ? '已完成' : '开始研究'}
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Tabs */}
                            <div className="mt-4 flex gap-1">
                                {[
                                    { id: 'overview' as ViewTab, label: '概览', icon: Eye },
                                    { id: 'agents' as ViewTab, label: 'Agent 协作', icon: Bot },
                                    { id: 'tasks' as ViewTab, label: '任务分解', icon: GitBranch },
                                    { id: 'memory' as ViewTab, label: '分层记忆', icon: Layers },
                                    { id: 'results' as ViewTab, label: '研究结果', icon: BarChart3 },
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                                            activeTab === tab.id
                                                ? 'bg-gray-900 text-white'
                                                : 'text-gray-600 hover:bg-gray-100'
                                        }`}
                                    >
                                        <tab.icon className="h-4 w-4" />
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Error Alert */}
                        {error && (
                            <div className="mx-6 mt-4 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                                <AlertCircle className="h-4 w-4" />
                                <span>{error}</span>
                                <button onClick={() => setError(null)} className="ml-auto">
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        )}

                        {/* Tab Content */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {activeTab === 'overview' && (
                                <OverviewTab
                                    session={selectedSession}
                                    tasks={tasks}
                                    executions={executions}
                                />
                            )}
                            {activeTab === 'agents' && (
                                <AgentsTab
                                    executions={executions}
                                    executionLogs={executionLogs}
                                    isExecuting={isExecuting}
                                    progress={currentProgress}
                                    logsEndRef={logsEndRef}
                                />
                            )}
                            {activeTab === 'tasks' && <TasksTab tasks={tasks} />}
                            {activeTab === 'memory' && (
                                <MemoryTab
                                    sessionId={selectedSession.id}
                                    layers={memoryLayers}
                                />
                            )}
                            {activeTab === 'results' && (
                                <ResultsTab
                                    synthesis={synthesis}
                                    executions={executions}
                                />
                            )}
                        </div>
                    </>
                ) : (
                    /* Empty State */
                    <div className="flex flex-1 flex-col items-center justify-center bg-gray-50">
                        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-purple-100">
                            <Brain className="h-10 w-10 text-blue-500" />
                        </div>
                        <h2 className="mb-2 text-xl font-semibold text-gray-900">开始 AI 研究</h2>
                        <p className="mb-6 text-center text-sm text-gray-500">
                            创建一个研究会话，多智能体将协同为您进行深度研究
                        </p>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="flex items-center gap-2 rounded-lg bg-blue-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-600"
                        >
                            <Plus className="h-4 w-4" />
                            创建研究会话
                        </button>
                    </div>
                )}
            </div>

            {/* Create Session Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="w-full max-w-lg rounded-xl bg-white p-6">
                        <h3 className="mb-4 text-lg font-semibold text-gray-900">创建研究会话</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">
                                    会话名称
                                </label>
                                <input
                                    type="text"
                                    value={newSessionName}
                                    onChange={(e) => setNewSessionName(e.target.value)}
                                    placeholder="例如：SSM 技术演进分析"
                                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">
                                    研究问题
                                </label>
                                <textarea
                                    value={newSessionTask}
                                    onChange={(e) => setNewSessionTask(e.target.value)}
                                    placeholder="详细描述您的研究问题，例如：分析 State Space Models 的技术演进、关键人物和未来发展方向..."
                                    rows={4}
                                    className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                                />
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
                            >
                                取消
                            </button>
                            <button
                                onClick={handleCreateSession}
                                disabled={!newSessionName.trim() || !newSessionTask.trim() || isCreating}
                                className="flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:bg-gray-300"
                            >
                                {isCreating && <Loader2 className="h-4 w-4 animate-spin" />}
                                创建
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// =============================================================================
// Tab Components
// =============================================================================

interface OverviewTabProps {
    session: ResearchSession;
    tasks: ResearchTaskItem[];
    executions: AgentExecution[];
}

function OverviewTab({ session, tasks, executions }: OverviewTabProps) {
    const completedTasks = tasks.filter((t) => t.status === 'completed').length;
    const completedExecutions = executions.filter((e) => e.status === 'completed').length;

    return (
        <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
                <StatCard label="任务总数" value={tasks.length} />
                <StatCard label="已完成任务" value={completedTasks} />
                <StatCard label="Agent 执行" value={executions.length} />
                <StatCard label="总 Tokens" value={session.total_tokens.toLocaleString()} />
            </div>

            {/* Research Question */}
            <div className="rounded-xl border border-gray-200 bg-white p-5">
                <h3 className="mb-3 font-semibold text-gray-900">研究问题</h3>
                <p className="text-gray-700">{session.task}</p>
            </div>

            {/* Progress */}
            <div className="rounded-xl border border-gray-200 bg-white p-5">
                <h3 className="mb-3 font-semibold text-gray-900">执行进度</h3>
                <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all"
                        style={{ width: `${session.progress}%` }}
                    />
                </div>
                <p className="mt-2 text-sm text-gray-500">{session.progress}% 完成</p>
            </div>

            {/* Recent Executions */}
            {executions.length > 0 && (
                <div className="rounded-xl border border-gray-200 bg-white p-5">
                    <h3 className="mb-3 font-semibold text-gray-900">最近执行</h3>
                    <div className="space-y-2">
                        {executions.slice(0, 5).map((exec) => (
                            <div
                                key={exec.id}
                                className="flex items-center gap-3 rounded-lg bg-gray-50 p-3"
                            >
                                <span className="text-xl">
                                    {AGENT_ICONS[exec.agent_type] || '🤖'}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-gray-900 truncate">
                                        {exec.agent_name}
                                    </p>
                                    <p className="text-xs text-gray-500 truncate">
                                        {exec.task_description}
                                    </p>
                                </div>
                                <span
                                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                        STATUS_CONFIG[exec.status as keyof typeof STATUS_CONFIG]?.bg || 'bg-gray-100'
                                    } ${STATUS_CONFIG[exec.status as keyof typeof STATUS_CONFIG]?.color || 'text-gray-600'}`}
                                >
                                    {STATUS_CONFIG[exec.status as keyof typeof STATUS_CONFIG]?.label || exec.status}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
    return (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-sm text-gray-500">{label}</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
        </div>
    );
}

interface AgentsTabProps {
    executions: AgentExecution[];
    executionLogs: ResearchEvent[];
    isExecuting: boolean;
    progress: number;
    logsEndRef: React.RefObject<HTMLDivElement>;
}

function AgentsTab({ executions, executionLogs, isExecuting, progress, logsEndRef }: AgentsTabProps) {
    return (
        <div className="grid grid-cols-2 gap-6">
            {/* Agent Status */}
            <div className="rounded-xl border border-gray-200 bg-white p-5">
                <h3 className="mb-4 font-semibold text-gray-900">Agent 状态</h3>
                {executions.length > 0 ? (
                    <div className="space-y-3">
                        {executions.map((exec) => (
                            <div
                                key={exec.id}
                                className={`flex items-center gap-4 rounded-lg p-3 ${
                                    exec.status === 'running'
                                        ? 'bg-blue-50'
                                        : exec.status === 'completed'
                                        ? 'bg-green-50'
                                        : exec.status === 'failed'
                                        ? 'bg-red-50'
                                        : 'bg-gray-50'
                                }`}
                            >
                                <span className="text-2xl">
                                    {AGENT_ICONS[exec.agent_type] || '🤖'}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-gray-900">{exec.agent_name}</p>
                                    <p className="text-xs text-gray-500 truncate">
                                        {exec.task_description}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <span
                                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                            STATUS_CONFIG[exec.status as keyof typeof STATUS_CONFIG]?.bg || 'bg-gray-100'
                                        } ${STATUS_CONFIG[exec.status as keyof typeof STATUS_CONFIG]?.color || 'text-gray-600'}`}
                                    >
                                        {STATUS_CONFIG[exec.status as keyof typeof STATUS_CONFIG]?.label || exec.status}
                                    </span>
                                    {exec.tokens_used > 0 && (
                                        <p className="mt-1 text-xs text-gray-400">
                                            {exec.tokens_used} tokens
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="py-8 text-center text-sm text-gray-500">
                        {isExecuting ? '正在启动 Agents...' : '点击"开始研究"启动多 Agent 协作'}
                    </div>
                )}
            </div>

            {/* Execution Logs */}
            <div className="rounded-xl border border-gray-200 bg-white p-5">
                <h3 className="mb-4 font-semibold text-gray-900">执行日志</h3>
                <div className="h-96 overflow-y-auto rounded-lg bg-gray-900 p-4 font-mono text-sm">
                    {executionLogs.length > 0 ? (
                        executionLogs.map((log, index) => (
                            <div key={index} className="mb-2">
                                <span className="text-blue-400">[{log.type}]</span>{' '}
                                <span className="text-gray-300">
                                    {log.data.message || log.data.agent_name || JSON.stringify(log.data)}
                                </span>
                            </div>
                        ))
                    ) : (
                        <div className="text-gray-500">等待执行...</div>
                    )}
                    <div ref={logsEndRef} />
                </div>
                {isExecuting && (
                    <div className="mt-3">
                        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                            <div
                                className="h-full rounded-full bg-blue-500 transition-all"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <p className="mt-1 text-xs text-gray-500">{progress}% 完成</p>
                    </div>
                )}
            </div>
        </div>
    );
}

interface TasksTabProps {
    tasks: ResearchTaskItem[];
}

function TasksTab({ tasks }: TasksTabProps) {
    // Group tasks by execution_group
    const groupedTasks = tasks.reduce(
        (acc, task) => {
            const group = task.execution_group || 0;
            if (!acc[group]) acc[group] = [];
            acc[group].push(task);
            return acc;
        },
        {} as Record<number, ResearchTaskItem[]>
    );

    return (
        <div className="space-y-6">
            {tasks.length > 0 ? (
                Object.entries(groupedTasks)
                    .sort(([a], [b]) => Number(a) - Number(b))
                    .map(([group, groupTasks]) => (
                        <div key={group} className="rounded-xl border border-gray-200 bg-white p-5">
                            <h3 className="mb-4 font-semibold text-gray-900">
                                执行阶段 {Number(group) + 1}
                            </h3>
                            <div className="space-y-3">
                                {groupTasks.map((task) => (
                                    <div
                                        key={task.id}
                                        className="flex items-start gap-4 rounded-lg border border-gray-100 p-4"
                                    >
                                        <span className="text-xl">
                                            {AGENT_ICONS[task.assigned_agent] || '🤖'}
                                        </span>
                                        <div className="flex-1">
                                            <p className="font-medium text-gray-900">{task.description}</p>
                                            <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                                                <span>分配: {task.assigned_agent}</span>
                                                <span
                                                    className={`rounded-full px-2 py-0.5 ${
                                                        task.priority === 'critical'
                                                            ? 'bg-red-100 text-red-700'
                                                            : task.priority === 'high'
                                                            ? 'bg-orange-100 text-orange-700'
                                                            : 'bg-gray-100 text-gray-600'
                                                    }`}
                                                >
                                                    {task.priority}
                                                </span>
                                            </div>
                                        </div>
                                        <span
                                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                                STATUS_CONFIG[task.status as keyof typeof STATUS_CONFIG]?.bg || 'bg-gray-100'
                                            } ${STATUS_CONFIG[task.status as keyof typeof STATUS_CONFIG]?.color || 'text-gray-600'}`}
                                        >
                                            {STATUS_CONFIG[task.status as keyof typeof STATUS_CONFIG]?.label || task.status}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
            ) : (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 py-16">
                    <GitBranch className="mb-4 h-12 w-12 text-gray-300" />
                    <p className="text-gray-500">任务将在研究开始后自动分解</p>
                </div>
            )}
        </div>
    );
}

interface MemoryTabProps {
    sessionId: string;
    layers: MemoryLayer[];
}

function MemoryTab({ sessionId, layers }: MemoryTabProps) {
    const [selectedFile, setSelectedFile] = useState<{ layer: string; path: string } | null>(null);
    const [fileContent, setFileContent] = useState<string | null>(null);
    const [isLoadingContent, setIsLoadingContent] = useState(false);

    const handleViewFile = async (layer: string, path: string) => {
        setSelectedFile({ layer, path });
        setIsLoadingContent(true);
        try {
            const res = await researchApi.getMemoryContent(sessionId, path);
            setFileContent(res.content);
        } catch {
            setFileContent('Failed to load content');
        } finally {
            setIsLoadingContent(false);
        }
    };

    const layerLabels: Record<string, { label: string; desc: string; color: string }> = {
        L0: { label: 'L0 - Raw', desc: '原始 Agent 输出', color: 'bg-gray-100' },
        L1: { label: 'L1 - Digest', desc: '处理后的摘要', color: 'bg-blue-100' },
        L2: { label: 'L2 - Insights', desc: '关键洞察', color: 'bg-purple-100' },
    };

    return (
        <div className="grid grid-cols-3 gap-6">
            {/* Layers */}
            <div className="col-span-1 space-y-4">
                {layers.length > 0 ? (
                    layers.map((layer) => (
                        <div
                            key={layer.layer}
                            className="rounded-xl border border-gray-200 bg-white p-4"
                        >
                            <div className="mb-3 flex items-center gap-2">
                                <div
                                    className={`rounded-lg px-2 py-1 text-xs font-medium ${
                                        layerLabels[layer.layer]?.color || 'bg-gray-100'
                                    }`}
                                >
                                    {layerLabels[layer.layer]?.label || layer.layer}
                                </div>
                                <span className="text-xs text-gray-500">
                                    {layerLabels[layer.layer]?.desc}
                                </span>
                            </div>
                            <div className="space-y-1">
                                {layer.files.map((file) => (
                                    <button
                                        key={file.path}
                                        onClick={() => handleViewFile(layer.layer, file.path)}
                                        className={`flex w-full items-center gap-2 rounded-lg p-2 text-left text-sm transition-colors ${
                                            selectedFile?.path === file.path
                                                ? 'bg-blue-50 text-blue-700'
                                                : 'hover:bg-gray-50'
                                        }`}
                                    >
                                        <FileText className="h-4 w-4" />
                                        <span className="flex-1 truncate">{file.name}</span>
                                    </button>
                                ))}
                                {layer.files.length === 0 && (
                                    <p className="py-2 text-xs text-gray-400">暂无文件</p>
                                )}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="rounded-xl border border-dashed border-gray-300 py-12 text-center">
                        <Layers className="mx-auto mb-3 h-8 w-8 text-gray-300" />
                        <p className="text-sm text-gray-500">记忆将在研究过程中生成</p>
                    </div>
                )}
            </div>

            {/* Content Viewer */}
            <div className="col-span-2 rounded-xl border border-gray-200 bg-white p-5">
                <h3 className="mb-4 font-semibold text-gray-900">
                    {selectedFile ? selectedFile.path.split('/').pop() : '文件内容'}
                </h3>
                {isLoadingContent ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                    </div>
                ) : fileContent ? (
                    <div className="max-h-[60vh] overflow-y-auto rounded-lg bg-gray-50 p-4">
                        <pre className="whitespace-pre-wrap text-sm text-gray-700">{fileContent}</pre>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <FileText className="mb-3 h-8 w-8 text-gray-300" />
                        <p className="text-sm text-gray-500">选择一个文件查看内容</p>
                    </div>
                )}
            </div>
        </div>
    );
}

interface ResultsTabProps {
    synthesis: string | null;
    executions: AgentExecution[];
}

function ResultsTab({ synthesis, executions }: ResultsTabProps) {
    const completedExecutions = executions.filter((e) => e.status === 'completed');

    return (
        <div className="space-y-6">
            {/* Synthesis */}
            <div className="rounded-xl border border-gray-200 bg-white p-6">
                <h3 className="mb-4 flex items-center gap-2 font-semibold text-gray-900">
                    <BarChart3 className="h-5 w-5 text-blue-500" />
                    研究综合报告
                </h3>
                {synthesis ? (
                    <div className="prose prose-sm max-w-none">
                        <div className="whitespace-pre-wrap text-gray-700">{synthesis}</div>
                    </div>
                ) : (
                    <div className="py-8 text-center text-gray-500">
                        研究报告将在完成后生成
                    </div>
                )}
            </div>

            {/* Key Findings from Agents */}
            {completedExecutions.length > 0 && (
                <div className="rounded-xl border border-gray-200 bg-white p-6">
                    <h3 className="mb-4 font-semibold text-gray-900">Agent 发现摘要</h3>
                    <div className="space-y-4">
                        {completedExecutions.map((exec) => (
                            <div key={exec.id} className="rounded-lg border border-gray-100 p-4">
                                <div className="mb-2 flex items-center gap-2">
                                    <span className="text-lg">
                                        {AGENT_ICONS[exec.agent_type] || '🤖'}
                                    </span>
                                    <span className="font-medium text-gray-900">
                                        {exec.agent_name}
                                    </span>
                                </div>
                                {exec.structured_output?.key_findings &&
                                    exec.structured_output.key_findings.length > 0 && (
                                        <ul className="ml-8 list-disc space-y-1 text-sm text-gray-600">
                                            {exec.structured_output.key_findings.map((finding, idx) => (
                                                <li key={idx}>{finding}</li>
                                            ))}
                                        </ul>
                                    )}
                                {exec.output_result && !exec.structured_output?.key_findings && (
                                    <p className="ml-8 text-sm text-gray-600 line-clamp-3">
                                        {exec.output_result}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
