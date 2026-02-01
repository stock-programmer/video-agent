#!/bin/bash

################################################################################
# Video Maker Project - 一键部署脚本 (Ubuntu 20.04/22.04)
#
# 功能：
# - 自动安装所有依赖 (Node.js, MongoDB, Nginx, PM2)
# - 配置 MongoDB
# - 构建前端
# - 配置 Nginx 反向代理
# - 使用 PM2 管理后端进程
#
# 使用方法：
# 1. 上传整个项目到服务器 (推荐路径: /opt/video-maker)
# 2. chmod +x deploy.sh
# 3. sudo ./deploy.sh
################################################################################

set -e  # 遇到错误立即退出

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查是否以 root 权限运行
if [[ $EUID -ne 0 ]]; then
   log_error "此脚本必须以 root 权限运行 (使用 sudo)"
   exit 1
fi

################################################################################
# 配置变量 (请根据实际情况修改)
################################################################################

# 项目路径
PROJECT_DIR=$(pwd)
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"

# 服务器配置
SERVER_PORT=3000
WS_PORT=3001
NGINX_PORT=80
DOMAIN_OR_IP="your_server_ip_or_domain"  # 修改为你的服务器 IP 或域名

# MongoDB 配置
MONGO_DB_NAME="video-maker"
MONGO_URI="mongodb://localhost:27017/$MONGO_DB_NAME"

# Node.js 版本 (与本地开发环境保持一致)
NODE_VERSION="22"

log_info "=========================================="
log_info "Video Maker 项目一键部署开始"
log_info "项目路径: $PROJECT_DIR"
log_info "=========================================="

################################################################################
# 步骤 1: 检查环境变量
################################################################################

log_info "步骤 1: 检查环境变量配置..."

if [ ! -f "$PROJECT_DIR/.env" ]; then
    log_error "未找到根目录 .env 文件"
    log_info "请先配置 .env 文件，包含以下内容:"
    echo "DASHSCOPE_API_KEY=your-dashscope-key"
    echo "GOOGLE_API_KEY=your-google-key"
    exit 1
fi

if [ ! -f "$BACKEND_DIR/.env" ]; then
    log_warning "未找到 backend/.env 文件，正在从 .env.example 创建..."
    if [ -f "$BACKEND_DIR/.env.example" ]; then
        cp "$BACKEND_DIR/.env.example" "$BACKEND_DIR/.env"
        log_success "已创建 backend/.env 模板文件，请编辑配置"
        # 读取根目录的 API keys
        source "$PROJECT_DIR/.env"
        # 更新 backend/.env 中的配置
        sed -i "s|MONGODB_URI=.*|MONGODB_URI=$MONGO_URI|g" "$BACKEND_DIR/.env"
        sed -i "s|SERVER_PORT=.*|SERVER_PORT=$SERVER_PORT|g" "$BACKEND_DIR/.env"
        sed -i "s|WS_PORT=.*|WS_PORT=$WS_PORT|g" "$BACKEND_DIR/.env"
        sed -i "s|DASHSCOPE_API_KEY=.*|DASHSCOPE_API_KEY=$DASHSCOPE_API_KEY|g" "$BACKEND_DIR/.env"
        sed -i "s|GOOGLE_API_KEY=.*|GOOGLE_API_KEY=$GOOGLE_API_KEY|g" "$BACKEND_DIR/.env"
        log_success "已自动配置 backend/.env"
    else
        log_error "未找到 backend/.env.example 模板文件"
        exit 1
    fi
fi

log_success "环境变量检查完成"

################################################################################
# 步骤 2: 更新系统并安装基础工具
################################################################################

log_info "步骤 2: 更新系统并安装基础工具..."

apt-get update -y
apt-get install -y curl wget git build-essential

log_success "系统更新完成"

################################################################################
# 步骤 3: 安装 Node.js
################################################################################

log_info "步骤 3: 安装 Node.js $NODE_VERSION..."

if command -v node &> /dev/null; then
    CURRENT_NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$CURRENT_NODE_VERSION" -ge "$NODE_VERSION" ]; then
        log_success "Node.js 已安装 ($(node -v))"
    else
        log_warning "Node.js 版本过低，正在升级..."
        curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
        apt-get install -y nodejs
    fi
else
    log_info "正在安装 Node.js $NODE_VERSION..."
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
    apt-get install -y nodejs
fi

log_success "Node.js 安装完成: $(node -v), npm: $(npm -v)"

# 配置 npm 淘宝镜像源 (解决国内网络问题)
log_info "配置 npm 淘宝镜像源..."
npm config set registry https://registry.npmmirror.com
log_success "npm 镜像源已配置为: $(npm config get registry)"

################################################################################
# 步骤 4: 安装 MongoDB
################################################################################

log_info "步骤 4: 安装和配置 MongoDB..."

if command -v mongod &> /dev/null; then
    log_success "MongoDB 已安装 ($(mongod --version | head -n 1))"
else
    log_info "正在安装 MongoDB..."

    # 导入 MongoDB 公钥
    wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | apt-key add -

    # 添加 MongoDB 源
    echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/6.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-6.0.list

    # 更新并安装
    apt-get update -y
    apt-get install -y mongodb-org

    # 启动 MongoDB
    systemctl start mongod
    systemctl enable mongod

    log_success "MongoDB 安装并启动成功"
fi

# 检查 MongoDB 是否运行
if systemctl is-active --quiet mongod; then
    log_success "MongoDB 运行中"
else
    log_warning "MongoDB 未运行，正在启动..."
    systemctl start mongod
    sleep 3
    if systemctl is-active --quiet mongod; then
        log_success "MongoDB 启动成功"
    else
        log_error "MongoDB 启动失败，请手动检查"
        exit 1
    fi
fi

################################################################################
# 步骤 5: 安装 PM2
################################################################################

log_info "步骤 5: 安装 PM2 进程管理器..."

if command -v pm2 &> /dev/null; then
    log_success "PM2 已安装 ($(pm2 -v))"
else
    npm install -g pm2
    log_success "PM2 安装完成"
fi

################################################################################
# 步骤 6: 安装 Nginx
################################################################################

log_info "步骤 6: 安装 Nginx..."

if command -v nginx &> /dev/null; then
    log_success "Nginx 已安装 ($(nginx -v 2>&1 | cut -d'/' -f2))"
else
    apt-get install -y nginx
    systemctl start nginx
    systemctl enable nginx
    log_success "Nginx 安装并启动成功"
fi

################################################################################
# 步骤 7: 安装后端依赖
################################################################################

log_info "步骤 7: 安装后端依赖..."

cd "$BACKEND_DIR"

if [ ! -d "node_modules" ]; then
    log_info "正在安装后端依赖..."
    npm install --production --legacy-peer-deps
    log_success "后端依赖安装完成"
else
    log_info "后端依赖已存在，正在更新..."
    npm install --production --legacy-peer-deps
    log_success "后端依赖更新完成"
fi

# 创建必要的目录
mkdir -p uploads logs

log_success "后端准备完成"

################################################################################
# 步骤 8: 构建前端
################################################################################

log_info "步骤 8: 构建前端..."

cd "$FRONTEND_DIR"

if [ ! -d "node_modules" ]; then
    log_info "正在安装前端依赖..."
    npm install --legacy-peer-deps
    log_success "前端依赖安装完成"
else
    log_info "前端依赖已存在，正在更新..."
    npm install --legacy-peer-deps
    log_success "前端依赖更新完成"
fi

log_info "正在构建前端..."
npm run build

if [ -d "dist" ]; then
    log_success "前端构建完成，产物位于: $FRONTEND_DIR/dist"
else
    log_error "前端构建失败，未找到 dist 目录"
    exit 1
fi

################################################################################
# 步骤 9: 配置 Nginx
################################################################################

log_info "步骤 9: 配置 Nginx 反向代理..."

NGINX_CONFIG_FILE="/etc/nginx/sites-available/video-maker"
NGINX_ENABLED_FILE="/etc/nginx/sites-enabled/video-maker"

cat > "$NGINX_CONFIG_FILE" <<EOF
server {
    listen $NGINX_PORT;
    server_name $DOMAIN_OR_IP;

    # 前端静态文件
    location / {
        root $FRONTEND_DIR/dist;
        try_files \$uri \$uri/ /index.html;

        # 添加缓存头
        expires 1h;
        add_header Cache-Control "public, immutable";
    }

    # 后端 API 反向代理
    location /api/ {
        proxy_pass http://localhost:$SERVER_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # 上传文件访问
    location /uploads/ {
        alias $BACKEND_DIR/uploads/;
        expires 7d;
        add_header Cache-Control "public, immutable";
    }

    # WebSocket 代理
    location /ws {
        proxy_pass http://localhost:$WS_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }

    # 日志配置
    access_log /var/log/nginx/video-maker-access.log;
    error_log /var/log/nginx/video-maker-error.log;
}
EOF

# 创建符号链接
if [ -L "$NGINX_ENABLED_FILE" ]; then
    rm "$NGINX_ENABLED_FILE"
fi
ln -s "$NGINX_CONFIG_FILE" "$NGINX_ENABLED_FILE"

# 删除默认站点
if [ -L "/etc/nginx/sites-enabled/default" ]; then
    rm /etc/nginx/sites-enabled/default
fi

# 测试 Nginx 配置
if nginx -t; then
    log_success "Nginx 配置测试通过"
    systemctl reload nginx
    log_success "Nginx 重新加载完成"
else
    log_error "Nginx 配置测试失败，请检查配置文件"
    exit 1
fi

################################################################################
# 步骤 10: 使用 PM2 启动后端
################################################################################

log_info "步骤 10: 使用 PM2 启动后端服务..."

cd "$BACKEND_DIR"

# 停止旧进程 (如果存在)
if pm2 describe video-maker-backend &> /dev/null; then
    log_info "检测到旧进程，正在停止..."
    pm2 delete video-maker-backend
fi

# 启动后端
pm2 start src/server.js --name video-maker-backend --time

# 设置开机自启
pm2 save
pm2 startup systemd -u root --hp /root

log_success "后端服务启动完成"

# 显示 PM2 状态
pm2 status

################################################################################
# 步骤 11: 配置防火墙 (如果启用)
################################################################################

log_info "步骤 11: 配置防火墙规则..."

if command -v ufw &> /dev/null && ufw status | grep -q "Status: active"; then
    log_info "检测到 UFW 防火墙，正在配置规则..."
    ufw allow $NGINX_PORT/tcp comment 'Nginx HTTP'
    ufw allow 22/tcp comment 'SSH'
    log_success "防火墙规则配置完成"
else
    log_warning "未检测到 UFW 防火墙或未启用"
    log_info "请确保在阿里云安全组中开放以下端口: $NGINX_PORT, 22"
fi

################################################################################
# 步骤 12: 验证部署
################################################################################

log_info "步骤 12: 验证部署状态..."

sleep 3

# 检查后端健康状态
if curl -s http://localhost:$SERVER_PORT/api/workspaces > /dev/null; then
    log_success "后端 API 响应正常"
else
    log_warning "后端 API 未响应，请检查日志"
fi

# 检查 Nginx
if curl -s http://localhost:$NGINX_PORT > /dev/null; then
    log_success "Nginx 服务正常"
else
    log_warning "Nginx 服务未响应"
fi

################################################################################
# 部署完成
################################################################################

log_success "=========================================="
log_success "部署完成！"
log_success "=========================================="

echo ""
log_info "服务访问地址:"
echo "  前端: http://$DOMAIN_OR_IP"
echo "  后端 API: http://$DOMAIN_OR_IP/api"
echo "  WebSocket: ws://$DOMAIN_OR_IP/ws"
echo ""

log_info "重要文件路径:"
echo "  项目目录: $PROJECT_DIR"
echo "  后端日志: $BACKEND_DIR/logs/"
echo "  PM2 日志: ~/.pm2/logs/"
echo "  Nginx 日志: /var/log/nginx/video-maker-*.log"
echo ""

log_info "常用命令:"
echo "  查看后端日志: pm2 logs video-maker-backend"
echo "  重启后端: pm2 restart video-maker-backend"
echo "  查看后端状态: pm2 status"
echo "  重启 Nginx: systemctl restart nginx"
echo "  查看 Nginx 日志: tail -f /var/log/nginx/video-maker-error.log"
echo ""

log_warning "下一步操作:"
echo "  1. 修改脚本顶部的 DOMAIN_OR_IP 变量为你的实际域名或 IP"
echo "  2. 在阿里云安全组中开放端口 $NGINX_PORT (HTTP)"
echo "  3. 配置 SSL 证书 (可选，推荐): 使用 certbot 申请 Let's Encrypt 证书"
echo "  4. 测试应用功能: 访问 http://$DOMAIN_OR_IP"
echo ""

log_success "部署脚本执行完毕！"
