# Flipbook Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the weak flipbook shell with the licensed reference runtime’s book-stage interaction and make all three art styles selectable per photo through a validated production manifest.

**Architecture:** Use the licensed interaction and camera concepts from 3D Book 2 at reference commit `53a9df7`, with an independently implemented Three.js curved-page engine so the shareable artifact does not inherit the unresolved `three.modifiers` license gap. Add a small JSON manifest contract and validator; image generation remains agent-driven and blocked until every photo has a confirmed style.

**Tech Stack:** Node.js ESM, vanilla HTML/CSS/JavaScript, Three.js 0.185.1, esbuild, Playwright Core with local Google Chrome.

## Global Constraints

- 2D, 3D, and media may be used when their individual license or user ownership is verified; private originals never enter the shareable package.
- The generated prototype must be one self-contained HTML file that opens from `file://` with zero HTTP(S) requests.
- The three allowed styles are `impasto-miniature`, `isometric-healing-blocks`, and `papercraft-travel`.
- Every photo must have an explicit `style` and `style_confirmed: true` before batch generation.
- Do not generate real samples or batch images before user acceptance one.

---

### Task 1: Per-photo style manifest contract

**Files:**

- Create: `examples/mixed-style-manifest.json`
- Create: `scripts/validate-manifest.mjs`
- Create: `tests/manifest.test.mjs`
- Modify: `SKILL.md`
- Modify: `README.md`
- Modify: `package.json`

**Interfaces:**

- Consumes: JSON object `{ version, book, workflow, photos[] }`.
- Produces: `validateManifest(value): string[]`; empty array means batch-style gate is satisfied.

- [ ] **Step 1: Write failing tests** covering all three valid styles, mixed order, missing per-photo style, invalid style, and `style_confirmed: false`.
- [ ] **Step 2: Run `node --test tests/manifest.test.mjs`** and verify failure because `validateManifest` does not exist.
- [ ] **Step 3: Implement `validateManifest`** with exact allowed enum, unique natural-number order, required paths/fingerprint/version, and confirmed-style gate; CLI exits non-zero and prints each error.
- [ ] **Step 4: Update skill interaction** to ask “整册统一 or 逐张混排”; for mixed mode recommend then display every filename/style for confirmation; never infer confirmation from silence.
- [ ] **Step 5: Run `node --test tests/manifest.test.mjs` and `node scripts/validate-manifest.mjs examples/mixed-style-manifest.json`**, expecting both exit 0.
- [ ] **Step 6: Commit** with `feat: add per-photo style manifest gate`.

### Task 2: Licensed 3D interaction adaptation and offline prototype

**Files:**

- Create: `src/flipbook-3d/main.js`
- Create: `src/flipbook-3d/interaction.js`
- Create: `src/flipbook-3d/style.css`
- Modify: `scripts/build-prototype.mjs`
- Modify: `tests/prototype-smoke.mjs`
- Create: `tests/prototype-contract.test.mjs`
- Modify: `docs/source-license.md`
- Modify: `THIRD_PARTY_NOTICES.md`

**Interfaces:**

- Consumes: Three.js and eight in-code canvas placeholder page textures.
- Produces: `dist/prototype.html` with `window.albumPrototype = { ready, renderer, currentSheet, targetSheet, sheetCount, navigate }`.

- [ ] **Step 1: Write contract tests** for bundled Three.js, curved vertex deformation, front/back page textures, dynamic shadows, edge preview, mixed style identifiers, embedded licenses, and absence of external resource tags.
- [ ] **Step 2: Run `node --test tests/prototype-contract.test.mjs`** and verify it fails against the old shell.
- [ ] **Step 3: Build the 3D shell** with orthographic camera, white stage, bounded pixel ratio/subdivisions/shadows, front/back canvas textures, curved page deformation, edge hover, round controls, Home/End/Space, pointer drag/touch, reduced motion, and target-page queueing.
- [ ] **Step 4: Expand browser smoke** to verify file/offline, WebGL readiness, click, drag, touch pointer, buttons, queueing, Home/End, reverse navigation, bounds, and a parked render loop when settled.
- [ ] **Step 5: Run `npm test` and `npm run check`**, expecting all tests and repository checks to pass.
- [ ] **Step 6: Commit** with `feat: redesign offline flipbook interaction`.

### Task 3: Evidence and independent review

**Files:**

- Create: `docs/flipbook-redesign-report.md`
- Modify: `docs/stage-1-report.md`

**Interfaces:**

- Consumes: fresh test output, source commit/license inspection, and independent reviewer findings.
- Produces: a concise evidence report and an attachable `dist/prototype.html`.

- [ ] **Step 1: Run `npm test`, `npm run check`, `git diff --check`, and inspect the generated HTML for external URLs**, recording exact outputs and known limits.
- [ ] **Step 2: Ask an independent reviewer** to inspect license scope, manifest gate, interaction contract, offline behavior, and acceptance pause without changing files.
- [ ] **Step 3: Resolve all high/medium findings** and repeat the fresh verification commands.
- [ ] **Step 4: Update evidence docs** with the reference commit, reused/excluded areas, browser assertions, reviewer disposition, and unresolved Safari/real-photo limits.
- [ ] **Step 5: Commit** with `docs: record flipbook redesign evidence` and attach the generated HTML to the Multica issue reply.
