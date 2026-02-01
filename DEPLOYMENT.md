# Video Maker 项目 - 阿里云部署指南

## 📋 目录

- [部署概述](#部署概述)
- [准备工作](#准备工作)
- [快速部署](#快速部署)
- [手动部署](#手动部署)
- [SSL/HTTPS 配置](#sslhttps-配置)
- [常见问题](#常见问题)
- [运维管理](#运维管理)

---

## 部署概述

本指南提供了在阿里云 ECS 服务器上部署 Video Maker 项目的详细步骤。

### 系统要求

- **操作系统**: Ubuntu 20.04/22.04 LTS
- **CPU**: 2核心或以上
- **内存**: 4GB 或以上
- **磁盘**: 至少 20GB 可用空间
- **网络**: 开放端口 80, 443, 22

### 技术栈

- **后端**: Node.js 18+ / Express / MongoDB / WebSocket
- **前端**: React 19 / TypeScript / Vite / TailwindCSS 4
- **Web 服务器**: Nginx
- **进程管理**: PM2
- **第三方服务**: DashScope (Qwen 视频生成) / Google Gemini (LLM)

---

## 准备工作

### 1. 购买阿里云 ECS 实例

1. 登录 [阿里云控制台](https://ecs.console.aliyun.com/)
2. 创建实例，选择配置:
   - **地域**: 根据目标用户选择
   - **实例规格**: ecs.t6-c1m2.large 或更高
   - **镜像**: Ubuntu 22.04 64位
   - **存储**: 系统盘 40GB + 数据盘 50GB (可选)
   - **网络**: 分配公网 IP，带宽 3Mbps 或更高

3. **配置安全组规则**:
   - 允许 SSH (22)
   - 允许 HTTP (80)
   - 允许 HTTPS (443)

### 2. 获取第三方 API 密钥

#### DashScope API (Qwen 视频生成)
1. 访问 [阿里云百炼](https://bailian.console.aliyun.com/)
2. 开通服务并创建 API Key
3. 保存密钥: `DASHSCOPE_API_KEY`

#### Google Gemini API (LLM 服务)
1. 访问 [Google AI Studio](https://aistudio.google.com/app/apikey)
2. 创建 API Key
3. 保存密钥: `GOOGLE_API_KEY`

### 3. 配置域名 (可选，推荐)

如果你有域名，配置 DNS A 记录指向 ECS 公网 IP:

```
类型: A
主机记录: @ 或 www
记录值: <你的 ECS 公网 IP>
TTL: 600
```

---

## 快速部署

### 步骤 1: 连接到服务器

```bash
ssh root@<your_server_ip>
```

### 步骤 2: 上传项目文件

**方法 1: Git 克隆 (推荐)**

```bash
cd /opt
git clone <your_git_repo_url> video-maker
cd video-maker
```

**方法 2: SCP 上传**

在本地机器上执行:

```bash
scp -r /path/to/my-project root@<your_server_ip>:/opt/video-maker
```

### 步骤 3: 配置环境变量

```bash
cd /opt/video-maker

# 创建根目录 .env 文件
cat > .env <<EOF
DASHSCOPE_API_KEY=your-dashscope-api-key-here
GOOGLE_API_KEY=your-google-api-key-here
EOF

# 检查 backend/.env 配置
# (部署脚本会自动创建，但你也可以手动编辑)
```

### 步骤 4: 运行部署前检查 (可选)

```bash
chmod +x pre-deploy-check.sh
./pre-deploy-check.sh
```

这个脚本会检查:
- 项目文件完整性
- 环境变量配置
- 端口占用情况
- 第三方 API 连通性

### 步骤 5: 执行一键部署

```bash
chmod +x deploy.sh

# 编辑部署脚本，修改域名/IP
vim deploy.sh
# 找到这一行: DOMAIN_OR_IP="your_server_ip_or_domain"
# 修改为: DOMAIN_OR_IP="123.45.67.89" 或 "your-domain.com"

# 运行部署
sudo ./deploy.sh
```

部署脚本会自动完成:
- ✅ 安装 Node.js, MongoDB, Nginx, PM2
- ✅ 配置 MongoDB
- ✅ 安装项目依赖
- ✅ 构建前端
- ✅ 配置 Nginx 反向代理
- ✅ 使用 PM2 启动后端

### 步骤 6: 验证部署

访问服务器 IP 或域名:

```
http://your_server_ip
```

你应该能看到项目首页。

---

## SSL/HTTPS 配置

部署完成后，强烈建议配置 HTTPS:

### 前提条件
- 已完成基础部署
- 已配置域名并解析到服务器
- 开放 80 和 443 端口

### 执行 SSL 配置

```bash
cd /opt/video-maker
chmod +x setup-ssl.sh

# 运行 SSL 配置脚本
sudo ./setup-ssl.sh your-domain.com
```

脚本会自动:
- ✅ 安装 Certbot
- ✅ 申请 Let's Encrypt 免费证书
- ✅ 配置 Nginx HTTPS
- ✅ 设置 HTTP 自动重定向到 HTTPS
- ✅ 配置证书自动续期

完成后访问:

```
https://your-domain.com
```

---

## 手动部署

如果你希望逐步执行部署，可以参考以下手动步骤:

<details>
<summary>点击展开手动部署步骤</summary>

### 1. 安装 Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v  # 验证安装
```

### 2. 安装 MongoDB

```bash
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org

# 启动 MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod
```

### 3. 安装 Nginx

```bash
sudo apt-get install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 4. 安装 PM2

```bash
sudo npm install -g pm2
```

### 5. 配置后端

```bash
cd /opt/video-maker/backend

# 安装依赖
npm install --production

# 配置环境变量
cp .env.example .env
vim .env  # 编辑配置

# 创建必要目录
mkdir -p uploads logs
```

### 6. 构建前端

```bash
cd /opt/video-maker/frontend

# 安装依赖
npm install

# 构建
npm run build
```

### 7. 配置 Nginx

```bash
sudo vim /etc/nginx/sites-available/video-maker
```

配置内容参考 `deploy.sh` 中的 Nginx 配置块。

```bash
sudo ln -s /etc/nginx/sites-available/video-maker /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

### 8. 启动后端

```bash
cd /opt/video-maker/backend
pm2 start src/server.js --name video-maker-backend
pm2 save
pm2 startup
```

</details>

---

## 常见问题

### Q1: 部署脚本执行失败怎么办?

**A**: 检查错误日志，常见原因:
- 端口被占用 (用 `lsof -i :3000` 检查)
- MongoDB 未启动 (用 `systemctl status mongod` 检查)
- 环境变量未配置 (检查 `.env` 文件)

### Q2: 如何查看后端日志?

**A**: 使用以下命令:

```bash
# PM2 日志
pm2 logs video-maker-backend

# 应用日志
tail -f /opt/video-maker/backend/logs/combined.log

# Nginx 错误日志
tail -f /var/log/nginx/video-maker-error.log
```

### Q3: 如何更新部署?

**A**:

```bash
# 拉取最新代码
cd /opt/video-maker
git pull

# 重新构建前端
cd frontend
npm install
npm run build

# 重启后端
cd ../backend
npm install --production
pm2 restart video-maker-backend

# 重新加载 Nginx
sudo systemctl reload nginx
```

### Q4: 视频生成失败怎么办?

**A**: 检查:
1. DashScope API Key 是否正确
2. 服务器是否能访问 DashScope API (检查防火墙)
3. 查看后端日志获取详细错误信息

### Q5: WebSocket 连接失败?

**A**: 检查:
1. Nginx WebSocket 代理配置是否正确
2. 端口 3001 是否被占用
3. 防火墙是否开放 WebSocket 端口

### Q6: 如何配置多个域名?

**A**: 在 Nginx 配置中添加 `server_name`:

```nginx
server_name domain1.com domain2.com www.domain1.com;
```

### Q7: 数据库备份怎么做?

**A**:

```bash
# 备份
mongodump --db video-maker --out /backup/mongodb/$(date +%Y%m%d)

# 恢复
mongorestore --db video-maker /backup/mongodb/20250131/video-maker
```

---

## 运维管理

### 日常监控

```bash
# 检查服务状态
pm2 status
systemctl status mongod
systemctl status nginx

# 查看资源使用
pm2 monit
htop

# 查看磁盘空间
df -h

# 查看日志
pm2 logs
```

### 性能优化

**1. 启用 Gzip 压缩**

编辑 `/etc/nginx/nginx.conf`:

```nginx
gzip on;
gzip_vary on;
gzip_proxied any;
gzip_comp_level 6;
gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss;
```

**2. 配置 MongoDB 索引**

```bash
mongosh
use video-maker
db.workspaces.createIndex({ order_index: 1 })
db.workspaces.createIndex({ "video.status": 1 })
```

**3. PM2 集群模式** (多核服务器)

```bash
pm2 delete video-maker-backend
pm2 start src/server.js -i max --name video-maker-backend
```

### 安全加固

**1. 配置防火墙**

```bash
sudo ufw enable
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
```

**2. 禁用 root SSH 登录**

编辑 `/etc/ssh/sshd_config`:

```
PermitRootLogin no
```

**3. 配置自动安全更新**

```bash
sudo apt-get install unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

### 自动化运维

**1. 定时备份数据库**

```bash
crontab -e

# 每天凌晨 2 点备份
0 2 * * * mongodump --db video-maker --out /backup/mongodb/$(date +\%Y\%m\%d)
```

**2. 日志轮转**

PM2 会自动管理日志，但可以配置:

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

---

## 技术支持

如遇到问题，请检查:

1. **日志文件**:
   - 后端日志: `/opt/video-maker/backend/logs/`
   - PM2 日志: `~/.pm2/logs/`
   - Nginx 日志: `/var/log/nginx/`

2. **服务状态**:
   ```bash
   pm2 status
   systemctl status mongod
   systemctl status nginx
   ```

3. **网络连通性**:
   ```bash
   curl http://localhost:3000/api/workspaces
   curl http://localhost/api/workspaces
   ```

---

## 附录: 目录结构

部署后的目录结构:

```
/opt/video-maker/
├── backend/
│   ├── src/
│   ├── uploads/          # 用户上传的图片
│   ├── logs/             # 应用日志
│   ├── .env              # 环境变量
│   └── package.json
├── frontend/
│   ├── dist/             # 构建产物
│   └── package.json
├── deploy.sh             # 部署脚本
├── pre-deploy-check.sh   # 检查脚本
├── setup-ssl.sh          # SSL 配置脚本
└── .env                  # 根目录环境变量
```

---

**最后更新**: 2025-01-31
**版本**: v1.1
