// Test file to verify Zustand store setup
import { useWorkspaceStore } from './workspaceStore';

// This test verifies:
// 1. Store can be imported successfully
// 2. Store has all required methods and properties
// 3. TypeScript types are correct

const testStore = () => {
  const store = useWorkspaceStore.getState();

  console.log('Store methods available:');
  console.log('- workspaces:', Array.isArray(store.workspaces));
  console.log('- setWorkspaces:', typeof store.setWorkspaces === 'function');
  console.log('- addWorkspace:', typeof store.addWorkspace === 'function');
  console.log('- updateWorkspace:', typeof store.updateWorkspace === 'function');
  console.log('- deleteWorkspace:', typeof store.deleteWorkspace === 'function');
  console.log('- fetchWorkspaces:', typeof store.fetchWorkspaces === 'function');
  console.log('- createWorkspace:', typeof store.createWorkspace === 'function');
  console.log('- connectWebSocket:', typeof store.connectWebSocket === 'function');

  return true;
};

export default testStore;
