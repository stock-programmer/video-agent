# v2.0.1 流式Agent分析过程 - 端到端测试指南

## 📋 测试前的检查清单

### 环境准备
- [ ] MongoDB 已启动
- [ ] 后端环境变量已配置（`.env` 包含 `DASHSCOPE_API_KEY` 和 `GOOGLE_API_KEY`）
- [ ] 前端开发服务器可以启动

### 代码验证
- [x] 后端 agents 已修改，支持流式步骤广播
- [x] 前端 WebSocket 处理器已更新，支持 `agent_step` 和 `agent_thought` 消息
- [x] 前端 store 已扩展，添加了 `analysisSteps` 和 `thoughts` 状态
- [x] 前端 UI 组件已创建和集成
- [x] TypeScript 编译通过

---

## 🚀 启动应用

### 1. 启动后端服务器
```bash
cd backend
npm start
# 应该显示: "Server running on http://localhost:3000"
# 以及: "WebSocket server running on ws://localhost:3001"
```

### 2. 启动前端开发服务器
```bash
cd frontend
npm run dev
# 应该显示类似: "VITE v4.x.x  ready in xxx ms"
# 并提供访问 URL（通常 http://localhost:5173）
```

### 3. 打开浏览器
访问 `http://localhost:5173`

---

## 🧪 测试步骤

### 测试1：上传图片和视频
1. 在应用中创建一个新的 workspace
2. 上传一张测试图片
3. 填写视频生成参数（运镜、景别、光线、运动描述等）
4. 点击"生成视频"按钮
5. 等待视频生成完成（可能需要几分钟）

**预期结果**：视频应该显示在播放器中

### 测试2：点击"一键优化提示词"按钮
1. 在已生成视频的 workspace 中
2. 点击蓝色的"一键优化提示词"按钮

**预期UI变化**：
- [ ] AIOutputArea 应该出现分析进度
- [ ] 应该看到"🔍 AI 分析过程"部分开始显示

### 测试3：实时流式分析步骤显示
在优化流程运行中，您应该看到：

#### 意图分析部分
```
🧠 意图分析
✅ 视觉分析 - 图片分析完成
⏳ LLM推理 - 正在分析...
⏸️ 参数解读 - 等待中...
...
```

**预期步骤**（按顺序出现）：
1. 视觉分析（running）→ 视觉分析（completed）
2. 参数解读（running）
3. 运动意图推断（running）
4. 情绪推断（running）
5. 矛盾检查（running）
6. LLM推理（running）
7. 解析结果（running）
8. 完成状态

#### 视频分析部分（如有视频）
```
🎬 视频分析
✅ 获取视频 - 加载完成
⏳ 质量评估 - 评估中...
...
```

#### 决策引擎部分
```
⚙️ 决策引擎
⏳ 数据整合 - 整合中...
⏳ 策略决策 - 决策中...
...
```

#### AI思考过程
```
💭 AI 思考过程
🧠 意图分析 14:30:15
    检测到N个问题，其中高严重性问题包括：...

⚙️ 决策引擎 14:30:30
    提出M个参数变更：motion_intensity, lighting, ...
```

### 测试4：完整流程验证
从点击按钮到完成，应该看到：

1. **Agent Start** → 粗略进度消息
2. **Agent Steps** → 详细步骤流式显示（新增功能）
3. **Agent Thoughts** → AI思考过程实时显示（新增功能）
4. **Human-in-the-Loop** → 意图确认弹窗
5. **Final Result** → 优化建议展示

---

## 🔍 浏览器开发者工具检查

### 打开浏览器 DevTools (F12)

#### 检查 WebSocket 消息
1. 打开 DevTools → Console
2. 看是否有 `[WS]` 开头的日志
3. 应该看到类似日志：
   ```
   [WS] Connected to ws://localhost:3001
   [WS] Agent step: 视觉分析
   [WS] Agent step: LLM推理
   [WS] Agent thought: 检测到N个问题...
   ```

#### 检查状态存储
在 Console 中运行：
```javascript
// 获取当前 workspace ID
const state = window.__store?.getState?.();
console.log(state.optimizationStates);
```

你应该能看到：
```javascript
{
  "workspace-id": {
    isActive: true,
    analysisSteps: [ ... ],        // 应该有多个步骤对象
    thoughts: [ ... ],              // 应该有多个思考对象
    ...
  }
}
```

---

## 🐛 故障排查

### 问题1：看不到分析步骤
**检查项**：
- [ ] WebSocket 已连接 (查看浏览器 DevTools → Network)
- [ ] 后端是否打印了 agent_step 日志
- [ ] 前端 Console 中是否有错误信息
- [ ] AnalysisProgressPanel 组件是否正确导入

**解决方法**：
```bash
# 后端检查日志
grep "agent_step" backend/logs/combined.log

# 前端控制台检查
console.log 已在 websocket.ts 中添加
```

### 问题2：AI思考过程不显示
**检查项**：
- [ ] Master Agent 是否调用了 `broadcastThought`
- [ ] 前端 WebSocket 是否处理了 `agent_thought` 消息
- [ ] Store 中的 `addThought` 是否被正确调用

### 问题3：步骤显示不完整
**检查项**：
- [ ] 所有6个 agent 步骤是否都被广播
- [ ] 步骤的 `phase` 字段是否正确
- [ ] 是否有网络延迟导致消息丢失

---

## ✅ 测试完成标准

当以下条件都满足时，该功能被认为是完全工作的：

- [ ] 能点击"一键优化提示词"按钮
- [ ] 看到 AgentProgress 粗略进度消息
- [ ] 看到 AnalysisProgressPanel 组件出现
- [ ] 能看到至少一个 Agent 的步骤流式显示
- [ ] 能看到 AI 思考过程实时显示
- [ ] 最后能看到优化结果
- [ ] 浏览器 Console 中没有错误

---

## 📊 性能观察

在测试中记录：

| 指标 | 观察值 |
|------|--------|
| 意图分析耗时 | ___ 秒 |
| 视频分析耗时 | ___ 秒 |
| 决策耗时 | ___ 秒 |
| 总耗时 | ___ 秒 |
| WebSocket 消息数 | ___ 条 |
| 分析步骤数 | ___ 个 |
| AI思考消息数 | ___ 条 |

---

## 🎯 下一步优化

- [ ] 添加分析步骤耗时统计
- [ ] 优化 Agent 步骤的显示顺序
- [ ] 添加导出分析过程为 JSON 的功能
- [ ] 优化 UI 动画和过渡效果
- [ ] 添加暗色主题支持

---

## 📞 调试联系点

如果测试失败，检查以下日志：

### 后端日志位置
```bash
backend/logs/combined.log
```

### 前端浏览器 Console
- F12 打开 DevTools
- 查看 Console 标签

### 关键日志关键词
```
[WS]                    # WebSocket 相关日志
agent_step              # 分析步骤日志
broadcastStep          # 步骤广播日志
addAnalysisStep        # Store 添加步骤日志
```
