# 配置管理文档

## 文档信息
- **版本号**：v1.0
- **创建时间**：2025-12-24
- **状态**：MVP阶段设计

---

## 环境变量配置

### .env 文件结构

```bash
# ===== 环境配置 =====
NODE_ENV=development              # development / production

# ===== 数据库配置 =====
MONGODB_URI=mongodb://localhost:27017/video-maker

# ===== 服务器配置 =====
SERVER_PORT=3000                  # HTTP 服务器端口
WS_PORT=3001                      # WebSocket 服务器端口

# ===== 第三方 API 密钥 =====
# 视频生成服务
RUNWAY_API_KEY=your_runway_key
PIKA_API_KEY=your_pika_key
KLING_API_KEY=your_kling_key

# LLM 服务
OPENAI_API_KEY=your_openai_key
CLAUDE_API_KEY=your_claude_key
QWEN_API_KEY=your_qwen_key

# ===== 服务商选择 =====
VIDEO_PROVIDER=runway             # runway / pika / kling
LLM_PROVIDER=openai               # openai / claude / qwen

# ===== 上传配置 =====
UPLOAD_MAX_SIZE=10485760          # 10MB (单位：字节)
UPLOAD_DIR=./uploads              # 上传目录路径
ALLOWED_IMAGE_TYPES=image/jpeg,image/png,image/webp

# ===== 日志配置 =====
LOG_LEVEL=info                    # debug / info / warn / error
LOG_DIR=./logs                    # 日志目录路径

# ===== 视频生成配置 =====
VIDEO_POLL_INTERVAL=5000          # 轮询间隔（毫秒）
VIDEO_TIMEOUT=600000              # 超时时间（毫秒，10分钟）

# ===== WebSocket 配置 =====
WS_HEARTBEAT_INTERVAL=30000       # 心跳间隔（毫秒）
WS_HEARTBEAT_TIMEOUT=60000        # 心跳超时（毫秒）
```

---

## 配置项说明

### 环境配置

| 变量 | 说明 | 可选值 | 默认值 |
|------|------|--------|--------|
| NODE_ENV | 运行环境 | development / production | development |

**影响：**
- development：详细日志、控制台彩色输出、自动创建索引
- production：精简日志、关闭控制台输出、手动创建索引

---

### 数据库配置

| 变量 | 说明 | 格式示例 |
|------|------|---------|
| MONGODB_URI | MongoDB 连接字符串 | mongodb://localhost:27017/video-maker |

**支持格式：**
- 本地数据库：`mongodb://localhost:27017/database_name`
- MongoDB Atlas：`mongodb+srv://username:password@cluster.mongodb.net/database_name`
- 带认证：`mongodb://username:password@localhost:27017/database_name`

---

### 服务器配置

| 变量 | 说明 | 默认值 | 备注 |
|------|------|--------|------|
| SERVER_PORT | HTTP 服务器端口 | 3000 | 避免与其他服务冲突 |
| WS_PORT | WebSocket 服务器端口 | 3001 | 必须与前端配置一致 |

---

### 第三方 API 密钥

#### 视频生成服务

| 变量 | 服务商 | 获取地址 |
|------|--------|---------|
| RUNWAY_API_KEY | Runway ML | https://runwayml.com/api |
| PIKA_API_KEY | Pika Labs | https://pika.art/api |
| KLING_API_KEY | 快手可灵 | https://kling.ai/api |

**安全提示：**
- ❌ 切勿提交到 Git 仓库
- ✅ 使用 `.gitignore` 忽略 `.env` 文件
- ✅ 提供 `.env.example` 模板文件

---

#### LLM 服务

| 变量 | 服务商 | 获取地址 |
|------|--------|---------|
| OPENAI_API_KEY | OpenAI | https://platform.openai.com/api-keys |
| CLAUDE_API_KEY | Anthropic | https://console.anthropic.com/settings/keys |
| QWEN_API_KEY | 阿里云通义千问 | https://dashscope.aliyun.com/ |

---

### 服务商选择

| 变量 | 说明 | 可选值 | 影响 |
|------|------|--------|------|
| VIDEO_PROVIDER | 视频生成服务商 | runway / pika / kling | 决定使用哪个 services/video-*.js 文件 |
| LLM_PROVIDER | LLM 服务商 | openai / claude / qwen | 决定使用哪个 services/llm-*.js 文件 |

**切换方式：** 修改配置即可，无需修改代码

---

### 上传配置

| 变量 | 说明 | 默认值 | 备注 |
|------|------|--------|------|
| UPLOAD_MAX_SIZE | 最大文件大小 | 10485760 (10MB) | 单位：字节 |
| UPLOAD_DIR | 上传目录 | ./uploads | 相对于项目根目录 |
| ALLOWED_IMAGE_TYPES | 允许的图片类型 | image/jpeg,image/png,image/webp | 逗号分隔 |

---

### 日志配置

| 变量 | 说明 | 可选值 | 默认值 |
|------|------|--------|--------|
| LOG_LEVEL | 日志级别 | debug / info / warn / error | info |
| LOG_DIR | 日志目录 | 任意路径 | ./logs |

**日志级别说明：**
- `debug`：所有日志（开发环境）
- `info`：关键操作日志
- `warn`：警告信息
- `error`：仅错误日志

---

### 视频生成配置

| 变量 | 说明 | 默认值 | 备注 |
|------|------|--------|------|
| VIDEO_POLL_INTERVAL | 轮询间隔 | 5000 (5秒) | 单位：毫秒 |
| VIDEO_TIMEOUT | 超时时间 | 600000 (10分钟) | 单位：毫秒 |

**调整建议：**
- 轮询间隔：太短增加API调用成本，太长降低实时性
- 超时时间：根据不同服务商的生成速度调整

---

### WebSocket 配置

| 变量 | 说明 | 默认值 | 备注 |
|------|------|--------|------|
| WS_HEARTBEAT_INTERVAL | 心跳间隔 | 30000 (30秒) | 单位：毫秒 |
| WS_HEARTBEAT_TIMEOUT | 心跳超时 | 60000 (60秒) | 单位：毫秒 |

**说明：**
- 服务器每 `WS_HEARTBEAT_INTERVAL` 发送 ping
- 超过 `WS_HEARTBEAT_TIMEOUT` 未收到 pong 则断开连接

---

## 配置文件管理

### config.js 实现

**职责：** 加载和验证环境变量

**功能：**
- 使用 `dotenv` 加载 `.env` 文件
- 提供类型转换（字符串转数字）
- 配置验证（检查必需变量）
- 导出配置对象

**导出内容：**
```javascript
module.exports = {
  NODE_ENV,
  MONGODB_URI,
  SERVER_PORT,
  WS_PORT,
  RUNWAY_API_KEY,
  PIKA_API_KEY,
  KLING_API_KEY,
  OPENAI_API_KEY,
  CLAUDE_API_KEY,
  QWEN_API_KEY,
  VIDEO_PROVIDER,
  LLM_PROVIDER,
  UPLOAD_MAX_SIZE,
  UPLOAD_DIR,
  ALLOWED_IMAGE_TYPES,
  LOG_LEVEL,
  LOG_DIR,
  VIDEO_POLL_INTERVAL,
  VIDEO_TIMEOUT,
  WS_HEARTBEAT_INTERVAL,
  WS_HEARTBEAT_TIMEOUT
};
```

---

## .env.example 模板

```bash
# ===== 环境配置 =====
NODE_ENV=development

# ===== 数据库配置 =====
MONGODB_URI=mongodb://localhost:27017/video-maker

# ===== 服务器配置 =====
SERVER_PORT=3000
WS_PORT=3001

# ===== 第三方 API 密钥 =====
# 视频生成服务（至少配置一个）
RUNWAY_API_KEY=
PIKA_API_KEY=
KLING_API_KEY=

# LLM 服务（至少配置一个）
OPENAI_API_KEY=
CLAUDE_API_KEY=
QWEN_API_KEY=

# ===== 服务商选择 =====
VIDEO_PROVIDER=runway
LLM_PROVIDER=openai

# ===== 上传配置 =====
UPLOAD_MAX_SIZE=10485760
UPLOAD_DIR=./uploads
ALLOWED_IMAGE_TYPES=image/jpeg,image/png,image/webp

# ===== 日志配置 =====
LOG_LEVEL=info
LOG_DIR=./logs

# ===== 视频生成配置 =====
VIDEO_POLL_INTERVAL=5000
VIDEO_TIMEOUT=600000

# ===== WebSocket 配置 =====
WS_HEARTBEAT_INTERVAL=30000
WS_HEARTBEAT_TIMEOUT=60000
```

---

## 配置验证

### 必需配置检查

**启动时检查：**
- `MONGODB_URI` 必须存在
- `VIDEO_PROVIDER` 对应的 API Key 必须存在
- `LLM_PROVIDER` 对应的 API Key 必须存在

**验证逻辑：**
```
if VIDEO_PROVIDER = 'runway' then RUNWAY_API_KEY 必须有值
if VIDEO_PROVIDER = 'pika' then PIKA_API_KEY 必须有值
if LLM_PROVIDER = 'openai' then OPENAI_API_KEY 必须有值
```

**失败处理：**
- 打印详细错误信息
- 退出进程（`process.exit(1)`）

---

## 不同环境的配置

### 开发环境 (development)

```bash
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/video-maker-dev
SERVER_PORT=3000
LOG_LEVEL=debug
```

**特点：**
- 使用本地 MongoDB
- 详细日志输出
- 控制台彩色输出
- 自动创建数据库索引

---

### 生产环境 (production)

```bash
NODE_ENV=production
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/video-maker
SERVER_PORT=8080
LOG_LEVEL=error
```

**特点：**
- 使用 MongoDB Atlas（云服务）
- 仅错误日志
- 关闭控制台输出
- 手动创建索引

---

### 测试环境 (test)

```bash
NODE_ENV=test
MONGODB_URI=mongodb://localhost:27017/video-maker-test
SERVER_PORT=3002
LOG_LEVEL=warn
```

**特点：**
- 独立的测试数据库
- 不同端口避免冲突
- 警告级别日志

---

## 安全最佳实践

### 1. API 密钥保护

✅ **正确做法：**
- 使用 `.env` 文件存储密钥
- `.gitignore` 忽略 `.env` 文件
- 提供 `.env.example` 模板（不含真实密钥）
- 使用环境变量管理工具（如 AWS Secrets Manager）

❌ **错误做法：**
- 硬编码在代码中
- 提交到 Git 仓库
- 写在注释中

---

### 2. 不同环境使用不同密钥

- 开发环境：使用测试账号的 API Key
- 生产环境：使用生产账号的 API Key
- 避免开发调试消耗生产配额

---

### 3. 密钥轮换

- 定期更换 API 密钥
- 泄露后立即更换
- 记录密钥更换历史

---

## 配置管理工具

### dotenv

**用途：** 加载 `.env` 文件到 `process.env`

**使用：**
```javascript
require('dotenv').config();
```

---

### cross-env

**用途：** 跨平台设置环境变量

**使用：**
```json
{
  "scripts": {
    "start": "cross-env NODE_ENV=production node src/server.js",
    "dev": "cross-env NODE_ENV=development nodemon src/server.js"
  }
}
```

---

## 配置优先级

**加载顺序（从高到低）：**

1. 系统环境变量（`export VAR=value`）
2. `.env` 文件
3. 代码中的默认值

**说明：** 系统环境变量优先级最高，可以覆盖 `.env` 文件中的配置

---

## 常见问题

### Q1: 如何切换视频服务商？

**答：** 修改 `.env` 文件中的 `VIDEO_PROVIDER`，确保对应的 API Key 已配置

```bash
# 从 Runway 切换到 Pika
VIDEO_PROVIDER=pika
PIKA_API_KEY=your_pika_key
```

重启服务器即可生效

---

### Q2: MongoDB 连接失败怎么办？

**检查清单：**
- MongoDB 服务是否启动？
- `MONGODB_URI` 格式是否正确？
- 网络是否可达（云数据库检查防火墙）？
- 用户名密码是否正确？

---

### Q3: 如何增加上传文件大小限制？

**答：** 修改 `UPLOAD_MAX_SIZE`

```bash
# 改为 50MB
UPLOAD_MAX_SIZE=52428800
```

**注意：** 还需要检查 Nginx/反向代理的上传限制

---

### Q4: 生产环境日志太多怎么办？

**答：** 调整 `LOG_LEVEL`

```bash
# 只记录错误
LOG_LEVEL=error
```

---

## 总结

配置管理的核心原则：

✅ **集中管理**：所有配置都在 `.env` 文件
✅ **安全第一**：密钥不提交到代码仓库
✅ **环境分离**：开发/测试/生产使用不同配置
✅ **灵活切换**：修改配置即可切换服务商
✅ **验证机制**：启动时检查必需配置

适合快速迭代的 MVP 阶段，后续可引入配置中心（如 Consul、Nacos）进行统一管理。
