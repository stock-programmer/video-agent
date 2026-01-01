# 前端任务 4.7 - 通用组件
## 层级: 第4层
## 依赖: frontend-dev-plan-1.1-project-scaffold.md
## 并行: frontend-dev-plan-4.1-4.6

创建 src/components/LoadingSpinner.tsx:
```typescript
export function LoadingSpinner() {
  return <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />;
}
```

创建 src/components/ErrorMessage.tsx:
```typescript
export function ErrorMessage({ message }: { message: string }) {
  return <div className="bg-red-50 text-red-600 p-4 rounded">{message}</div>;
}
```

创建 src/components/EmptyState.tsx:
```typescript
export function EmptyState({ message }: { message: string }) {
  return <div className="text-gray-400 text-center p-8">{message}</div>;
}
```

验收:
- [ ] 组件可导入使用

下一步: frontend-dev-plan-5.1
