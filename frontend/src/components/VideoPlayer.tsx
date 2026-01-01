import type { VideoData } from '../types/workspace';

interface Props {
  video?: VideoData;
}

export function VideoPlayer({ video }: Props) {
  const handleDownload = () => {
    if (!video?.url) return;

    // 创建一个隐藏的a标签触发下载
    const link = document.createElement('a');
    link.href = video.url;
    link.download = `video_${Date.now()}.mp4`; // 生成唯一文件名
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!video || video.status === 'pending') {
    return <div className="border rounded p-8 text-center">未生成视频</div>;
  }

  if (video.status === 'generating') {
    return (
      <div className="border rounded p-8 text-center bg-blue-50">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3"></div>
        <div className="text-blue-600 font-medium mb-2">🎬 视频正在生成中</div>
        <div className="text-sm text-gray-600 mb-1">
          预计需要 2-3 分钟
        </div>
        <div className="text-sm text-gray-500">
          您可以并行生成下一个工作空间的视频
        </div>
      </div>
    );
  }

  if (video.status === 'failed') {
    return <div className="border rounded p-8 text-center text-red-500">生成失败: {video.error}</div>;
  }

  return (
    <div className="border rounded p-4">
      <video src={video.url} controls className="w-full mb-3" />
      <button
        onClick={handleDownload}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors flex items-center justify-center gap-2"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
          />
        </svg>
        下载视频
      </button>
    </div>
  );
}
