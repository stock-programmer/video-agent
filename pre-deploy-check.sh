#!/bin/bash

################################################################################
# Video Maker Project - 部署前检查脚本
#
# 功能：
# - 检查环境变量配置
# - 验证 API Keys 有效性
# - 检查项目文件完整性
# - 检查端口占用情况
#
# 使用方法：
# chmod +x pre-deploy-check.sh
# ./pre-deploy-check.sh
################################################################################

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PASSED=0
FAILED=0
WARNINGS=0

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
    PASSED=$((PASSED + 1))
}

log_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
    WARNINGS=$((WARNINGS + 1))
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
    FAILED=$((FAILED + 1))
}

echo "=========================================="
echo "Video Maker 项目部署前检查"
echo "=========================================="
echo ""

PROJECT_DIR=$(pwd)
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"

################################################################################
# 1. 检查项目结构
################################################################################

log_info "1. 检查项目结构..."

if [ -d "$BACKEND_DIR" ]; then
    log_success "Backend 目录存在"
else
    log_error "Backend 目录不存在: $BACKEND_DIR"
fi

if [ -d "$FRONTEND_DIR" ]; then
    log_success "Frontend 目录存在"
else
    log_error "Frontend 目录不存在: $FRONTEND_DIR"
fi

# 检查关键文件
check_file() {
    if [ -f "$1" ]; then
        log_success "文件存在: $2"
        return 0
    else
        log_error "文件缺失: $2"
        return 1
    fi
}

check_file "$BACKEND_DIR/package.json" "backend/package.json"
check_file "$BACKEND_DIR/src/server.js" "backend/src/server.js"
check_file "$FRONTEND_DIR/package.json" "frontend/package.json"

echo ""

################################################################################
# 2. 检查环境变量
################################################################################

log_info "2. 检查环境变量配置..."

# 检查根目录 .env
if [ -f "$PROJECT_DIR/.env" ]; then
    log_success "根目录 .env 文件存在"

    # 读取环境变量 (使用 set +a 避免导出所有变量)
    set -a
    source "$PROJECT_DIR/.env" 2>/dev/null || true
    set +a

    if [ -n "$DASHSCOPE_API_KEY" ] && [ "$DASHSCOPE_API_KEY" != "your-dashscope-key" ]; then
        log_success "DASHSCOPE_API_KEY 已配置"
    else
        log_error "DASHSCOPE_API_KEY 未配置或使用默认值"
    fi

    if [ -n "$GOOGLE_API_KEY" ] && [ "$GOOGLE_API_KEY" != "your-google-key" ]; then
        log_success "GOOGLE_API_KEY 已配置"
    else
        log_error "GOOGLE_API_KEY 未配置或使用默认值"
    fi
else
    log_error "根目录 .env 文件不存在"
    log_info "请创建 .env 文件并配置以下内容:"
    echo "DASHSCOPE_API_KEY=your-dashscope-key"
    echo "GOOGLE_API_KEY=your-google-key"
fi

# 检查 backend/.env
if [ -f "$BACKEND_DIR/.env" ]; then
    log_success "backend/.env 文件存在"
else
    log_warning "backend/.env 文件不存在 (部署脚本会自动创建)"
fi

echo ""

################################################################################
# 3. 检查端口占用
################################################################################

log_info "3. 检查端口占用情况..."

check_port() {
    local port=$1
    local service=$2

    if command -v lsof &> /dev/null; then
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            log_warning "端口 $port ($service) 已被占用"
            lsof -Pi :$port -sTCP:LISTEN 2>/dev/null || true
        else
            log_success "端口 $port ($service) 可用"
        fi
    elif command -v netstat &> /dev/null; then
        if netstat -tuln 2>/dev/null | grep -q ":$port "; then
            log_warning "端口 $port ($service) 已被占用"
        else
            log_success "端口 $port ($service) 可用"
        fi
    else
        log_warning "无法检查端口占用 (lsof 和 netstat 都不可用)"
        return 0
    fi
}

check_port 3000 "Backend HTTP"
check_port 3001 "WebSocket"
check_port 80 "Nginx"
check_port 27017 "MongoDB"

echo ""

################################################################################
# 4. 检查系统依赖
################################################################################

log_info "4. 检查系统依赖..."

check_command() {
    local cmd=$1
    local name=$2

    if command -v "$cmd" &> /dev/null; then
        local version=$($cmd --version 2>&1 | head -n 1 || echo "unknown")
        log_success "$name 已安装: $version"
    else
        log_warning "$name 未安装 (部署脚本会自动安装)"
    fi
}

check_command node "Node.js"
check_command npm "npm"
check_command mongod "MongoDB"
check_command nginx "Nginx"
check_command pm2 "PM2"
check_command git "Git"

echo ""

################################################################################
# 5. 测试 API 连通性 (可选)
################################################################################

log_info "5. 测试第三方 API 连通性 (可选，需要配置 API Keys)..."

if [ -f "$PROJECT_DIR/.env" ]; then
    # 重新读取环境变量
    set -a
    source "$PROJECT_DIR/.env" 2>/dev/null || true
    set +a

    # 测试 DashScope API
    if [ -n "$DASHSCOPE_API_KEY" ] && [ "$DASHSCOPE_API_KEY" != "your-dashscope-key" ]; then
        log_info "测试 DashScope API..."
        RESPONSE=$(curl -s -w "%{http_code}" -o /dev/null \
            -X GET "https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis" \
            -H "Authorization: Bearer $DASHSCOPE_API_KEY" 2>&1 || echo "000")

        if [ "$RESPONSE" = "401" ] || [ "$RESPONSE" = "200" ] || [ "$RESPONSE" = "400" ]; then
            log_success "DashScope API 连接正常 (HTTP $RESPONSE)"
        else
            log_warning "DashScope API 连接异常 (HTTP $RESPONSE)"
        fi
    else
        log_warning "跳过 DashScope API 测试 (未配置 API Key)"
    fi

    # 测试 Google Gemini API
    if [ -n "$GOOGLE_API_KEY" ] && [ "$GOOGLE_API_KEY" != "your-google-key" ]; then
        log_info "测试 Google Gemini API..."
        RESPONSE=$(curl -s -w "%{http_code}" -o /dev/null \
            "https://generativelanguage.googleapis.com/v1beta/models?key=$GOOGLE_API_KEY" 2>&1 || echo "000")

        if [ "$RESPONSE" = "200" ]; then
            log_success "Google Gemini API 连接正常 (HTTP $RESPONSE)"
        else
            log_warning "Google Gemini API 连接异常 (HTTP $RESPONSE)"
        fi
    else
        log_warning "跳过 Google Gemini API 测试 (未配置 API Key)"
    fi
else
    log_warning "跳过 API 连通性测试 (.env 文件不存在)"
fi

echo ""

################################################################################
# 6. 检查磁盘空间
################################################################################

log_info "6. 检查磁盘空间..."

AVAILABLE_SPACE=$(df -h . | awk 'NR==2 {print $4}')
AVAILABLE_SPACE_GB=$(df -BG . | awk 'NR==2 {print $4}' | sed 's/G//' || echo "0")

if [ "$AVAILABLE_SPACE_GB" -ge 5 ] 2>/dev/null; then
    log_success "可用磁盘空间: $AVAILABLE_SPACE (充足)"
else
    log_warning "可用磁盘空间: $AVAILABLE_SPACE (建议至少 5GB)"
fi

echo ""

################################################################################
# 7. 检查内存
################################################################################

log_info "7. 检查系统内存..."

if command -v free &> /dev/null; then
    TOTAL_MEM=$(free -h 2>/dev/null | awk 'NR==2 {print $2}' || echo "unknown")
    AVAILABLE_MEM=$(free -h 2>/dev/null | awk 'NR==2 {print $7}' || echo "unknown")
    log_success "总内存: $TOTAL_MEM, 可用内存: $AVAILABLE_MEM"
else
    log_warning "无法检查内存信息 (free 命令不可用)"
fi

echo ""

################################################################################
# 总结
################################################################################

echo "=========================================="
echo "检查完成！"
echo "=========================================="
echo ""
echo -e "${GREEN}通过: $PASSED${NC}"
echo -e "${YELLOW}警告: $WARNINGS${NC}"
echo -e "${RED}失败: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}所有检查通过！可以开始部署。${NC}"
    echo ""
    echo "运行部署命令:"
    echo "  sudo ./deploy.sh"
    exit 0
elif [ $FAILED -eq 0 ]; then
    echo -e "${YELLOW}有警告项，但可以继续部署。${NC}"
    echo ""
    echo "运行部署命令:"
    echo "  sudo ./deploy.sh"
    exit 0
else
    echo -e "${RED}有严重问题，请先解决后再部署。${NC}"
    exit 1
fi
