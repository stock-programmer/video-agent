# 视频存储说明

## 概述

系统现在会自动将生成的视频下载并保存到本地,确保视频文件永久可用。

## 存储位置

- **本地目录**: `backend/uploads/videos/`
- **文件命名**: `{workspace_id}_{timestamp}.mp4`
- **访问URL**: `http://localhost:3000/uploads/videos/{filename}`

## 数据库字段

在 MongoDB 的 `workspaces` 集合中,每个视频包含以下字段:

```javascript
video: {
  status: 'completed',              // 状态
  task_id: 'xxx',                   // Qwen任务ID
  url: '/uploads/videos/xxx.mp4',   // 本地访问URL (主要使用)
  remote_url: 'https://...',        // 原始远程URL (备用)
  path: './uploads/videos/xxx.mp4', // 本地文件系统路径
  error: null                       // 错误信息
}
```

## 工作流程

### 1. 视频生成流程

```
用户提交生成请求
  ↓
调用 Qwen API (生成视频)
  ↓
获取 task_id 并开始轮询
  ↓
视频生成完成,获取远程 URL
  ↓
【新增】下载视频到本地 uploads/videos/
  ↓
【新增】保存本地路径到数据库
  ↓
前端显示本地视频
```

### 2. 下载失败处理

如果视频下载到本地失败:
- 仍然保存远程URL作为备用
- 在 `video.error` 字段记录警告信息
- WebSocket推送时包含 `warning` 字段
- 前端可以显示警告但仍然播放远程视频

## 迁移现有数据

如果数据库中已经有使用远程URL的视频记录,可以运行迁移脚本:

```bash
cd backend
node migrate-videos.js
```

迁移脚本会:
1. 查找所有 `status='completed'` 且使用远程URL的视频
2. 尝试下载到本地
3. 更新数据库记录
4. 报告迁移结果

## 目录结构

```
backend/
├── uploads/
│   ├── videos/              # 视频存储目录
│   │   ├── 6767xxx_1735xxx.mp4
│   │   └── 6767xxx_1735xxx.mp4
│   ├── 1767008037365-8206bx2s.png  # 用户上传的图片
│   └── .gitkeep
```

## 优势

### 当前实现 (本地存储)
✅ 视频永久可用,不受远程链接过期影响
✅ 加载速度快,无需访问第三方服务器
✅ 离线访问,断网也能查看已生成视频
✅ 图片与视频一一对应,都在本地
✅ 便于数据备份和迁移

### 之前实现 (仅远程URL)
❌ 远程链接可能过期 (Qwen临时链接有效期未知)
❌ 依赖第三方服务器可用性
❌ 网络波动影响播放体验
❌ 刷新浏览器后可能无法访问

## 注意事项

1. **磁盘空间**: 每个5秒720P视频约占用 2-5MB,请确保有足够磁盘空间
2. **备份**: 定期备份 `uploads/videos/` 目录
3. **清理**: 可以定期清理删除的工作空间对应的视频文件
4. **迁移到云存储**: 未来如需迁移到OSS/S3,只需修改 `downloadVideo()` 函数

## 故障排查

### 视频无法播放

1. **检查文件是否存在**:
   ```bash
   ls -lh backend/uploads/videos/
   ```

2. **检查数据库记录**:
   ```bash
   mongosh video-maker
   db.workspaces.find({ 'video.status': 'completed' })
   ```

3. **检查静态文件服务**:
   - 确认 `app.js` 中有 `app.use('/uploads', express.static('uploads'))`
   - 尝试直接访问: `http://localhost:3000/uploads/videos/{filename}`

4. **检查日志**:
   ```bash
   tail -f backend/logs/combined.log
   ```

### 下载失败

可能原因:
- 网络问题 (超时设置为2分钟)
- 磁盘空间不足
- 权限问题 (检查 uploads/videos/ 目录权限)
- 远程URL已失效

## 未来优化方向

1. **云存储集成** (阿里云OSS/AWS S3)
2. **视频压缩** (减少存储空间)
3. **CDN加速** (提升访问速度)
4. **自动清理** (删除过期的废弃视频)
5. **缩略图生成** (提升加载体验)
