import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

/**
 * 测试阿里云 DashScope 通义万相图生视频 API
 * 使用 wan2.6-i2v 模型
 */
async function testQwenVideoGeneration() {
  const apiKey = process.env.DASHSCOPE_API_KEY;

  if (!apiKey) {
    console.error('❌ 错误: DASHSCOPE_API_KEY 环境变量未设置');
    console.log('请在 .env 文件中添加: DASHSCOPE_API_KEY=your_api_key');
    return;
  }

  console.log('🚀 开始测试通义万相图生视频 API...\n');

  try {
    // 步骤 1: 提交视频生成任务
    console.log('📤 提交视频生成任务...');
    console.log('🎬 模型: wan2.6-i2v');
    console.log('📐 分辨率: 720P');
    console.log('⏱️  时长: 5秒\n');

    const submitResponse = await axios.post(
      'https://dashscope.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis',
      {
        model: 'wan2.6-i2v',
        input: {
          prompt: '镜头缓慢向前推进，展现画面细节',
          img_url: 'https://img1.baidu.com/it/u=3562310714,504401169&fm=253&fmt=auto&app=138&f=JPEG?w=500&h=500'
        },
        parameters: {
          resolution: '720P',
          duration: 5,
          prompt_extend: true,
          watermark: false
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'X-DashScope-Async': 'enable'  // 必需：启用异步模式
        }
      }
    );

    const taskId = submitResponse.data.output?.task_id;
    const taskStatus = submitResponse.data.output?.task_status;

    if (!taskId) {
      console.error('❌ 未获取到任务 ID');
      console.log('📝 完整响应:', JSON.stringify(submitResponse.data, null, 2));
      return;
    }

    console.log('✅ 任务提交成功！');
    console.log(`📋 任务 ID: ${taskId}`);
    console.log(`⏳ 任务状态: ${taskStatus || 'PENDING'}`);
    console.log(`🔍 Request ID: ${submitResponse.data.request_id}\n`);

    // 步骤 2: 查询任务状态
    console.log('🔍 查询任务状态...');
    const statusResponse = await axios.get(
      `https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );

    console.log('✅ 状态查询成功');
    console.log('📊 任务状态:', statusResponse.data.output?.task_status);

    if (statusResponse.data.output?.submit_time) {
      console.log('📅 提交时间:', statusResponse.data.output.submit_time);
    }

    console.log('\n📝 完整响应:');
    console.log(JSON.stringify(statusResponse.data, null, 2));

    // 成功总结
    console.log('\n' + '='.repeat(60));
    console.log('✅ 通义万相图生视频 API 验证成功！');
    console.log('='.repeat(60));
    console.log('📌 任务 ID:', taskId);
    console.log('📌 API 端点正确');
    console.log('📌 认证成功');
    console.log('📌 模型: wan2.6-i2v');
    console.log('📌 异步模式已启用');
    console.log('');
    console.log('💡 提示:');
    console.log('   - 视频生成需要 1-5 分钟，请耐心等待');
    console.log('   - 任务 ID 有效期为 24 小时');
    console.log('   - 可以使用以下命令查询任务结果:');
    console.log(`   curl -X GET https://dashscope.aliyuncs.com/api/v1/tasks/${taskId} \\`);
    console.log(`   --header "Authorization: Bearer $DASHSCOPE_API_KEY"`);

  } catch (error) {
    console.error('\n❌ API 调用失败');

    if (error.response) {
      console.error('状态码:', error.response.status);
      console.error('错误信息:', JSON.stringify(error.response.data, null, 2));

      const errorCode = error.response.data?.code;
      const errorMessage = error.response.data?.message;

      // 特定错误处理
      if (error.response.status === 401) {
        console.log('\n💡 提示: API Key 无效或已过期');
        console.log('   解决方案:');
        console.log('   1. 检查 DASHSCOPE_API_KEY 是否正确');
        console.log('   2. 访问 https://bailian.console.aliyun.com/ 重新获取 API Key');
      } else if (error.response.status === 403) {
        if (errorCode === 'AccessDenied' && errorMessage?.includes('asynchronous')) {
          console.log('\n💡 提示: 当前 API Key 不支持异步调用模式');
          console.log('   说明: HTTP 接口只支持异步模式（必须设置 X-DashScope-Async: enable）');
          console.log('   解决方案:');
          console.log('   1. 确认您的 API Key 权限是否支持异步调用');
          console.log('   2. 联系阿里云客服升级权限');
          console.log('   3. 或使用 Python/Java SDK（支持同步调用）');
        } else {
          console.log('\n💡 提示: 访问被拒绝');
          console.log('   可能原因:');
          console.log('   1. API Key 权限不足');
          console.log('   2. 区域限制（北京/新加坡 API Key 不可混用）');
          console.log('   3. 模型访问权限未开通');
        }
      } else if (error.response.status === 429) {
        console.log('\n💡 提示: 请求频率超限');
        console.log('   解决方案: 请稍后再试或检查您的配额限制');
      } else if (error.response.status === 400) {
        console.log('\n💡 提示: 请求参数错误');
        console.log('   请检查:');
        console.log('   1. 模型名称是否正确（wan2.6-i2v）');
        console.log('   2. 图片 URL 是否可访问');
        console.log('   3. 参数格式是否符合要求');
      }
    } else {
      console.error('错误:', error.message);
      console.log('\n💡 提示: 网络连接失败，请检查网络设置');
    }

    console.log('\n📚 参考文档:');
    console.log('   https://help.aliyun.com/zh/model-studio/vision');
  }
}

// 执行测试
testQwenVideoGeneration();
