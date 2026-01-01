# 第三方 API 测试报告

## 测试时间
待填写

## 1. Qwen 视频生成 API

### 基本信息
- **服务商**: 阿里云 DashScope
- **用途**: 图生视频
- **Base URL**: https://dashscope.aliyuncs.com/api/v1
- **认证方式**: Bearer Token (DASHSCOPE_API_KEY)

### 测试结果
- [ ] API Key 验证通过
- [ ] 任务提交成功
- [ ] 任务状态查询成功
- 任务 ID: [待填写]

### API 调用格式
```javascript
// 提交视频生成任务
POST https://dashscope.aliyuncs.com/api/v1/services/aigc/video-generation/generation
Headers:
  Authorization: Bearer {DASHSCOPE_API_KEY}
  Content-Type: application/json
  X-DashScope-Async: enable

Body:
{
  "model": "qwen-vl-plus",
  "input": {
    "image_url": "图片URL",
    "prompt": "视频生成描述"
  },
  "parameters": {
    "duration": 5
  }
}

// 查询任务状态
GET https://dashscope.aliyuncs.com/api/v1/tasks/{task_id}
Headers:
  Authorization: Bearer {DASHSCOPE_API_KEY}
```

### 响应格式
```json
{
  "output": {
    "task_id": "任务ID",
    "task_status": "PENDING|RUNNING|SUCCEEDED|FAILED",
    "video_url": "生成的视频URL（成功时）",
    "message": "错误信息（失败时）"
  },
  "request_id": "请求ID"
}
```

### 成本分析
- 免费额度: [待查阅官方文档]
- 计费方式: [待查阅官方文档]
- 预估成本: [待计算]

### 测试问题记录
[记录测试过程中遇到的问题]

---

## 2. Google Gemini LLM API

### 基本信息
- **服务商**: Google
- **用途**: AI 协作助手
- **模型**: gemini-pro
- **认证方式**: API Key (GOOGLE_API_KEY)

### 测试结果
- [ ] API Key 验证通过
- [ ] 基础对话测试通过
- [ ] 视频制作建议测试通过
- [ ] 参数优化测试通过

### API 调用格式
```javascript
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

const result = await model.generateContent(prompt);
const response = await result.response;
const text = response.text();
```

### 响应示例
[粘贴实际测试响应]

### 成本分析
- 免费额度: 60 requests/min
- 付费版本: [待查阅官方文档]
- 预估成本: [待计算]

### 测试问题记录
[记录测试过程中遇到的问题]

---

## 总结

### 可行性评估
- [ ] 两个 API 均可用
- [ ] 性能满足需求
- [ ] 成本可控

### API 对比

| 维度 | Qwen 视频生成 | Google Gemini |
|------|--------------|--------------|
| 响应速度 | [待测试] | [待测试] |
| 稳定性 | [待测试] | [待测试] |
| 免费额度 | [待查询] | 60 req/min |
| 易用性 | [待评估] | [待评估] |

### 使用建议
1. **Qwen 视频生成**:
   - [待填写]

2. **Google Gemini**:
   - [待填写]

### 优化建议
1. [待填写]
2. [待填写]
3. [待填写]

### 风险提示
1. **API 配额限制**: 需要监控使用量，避免超出免费额度
2. **网络稳定性**: 视频生成是异步任务，需要处理网络超时和重试
3. **数据安全**: 上传的图片和生成的视频需要做好安全管理
4. **成本控制**: 在正式上线前需要评估实际成本

---

## 下一步行动
- [ ] 补充完整测试数据
- [ ] 查阅官方文档获取详细计费信息
- [ ] 评估实际使用成本
- [ ] 制定 API 调用限流策略
