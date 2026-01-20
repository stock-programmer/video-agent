/**
 * 千问 LLM API 测试脚本
 *
 * 功能: 测试阿里云通义千问大模型 API
 * 用途: 验证 API 配置和连接性,为后端集成做准备
 *
 * 使用方法:
 * 1. 在项目根目录的 .env 文件中配置 DASHSCOPE_API_KEY
 * 2. 运行: node ai-output-resource/test-scripts/test-qwen-llm.js
 */

import 'dotenv/config';
import axios from 'axios';

const API_BASE = 'https://dashscope.aliyuncs.com/api/v1';
const API_KEY = process.env.DASHSCOPE_API_KEY;

// 测试场景
const TEST_SCENARIOS = [
  {
    name: '基础文本生成',
    model: 'qwen-plus',
    messages: [
      {
        role: 'system',
        content: '你是一个友好的AI助手。'
      },
      {
        role: 'user',
        content: '请用一句话介绍自己。'
      }
    ],
    parameters: {
      temperature: 0.7,
      max_tokens: 100
    }
  },
  {
    name: '视频参数优化建议',
    model: 'qwen-plus',
    messages: [
      {
        role: 'system',
        content: `你是一个专业的视频制作助手,帮助用户优化图生视频的参数配置。

你必须以 JSON 格式输出建议,格式如下:
\`\`\`json
{
  "camera_movement": "运镜方式(英文下划线格式)",
  "shot_type": "镜头类型(英文下划线格式)",
  "lighting": "光线设置(英文下划线格式)",
  "motion_prompt": "主体运动描述(中文)",
  "explanation": "建议理由(中文)"
}
\`\`\`

参数可选值:
- camera_movement: push_forward, pull_back, pan_left, pan_right, zoom_in, zoom_out, static
- shot_type: close_up, medium_shot, wide_shot, extreme_close_up, full_shot
- lighting: natural, soft, hard, backlight, golden_hour`
      },
      {
        role: 'user',
        content: `【当前视频参数】
- 图片: 一张海边日落的照片
- 运镜方式: 未设置
- 景别: 未设置
- 光线: 未设置
- 主体运动: 未设置

【用户需求】
我想要一个浪漫温馨的视频效果

【请提供建议】
请分析需求,给出优化建议。务必以 JSON 格式返回。`
      }
    ],
    parameters: {
      temperature: 0.7,
      top_p: 0.8,
      max_tokens: 500
    }
  }
];

/**
 * 测试千问 LLM API
 */
async function testQwenLLM(scenario) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`测试场景: ${scenario.name}`);
  console.log(`${'='.repeat(60)}\n`);

  try {
    console.log(`📤 发送请求...`);
    console.log(`模型: ${scenario.model}`);
    console.log(`消息数量: ${scenario.messages.length}`);
    console.log(`参数:`, JSON.stringify(scenario.parameters, null, 2));

    const requestBody = {
      model: scenario.model,
      input: {
        messages: scenario.messages
      },
      parameters: {
        ...scenario.parameters,
        result_format: 'message'
      }
    };

    console.log(`\n完整请求体:`, JSON.stringify(requestBody, null, 2));

    const startTime = Date.now();

    const response = await axios.post(
      `${API_BASE}/services/aigc/text-generation/generation`,
      requestBody,
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    const duration = Date.now() - startTime;

    console.log(`\n✅ 请求成功! (耗时: ${duration}ms)`);
    console.log(`\n📥 响应详情:`);
    console.log(`Request ID: ${response.data.request_id}`);
    console.log(`状态码: ${response.status}`);

    if (response.data.output) {
      const output = response.data.output;
      console.log(`\n输出格式: ${output.choices ? 'choices' : 'text'}`);

      if (output.choices && output.choices.length > 0) {
        const choice = output.choices[0];
        console.log(`Finish Reason: ${choice.finish_reason}`);
        console.log(`\nAI 回复:`);
        console.log(`${'─'.repeat(60)}`);
        console.log(choice.message.content);
        console.log(`${'─'.repeat(60)}`);

        // 尝试解析 JSON (如果是视频参数优化场景)
        if (scenario.name.includes('视频参数')) {
          try {
            const jsonMatch = choice.message.content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              console.log(`\n✅ JSON 解析成功:`);
              console.log(JSON.stringify(parsed, null, 2));
            }
          } catch (e) {
            console.log(`\n⚠️  JSON 解析失败: ${e.message}`);
          }
        }
      } else if (output.text) {
        console.log(`\nAI 回复:`);
        console.log(`${'─'.repeat(60)}`);
        console.log(output.text);
        console.log(`${'─'.repeat(60)}`);
      }

      // 使用统计
      if (response.data.usage) {
        console.log(`\n📊 Token 使用统计:`);
        console.log(`输入 Tokens: ${response.data.usage.input_tokens || 0}`);
        console.log(`输出 Tokens: ${response.data.usage.output_tokens || 0}`);
        console.log(`总计 Tokens: ${response.data.usage.total_tokens || 0}`);
      }
    }

    return true;
  } catch (error) {
    console.log(`\n❌ 请求失败!`);
    console.log(`错误类型: ${error.name}`);
    console.log(`错误消息: ${error.message}`);

    if (error.response) {
      console.log(`\nAPI 错误详情:`);
      console.log(`状态码: ${error.response.status}`);
      console.log(`响应数据:`, JSON.stringify(error.response.data, null, 2));
    } else if (error.code) {
      console.log(`错误代码: ${error.code}`);
    }

    return false;
  }
}

/**
 * 主函数
 */
async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║     千问 LLM API 测试脚本                                  ║
║     Qwen LLM API Test Script                              ║
╚════════════════════════════════════════════════════════════╝
`);

  // 检查 API Key
  if (!API_KEY) {
    console.error(`❌ 错误: DASHSCOPE_API_KEY 未配置`);
    console.error(`请在项目根目录的 .env 文件中添加:`);
    console.error(`DASHSCOPE_API_KEY=your-api-key-here`);
    console.error(`\nAPI Key 获取地址: https://bailian.console.aliyun.com/`);
    process.exit(1);
  }

  console.log(`✅ API Key 已配置: ${API_KEY.substring(0, 10)}...${API_KEY.substring(API_KEY.length - 4)}`);
  console.log(`✅ API 端点: ${API_BASE}`);

  // 运行所有测试场景
  const results = [];
  for (const scenario of TEST_SCENARIOS) {
    const success = await testQwenLLM(scenario);
    results.push({ name: scenario.name, success });

    // 等待一下,避免请求过快
    if (TEST_SCENARIOS.indexOf(scenario) < TEST_SCENARIOS.length - 1) {
      console.log(`\n⏳ 等待 2 秒后继续下一个测试...\n`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // 总结
  console.log(`\n${'='.repeat(60)}`);
  console.log(`测试总结`);
  console.log(`${'='.repeat(60)}\n`);

  results.forEach(result => {
    const status = result.success ? '✅ 成功' : '❌ 失败';
    console.log(`${status} - ${result.name}`);
  });

  const successCount = results.filter(r => r.success).length;
  const totalCount = results.length;

  console.log(`\n总计: ${successCount}/${totalCount} 个测试通过`);

  if (successCount === totalCount) {
    console.log(`\n🎉 所有测试通过! 千问 LLM API 配置正确,可以开始后端集成。`);
  } else {
    console.log(`\n⚠️  部分测试失败,请检查错误信息并修复配置。`);
  }
}

// 运行测试
main().catch(error => {
  console.error(`\n💥 未捕获的错误:`, error);
  process.exit(1);
});
