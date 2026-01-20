# AI Video Generation Platform - v2.0 架构总览

## 文档版本

- **版本**: v2.0-architecture
- **创建日期**: 2025-01-15
- **状态**: 设计中
- **前置版本**: v1.1 (已完成)

---

## v2.0 版本概述

### 核心功能

**一键优化提示词 (AI-Powered Prompt Optimization)**

用户生成视频后,如果对结果不满意,可以一键触发 AI 多 Agent 系统分析并优化提示词参数,自动改进视频生成配置。

### 产品定位

从"人工填写参数" → "AI 协助优化参数" 的能力升级,降低用户使用门槛,提升视频生成质量。

### 业务价值

1. **降低学习成本**: 用户无需深度理解视频参数含义
2. **提升成片率**: AI 分析视频问题并给出改进方案
3. **加速迭代**: 减少人工试错次数
4. **体验创新**: 透明化 AI 工作流程,建立用户信任

---

## 核心技术架构

### 架构原则

1. **向后兼容**: v2.0 不破坏 v1.x 的所有功能
2. **高内聚**: Agent 系统独立封装,单文件模块设计
3. **流式交互**: WebSocket 实时推送 AI 工作进度
4. **Human-in-the-Loop**: 关键决策点用户确认

### 技术栈

**前端新增**:
- 无新增第三方库 (复用现有 React + WebSocket)
- 新增 AIOutputArea 组件

**后端新增**:
- `langchain` - Agent 编排框架
- `deepagents` - 多 Agent 协作框架 (参考 job-assistant-qwen.js)
- `@langchain/community` - Qwen LLM 集成

**第三方服务**:
- 通义千问 (Qwen) - Master Agent 和 Sub Agents 的 LLM 能力
- Qwen VL (视觉语言模型) - 视频分析能力

---

## 系统架构图

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                            │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Workspace Component                                  │  │
│  │  ├─ ImageUpload                                       │  │
│  │  ├─ VideoForm (v1.1)                                  │  │
│  │  ├─ VideoPlayer                                       │  │
│  │  ├─ [Optimize Prompt Button] ← NEW v2.0             │  │
│  │  └─ AIOutputArea (NEW v2.0)                          │  │
│  │     ├─ Progress Display (streaming)                  │  │
│  │     ├─ Human Confirmation Modal                      │  │
│  │     └─ Result Display (before/after comparison)     │  │
│  └───────────────────────────────────────────────────────┘  │
│              ↓ WebSocket (real-time streaming)              │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                         Backend                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  REST API: POST /api/optimize-prompt                │   │
│  │  - Validate workspace_id                            │   │
│  │  - Fetch workspace data from MongoDB                │   │
│  │  - Trigger AI Agent System                          │   │
│  └─────────────────────────────────────────────────────┘   │
│                              ↓                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  WebSocket Handler: prompt-optimization             │   │
│  │  - Stream agent progress to frontend                │   │
│  │  - Handle human confirmation                        │   │
│  │  - Send final results                               │   │
│  └─────────────────────────────────────────────────────┘   │
│                              ↓                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  AI Agent System (services/prompt-optimizer.js)    │   │
│  │                                                     │   │
│  │  ┌───────────────────────────────────────────┐     │   │
│  │  │  Master Agent (Director)                  │     │   │
│  │  │  - Orchestrate workflow                   │     │   │
│  │  │  - Control sub-agents                     │     │   │
│  │  │  - Generate final recommendations         │     │   │
│  │  └───────────────────────────────────────────┘     │   │
│  │           ↓                          ↓              │   │
│  │  ┌──────────────────┐   ┌───────────────────────┐  │   │
│  │  │ Intent Analysis  │   │  Video Analysis       │  │   │
│  │  │ Sub-Agent        │   │  Sub-Agent            │  │   │
│  │  │                  │   │                       │  │   │
│  │  │ - Parse user     │   │ - Analyze video       │  │   │
│  │  │   inputs         │   │   quality             │  │   │
│  │  │ - Extract intent │   │ - Compare w/ intent   │  │   │
│  │  │ - Output report  │   │ - Identify issues     │  │   │
│  │  └──────────────────┘   └───────────────────────┘  │   │
│  │                                                     │   │
│  │  Uses: Qwen LLM (qwen-plus) + Qwen VL             │   │
│  └─────────────────────────────────────────────────────┘   │
│                              ↓                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  MongoDB: workspaces collection                     │   │
│  │  - Store optimization history                       │   │
│  │  - Update form_data with optimized params          │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 核心工作流程

### 完整流程 (End-to-End)

```
1. 用户点击"一键优化提示词"按钮
   ↓
2. 前端发送 POST /api/optimize-prompt { workspace_id }
   ↓
3. 后端建立 WebSocket 连接,开始流式输出
   ↓
4. Master Agent 启动 → Intent Analysis Sub-Agent
   ↓
5. [Intent Analysis Phase]
   - 分析用户输入 (图片 + 表单参数)
   - 推断用户真实意图
   - 生成结构化意图报告
   - WebSocket 推送: { type: 'intent_report', data: {...} }
   ↓
6. [Human-in-the-Loop]
   - 前端显示意图报告
   - 用户确认/修正
   - 前端发送: { type: 'human_confirm', confirmed: true/false, corrections: {...} }
   ↓
7. [Video Analysis Phase] (仅在用户确认后执行)
   - 分析已生成视频
   - 多维度评估 (内容匹配度、镜头合理性、技术指标)
   - WebSocket 推送: { type: 'video_analysis', data: {...} }
   ↓
8. [Master Agent Decision]
   - 整合意图分析 + 视频分析
   - 定位 NG 原因
   - 生成优化方案 (新的 form_data 参数)
   - WebSocket 推送: { type: 'optimization_result', data: {...} }
   ↓
9. [Frontend Auto-Update]
   - 显示前后参数对比
   - 自动更新工作空间表单
   - 用户可直接点击"生成视频"
```

### 关键决策点

1. **何时触发优化**: 用户已生成过至少一个视频 (video.status = 'completed')
2. **何时跳过视频分析**: 用户未确认意图 (避免无效分析)
3. **何时自动更新表单**: Master Agent 完成优化方案后自动更新

---

## 数据流设计

### 输入数据 (从 MongoDB workspace)

```javascript
{
  _id: "workspace_id",
  image_path: "/uploads/xxx.jpg",
  image_url: "/uploads/xxx.jpg",
  form_data: {
    // v1.0 + v1.1 参数
    camera_movement: "push_in",
    shot_type: "medium_shot",
    lighting: "natural",
    motion_prompt: "person walking slowly",
    duration: 10,
    aspect_ratio: "16:9",
    motion_intensity: 3,
    quality_preset: "standard"
  },
  video: {
    status: "completed",
    url: "/uploads/xxx.mp4",
    task_id: "qwen_task_123"
  }
}
```

### Agent 系统内部数据流

**Step 1: Intent Analysis Output**
```javascript
{
  type: "intent_report",
  data: {
    user_intent: {
      scene_description: "一个人在公园里悠闲散步",
      desired_mood: "平静、放松",
      key_elements: ["人物", "户外", "自然光"],
      motion_expectation: "缓慢移动,不要太快"
    },
    confidence: 0.85,
    timestamp: "2025-01-15T10:30:00Z"
  }
}
```

**Step 2: Human Confirmation**
```javascript
{
  type: "human_confirm",
  confirmed: true,
  corrections: null  // 或 { desired_mood: "欢快、活力" }
}
```

**Step 3: Video Analysis Output**
```javascript
{
  type: "video_analysis",
  data: {
    content_match_score: 6.5,  // 1-10 分
    issues: [
      {
        category: "motion_mismatch",
        description: "视频中人物移动速度过快,与意图不符",
        severity: "high"
      },
      {
        category: "camera_movement",
        description: "推进运镜过于明显,干扰主体",
        severity: "medium"
      }
    ],
    technical_quality: {
      resolution: "1080p",
      clarity: 8.0,
      fluency: 7.5
    }
  }
}
```

**Step 4: Master Agent Final Output**
```javascript
{
  type: "optimization_result",
  data: {
    ng_reasons: [
      "运动强度设置为 3 (中等),但用户意图是缓慢散步,实际生成视频过快",
      "推进运镜 (push_in) 不适合悠闲场景,建议使用静止或跟随"
    ],
    optimized_params: {
      motion_intensity: 2,      // 3 → 2 (降低)
      camera_movement: "follow", // push_in → follow
      motion_prompt: "person walking very slowly in the park, relaxed and leisurely"
    },
    changes: [
      {
        field: "motion_intensity",
        old_value: 3,
        new_value: 2,
        reason: "降低运动强度以匹配'缓慢散步'意图"
      },
      {
        field: "camera_movement",
        old_value: "push_in",
        new_value: "follow",
        reason: "跟随运镜更适合展现悠闲步行场景"
      },
      {
        field: "motion_prompt",
        old_value: "person walking slowly",
        new_value: "person walking very slowly in the park, relaxed and leisurely",
        reason: "增强提示词细节,突出放松氛围"
      }
    ],
    confidence: 0.82
  }
}
```

### 输出数据 (更新到 MongoDB)

```javascript
{
  // 更新 form_data
  form_data: {
    motion_intensity: 2,  // 已优化
    camera_movement: "follow",  // 已优化
    motion_prompt: "person walking very slowly in the park, relaxed and leisurely",
    // ... 其他未变更字段保持原值
  },

  // 新增字段: 优化历史
  optimization_history: [
    {
      timestamp: "2025-01-15T10:35:00Z",
      intent_report: { ... },
      video_analysis: { ... },
      changes: [ ... ],
      applied: true
    }
  ]
}
```

---

## 技术挑战与解决方案

### 挑战 1: 视频分析能力

**问题**: 需要 AI 分析视频内容 (视觉 + 时序)

**解决方案**:
- 使用 **Qwen VL (视觉语言模型)** - 阿里云通义千问视觉版
- API: `https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation`
- 能力: 视频理解、内容描述、质量评估
- 参考文档: `context/third-part/` (需补充 Qwen VL 文档)

### 挑战 2: Human-in-the-Loop 实时交互

**问题**: Agent 执行过程中需要暂停等待用户确认

**解决方案**:
- WebSocket 双向通信
- Agent 系统内部实现 `await waitForHumanConfirmation()` 异步等待
- 前端发送确认消息后 resume Agent 执行

**实现示例** (参考 deepagents):
```javascript
async function waitForHumanConfirmation(wsClient, intentReport) {
  // 发送意图报告
  wsClient.send(JSON.stringify({
    type: 'intent_report',
    data: intentReport
  }));

  // 等待用户响应 (Promise + WebSocket 消息监听)
  return new Promise((resolve) => {
    const messageHandler = (message) => {
      const data = JSON.parse(message);
      if (data.type === 'human_confirm') {
        wsClient.off('message', messageHandler);
        resolve(data);
      }
    };
    wsClient.on('message', messageHandler);
  });
}
```

### 挑战 3: 流式输出 Agent 工作进度

**问题**: 前端需要实时看到 AI 的思考过程

**解决方案**:
- 在 Agent 系统各关键节点插入 `wsClient.send()` 推送进度
- 前端 AIOutputArea 组件监听 WebSocket 消息实时渲染

**进度消息类型**:
```javascript
// 1. Agent 启动
{ type: 'agent_start', agent: 'intent_analysis' }

// 2. Agent 工作中
{ type: 'agent_progress', agent: 'intent_analysis', message: '正在分析用户输入...' }

// 3. Agent 完成
{ type: 'agent_complete', agent: 'intent_analysis', result: {...} }

// 4. 等待人工确认
{ type: 'human_loop_pending', message: '请确认意图分析结果' }

// 5. 最终结果
{ type: 'optimization_result', data: {...} }
```

---

## 向后兼容性

### 数据库兼容

- 新增字段 `optimization_history` 为可选字段
- v1.x 工作空间无此字段时默认为空数组 `[]`
- 不影响现有查询和更新逻辑

### API 兼容

- v2.0 新增 API: `POST /api/optimize-prompt`
- 不修改任何 v1.x API 端点
- WebSocket 新增事件类型,不影响现有事件

### 前端兼容

- "一键优化提示词"按钮为新增组件,不影响现有功能
- AIOutputArea 为独立组件,不修改 v1.x 组件逻辑
- 用户可选择是否使用优化功能

---

## 安全性与性能

### 安全性

1. **API 鉴权**: 复用现有单用户假设 (MVP 阶段)
2. **输入验证**: workspace_id 合法性校验
3. **视频 URL 验证**: 确保视频文件存在且可访问
4. **超时保护**: Agent 系统设置最大执行时间 (5 分钟)

### 性能

1. **并行处理**: Intent Analysis 和 Video Analysis 理论上可并行 (但业务逻辑要求串行)
2. **缓存策略**: 相同 workspace 短时间内重复优化时使用缓存结果 (可选)
3. **WebSocket 连接管理**: 限制单用户最多 1 个优化任务并发

---

## 后续扩展方向

### v2.1 (可选增强)

- 优化历史对比查看
- 批量优化多个工作空间
- A/B 测试模式 (生成两个版本对比)

### v3.0 (长期规划)

- 多用户协作优化
- 自定义 Agent 规则
- 更复杂的视频质量评估模型

---

## 参考文档

1. **业务需求**: `context/businee-v2.md`
2. **技术参考**: `context/third-part/job-assistant-qwen.js` (multi-agent 实现)
3. **v1.1 架构**: `context/business-v1-1.md`, `CLAUDE.md`
4. **Qwen API**: `context/third-part/qwen-pic-to-video-first-pic.txt`

---

## 下一步

阅读以下详细设计文档:

1. **前端架构**: `v2-frontend-architecture.md`
2. **后端架构**: `v2-backend-architecture.md`
3. **Agent 系统设计**: `v2-agent-system-design.md`
4. **WebSocket 协议**: `v2-websocket-protocol.md`
5. **API 设计**: `v2-api-design.md`
6. **数据库变更**: `v2-database-schema.md`
7. **开发计划**: `v2-development-plan.md`
