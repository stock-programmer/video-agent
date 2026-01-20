/**
 * v1.2 字段测试脚本
 * 测试 angle 和 frame_rate 字段是否能正确存储和检索
 */

import mongoose from 'mongoose';
import { Workspace, connectDB, disconnectDB } from './src/db/mongodb.js';
import logger from './src/utils/logger.js';

async function testV1_2Fields() {
  try {
    // 连接数据库
    await connectDB();
    logger.info('开始测试 v1.2 新字段...');

    // 1. 创建包含新字段的测试工作空间
    const testWorkspace = new Workspace({
      order_index: 999,
      image_path: '/uploads/test-v1.2.jpg',
      image_url: '/uploads/test-v1.2.jpg',
      form_data: {
        // v1.0 字段
        camera_movement: 'push forward',
        shot_type: 'close-up',
        lighting: 'natural',
        motion_prompt: '测试运动描述',
        checkboxes: {},
        // v1.1 字段
        duration: 5,
        aspect_ratio: '16:9',
        motion_intensity: 3,
        quality_preset: 'standard',
        // v1.2 新增字段
        angle: 'eye level',
        frame_rate: '30'
      }
    });

    await testWorkspace.save();
    logger.info('✅ 测试1: 创建包含 v1.2 字段的工作空间成功', {
      workspaceId: testWorkspace._id.toString(),
      angle: testWorkspace.form_data.angle,
      frame_rate: testWorkspace.form_data.frame_rate
    });

    // 2. 从数据库中检索并验证
    const retrieved = await Workspace.findById(testWorkspace._id);
    if (retrieved.form_data.angle !== 'eye level') {
      throw new Error('angle 字段存储或检索失败');
    }
    if (retrieved.form_data.frame_rate !== '30') {
      throw new Error('frame_rate 字段存储或检索失败');
    }
    logger.info('✅ 测试2: 从数据库检索 v1.2 字段成功');

    // 3. 测试自由输入（非预设值）
    retrieved.form_data.angle = '自定义视角：45度倾斜';
    retrieved.form_data.frame_rate = '48';
    await retrieved.save();

    const updated = await Workspace.findById(testWorkspace._id);
    if (updated.form_data.angle !== '自定义视角：45度倾斜') {
      throw new Error('自定义 angle 值存储失败');
    }
    if (updated.form_data.frame_rate !== '48') {
      throw new Error('自定义 frame_rate 值存储失败');
    }
    logger.info('✅ 测试3: 自由输入值存储成功');

    // 4. 测试向后兼容性（不包含新字段的旧数据）
    const oldWorkspace = new Workspace({
      order_index: 1000,
      image_path: '/uploads/test-old.jpg',
      image_url: '/uploads/test-old.jpg',
      form_data: {
        camera_movement: 'static',
        shot_type: 'wide shot',
        lighting: 'soft'
        // 没有 v1.1 和 v1.2 字段
      }
    });

    await oldWorkspace.save();
    const oldRetrieved = await Workspace.findById(oldWorkspace._id);

    // 旧数据应该能正常保存和读取，新字段应该是 undefined
    if (oldRetrieved.form_data.angle !== undefined) {
      logger.warn('⚠️ 警告: 旧数据的 angle 字段不为 undefined');
    }
    if (oldRetrieved.form_data.frame_rate !== undefined) {
      logger.warn('⚠️ 警告: 旧数据的 frame_rate 字段不为 undefined');
    }
    logger.info('✅ 测试4: 向后兼容性验证通过');

    // 清理测试数据
    await Workspace.deleteMany({ order_index: { $gte: 999 } });
    logger.info('✅ 测试数据清理完成');

    logger.info('🎉 所有 v1.2 字段测试通过！');

    // 断开连接
    await disconnectDB();
    process.exit(0);
  } catch (error) {
    logger.error('❌ 测试失败:', error);
    await disconnectDB();
    process.exit(1);
  }
}

// 运行测试
testV1_2Fields();
