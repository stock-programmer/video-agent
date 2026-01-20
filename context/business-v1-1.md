# AI Video Generation Platform - v1.1 Feature Planning

## Version Overview

### v1.0 (Current - MVP)
**Status**: ✅ Completed and Deployed

**Core Features**: Image-to-Video generation with basic parameters (camera movement, shot type, lighting, motion prompt)

**Product Positioning**: 图生视频（Image-to-Video）- 让现有图片动起来

**Known Limitations**:
- No control over video duration (uses API default)
- No aspect ratio selection (defaults to 16:9)
- Motion control relies only on text descriptions (ambiguous)
- No quality presets (generation speed vs output quality trade-off)

---

## ⚠️ Critical Design Principle for v1.1

**图生视频 vs 文生视频的关键区别**:

- **文生视频**: 需要描述所有画面元素（镜头焦距、拍摄角度、景深、构图、场景、道具等）
- **图生视频（我们的产品）**: 图片已经包含了静态信息（构图、角度、景深、色调等），我们只需要控制**"如何动起来"**

**因此，v1.1新增参数应聚焦于**:
1. 运动控制（时长、强度、方式）
2. 输出格式（宽高比、质量）
3. 可选的动态变化效果（光线变化、后期滤镜）

**避免冗余参数**:
- ❌ 镜头焦距 - 图片的透视关系已固定
- ❌ 拍摄角度 - 图片已经是仰视/俯视/平视
- ❌ 景深 - 背景虚化与否图片已确定
- ❌ 构图方式 - 图片构图已定
- ❌ 静态光线描述 - 图片光影关系已固定

---

## v1.1 Priority Features

### 1. Enhanced Video Generation Form Parameters

#### 1.1 Video Duration Control ⚠️ **HIGH PRIORITY**

**Current Issue**: Users cannot specify how long the generated video should be. The API uses default duration which may not meet user needs.

**Why Necessary for Image-to-Video**:
- Duration is NOT embedded in static images
- Critical for controlling video output length

**Proposed Solution** (✅ **UPDATED after API verification**):
- **UI Component**: Dropdown or segmented button group
- **Options** (based on Qwen wan2.6-i2v API capabilities):
  - **5 seconds** (short clips) - Quick motion/action shots
  - **10 seconds** (standard) - Recommended for most scenes
  - **15 seconds** (extended) - Longer narrative moments
- **Default**: 5 seconds
- **API Integration**: Pass `duration` parameter to Qwen video generation API
  - API Parameter: `parameters.duration` with values: 5, 10, 15

**API Verification Result**:
- ✅ **Fully Supported** by Qwen wan2.6-i2v model
- ⚠️ **Note**: API only supports 5/10/15 seconds (NOT 2/4/6/8 as originally planned)
- **Source**: `ai-output-resource/docs/v1.1-api-verification-report.md`

**User Value**:
- Short clips (5s) for fast-paced montages and quick actions
- Standard clips (10s) for balanced narrative and establishing shots
- Extended clips (15s) for complex sequences and detailed movements
- Better control over final video length

---

#### 1.2 Aspect Ratio Selection ⚠️ **HIGH PRIORITY**

**Current Issue**: All videos are generated in default aspect ratio (matching input image), which doesn't work well when users want to repurpose content for different platforms.

**Why Necessary for Image-to-Video**:
- Users may want to crop/reframe existing images for different platforms
- 16:9 image → 9:16 vertical video for TikTok/Reels

**Proposed Solution** (✅ **UPDATED after API verification**):
- **UI Component**: Radio buttons or icon-based selector with visual preview
- **Options**:
  - **16:9** (Landscape - 1920×1080) - YouTube, traditional video
  - **9:16** (Portrait - 1080×1920) - TikTok, Instagram Reels, Stories
  - **1:1** (Square - 1080×1080) - Instagram feed posts
  - **4:3** (Classic - 1440×1080) - Traditional TV format
- **Default**: 16:9
- **Visual Indicator**: Show preview boxes with aspect ratio shapes

**API Verification Result**:
- ❌ **Not Directly Supported** by Qwen API
- **API Behavior**: Output video aspect ratio is determined by input image dimensions
- **Workaround Required**: **Frontend image cropping before upload**
  - Crop/resize uploaded image to target dimensions before sending to API
  - User can preview crop area (recommended for v1.1)
  - Alternative: Automatic center crop (simpler but less control)
- **Source**: `ai-output-resource/docs/v1.1-api-verification-report.md`

**Implementation Strategy**:
1. **Frontend**: Add image crop/resize tool (canvas-based)
   - User selects aspect ratio
   - Show crop preview overlay on uploaded image
   - User can adjust crop area
   - Cropped image sent to backend
2. **Alternative (simpler)**: Automatic center crop
   - No user interaction required
   - May cut important image content

**User Value**:
- Create platform-specific content without post-processing
- Optimize composition for target platform
- Save time on reformatting/cropping

---

#### 1.3 Motion Intensity Control ⚠️ **HIGH PRIORITY**

**What is Motion Intensity?**

Motion intensity controls **how much movement** happens in the generated video. It affects:

1. **Subject Movement Speed**
   - Low: Subtle, slow movements (gentle breathing, slight head turn)
   - Medium: Natural walking pace, moderate gestures
   - High: Fast running, dramatic actions, dynamic camera work

2. **Camera Movement Magnitude**
   - Low: Minimal camera drift, stable shots
   - Medium: Noticeable but controlled camera movement
   - High: Sweeping camera motions, rapid zooms/pans

3. **Overall Video Dynamism**
   - Low: Calm, contemplative, minimal change (meditation scene)
   - Medium: Normal conversation or activity (people talking)
   - High: Action-packed, energetic (sports, chase scenes)

**Why It's Important**:
- Text prompts like "person walking" are ambiguous - walk slowly or run fast?
- Gives users precise control beyond just describing the motion
- Prevents mismatches between intended and generated energy levels

**Why Necessary for Image-to-Video**:
- Static images don't convey motion amplitude
- Same image + different intensity = completely different video mood

**Current Issue**:
Users can only describe motion in text ("person walks slowly"), which AI may interpret inconsistently. No direct control over motion amplitude.

**Proposed Solution** (✅ **UPDATED after API verification**):
- **UI Component**: Slider with 5 levels
- **Options**:
  - **1 (Extremely Calm)**: Minimal motion, subtle changes
  - **2 (Slow)**: Slow, gentle movements
  - **3 (Medium)**: Balanced, natural motion (default)
  - **4 (Dynamic)**: Fast, energetic movements
  - **5 (Extremely Dynamic)**: Very fast, high-energy actions
- **Default**: 3 (Medium)
- **Visual Feedback**:
  - Show icon or label indicating motion level
  - Display descriptive text: "Calm" / "Slow" / "Natural" / "Dynamic" / "Very Dynamic"

**API Verification Result**:
- ❌ **Not Directly Supported** by Qwen API (no motion_intensity parameter)
- **Workaround Required**: **Backend prompt enhancement**
  - Add intensity keywords to motion prompt based on slider value
  - Implementation in `services/video-qwen.js`
  - Example mapping:
    - Intensity 1 → append "very slowly, with subtle and minimal movement"
    - Intensity 2 → append "slowly and gently"
    - Intensity 3 → no modification (natural baseline)
    - Intensity 4 → append "quickly with dynamic motion"
    - Intensity 5 → append "very fast, with high energy and rapid movements"
- **Source**: `ai-output-resource/docs/v1.1-api-verification-report.md`

**Implementation Function**:
```javascript
function enhancePromptWithIntensity(prompt, intensity) {
  const keywords = {
    1: 'very slowly, with subtle and minimal movement',
    2: 'slowly and gently',
    3: '', // Natural baseline, no enhancement
    4: 'quickly with dynamic motion',
    5: 'very fast, with high energy and rapid movements'
  };

  if (intensity === 3 || !keywords[intensity]) {
    return prompt; // No modification for medium intensity
  }

  return `${prompt}, ${keywords[intensity]}`;
}
```

**Examples**:

| Intensity | Use Case | Example Scenario |
|-----------|----------|------------------|
| 1 (Extremely Calm) | Product shots, landscapes, meditation | "Person sitting peacefully, minimal head movement" |
| 3 (Medium) | Conversations, walking scenes, general content | "Person walking at normal pace, natural gestures" |
| 5 (Extremely Dynamic) | Sports, action sequences, energetic content | "Person running fast, jumping, dynamic movements" |

**User Value**:
- Consistent results matching user's energy expectations
- Reduce trial-and-error iterations
- Better creative control over pacing and mood

---

#### 1.4 Quality Preset Selection ⚠️ **HIGH PRIORITY**

**Current Issue**:
Users cannot choose between faster generation (lower quality) vs slower generation (higher quality). This affects:
- Wait times (frustrating for quick iterations)
- Output resolution and visual fidelity
- Cost efficiency (if API charges per quality tier)

**Why Necessary for Image-to-Video**:
- Generation speed/quality trade-off is independent of input image
- Users need fast previews during iteration

**Proposed Solution** (✅ **UPDATED after API verification**):
- **UI Component**: Dropdown or segmented control
- **Preset Options**:

| Preset | Resolution | API Parameter | Generation Speed | Use Case |
|--------|-----------|---------------|------------------|----------|
| **Draft** | 720p (1280×720) | `resolution: '720P'` | ~1-2 minutes | Quick previews, testing parameters |
| **Standard** | 1080p (1920×1080) | `resolution: '1080P'` | ~2-4 minutes | Most production work, social media (Recommended) |
| **High Quality** | 1080p (1920×1080) | `resolution: '1080P'` | ~2-4 minutes | Same as Standard (API limitation) |

- **Default**: Standard
- **Visual Indicator**: Show estimated generation time and resolution

**API Verification Result**:
- ✅ **Fully Supported** via `resolution` parameter
- **API Parameters**: `'720P'` or `'1080P'` only (wan2.6-i2v model)
- ⚠️ **Note**: No higher resolution than 1080P available
  - "High Quality" will use same 1080P as "Standard"
  - Consider simplifying to 2 options (Draft/Standard) in UI
- **Mapping**:
  ```javascript
  const qualityToResolution = {
    'draft': '720P',
    'standard': '1080P',
    'high': '1080P'  // Same as standard due to API limitation
  };
  ```
- **Source**: `ai-output-resource/docs/v1.1-api-verification-report.md`

**Display Format**:
```
Quality Preset: [Dropdown ▼]
├─ Draft (720p, ~1-2 min) - Fast preview
└─ Standard (1080p, ~2-4 min) - Recommended ✓

Note: High Quality option available in UI but uses same 1080P resolution
```

**User Value**:
- Fast iteration during creative exploration (Draft mode)
- Balance quality and speed for most work (Standard)
- Clear expectations on wait times and output resolution

---

## Phase 2 Features (Optional Enhancement Effects)

These are NOT core generation parameters, but **post-processing effects** that can enhance the video after generation.

### 2.1 Filter Effects (Stylization) ⚠️ **MEDIUM PRIORITY**

**Positioning**: This is NOT a "generation parameter" but a **post-processing filter** applied to the generated video.

**Why This is Different**:
- Input image already has its own color tone and style
- These filters modify the GENERATED video, not the generation process itself
- Similar to Instagram filters

**Proposed Solution**:
- **UI Component**: Optional dropdown (collapsed by default)
- **Options**:
  - **None** (no filter) - Default
  - **Film Grain** (胶片颗粒) - Add subtle grain for vintage feel
  - **Black & White** - Desaturate video
  - **Vintage** (复古色调) - Warm tones + faded colors
  - **High Contrast** - Boost contrast for dramatic effect

**Implementation**:
- Option A: Apply filter during video generation (pass to API if supported)
- Option B: Apply filter as post-processing step (frontend/backend)
- Option C: Use CSS filters for preview (simplest MVP approach)

**User Value**:
- Artistic stylization without re-generating
- Quick experimentation with different moods

---

### 2.2 Dynamic Lighting Effects ⚠️ **LOW PRIORITY**

**Positioning**: This adds **dynamic changes** to lighting during the video, NOT describing static lighting in the image.

**Why This is Different from v1.0 "Lighting" Field**:
- v1.0 "Lighting": Describes static light in image (natural/soft/hard) - mostly redundant for image-to-video
- v1.1 "Dynamic Lighting": Adds CHANGES over time (fade to dark, flicker, etc.)

**Proposed Solution**:
- **UI Component**: Optional dropdown (advanced settings)
- **Options**:
  - **None** - No lighting change (default)
  - **Fade to Dark** (渐暗) - Simulate sunset or entering shadow
  - **Fade to Bright** (渐亮) - Simulate sunrise or moving into light
  - **Flicker** (闪烁) - Lightning effect or neon lights

**API Integration**:
- Check if Qwen API supports dynamic lighting effects
- May require special parameters or post-processing

**User Value**:
- Add dramatic effect without changing image
- Simulate time passage (sunset/sunrise)

---

## Implementation Priority

### **Phase 1 (Must Have for v1.1)**:
1. ✅ **Video Duration Control** - Core requirement
2. ✅ **Aspect Ratio Selection** - Platform compatibility
3. ✅ **Motion Intensity Control** - Generation quality
4. ✅ **Quality Preset Selection** - User workflow efficiency

### **Phase 2 (Nice to Have)**:
5. ⚠️ **Filter Effects** - Post-processing enhancement (optional)
6. ⚠️ **Dynamic Lighting** - Advanced effect (optional)

### **Explicitly NOT Including (Redundant for Image-to-Video)**:
- ❌ Lens Focal Length - Image perspective is fixed
- ❌ Camera Angle - Image viewpoint is fixed
- ❌ Depth of Field - Image focus is fixed
- ❌ Composition - Image framing is fixed
- ❌ Static Scene/Props Description - Already visible in image

---

## Form UI Layout (Proposed)

```
┌─────────────────────────────────────────────┐
│  【Video Generation Form】                  │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ Basic Parameters:                   │   │
│  │                                     │   │
│  │ Duration:      [4s ▼]               │   │
│  │ Aspect Ratio:  ○ 16:9 ● 9:16 ○ 1:1 │   │
│  │ Quality:       [Standard ▼]         │   │
│  │                Est. ~2 min          │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ Camera & Scene (from v1.0):         │   │
│  │                                     │   │
│  │ Camera Movement: [Push In ▼]        │   │
│  │ Shot Type:       [Medium Shot ▼]    │   │
│  │ Lighting:        [Natural Light ▼]  │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ Motion Control:                     │   │
│  │                                     │   │
│  │ Motion Intensity:                   │   │
│  │ Calm [━━●━━━━] Dynamic              │   │
│  │       ↑ Medium                      │   │
│  │                                     │   │
│  │ Motion Prompt:                      │   │
│  │ ┌─────────────────────────────────┐ │   │
│  │ │ Person walking slowly, looking  │ │   │
│  │ │ around with curiosity...        │ │   │
│  │ └─────────────────────────────────┘ │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ ▼ Advanced Effects (Optional)       │   │  ← Collapsed by default
│  │                                     │   │
│  │ Filter:          [None ▼]           │   │
│  │ Lighting Effect: [None ▼]           │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  [Generate Video]                           │
│                                             │
└─────────────────────────────────────────────┘
```

---

## Technical Requirements

### Frontend Changes

**Update TypeScript Interfaces** (`types/workspace.ts`):
```typescript
interface VideoFormData {
  // Existing v1.0 fields
  camera_movement: string;
  shot_type: string;
  lighting: string;           // Keep for now (may deprecate later)
  motion_prompt: string;
  checkboxes: Record<string, boolean>;

  // New v1.1 core fields (✅ UPDATED after API verification)
  duration: 5 | 10 | 15;                                    // seconds (API: 5/10/15 only)
  aspect_ratio: '16:9' | '9:16' | '1:1' | '4:3';           // Requires frontend cropping
  motion_intensity: 1 | 2 | 3 | 4 | 5;                     // 1-5 scale (via prompt enhancement)
  quality_preset: 'draft' | 'standard' | 'high';           // Maps to 720P/1080P

  // Optional v1.1 effects (Phase 2)
  filter_effect?: 'none' | 'film_grain' | 'black_white' | 'vintage' | 'high_contrast';
  lighting_effect?: 'none' | 'fade_dark' | 'fade_bright' | 'flicker';
}
```

**Component Updates**:
- Update `VideoForm.tsx` with new form fields
- Add validation logic for new parameters
- Add UI components (slider for motion intensity, radio for aspect ratio)

### Backend Changes

**Database Schema** (`db/mongodb.js`):
```javascript
const WorkspaceSchema = new mongoose.Schema({
  // ... existing fields ...
  form_data: {
    // v1.0 fields
    camera_movement: String,
    shot_type: String,
    lighting: String,
    motion_prompt: String,
    checkboxes: Object,

    // v1.1 new fields (✅ UPDATED after API verification)
    // Default values ensure backward compatibility
    duration: {
      type: Number,
      default: 5,
      enum: [5, 10, 15]  // API only supports these values
    },
    aspect_ratio: {
      type: String,
      default: '16:9',
      enum: ['16:9', '9:16', '1:1', '4:3']
    },
    motion_intensity: {
      type: Number,
      default: 3,
      min: 1,
      max: 5
    },
    quality_preset: {
      type: String,
      default: 'standard',
      enum: ['draft', 'standard', 'high']
    },

    // Optional effects (Phase 2)
    filter_effect: { type: String, default: 'none' },
    lighting_effect: { type: String, default: 'none' }
  }
  // ... rest of schema ...
});
```

**API Updates** (`api/generate-video.js` and `services/video-qwen.js`):

1. **Parameter Mapping** - Map UI parameters to Qwen API:
   ```javascript
   // Quality preset → Resolution
   const qualityToResolution = {
     'draft': '720P',
     'standard': '1080P',
     'high': '1080P'  // Same as standard
   };
   ```

2. **Prompt Enhancement** - Apply motion intensity keywords:
   ```javascript
   function enhancePromptWithIntensity(prompt, intensity) {
     const keywords = {
       1: 'very slowly, with subtle and minimal movement',
       2: 'slowly and gently',
       3: '', // Natural, no enhancement
       4: 'quickly with dynamic motion',
       5: 'very fast, with high energy and rapid movements'
     };
     if (intensity === 3) return prompt;
     return `${prompt}, ${keywords[intensity]}`;
   }
   ```

3. **Image Preprocessing** (Frontend):
   - Crop/resize image according to aspect_ratio selection
   - Send cropped image to backend for video generation

4. **API Call Structure**:
   ```javascript
   const response = await axios.post(API_URL, {
     model: 'wan2.6-i2v',
     input: {
       prompt: enhancePromptWithIntensity(motion_prompt, motion_intensity),
       img_url: imageUrl  // Already cropped to aspect_ratio
     },
     parameters: {
       resolution: qualityToResolution[quality_preset],
       duration: duration,  // 5, 10, or 15
       prompt_extend: true
     }
   });
   ```

### API Integration Findings ✅ **COMPLETED**

**Research Date**: 2025-01-13
**API Documentation**: `context/third-part/qwen-pic-to-video-first-pic.txt`
**Model**: wan2.6-i2v (Image-to-Video)
**Full Report**: `ai-output-resource/docs/v1.1-api-verification-report.md`

**Parameter Support Summary**:

| UI Parameter | API Support | Implementation Strategy |
|-------------|-------------|------------------------|
| **Duration** | ✅ Fully supported | Direct API parameter: `parameters.duration` (5/10/15) |
| **Aspect Ratio** | ❌ Not supported | Frontend image cropping before upload |
| **Motion Intensity** | ❌ Not supported | Backend prompt enhancement with keywords |
| **Quality Preset** | ✅ Fully supported | Direct API parameter: `parameters.resolution` (720P/1080P) |

**Key Findings**:

1. **Duration Parameter** (`parameters.duration`):
   - API supports: 5, 10, 15 seconds
   - Default: 5 seconds
   - ⚠️ Does NOT support 2/4/6/8 seconds as originally planned

2. **Aspect Ratio** (NO API parameter):
   - Output video dimensions determined by input image
   - Workaround: Crop/resize image to target aspect ratio before sending to API
   - Recommended dimensions:
     - 16:9 → 1920×1080
     - 9:16 → 1080×1920
     - 1:1 → 1080×1080
     - 4:3 → 1440×1080

3. **Motion Intensity** (NO API parameter):
   - No native strength/intensity parameter
   - Workaround: Enhance `input.prompt` with motion keywords
   - Keywords map intensity (1-5) to descriptive phrases

4. **Quality/Resolution** (`parameters.resolution`):
   - API supports: '720P', '1080P'
   - Default: '1080P'
   - No higher resolution available (no 2K/4K)

---

## Backward Compatibility

**Critical Requirement**: v1.1 must NOT break existing v1.0 workspaces.

**Strategy**:
1. **Database Migration**: Add default values for new fields in MongoDB schema
2. **Frontend Handling**:
   - If workspace has no `duration` field, default to 5s (API minimum)
   - If workspace has no `motion_intensity`, default to 3 (medium)
   - If workspace has no `aspect_ratio`, default to '16:9'
   - If workspace has no `quality_preset`, default to 'standard'
3. **API Fallback**: If new parameters are missing, use API defaults

**Migration Script** (if needed):
```javascript
// backend/migrate-v1-1.js
db.workspaces.updateMany(
  { 'form_data.duration': { $exists: false } },
  {
    $set: {
      'form_data.duration': 5,           // API minimum (updated from 4)
      'form_data.aspect_ratio': '16:9',
      'form_data.motion_intensity': 3,
      'form_data.quality_preset': 'standard'
    }
  }
);
```

---

## Success Metrics

### User Experience Goals:
- ✅ Users can specify video duration (5s/10s/15s) on first try
- ✅ Users can generate videos in target aspect ratio (requires frontend crop tool)
- ✅ Users can control motion intensity with predictable results (via prompt enhancement)
- ✅ Users can use Draft mode for faster iteration (720P)

### Technical Goals:
- ✅ All parameters successfully mapped to Qwen API (with workarounds where needed)
- ✅ No breaking changes to existing v1.0 workspaces (backward compatible defaults)
- ✅ Form validation prevents invalid parameter combinations
- ✅ Backward compatible database schema

### Performance Goals:
- Draft mode (720P) generates videos in ~1-2 minutes
- Standard mode (1080P) generates in ~2-4 minutes
- No performance regression for v1.0 workspaces

---

## Reference: Why Text-to-Video Prompts Are Different

The `context/third-part/prompt-demo.txt` document contains extensive parameters for **text-to-video generation**, including:
- 设备与运镜 (Equipment & Camera Movement)
- 场景与美术置景 (Scene & Art Direction)
- 道具、服装造型 (Props, Costumes)
- 光线设计 (Lighting Design)
- 色彩体系 (Color System)
- 画面构成 (Composition: focal length, angle, depth of field)
- 声音体系 (Sound Design)

**Why we don't need most of these for Image-to-Video**:
- ✅ Image already contains: composition, angle, depth of field, lighting, colors, props, costumes
- ✅ We only need to control: HOW the image moves (duration, motion, intensity)
- ✅ Sound design is out of scope for MVP v1.1

---

## Next Steps

1. ✅ **API Verification** (Week 1) - **COMPLETED 2025-01-13**
   - ✅ Reviewed Qwen API documentation for parameter support
   - ✅ Created verification report with findings
   - ✅ Documented parameter mapping strategies
   - 📄 Report: `ai-output-resource/docs/v1.1-api-verification-report.md`
   - 🧪 Test Script: `ai-output-resource/test-scripts/v1.1/test-qwen-new-params.js`

2. **Update All Task Documents** (Week 1)
   - Update all 11 task documents in `context/tasks/v1.1/` directory
   - Change duration references from 2/4/6/8 to 5/10/15 seconds
   - Add API workaround notes for aspect_ratio and motion_intensity
   - Update code examples to reflect actual API parameters

3. **Create GitHub Issues** (Week 1-2)
   - Issue #1: Add Duration Control (5s/10s/15s)
   - Issue #2: Add Aspect Ratio Selection (with frontend image cropping)
   - Issue #3: Add Motion Intensity Slider (with backend prompt enhancement)
   - Issue #4: Add Quality Presets (720P/1080P mapping)

4. **Implementation** (Week 2-4)
   - Layer 2-3: Database schema + TypeScript types (parallel)
   - Layer 4: Frontend form components + image crop tool
   - Layer 5: Backend API updates + prompt enhancement
   - Layer 6: Integration testing + backward compatibility testing
   - Layer 7: Documentation + deployment

5. **User Testing** (Week 5)
   - Internal testing with new parameters
   - Collect feedback on parameter effectiveness
   - Verify image cropping works correctly
   - Test prompt enhancement quality
   - Iterate on UI/UX

---

## Document Metadata

- **Version**: v1.1-planning (API-verified)
- **Created**: 2025-01-13
- **Last Updated**: 2025-01-13 (API verification complete)
- **Status**: ✅ **Requirements Finalized - API Verified - Ready for Implementation**
- **Key Decisions**:
  - Duration options: 5/10/15 seconds (based on Qwen API capabilities)
  - Aspect ratio via frontend image cropping
  - Motion intensity via backend prompt enhancement
  - Quality presets map to 720P/1080P resolution
- **Next Step**: Update all task documents with API-verified parameters
