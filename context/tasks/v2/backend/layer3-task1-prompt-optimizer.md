# Backend Layer 3 Task 1: 实现 Prompt Optimizer 主流程

## 任务元数据

- **任务 ID**: `backend-v2-layer3-task1`
- **任务名称**: 实现 Prompt Optimizer 主流程
- **所属层级**: Layer 3 - Agent 系统主入口
- **预计工时**: 6 小时
- **依赖任务**: B-L2-T3 (Master Agent)
- **可并行任务**: 无 (Layer 3 单任务)

---

## 任务目标

实现提示词优化器主流程,协调整个 Agent 系统的执行,包括分阶段执行、WebSocket 推送、数据库保存。

**核心功能**:
- 分阶段执行 Agent (Intent → Human-in-the-Loop → Video → Master)
- WebSocket 实时进度推送
- Human-in-the-Loop 异步等待
- 优化结果保存到 MongoDB
- 完整的错误处理和日志

---

## 实现文件

**文件路径**: `backend/src/services/prompt-optimizer.js`

---

## 实现步骤

### Step 1: 定义核心流程函数

```javascript
// backend/src/services/prompt-optimizer.js
const logger = require('../utils/logger');
const { executeIntentAnalysis } = require('./agents/intent-agent');
const { executeVideoAnalysis } = require('./agents/video-agent');
const { executeMasterAgentDecision } = require('./agents/master-agent');
const { Workspace } = require('../db/mongodb');

/**
 * Human-in-the-Loop Promise Resolver
 * 存储待确认的 Promise resolve 函数
 */
const pendingConfirmations = new Map();

/**
 * 主流程: 执行提示词优化
 * @param {string} workspaceId - MongoDB workspace ID
 * @param {function} wsBroadcast - WebSocket broadcast function
 * @returns {Promise<object>} 优化结果
 */
async function optimizePrompt(workspaceId, wsBroadcast) {
  logger.info('Starting prompt optimization', { workspaceId });

  try {
    // 1. 获取 workspace
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      throw new Error(`Workspace not found: ${workspaceId}`);
    }

    // 验证前置条件
    validateWorkspace(workspace);

    // ==================== Phase 1: Intent Analysis ====================
    logger.info('Phase 1: Intent Analysis started', { workspaceId });

    wsBroadcast(workspaceId, {
      type: 'agent_start',
      agent: 'intent_analysis',
      message: '开始分析用户意图...'
    });

    const intentReport = await executeIntentAnalysis(workspace);

    logger.info('Intent analysis completed', {
      workspaceId,
      confidence: intentReport.confidence
    });

    wsBroadcast(workspaceId, {
      type: 'agent_complete',
      agent: 'intent_analysis',
      message: '用户意图分析完成'
    });

    wsBroadcast(workspaceId, {
      type: 'intent_report',
      data: intentReport
    });

    // ==================== Phase 2: Human-in-the-Loop ====================
    logger.info('Phase 2: Waiting for human confirmation', { workspaceId });

    wsBroadcast(workspaceId, {
      type: 'human_loop_pending',
      message: '请确认意图分析是否正确'
    });

    // 等待用户确认 (异步)
    const userConfirmed = await waitForHumanConfirmation(workspaceId, 300000); // 5分钟超时

    if (!userConfirmed) {
      logger.warn('User rejected intent or timeout', { workspaceId });
      throw new Error('User did not confirm intent analysis');
    }

    logger.info('Human confirmation received', { workspaceId });

    // ==================== Phase 3: Video Analysis ====================
    logger.info('Phase 3: Video Analysis started', { workspaceId });

    wsBroadcast(workspaceId, {
      type: 'agent_start',
      agent: 'video_analysis',
      message: '开始分析视频质量...'
    });

    // 刷新 workspace (可能有视频 URL 更新)
    const refreshedWorkspace = await Workspace.findById(workspaceId);

    const videoAnalysis = await executeVideoAnalysis(refreshedWorkspace, intentReport);

    logger.info('Video analysis completed', {
      workspaceId,
      contentMatchScore: videoAnalysis.content_match_score,
      issueCount: videoAnalysis.issues?.length || 0
    });

    wsBroadcast(workspaceId, {
      type: 'agent_complete',
      agent: 'video_analysis',
      message: '视频质量分析完成'
    });

    wsBroadcast(workspaceId, {
      type: 'video_analysis',
      data: videoAnalysis
    });

    // ==================== Phase 4: Master Agent Decision ====================
    logger.info('Phase 4: Master Agent decision started', { workspaceId });

    wsBroadcast(workspaceId, {
      type: 'agent_start',
      agent: 'master_agent',
      message: '正在生成优化建议...'
    });

    const optimizationResult = await executeMasterAgentDecision(
      refreshedWorkspace,
      intentReport,
      videoAnalysis
    );

    logger.info('Master Agent decision completed', {
      workspaceId,
      changeCount: optimizationResult.changes?.length || 0,
      confidence: optimizationResult.confidence
    });

    wsBroadcast(workspaceId, {
      type: 'agent_complete',
      agent: 'master_agent',
      message: '优化建议生成完成'
    });

    // ==================== Phase 5: Save to Database ====================
    logger.info('Phase 5: Saving optimization result to database', { workspaceId });

    const savedResult = await saveOptimizationResult(
      workspaceId,
      intentReport,
      videoAnalysis,
      optimizationResult
    );

    logger.info('Optimization result saved', {
      workspaceId,
      optimizationId: savedResult._id
    });

    // 推送最终结果
    wsBroadcast(workspaceId, {
      type: 'optimization_result',
      data: {
        ng_reasons: optimizationResult.ng_reasons,
        optimized_params: optimizationResult.optimized_params,
        changes: optimizationResult.changes,
        confidence: optimizationResult.confidence
      }
    });

    logger.info('Prompt optimization completed successfully', {
      workspaceId,
      totalDuration: Date.now() - (workspace.created_at || Date.now())
    });

    return {
      success: true,
      intentReport,
      videoAnalysis,
      optimizationResult
    };

  } catch (error) {
    logger.error('Prompt optimization failed', {
      workspaceId,
      error: error.message,
      stack: error.stack
    });

    wsBroadcast(workspaceId, {
      type: 'optimization_error',
      error: error.message
    });

    throw error;
  }
}
```

### Step 2: 实现辅助函数

```javascript
/**
 * 验证 Workspace 前置条件
 */
function validateWorkspace(workspace) {
  if (!workspace.image_url) {
    throw new Error('Workspace must have an image_url');
  }

  if (!workspace.video || workspace.video.status !== 'completed') {
    throw new Error('Workspace must have a completed video');
  }

  if (!workspace.video.url) {
    throw new Error('Workspace video must have a URL');
  }

  if (!workspace.form_data) {
    throw new Error('Workspace must have form_data');
  }

  logger.debug('Workspace validation passed', {
    workspaceId: workspace._id.toString(),
    hasImage: !!workspace.image_url,
    videoStatus: workspace.video.status
  });
}

/**
 * Human-in-the-Loop: 等待用户确认
 * @param {string} workspaceId - Workspace ID
 * @param {number} timeout - 超时时间 (毫秒)
 * @returns {Promise<boolean>} 用户是否确认
 */
function waitForHumanConfirmation(workspaceId, timeout = 300000) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      pendingConfirmations.delete(workspaceId);
      logger.warn('Human confirmation timeout', { workspaceId, timeout });
      resolve(false); // 超时返回 false
    }, timeout);

    // 存储 resolve 函数
    pendingConfirmations.set(workspaceId, {
      resolve: (confirmed) => {
        clearTimeout(timeoutId);
        pendingConfirmations.delete(workspaceId);
        resolve(confirmed);
      },
      timeoutId
    });

    logger.debug('Waiting for human confirmation', {
      workspaceId,
      timeout
    });
  });
}

/**
 * 处理用户确认 (从 WebSocket 调用)
 * @param {string} workspaceId - Workspace ID
 * @param {boolean} confirmed - 用户是否确认
 */
function handleHumanConfirmation(workspaceId, confirmed) {
  logger.info('Human confirmation received', { workspaceId, confirmed });

  const pending = pendingConfirmations.get(workspaceId);

  if (!pending) {
    logger.warn('No pending confirmation found', { workspaceId });
    return false;
  }

  pending.resolve(confirmed);
  return true;
}

/**
 * 保存优化结果到数据库
 */
async function saveOptimizationResult(
  workspaceId,
  intentReport,
  videoAnalysis,
  optimizationResult
) {
  logger.info('Saving optimization result to database', { workspaceId });

  const optimizationRecord = {
    timestamp: new Date(),
    intent_report: intentReport,
    video_analysis: videoAnalysis,
    optimization_result: optimizationResult
  };

  const workspace = await Workspace.findByIdAndUpdate(
    workspaceId,
    {
      $push: {
        optimization_history: optimizationRecord
      }
    },
    { new: true }
  );

  if (!workspace) {
    throw new Error(`Failed to save optimization result: workspace ${workspaceId} not found`);
  }

  logger.info('Optimization result saved successfully', {
    workspaceId,
    historyLength: workspace.optimization_history?.length || 0
  });

  return optimizationRecord;
}

module.exports = {
  optimizePrompt,
  waitForHumanConfirmation,
  handleHumanConfirmation,
  saveOptimizationResult
};
```

### Step 3: 单元测试

```javascript
// backend/src/services/__tests__/prompt-optimizer.test.js
const {
  optimizePrompt,
  handleHumanConfirmation,
  saveOptimizationResult
} = require('../prompt-optimizer');
const { executeIntentAnalysis } = require('../agents/intent-agent');
const { executeVideoAnalysis } = require('../agents/video-agent');
const { executeMasterAgentDecision } = require('../agents/master-agent');
const { Workspace } = require('../../db/mongodb');

jest.mock('../agents/intent-agent');
jest.mock('../agents/video-agent');
jest.mock('../agents/master-agent');
jest.mock('../../db/mongodb');
jest.mock('../../utils/logger');

describe('Prompt Optimizer', () => {
  const mockWorkspace = {
    _id: 'test-id',
    image_url: 'http://localhost/test.jpg',
    video: {
      status: 'completed',
      url: 'http://localhost/test-video.mp4'
    },
    form_data: {
      motion_intensity: 3,
      lighting: 'natural'
    },
    optimization_history: []
  };

  const mockIntentReport = {
    user_intent: {
      scene_description: 'Test scene',
      desired_mood: 'calm',
      key_elements: ['person'],
      motion_expectation: 'slow'
    },
    confidence: 0.85
  };

  const mockVideoAnalysis = {
    content_match_score: 0.70,
    issues: [
      {
        category: 'motion',
        description: 'Too fast',
        severity: 'high'
      }
    ],
    technical_quality: {
      clarity_score: 0.85,
      fluency_score: 0.75
    },
    overall_assessment: 'Reduce motion'
  };

  const mockOptimizationResult = {
    ng_reasons: ['Motion too fast'],
    optimized_params: { motion_intensity: 2 },
    changes: [
      {
        field: 'motion_intensity',
        old_value: 3,
        new_value: 2,
        reason: 'Reduce speed'
      }
    ],
    confidence: 0.85
  };

  let wsBroadcastMock;

  beforeEach(() => {
    jest.clearAllMocks();
    wsBroadcastMock = jest.fn();

    Workspace.findById = jest.fn().mockResolvedValue(mockWorkspace);
    Workspace.findByIdAndUpdate = jest.fn().mockResolvedValue({
      ...mockWorkspace,
      optimization_history: [{ timestamp: new Date() }]
    });

    executeIntentAnalysis.mockResolvedValue(mockIntentReport);
    executeVideoAnalysis.mockResolvedValue(mockVideoAnalysis);
    executeMasterAgentDecision.mockResolvedValue(mockOptimizationResult);
  });

  it('should execute complete optimization flow', async () => {
    // 模拟用户确认
    setTimeout(() => {
      handleHumanConfirmation('test-id', true);
    }, 100);

    const result = await optimizePrompt('test-id', wsBroadcastMock);

    expect(result.success).toBe(true);
    expect(result.intentReport).toEqual(mockIntentReport);
    expect(result.videoAnalysis).toEqual(mockVideoAnalysis);
    expect(result.optimizationResult).toEqual(mockOptimizationResult);

    // 验证所有 agent 被调用
    expect(executeIntentAnalysis).toHaveBeenCalledWith(mockWorkspace);
    expect(executeVideoAnalysis).toHaveBeenCalledWith(mockWorkspace, mockIntentReport);
    expect(executeMasterAgentDecision).toHaveBeenCalledWith(
      mockWorkspace,
      mockIntentReport,
      mockVideoAnalysis
    );

    // 验证 WebSocket 推送
    expect(wsBroadcastMock).toHaveBeenCalledWith(
      'test-id',
      expect.objectContaining({ type: 'agent_start', agent: 'intent_analysis' })
    );
    expect(wsBroadcastMock).toHaveBeenCalledWith(
      'test-id',
      expect.objectContaining({ type: 'intent_report' })
    );
    expect(wsBroadcastMock).toHaveBeenCalledWith(
      'test-id',
      expect.objectContaining({ type: 'human_loop_pending' })
    );
    expect(wsBroadcastMock).toHaveBeenCalledWith(
      'test-id',
      expect.objectContaining({ type: 'optimization_result' })
    );
  });

  it('should throw error if workspace not found', async () => {
    Workspace.findById.mockResolvedValue(null);

    await expect(
      optimizePrompt('invalid-id', wsBroadcastMock)
    ).rejects.toThrow('Workspace not found');
  });

  it('should throw error if video not completed', async () => {
    Workspace.findById.mockResolvedValue({
      ...mockWorkspace,
      video: { status: 'pending' }
    });

    await expect(
      optimizePrompt('test-id', wsBroadcastMock)
    ).rejects.toThrow('must have a completed video');
  });

  it('should handle user rejection', async () => {
    setTimeout(() => {
      handleHumanConfirmation('test-id', false);
    }, 100);

    await expect(
      optimizePrompt('test-id', wsBroadcastMock)
    ).rejects.toThrow('User did not confirm');
  });

  it('should save optimization result to database', async () => {
    const result = await saveOptimizationResult(
      'test-id',
      mockIntentReport,
      mockVideoAnalysis,
      mockOptimizationResult
    );

    expect(Workspace.findByIdAndUpdate).toHaveBeenCalledWith(
      'test-id',
      expect.objectContaining({
        $push: expect.objectContaining({
          optimization_history: expect.any(Object)
        })
      }),
      { new: true }
    );

    expect(result.intent_report).toEqual(mockIntentReport);
  });

  it('should broadcast error on failure', async () => {
    executeIntentAnalysis.mockRejectedValue(new Error('Intent analysis failed'));

    await expect(
      optimizePrompt('test-id', wsBroadcastMock)
    ).rejects.toThrow('Intent analysis failed');

    expect(wsBroadcastMock).toHaveBeenCalledWith(
      'test-id',
      expect.objectContaining({
        type: 'optimization_error',
        error: expect.stringContaining('Intent analysis failed')
      })
    );
  });
});
```

---

## 验收标准

- [ ] 完整的 5 阶段流程 (Intent → Human-Loop → Video → Master → Save)
- [ ] Human-in-the-Loop 异步等待机制正常工作
- [ ] 每个阶段都有 WebSocket 进度推送
- [ ] 优化结果正确保存到 `optimization_history`
- [ ] 所有错误情况都有适当的日志和 WebSocket 通知
- [ ] 用户拒绝或超时时流程正确中断
- [ ] 单元测试覆盖率 ≥ 85%
- [ ] 所有测试通过

---

## 测试命令

```bash
cd backend
npm test -- prompt-optimizer.test.js
```

---

## 参考文档

- `context/tasks/v2/v2-backend-architecture.md` - Prompt Optimizer 主流程
- `context/tasks/v2/v2-architecture-overview.md` - 整体工作流程
- `context/tasks/v2/v2-websocket-protocol.md` - WebSocket 消息类型
