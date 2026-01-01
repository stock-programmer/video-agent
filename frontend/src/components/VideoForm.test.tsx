import { VideoForm } from './VideoForm';

// Basic import test
const testFormData = {
  camera_movement: 'push forward',
  shot_type: 'close-up',
  lighting: 'natural',
  motion_prompt: 'Test motion'
};

// This test just verifies the component can be imported and props are correctly typed
export const videoFormTest = () => {
  return <VideoForm workspaceId="test-id" formData={testFormData} />;
};
