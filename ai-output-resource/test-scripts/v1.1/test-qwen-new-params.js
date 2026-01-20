/**
 * v1.1 Qwen API Parameter Verification Script
 *
 * Purpose: Test wan2.6-i2v model parameters for v1.1 feature support
 * Model: wan2.6-i2v (Image-to-Video)
 * API: DashScope Video Synthesis
 *
 * Tests:
 * 1. Duration parameter (5, 10, 15 seconds)
 * 2. Aspect ratio via input image dimensions
 * 3. Motion intensity via prompt enhancement
 * 4. Quality/Resolution parameter (720P, 1080P)
 */

require('dotenv').config({ path: '../../.env' });
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const API_KEY = process.env.DASHSCOPE_API_KEY;
const API_BASE_URL = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis';

if (!API_KEY) {
  console.error('❌ Error: DASHSCOPE_API_KEY not found in .env file');
  process.exit(1);
}

// Test configuration
const TEST_IMAGE_URL = 'https://dashscope.oss-cn-beijing.aliyuncs.com/images/dog_and_girl.jpeg'; // Sample from Qwen docs

/**
 * Submit video generation task
 */
async function submitTask(params) {
  try {
    const response = await axios.post(
      API_BASE_URL,
      {
        model: 'wan2.6-i2v',
        input: {
          prompt: params.prompt,
          img_url: params.imageUrl
        },
        parameters: {
          resolution: params.resolution || '1080P',
          duration: params.duration || 5,
          prompt_extend: true
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
          'X-DashScope-Async': 'enable'
        }
      }
    );

    if (response.data.output && response.data.output.task_id) {
      return {
        success: true,
        taskId: response.data.output.task_id,
        requestId: response.data.request_id
      };
    } else {
      return {
        success: false,
        error: 'No task_id in response',
        data: response.data
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message
    };
  }
}

/**
 * Poll task status
 */
async function pollTaskStatus(taskId, maxAttempts = 60, interval = 5000) {
  const pollUrl = `https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await axios.get(pollUrl, {
        headers: {
          'Authorization': `Bearer ${API_KEY}`
        }
      });

      const status = response.data.output?.task_status;
      const progress = response.data.output?.task_metrics?.TOTAL;

      process.stdout.write(`\r  Polling (${attempt}/${maxAttempts}): ${status} ${progress || ''}`);

      if (status === 'SUCCEEDED') {
        console.log(''); // New line
        return {
          success: true,
          videoUrl: response.data.output.video_url,
          duration: response.data.output.duration,
          resolution: response.data.output.resolution
        };
      } else if (status === 'FAILED') {
        console.log(''); // New line
        return {
          success: false,
          error: response.data.output.message || 'Task failed'
        };
      }

      // Still running, wait and continue
      await new Promise(resolve => setTimeout(resolve, interval));
    } catch (error) {
      console.log(''); // New line
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  console.log(''); // New line
  return {
    success: false,
    error: 'Timeout: Task did not complete within expected time'
  };
}

/**
 * Test Suite
 */
async function runTests() {
  console.log('='.repeat(60));
  console.log('v1.1 Qwen API Parameter Verification');
  console.log('='.repeat(60));
  console.log(`API Key: ${API_KEY.substring(0, 10)}...`);
  console.log(`Model: wan2.6-i2v`);
  console.log(`Test Image: ${TEST_IMAGE_URL}`);
  console.log('');

  const testResults = [];

  // Test 1: Duration Parameter (5 seconds)
  console.log('Test 1: Duration = 5 seconds');
  console.log('-'.repeat(60));
  const test1 = await submitTask({
    imageUrl: TEST_IMAGE_URL,
    prompt: 'Dog and girl walking naturally in the park',
    duration: 5,
    resolution: '720P'
  });

  if (test1.success) {
    console.log(`✅ Task submitted: ${test1.taskId}`);
    const result1 = await pollTaskStatus(test1.taskId);
    if (result1.success) {
      console.log(`✅ Video generated successfully`);
      console.log(`   Duration: ${result1.duration}s`);
      console.log(`   Resolution: ${result1.resolution}`);
      console.log(`   URL: ${result1.videoUrl}`);
      testResults.push({ test: 'Duration 5s', status: 'PASS', duration: result1.duration });
    } else {
      console.log(`❌ Failed: ${result1.error}`);
      testResults.push({ test: 'Duration 5s', status: 'FAIL', error: result1.error });
    }
  } else {
    console.log(`❌ Submission failed: ${JSON.stringify(test1.error)}`);
    testResults.push({ test: 'Duration 5s', status: 'FAIL', error: test1.error });
  }
  console.log('');

  // Test 2: Duration Parameter (10 seconds)
  console.log('Test 2: Duration = 10 seconds');
  console.log('-'.repeat(60));
  const test2 = await submitTask({
    imageUrl: TEST_IMAGE_URL,
    prompt: 'Dog and girl running quickly in the park',
    duration: 10,
    resolution: '1080P'
  });

  if (test2.success) {
    console.log(`✅ Task submitted: ${test2.taskId}`);
    const result2 = await pollTaskStatus(test2.taskId);
    if (result2.success) {
      console.log(`✅ Video generated successfully`);
      console.log(`   Duration: ${result2.duration}s`);
      console.log(`   Resolution: ${result2.resolution}`);
      console.log(`   URL: ${result2.videoUrl}`);
      testResults.push({ test: 'Duration 10s', status: 'PASS', duration: result2.duration });
    } else {
      console.log(`❌ Failed: ${result2.error}`);
      testResults.push({ test: 'Duration 10s', status: 'FAIL', error: result2.error });
    }
  } else {
    console.log(`❌ Submission failed: ${JSON.stringify(test2.error)}`);
    testResults.push({ test: 'Duration 10s', status: 'FAIL', error: test2.error });
  }
  console.log('');

  // Test 3: Motion Intensity via Prompt (Slow motion)
  console.log('Test 3: Motion Intensity = 1 (Slow) via Prompt Keywords');
  console.log('-'.repeat(60));
  const test3 = await submitTask({
    imageUrl: TEST_IMAGE_URL,
    prompt: 'Dog and girl walking very slowly, with subtle and minimal movement',
    duration: 5,
    resolution: '720P'
  });

  if (test3.success) {
    console.log(`✅ Task submitted: ${test3.taskId}`);
    const result3 = await pollTaskStatus(test3.taskId);
    if (result3.success) {
      console.log(`✅ Video generated successfully`);
      console.log(`   Note: Motion speed should appear slow (subjective)`);
      console.log(`   URL: ${result3.videoUrl}`);
      testResults.push({ test: 'Motion Intensity Low', status: 'PASS' });
    } else {
      console.log(`❌ Failed: ${result3.error}`);
      testResults.push({ test: 'Motion Intensity Low', status: 'FAIL', error: result3.error });
    }
  } else {
    console.log(`❌ Submission failed: ${JSON.stringify(test3.error)}`);
    testResults.push({ test: 'Motion Intensity Low', status: 'FAIL', error: test3.error });
  }
  console.log('');

  // Test 4: Motion Intensity via Prompt (Fast motion)
  console.log('Test 4: Motion Intensity = 5 (Fast) via Prompt Keywords');
  console.log('-'.repeat(60));
  const test4 = await submitTask({
    imageUrl: TEST_IMAGE_URL,
    prompt: 'Dog and girl running very fast, with high energy and rapid movements',
    duration: 5,
    resolution: '720P'
  });

  if (test4.success) {
    console.log(`✅ Task submitted: ${test4.taskId}`);
    const result4 = await pollTaskStatus(test4.taskId);
    if (result4.success) {
      console.log(`✅ Video generated successfully`);
      console.log(`   Note: Motion speed should appear fast (subjective)`);
      console.log(`   URL: ${result4.videoUrl}`);
      testResults.push({ test: 'Motion Intensity High', status: 'PASS' });
    } else {
      console.log(`❌ Failed: ${result4.error}`);
      testResults.push({ test: 'Motion Intensity High', status: 'FAIL', error: result4.error });
    }
  } else {
    console.log(`❌ Submission failed: ${JSON.stringify(test4.error)}`);
    testResults.push({ test: 'Motion Intensity High', status: 'FAIL', error: test4.error });
  }
  console.log('');

  // Test 5: Quality/Resolution Parameter (720P)
  console.log('Test 5: Resolution = 720P (Draft Quality)');
  console.log('-'.repeat(60));
  const test5 = await submitTask({
    imageUrl: TEST_IMAGE_URL,
    prompt: 'Dog and girl playing naturally',
    duration: 5,
    resolution: '720P'
  });

  if (test5.success) {
    console.log(`✅ Task submitted: ${test5.taskId}`);
    const result5 = await pollTaskStatus(test5.taskId);
    if (result5.success) {
      console.log(`✅ Video generated successfully`);
      console.log(`   Resolution: ${result5.resolution} (Expected: 720P)`);
      console.log(`   URL: ${result5.videoUrl}`);
      testResults.push({ test: '720P Resolution', status: 'PASS', resolution: result5.resolution });
    } else {
      console.log(`❌ Failed: ${result5.error}`);
      testResults.push({ test: '720P Resolution', status: 'FAIL', error: result5.error });
    }
  } else {
    console.log(`❌ Submission failed: ${JSON.stringify(test5.error)}`);
    testResults.push({ test: '720P Resolution', status: 'FAIL', error: test5.error });
  }
  console.log('');

  // Test 6: Quality/Resolution Parameter (1080P)
  console.log('Test 6: Resolution = 1080P (Standard/High Quality)');
  console.log('-'.repeat(60));
  const test6 = await submitTask({
    imageUrl: TEST_IMAGE_URL,
    prompt: 'Dog and girl sitting peacefully',
    duration: 5,
    resolution: '1080P'
  });

  if (test6.success) {
    console.log(`✅ Task submitted: ${test6.taskId}`);
    const result6 = await pollTaskStatus(test6.taskId);
    if (result6.success) {
      console.log(`✅ Video generated successfully`);
      console.log(`   Resolution: ${result6.resolution} (Expected: 1080P)`);
      console.log(`   URL: ${result6.videoUrl}`);
      testResults.push({ test: '1080P Resolution', status: 'PASS', resolution: result6.resolution });
    } else {
      console.log(`❌ Failed: ${result6.error}`);
      testResults.push({ test: '1080P Resolution', status: 'FAIL', error: result6.error });
    }
  } else {
    console.log(`❌ Submission failed: ${JSON.stringify(test6.error)}`);
    testResults.push({ test: '1080P Resolution', status: 'FAIL', error: test6.error });
  }
  console.log('');

  // Test Summary
  console.log('='.repeat(60));
  console.log('Test Summary');
  console.log('='.repeat(60));
  testResults.forEach((result, index) => {
    const status = result.status === 'PASS' ? '✅' : '❌';
    console.log(`${status} Test ${index + 1}: ${result.test}`);
    if (result.duration) console.log(`   Actual Duration: ${result.duration}s`);
    if (result.resolution) console.log(`   Actual Resolution: ${result.resolution}`);
    if (result.error) console.log(`   Error: ${result.error}`);
  });
  console.log('');

  const passedTests = testResults.filter(r => r.status === 'PASS').length;
  const totalTests = testResults.length;
  console.log(`Total: ${passedTests}/${totalTests} tests passed`);
  console.log('');

  // Save results to file
  const reportPath = path.join(__dirname, '../../docs/v1.1-api-test-results.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    model: 'wan2.6-i2v',
    results: testResults
  }, null, 2));
  console.log(`📄 Results saved to: ${reportPath}`);
}

// Run tests
runTests().catch(error => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
});
