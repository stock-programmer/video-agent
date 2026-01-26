# v2.0 流式Agent分析过程设计文档

## 📋 需求概述

**目标**：将后端multi-agent系统的详细分析过程**实时流式传输**到前端，让用户看到每个agent的具体工作步骤和决策逻辑。

**当前问题**：
- ✅ 已有粗略进度消息（agent_start, agent_complete）
- ❌ 缺少详细的分析步骤（中间思考过程、决策依据等）
- ❌ 用户无法了解AI系统的工作原理和决策逻辑

**期望效果**：
用户点击"一键优化提示词"后，前端实时展示：
1. **意图分析**：视觉分析 → 参数解读 → 运动意图推断 → 情绪推断 → 矛盾检查 → 分析报告
2. **视频分析**（如有视频）：视频质量评估 → 内容匹配度 → 运动分析 → 问题诊断 → NG原因总结
3. **决策引擎**：综合意图和视频分析 → 确定优化策略 → 参数变更推荐 → 置信度评估

---

## 🎯 WebSocket流式消息协议设计

### 1. 消息类型分类

#### **1.1 Agent生命周期消息**（已有，保持不变）
```typescript
{
  type: 'agent_start',
  workspace_id: string,
  agent: 'intent_analysis' | 'video_analysis' | 'master',
  message: string,
  timestamp: string
}

{
  type: 'agent_complete',
  workspace_id: string,
  agent: 'intent_analysis' | 'video_analysis' | 'master',
  message: string,
  timestamp: string
}
```

#### **1.2 分析步骤消息**（新增 - 核心功能）
```typescript
{
  type: 'agent_step',  // 新消息类型
  workspace_id: string,
  agent: 'intent_analysis' | 'video_analysis' | 'master',
  step: {
    phase: string,           // 步骤阶段名称（例如：'visual_analysis'）
    title: string,           // 步骤标题（中文展示）
    description: string,     // 步骤详细说明
    status: 'running' | 'completed',
    result?: any            // 步骤结果（可选，完成时提供）
  },
  timestamp: string
}
```

**示例**：
```json
// Intent Analysis - 视觉分析步骤
{
  "type": "agent_step",
  "workspace_id": "64a1b2c3d4e5f6789012345",
  "agent": "intent_analysis",
  "step": {
    "phase": "visual_analysis",
    "title": "视觉分析",
    "description": "正在分析图片内容：场景、主体、构图、情绪...",
    "status": "running"
  },
  "timestamp": "2026-01-26T10:30:15.123Z"
}

// Intent Analysis - 视觉分析完成
{
  "type": "agent_step",
  "workspace_id": "64a1b2c3d4e5f6789012345",
  "agent": "intent_analysis",
  "step": {
    "phase": "visual_analysis",
    "title": "视觉分析",
    "description": "图片分析完成",
    "status": "completed",
    "result": {
      "scene": "一个人站在公园里，背景有树木和自然光线",
      "subjects": ["人物"],
      "composition": "中景构图，主体居中",
      "mood": "平静、放松"
    }
  },
  "timestamp": "2026-01-26T10:30:18.456Z"
}
```

#### **1.3 思考过程消息**（新增）
```typescript
{
  type: 'agent_thought',  // 新消息类型
  workspace_id: string,
  agent: string,
  thought: string,        // 思考内容（简短的一句话）
  timestamp: string
}
```

**示例**：
```json
{
  "type": "agent_thought",
  "workspace_id": "64a1b2c3d4e5f6789012345",
  "agent": "master",
  "thought": "用户选择了'push_forward'运镜，但motion_intensity只有2，可能会显得运动不流畅",
  "timestamp": "2026-01-26T10:30:20.789Z"
}
```

#### **1.4 中间结果消息**（已有，扩展）
```typescript
// 意图报告（已有，保持不变）
{
  type: 'intent_report',
  workspace_id: string,
  data: {
    user_intent: { ... },
    parameter_analysis: { ... },
    confidence: number
  }
}

// 视频分析报告（已有，保持不变）
{
  type: 'video_analysis',
  workspace_id: string,
  data: {
    visual_quality_score: number,
    content_match_score: number,
    motion_analysis: { ... },
    ng_reasons: string[]
  }
}
```

---

## 🏗️ 实现方案

### 2. 后端改造

#### 2.1 Agent改造 - 添加流式发送能力

**核心思路**：每个agent执行时，主动发送分析步骤消息

**改造文件**：
- `backend/src/services/agents/intent-agent.js`
- `backend/src/services/agents/video-agent.js`
- `backend/src/services/agents/master-agent.js`

**改造模式**：
```javascript
// 原代码（intent-agent.js）
export async function executeIntentAnalysis(workspace) {
  logger.info('Executing intent analysis', { workspaceId: workspace._id });

  const prompt = buildIntentAnalysisInput(workspace);
  const qwen = new QwenWithTools();
  const response = await qwen.chat(prompt);
  const intentReport = parseIntentReport(response);

  return intentReport;
}

// 改造后（添加流式广播）
export async function executeIntentAnalysis(workspace, wsBroadcast) {
  const workspaceId = workspace._id.toString();

  logger.info('Executing intent analysis', { workspaceId });

  // 步骤1：视觉分析
  wsBroadcast(workspaceId, {
    type: 'agent_step',
    agent: 'intent_analysis',
    step: {
      phase: 'visual_analysis',
      title: '视觉分析',
      description: '正在分析图片内容：场景、主体、构图、情绪...',
      status: 'running'
    }
  });

  const prompt = buildIntentAnalysisInput(workspace);
  const qwen = new QwenWithTools();

  // 步骤2：调用LLM推理
  wsBroadcast(workspaceId, {
    type: 'agent_step',
    agent: 'intent_analysis',
    step: {
      phase: 'llm_inference',
      title: 'LLM推理',
      description: '正在调用Qwen模型进行意图分析...',
      status: 'running'
    }
  });

  const response = await qwen.chat(prompt);

  // 步骤3：解析结果
  wsBroadcast(workspaceId, {
    type: 'agent_step',
    agent: 'intent_analysis',
    step: {
      phase: 'parse_result',
      title: '解析结果',
      description: '正在解析意图分析报告...',
      status: 'running'
    }
  });

  const intentReport = parseIntentReport(response);

  // 步骤4：完成
  wsBroadcast(workspaceId, {
    type: 'agent_step',
    agent: 'intent_analysis',
    step: {
      phase: 'visual_analysis',
      title: '视觉分析',
      description: '分析完成',
      status: 'completed',
      result: {
        scene: intentReport.user_intent.scene_description,
        mood: intentReport.user_intent.desired_mood
      }
    }
  });

  return intentReport;
}
```

#### 2.2 prompt-optimizer改造

**文件**：`backend/src/services/prompt-optimizer.js`

**改造点**：将 `wsBroadcast` 函数传递给每个agent

```javascript
// 改造前
const intentReport = await executeIntentAnalysis(workspace);

// 改造后
const intentReport = await executeIntentAnalysis(workspace, wsBroadcast);
```

#### 2.3 分析步骤定义

**Intent Analysis Agent步骤**：
1. `visual_analysis` - 视觉分析（场景、主体、构图、情绪）
2. `parameter_interpretation` - 参数解读（分析用户选择的参数）
3. `motion_inference` - 运动意图推断（期望的运动风格）
4. `mood_inference` - 情绪推断（情感基调）
5. `contradiction_check` - 矛盾检查（参数与图片的一致性）
6. `llm_inference` - LLM推理（调用Qwen模型）
7. `parse_result` - 解析结果（提取JSON报告）

**Video Analysis Agent步骤**：
1. `fetch_video` - 获取视频（下载或访问视频URL）
2. `quality_assessment` - 质量评估（分辨率、清晰度、流畅度）
3. `content_matching` - 内容匹配（视频与图片的一致性）
4. `motion_analysis` - 运动分析（实际运动效果评估）
5. `problem_diagnosis` - 问题诊断（找出不符合预期的地方）
6. `ng_summary` - NG原因总结（生成改进建议）

**Master Agent步骤**：
1. `data_integration` - 数据整合（合并意图和视频分析）
2. `strategy_decision` - 策略决策（确定优化方向）
3. `parameter_optimization` - 参数优化（生成具体变更）
4. `confidence_evaluation` - 置信度评估（评估优化质量）
5. `generate_result` - 生成结果（输出最终优化方案）

---

### 3. 前端改造

#### 3.1 WebSocket客户端 - 添加新消息类型处理

**文件**：`frontend/src/services/websocket.ts`

**改造**：添加 `agent_step` 和 `agent_thought` 消息处理

```typescript
// 在 handleMessage() 中添加
case 'agent_step':
  console.log('[WS] Agent step:', message.step.title);
  if (store.optimizationStates[workspaceId]) {
    store.addAnalysisStep(workspaceId, {
      agent: message.agent,
      step: message.step,
      timestamp: message.timestamp
    });
  }
  break;

case 'agent_thought':
  console.log('[WS] Agent thought:', message.thought);
  if (store.optimizationStates[workspaceId]) {
    store.addThought(workspaceId, message.thought);
  }
  break;
```

#### 3.2 Zustand Store - 添加分析步骤状态管理

**文件**：`frontend/src/stores/workspaceStore.ts`

**新增状态**：
```typescript
interface OptimizationState {
  isActive: boolean;
  error: string | null;

  // 已有
  progressMessages: ProgressMessage[];
  intentReport: IntentReport | null;
  videoAnalysis: VideoAnalysis | null;
  finalResult: OptimizationResult | null;

  // 新增：分析步骤
  analysisSteps: AnalysisStep[];  // 详细的分析步骤列表
  thoughts: string[];              // AI思考过程
}

interface AnalysisStep {
  agent: string;
  phase: string;
  title: string;
  description: string;
  status: 'running' | 'completed';
  result?: any;
  timestamp: string;
}
```

**新增Actions**：
```typescript
addAnalysisStep: (workspaceId: string, step: AnalysisStep) => void;
addThought: (workspaceId: string, thought: string) => void;
```

#### 3.3 创建分析过程展示组件

**新文件**：`frontend/src/components/AnalysisProgressPanel.tsx`

**功能**：
- 分阶段展示agent的工作流程
- 显示每个步骤的状态（运行中/已完成）
- 展示步骤结果（折叠/展开）
- 显示AI思考过程（类似ChatGPT的thinking）

**UI设计**：
```
┌─────────────────────────────────────────────┐
│  🔍 AI 分析过程                              │
├─────────────────────────────────────────────┤
│  ┌─ 意图分析 Agent ─────────────────────┐   │
│  │  ✓ 视觉分析 - 图片分析完成            │   │
│  │    └─ 场景：公园，主体：人物          │   │
│  │  ⏳ LLM推理 - 正在分析...            │   │
│  │  ⏸  参数解读 - 等待中...             │   │
│  └──────────────────────────────────────┘   │
│                                              │
│  💭 AI 思考：用户选择了push_forward运镜...   │
└─────────────────────────────────────────────┘
```

**组件结构**：
```tsx
export const AnalysisProgressPanel: React.FC<{
  workspaceId: string;
}> = ({ workspaceId }) => {
  const { analysisSteps, thoughts } = useWorkspaceStore(
    state => state.optimizationStates[workspaceId] || {}
  );

  // 按agent分组步骤
  const stepsByAgent = groupBy(analysisSteps, 'agent');

  return (
    <div className="analysis-progress-panel">
      <h3>🔍 AI 分析过程</h3>

      {/* Intent Analysis */}
      {stepsByAgent['intent_analysis'] && (
        <AgentStepsSection
          agentName="意图分析"
          steps={stepsByAgent['intent_analysis']}
        />
      )}

      {/* Video Analysis */}
      {stepsByAgent['video_analysis'] && (
        <AgentStepsSection
          agentName="视频分析"
          steps={stepsByAgent['video_analysis']}
        />
      )}

      {/* Master Agent */}
      {stepsByAgent['master'] && (
        <AgentStepsSection
          agentName="决策引擎"
          steps={stepsByAgent['master']}
        />
      )}

      {/* AI Thoughts */}
      {thoughts.length > 0 && (
        <ThoughtsSection thoughts={thoughts} />
      )}
    </div>
  );
};
```

#### 3.4 集成到优化流程UI

**文件**：`frontend/src/components/Workspace.tsx`

**改造**：在OptimizationResult上方添加AnalysisProgressPanel

```tsx
{/* 优化进行中 - 显示分析过程 */}
{optimizationState?.isActive && (
  <AnalysisProgressPanel workspaceId={workspace._id} />
)}

{/* 优化结果 */}
{optimizationState?.finalResult && (
  <OptimizationResult
    workspaceId={workspace._id}
    result={optimizationState.finalResult}
  />
)}
```

---

## 📊 数据流示意图

```
用户点击"一键优化提示词"
    ↓
前端调用 api.optimizePrompt(workspaceId)
    ↓
后端 /api/optimize-prompt 立即返回 {success: true}
    ↓
后端异步执行 optimizePrompt() 主流程
    ↓
├─ Intent Analysis Agent
│   ├─ wsBroadcast → agent_step (visual_analysis, running)
│   ├─ 执行视觉分析...
│   ├─ wsBroadcast → agent_step (visual_analysis, completed)
│   ├─ wsBroadcast → agent_step (llm_inference, running)
│   ├─ 调用Qwen LLM...
│   ├─ wsBroadcast → agent_step (parse_result, running)
│   ├─ 解析JSON...
│   └─ wsBroadcast → intent_report (完整报告)
│
├─ Human-in-the-Loop
│   ├─ wsBroadcast → human_loop_pending
│   ├─ 等待用户确认...
│   └─ 用户确认 → wsClient.sendHumanConfirmation()
│
├─ Video Analysis Agent (如有视频)
│   ├─ wsBroadcast → agent_step (fetch_video, running)
│   ├─ wsBroadcast → agent_step (quality_assessment, running)
│   ├─ wsBroadcast → agent_thought ("视频质量较好...")
│   ├─ wsBroadcast → agent_step (content_matching, running)
│   └─ wsBroadcast → video_analysis (完整报告)
│
└─ Master Agent
    ├─ wsBroadcast → agent_step (data_integration, running)
    ├─ wsBroadcast → agent_step (strategy_decision, running)
    ├─ wsBroadcast → agent_thought ("用户运动强度偏低...")
    ├─ wsBroadcast → agent_step (parameter_optimization, running)
    └─ wsBroadcast → optimization_result (最终结果)

前端实时接收WebSocket消息
    ↓
更新 store.analysisSteps / store.thoughts
    ↓
AnalysisProgressPanel 自动重新渲染
    ↓
用户看到实时的分析过程
```

---

## ✅ 开发检查清单

### 后端
- [ ] 修改 `intent-agent.js` 添加流式步骤广播
- [ ] 修改 `video-agent.js` 添加流式步骤广播
- [ ] 修改 `master-agent.js` 添加流式步骤广播
- [ ] 修改 `prompt-optimizer.js` 传递 wsBroadcast 给各agent
- [ ] 定义分析步骤常量（phase定义）
- [ ] 测试流式消息发送

### 前端
- [ ] 修改 `websocket.ts` 添加 agent_step 和 agent_thought 处理
- [ ] 修改 `workspaceStore.ts` 添加 analysisSteps 和 thoughts 状态
- [ ] 创建 `AnalysisProgressPanel.tsx` 组件
- [ ] 创建 `AgentStepsSection.tsx` 子组件
- [ ] 创建 `ThoughtsSection.tsx` 子组件
- [ ] 集成到 `Workspace.tsx`
- [ ] 测试实时展示效果

### 端到端测试
- [ ] 启动后端和前端
- [ ] 点击"一键优化提示词"
- [ ] 验证实时显示分析步骤
- [ ] 验证步骤状态更新（running → completed）
- [ ] 验证步骤结果展示
- [ ] 验证AI思考过程展示
- [ ] 验证多个agent的步骤顺序正确

---

## 🎨 UI设计细节

### 步骤状态图标
- 🔄 运行中：`status: 'running'`
- ✅ 已完成：`status: 'completed'`
- ⏸️ 等待中：还未开始的步骤

### Agent颜色主题
- Intent Analysis：蓝色 `#3B82F6`
- Video Analysis：紫色 `#8B5CF6`
- Master Agent：绿色 `#10B981`

### 动画效果
- 步骤添加：淡入动画（fade-in）
- 步骤完成：check图标弹跳动画
- 运行中：脉冲动画（pulse）
- 思考过程：打字机效果（可选）

---

## 📝 实现优先级

### P0（必须实现）
1. 后端agent发送 agent_step 消息
2. 前端接收并存储 analysisSteps
3. AnalysisProgressPanel 基础展示

### P1（重要）
1. 步骤结果展示（折叠/展开）
2. AI思考过程展示
3. 动画效果优化

### P2（优化）
1. 步骤耗时统计
2. 步骤失败重试提示
3. 分析过程导出（下载JSON）

---

## 📖 参考资料

- WebSocket消息类型定义：`frontend/src/types/workspace.ts`
- 现有WebSocket处理器：`frontend/src/services/websocket.ts`
- 现有Agent实现：`backend/src/services/agents/`
- 优化流程主逻辑：`backend/src/services/prompt-optimizer.js`
