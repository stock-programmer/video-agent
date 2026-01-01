# 前端任务 4.5 - 视频播放器组件
## 层级: 第4层
## 依赖: frontend-dev-plan-2.2-type-definitions.md
## 并行: frontend-dev-plan-4.1-4.4, 4.6-4.7

创建 src/components/VideoPlayer.tsx:
```typescript
import type { VideoData } from '../types/workspace';

interface Props {
  video?: VideoData;
}

export function VideoPlayer({ video }: Props) {
  if (!video || video.status === 'pending') {
    return <div className="border rounded p-8 text-center">未生成视频</div>;
  }

  if (video.status === 'generating') {
    return <div className="border rounded p-8 text-center">生成中...</div>;
  }

  if (video.status === 'failed') {
    return <div className="border rounded p-8 text-center text-red-500">生成失败: {video.error}</div>;
  }

  return (
    <div className="border rounded p-4">
      <video src={video.url} controls className="w-full" />
    </div>
  );
}
```

验收:
- [ ] 显示不同状态
- [ ] 视频可播放

下一步: frontend-dev-plan-5.1
