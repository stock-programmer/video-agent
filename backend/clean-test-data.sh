#!/bin/bash

###############################################################################
# 清理测试数据脚本
#
# 用途: 清理所有测试数据,恢复系统到初始干净状态
# 使用: bash clean-test-data.sh
#
# 警告: 此操作不可逆! 会删除所有上传的文件和数据库记录
###############################################################################

set -e  # 遇到错误立即退出

echo "========================================="
echo "      测试数据清理脚本"
echo "========================================="
echo ""
echo "⚠️  警告: 此操作将清理以下内容:"
echo "  - 所有上传的图片"
echo "  - 所有生成的视频"
echo "  - 所有数据库记录"
echo ""
read -p "确认继续? (输入 yes 继续): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ 操作已取消"
    exit 0
fi

echo ""
echo "开始清理..."
echo ""

# 1. 清理上传的图片
echo "[1/4] 清理上传的图片..."
cd uploads
find . -type f ! -name '.gitkeep' -delete
echo "  ✅ 图片已清理"

# 2. 清理生成的视频
echo "[2/4] 清理生成的视频..."
if [ -d "videos" ]; then
    rm -f videos/*.mp4
    echo "  ✅ 视频已清理"
else
    echo "  ⏭️  videos目录不存在,跳过"
fi

# 3. 清理数据库
echo "[3/4] 清理数据库记录..."
mongo_result=$(mongosh video-maker --quiet --eval "db.workspaces.deleteMany({}).deletedCount" 2>/dev/null)
echo "  ✅ 删除了 $mongo_result 条记录"

# 4. 验证清理结果
echo "[4/4] 验证清理结果..."
echo ""

echo "  📁 文件系统:"
file_count=$(find uploads -type f ! -name '.gitkeep' | wc -l)
echo "    - 剩余文件数: $file_count"

echo ""
echo "  🗄️  数据库:"
db_count=$(mongosh video-maker --quiet --eval "db.workspaces.countDocuments()" 2>/dev/null)
echo "    - 剩余记录数: $db_count"

echo ""
echo "  💾 磁盘空间:"
du -sh uploads

echo ""
echo "========================================="
if [ "$file_count" -eq 0 ] && [ "$db_count" -eq 0 ]; then
    echo "✅ 清理完成! 系统已恢复到初始状态"
    echo "可以开始新的测试了!"
else
    echo "⚠️  清理可能不完整,请手动检查"
fi
echo "========================================="
