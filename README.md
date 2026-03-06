# 🧊 Hunyuan 3D Studio

A full-stack application for **Tencent's Hunyuan 3D API** — generate high-quality 3D models from images or text, apply custom textures, retopologize meshes, and run 3D post-processing tools.

Built with **Vue 3 + Vite** (frontend) and **Node.js + Express** (backend).

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18-green.svg)
![Vue](https://img.shields.io/badge/vue-3.x-brightgreen.svg)

---

## ✨ Features

### 🎯 3D Generation
- **Image to 3D** — Upload an image or paste a URL to generate a 3D model
- **Text to 3D** — Describe what you want in natural language
- **Sketch to 3D** — Convert line art/sketches into 3D (supports prompt + image together)
- **Multi-View Support** — Provide left, right, and back views for higher quality results
- **Pro & Rapid modes** — High quality (3 concurrent) or fast generation (1 concurrent)
- **Configurable face count** — 40K to 1.5M polygons
- **PBR materials** — Optional physically-based rendering textures
- **Low Poly mode** — Generate optimized low-poly models with triangle or quad faces
- **Geometry mode** — Generate untextured white models

### 🎨 Texture Editing
- Redraw textures on existing 3D models using a **reference image** or **text prompt**
- PBR texture generation support
- One-click send from any completed job to the texture editor

### 🔧 3D Tools
- **◇ Smart Retopology** — Clean up messy AI-generated meshes, reduce poly count, fix topology (powered by Polygen 1.5)
- **⟳ UV Unfold** — Generate proper UV maps for texturing
- **⇄ Format Convert** — Convert between GLB, FBX, OBJ, STL, USDZ, MP4, GIF
- **⊕ Part Split** — Automatically split a model into semantic components

### ⚡ Workflow
- **One-click pipeline** — Click ◇ ⟳ 🎨 buttons on completed jobs to send them directly to tools
- **Real-time job polling** — Auto-polls every 3 seconds with live status updates
- **Request tracing** — Full request/response logging for debugging
- **Flexible credentials** — Use `.env` for server-wide or per-request header auth

---

## 📁 Project Structure

```
hunyuan3d-app/
├── server/                    # Node.js / Express API server
│   ├── index.js               # Entry point, middleware, CORS
│   ├── tencent.js             # TC3-HMAC-SHA256 signing + API client
│   ├── routes/
│   │   └── api.js             # All REST endpoints
│   ├── .env.example           # Environment variable template
│   └── package.json
│
└── client/                    # Vue 3 + Vite frontend
    ├── src/
    │   ├── App.vue            # App shell, job management, polling
    │   ├── main.js
    │   ├── assets/main.css    # Global design tokens + styles
    │   ├── composables/
    │   │   └── useApi.js      # API calls, polling, file helpers
    │   └── components/
    │       ├── CredentialsBar.vue    # Credentials + server status
    │       ├── GeneratePanel.vue     # Image/text/sketch → 3D generation
    │       ├── TexturePanel.vue      # Texture editing for models
    │       ├── ToolsPanel.vue        # Retopo, UV, convert, part split
    │       ├── JobCard.vue           # Job status card with action buttons
    │       └── ImageDropzone.vue     # Drag & drop file upload
    ├── index.html
    ├── vite.config.js
    └── package.json
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** ≥ 18
- **Tencent Cloud account** with Hunyuan 3D service activated

### 1. Get Tencent Cloud Credentials

1. Register at [Tencent Cloud International Console](https://console.tencentcloud.com/)
2. Complete real-name authentication
3. Activate the **Hunyuan 3D** service at the [Hunyuan console](https://console.tencentcloud.com/hunyuan)
4. Create API keys (SecretId + SecretKey) at [CAM → API Keys](https://console.tencentcloud.com/cam/capi)
5. If using a **sub-account**, attach the **`QcloudAI3DFullAccess`** policy

### 2. Start the Server

```bash
cd server
npm install

# Set your credentials
cp .env.example .env
# Edit .env: fill in TENCENT_SECRET_ID and TENCENT_SECRET_KEY

npm start
# Server runs at http://localhost:3001
```

### 3. Start the Frontend

```bash
cd client
npm install
npm run dev
# Opens at http://localhost:5173
```

---

## 📖 How to Use

### Generating a 3D Model

1. Open `http://localhost:5173`
2. Enter your Tencent credentials in the top bar and click **PING** to verify
3. In the **Generate** panel:
   - Upload an image, paste a URL, or type a text prompt
   - Choose **Pro** (high quality) or **Rapid** (fast)
   - Adjust generation type, face count, PBR, polygon type
   - Optionally add multi-view images (left, right, back) for better quality
4. Click **GENERATE 3D MODEL**
5. Job appears in the feed with real-time status polling

### Post-Processing Pipeline

Once a model is generated, use the action buttons on the job card:

```
Generate → ◇ Retopo → ⟳ UV Unfold → 🎨 Texture Edit → ⇄ Convert
```

| Button | Action | What It Does |
|--------|--------|-------------|
| **◇** | Smart Retopology | Clean up mesh, reduce poly count |
| **⟳** | UV Unfold | Generate proper UV maps |
| **🎨** | Texture Edit | Redraw textures with image/prompt |
| **⎘** | Copy URL | Copy the result file URL |
| **↗** | Open | Open file in browser |

---

## 🔌 API Endpoints

All endpoints accept JSON. Credentials can be provided via:
- `.env` file (server-wide)
- `x-secret-id` / `x-secret-key` request headers (per-request)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/generate` | Submit image/prompt → 3D generation |
| `GET`  | `/api/job/:jobId` | Poll job status + get result files |
| `POST` | `/api/texture-edit` | Apply texture to existing 3D model |
| `POST` | `/api/smart-topology` | Retopologize / reduce poly count |
| `POST` | `/api/uv-unfold` | UV unwrap a model |
| `POST` | `/api/convert` | Convert 3D file format (sync) |
| `POST` | `/api/part-split` | Split model into components |
| `GET`  | `/api/health` | Server health check |

### Example: Generate from Image URL

```bash
curl -X POST http://localhost:3001/api/generate \
  -H "Content-Type: application/json" \
  -H "x-secret-id: YOUR_SECRET_ID" \
  -H "x-secret-key: YOUR_SECRET_KEY" \
  -d '{
    "imageUrl": "https://example.com/chair.jpg",
    "mode": "pro",
    "generateType": "Normal",
    "faceCount": 500000,
    "enablePBR": true
  }'
```

Response:
```json
{ "success": true, "jobId": "135723...", "requestId": "...", "mode": "pro" }
```

### Example: Poll Job Status

```bash
curl "http://localhost:3001/api/job/135723...?action=QueryHunyuanTo3DProJob" \
  -H "x-secret-id: YOUR_ID" \
  -H "x-secret-key: YOUR_KEY"
```

Response:
```json
{
  "success": true,
  "status": "DONE",
  "files": [
    { "Type": "GLB", "Url": "https://…/model.glb", "PreviewImageUrl": "https://…/preview.png" }
  ]
}
```

### Example: Smart Retopology

```bash
curl -X POST http://localhost:3001/api/smart-topology \
  -H "Content-Type: application/json" \
  -H "x-secret-id: YOUR_ID" \
  -H "x-secret-key: YOUR_KEY" \
  -d '{
    "modelUrl": "https://cos.ap-guangzhou.tencentcos.cn/model.glb",
    "modelType": "GLB",
    "polygonType": "triangle",
    "faceLevel": "medium"
  }'
```

---

## 🖼️ Image Tips (for best 3D results)

- ✅ Simple / solid-color background
- ✅ Single object in frame
- ✅ Object occupies > 50% of image
- ✅ Clean, unobstructed view
- ❌ Avoid text, complex scenes, or cluttered backgrounds
- ❌ Min 128px per side, max 5000px
- ❌ Max 8MB after base64 encoding (~6MB raw)

---

## ⚙️ Configuration

### Environment Variables (`server/.env`)

| Variable | Description |
|----------|-------------|
| `TENCENT_SECRET_ID` | Your Tencent Cloud SecretId |
| `TENCENT_SECRET_KEY` | Your Tencent Cloud SecretKey |
| `PORT` | Server port (default: `3001`) |

### Generation Parameters

| Parameter | Values | Default |
|-----------|--------|---------|
| `mode` | `pro`, `rapid` | `pro` |
| `generateType` | `Normal`, `LowPoly`, `Geometry`, `Sketch` | `Normal` |
| `faceCount` | `40000` – `1500000` | `500000` |
| `enablePBR` | `true`, `false` | `false` |
| `polygonType` | `triangle`, `quadrilateral` | `triangle` |

### Smart Retopology Parameters

| Parameter | Values | Default |
|-----------|--------|---------|
| `modelType` | `GLB`, `OBJ` | `GLB` |
| `polygonType` | `triangle`, `quadrilateral` | `triangle` |
| `faceLevel` | `low`, `medium`, `high` | `medium` |

---

## 🔀 Concurrent Task Limits

| API Mode | Max Concurrent |
|----------|---------------|
| Pro | 3 simultaneous jobs |
| Rapid | 1 simultaneous job |

Jobs exceeding the limit enter **WAIT** status until a slot opens.

---

## 🛡️ CAM Permissions

If using a **sub-account** (SecretId starting with `IKID`), the root account must attach:

> **Policy name: `QcloudAI3DFullAccess`**

Path: [CAM Console](https://console.tencentcloud.com/cam/overview) → Users → Authorize → search `QcloudAI3DFullAccess`

---

## 🧩 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vue 3, Vite, Axios |
| Backend | Node.js, Express |
| Auth | TC3-HMAC-SHA256 signing |
| API | Tencent Hunyuan 3D (Professional) |
| Region | `ap-singapore` |

---

## 📄 License

MIT
