#!/bin/bash

################################################################################
# Video Maker Project - SSL/HTTPS 配置脚本
#
# 功能：
# - 自动安装 Certbot
# - 申请 Let's Encrypt 免费 SSL 证书
# - 配置 Nginx HTTPS
# - 设置自动续期
#
# 前提条件：
# - 已完成基础部署 (deploy.sh)
# - 已配置域名解析到服务器 IP
# - 服务器 80 和 443 端口已开放
#
# 使用方法：
# 1. 确保域名已解析到服务器
# 2. chmod +x setup-ssl.sh
# 3. sudo ./setup-ssl.sh your-domain.com
################################################################################

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# 检查参数
if [ -z "$1" ]; then
    log_error "请提供域名参数"
    echo "使用方法: sudo ./setup-ssl.sh your-domain.com"
    exit 1
fi

DOMAIN=$1
EMAIL="admin@$DOMAIN"  # 修改为你的邮箱

log_info "=========================================="
log_info "为域名 $DOMAIN 配置 SSL 证书"
log_info "=========================================="

PROJECT_DIR=$(pwd)
FRONTEND_DIR="$PROJECT_DIR/frontend"

################################################################################
# 步骤 1: 验证域名解析
################################################################################

log_info "步骤 1: 验证域名解析..."

# 检查必要的工具
if ! command -v curl &> /dev/null; then
    log_error "curl 未安装，请先安装: apt-get install curl"
    exit 1
fi

if ! command -v dig &> /dev/null; then
    log_error "dig 未安装，请先安装: apt-get install dnsutils"
    exit 1
fi

# 获取服务器公网 IP
log_info "正在获取服务器公网 IP..."

# 尝试多个 IP 查询服务（带超时）
get_public_ip() {
    local ip=""

    # 方法1: 阿里云元数据服务（最快，适用于阿里云 ECS）
    ip=$(curl -s --connect-timeout 3 --max-time 5 http://100.100.100.200/latest/meta-data/public-ipv4 2>/dev/null)
    if [ -n "$ip" ] && [[ "$ip" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        echo "$ip"
        return 0
    fi

    # 方法2: ifconfig.me
    ip=$(curl -s --connect-timeout 3 --max-time 5 ifconfig.me 2>/dev/null)
    if [ -n "$ip" ] && [[ "$ip" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        echo "$ip"
        return 0
    fi

    # 方法3: icanhazip.com
    ip=$(curl -s --connect-timeout 3 --max-time 5 icanhazip.com 2>/dev/null)
    if [ -n "$ip" ] && [[ "$ip" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        echo "$ip"
        return 0
    fi

    # 方法4: ipinfo.io
    ip=$(curl -s --connect-timeout 3 --max-time 5 ipinfo.io/ip 2>/dev/null)
    if [ -n "$ip" ] && [[ "$ip" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        echo "$ip"
        return 0
    fi

    return 1
}

SERVER_IP=$(get_public_ip)

if [ -z "$SERVER_IP" ]; then
    log_warning "无法自动获取服务器公网 IP"
    log_info "请手动输入服务器公网 IP（或按 Enter 跳过验证）:"
    read -p "服务器 IP: " MANUAL_IP

    if [ -n "$MANUAL_IP" ]; then
        SERVER_IP="$MANUAL_IP"
        log_info "使用手动指定的 IP: $SERVER_IP"
    else
        log_warning "跳过 IP 验证，继续执行..."
        SERVER_IP="skip"
    fi
else
    log_success "服务器公网 IP: $SERVER_IP"
fi

# 检查域名解析
log_info "正在检查域名解析..."
DOMAIN_IP=$(dig +short $DOMAIN | tail -n1)

if [ -z "$DOMAIN_IP" ]; then
    log_error "域名 $DOMAIN 无法解析"
    if [ "$SERVER_IP" != "skip" ]; then
        log_info "请先配置 DNS A 记录指向: $SERVER_IP"
    fi
    read -p "域名未解析，是否继续？(y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    log_info "域名解析到: $DOMAIN_IP"

    if [ "$SERVER_IP" != "skip" ]; then
        if [ "$DOMAIN_IP" = "$SERVER_IP" ]; then
            log_success "域名解析正确: $DOMAIN -> $SERVER_IP"
        else
            log_warning "域名解析不匹配!"
            log_info "域名解析到: $DOMAIN_IP"
            log_info "服务器 IP: $SERVER_IP"
            read -p "是否继续？(y/N): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                exit 1
            fi
        fi
    else
        log_success "域名已解析 (未验证 IP 匹配)"
    fi
fi

################################################################################
# 步骤 2: 安装 Certbot
################################################################################

log_info "步骤 2: 安装 Certbot..."

if command -v certbot &> /dev/null; then
    log_success "Certbot 已安装 ($(certbot --version | head -n1))"
else
    log_info "正在安装 Certbot..."
    apt-get update -y
    apt-get install -y certbot python3-certbot-nginx
    log_success "Certbot 安装完成"
fi

################################################################################
# 步骤 3: 申请 SSL 证书
################################################################################

log_info "步骤 3: 申请 Let's Encrypt SSL 证书..."

# 检查证书是否已存在
if [ -d "/etc/letsencrypt/live/$DOMAIN" ]; then
    log_warning "证书已存在，正在续期..."
    certbot renew --nginx --non-interactive
    log_success "证书续期完成"
else
    log_info "正在申请新证书..."

    # 使用 Nginx 插件自动配置
    certbot --nginx \
        -d $DOMAIN \
        --non-interactive \
        --agree-tos \
        --email $EMAIL \
        --redirect

    if [ $? -eq 0 ]; then
        log_success "SSL 证书申请成功！"
    else
        log_error "SSL 证书申请失败"
        exit 1
    fi
fi

################################################################################
# 步骤 4: 优化 Nginx SSL 配置
################################################################################

log_info "步骤 4: 优化 Nginx SSL 配置..."

NGINX_CONFIG="/etc/nginx/sites-available/video-maker"

# 备份原配置
cp $NGINX_CONFIG ${NGINX_CONFIG}.bak

# 更新 Nginx 配置 (Certbot 已经添加了基本的 SSL 配置)
# 这里添加额外的安全优化

cat > /etc/nginx/snippets/ssl-params.conf <<'EOF'
# SSL 配置优化
ssl_protocols TLSv1.2 TLSv1.3;
ssl_prefer_server_ciphers on;
ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-SHA384;
ssl_ecdh_curve secp384r1;
ssl_session_timeout 10m;
ssl_session_cache shared:SSL:10m;
ssl_session_tickets off;
ssl_stapling on;
ssl_stapling_verify on;

# 安全头
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
add_header X-Frame-Options DENY always;
add_header X-Content-Type-Options nosniff always;
add_header X-XSS-Protection "1; mode=block" always;
EOF

log_success "SSL 优化配置创建完成"

# 在 server 块中引用优化配置
if ! grep -q "ssl-params.conf" $NGINX_CONFIG; then
    # 在 managed by Certbot 的行之后添加
    sed -i '/managed by Certbot/a \    include snippets/ssl-params.conf;' $NGINX_CONFIG
    log_success "已添加 SSL 优化配置到 Nginx"
fi

# 测试 Nginx 配置
if nginx -t; then
    log_success "Nginx 配置测试通过"
    systemctl reload nginx
    log_success "Nginx 重新加载完成"
else
    log_error "Nginx 配置测试失败"
    cp ${NGINX_CONFIG}.bak $NGINX_CONFIG
    log_info "已恢复原配置"
    exit 1
fi

################################################################################
# 步骤 5: 设置自动续期
################################################################################

log_info "步骤 5: 配置证书自动续期..."

# Certbot 会自动创建 systemd timer
if systemctl is-enabled certbot.timer &> /dev/null; then
    log_success "证书自动续期已配置 (certbot.timer)"
else
    # 手动添加 cron 任务
    CRON_CMD="0 3 * * * /usr/bin/certbot renew --quiet --nginx"

    if ! crontab -l 2>/dev/null | grep -q "certbot renew"; then
        (crontab -l 2>/dev/null; echo "$CRON_CMD") | crontab -
        log_success "已添加证书续期 cron 任务 (每天凌晨3点)"
    else
        log_success "证书续期 cron 任务已存在"
    fi
fi

################################################################################
# 步骤 6: 配置防火墙
################################################################################

log_info "步骤 6: 配置防火墙..."

if command -v ufw &> /dev/null && ufw status | grep -q "Status: active"; then
    log_info "配置 UFW 防火墙规则..."
    ufw allow 443/tcp comment 'Nginx HTTPS'
    ufw allow 80/tcp comment 'Nginx HTTP (for renewal)'
    log_success "防火墙规则配置完成"
else
    log_warning "未检测到 UFW 防火墙"
    log_info "请确保在阿里云安全组中开放端口: 80, 443"
fi

################################################################################
# 步骤 7: 测试 SSL 配置
################################################################################

log_info "步骤 7: 测试 SSL 配置..."

sleep 2

# 测试 HTTPS 访问
if curl -s -o /dev/null -w "%{http_code}" https://$DOMAIN | grep -q "200\|301\|302"; then
    log_success "HTTPS 访问正常"
else
    log_warning "HTTPS 访问测试失败，请手动检查"
fi

# 测试 HTTP 重定向
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://$DOMAIN)
if [ "$HTTP_CODE" = "301" ] || [ "$HTTP_CODE" = "302" ]; then
    log_success "HTTP 自动重定向到 HTTPS"
else
    log_warning "HTTP 重定向配置可能有问题 (HTTP Code: $HTTP_CODE)"
fi

################################################################################
# 完成
################################################################################

log_success "=========================================="
log_success "SSL/HTTPS 配置完成！"
log_success "=========================================="

echo ""
log_info "证书信息:"
certbot certificates | grep -A 5 "Certificate Name: $DOMAIN" || echo "  请运行 'certbot certificates' 查看"
echo ""

log_info "访问地址:"
echo "  HTTPS: https://$DOMAIN"
echo "  HTTP: http://$DOMAIN (自动重定向到 HTTPS)"
echo ""

log_info "证书有效期: 90 天"
log_info "自动续期: 已配置 (每天检查)"
echo ""

log_info "测试 SSL 配置质量:"
echo "  https://www.ssllabs.com/ssltest/analyze.html?d=$DOMAIN"
echo ""

log_info "证书管理命令:"
echo "  查看证书: certbot certificates"
echo "  手动续期: certbot renew"
echo "  撤销证书: certbot revoke --cert-path /etc/letsencrypt/live/$DOMAIN/cert.pem"
echo ""

log_success "SSL 配置脚本执行完毕！"
