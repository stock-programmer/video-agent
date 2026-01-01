# 前端任务 4.6 - AI协作组件
## 层级: 第4层
## 依赖: frontend-dev-plan-2.3-api-client.md
## 并行: frontend-dev-plan-4.1-4.5, 4.7

创建 src/components/AICollaboration.tsx:
```typescript
import { useState } from 'react';
import { api } from '../services/api';

interface Props {
  workspaceId: string;
}

export function AICollaboration({ workspaceId }: Props) {
  const [input, setInput] = useState('');
  const [suggestion, setSuggestion] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const result = await api.getAISuggestion(workspaceId, input);
      setSuggestion(result);
    } catch (error) {
      console.error('获取建议失败:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border rounded p-4 space-y-4">
      <h3>AI协作</h3>
      <textarea
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder="描述您的需求..."
        className="w-full border rounded p-2"
      />
      <button onClick={handleSubmit} disabled={loading}>
        {loading ? '获取中...' : '获取建议'}
      </button>
      
      {suggestion && (
        <div className="bg-gray-50 p-4 rounded">
          <p><strong>运镜:</strong> {suggestion.camera_movement}</p>
          <p><strong>景别:</strong> {suggestion.shot_type}</p>
          <p><strong>光线:</strong> {suggestion.lighting}</p>
          <p><strong>运动:</strong> {suggestion.motion_prompt}</p>
          <p className="text-sm text-gray-600 mt-2">{suggestion.explanation}</p>
        </div>
      )}
    </div>
  );
}
```

验收:
- [ ] 可输入并提交
- [ ] 显示AI建议

下一步: frontend-dev-plan-5.1
