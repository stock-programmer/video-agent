# OSS私有Bucket快速配置指南

## 🎯 一句话说明

**即使Bucket设置为私有,用户也能正常访问,只是改用"签名URL"(带过期时间的临时链接)**

## ⚡ 快速开始

### 1. 修改环境变量 (backend/.env)
```bash
# 启用私有bucket模式
OSS_USE_PRIVATE_BUCKET=true

# 签名URL过期时间 (秒, 默认1小时)
OSS_SIGNED_URL_EXPIRY=3600
```

### 2. 在阿里云控制台设置Bucket权限为"私有"
- 登录: https://oss.console.aliyun.com/
- 选择bucket → 访问控制 → 读写权限 → 选择"私有"

### 3. 重启后端服务
```bash
cd backend
npm start
```

## ✅ 完成!

**就这么简单!** 系统会自动:
- ✅ 上传图片时生成签名URL
- ✅ 调用Qwen API前刷新签名URL(24小时有效)
- ✅ 前端请求时自动刷新过期的URL
- ✅ 用户无感知,正常访问图片和视频

## 🔍 验证是否生效

上传一张图片,查看返回的URL:

**私有bucket模式** (正确):
```
https://bucket.oss-cn-hangzhou.aliyuncs.com/uploads/images/xxx.jpg?
  Expires=1706000000&
  OSSAccessKeyId=LTAI5xxxxx&
  Signature=abc123xyz...
```

**公开bucket模式**:
```
https://bucket.oss-cn-hangzhou.aliyuncs.com/uploads/images/xxx.jpg
```

看到签名参数 `?Expires=...&Signature=...` 就说明配置成功!

## 📚 详细文档

更多技术细节和常见问题,请查看:
- [完整配置指南](./OSS-PRIVATE-BUCKET-GUIDE.md)

## 🆘 遇到问题?

**图片显示不出来:**
1. 确认 `.env` 中 `OSS_USE_PRIVATE_BUCKET=true`
2. 重启后端服务
3. 清空浏览器缓存
4. 重新上传图片测试

**Qwen API报错:**
- 系统已自动处理,检查后端日志是否有"为Qwen API重新生成签名URL"

## 💡 何时使用?

**本地开发:**
```bash
OSS_USE_PRIVATE_BUCKET=false  # 方便调试
```

**生产环境 (强烈推荐):**
```bash
OSS_USE_PRIVATE_BUCKET=true   # 安全且防止盗链
OSS_SIGNED_URL_EXPIRY=3600    # 1小时过期
```

---

**总结:** 私有bucket + 签名URL = 安全 + 可用性兼得! 🎉
