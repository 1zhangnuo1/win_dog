# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Desktop 3D dog robot (桌面3D小狗机器人) — an Electron app with a procedural Three.js dog that chats via Zhipu AI GLM-4 API. The dog has a mood system, supports file drag-drop analysis, image recognition, and document generation.

## Commands

- `npm start` — launch the Electron app
- `npm run build` — build Windows distributable (electron-builder)
- No test framework or linter is configured

## Architecture

**Two-process Electron app** with strict IPC boundary:
- `main.js` — Electron main process: window management, file I/O, all Zhipu API calls (axios streaming), tray icon, right-click context menu
- `preload.js` — `contextBridge` exposes `window.electronAPI` with IPC channels for chat, file ops, drag, mouse-through control
- `src/js/app.js` — renderer entry point: wires together 3D scene, UI, state, and event handlers

**Renderer modules** (ES modules, no bundler):

```
src/js/
├── core/
│   ├── state.js        # Singleton StateManager — pub/sub with get/set/on, dot-path keys
│   ├── mood-system.js   # MoodSystem — evaluates mood from (happiness, energy, curiosity) into named states
│   └── chat-engine.js   # ChatEngine — builds prompts, orchestrates streaming API calls via IPC
├── renderer/
│   ├── scene.js         # Three.js scene/camera/renderer init
│   ├── lighting.js      # Scene lighting setup
│   └── dog.js           # Procedural dog model + DogAnimator (mood animations, tricks, eye tracking)
├── ui/
│   ├── input-bubble.js  # Chat input overlay
│   ├── response-bubble.js # AI response overlay with streaming append
│   └── mood-indicator.js  # Current mood emoji display
└── utils/
    └── drag.js          # Window drag via IPC
```

## Key Patterns

**State management**: `state.js` is a singleton with `get('mood.happiness')` dot-path access and `on('moodState', cb)` subscriptions. All shared state flows through it.

**Mood system**: Three numeric dimensions (happiness/energy/curiosity, 0–100) map to named states (happy/excited/sad/curious/sleepy/neutral). Events (chat, click, praise, idle) adjust dimensions; `evaluate()` recomputes the named state. The named state drives animation, system prompts, and UI indicators. An idle timer decays mood every 5 minutes.

**Chat flow**: `ChatEngine` builds a system prompt that includes the current mood description, appends chat history (capped at 40 messages), and calls `window.electronAPI.chatStream()`. The main process proxies to Zhipu API with SSE streaming, sending chunks back via IPC events (`chat:stream:chunk` / `chat:stream:done`).

**Mouse-through**: The window is transparent and frameless. `setIgnoreMouseEvents` toggles based on whether the cursor is over the dog's elliptical hit area or a UI element — allowing clicks to pass through to the desktop.

**3D interaction**: Right-drag orbits the camera (spherical coords), scroll zooms, left-click on the dog toggles the chat input.

## Environment

Requires a `.env` file with `ZHIPU_API_KEY=<key>`. API models used: `glm-4-flash` (fast chat), `glm-4` (non-streaming fallback), `glm-4v-flash` (image analysis).

## Language

UI text, comments, and AI prompts are in Chinese (中文). Code identifiers are in English.
