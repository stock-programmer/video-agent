# API Documentation

**Version**: 1.1.0
**Last Updated**: 2025-01-14

## Overview

This document describes the REST API and WebSocket API for the AI Video Generation Platform. The API supports both v1.0 and v1.1 features with full backward compatibility.

**Base URLs**:
- REST API: `http://localhost:3000`
- WebSocket: `ws://localhost:3001`

## REST API Endpoints

### 1. Upload Image

Upload an image file to be used for video generation.

**Endpoint**: `POST /api/upload/image`

**Content-Type**: `multipart/form-data`

**Request Body**:
- `image` (file, required): Image file (JPEG, PNG, GIF)
- Maximum file size: 10MB

**Response** (200 OK):
```json
{
  "success": true,
  "image_path": "/uploads/1234567890-image.jpg",
  "image_url": "http://localhost:3000/uploads/1234567890-image.jpg"
}
```

**Error Response** (400 Bad Request):
```json
{
  "success": false,
  "message": "No image file provided"
}
```

**Example**:
```bash
curl -X POST http://localhost:3000/api/upload/image \
  -F "image=@/path/to/image.jpg"
```

---

### 2. Generate Video

Trigger video generation from an uploaded image with specified parameters.

**Endpoint**: `POST /api/generate/video`

**Content-Type**: `application/json`

**Request Body**:
```json
{
  "workspace_id": "string (required)",
  "form_data": {
    // v1.0 fields (optional)
    "camera_movement": "string",
    "shot_type": "string",
    "lighting": "string",
    "motion_prompt": "string",
    "checkboxes": {},

    // v1.1 fields (optional, defaults provided)
    "duration": 5 | 10 | 15,                    // seconds, default: 5
    "aspect_ratio": "16:9" | "9:16" | "1:1" | "4:3",  // default: "16:9"
    "motion_intensity": 1 | 2 | 3 | 4 | 5,     // default: 3
    "quality_preset": "draft" | "standard" | "high"   // default: "standard"
  }
}
```

**Field Descriptions**:

| Field | Type | Required | Description | Valid Values |
|-------|------|----------|-------------|--------------|
| `workspace_id` | string | Yes | ID of the workspace containing the image | MongoDB ObjectId |
| `camera_movement` | string | No | Camera movement type | Any string |
| `shot_type` | string | No | Shot type description | Any string |
| `lighting` | string | No | Lighting description | Any string |
| `motion_prompt` | string | No | Detailed motion description | Any string |
| `duration` | number | No | Video duration in seconds | 5, 10, 15 |
| `aspect_ratio` | string | No | Video aspect ratio | "16:9", "9:16", "1:1", "4:3" |
| `motion_intensity` | number | No | Motion dynamics level | 1, 2, 3, 4, 5 |
| `quality_preset` | string | No | Quality vs speed tradeoff | "draft", "standard", "high" |

**Response** (200 OK):
```json
{
  "success": true,
  "task_id": "abc123def456",
  "message": "Video generation started"
}
```

**Error Response** (400 Bad Request):
```json
{
  "success": false,
  "message": "Invalid form data",
  "errors": [
    "Invalid duration: 20. Must be 5, 10, or 15.",
    "Invalid motion_intensity: 10. Must be between 1 and 5."
  ]
}
```

**Error Response** (404 Not Found):
```json
{
  "success": false,
  "message": "Workspace not found"
}
```

**Example** (v1.0 - backward compatible):
```bash
curl -X POST http://localhost:3000/api/generate/video \
  -H "Content-Type: application/json" \
  -d '{
    "workspace_id": "507f1f77bcf86cd799439011",
    "form_data": {
      "motion_prompt": "Person walking in the park"
    }
  }'
```

**Example** (v1.1 - with all parameters):
```bash
curl -X POST http://localhost:3000/api/generate/video \
  -H "Content-Type: application/json" \
  -d '{
    "workspace_id": "507f1f77bcf86cd799439011",
    "form_data": {
      "motion_prompt": "Person running in the city",
      "camera_movement": "tracking shot",
      "shot_type": "medium shot",
      "lighting": "golden hour",
      "duration": 10,
      "aspect_ratio": "9:16",
      "motion_intensity": 5,
      "quality_preset": "high"
    }
  }'
```

---

### 3. Get Workspaces

Retrieve all workspaces for the current user.

**Endpoint**: `GET /api/workspaces`

**Response** (200 OK):
```json
{
  "success": true,
  "workspaces": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "order_index": 0,
      "image_path": "/uploads/image1.jpg",
      "image_url": "http://localhost:3000/uploads/image1.jpg",
      "form_data": {
        "camera_movement": "pan right",
        "shot_type": "wide shot",
        "lighting": "natural",
        "motion_prompt": "Sunset over mountains",
        "duration": 10,
        "aspect_ratio": "16:9",
        "motion_intensity": 3,
        "quality_preset": "standard"
      },
      "video": {
        "status": "completed",
        "task_id": "abc123",
        "url": "http://example.com/video.mp4",
        "error": ""
      },
      "ai_collaboration": [],
      "created_at": "2025-01-14T10:00:00.000Z",
      "updated_at": "2025-01-14T10:05:00.000Z"
    }
  ]
}
```

**Example**:
```bash
curl -X GET http://localhost:3000/api/workspaces
```

---

### 4. AI Collaboration Suggestions

Get AI-powered suggestions for improving video generation prompts.

**Endpoint**: `POST /api/ai/suggest`

**Content-Type**: `application/json`

**Request Body**:
```json
{
  "workspace_id": "string (required)",
  "current_prompt": "string (optional)"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "suggestions": [
    "Add more specific camera movement details",
    "Consider using 'golden hour' lighting for warmer tones",
    "Increase motion intensity to 4 for more dynamic action"
  ]
}
```

**Example**:
```bash
curl -X POST http://localhost:3000/api/ai/suggest \
  -H "Content-Type: application/json" \
  -d '{
    "workspace_id": "507f1f77bcf86cd799439011",
    "current_prompt": "Person walking"
  }'
```

---

### 5. Access Uploaded Images

Retrieve uploaded image files.

**Endpoint**: `GET /api/uploads/:filename`

**Response**: Image file (JPEG, PNG, GIF)

**Example**:
```bash
curl -X GET http://localhost:3000/api/uploads/1234567890-image.jpg
```

---

## WebSocket API

**Connection URL**: `ws://localhost:3001`

The WebSocket API provides real-time bidirectional communication for workspace operations and video generation status updates.

### Connection

```javascript
const ws = new WebSocket('ws://localhost:3001');

ws.onopen = () => {
  console.log('Connected to WebSocket server');
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Received:', message);
};
```

### Client → Server Events

#### 1. workspace.create

Create a new workspace.

**Message Format**:
```json
{
  "type": "workspace.create",
  "data": {
    "image_path": "/uploads/image.jpg",
    "image_url": "http://localhost:3000/uploads/image.jpg",
    "form_data": {
      "motion_prompt": "Person walking",
      "duration": 5,
      "aspect_ratio": "16:9",
      "motion_intensity": 3,
      "quality_preset": "standard"
    }
  }
}
```

**Server Response**:
```json
{
  "type": "workspace.created",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "order_index": 0,
    "image_path": "/uploads/image.jpg",
    "form_data": { ... },
    "video": { "status": "pending", ... }
  }
}
```

#### 2. workspace.update

Update an existing workspace (incremental updates supported).

**Message Format**:
```json
{
  "type": "workspace.update",
  "data": {
    "workspace_id": "507f1f77bcf86cd799439011",
    "updates": {
      "form_data": {
        "duration": 10
      }
    }
  }
}
```

**Note**: Only the fields provided in `updates.form_data` will be updated. Other fields remain unchanged.

**Server Response**:
```json
{
  "type": "workspace.sync_confirm",
  "workspace_id": "507f1f77bcf86cd799439011",
  "data": { ... }
}
```

#### 3. workspace.delete

Delete a workspace.

**Message Format**:
```json
{
  "type": "workspace.delete",
  "data": {
    "workspace_id": "507f1f77bcf86cd799439011"
  }
}
```

**Server Response**:
```json
{
  "type": "workspace.deleted",
  "workspace_id": "507f1f77bcf86cd799439011"
}
```

#### 4. workspace.reorder

Reorder workspaces.

**Message Format**:
```json
{
  "type": "workspace.reorder",
  "data": {
    "workspace_ids": [
      "507f1f77bcf86cd799439011",
      "507f1f77bcf86cd799439012",
      "507f1f77bcf86cd799439013"
    ]
  }
}
```

**Server Response**:
```json
{
  "type": "workspaces.reordered",
  "data": { ... }
}
```

### Server → Client Events

#### 1. video.status_update

Sent when video generation status changes.

**Message Format**:
```json
{
  "type": "video.status_update",
  "workspace_id": "507f1f77bcf86cd799439011",
  "data": {
    "status": "generating",
    "task_id": "abc123",
    "url": "",
    "error": ""
  }
}
```

**Status Values**:
- `pending`: Video generation not started
- `generating`: Video is being generated
- `completed`: Video generation successful
- `failed`: Video generation failed

#### 2. error

Sent when an error occurs.

**Message Format**:
```json
{
  "type": "error",
  "data": {
    "message": "Invalid form data",
    "errors": [
      "Invalid duration: 20. Must be 5, 10, or 15."
    ]
  }
}
```

---

## v1.1 Backward Compatibility

All v1.1 parameters are optional. If not provided, the following defaults are applied:

| Parameter | Default Value | Description |
|-----------|---------------|-------------|
| `duration` | 5 | Minimum supported duration |
| `aspect_ratio` | "16:9" | Standard widescreen format |
| `motion_intensity` | 3 | Medium motion level |
| `quality_preset` | "standard" | Balanced quality/speed |

**Example**: v1.0 request (still works in v1.1):
```json
{
  "workspace_id": "507f1f77bcf86cd799439011",
  "form_data": {
    "motion_prompt": "Person walking"
  }
}
```

This request will automatically use default values for all v1.1 parameters.

---

## Error Codes

| HTTP Status | Description | Common Causes |
|-------------|-------------|---------------|
| 400 | Bad Request | Invalid parameters, validation errors |
| 404 | Not Found | Workspace not found, image not found |
| 500 | Internal Server Error | Database errors, third-party API failures |

---

## Notes

1. **Duration Values**: Only 5, 10, and 15 seconds are supported (based on Qwen API capabilities)
2. **WebSocket Debouncing**: Frontend implements 300ms debounce for form updates to prevent excessive messages
3. **Incremental Updates**: `workspace.update` only modifies provided fields, leaving others unchanged
4. **Field Validation**: All v1.1 parameters are validated server-side before database writes
5. **Default Values**: Applied automatically for backward compatibility with v1.0 workspaces

---

**Last Updated**: 2025-01-14
**API Version**: 1.1.0
