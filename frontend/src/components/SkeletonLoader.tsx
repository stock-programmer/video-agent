/**
 * 骨架屏组件
 * 用于显示加载状态，提升用户感知速度
 */

export function WorkspaceSkeleton() {
  return (
    <div className="
      w-full max-w-7xl mx-auto
      border-2 border-gray-200 rounded-2xl
      p-4 sm:p-6
      bg-white
      animate-pulse
    ">
      {/* 第一行：图片上传 | AI智能优化 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
        {/* 图片上传骨架 */}
        <div>
          <div className="h-6 bg-gray-200 rounded w-32 mb-3" />
          <div className="h-64 bg-gray-200 rounded-xl" />
        </div>

        {/* AI优化骨架 */}
        <div>
          <div className="h-6 bg-gray-200 rounded w-40 mb-3" />
          <div className="h-12 bg-gradient-to-r from-gray-200 to-gray-100 rounded-lg mb-3" />
          <div className="h-64 bg-gradient-to-br from-gray-200 via-gray-100 to-gray-200 rounded-xl" />
        </div>
      </div>

      {/* 第二行：生成表单 | AI协作 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
        {/* 表单骨架 */}
        <div>
          <div className="h-6 bg-gray-200 rounded w-36 mb-3" />
          <div className="space-y-4">
            <div className="h-10 bg-gray-200 rounded-lg" />
            <div className="h-10 bg-gray-200 rounded-lg" />
            <div className="h-24 bg-gray-200 rounded-lg" />
            <div className="h-10 bg-gray-200 rounded-lg" />
          </div>
        </div>

        {/* AI协作骨架 */}
        <div>
          <div className="h-6 bg-gray-200 rounded w-32 mb-3" />
          <div className="h-96 bg-gray-200 rounded-xl" />
        </div>
      </div>

      {/* 第三行：视频播放器 */}
      <div>
        <div className="h-6 bg-gray-200 rounded w-28 mb-3" />
        <div className="h-64 bg-gray-200 rounded-xl" />
      </div>
    </div>
  );
}

export function TimelineSkeleton() {
  return (
    <div className="flex flex-col gap-6 sm:gap-8 p-2 sm:p-4">
      <div>
        <div className="h-8 bg-gray-200 rounded w-32 mb-4 animate-pulse" />
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
          <WorkspaceSkeleton />
        </div>
      </div>
    </div>
  );
}
