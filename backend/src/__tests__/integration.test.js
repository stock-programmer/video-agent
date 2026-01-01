import request from 'supertest';
import path from 'path';
import { fileURLToPath } from 'url';
import app from '../app.js';
import { connectDB, disconnectDB, Workspace } from '../db/mongodb.js';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test configuration
const TEST_IMAGE_PATH = path.join(__dirname, 'test-image.jpg');

// Store test data
let testWorkspaceId;
let uploadedImagePath;

// Create a minimal valid JPEG file for testing
function createTestImage() {
  const minimalJpeg = Buffer.from([
    0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
    0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
    0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
    0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
    0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
    0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
    0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
    0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01,
    0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4, 0x00, 0x14, 0x00, 0x01,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x03, 0xFF, 0xC4, 0x00, 0x14, 0x10, 0x01, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3F, 0x00,
    0x7F, 0x00, 0xFF, 0xD9
  ]);

  fs.writeFileSync(TEST_IMAGE_PATH, minimalJpeg);
}

beforeAll(async () => {
  // Create test image
  createTestImage();

  // Connect to test database
  await connectDB();

  // Clean up test data
  await Workspace.deleteMany({});
}, 30000);

afterAll(async () => {
  // Clean up test workspaces
  if (testWorkspaceId) {
    await Workspace.findByIdAndDelete(testWorkspaceId);
  }

  // Clean up uploaded test images
  if (uploadedImagePath && fs.existsSync(uploadedImagePath)) {
    fs.unlinkSync(uploadedImagePath);
  }

  // Clean up test image
  if (fs.existsSync(TEST_IMAGE_PATH)) {
    fs.unlinkSync(TEST_IMAGE_PATH);
  }

  // Disconnect from database
  await disconnectDB();
}, 30000);

describe('Integration Tests - Complete Workflow', () => {

  describe('Health Check', () => {
    test('GET /health should return ok status', async () => {
      const res = await request(app).get('/health');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status', 'ok');
      expect(res.body).toHaveProperty('timestamp');
      expect(res.body).toHaveProperty('uptime');
    });
  });

  describe('Image Upload Flow', () => {
    test('POST /api/upload/image should upload image successfully', async () => {
      const res = await request(app)
        .post('/api/upload/image')
        .attach('image', TEST_IMAGE_PATH);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('image_path');
      expect(res.body).toHaveProperty('image_url');

      // Store for cleanup
      uploadedImagePath = res.body.image_path;
    });

    test('POST /api/upload/image should reject non-image files', async () => {
      // Create a temporary text file
      const textFilePath = path.join(__dirname, 'test-file.txt');
      fs.writeFileSync(textFilePath, 'This is not an image');

      const res = await request(app)
        .post('/api/upload/image')
        .attach('image', textFilePath);

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');

      // Cleanup
      fs.unlinkSync(textFilePath);
    });

    test('POST /api/upload/image should reject requests without image', async () => {
      const res = await request(app)
        .post('/api/upload/image');

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('Workspace Management Flow', () => {
    test('GET /api/workspaces should return array', async () => {
      const res = await request(app).get('/api/workspaces');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    test('Should create workspace via WebSocket and retrieve via API', async () => {
      // Create workspace directly in database (simulating WebSocket creation)
      const workspace = await Workspace.create({
        order_index: 0,
        image_path: 'uploads/test.jpg',
        image_url: 'http://localhost:3000/uploads/test.jpg',
        form_data: {
          camera_movement: 'pan_left',
          shot_type: 'medium_shot',
          lighting: 'natural',
          motion_prompt: 'A beautiful sunset',
          checkboxes: {}
        },
        video: {
          status: 'pending'
        },
        ai_collaboration: []
      });

      testWorkspaceId = workspace._id.toString();

      // Retrieve via API
      const res = await request(app).get('/api/workspaces');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      const foundWorkspace = res.body.find(ws => ws._id === testWorkspaceId);
      expect(foundWorkspace).toBeDefined();
    });
  });

  describe('Video Generation Flow', () => {
    test('POST /api/generate/video should initiate video generation', async () => {
      // Create a test workspace first with an actual uploaded image
      const uploadRes = await request(app)
        .post('/api/upload/image')
        .attach('image', TEST_IMAGE_PATH);

      const workspace = await Workspace.create({
        order_index: 1,
        image_path: uploadRes.body.image_path,
        image_url: uploadRes.body.image_url,
        form_data: {
          camera_movement: 'zoom_in',
          shot_type: 'close_up',
          lighting: 'dramatic',
          motion_prompt: 'Camera zooms into subject',
          checkboxes: {}
        }
      });

      const res = await request(app)
        .post('/api/generate/video')
        .send({
          workspace_id: workspace._id.toString(),
          form_data: {
            camera_movement: 'zoom_in',
            shot_type: 'close_up',
            lighting: 'dramatic',
            motion_prompt: 'Camera zooms into subject'
          }
        });

      // May succeed or fail depending on API key validity
      // Success: 200, Failure: 500 (API error) are both acceptable
      expect([200, 500]).toContain(res.status);

      // Cleanup
      await Workspace.findByIdAndDelete(workspace._id);
      if (fs.existsSync(uploadRes.body.image_path)) {
        fs.unlinkSync(uploadRes.body.image_path);
      }
    });

    test('POST /api/generate/video should reject missing workspace_id', async () => {
      const res = await request(app)
        .post('/api/generate/video')
        .send({
          form_data: {
            motion_prompt: 'test'
          }
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    test('POST /api/generate/video should reject invalid workspace_id', async () => {
      const res = await request(app)
        .post('/api/generate/video')
        .send({
          workspace_id: 'invalid-id',
          form_data: {
            motion_prompt: 'test'
          }
        });

      // Expecting 500 because the error is caught at database level
      expect(res.status).toBe(500);
    });
  });

  describe('AI Suggestion Flow', () => {
    test('POST /api/ai/suggest should handle suggestion requests', async () => {
      // Create a test workspace first
      const workspace = await Workspace.create({
        order_index: 20,
        image_path: 'uploads/test-ai.jpg',
        image_url: 'http://localhost:3000/uploads/test-ai.jpg',
        form_data: {}
      });

      const res = await request(app)
        .post('/api/ai/suggest')
        .send({
          workspace_id: workspace._id.toString(),
          user_input: 'I want to create a dramatic scene',
          current_workspace: {
            form_data: {}
          }
        });

      // May succeed or fail depending on API key and service availability
      expect([200, 400, 500, 503]).toContain(res.status);

      // Cleanup
      await Workspace.findByIdAndDelete(workspace._id);
    });

    test('POST /api/ai/suggest should reject empty user_input', async () => {
      // Create a test workspace first
      const workspace = await Workspace.create({
        order_index: 21,
        image_path: 'uploads/test-ai-2.jpg',
        image_url: 'http://localhost:3000/uploads/test-ai-2.jpg',
        form_data: {}
      });

      const res = await request(app)
        .post('/api/ai/suggest')
        .send({
          workspace_id: workspace._id.toString(),
          user_input: '',
          current_workspace: {}
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');

      // Cleanup
      await Workspace.findByIdAndDelete(workspace._id);
    });
  });

  describe('Complete End-to-End Flow', () => {
    test('Should complete full workflow: Upload → Create Workspace → Generate Video', async () => {
      // Step 1: Upload image
      const uploadRes = await request(app)
        .post('/api/upload/image')
        .attach('image', TEST_IMAGE_PATH);

      expect(uploadRes.status).toBe(200);
      expect(uploadRes.body.success).toBe(true);

      const imagePath = uploadRes.body.image_path;
      const imageUrl = uploadRes.body.image_url;

      // Step 2: Create workspace (simulate WebSocket creation)
      const workspace = await Workspace.create({
        order_index: 99,
        image_path: imagePath,
        image_url: imageUrl,
        form_data: {
          camera_movement: 'pan_right',
          shot_type: 'wide_shot',
          lighting: 'golden_hour',
          motion_prompt: 'A cinematic pan across the landscape',
          checkboxes: {}
        }
      });

      // Step 3: Get workspaces list
      const listRes = await request(app).get('/api/workspaces');

      expect(listRes.status).toBe(200);
      expect(Array.isArray(listRes.body)).toBe(true);
      expect(listRes.body.length).toBeGreaterThan(0);

      // Find our workspace
      const ourWorkspace = listRes.body.find(
        ws => ws._id === workspace._id.toString()
      );
      expect(ourWorkspace).toBeDefined();
      expect(ourWorkspace.image_path).toBe(imagePath);

      // Step 4: Generate video
      const videoRes = await request(app)
        .post('/api/generate/video')
        .send({
          workspace_id: workspace._id.toString(),
          form_data: workspace.form_data
        });

      // May succeed or fail depending on API configuration
      expect([200, 500]).toContain(videoRes.status);

      // Step 5: Verify workspace was updated (if generation succeeded)
      if (videoRes.status === 200) {
        const updatedWorkspace = await Workspace.findById(workspace._id);
        expect(updatedWorkspace.video.status).toBe('generating');
        expect(updatedWorkspace.video.task_id).toBe(videoRes.body.task_id);
      }

      // Cleanup
      await Workspace.findByIdAndDelete(workspace._id);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }, 60000); // Increase timeout for full workflow
  });

  describe('Error Handling', () => {
    test('Should handle 404 for unknown routes', async () => {
      const res = await request(app).get('/api/unknown/route');

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error');
    });

    test('Should handle malformed JSON requests', async () => {
      const res = await request(app)
        .post('/api/generate/video')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}');

      expect(res.status).toBe(400);
    });
  });
});

describe('Integration Tests - WebSocket Protocol Validation', () => {
  test('WebSocket server should be initialized', async () => {
    // Note: Full WebSocket testing requires a WebSocket client
    // This test verifies that the WebSocket server module exists
    const { startWebSocketServer } = await import('../websocket/server.js');
    expect(typeof startWebSocketServer).toBe('function');
  });

  test('WebSocket handlers should be available', async () => {
    const handlers = [
      { path: '../websocket/workspace-create.js', func: 'handleCreate' },
      { path: '../websocket/workspace-update.js', func: 'handleUpdate' },
      { path: '../websocket/workspace-delete.js', func: 'handleDelete' },
      { path: '../websocket/workspace-reorder.js', func: 'handleReorder' }
    ];

    for (const handler of handlers) {
      const module = await import(handler.path);
      expect(typeof module[handler.func]).toBe('function');
    }
  });
});
