# 前端任务 2.1 - 项目配置
## 层级: 第2层
## 依赖: frontend-dev-plan-1.1-project-scaffold.md
## 并行: frontend-dev-plan-2.2, 2.3, 2.4

配置 vite.config.ts:
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
      '/uploads': 'http://localhost:3000'
    }
  }
});
```

配置 tailwind.config.js:
```javascript
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: { extend: {} },
  plugins: []
};
```

创建目录结构:
```bash
mkdir -p src/{components,hooks,services,stores,types,utils}
```

验收:
- [ ] API代理配置正常
- [ ] Tailwind样式可用
- [ ] 目录结构创建完成

下一步: frontend-dev-plan-3.1, 4.*
