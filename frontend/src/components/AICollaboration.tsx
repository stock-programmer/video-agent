import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useWorkspaceStore } from '../stores/workspaceStore';

interface Props {
  workspaceId: string;
}

interface AISuggestion {
  camera_movement?: string;
  shot_type?: string;
  lighting?: string;
  motion_prompt?: string;
  explanation?: string;
}

export function AICollaboration({ workspaceId }: Props) {
  const [input, setInput] = useState('');
  const [suggestion, setSuggestion] = useState<AISuggestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const updateWorkspace = useWorkspaceStore(s => s.updateWorkspace);

  // Debug: Log suggestion state changes
  useEffect(() => {
    console.log('[AICollaboration] Suggestion state changed:', suggestion);
  }, [suggestion]);

  const handleSubmit = async () => {
    if (!input.trim()) {
      setError('请输入您的需求');
      return;
    }

    console.log('[AICollaboration] Submitting request:', { workspaceId, input });

    setLoading(true);
    setError('');
    setSuggestion(null); // Clear previous suggestion

    try {
      const result = await api.getAISuggestion(workspaceId, input);
      console.log('[AICollaboration] Received suggestion:', result);

      if (!result) {
        throw new Error('未收到 AI 建议响应');
      }

      setSuggestion(result);
      console.log('[AICollaboration] Suggestion state updated');
    } catch (err: any) {
      console.error('[AICollaboration] Error:', err);
      const errorMessage = err.response?.data?.error?.message || err.message || '获取建议失败，请重试';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleApplySuggestion = () => {
    if (!suggestion) return;

    const formData: Record<string, any> = {};
    if (suggestion.camera_movement) formData.camera_movement = suggestion.camera_movement;
    if (suggestion.shot_type) formData.shot_type = suggestion.shot_type;
    if (suggestion.lighting) formData.lighting = suggestion.lighting;
    if (suggestion.motion_prompt) formData.motion_prompt = suggestion.motion_prompt;

    updateWorkspace(workspaceId, { form_data: formData });

    // Clear input and show success message
    setInput('');
    setSuggestion(null);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSubmit();
    }
  };

  return (
    <div className="border rounded-lg p-4 bg-white">
      {/* Input Area */}
      <div className="flex flex-col gap-3">
        <div>
          <label htmlFor={`ai-input-${workspaceId}`} className="block text-sm font-medium text-gray-700 mb-2">
            描述您的创意需求
          </label>
          <textarea
            id={`ai-input-${workspaceId}`}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="例如：我想要一个温馨的家庭场景，人物从左侧走向右侧..."
            className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={3}
            disabled={loading}
          />
          <p className="text-xs text-gray-500 mt-1">提示: Ctrl+Enter 快速提交</p>
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={loading || !input.trim()}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              AI 思考中...
            </span>
          ) : (
            '获取 AI 建议'
          )}
        </button>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Suggestion Display */}
        {suggestion && (
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                AI 建议
              </h4>
              <button
                onClick={handleApplySuggestion}
                className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors"
              >
                应用到表单
              </button>
            </div>

            <div className="space-y-2">
              {suggestion.camera_movement && (
                <div className="flex gap-2">
                  <span className="text-sm font-medium text-gray-700 min-w-[60px]">运镜:</span>
                  <span className="text-sm text-gray-900">{suggestion.camera_movement}</span>
                </div>
              )}

              {suggestion.shot_type && (
                <div className="flex gap-2">
                  <span className="text-sm font-medium text-gray-700 min-w-[60px]">景别:</span>
                  <span className="text-sm text-gray-900">{suggestion.shot_type}</span>
                </div>
              )}

              {suggestion.lighting && (
                <div className="flex gap-2">
                  <span className="text-sm font-medium text-gray-700 min-w-[60px]">光线:</span>
                  <span className="text-sm text-gray-900">{suggestion.lighting}</span>
                </div>
              )}

              {suggestion.motion_prompt && (
                <div className="flex gap-2">
                  <span className="text-sm font-medium text-gray-700 min-w-[60px]">运动:</span>
                  <span className="text-sm text-gray-900">{suggestion.motion_prompt}</span>
                </div>
              )}

              {suggestion.explanation && (
                <div className="mt-3 pt-3 border-t border-blue-200">
                  <p className="text-sm text-gray-600 leading-relaxed">{suggestion.explanation}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer Tip */}
      {!suggestion && !loading && !error && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            💡 AI 助手可以根据您的描述推荐最佳的运镜、景别和光线设置
          </p>
        </div>
      )}
    </div>
  );
}
