# 阿里云OSS私有Bucket配置指南

## 为什么使用私有Bucket?

**安全性和成本控制:**
- **防止未授权访问**: 私有bucket需要签名才能访问,防止他人盗链资源
- **避免恶意刷流量**: 公开bucket可能被恶意刷流量,导致高额费用
- **精细访问控制**: 通过签名URL可以控制访问权限和时效性
- **符合安全最佳实践**: 阿里云官方推荐生产环境使用私有bucket

**阿里云官方建议:**
> "对于生产环境,建议将Bucket权限设置为私有(private),通过签名URL的方式提供临时访问权限,以确保数据安全。"

## 工作原理

### 公开Bucket模式 (OSS_USE_PRIVATE_BUCKET=false)
```
用户 → 直接访问 → https://bucket.oss-cn-hangzhou.aliyuncs.com/uploads/images/xxx.jpg
                    ✅ 任何人都可访问
```

### 私有Bucket模式 (OSS_USE_PRIVATE_BUCKET=true)
```
用户 → 后端生成签名URL → https://bucket.oss-cn-hangzhou.aliyuncs.com/uploads/images/xxx.jpg?Expires=...&Signature=...
                           ✅ 只有持有签名的用户可以在有效期内访问
                           ❌ 签名过期后无法访问
```

**签名URL示例:**
```
https://image-to-video-333.oss-cn-hangzhou.aliyuncs.com/uploads/images/123.jpg?
  Expires=1706000000&
  OSSAccessKeyId=LTAI5xxxxx&
  Signature=abc123xyz...
```

## 配置步骤

### 1. 在阿里云控制台设置Bucket权限

登录阿里云OSS控制台: https://oss.console.aliyun.com/

1. 选择你的Bucket (例如: `image-to-video-333`)
2. 点击「访问控制」→「读写权限」
3. 选择「私有」(Private)
4. 保存设置

**权限说明:**
- **私有**: 只有Bucket拥有者可以访问(需要签名URL)
- **公共读**: 任何人都可以读取文件
- ~~**公共读写**: 不建议使用,存在安全风险~~

### 2. 配置后端环境变量

编辑 `backend/.env` 文件:

```bash
# ===== OSS 安全配置 =====
# 启用私有bucket模式
OSS_USE_PRIVATE_BUCKET=true

# 签名URL过期时间 (秒)
# 1小时 = 3600
# 24小时 = 86400
# 建议: 根据实际使用场景设置合理的过期时间
OSS_SIGNED_URL_EXPIRY=3600
```

### 3. 重启后端服务

```bash
cd backend
npm start
```

### 4. 验证配置

查看后端日志,确认以下信息:
```
[INFO] OSS Client 初始化成功: region=oss-cn-hangzhou, bucket=image-to-video-333
[INFO] 使用私有bucket模式,签名URL过期时间: 3600秒
```

上传图片并检查返回的URL:
- **私有bucket**: URL应包含 `?Expires=...&Signature=...` 参数
- **公开bucket**: URL不包含签名参数

## 系统行为说明

### 图片上传流程
1. 用户上传图片 → 后端保存到OSS
2. 后端生成签名URL(有效期: OSS_SIGNED_URL_EXPIRY)
3. 返回签名URL给前端显示
4. 保存到数据库: `image_path` (文件名) + `image_url` (签名URL)

### 视频生成流程
1. 用户触发视频生成
2. **重要**: 后端为图片重新生成24小时有效期的签名URL
3. 将新签名URL传递给Qwen API(确保API能访问图片)
4. 视频生成完成 → 下载视频 → 上传到OSS
5. 生成视频签名URL返回给前端

### 页面刷新/重新加载
1. 前端调用 `GET /api/workspaces`
2. **重要**: 后端检测到私有bucket模式,自动刷新所有签名URL
3. 返回新的签名URL给前端
4. 前端使用新URL显示图片和视频

**签名URL自动刷新机制:**
```javascript
// backend/src/api/get-workspaces.js
if (config.oss.usePrivateBucket) {
  // 为每个workspace重新生成签名URL
  workspace.image_url = await getAccessUrl(workspace.image_path);
  workspace.video.url = await getAccessUrl(workspace.video.path);
}
```

## 签名URL过期时间建议

### 开发环境
```bash
OSS_SIGNED_URL_EXPIRY=86400  # 24小时
```
- 便于开发调试
- URL较长时间有效,减少频繁刷新

### 生产环境
```bash
OSS_SIGNED_URL_EXPIRY=3600   # 1小时
```
- 平衡安全性和用户体验
- 大多数用户会话时间 < 1小时
- 页面刷新时自动获取新URL

### 特殊场景
```bash
# 如果用户长时间停留在页面 (如演示会议)
OSS_SIGNED_URL_EXPIRY=43200  # 12小时

# 如果需要极高安全性 (如敏感内容)
OSS_SIGNED_URL_EXPIRY=1800   # 30分钟
```

## 本地开发 vs 生产部署

### 本地开发 (调试阶段)
```bash
# 可以使用公开bucket,方便调试
OSS_USE_PRIVATE_BUCKET=false
```
- 直接访问URL,无需签名
- 可以在浏览器中直接打开图片/视频URL
- 适合快速开发和测试

### 生产部署 (阿里云)
```bash
# 强烈建议使用私有bucket
OSS_USE_PRIVATE_BUCKET=true
OSS_SIGNED_URL_EXPIRY=3600
```
- 符合安全最佳实践
- 防止资源被盗链
- 避免恶意刷流量

## 常见问题

### Q1: 切换到私有bucket后,前端无法显示图片怎么办?

**检查步骤:**
1. 确认 `.env` 中 `OSS_USE_PRIVATE_BUCKET=true`
2. 重启后端服务
3. 清空浏览器缓存
4. 重新上传图片测试
5. 检查返回的URL是否包含签名参数

### Q2: 页面刷新后图片/视频显示不出来

**原因:** 签名URL过期了

**解决方案:**
- 系统会自动在 `GET /api/workspaces` 时刷新签名URL
- 如果仍有问题,增加 `OSS_SIGNED_URL_EXPIRY` 时间
- 检查后端日志是否有错误

### Q3: Qwen API报错"无法访问图片URL"

**原因:** 传递给Qwen API的签名URL过期了

**解决方案:**
- 系统已自动处理:在调用Qwen API前重新生成24小时有效期的签名URL
- 检查 `video-qwen.js` 中的日志: `为Qwen API重新生成签名URL`
- 确保 `image_path` 字段已正确保存到数据库

### Q4: 本地开发能访问,部署到阿里云后无法访问

**原因:**
- Bucket权限未设置为私有
- 环境变量配置错误
- OSS AccessKey权限不足

**解决方案:**
1. 检查阿里云OSS控制台Bucket权限设置
2. 确认 `.env` 文件正确配置
3. 验证 `OSS_ACCESS_KEY_ID` 和 `OSS_ACCESS_KEY_SECRET` 有效
4. 检查RAM用户权限包含 `oss:GetObject`, `oss:PutObject`

### Q5: 如何查看签名URL是否有效?

**方法:**
1. 复制签名URL
2. 在浏览器新标签页中打开
3. 如果能显示图片/视频 → 签名有效
4. 如果显示403错误 → 签名过期或无效

**使用curl测试:**
```bash
curl -I "https://bucket.oss-cn-hangzhou.aliyuncs.com/uploads/images/xxx.jpg?Expires=...&Signature=..."
# 200 OK → 签名有效
# 403 Forbidden → 签名无效/过期
```

## 架构优势

### 代码层面的智能处理
- **透明切换**: 通过配置切换,无需修改业务代码
- **自动刷新**: `GET /api/workspaces` 自动刷新过期URL
- **向后兼容**: 公开bucket模式仍然支持

### 安全性
- 临时访问权限,URL自动过期
- 防止未授权访问和盗链
- 符合云安全最佳实践

### 成本控制
- 避免恶意刷流量
- 精确控制访问权限
- 减少无效请求

## 技术实现细节

### 核心函数

**1. 签名URL生成** (`backend/src/utils/oss.js`)
```javascript
export async function getSignedUrl(objectName, expires) {
  const client = getClient();
  const signedUrl = client.signatureUrl(objectName, { expires });
  return signedUrl;
}
```

**2. 智能URL返回** (`backend/src/utils/oss.js`)
```javascript
export async function getAccessUrl(objectName, expires) {
  if (config.oss.usePrivateBucket) {
    return await getSignedUrl(objectName, expires);  // 私有bucket
  }
  return getPublicUrl(objectName);  // 公开bucket
}
```

**3. 上传时自动处理** (`backend/src/utils/oss.js`)
```javascript
export async function uploadBuffer(buffer, objectName, contentType) {
  await client.put(objectName, buffer, options);
  const url = await getAccessUrl(objectName);  // 自动选择URL类型
  return url;
}
```

**4. Qwen API调用前刷新** (`backend/src/services/video-qwen.js`)
```javascript
if (config.oss.usePrivateBucket && workspace.image_path) {
  const objectName = config.oss.imagePath + workspace.image_path;
  imageUrlForQwen = await getAccessUrl(objectName, 86400); // 24小时
}
```

**5. 前端请求时刷新** (`backend/src/api/get-workspaces.js`)
```javascript
if (config.oss.usePrivateBucket) {
  const refreshedWorkspaces = await Promise.all(
    workspaces.map(ws => refreshWorkspaceUrls(ws))
  );
  res.json(refreshedWorkspaces);
}
```

## 总结

✅ **推荐配置 (生产环境):**
```bash
OSS_USE_PRIVATE_BUCKET=true
OSS_SIGNED_URL_EXPIRY=3600
```

✅ **系统自动处理:**
- 上传时生成签名URL
- Qwen API调用前刷新URL(24小时)
- 前端请求时刷新URL(1小时)
- 向后兼容公开bucket模式

✅ **用户无感知:**
- 前端代码无需修改
- URL过期自动刷新
- 公网用户正常访问

🔒 **安全 + 可用性 = 完美平衡**
