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
    return (
      <div className="border border-slate-800/50 rounded-lg p-4 text-center bg-slate-900/40 backdrop-blur-sm">
        <p className="text-sm text-slate-500">未生成视频</p>
      </div>
    );
  }

  if (video.status === 'generating') {
    return (
      <div className="border border-blue-500/30 rounded-lg p-4 text-center bg-blue-900/20 backdrop-blur-sm">
        <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400 mb-2"></div>
        <div className="text-blue-400 font-medium text-sm mb-1">视频生成中</div>
        <div className="text-xs text-slate-500">预计 2-3 分钟</div>
      </div>
    );
  }

  if (video.status === 'failed') {
    return (
      <div className="border border-red-500/30 rounded-lg p-4 text-center bg-red-900/20 backdrop-blur-sm">
        <p className="text-sm text-red-400">生成失败: {video.error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 w-full">
      {/* 缩略图视频播放器 */}
      <div className="relative group">
        <video
          src={video.url}
          controls
          className="w-full h-[672px] rounded-lg border border-slate-800/50 bg-black shadow-lg object-cover"
        />
      </div>

      {/* 下载按钮 */}
      <button
        onClick={handleDownload}
        className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-sm font-medium py-2 px-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
      >
        <svg
          className="w-4 h-4"
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
