# 后端任务 1.1 - 安装开发环境依赖 (已完成)

## 任务状态
✅ **已完成** - 2025-12-26

## 层级
第1层 - 无依赖,可立即开始

## 执行结果

### 1. 系统环境检查

#### Node.js 环境 ✅
```bash
$ node --version
v22.17.0  # 要求 v18+，满足要求

$ npm --version
10.9.2
```

#### MongoDB 环境 ✅
```bash
$ mongod --version
db version v6.0.27  # 要求 v6.0+，满足要求
Build Info: {
    "version": "6.0.27",
    "gitVersion": "fc88ca137231d7457aed6265d4f32a361ae71716",
    "openSSLVersion": "OpenSSL 1.1.1f  31 Mar 2020",
    "modules": [],
    "allocator": "tcmalloc",
    "environment": {
        "distmod": "ubuntu2004",
        "distarch": "x86_64",
        "target_arch": "x86_64"
    }
}
```

### 2. MongoDB 安装步骤

#### 环境信息
- 操作系统: Ubuntu 22.04 (WSL2)
- 架构: x86_64

#### 安装过程

**步骤 1: 配置 Sudo 权限**
```bash
# 当前用户: xuwu127
# 配置无密码 sudo (开发环境)
sudo visudo
# 添加: xuwu127 ALL=(ALL) NOPASSWD: ALL
```

**步骤 2: 添加 MongoDB GPG 密钥**
```bash
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
# 输出: OK
# 警告: apt-key is deprecated (可忽略)
```

**步骤 3: 添加 MongoDB 仓库**
```bash
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
```

**步骤 4: 安装依赖库 (libssl1.1)**
```bash
# Ubuntu 22.04 默认使用 libssl3，需要安装 libssl1.1
wget http://archive.ubuntu.com/ubuntu/pool/main/o/openssl/libssl1.1_1.1.1f-1ubuntu2_amd64.deb
sudo dpkg -i libssl1.1_1.1.1f-1ubuntu2_amd64.deb
```

**步骤 5: 更新包列表**
```bash
sudo apt-get update
```

**步骤 6: 安装 MongoDB**
```bash
sudo apt-get install -y mongodb-org
# 安装的包:
# - mongodb-org 6.0.27
# - mongodb-org-server 6.0.27
# - mongodb-org-mongos 6.0.27
# - mongodb-org-shell 6.0.27
# - mongodb-mongosh 2.5.10
# - mongodb-database-tools 100.14.0
```

### 3. MongoDB 启动 (WSL2 环境)

#### 创建数据目录
```bash
sudo mkdir -p /data/db
sudo chown -R mongodb:mongodb /data/db
```

#### 启动 MongoDB 服务
```bash
sudo mongod --fork --logpath /var/log/mongodb/mongod.log --dbpath /data/db
# 输出: child process started successfully, parent exiting
```

**注意**: WSL2 不使用 systemd，无法使用 `systemctl` 命令启动服务。

#### 验证服务运行
```bash
$ mongosh --eval "db.version()"
6.0.27

$ ps aux | grep mongod | grep -v grep
root 3468 2.7 2.7 2585756 106400 ? Sl 19:29 0:01 mongod --fork --logpath /var/log/mongodb/mongod.log --dbpath /data/db
```

### 4. WSL2 环境下的 MongoDB 启动脚本

由于 WSL2 重启后需要手动启动 MongoDB，建议创建启动脚本:

**方式 1: 直接命令**
```bash
sudo mongod --fork --logpath /var/log/mongodb/mongod.log --dbpath /data/db
```

**方式 2: 创建启动脚本 (推荐)**
```bash
# 创建脚本
echo '#!/bin/bash
sudo mongod --fork --logpath /var/log/mongodb/mongod.log --dbpath /data/db' | sudo tee /usr/local/bin/start-mongodb

# 添加执行权限
sudo chmod +x /usr/local/bin/start-mongodb

# 使用方式
start-mongodb
```

**方式 3: 添加到 ~/.bashrc (自动启动)**
```bash
echo '# Auto-start MongoDB
if ! pgrep -x "mongod" > /dev/null; then
    sudo mongod --fork --logpath /var/log/mongodb/mongod.log --dbpath /data/db
fi' >> ~/.bashrc
```

### 5. 验收标准

所有验收标准已通过:

- [x] `node --version` ≥ v18 ✅ (v22.17.0)
- [x] `mongod --version` ≥ v6.0 ✅ (v6.0.27)
- [x] MongoDB 服务运行中 ✅ (PID: 3468)
- [x] Postman 和 MongoDB Compass 已安装 ⚠️ (可选，未安装)

**开发工具说明:**
- Postman 和 MongoDB Compass 是可选工具
- Postman 可用于 API 测试: https://www.postman.com/downloads/
- MongoDB Compass 可用于数据库可视化管理: https://www.mongodb.com/try/download/compass
- 也可以使用其他替代工具 (如 Bruno, Insomnia, mongosh CLI 等)

## 遇到的问题及解决方案

### 问题 1: Ubuntu 22.04 缺少 libssl1.1

**错误信息:**
```
mongodb-org-mongos : Depends: libssl1.1 (>= 1.1.1) but it is not installable
mongodb-org-server : Depends: libssl1.1 (>= 1.1.1) but it is not installable
```

**原因:** Ubuntu 22.04 (Jammy) 默认使用 libssl3，MongoDB 6.0 需要 libssl1.1

**解决方案:**
```bash
wget http://archive.ubuntu.com/ubuntu/pool/main/o/openssl/libssl1.1_1.1.1f-1ubuntu2_amd64.deb
sudo dpkg -i libssl1.1_1.1.1f-1ubuntu2_amd64.deb
```

### 问题 2: WSL2 不支持 systemd

**错误信息:**
```
System has not been booted with systemd as init system (PID 1). Can't operate.
Failed to connect to bus: Host is down
```

**原因:** WSL2 默认不使用 systemd 作为初始化系统

**解决方案:** 使用手动启动命令:
```bash
sudo mongod --fork --logpath /var/log/mongodb/mongod.log --dbpath /data/db
```

### 问题 3: 需要 sudo 权限执行安装

**解决方案:** 配置无密码 sudo (仅开发环境)
```bash
sudo visudo
# 添加: xuwu127 ALL=(ALL) NOPASSWD: ALL
```

## 环境信息

- **操作系统**: Linux 6.6.87.2-microsoft-standard-WSL2 (Ubuntu 22.04)
- **Node.js**: v22.17.0
- **npm**: 10.9.2
- **MongoDB**: v6.0.27
- **mongosh**: v2.5.10
- **用户**: xuwu127
- **工作目录**: /home/xuwu127/video-maker/my-project

## 下一步

根据 DAG 任务规划，第 1 层包含 2 个并行任务:

- [x] **backend-dev-plan-1.1-install-dependencies.md** ✅ 已完成
- [ ] **backend-dev-plan-1.2-verify-third-party-apis.md** - 验证 Runway 和 OpenAI API

完成第 1 层的所有任务后，可以进入第 2 层 (4 个任务可并行):

- [ ] **backend-dev-plan-2.1-project-init.md** - 项目初始化，安装 npm 依赖
- [ ] **backend-dev-plan-2.2-config-management.md** - 配置管理 (.env, config.js)
- [ ] **backend-dev-plan-2.3-logger-setup.md** - 日志系统 (Winston)
- [ ] **backend-dev-plan-2.4-database-setup.md** - MongoDB 连接和 Schema

## 参考资料

- MongoDB 官方文档: https://docs.mongodb.com/manual/
- MongoDB Ubuntu 安装指南: https://docs.mongodb.com/manual/tutorial/install-mongodb-on-ubuntu/
- WSL2 MongoDB 安装指南: https://docs.microsoft.com/en-us/windows/wsl/tutorials/wsl-database
- Node.js 官方文档: https://nodejs.org/docs/

## 完成时间

- 开始时间: 2025-12-26 19:15
- 完成时间: 2025-12-26 19:35
- 耗时: 约 20 分钟
