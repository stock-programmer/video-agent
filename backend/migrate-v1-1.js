import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/video-maker';

async function migrateToV1_1() {
  console.log('='.repeat(60));
  console.log('v1.1 数据库迁移脚本');
  console.log('='.repeat(60));
  console.log('');

  try {
    // 连接数据库
    await mongoose.connect(MONGODB_URI);
    console.log('✅ 数据库连接成功');
    console.log(`   URI: ${MONGODB_URI}`);
    console.log('');

    const db = mongoose.connection.db;
    const workspaces = db.collection('workspaces');

    // 统计总workspace数
    const totalCount = await workspaces.countDocuments({});
    console.log(`📊 数据库统计:`);
    console.log(`   总workspace数: ${totalCount}`);

    // 查找缺少v1.1字段的workspace
    const oldWorkspaces = await workspaces.countDocuments({
      'form_data.duration': { $exists: false }
    });

    console.log(`   需要迁移的workspace: ${oldWorkspaces}`);
    console.log('');

    if (oldWorkspaces === 0) {
      console.log('✅ 没有需要迁移的数据，所有workspace已包含v1.1字段');
      return;
    }

    // 显示迁移前的示例
    const sampleBefore = await workspaces.findOne({ 'form_data.duration': { $exists: false } });
    if (sampleBefore) {
      console.log('📄 迁移前示例 (form_data):');
      console.log(JSON.stringify(sampleBefore.form_data, null, 2));
      console.log('');
    }

    // 执行迁移
    console.log('🔄 开始迁移...');
    const result = await workspaces.updateMany(
      { 'form_data.duration': { $exists: false } },
      {
        $set: {
          'form_data.duration': 5,            // API最小值
          'form_data.aspect_ratio': '16:9',
          'form_data.motion_intensity': 3,
          'form_data.quality_preset': 'standard'
        }
      }
    );

    console.log('');
    console.log('✅ 迁移完成！');
    console.log(`   匹配的文档数: ${result.matchedCount}`);
    console.log(`   修改的文档数: ${result.modifiedCount}`);
    console.log('');

    // 验证迁移结果
    const updatedWorkspaces = await workspaces.find({
      'form_data.duration': { $exists: true }
    }).toArray();

    console.log('📊 迁移后统计:');
    console.log(`   包含v1.1字段的workspace: ${updatedWorkspaces.length}`);
    console.log('');

    // 显示迁移后的示例
    if (updatedWorkspaces.length > 0) {
      console.log('📄 迁移后示例 (form_data):');
      console.log(JSON.stringify(updatedWorkspaces[0].form_data, null, 2));
      console.log('');
    }

    // 验证默认值
    const allNowHaveDefaults = await workspaces.countDocuments({
      'form_data.duration': 5,
      'form_data.aspect_ratio': '16:9',
      'form_data.motion_intensity': 3,
      'form_data.quality_preset': 'standard'
    });

    console.log('✅ 验证:');
    console.log(`   使用默认值的workspace: ${allNowHaveDefaults}/${totalCount}`);
    console.log('');

  } catch (error) {
    console.error('');
    console.error('❌ 迁移失败:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('数据库连接已关闭');
    console.log('');
    console.log('='.repeat(60));
  }
}

// 运行迁移
migrateToV1_1()
  .then(() => {
    console.log('✅ 迁移脚本执行完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 迁移脚本执行失败:', error);
    process.exit(1);
  });
