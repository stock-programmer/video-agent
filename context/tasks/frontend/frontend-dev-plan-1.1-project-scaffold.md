# 前端任务 1.1 - 项目脚手架
## 层级: 第1层 - 无依赖

创建项目:
```bash
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
```

安装核心依赖:
```bash
npm install zustand axios @tanstack/react-query
npm install tailwindcss postcss autoprefixer
npm install @dnd-kit/core @dnd-kit/sortable
npm install react-hook-form lodash-es
npm install -D @types/lodash-es
```

配置 Tailwind:
```bash
npx tailwindcss init -p
```

验收:
- [ ] 项目可启动 (`npm run dev`)
- [ ] 访问 http://localhost:5173 显示默认页面

下一步: frontend-dev-plan-2.*
