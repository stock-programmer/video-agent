# 后端任务 1.1 - 安装开发环境依赖

## 层级
第1层 - 无依赖,可立即开始

## 并行任务
- backend-dev-plan-1.2-verify-third-party-apis.md

## 任务目标
安装 Node.js, MongoDB 和开发工具

## 执行步骤

### 1. 检查系统环境
```bash
node --version  # 需要 v18+
npm --version
mongod --version  # 需要 v6.0+
```

### 2. 安装 Node.js (如未安装)
```bash
# 使用 nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18
```

### 3. 安装 MongoDB
**Ubuntu/WSL:**
```bash
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org
```

**启动 MongoDB:**
```bash
sudo systemctl start mongod
sudo systemctl enable mongod
mongosh --eval "db.version()"
```

### 4. 安装开发工具
- Postman: https://www.postman.com/downloads/
- MongoDB Compass: https://www.mongodb.com/try/download/compass

## 验收标准
- [ ] `node --version` ≥ v18
- [ ] `mongod --version` ≥ v6.0
- [ ] MongoDB 服务运行中
- [ ] Postman 和 MongoDB Compass 已安装

## 下一步
- backend-dev-plan-2.1-project-init.md
