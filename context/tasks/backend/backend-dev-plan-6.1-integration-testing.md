# 任务 6.1 - 集成测试
## 层级: 第6层
## 依赖: 所有上游任务 (backend-dev-plan-3.*, 4.*, 5.*)

创建 src/__tests__/integration.test.js:
```javascript
import request from 'supertest';
import { app } from '../server.js';
import { connectDB, disconnectDB } from '../db/mongodb.js';

beforeAll(async () => {
  await connectDB();
});

afterAll(async () => {
  await disconnectDB();
});

describe('完整流程测试', () => {
  test('应该完成图片上传→创建工作空间→生成视频流程', async () => {
    // 1. 上传图片
    const uploadRes = await request(app)
      .post('/api/upload/image')
      .attach('image', 'test-image.jpg');
    expect(uploadRes.status).toBe(200);
    
    // 2. 获取工作空间列表
    const listRes = await request(app).get('/api/workspaces');
    expect(listRes.status).toBe(200);
    
    // 3. 生成视频
    const videoRes = await request(app)
      .post('/api/generate/video')
      .send({
        workspace_id: 'test-id',
        form_data: { motion_prompt: 'test' }
      });
    expect(videoRes.status).toBe(200);
  });
});
```

运行: `npm test`
验收: 所有集成测试通过
