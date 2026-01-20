/**
 * LLM 提供商集成测试
 * 测试 Gemini 和 Qwen LLM 服务的切换功能
 */

// 注意: 此脚本需要在 backend 目录下运行
// cd backend && node ../test-llm-integration.js

import 'dotenv/config';
import * as llmGemini from './src/services/llm-gemini.js';
import * as llmQwen from './src/services/llm-qwen.js';

// 模拟工作空间数据
const mockWorkspace = {
  _id: 'test-workspace-001',
  image_url: 'http://localhost:3000/uploads/test-image.jpg',
  form_data: {
    camera_movement: 'push_forward',
    shot_type: 'medium_shot',
    lighting: 'natural',
    motion_prompt: '人物缓慢走向镜头'
  },
  video: {
    status: 'pending',
    url: null
  }
};

const userInput = '我想让视频更有电影感，应该如何调整参数？';

/**
 * 测试 LLM 服务
 */
async function testLLMService(serviceName, llmService) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`测试 ${serviceName} LLM 服务`);
  console.log(`${'='.repeat(60)}\n`);

  try {
    console.log(`📤 发送请求...`);
    console.log(`工作空间 ID: ${mockWorkspace._id}`);
    console.log(`用户输入: ${userInput}`);

    const startTime = Date.now();
    const suggestion = await llmService.suggest(mockWorkspace, userInput);
    const duration = Date.now() - startTime;

    console.log(`\n✅ 请求成功! (耗时: ${duration}ms)`);
    console.log(`\n📥 AI 建议结果:`);
    console.log(`${'─'.repeat(60)}`);
    console.log(`Camera Movement: ${suggestion.camera_movement || '(未提供)'}`);
    console.log(`Shot Type: ${suggestion.shot_type || '(未提供)'}`);
    console.log(`Lighting: ${suggestion.lighting || '(未提供)'}`);
    console.log(`Motion Prompt: ${suggestion.motion_prompt || '(未提供)'}`);
    console.log(`\nExplanation:`);
    console.log(suggestion.explanation || '(未提供)');
    console.log(`${'─'.repeat(60)}`);

    // 验证返回格式
    const hasAllFields =
      suggestion.camera_movement &&
      suggestion.shot_type &&
      suggestion.lighting &&
      suggestion.motion_prompt &&
      suggestion.explanation;

    if (hasAllFields) {
      console.log(`\n✅ 所有必需字段都已返回`);
    } else {
      console.log(`\n⚠️  部分字段缺失`);
    }

    return { success: true, suggestion, duration };
  } catch (error) {
    console.log(`\n❌ 请求失败!`);
    console.log(`错误类型: ${error.name}`);
    console.log(`错误消息: ${error.message}`);
    console.log(`堆栈信息: ${error.stack}`);
    return { success: false, error: error.message };
  }
}

/**
 * 主函数
 */
async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║     LLM 提供商集成测试                                     ║
║     LLM Provider Integration Test                         ║
╚════════════════════════════════════════════════════════════╝
`);

  // 检查环境变量
  const hasDashScope = !!process.env.DASHSCOPE_API_KEY;
  const hasGoogle = !!process.env.GOOGLE_API_KEY;

  console.log(`环境检查:`);
  console.log(`✅ DASHSCOPE_API_KEY: ${hasDashScope ? '已配置' : '未配置'}`);
  console.log(`✅ GOOGLE_API_KEY: ${hasGoogle ? '已配置' : '未配置'}`);

  if (!hasDashScope && !hasGoogle) {
    console.error(`\n❌ 错误: 至少需要配置一个 API Key`);
    process.exit(1);
  }

  const results = [];

  // 测试 Qwen LLM (如果配置了)
  if (hasDashScope) {
    const qwenResult = await testLLMService('Qwen', llmQwen);
    results.push({ name: 'Qwen', ...qwenResult });

    // 等待一下
    console.log(`\n⏳ 等待 2 秒后继续下一个测试...\n`);
    await new Promise(resolve => setTimeout(resolve, 2000));
  } else {
    console.log(`\n⏭️  跳过 Qwen LLM 测试 (未配置 DASHSCOPE_API_KEY)\n`);
  }

  // 测试 Gemini LLM (如果配置了)
  if (hasGoogle) {
    const geminiResult = await testLLMService('Gemini', llmGemini);
    results.push({ name: 'Gemini', ...geminiResult });
  } else {
    console.log(`\n⏭️  跳过 Gemini LLM 测试 (未配置 GOOGLE_API_KEY)\n`);
  }

  // 总结
  console.log(`\n${'='.repeat(60)}`);
  console.log(`测试总结`);
  console.log(`${'='.repeat(60)}\n`);

  results.forEach(result => {
    const status = result.success ? '✅ 成功' : '❌ 失败';
    const duration = result.duration ? `(${result.duration}ms)` : '';
    console.log(`${status} - ${result.name} LLM ${duration}`);
    if (!result.success) {
      console.log(`   错误: ${result.error}`);
    }
  });

  const successCount = results.filter(r => r.success).length;
  const totalCount = results.length;

  console.log(`\n总计: ${successCount}/${totalCount} 个测试通过`);

  if (successCount === totalCount) {
    console.log(`\n🎉 所有测试通过! LLM 提供商切换功能正常。`);
    console.log(`\n📝 使用说明:`);
    console.log(`1. 在 backend/.env 中设置 LLM_PROVIDER=qwen 或 LLM_PROVIDER=gemini`);
    console.log(`2. 重启后端服务`);
    console.log(`3. AI 协作功能将自动使用配置的 LLM 提供商`);
  } else {
    console.log(`\n⚠️  部分测试失败,请检查错误信息。`);
  }
}

// 运行测试
main().catch(error => {
  console.error(`\n💥 未捕获的错误:`, error);
  process.exit(1);
});
