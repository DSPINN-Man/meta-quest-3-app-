# Panos VR Showcase

Immersive Meta Quest 3 experience for showcasing the Panos control panel at the All Energy conference. Built with Babylon.js + WebXR.

## Quick Setup

### Prerequisites
- Node.js 18+ (`node --version`)
- npm 9+ (`npm --version`)
- Git

### 1. Create the repo and scaffold

```bash
# Create and enter project directory
mkdir panos-vr && cd panos-vr
git init

# Initialize project
npm init -y
npm install @babylonjs/core @babylonjs/gui @babylonjs/loaders
npm install -D typescript vite

# Create directory structure
mkdir -p src/{scene,interactions,ui,flow,utils} public/models public/textures
```

### 2. Copy files from this download

Copy these files into the repo root:
- `CLAUDE.md` → repo root (Claude Code reads this automatically)
- This `README.md` → repo root

### 3. Start building with Claude Code

```bash
# Open Claude Code in the project
cd panos-vr
claude

# Then say:
# "Read CLAUDE.md and scaffold the project — create all config files 
#  (tsconfig, vite config, index.html) and build a working starter 
#  scene with a placeholder model, dark environment, dramatic lighting, 
#  and WebXR support. Make it viewable in desktop browser first."
```

### 4. Blender MCP Setup (for model prep later)

```bash
# Install Blender (free) from https://www.blender.org/download/

# In Claude Code, add the Blender MCP server:
claude mcp add-json "blender" '{"command":"uvx","args":["blender-mcp"]}'

# OR for Claude Desktop, add to claude_desktop_config.json:
# {
#   "mcpServers": {
#     "blender": {
#       "command": "uvx",
#       "args": ["blender-mcp"]
#     }
#   }
# }

# In Blender:
# 1. Edit → Preferences → Add-ons → Install
# 2. Select the addon.py from the blender-mcp repo
# 3. Enable "MCP Blender Bridge"
# 4. Start the MCP server in Blender's sidebar

# Then in Claude Code/Desktop, say:
# "Import panel.obj, separate all door meshes into individual objects, 
#  optimize the geometry, verify materials, and export as panel.glb"
```

### 5. Test on Quest 3

```bash
# Build
npm run build

# Serve locally
npx serve dist -l 8080

# On Quest 3:
# 1. Connect to same WiFi as your laptop
# 2. Open Quest browser
# 3. Navigate to http://<your-laptop-ip>:8080
```

## Project Context

See `CLAUDE.md` for full project context, architecture, requirements, and technical decisions. Claude Code reads this file automatically when working in the repo.

## Team

- **Nathan** — Project lead, provided CAD files, handling conference logistics
- **Pradeep** — Previously attempted Blender conversion  
- **You** — SWE building the VR experience with Claude Code