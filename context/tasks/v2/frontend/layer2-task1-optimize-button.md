# Frontend Layer 2 Task 1: 实现 OptimizeButton 组件

## 任务元数据

- **任务 ID**: `frontend-v2-layer2-task1`
- **任务名称**: 实现 OptimizeButton 组件
- **所属层级**: Layer 2 - 基础组件
- **预计工时**: 2 小时
- **依赖任务**: F-L1-T1 (Zustand Store)
- **可并行任务**: F-L2-T2 (AgentProgress)

---

## 任务目标

实现"一键优化"按钮组件,触发提示词优化流程。

**核心功能**:
- 调用 `/api/optimize-prompt` API
- 根据 workspace 状态显示/禁用
- 加载状态指示
- 错误提示

---

## 实现文件

**文件路径**: `frontend/src/components/OptimizeButton.tsx`

---

## 实现步骤

### Step 1: 实现 OptimizeButton 组件

```typescript
// frontend/src/components/OptimizeButton.tsx
import React, { useState } from 'react';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { api } from '../services/api';

interface OptimizeButtonProps {
  workspaceId: string;
  videoStatus: string;
  videoUrl?: string;
}

export const OptimizeButton: React.FC<OptimizeButtonProps> = ({
  workspaceId,
  videoStatus,
  videoUrl
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { startOptimization, optimizationStates } = useWorkspaceStore();

  const optimizationState = optimizationStates[workspaceId];
  const isOptimizing = optimizationState?.isActive || false;

  /**
   * 检查是否可以开始优化
   */
  const canOptimize = (): boolean => {
    // 视频必须已完成
    if (videoStatus !== 'completed') {
      return false;
    }

    // 必须有视频 URL
    if (!videoUrl) {
      return false;
    }

    // 不能正在优化中
    if (isOptimizing) {
      return false;
    }

    return true;
  };

  /**
   * 获取禁用原因提示
   */
  const getDisabledReason = (): string => {
    if (videoStatus !== 'completed') {
      return '请先生成视频';
    }

    if (!videoUrl) {
      return '视频未就绪';
    }

    if (isOptimizing) {
      return '优化进行中...';
    }

    return '';
  };

  /**
   * 触发优化流程
   */
  const handleOptimize = async () => {
    if (!canOptimize()) {
      return;
    }

    console.log('[OptimizeButton] Starting optimization for', workspaceId);

    setIsLoading(true);
    setError(null);

    try {
      // 1. 更新本地状态
      startOptimization(workspaceId);

      // 2. 调用 API
      const response = await api.post('/optimize-prompt', {
        workspace_id: workspaceId
      });

      console.log('[OptimizeButton] API response:', response.data);

      if (!response.data.success) {
        throw new Error(response.data.error || 'Optimization failed');
      }

      console.log('[OptimizeButton] Optimization started successfully');

    } catch (err: any) {
      console.error('[OptimizeButton] Error:', err);

      const errorMessage = err.response?.data?.error || err.message || 'Failed to start optimization';
      setError(errorMessage);

      // 重置优化状态
      // (错误会通过 WebSocket 传回,这里只显示 API 错误)

    } finally {
      setIsLoading(false);
    }
  };

  const disabled = !canOptimize() || isLoading;
  const buttonText = isLoading
    ? '启动中...'
    : isOptimizing
    ? '优化中...'
    : '一键优化提示词';

  return (
    <div className="optimize-button-container">
      <button
        onClick={handleOptimize}
        disabled={disabled}
        className={`
          px-4 py-2 rounded-lg font-medium
          transition-all duration-200
          ${disabled
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
          }
          ${isLoading ? 'opacity-75' : ''}
        `}
        title={disabled ? getDisabledReason() : '使用 AI 优化视频生成参数'}
      >
        {isLoading && (
          <svg
            className="animate-spin inline-block mr-2 h-4 w-4 text-white"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {buttonText}
      </button>

      {error && (
        <div className="mt-2 text-red-600 text-sm">
          错误: {error}
        </div>
      )}

      {disabled && !isLoading && (
        <div className="mt-1 text-gray-500 text-xs">
          {getDisabledReason()}
        </div>
      )}
    </div>
  );
};
```

### Step 2: API 服务方法

```typescript
// frontend/src/services/api.ts (新增方法)

import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// ========== v2.0 新增 API ==========

/**
 * 触发提示词优化
 */
export const optimizePrompt = async (workspaceId: string) => {
  console.log('[API] Calling /api/optimize-prompt', { workspaceId });

  try {
    const response = await apiClient.post('/api/optimize-prompt', {
      workspace_id: workspaceId
    });

    console.log('[API] Response:', response.data);
    return response.data;

  } catch (error: any) {
    console.error('[API] Error:', error.response?.data || error.message);
    throw error;
  }
};

// 导出统一的 API 对象
export const api = {
  post: apiClient.post.bind(apiClient),
  get: apiClient.get.bind(apiClient),
  // ... 其他方法
  optimizePrompt
};
```

### Step 3: 单元测试

```typescript
// frontend/src/components/__tests__/OptimizeButton.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OptimizeButton } from '../OptimizeButton';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { api } from '../../services/api';

jest.mock('../../services/api');
jest.mock('../../stores/workspaceStore');

describe('OptimizeButton', () => {
  const mockStartOptimization = jest.fn();
  const mockOptimizationStates = {};

  beforeEach(() => {
    jest.clearAllMocks();

    (useWorkspaceStore as any).mockReturnValue({
      startOptimization: mockStartOptimization,
      optimizationStates: mockOptimizationStates
    });

    (api.post as jest.Mock).mockResolvedValue({
      data: {
        success: true,
        message: 'Optimization started',
        workspace_id: 'test-id'
      }
    });
  });

  it('should render button', () => {
    render(
      <OptimizeButton
        workspaceId="test-id"
        videoStatus="completed"
        videoUrl="http://localhost/test.mp4"
      />
    );

    expect(screen.getByRole('button')).toHaveTextContent('一键优化提示词');
  });

  it('should be disabled if video not completed', () => {
    render(
      <OptimizeButton
        workspaceId="test-id"
        videoStatus="pending"
        videoUrl="http://localhost/test.mp4"
      />
    );

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(screen.getByText('请先生成视频')).toBeInTheDocument();
  });

  it('should be disabled if no video URL', () => {
    render(
      <OptimizeButton
        workspaceId="test-id"
        videoStatus="completed"
        videoUrl={undefined}
      />
    );

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(screen.getByText('视频未就绪')).toBeInTheDocument();
  });

  it('should trigger optimization on click', async () => {
    render(
      <OptimizeButton
        workspaceId="test-id"
        videoStatus="completed"
        videoUrl="http://localhost/test.mp4"
      />
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockStartOptimization).toHaveBeenCalledWith('test-id');
    });

    expect(api.post).toHaveBeenCalledWith('/optimize-prompt', {
      workspace_id: 'test-id'
    });
  });

  it('should show loading state while API call in progress', async () => {
    let resolveApi: any;
    const apiPromise = new Promise((resolve) => {
      resolveApi = resolve;
    });

    (api.post as jest.Mock).mockReturnValue(apiPromise);

    render(
      <OptimizeButton
        workspaceId="test-id"
        videoStatus="completed"
        videoUrl="http://localhost/test.mp4"
      />
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(button).toHaveTextContent('启动中...');
      expect(button).toBeDisabled();
    });

    resolveApi({ data: { success: true } });
  });

  it('should show error message if API fails', async () => {
    (api.post as jest.Mock).mockRejectedValue({
      response: {
        data: {
          error: 'Workspace not found'
        }
      }
    });

    render(
      <OptimizeButton
        workspaceId="test-id"
        videoStatus="completed"
        videoUrl="http://localhost/test.mp4"
      />
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/Workspace not found/)).toBeInTheDocument();
    });
  });

  it('should be disabled when optimization is active', () => {
    (useWorkspaceStore as any).mockReturnValue({
      startOptimization: mockStartOptimization,
      optimizationStates: {
        'test-id': {
          isActive: true,
          currentStep: 'intent'
        }
      }
    });

    render(
      <OptimizeButton
        workspaceId="test-id"
        videoStatus="completed"
        videoUrl="http://localhost/test.mp4"
      />
    );

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent('优化中...');
  });
});
```

---

## 验收标准

- [ ] 按钮根据 workspace 状态正确显示/禁用
- [ ] 能成功调用 `/api/optimize-prompt` API
- [ ] 显示加载状态 (启动中...)
- [ ] 显示优化进行中状态
- [ ] 显示禁用原因提示
- [ ] 错误信息正确显示
- [ ] UI 样式符合设计
- [ ] 单元测试覆盖率 ≥ 85%
- [ ] 所有测试通过

---

## 测试命令

```bash
cd frontend
npm test -- OptimizeButton.test.tsx
```

---

## 参考文档

- `context/tasks/v2/v2-frontend-architecture.md` - OptimizeButton 设计
- `context/tasks/v2/v2-api-design.md` - API 接口
