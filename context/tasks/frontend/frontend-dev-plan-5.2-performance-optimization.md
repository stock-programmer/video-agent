# 前端任务 5.2 - 性能优化
## 层级: 第5层
## 依赖: frontend-dev-plan-5.1-app-integration.md

优化措施:
1. 图片懒加载
2. 虚拟滚动(工作空间多时)
3. 组件memo
4. debounce/throttle

创建 src/components/VirtualTimeline.tsx (可选):
```typescript
import { Virtuoso } from 'react-virtuoso';

// 虚拟滚动版Timeline
```

验收:
- [ ] 滚动流畅
- [ ] 内存占用合理

下一步: frontend-dev-plan-6.1
