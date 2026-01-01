---
description: Complete a task by creating a -done.md report and cleaning up temporary test files
---

You are helping the user complete a development task. Follow these steps:

## Step 1: Identify the Task

- Check the recent conversation to identify which task was just completed
- If unclear, ask the user which task file this relates to (e.g., "layer3-video-service")
- Verify the task file exists in `context/tasks/backend/` or `context/tasks/frontend/`

## Step 2: Create Task Completion Report

Create a file named `<task-name>-done.md` in the same directory as the original task file.

**File structure:**
```markdown
# Task Completion Report: [Task Name]

**Task File**: [path to original task file]
**Completion Date**: [current date]
**Status**: ✅ Completed

## Summary
[Brief summary of what was accomplished]

## Implementation Details
[Key implementation points, referencing specific files and line numbers when relevant]

## Files Created/Modified
- [list all files that were created or significantly modified]

## Verification
[How the acceptance criteria were verified - tests run, manual testing, etc.]

## Notes
[Any important notes, gotchas, or future considerations]
```

## Step 3: Find Temporary Test Files

Search for temporary test files that should be cleaned up:

**Patterns to search for:**
- `test-*.js` in project root (NOT in `__tests__/` directories)
- `temp-*.js`, `tmp-*.js` in project root
- `debug-*.js` in project root
- Any other files the user created just for testing this task

**DO NOT delete:**
- Files in `backend/src/__tests__/` (permanent test files)
- Files like `frontend/src/components/*.test.tsx` (component tests)
- Files like `frontend/src/stores/*.test.ts` (store tests)
- Any files explicitly mentioned as permanent in the task requirements

## Step 4: Confirm and Clean

1. List all temporary files found
2. Ask user: "I found these temporary files: [list]. Should I delete them?"
3. After confirmation, delete the files
4. Report results

## Step 5: Summary

Provide a summary:
```
✅ Task completion documented in: [path to -done.md file]
🧹 Cleaned up [N] temporary file(s):
   - [file1]
   - [file2]
```

## Important Rules

- Always verify before deleting files
- If uncertain whether a file is temporary, ask the user
- Keep the -done.md file concise but informative
- Include file paths with line numbers when referencing code (e.g., `server.js:45`)
