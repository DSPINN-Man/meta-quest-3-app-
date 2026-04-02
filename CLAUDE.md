# CLAUDE.md — Panos VR Showcase

## Project Overview

We are building an **immersive VR experience** for the **Meta Quest 3** to showcase the **Panos** industrial control panel at the **All Energy** conference. The app runs in the Quest 3's browser via **WebXR** — no app install, no sideloading. Users put on the headset, open a URL, and they're in.

This replaces a failed V1 attempt that used a free "Model Viewer" app on Quest 3 with passthrough mode. V1 problems: glitchy movement with passthrough background, no door animations, static model only. Our V2 solves all of this.

## What is Panos?

A large industrial/electrical control panel — the kind installed on-site at energy facilities. Key characteristics:
- Multiple doors on the front and sides that open to reveal internal components
- Dense internal cabling, wiring, and control components visible when doors are open
- People at the conference want to "see inside" the panel — the internals are the selling point
- It's a physical product that would be too large/expensive to bring to a conference

## Tech Stack

| Tool | Role |
|------|------|
| **Babylon.js** | 3D engine + WebXR runtime (chosen over Three.js for superior VR support) |
| **TypeScript** | Language for the entire app |
| **Vite** | Dev server + build tool |
| **glTF/GLB** | 3D asset format (exported from Blender) |
| **WebXR API** | VR session management (immersive-vr mode = dark environment) |

### Why Babylon.js over Three.js
- First-class WebXR support via `WebXRExperienceHelper`
- Built-in teleportation, controller input, hand tracking
- Native glTF loader (heavily optimized)
- TypeScript-first (better autocomplete, fewer bugs)
- Built-in GUI system for 3D floating UI panels

### Why WebXR over Unity
- No app install — users open a URL in Quest 3 browser
- All code is TypeScript — Claude Code can write and debug everything
- Instant iteration (refresh browser, no build step)
- Zero sideloading or developer mode needed at the conference

## Source Files

Project name in files is "Indian Queens" (that's the site name — Panos is the panel product).

Files received:
- **`indian_queens_ga.obj`** (518 MB / 48 MB compressed) — source 3D geometry. MASSIVE.
- **`indian_queens_ga.mtl`** (2 KB) — materials. Tiny = simple solid colors, no heavy textures.
- **`indian_queens_ga_asm.stp`** (99 MB) — STEP CAD source (backup/reference)
- **`iq.glb`** (117 MB) — pre-converted GLB (someone already ran it through Blender)
- **`Untitled.glb`** (117 MB) — another GLB export (likely same model, different attempt)

### Critical: Model is too large
The 117 MB GLB will choke the Quest 3 browser. We need to optimize it down to **15-20 MB max** via Blender (decimate geometry, merge small parts, Draco compression). The 2 KB MTL confirms the file size is almost entirely geometry (not textures), so decimation will be very effective.

### Pipeline
1. Load `iq.glb` as-is for initial testing in desktop browser
2. Optimize in Blender via MCP → export as `panel_optimized.glb`
3. Swap optimized model into the app for VR testing

## Architecture

```
panos-vr/
├── public/
│   ├── models/
│   │   └── panel.glb          # The exported 3D model
│   └── textures/               # Any additional textures
├── src/
│   ├── main.ts                 # Entry point — init engine, scene, XR
│   ├── scene/
│   │   ├── environment.ts      # Dark environment, ground plane, lighting rig
│   │   ├── modelLoader.ts      # GLB loader with progress tracking
│   │   └── lighting.ts         # Dramatic spot/point lights
│   ├── interactions/
│   │   ├── xrSetup.ts          # WebXR session, controllers, teleportation
│   │   ├── doorAnimations.ts   # Open/close door system (per-mesh animations)
│   │   ├── explodedView.ts     # Exploded view — spread components outward
│   │   └── hotspots.ts         # Clickable info points on key components
│   ├── ui/
│   │   ├── floatingMenu.ts     # 3D floating UI — Open Doors / Explode / Reset
│   │   ├── infoPanel.ts        # Info popup when hotspot is tapped
│   │   ├── introScreen.ts      # Branded intro — logo, title, fade in
│   │   └── tutorial.ts         # Controller guide overlay
│   ├── flow/
│   │   ├── onboarding.ts       # Orchestrates: intro → tutorial → orbit → explore
│   │   └── kioskMode.ts        # Auto-reset after idle timeout
│   └── utils/
│       ├── config.ts           # Centralized config (colors, timing, model paths)
│       └── helpers.ts          # Shared utilities
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── CLAUDE.md                   # This file
```

## Feature Requirements

### 1. Environment (Dark Room)
- **NO passthrough / AR** — use `immersive-vr` WebXR session mode
- Pitch black or very dark blue/charcoal background
- Subtle ground plane (dark reflective surface or faint grid) for spatial grounding
- The model should feel like it's in a product photography studio

### 2. Lighting
- Dramatic, cinematic lighting — think Apple product reveal
- Key light (bright, slightly warm) from upper-front
- Fill lights (cool, subtle) from sides
- Rim/back light for edge definition
- Optional: subtle ambient light so it's not pitch black everywhere
- Spot light that follows or highlights the panel

### 3. Model Loading
- Initially load `iq.glb` from `/public/models/` for testing (117 MB — desktop only)
- After Blender optimization, switch to `panel_optimized.glb` (~15 MB target)
- Show loading progress indicator (critical — large file needs visible progress)
- Auto-center and auto-scale: compute bounding box, normalize so tallest dimension = ~2.5m
- Log on load: total meshes, mesh names, bounding box dims, vertex count (needed for optimization)

### 4. Door Animations
- Each door in the model is a separate named mesh (named during Blender prep)
- Naming convention: `door_front_1`, `door_front_2`, `door_side_left`, `door_rear`, etc.
- Animation: doors swing open (rotate on hinge axis) or slide/fade away
- "Open All Doors" — all doors animate open simultaneously
- "Close All Doors" — all doors animate closed
- Individual door toggle on tap/click is a nice-to-have
- Even if doors just disappear (opacity fade), that's acceptable per stakeholder feedback

### 5. Exploded View
- Smoothly animate all major components outward from center
- Each component group slides away along its local axis
- Should reveal the internal structure — cabling, wiring, controls
- Toggle: explode out / collapse back
- Easing: smooth ease-in-out animation (~1.5 seconds)

### 6. Hotspots
- Floating markers (glowing spheres or diamond shapes) positioned at key components
- Pulse/glow animation to attract attention
- On controller ray + trigger: show info panel
- Info panel: floating 3D GUI panel with title + description text
- Hotspot data should be configurable in `config.ts` — array of {position, title, description}
- Start with placeholder content — team will provide real specs later

### 7. Floating 3D Menu
- Babylon.js GUI3D — `HolographicButton` or custom panels
- Buttons: "Open Doors" | "Close Doors" | "Exploded View" | "Reset" | "Info Points"
- Menu follows the user or is anchored near the model
- Clean, minimal design — dark translucent panels with light text

### 8. Onboarding Flow (Self-Guided)
The experience must be usable by someone who has never worn a VR headset:
1. **Branded Intro** (0-3s): Company logo + "Panos Control Panel" title fade in on dark bg
2. **Controller Tutorial** (3-9s): Floating overlay showing controller diagram + basic instructions ("Left stick = move, Trigger = interact"). Dismisses on button press or after 6s.
3. **Cinematic Orbit** (9-20s): Camera auto-orbits the panel 360°. Skippable with any button.
4. **Free Explore** (20s+): User gets full control. Hotspots pulse. Menu is visible.
5. **Kiosk Reset** (30s idle): Fades back to intro. Ready for next visitor.

### 9. WebXR Setup
- Session mode: `immersive-vr` (NOT `immersive-ar` — we want dark environment)
- Controllers: Quest 3 Touch Plus controllers
- Left thumbstick: teleportation movement
- Right trigger: interact / select
- Teleportation with parabolic ray and ground marker
- Controller models loaded (show virtual controllers in VR)

### 10. Performance Targets
- 72fps minimum on Quest 3 (native refresh rate)
- Model should be under 20MB GLB ideally (optimize in Blender if larger)
- Texture compression: use KTX2/Basis if textures are large
- Draw calls: minimize — merge static meshes where possible

## Conference Deployment

### Local Hosting (No Internet Needed)
```bash
# Build the app
npm run build

# Serve from laptop
npx serve dist -l 8080

# Or Python
cd dist && python -m http.server 8080
```
- Laptop creates WiFi hotspot (or use portable router)
- Quest 3 connects to same network
- Open browser on Quest 3 → type `http://<laptop-ip>:8080`
- Bookmark it for quick access

### TV Mirroring
- Primary: USB-C to HDMI from Quest 3 to TV/monitor
- Backup: Quest casting to Meta app on laptop → HDMI to TV

### Kiosk Mode
- Quest 3 doesn't have true kiosk mode without MDM, but:
- Set browser to fullscreen
- Our app auto-resets on idle
- Guided boundary setup prevents users from wandering

## Branding
- Brand colors: TBD (will be provided — use placeholder dark theme for now)
- Logo: TBD (will be provided — use text placeholder "PANOS" for now)
- Use the intro screen as the branded moment

## Key Decisions & Context

1. **Nathan (team lead) tried SimLab VR Studio** on a 14-day trial but hadn't learned it yet. Our custom Babylon.js approach is more flexible and doesn't depend on proprietary software.
2. **The "Model Viewer" V1** worked but was glitchy — passthrough background + no animations. We're solving both.
3. **"Even if doors just disappear, that's fine"** — Nathan's words. Swing animation is ideal, but opacity fade is acceptable fallback.
4. **USB-C to HDMI for spectator TV** — confirmed approach from team meeting.
5. **Internal stress test planned** — Nathan will book a meeting room for people to try the headset before the conference.
6. **Pradeep** previously attempted Blender import but it didn't preserve interactivity — just static mesh. Our approach solves this by separating meshes and adding interactivity in code.

## Development Workflow

1. Start with a **placeholder model** (simple box with "doors" as separate meshes) to build all systems
2. Swap in the real `panel.glb` when ready
3. Test in desktop browser first (Babylon.js has mouse/keyboard fallback for non-VR)
4. Test on Quest 3 browser for VR-specific tuning
5. All interaction code should gracefully handle both VR and non-VR modes

## Commands

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Important Notes for Claude Code

- Use Babylon.js v7+ (latest stable)
- Import pattern: `import { Engine, Scene, ... } from "@babylonjs/core"`
- For GUI: `import { AdvancedDynamicTexture, ... } from "@babylonjs/gui"`
- For loaders: `import "@babylonjs/loaders/glTF"`
- WebXR helper: `scene.createDefaultXRExperienceAsync()`
- All config values (timing, colors, positions) should be in `src/utils/config.ts`
- Write clean, typed, modular TypeScript — each file has a single responsibility
- Comment key sections — this codebase may be maintained by people less technical than the builder