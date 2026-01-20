# Frontend Layer 2 Task 2: 实现 AgentProgress 组件

## 任务元数据

- **任务 ID**: `frontend-v2-layer2-task2`
- **任务名称**: 实现 AgentProgress 组件
- **所属层级**: Layer 2 - 基础组件
- **预计工时**: 2 小时
- **依赖任务**: 无 (可独立完成)
- **可并行任务**: F-L2-T1 (OptimizeButton)

---

## 任务目标

实现 Agent 执行进度展示组件,实时显示优化流程的每个阶段。

**核心功能**:
- 显示进度消息列表
- 区分不同消息类型 (agent_start, agent_complete, etc.)
- 自动滚动到最新消息
- 显示时间戳

---

## 实现文件

**文件路径**: `frontend/src/components/AgentProgress.tsx`

---

## 实现步骤

### Step 1: 实现 AgentProgress 组件

```typescript
// frontend/src/components/AgentProgress.tsx
import React, { useEffect, useRef } from 'react';
import type { ProgressMessage } from '../types/workspace';

interface AgentProgressProps {
  messages: ProgressMessage[];
  isActive: boolean;
}

export const AgentProgress: React.FC<AgentProgressProps> = ({
  messages,
  isActive
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 自动滚动到最新消息
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /**
   * 获取消息图标
   */
  const getMessageIcon = (message: ProgressMessage): string => {
    switch (message.type) {
      case 'agent_start':
        return '🔄';
      case 'agent_progress':
        return '⚙️';
      case 'agent_complete':
        return '✅';
      case 'error':
        return '❌';
      case 'human_loop':
        return '👤';
      default:
        return '📝';
    }
  };

  /**
   * 获取消息颜色类
   */
  const getMessageColor = (message: ProgressMessage): string => {
    switch (message.type) {
      case 'agent_start':
        return 'text-blue-600';
      case 'agent_progress':
        return 'text-gray-600';
      case 'agent_complete':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      case 'human_loop':
        return 'text-purple-600';
      default:
        return 'text-gray-600';
    }
  };

  /**
   * 格式化时间
   */
  const formatTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  /**
   * 获取 Agent 名称的中文显示
   */
  const getAgentDisplayName = (agent?: string): string => {
    switch (agent) {
      case 'intent_analysis':
        return '意图分析';
      case 'video_analysis':
        return '视频分析';
      case 'master_agent':
        return '决策引擎';
      default:
        return agent || '';
    }
  };

  if (messages.length === 0 && !isActive) {
    return null;
  }

  return (
    <div className="agent-progress bg-gray-50 rounded-lg p-4 mt-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">
          AI 优化进度
        </h3>
        {isActive && (
          <div className="flex items-center gap-2">
            <div className="animate-pulse flex space-x-1">
              <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
              <div className="h-2 w-2 bg-blue-500 rounded-full animation-delay-200"></div>
              <div className="h-2 w-2 bg-blue-500 rounded-full animation-delay-400"></div>
            </div>
            <span className="text-xs text-blue-600">运行中</span>
          </div>
        )}
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {messages.map((message, index) => (
          <div
            key={`${message.timestamp}-${index}`}
            className={`
              flex items-start gap-2 p-2 rounded
              transition-all duration-200
              hover:bg-white
              ${getMessageColor(message)}
            `}
          >
            <span className="text-lg flex-shrink-0">
              {getMessageIcon(message)}
            </span>

            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                {message.agent && (
                  <span className="text-xs font-medium bg-gray-200 px-1.5 py-0.5 rounded">
                    {getAgentDisplayName(message.agent)}
                  </span>
                )}
                <span className="text-xs text-gray-400">
                  {formatTime(message.timestamp)}
                </span>
              </div>

              <p className="text-sm mt-1 break-words">
                {message.message}
              </p>
            </div>
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {messages.length > 5 && (
        <div className="mt-2 text-xs text-gray-400 text-center">
          共 {messages.length} 条消息
        </div>
      )}
    </div>
  );
};
```

### Step 2: 添加动画样式

```css
/* frontend/src/App.css (新增) */

/* Agent Progress 动画延迟 */
.animation-delay-200 {
  animation-delay: 0.2s;
}

.animation-delay-400 {
  animation-delay: 0.4s;
}

/* 平滑滚动 */
.agent-progress {
  scroll-behavior: smooth;
}

/* 消息淡入动画 */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.agent-progress > div > div {
  animation: fadeIn 0.3s ease-out;
}

/* 自定义滚动条 */
.agent-progress > div::-webkit-scrollbar {
  width: 6px;
}

.agent-progress > div::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.agent-progress > div::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 3px;
}

.agent-progress > div::-webkit-scrollbar-thumb:hover {
  background: #555;
}
```

### Step 3: 使用示例

```typescript
// frontend/src/components/Workspace.tsx (使用示例)

import React from 'react';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { AgentProgress } from './AgentProgress';
import { OptimizeButton } from './OptimizeButton';

interface WorkspaceProps {
  workspaceId: string;
}

export const Workspace: React.FC<WorkspaceProps> = ({ workspaceId }) => {
  const { workspaces, optimizationStates } = useWorkspaceStore();

  const workspace = workspaces.find(w => w._id === workspaceId);
  const optimizationState = optimizationStates[workspaceId];

  if (!workspace) {
    return null;
  }

  return (
    <div className="workspace p-4 border rounded-lg">
      {/* ... 现有内容 ... */}

      {/* v2.0: 优化按钮 */}
      <OptimizeButton
        workspaceId={workspaceId}
        videoStatus={workspace.video?.status || 'pending'}
        videoUrl={workspace.video?.url}
      />

      {/* v2.0: Agent 进度展示 */}
      {optimizationState && (
        <AgentProgress
          messages={optimizationState.progressMessages}
          isActive={optimizationState.isActive}
        />
      )}
    </div>
  );
};
```

### Step 4: 单元测试

```typescript
// frontend/src/components/__tests__/AgentProgress.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { AgentProgress } from '../AgentProgress';
import type { ProgressMessage } from '../../types/workspace';

describe('AgentProgress', () => {
  const mockMessages: ProgressMessage[] = [
    {
      type: 'agent_start',
      agent: 'intent_analysis',
      message: '开始分析用户意图...',
      timestamp: '2025-01-15T10:00:00Z'
    },
    {
      type: 'agent_complete',
      agent: 'intent_analysis',
      message: '用户意图分析完成',
      timestamp: '2025-01-15T10:00:05Z'
    },
    {
      type: 'human_loop',
      message: '请确认意图分析是否正确',
      timestamp: '2025-01-15T10:00:06Z'
    }
  ];

  it('should render nothing if no messages and not active', () => {
    const { container } = render(
      <AgentProgress messages={[]} isActive={false} />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should render messages', () => {
    render(
      <AgentProgress messages={mockMessages} isActive={false} />
    );

    expect(screen.getByText('AI 优化进度')).toBeInTheDocument();
    expect(screen.getByText('开始分析用户意图...')).toBeInTheDocument();
    expect(screen.getByText('用户意图分析完成')).toBeInTheDocument();
    expect(screen.getByText('请确认意图分析是否正确')).toBeInTheDocument();
  });

  it('should show agent names in Chinese', () => {
    render(
      <AgentProgress messages={mockMessages} isActive={false} />
    );

    expect(screen.getAllByText('意图分析')).toHaveLength(2);
  });

  it('should show running indicator when active', () => {
    render(
      <AgentProgress messages={mockMessages} isActive={true} />
    );

    expect(screen.getByText('运行中')).toBeInTheDocument();
  });

  it('should display message count', () => {
    const manyMessages: ProgressMessage[] = Array.from({ length: 10 }, (_, i) => ({
      type: 'agent_progress',
      message: `Message ${i + 1}`,
      timestamp: new Date().toISOString()
    }));

    render(
      <AgentProgress messages={manyMessages} isActive={false} />
    );

    expect(screen.getByText('共 10 条消息')).toBeInTheDocument();
  });

  it('should format timestamps correctly', () => {
    render(
      <AgentProgress messages={mockMessages} isActive={false} />
    );

    // 验证时间格式 (HH:MM:SS)
    const timeElements = screen.getAllByText(/\d{2}:\d{2}:\d{2}/);
    expect(timeElements.length).toBeGreaterThan(0);
  });

  it('should apply correct colors for different message types', () => {
    render(
      <AgentProgress messages={mockMessages} isActive={false} />
    );

    const container = screen.getByText('开始分析用户意图...').closest('div');
    expect(container).toHaveClass('text-blue-600');

    const completeContainer = screen.getByText('用户意图分析完成').closest('div');
    expect(completeContainer).toHaveClass('text-green-600');

    const humanLoopContainer = screen.getByText('请确认意图分析是否正确').closest('div');
    expect(humanLoopContainer).toHaveClass('text-purple-600');
  });

  it('should show correct icons for message types', () => {
    render(
      <AgentProgress messages={mockMessages} isActive={false} />
    );

    // 验证 emoji 图标存在
    expect(screen.getByText('🔄')).toBeInTheDocument(); // agent_start
    expect(screen.getByText('✅')).toBeInTheDocument(); // agent_complete
    expect(screen.getByText('👤')).toBeInTheDocument(); // human_loop
  });
});
```

---

## 验收标准

- [ ] 正确显示所有进度消息
- [ ] 区分不同消息类型并显示对应图标和颜色
- [ ] Agent 名称正确显示为中文
- [ ] 时间戳格式化正确 (HH:MM:SS)
- [ ] 自动滚动到最新消息
- [ ] 显示运行中指示器
- [ ] 显示消息总数
- [ ] UI 样式符合设计
- [ ] 单元测试覆盖率 ≥ 85%
- [ ] 所有测试通过

---

## 测试命令

```bash
cd frontend
npm test -- AgentProgress.test.tsx
```

---

## 参考文档

- `context/tasks/v2/v2-frontend-architecture.md` - AgentProgress 设计
- `context/tasks/v2/v2-websocket-protocol.md` - 消息类型定义
