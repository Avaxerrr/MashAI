# TypeScript Migration Plan

Migrate MashAI from JavaScript to TypeScript in a phased, testable approach.

---

## Current Status

| Component | Type Checking | Runtime | Notes |
|-----------|---------------|---------|-------|
| React Frontend | ✅ Works | ✅ Works | Vite transpiles `.tsx` automatically |
| Electron Managers | ✅ Works | ❌ Uses .cjs | TypeScript files exist but not executed |
| IPC Handlers | ❌ Not done | ❌ Uses .cjs | Still JavaScript |

**Commands:**
- `npm run dev:js` - Works (uses JavaScript/CommonJS)
- `npm run dev` - ❌ Fails (tsx ESM issues with Electron)

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
