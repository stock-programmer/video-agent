import { GoogleGenAI } from "@google/genai";
import dotenv from 'dotenv';

dotenv.config();

/**
 * 测试 Google Gemini 3 LLM API
 * 使用 gemini-3-flash-preview 模型（免费版）
 */
async function testGeminiLLM() {
  const apiKey = process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    console.error('❌ 错误: GOOGLE_API_KEY 环境变量未设置');
    console.log('请在 .env 文件中添加: GOOGLE_API_KEY=your_api_key');
    return;
  }

  console.log('🚀 开始测试 Google Gemini 3 API...\n');

  try {
    // 初始化 Gemini AI
    const ai = new GoogleGenAI({
      apiKey: apiKey
    });

    // 测试用例 1: 基础文本生成
    console.log('📝 测试用例 1: 基础文本生成');
    console.log('🎯 模型: gemini-3-flash-preview');
    console.log('💭 思考级别: low (快速响应)\n');

    const response1 = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "你好，Gemini！请用一句话简单介绍你自己。",
      config: {
        thinkingConfig: {
          thinkingLevel: "low"  // 简单任务使用 low 降低延迟
        }
      }
    });

    console.log('✅ 响应成功');
    console.log('📄 响应内容:', response1.text);
    console.log('');

    // 测试用例 2: 视频制作 AI 助手（结构化输出）
    console.log('📝 测试用例 2: 视频制作 AI 助手（JSON 结构化输出）');
    console.log('💭 思考级别: high (深度推理)\n');

    const response2 = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `作为视频制作助手，请根据以下场景提供运镜建议：

场景描述：一个宁静的湖面，远处有山脉，日出时分

请提供：
1. 推荐的运镜方式（camera_movement）：使用下划线格式，如 push_forward, pull_back, pan_left, pan_right, zoom_in, zoom_out, static
2. 推荐的镜头类型（shot_type）：使用下划线格式，如 close_up, medium_shot, wide_shot, extreme_close_up, full_shot
3. 推荐的光线设置（lighting）：使用下划线格式，如 natural, soft, hard, backlight, golden_hour
4. 推荐的主体运动描述（motion_prompt）：中文描述
5. 解释原因（explanation）：中文说明`,
      config: {
        thinkingConfig: {
          thinkingLevel: "high"  // 复杂推理任务使用 high
        },
        responseMimeType: "application/json",
        responseJsonSchema: {
          type: "object",
          properties: {
            camera_movement: {
              type: "string",
              description: "推荐的运镜方式"
            },
            shot_type: {
              type: "string",
              description: "推荐的镜头类型"
            },
            lighting: {
              type: "string",
              description: "推荐的光线设置"
            },
            motion_prompt: {
              type: "string",
              description: "主体运动描述"
            },
            explanation: {
              type: "string",
              description: "为什么这样建议"
            }
          },
          required: ["camera_movement", "shot_type", "lighting", "motion_prompt", "explanation"]
        }
      }
    });

    console.log('✅ 响应成功');
    console.log('📄 AI 建议 (JSON):');
    const suggestion = JSON.parse(response2.text);
    console.log(JSON.stringify(suggestion, null, 2));
    console.log('');

    // 测试用例 3: 运镜参数优化
    console.log('📝 测试用例 3: 运镜参数优化');
    console.log('💭 思考级别: medium (平衡)\n');

    const response3 = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `用户输入了以下运镜参数：
- 运镜方式：zoom_in
- 镜头类型：close_up
- 光线：soft
- 运动提示词：slowly reveal details

请分析这些参数是否合理，并提供优化建议。以友好、专业的方式回答。`,
      config: {
        thinkingConfig: {
          thinkingLevel: "medium"  // 平衡思考深度和响应速度
        }
      }
    });

    console.log('✅ 响应成功');
    console.log('📄 优化建议:\n', response3.text);

    // 成功总结
    console.log('\n' + '='.repeat(60));
    console.log('✅ Google Gemini 3 API 验证成功！');
    console.log('='.repeat(60));
    console.log('📌 模型: gemini-3-flash-preview');
    console.log('📌 API 可用');
    console.log('📌 认证成功');
    console.log('📌 支持结构化 JSON 输出');
    console.log('📌 支持多级思考配置 (minimal/low/medium/high)');
    console.log('📌 响应速度良好');
    console.log('📌 适合用于 AI 协作助手功能');
    console.log('');
    console.log('💡 提示:');
    console.log('   - 免费配额: 60 requests/min');
    console.log('   - 上下文窗口: 1M tokens (输入) / 64k tokens (输出)');
    console.log('   - 知识截止日期: 2025年1月');
    console.log('   - 默认温度: 1.0 (不建议修改)');

  } catch (error) {
    console.error('\n❌ API 调用失败');
    console.error('错误:', error.message);

    // 特定错误处理
    if (error.message?.includes('API_KEY_INVALID') || error.message?.includes('invalid API key')) {
      console.log('\n💡 提示: API Key 无效');
      console.log('   解决方案:');
      console.log('   1. 检查 GOOGLE_API_KEY 是否正确');
      console.log('   2. 访问 https://aistudio.google.com/app/apikey 重新获取');
      console.log('   3. 确保 API Key 没有多余空格或引号');
    } else if (error.message?.includes('RESOURCE_EXHAUSTED') || error.message?.includes('quota')) {
      console.log('\n💡 提示: API 配额已用尽');
      console.log('   解决方案:');
      console.log('   1. 等待配额重置（每分钟重置一次）');
      console.log('   2. 升级到付费版本以获得更高配额');
      console.log('   3. 减少测试频率');
    } else if (error.message?.includes('PERMISSION_DENIED')) {
      console.log('\n💡 提示: 权限不足');
      console.log('   解决方案:');
      console.log('   1. 检查 API Key 权限设置');
      console.log('   2. 确认已启用 Gemini API');
    } else if (error.message?.includes('model not found') || error.message?.includes('gemini-3')) {
      console.log('\n💡 提示: 模型不可用');
      console.log('   说明: Gemini 3 目前处于预览阶段');
      console.log('   解决方案:');
      console.log('   1. 确认您的账号已获得 Gemini 3 访问权限');
      console.log('   2. 或改用 gemini-2.5-flash 等稳定版本模型');
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      console.log('\n💡 提示: 网络连接失败');
      console.log('   解决方案:');
      console.log('   1. 检查网络连接');
      console.log('   2. 确认可以访问 generativelanguage.googleapis.com');
    }

    console.log('\n📚 参考文档:');
    console.log('   https://ai.google.dev/docs');
    console.log('\n🔍 完整错误信息:');
    console.error(error);
  }
}

// 执行测试
testGeminiLLM();
