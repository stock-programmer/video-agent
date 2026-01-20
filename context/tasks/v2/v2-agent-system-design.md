# v2.0 Agent 系统设计文档

## 文档概述

本文档详细描述 v2.0 多 Agent 系统的设计,包括 Master Agent、Sub-Agents 的职责、Prompt 设计、工作流程。

---

## Agent 系统架构

### 总体设计

```
┌─────────────────────────────────────────────────────────┐
│                   Master Agent (总导演)                  │
│                                                         │
│  职责:                                                   │
│  1. 编排整体优化流程                                      │
│  2. 调度 Sub-Agents                                      │
│  3. 整合各 Agent 结论                                     │
│  4. 生成最终优化方案                                      │
│                                                         │
│  使用模型: Qwen-Plus (高性能推理)                          │
└─────────────────────────────────────────────────────────┘
            │                               │
            │                               │
            ▼                               ▼
┌─────────────────────────┐   ┌─────────────────────────┐
│  Intent Analysis        │   │  Video Analysis         │
│  Sub-Agent              │   │  Sub-Agent              │
│                         │   │                         │
│  职责:                   │   │  职责:                   │
│  - 解析用户输入参数       │   │  - 分析生成视频质量       │
│  - 推断真实意图          │   │  - 评估内容匹配度        │
│  - 输出结构化报告        │   │  - 识别技术问题          │
│                         │   │                         │
│  输入: 表单数据 + 图片    │   │  输入: 视频文件 + 意图报告│
│  输出: 意图报告          │   │  输出: 问题分析报告       │
│                         │   │                         │
│  模型: Qwen-Plus        │   │  模型: Qwen-VL-Max      │
└─────────────────────────┘   └─────────────────────────┘
```

---

## Master Agent 设计

### 职责

1. **流程编排**: 按序调用 Sub-Agents
2. **上下文管理**: 维护完整对话上下文
3. **决策整合**: 综合意图分析 + 视频分析,定位问题根因
4. **方案生成**: 输出具体的参数优化建议

### System Prompt

```
You are an AI Video Generation Optimization Expert and Director.

Your mission: Help users improve their video generation results by analyzing their intent and evaluating the generated video.

Workflow:
1. **Intent Analysis Phase**
   - Call the "intent-analysis" sub-agent with user's input parameters
   - The sub-agent will return a structured intent report
   - Present this report to the user for confirmation (via Human-in-the-Loop)

2. **Wait for Human Confirmation**
   - IMPORTANT: You must wait for explicit confirmation signal before proceeding
   - If user rejects, ask for corrections and re-analyze
   - If user confirms, proceed to next step

3. **Video Analysis Phase**
   - Call the "video-analysis" sub-agent with the generated video and confirmed intent
   - The sub-agent will return video quality assessment and issues

4. **Master Decision Phase**
   - Compare user's intent vs actual video performance
   - Identify root causes of NG (Not Good) results
   - Generate specific parameter optimization recommendations
   - Explain WHY each change is needed

Output Format (REQUIRED):
<NG_REASONS>
- Reason 1: Detailed explanation
- Reason 2: Detailed explanation
</NG_REASONS>

<OPTIMIZED_PARAMS>
{
  "motion_intensity": 2,
  "camera_movement": "follow",
  "motion_prompt": "enhanced prompt text"
}
</OPTIMIZED_PARAMS>

<CHANGES>
[
  {
    "field": "motion_intensity",
    "old_value": 3,
    "new_value": 2,
    "reason": "Lower intensity matches the 'slow walk' intent better"
  }
]
</CHANGES>

Guidelines:
- Be specific and actionable in recommendations
- Focus on parameters that truly need changing
- Explain the reasoning behind each change
- Consider the visual characteristics already present in the input image
```

### 输入格式

```javascript
{
  messages: [
    {
      role: "user",
      content: `User's video generation parameters:
- Image: /uploads/image123.jpg
- Camera Movement: push_in
- Shot Type: medium_shot
- Lighting: natural
- Motion Prompt: person walking slowly
- Duration: 10s
- Aspect Ratio: 16:9
- Motion Intensity: 3
- Quality: standard

Generated Video: /uploads/video123.mp4

Task: Analyze intent, evaluate video, suggest optimizations.`
    }
  ]
}
```

### 输出格式

```xml
<NG_REASONS>
- Motion intensity set to 3 (medium), but user's prompt says "slowly", resulting in faster movement than intended
- Push-in camera movement draws too much attention to the subject, conflicting with the relaxed scene mood
</NG_REASONS>

<OPTIMIZED_PARAMS>
{
  "motion_intensity": 2,
  "camera_movement": "follow",
  "motion_prompt": "person walking very slowly in a relaxed manner, enjoying the scenery"
}
</OPTIMIZED_PARAMS>

<CHANGES>
[
  {
    "field": "motion_intensity",
    "old_value": 3,
    "new_value": 2,
    "reason": "降低运动强度以匹配'slowly'的意图,避免过快的动作"
  },
  {
    "field": "camera_movement",
    "old_value": "push_in",
    "new_value": "follow",
    "reason": "跟随运镜更适合悠闲场景,推进运镜过于突出主体,破坏轻松氛围"
  },
  {
    "field": "motion_prompt",
    "old_value": "person walking slowly",
    "new_value": "person walking very slowly in a relaxed manner, enjoying the scenery",
    "reason": "增强提示词细节,明确'非常缓慢'和'欣赏风景'的状态,帮助AI更准确理解"
  }
]
</CHANGES>
```

---

## Intent Analysis Sub-Agent

### 职责

分析用户的**真实意图**,而不仅仅是字面参数。

**关键问题**:
- 用户想表达什么样的场景?
- 期望的情绪氛围是什么?
- 关键视觉元素有哪些?
- 运动应该是什么样的速度和风格?

### Agent Definition

```javascript
{
  name: 'intent-analysis',
  description: 'Analyze user intent from input parameters and image',
  prompt: `You are an Intent Analysis Specialist.

Task: Based on user's input parameters, infer their TRUE INTENT.

Input:
- Image URL: (visual context)
- Form parameters: camera_movement, shot_type, lighting, motion_prompt, duration, aspect_ratio, motion_intensity, quality_preset

Analysis Steps:
1. **Visual Analysis**: What does the image show? (scene, subjects, composition, mood)
2. **Parameter Interpretation**: What do the chosen parameters suggest?
3. **Motion Intent**: What kind of movement does the user expect? (speed, style, energy)
4. **Mood Inference**: What emotional tone is desired? (calm, energetic, dramatic, etc.)
5. **Contradiction Check**: Are there conflicts between parameters and image content?

Output JSON (wrap in <INTENT_REPORT>...</INTENT_REPORT>):
{
  "user_intent": {
    "scene_description": "A person standing in a park with trees and natural lighting",
    "desired_mood": "Calm, peaceful, leisurely",
    "key_elements": ["person", "outdoor environment", "natural light", "trees"],
    "motion_expectation": "Slow, gentle walking motion without sudden movements",
    "energy_level": "low-to-medium (relaxed pace)"
  },
  "parameter_analysis": {
    "aligned": ["natural lighting matches outdoor scene", "medium shot appropriate for single person"],
    "potential_issues": ["motion_intensity=3 might be too fast for 'slowly' in prompt", "push_in camera may be too aggressive"]
  },
  "confidence": 0.85
}

Important:
- Do NOT analyze the generated video here (that's video-analysis agent's job)
- Focus on understanding what user WANTS, not what they GOT
- Be specific and concrete in descriptions
`
}
```

### 示例输入

```
User Parameters:
- Image: /uploads/park-person.jpg (shows person standing in park)
- Camera Movement: push_in
- Shot Type: medium_shot
- Lighting: natural
- Motion Prompt: "person walking slowly"
- Duration: 10s
- Aspect Ratio: 16:9
- Motion Intensity: 3
- Quality: standard
```

### 示例输出

```json
{
  "user_intent": {
    "scene_description": "一个人站在公园里,周围有树木和自然光线,画面宁静舒适",
    "desired_mood": "平静、放松、悠闲",
    "key_elements": ["人物", "户外环境", "自然光", "树木背景"],
    "motion_expectation": "缓慢的步行动作,没有突然的快速移动,展现轻松自在的状态",
    "energy_level": "低到中等(放松节奏)"
  },
  "parameter_analysis": {
    "aligned": [
      "自然光照设置与户外场景匹配",
      "中景(medium_shot)适合展示单人活动"
    ],
    "potential_issues": [
      "运动强度=3(中等)可能与提示词'slowly'不匹配,容易生成过快的动作",
      "推进运镜(push_in)可能过于强调主体,与悠闲氛围有冲突"
    ]
  },
  "confidence": 0.85
}
```

---

## Video Analysis Sub-Agent

### 职责

分析**已生成视频**的质量,评估是否符合用户意图。

**关键问题**:
- 视频内容是否匹配意图?
- 运动速度/强度是否正确?
- 镜头运用是否合适?
- 有哪些技术问题? (模糊、卡顿、失真等)

### Agent Definition

```javascript
{
  name: 'video-analysis',
  description: 'Analyze generated video quality and match with intent',
  prompt: `You are a Video Quality Analysis Specialist with access to Qwen VL vision capabilities.

Task: Analyze the generated video and compare it with user's confirmed intent.

Input:
- Video URL: (generated video file)
- Intent Report: (from intent-analysis agent, confirmed by user)
- Original Parameters: (form_data used to generate this video)

Analysis Dimensions:
1. **Content Match** (1-10 score)
   - Does video content align with intent's scene description?
   - Are key elements present and prominent?
   - Is the mood/atmosphere correctly conveyed?

2. **Motion Evaluation**
   - Speed: Is motion speed matching intent's expectation? (too fast/too slow/just right)
   - Style: Is motion style appropriate? (smooth/jerky, natural/artificial)
   - Intensity: Does motion energy level match intent?

3. **Camera Work**
   - Is camera movement appropriate for the scene?
   - Does it enhance or distract from the content?
   - Any unwanted camera shake or drift?

4. **Technical Quality**
   - Resolution: Clear or blurry?
   - Fluency: Smooth or stuttering?
   - Artifacts: Any visual glitches, distortions?

Output JSON (wrap in <VIDEO_ANALYSIS>...</VIDEO_ANALYSIS>):
{
  "content_match_score": 7.5,
  "issues": [
    {
      "category": "motion_mismatch",
      "description": "Person's walking speed is noticeably faster than 'slowly' suggests",
      "severity": "high",
      "affected_parameter": "motion_intensity"
    },
    {
      "category": "camera_inappropriate",
      "description": "Push-in camera draws excessive attention, conflicts with relaxed mood",
      "severity": "medium",
      "affected_parameter": "camera_movement"
    }
  ],
  "technical_quality": {
    "resolution": "1080p",
    "clarity_score": 8.0,
    "fluency_score": 7.5,
    "artifacts": "none"
  },
  "overall_assessment": "Video technically sound but motion speed and camera choice don't align with leisurely intent"
}

Important:
- Use Qwen VL to actually WATCH the video, don't just guess
- Be specific about what's wrong and which parameter caused it
- Prioritize issues by severity (high/medium/low)
`
}
```

### Qwen VL 集成

**实现方式**: 在 Agent 执行前,先调用 Qwen VL API 获取视频分析结果,然后将结果注入到 Agent context。

```javascript
// 在 buildVideoAnalysisPrompt() 中
async function buildVideoAnalysisPrompt(workspace, intentReport) {
  // 1. 先调用 Qwen VL 获取视频内容描述
  const qwenVLResult = await analyzeVideoWithQwenVL(
    workspace.video.url,
    `Describe this video in detail: what is happening, how fast are movements, what is the camera doing?`
  );

  // 2. 将 Qwen VL 结果注入到 Agent prompt
  return `You are a Video Quality Analyst.

Video Content (analyzed by Qwen VL):
${qwenVLResult.description}

User's Confirmed Intent:
${JSON.stringify(intentReport.user_intent, null, 2)}

Original Parameters:
- Camera Movement: ${workspace.form_data.camera_movement}
- Motion Intensity: ${workspace.form_data.motion_intensity}
- Motion Prompt: ${workspace.form_data.motion_prompt}

Task: Compare video content vs intent, identify mismatches, suggest parameter fixes.

Output format: <VIDEO_ANALYSIS>{...}</VIDEO_ANALYSIS>`;
}
```

### 示例输出

```json
{
  "content_match_score": 6.5,
  "issues": [
    {
      "category": "motion_speed_mismatch",
      "description": "视频中人物步行速度明显快于'slowly'所暗示的缓慢节奏,接近正常行走速度",
      "severity": "high",
      "affected_parameter": "motion_intensity",
      "evidence": "Qwen VL 观察到步幅较大,每秒约1.2步,而'slowly'应该是每秒0.5-0.8步"
    },
    {
      "category": "camera_movement_conflict",
      "description": "推进运镜(push_in)使镜头不断靠近主体,强调感过强,与'悠闲散步'的轻松意图不符",
      "severity": "medium",
      "affected_parameter": "camera_movement",
      "evidence": "镜头在10秒内从中景推进到近景,视觉重心过于集中在人物,背景环境被压缩"
    }
  ],
  "technical_quality": {
    "resolution": "1080p",
    "clarity_score": 8.2,
    "fluency_score": 7.8,
    "artifacts": "轻微的运动模糊在快速步行时出现"
  },
  "strengths": [
    "自然光照效果良好,户外场景氛围真实",
    "人物动作流畅,没有明显的AI生成痕迹",
    "背景树木细节清晰"
  ],
  "overall_assessment": "视频技术质量良好,但运动速度和运镜方式与用户意图存在偏差,需要降低运动强度并更换运镜方式"
}
```

---

## Human-in-the-Loop 设计

### 时机

在 **Intent Analysis Sub-Agent** 完成后,**Video Analysis Sub-Agent** 执行前。

### 原因

1. **避免无效分析**: 如果意图理解错误,视频分析的基准就错了
2. **用户参与感**: 让用户参与关键决策,建立信任
3. **纠错机会**: 用户可修正 AI 的意图理解偏差

### 实现流程

```
1. Intent Analysis Agent 完成
   ↓
2. Master Agent 发送意图报告到前端 (via WebSocket)
   {
     type: 'intent_report',
     data: { user_intent: {...}, confidence: 0.85 }
   }
   ↓
3. 前端显示弹窗,用户选择:
   - ✅ 确认意图正确 → 发送 { type: 'human_confirm', confirmed: true }
   - ✏️ 修正意图 → 发送 { type: 'human_confirm', confirmed: true, corrections: {...} }
   - ❌ 意图完全错误 → 发送 { type: 'human_confirm', confirmed: false }
   ↓
4. 后端接收确认消息:
   - confirmed=true: 继续执行 Video Analysis
   - confirmed=false: 重新执行 Intent Analysis 或终止流程
   ↓
5. Video Analysis Agent 使用确认后的意图作为基准
```

### 代码实现 (后端)

```javascript
// 在 prompt-optimizer.js 中
async function startOptimizationFlow(workspaceId, workspace) {
  // Phase 1: Intent Analysis
  const intentAgent = buildIntentAnalysisAgent(workspace);
  const intentResult = await intentAgent.invoke({
    messages: [{ role: 'user', content: buildIntentContext(workspace) }]
  });

  const intentReport = parseIntentReport(intentResult);

  // 发送意图报告到前端
  wsHandler.broadcast({
    type: 'intent_report',
    workspace_id: workspaceId,
    data: intentReport
  });

  // 发送等待确认消息
  wsHandler.broadcast({
    type: 'human_loop_pending',
    workspace_id: workspaceId,
    message: '请确认意图分析结果是否准确'
  });

  // 等待用户确认 (异步阻塞)
  const confirmation = await waitForHumanConfirmation(workspaceId);

  if (!confirmation.confirmed) {
    logger.info(`User rejected intent for ${workspaceId}`);
    wsHandler.broadcast({
      type: 'optimization_error',
      workspace_id: workspaceId,
      error: '用户拒绝了意图分析结果,优化流程终止'
    });
    return;
  }

  // 使用确认后的意图 (如果有修正则使用修正版本)
  const confirmedIntent = confirmation.corrections || intentReport;

  // Phase 2: Video Analysis
  const videoAgent = buildVideoAnalysisAgent(workspace, confirmedIntent);
  const videoResult = await videoAgent.invoke({
    messages: [{ role: 'user', content: buildVideoAnalysisContext(workspace, confirmedIntent) }]
  });

  // ... 继续流程 ...
}
```

---

## Agent 通信协议

### LangChain + DeepAgents 集成

**参考**: `context/third-part/job-assistant-qwen.js`

**关键组件**:
1. `QwenWithTools` - Qwen LLM wrapper
2. `createDeepAgent()` - 创建 multi-agent 系统
3. `subagents` - 定义 Sub-Agents 数组

**实现**:
```javascript
const { createDeepAgent } = require('deepagents');
const { ChatAlibabaTongyi } = require('@langchain/community/chat_models/alibaba_tongyi');

// Qwen wrapper (支持 tool binding)
class QwenWithTools extends ChatAlibabaTongyi {
  constructor(config) {
    super(config);
    this._boundTools = [];
  }

  bindTools(tools) {
    const instance = new QwenWithTools({
      model: this.model,
      temperature: this.temperature,
      alibabaApiKey: this.alibabaApiKey
    });
    instance._boundTools = tools;
    return instance;
  }

  async invoke(input, options) {
    // 将 tools 描述注入到 system message
    if (this._boundTools && this._boundTools.length > 0) {
      const toolDescriptions = this._boundTools.map(tool =>
        `Tool: ${tool.name}\nDescription: ${tool.description}\nParameters: ${JSON.stringify(tool.schema)}`
      ).join('\n\n');

      const systemMessage = `You have access to the following tools:\n\n${toolDescriptions}`;

      if (Array.isArray(input)) {
        input = [{ role: 'system', content: systemMessage }, ...input];
      }
    }
    return super.invoke(input, options);
  }
}

// 创建 Agent 系统
function buildPromptOptimizerAgent(workspace) {
  const qwenModel = new QwenWithTools({
    model: 'qwen-plus',
    temperature: 0.3,
    alibabaApiKey: process.env.DASHSCOPE_API_KEY
  });

  const subagents = [
    {
      name: 'intent-analysis',
      description: 'Analyze user intent',
      prompt: INTENT_ANALYSIS_PROMPT
    },
    {
      name: 'video-analysis',
      description: 'Analyze video quality',
      prompt: VIDEO_ANALYSIS_PROMPT
    }
  ];

  return createDeepAgent({
    tools: [],  // 可选: 添加自定义工具
    systemPrompt: MASTER_AGENT_PROMPT,
    subagents,
    model: qwenModel
  });
}
```

---

## 输出解析

### 解析策略

**问题**: Agent 输出是自然语言,需要提取结构化数据

**解决方案**: XML 标签 + 正则匹配

**示例**:
```javascript
function parseAgentOutput(result) {
  const finalText = result.messages[result.messages.length - 1]?.content || '';

  // 1. 提取 NG 原因
  const ngMatch = finalText.match(/<NG_REASONS>\s*(.*?)\s*<\/NG_REASONS>/is);
  const ng_reasons = ngMatch
    ? ngMatch[1].split('\n')
        .filter(line => line.trim().startsWith('-'))
        .map(line => line.replace(/^-\s*/, '').trim())
    : [];

  // 2. 提取优化参数 (JSON)
  const paramsMatch = finalText.match(/<OPTIMIZED_PARAMS>\s*(.*?)\s*<\/OPTIMIZED_PARAMS>/is);
  let optimized_params = {};
  if (paramsMatch) {
    try {
      optimized_params = JSON.parse(paramsMatch[1].trim());
    } catch (e) {
      logger.error('Failed to parse optimized params JSON:', e);
    }
  }

  // 3. 提取变更列表 (JSON)
  const changesMatch = finalText.match(/<CHANGES>\s*(.*?)\s*<\/CHANGES>/is);
  let changes = [];
  if (changesMatch) {
    try {
      changes = JSON.parse(changesMatch[1].trim());
    } catch (e) {
      logger.error('Failed to parse changes JSON:', e);
    }
  }

  return {
    ng_reasons,
    optimized_params,
    changes,
    confidence: 0.8  // 可从 Agent 输出提取
  };
}
```

### 鲁棒性增强

**问题**: Agent 可能不按格式输出

**解决方案**:
1. **Prompt Engineering**: 在 prompt 中强调输出格式 (使用"REQUIRED", "MUST")
2. **多次重试**: 如果解析失败,要求 Agent 重新生成
3. **降级方案**: 如果多次失败,使用规则式分析作为 fallback

```javascript
async function executeAgentWithRetry(agent, input, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const result = await agent.invoke(input);
    const parsed = parseAgentOutput(result);

    // 验证必要字段
    if (parsed.ng_reasons.length > 0 && Object.keys(parsed.optimized_params).length > 0) {
      return parsed;
    }

    logger.warn(`Agent output parsing failed, retry ${i + 1}/${maxRetries}`);
  }

  throw new Error('Agent failed to produce valid output after retries');
}
```

---

## 性能优化

### 1. Agent 执行并行化

**当前**: 串行执行 (Intent → Video)

**优化**: 理论上可并行,但业务逻辑要求串行 (视频分析依赖意图确认)

**可优化点**: Qwen VL 视频分析可在等待人工确认时**预先执行**,缓存结果。

```javascript
// 并行预加载
const [intentResult, videoPreAnalysis] = await Promise.all([
  executeIntentAnalysis(workspace),
  analyzeVideoWithQwenVL(workspace.video.url, 'Describe this video')  // 预分析
]);

// 等待人工确认...

// 使用预分析结果 + 确认的意图,快速生成最终分析
```

### 2. 缓存机制

**场景**: 用户短时间内多次优化同一工作空间

**方案**: 缓存意图分析结果 (TTL: 5分钟)

```javascript
const intentCache = new Map();  // key: workspace_id, value: { intent, timestamp }

function getCachedIntent(workspaceId) {
  const cached = intentCache.get(workspaceId);
  if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
    return cached.intent;
  }
  return null;
}
```

---

## 测试策略

### Unit Tests

```javascript
// __tests__/agents/intent-agent.test.js
describe('Intent Analysis Agent', () => {
  it('should extract user intent from parameters', async () => {
    const workspace = { /* mock data */ };
    const result = await executeIntentAnalysis(workspace);
    expect(result.user_intent.scene_description).toBeDefined();
    expect(result.confidence).toBeGreaterThan(0.5);
  });
});

// __tests__/agents/video-agent.test.js
describe('Video Analysis Agent', () => {
  it('should identify motion mismatch issues', async () => {
    const workspace = { /* mock data */ };
    const intent = { /* mock intent */ };
    const result = await executeVideoAnalysis(workspace, intent);
    expect(result.issues).toHaveLength(2);
    expect(result.issues[0].category).toBe('motion_mismatch');
  });
});
```

### Integration Tests

```javascript
describe('Full Agent System', () => {
  it('should complete optimization flow', async () => {
    // Mock Qwen API responses
    // Execute full flow
    // Verify final output structure
  });
});
```

---

## 错误处理

### Agent 执行异常

```javascript
try {
  const result = await agent.invoke(input);
} catch (error) {
  if (error.code === 'RATE_LIMIT') {
    // 等待后重试
    await sleep(5000);
    return executeAgentWithRetry(agent, input);
  } else if (error.code === 'TIMEOUT') {
    // 记录日志,使用降级方案
    logger.error('Agent timeout, using fallback');
    return fallbackOptimization(workspace);
  } else {
    throw error;
  }
}
```

---

## 下一步

阅读相关文档:
- **WebSocket 协议**: `v2-websocket-protocol.md`
- **API 设计**: `v2-api-design.md`
