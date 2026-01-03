# TypeScript Migration Plan

Migrate MashAI from JavaScript to TypeScript in a phased, testable approach.

---

## Current Status

| Component | Type Checking | Runtime | Notes |
|-----------|---------------|---------|-------|
| React Frontend | ✅ Works | ✅ Works | Vite transpiles `.tsx` automatically |
| Electron Managers | ✅ Works | ✅ Works | Compiled from TypeScript |
| IPC Handlers | ✅ Works | ✅ Works | Compiled from TypeScript |

**Commands:**
- `npm run dev` - ✅ Works (TypeScript compiled to CommonJS)

---

## Phase 1: Infrastructure Setup ✅ COMPLETE

- [x] Add `typescript`, `@types/node` dependencies
- [x] Create `tsconfig.json` (strict mode enabled)
- [x] Create `tsconfig.electron.json`

---

## Phase 2: Shared Types & Constants ✅ COMPLETE

- [x] Create `electron/types/index.ts`
- [x] Create `electron/constants.ts`
- [x] Create `src/types/index.ts`
- [x] Create `src/constants/index.ts`

---

## Phase 3: Electron Managers ✅ TYPE-SAFE (not runtime)

TypeScript files created and type-check, but runtime still uses `.cjs`:

- [x] `SettingsManager.ts`
- [x] `ProfileManager.ts`
- [x] `TabManager.ts`
- [x] `SessionManager.ts`
- [x] `MenuBuilder.ts`
- [x] `TrayManager.ts`

---

## Phase 4: IPC Layer ⚠️ PARTIAL

- [x] TypeScript types defined
- [ ] `ipcHandlers.cjs` → `.ts` (not done)
- [ ] `PrivacyHandler.cjs` → `.ts` (not done)

---

## Phase 5: React Frontend ✅ COMPLETE

All 14 components migrated and working:

- [x] `main.tsx`, `App.tsx`, `SettingsApp.tsx`
- [x] `TitleBar.tsx`, `NewTabPopover.tsx`, `SettingsModal.tsx`, `Toast.tsx`
- [x] Settings tabs (7 files)
- [x] `vite-env.d.ts` (asset declarations)

---

## Phase 6: Final Cleanup ✅ PARTIAL

- [x] `strict: true` enabled in tsconfig
- [x] Fixed 20 strict mode errors
- [x] TypeScript compilation passes (`npx tsc --noEmit`)
- [ ] Electron main process not running TypeScript yet

---

## Phase 7: Electron Build Step (TODO)

To make `npm run dev` work with TypeScript, need one of:

**Option A: Pre-compile TypeScript (Recommended)**
```bash
# Compile electron/*.ts → dist/electron/*.js
# Run Electron from dist/
```

**Option B: Fix tsx/ESM compatibility**
- Requires custom ESM loader for Electron

---

## Files Safe to Delete

Once Phase 7 is complete and verified:

### React Frontend (SAFE TO DELETE NOW)
These have `.tsx` replacements and Vite handles them:
- [x] `src/main.jsx`
- [x] `src/App.jsx`
- [x] `src/SettingsApp.jsx`
- [x] `src/components/Toast.jsx`
- [x] `src/components/TitleBar.jsx`
- [x] `src/components/NewTabPopover.jsx`
- [x] `src/components/SettingsModal.jsx`
- [x] `src/components/settings/*.jsx` (all 7 files)
- [x] `src/constants/index.js`

### Electron Main Process (DO NOT DELETE YET)
Still required for runtime until Phase 7 complete:
- ❌ `electron/main.cjs` - Entry point
- ❌ `electron/ipcHandlers.cjs` - IPC handlers
- ❌ `electron/PrivacyHandler.cjs` - Privacy handlers
- ❌ `electron/SettingsManager.cjs`
- ❌ `electron/ProfileManager.cjs`
- ❌ `electron/TabManager.cjs`
- ❌ `electron/SessionManager.cjs`
- ❌ `electron/MenuBuilder.cjs`
- ❌ `electron/TrayManager.cjs`
- ❌ `electron/constants.cjs`

---

## Test Checkpoints

After each phase, verify:
- App launches with `npm run dev:js`
- Tabs work (create, switch, close, reorder)
- Profile switching works
- Settings save/load correctly
- Context menus work
- Window controls work

---
---

# Full TypeScript Migration Implementation Plan

> **Goal**: Complete the migration so all Electron code runs as compiled TypeScript, eliminating all `.cjs` files.

---

## Overview

| What Changes | What Stays The Same |
|--------------|---------------------|
| Source files become `.ts` | All app logic/behavior |
| Build step compiles to JS | User-facing features |
| `.cjs` files get deleted | React frontend (already done) |

---

## Phase 1: Build Pipeline Setup

**Objective**: Configure TypeScript compilation for Electron main process.

### 1.1 Update `tsconfig.electron.json`

Configure output directory and module settings:
- `outDir`: `"./dist/electron"`
- `module`: `"CommonJS"` 
- `target`: `"ES2022"`
- `rootDir`: `"./electron"`

### 1.2 Update `package.json`

Add/modify scripts:
```json
{
  "main": "dist/electron/main.js",
  "scripts": {
    "build:electron": "tsc -p tsconfig.electron.json",
    "dev": "npm run build:electron && concurrently \"npm run watch:electron\" \"vite\" \"wait-on tcp:5173 && electron .\"",
    "watch:electron": "tsc -p tsconfig.electron.json --watch"
  }
}
```

### 1.3 Update `.gitignore`

Add compiled output:
```
dist/electron/
```

### 1.4 Verification

- [ ] `npm run build:electron` compiles without errors
- [ ] `dist/electron/` folder is created with `.js` files

---

## Phase 2: Sync TypeScript Files with Current Runtime

**Objective**: Ensure `.ts` files have the same logic as current `.cjs` files.

### Files to Audit

| TypeScript File | Compare Against |
|-----------------|-----------------|
| `main.ts` | `main.cjs` |
| `SettingsManager.ts` | `SettingsManager.cjs` |
| `TabManager.ts` | `TabManager.cjs` |
| `SessionManager.ts` | `SessionManager.cjs` |
| `ProfileManager.ts` | `ProfileManager.cjs` |
| `MenuBuilder.ts` | `MenuBuilder.cjs` |
| `TrayManager.ts` | `TrayManager.cjs` |
| `constants.ts` | `constants.cjs` |

### Verification

- [ ] Each `.ts` file compiles without errors
- [ ] Logic in `.ts` matches `.cjs` (no missing functions/exports)

---

## Phase 3: Migrate IPC Handlers

**Objective**: Create TypeScript versions of all IPC handler files.

### Files to Create

| New File | From |
|----------|------|
| `ipc/NavigationHandlers.ts` | `ipc/NavigationHandlers.cjs` |
| `ipc/PrivacyHandlers.ts` | `ipc/PrivacyHandlers.cjs` |
| `ipc/ProfileHandlers.ts` | `ipc/ProfileHandlers.cjs` |
| `ipc/SettingsHandlers.ts` | `ipc/SettingsHandlers.cjs` |
| `ipc/TabHandlers.ts` | `ipc/TabHandlers.cjs` |
| `ipc/WindowHandlers.ts` | `ipc/WindowHandlers.cjs` |
| `preload.ts` | `preload.cjs` |

### Verification

- [ ] All new `.ts` files compile without errors
- [ ] IPC channels remain unchanged

---

## Phase 4: Update Imports & Module Resolution

**Objective**: Ensure all imports work correctly after compilation.

### Changes

1. Update all `require('./SomeManager.cjs')` to `require('./SomeManager')` or ES imports
2. Ensure `tsconfig.electron.json` has correct `moduleResolution`
3. Fix any path issues in compiled output

### Verification

- [ ] Build compiles with no import errors
- [ ] Runtime can resolve all modules

---

## Phase 5: Full Integration Test

**Objective**: Verify the entire app works with TypeScript build.

### Test Checklist

Run `npm run dev` (TypeScript build) and verify:

- [ ] App launches without errors
- [ ] All tabs work (create, switch, close, drag reorder)
- [ ] Profile switching works
- [ ] Settings save and load correctly
- [ ] Context menus work on tabs
- [ ] Tray icon and menu work
- [ ] Keyboard shortcuts work
- [ ] Window controls (minimize, maximize, close) work
- [ ] New tab dropdown shows AI providers

---

## Phase 6: Cleanup

**Objective**: Remove all deprecated JavaScript files.

### Files to Delete

**Electron `.cjs` files:**
- `electron/main.cjs`
- `electron/SettingsManager.cjs`
- `electron/TabManager.cjs`
- `electron/SessionManager.cjs`
- `electron/ProfileManager.cjs`
- `electron/MenuBuilder.cjs`
- `electron/TrayManager.cjs`
- `electron/constants.cjs`
- `electron/preload.cjs`
- `electron/ipc/*.cjs` (all 6 files)

**Deprecated React folder:**
- `_deprecated_jsx/` (entire folder)

**Old npm scripts:**
- Remove `dev:js` script from `package.json`

### Verification

- [ ] No `.cjs` files remain in `electron/`
- [ ] `_deprecated_jsx/` folder is deleted
- [ ] `npm run dev` works as the only dev command

---

## Summary

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Build Pipeline Setup | ✅ Complete |
| 2 | Sync TS with CJS | ✅ Complete |
| 3 | Migrate IPC Handlers | ✅ Complete |
| 4 | Update Imports | ✅ Complete |
| 5 | Integration Test | ⬜ Not Started |
| 6 | Cleanup | ⬜ Not Started |
