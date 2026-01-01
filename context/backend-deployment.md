# 部署指南

## 文档信息
- **版本号**：v1.0
- **创建时间**：2025-12-24
- **状态**：MVP阶段部署指南

---

## 部署策略

### MVP 阶段部署方案

**核心原则：** 简单、快速、可用

**部署方式：** 单机部署（HTTP + WebSocket + MongoDB）

**不包含（MVP阶段）：**
- ❌ 负载均衡
- ❌ 多机集群
- ❌ Redis 缓存
- ❌ 消息队列
- ❌ CDN 加速

**包含：**
- ✅ PM2 进程管理
- ✅ MongoDB 持久化
- ✅ 日志记录
- ✅ 自动重启

---

## 服务器要求

### 最低配置

| 项目 | 要求 |
|------|------|
| CPU | 2核 |
| 内存 | 4GB |
| 磁盘 | 20GB SSD |
| 带宽 | 5Mbps |
| 系统 | Ubuntu 20.04+ / CentOS 7+ |

---

### 推荐配置

| 项目 | 推荐 |
|------|------|
| CPU | 4核 |
| 内存 | 8GB |
| 磁盘 | 50GB SSD |
| 带宽 | 10Mbps |
| 系统 | Ubuntu 22.04 LTS |

---

## 部署前准备

### 1. 安装 Node.js

**版本要求：** >= 18.x

**安装方式（Ubuntu）：**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version
npm --version
```

---

### 2. 安装 MongoDB

**方式一：本地安装（推荐用于开发/测试）**

```bash
# Ubuntu
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod
```

**方式二：使用 MongoDB Atlas（推荐用于生产）**

- 访问 https://www.mongodb.com/cloud/atlas
- 创建免费集群
- 获取连接字符串

---

### 3. 安装 PM2

**作用：** Node.js 进程管理器

```bash
sudo npm install -g pm2
pm2 --version
```

---

### 4. 安装 Nginx（可选，用于反向代理）

```bash
sudo apt-get install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

---

## 部署步骤

### 步骤 1: 拉取代码

```bash
# 克隆仓库
git clone https://github.com/your-repo/video-maker.git
cd video-maker/backend

# 或者使用 rsync 上传代码
rsync -avz --exclude 'node_modules' ./backend/ user@server:/opt/video-maker/backend/
```

---

### 步骤 2: 安装依赖

```bash
npm install --production
```

**说明：** `--production` 跳过 devDependencies

---

### 步骤 3: 配置环境变量

```bash
# 复制模板文件
cp .env.example .env

# 编辑配置
vi .env
```

**生产环境配置示例：**
```bash
NODE_ENV=production

# 数据库（使用 MongoDB Atlas）
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/video-maker

# 服务器
SERVER_PORT=3000
WS_PORT=3001

# 第三方 API 密钥（生产密钥）
RUNWAY_API_KEY=your_production_runway_key
OPENAI_API_KEY=your_production_openai_key

VIDEO_PROVIDER=runway
LLM_PROVIDER=openai

# 上传配置
UPLOAD_MAX_SIZE=10485760
UPLOAD_DIR=./uploads

# 日志配置
LOG_LEVEL=error
LOG_DIR=./logs
```

---

### 步骤 4: 创建必要目录

```bash
mkdir -p uploads
mkdir -p logs
chmod 755 uploads
chmod 755 logs
```

---

### 步骤 5: 启动服务（使用 PM2）

**创建 PM2 配置文件 `ecosystem.config.js`：**

```javascript
module.exports = {
  apps: [{
    name: 'video-maker-backend',
    script: './src/server.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    max_memory_restart: '1G',
    autorestart: true,
    watch: false
  }]
};
```

**启动服务：**
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

---

### 步骤 6: 验证部署

```bash
# 检查进程状态
pm2 status

# 查看日志
pm2 logs video-maker-backend

# 测试 API
curl http://localhost:3000/health

# 测试 WebSocket
curl -i -N -H "Connection: Upgrade" \
     -H "Upgrade: websocket" \
     http://localhost:3001
```

---

## Nginx 反向代理配置（可选）

### 配置文件

**创建 `/etc/nginx/sites-available/video-maker`：**

```nginx
# HTTP 服务
upstream backend_http {
    server 127.0.0.1:3000;
}

# WebSocket 服务
upstream backend_ws {
    server 127.0.0.1:3001;
}

server {
    listen 80;
    server_name your-domain.com;

    # 客户端最大上传大小
    client_max_body_size 10M;

    # HTTP API
    location /api/ {
        proxy_pass http://backend_http;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # WebSocket
    location /ws {
        proxy_pass http://backend_ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }
}
```

**启用配置：**
```bash
sudo ln -s /etc/nginx/sites-available/video-maker /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## HTTPS 配置（推荐）

### 使用 Let's Encrypt 免费证书

```bash
# 安装 Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# 获取证书并自动配置 Nginx
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo certbot renew --dry-run
```

**Nginx HTTPS 配置会自动添加：**
```nginx
listen 443 ssl;
ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
```

---

## 数据库管理

### MongoDB 备份

**手动备份：**
```bash
mongodump --uri="mongodb://localhost:27017/video-maker" --out=/backups/$(date +%Y%m%d)
```

**自动备份脚本 `backup-mongo.sh`：**

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/mongodb"
DB_NAME="video-maker"

# 创建备份
mongodump --uri="mongodb://localhost:27017/$DB_NAME" --out="$BACKUP_DIR/$DATE"

# 压缩
tar -czf "$BACKUP_DIR/$DATE.tar.gz" -C "$BACKUP_DIR" "$DATE"
rm -rf "$BACKUP_DIR/$DATE"

# 删除7天前的备份
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +7 -delete

echo "备份完成: $BACKUP_DIR/$DATE.tar.gz"
```

**添加定时任务：**
```bash
crontab -e

# 每天凌晨2点备份
0 2 * * * /opt/video-maker/scripts/backup-mongo.sh
```

---

### MongoDB 恢复

```bash
# 解压备份
tar -xzf /backups/mongodb/20251224_020000.tar.gz -C /tmp

# 恢复数据
mongorestore --uri="mongodb://localhost:27017/video-maker" /tmp/20251224_020000/video-maker
```

---

## 文件存储管理

### uploads 目录备份

**方式一：定期打包**
```bash
tar -czf /backups/uploads-$(date +%Y%m%d).tar.gz ./uploads
```

**方式二：同步到云存储（推荐）**
```bash
# 使用 rclone 同步到 AWS S3 / 阿里云 OSS
rclone sync ./uploads remote:bucket/uploads
```

---

### 迁移到对象存储（未来扩展）

**步骤：**
1. 修改图片上传逻辑，直接上传到 OSS
2. 数据库存储 OSS 完整 URL
3. 前端直接访问 OSS URL
4. 迁移历史文件到 OSS

---

## 日志管理

### 日志轮转

**使用 PM2 内置日志轮转：**

```bash
pm2 install pm2-logrotate

# 配置
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
```

---

### 日志查看

```bash
# 实时日志
pm2 logs video-maker-backend

# 错误日志
pm2 logs video-maker-backend --err

# 最近100行
pm2 logs video-maker-backend --lines 100
```

---

## 监控与运维

### PM2 监控

```bash
# 查看进程状态
pm2 status

# 查看详细信息
pm2 show video-maker-backend

# 实时监控
pm2 monit
```

---

### 服务器资源监控

**使用 htop：**
```bash
sudo apt-get install -y htop
htop
```

**使用 PM2 Plus（可选，云端监控）：**
```bash
pm2 link <secret> <public>
```

---

## 更新部署

### 滚动更新

**步骤：**

```bash
# 1. 拉取最新代码
git pull origin main

# 2. 安装新依赖
npm install --production

# 3. 重启服务（PM2 自动平滑重启）
pm2 reload video-maker-backend

# 4. 查看日志确认启动成功
pm2 logs video-maker-backend --lines 50
```

---

### 回滚

**方式一：使用 Git**
```bash
git log --oneline
git checkout <commit-hash>
npm install --production
pm2 reload video-maker-backend
```

**方式二：使用 PM2**
```bash
# 恢复到之前的版本（需要配置 Git）
pm2 delete video-maker-backend
git checkout <previous-commit>
pm2 start ecosystem.config.js
```

---

## 安全配置

### 1. 防火墙配置

**使用 ufw：**
```bash
sudo ufw allow 22/tcp        # SSH
sudo ufw allow 80/tcp        # HTTP
sudo ufw allow 443/tcp       # HTTPS
sudo ufw enable
```

**不对外开放：**
- 3000（HTTP 服务，通过 Nginx 反向代理）
- 3001（WebSocket 服务，通过 Nginx 反向代理）
- 27017（MongoDB，仅本地访问）

---

### 2. MongoDB 安全

**启用认证：**
```bash
# 创建管理员用户
mongo
use admin
db.createUser({
  user: "admin",
  pwd: "strong_password",
  roles: ["root"]
})

# 编辑配置文件
sudo vi /etc/mongod.conf

# 添加
security:
  authorization: enabled

# 重启 MongoDB
sudo systemctl restart mongod
```

**更新连接字符串：**
```
MONGODB_URI=mongodb://admin:password@localhost:27017/video-maker?authSource=admin
```

---

### 3. 环境变量保护

```bash
# 设置文件权限
chmod 600 .env

# 仅 owner 可读写
ls -l .env
-rw------- 1 user user 1234 Dec 24 10:00 .env
```

---

## 故障排查

### 服务启动失败

**检查清单：**
1. 环境变量是否正确配置？
2. MongoDB 是否正常运行？
3. 端口是否被占用？
4. 依赖是否完整安装？

**查看日志：**
```bash
pm2 logs video-maker-backend --err
tail -f logs/error.log
```

---

### MongoDB 连接失败

**检查：**
```bash
# MongoDB 是否运行
sudo systemctl status mongod

# 手动连接测试
mongo mongodb://localhost:27017/video-maker
```

---

### 文件上传失败

**检查：**
```bash
# uploads 目录是否存在
ls -ld uploads

# 权限是否正确
chmod 755 uploads

# 磁盘空间是否充足
df -h
```

---

## 性能优化

### 1. Node.js 优化

**增加内存限制：**
```javascript
// ecosystem.config.js
node_args: '--max-old-space-size=2048'
```

---

### 2. MongoDB 优化

**创建索引（手动）：**
```javascript
db.workspaces.createIndex({ order_index: 1 });
db.workspaces.createIndex({ "video.status": 1 });
```

**查询优化：**
- 使用 `.lean()` 返回普通对象
- 使用 projection 只查询需要的字段

---

### 3. Nginx 优化

**开启 gzip 压缩：**
```nginx
gzip on;
gzip_types application/json text/plain;
gzip_min_length 1000;
```

---

## 扩展方向（未来）

### 多机部署

**架构：**
```
Nginx (负载均衡)
  ├── Backend Server 1
  ├── Backend Server 2
  └── Backend Server 3

MongoDB Replica Set
  ├── Primary
  ├── Secondary 1
  └── Secondary 2
```

---

### Docker 容器化

**Dockerfile 示例：**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000 3001
CMD ["node", "src/server.js"]
```

**docker-compose.yml：**
```yaml
version: '3'
services:
  backend:
    build: .
    ports:
      - "3000:3000"
      - "3001:3001"
    environment:
      - NODE_ENV=production
    depends_on:
      - mongodb

  mongodb:
    image: mongo:6
    volumes:
      - mongo-data:/data/db

volumes:
  mongo-data:
```

---

## 部署检查清单

### 部署前

- [ ] 代码已测试通过
- [ ] 环境变量已配置
- [ ] 第三方 API 密钥已更新（生产密钥）
- [ ] 数据库备份策略已设置
- [ ] Nginx 配置已准备

---

### 部署后

- [ ] 服务正常启动（pm2 status）
- [ ] API 可访问（curl /health）
- [ ] WebSocket 可连接
- [ ] 数据库连接正常
- [ ] 图片上传正常
- [ ] 视频生成正常
- [ ] 日志正常记录
- [ ] 监控正常工作

---

## 总结

MVP 阶段部署的核心特点：

✅ **单机部署**：简单快速，满足初期需求
✅ **PM2 管理**：自动重启，进程守护
✅ **MongoDB 持久化**：数据安全，定期备份
✅ **Nginx 反向代理**：统一入口，HTTPS 支持
✅ **日志完善**：便于排查问题
✅ **易于扩展**：为未来多机部署预留架构空间

适合快速上线 MVP，验证产品方向，后续可根据业务增长逐步优化架构。
