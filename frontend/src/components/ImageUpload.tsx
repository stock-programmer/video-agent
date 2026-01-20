import { useState } from 'react';
import { api } from '../services/api';
import { useWorkspaceStore } from '../stores/workspaceStore';

interface Props {
  workspaceId: string;
  imageUrl?: string;
}

export function ImageUpload({ workspaceId, imageUrl }: Props) {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string>('');
  const [imageError, setImageError] = useState(false);
  const updateWorkspace = useWorkspaceStore(s => s.updateWorkspace);

  const validateFile = (file: File): boolean => {
    // Check file type
    if (!file.type.startsWith('image/')) {
      setError('请上传图片文件');
      return false;
    }

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('图片大小不能超过10MB');
      return false;
    }

    setError('');
    return true;
  };

  const uploadFile = async (file: File) => {
    if (!validateFile(file)) return;

    setUploading(true);
    setError('');

    try {
      console.log('[ImageUpload] 开始上传图片:', file.name);
      const result = await api.uploadImage(file);
      console.log('[ImageUpload] 上传成功，返回结果:', result);

      console.log('[ImageUpload] 更新工作空间:', workspaceId, {
        image_path: result.image_path,
        image_url: result.image_url
      });

      updateWorkspace(workspaceId, {
        image_path: result.image_path,
        image_url: result.image_url
      });

      console.log('[ImageUpload] 工作空间更新完成');
    } catch (err: any) {
      console.error('[ImageUpload] 上传失败:', err);
      setError(err.response?.data?.error || '上传失败，请重试');
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadFile(file);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    await uploadFile(file);
  };

  const handleReupload = () => {
    const input = document.getElementById(`file-input-${workspaceId}`) as HTMLInputElement;
    input?.click();
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      {imageUrl ? (
        <div className="relative group">
          <img
            src={imageUrl}
            alt="上传的图片"
            className="w-full h-auto max-h-[300px] object-contain bg-gray-50"
            onError={() => {
              console.error('[ImageUpload] 图片加载失败:', imageUrl);
              setImageError(true);
            }}
            onLoad={() => {
              console.log('[ImageUpload] 图片加载成功:', imageUrl);
              setImageError(false);
            }}
          />
          {imageError && (
            <div className="absolute inset-0 bg-red-50 flex items-center justify-center">
              <p className="text-red-600 text-sm">图片加载失败: {imageUrl}</p>
            </div>
          )}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center pointer-events-none">
            <button
              onClick={handleReupload}
              className="opacity-0 group-hover:opacity-100 transition-opacity bg-white text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-100 pointer-events-auto"
              disabled={uploading}
            >
              重新上传
            </button>
          </div>
          <input
            id={`file-input-${workspaceId}`}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      ) : (
        <label
          className={`cursor-pointer block text-center p-8 border-2 border-dashed transition-colors ${
            dragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
          } ${uploading ? 'pointer-events-none opacity-50' : ''}`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center gap-2">
            {uploading ? (
              <>
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-gray-600">上传中...</span>
              </>
            ) : (
              <>
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <span className="text-gray-700 font-medium">
                  {dragActive ? '释放以上传' : '点击或拖拽图片到此处'}
                </span>
                <span className="text-sm text-gray-500">支持 JPG, PNG, GIF 等格式，最大 10MB</span>
              </>
            )}
          </div>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
            disabled={uploading}
          />
        </label>
      )}

      {error && (
        <div className="px-4 py-2 bg-red-50 border-t border-red-200">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
    </div>
  );
}
