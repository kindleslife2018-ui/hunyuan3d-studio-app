<template>
  <div class="tools-panel">
    <div class="panel-title">
      <span>⚙</span>
      3D TOOLS
    </div>

    <!-- Tool selector -->
    <div class="tool-grid">
      <button
        v-for="t in tools"
        :key="t.key"
        class="tool-card"
        :class="{ active: activeTool === t.key }"
        @click="activeTool = t.key"
      >
        <span class="tool-icon">{{ t.icon }}</span>
        <span class="tool-name">{{ t.name }}</span>
        <span class="tool-desc">{{ t.desc }}</span>
      </button>
    </div>

    <!-- UV Unfold -->
    <div v-if="activeTool === 'uv'" class="tool-form">
      <div class="field-group">
        <label class="field-label">MODEL URL</label>
        <input
          v-model="uvUrl"
          class="field-input"
          placeholder="https://…/model.glb"
          type="url"
        />
      </div>
      <div class="field-group">
        <label class="field-label">FORMAT</label>
        <select v-model="uvType" class="field-input">
          <option value="GLB">GLB</option>
          <option value="FBX">FBX</option>
          <option value="OBJ">OBJ</option>
        </select>
      </div>
      <div class="field-hint">Max 30K faces</div>
      <button
        class="tool-submit-btn uv"
        :disabled="isLoading || !uvUrl"
        @click="submitUV"
      >
        <span v-if="isLoading" class="spin">◌</span>
        ⟳ UV UNFOLD
      </button>
    </div>

    <!-- Format Convert -->
    <div v-else-if="activeTool === 'convert'" class="tool-form">
      <div class="field-group">
        <label class="field-label">SOURCE FILE URL</label>
        <input
          v-model="convertUrl"
          class="field-input"
          placeholder="https://…/model.glb"
          type="url"
        />
        <div class="field-hint">Supports FBX, OBJ, GLB — max 60MB</div>
      </div>
      <div class="field-group">
        <label class="field-label">TARGET FORMAT</label>
        <div class="format-grid">
          <button
            v-for="f in convertFormats"
            :key="f"
            class="fmt-btn"
            :class="{ active: targetFormat === f }"
            @click="targetFormat = f"
          >
            {{ f }}
          </button>
        </div>
        <div
          class="field-hint"
          v-if="['USDZ', 'MP4', 'GIF'].includes(targetFormat)"
        >
          ⚠ Recommend &lt;500K faces — may timeout
        </div>
      </div>
      <button
        class="tool-submit-btn convert"
        :disabled="isLoading || !convertUrl || !targetFormat"
        @click="submitConvert"
      >
        <span v-if="isLoading" class="spin">◌</span>
        ⇄ CONVERT FORMAT
      </button>
    </div>

    <!-- Part Split -->
    <div v-else-if="activeTool === 'parts'" class="tool-form">
      <div class="field-group">
        <label class="field-label">FBX MODEL URL</label>
        <input
          v-model="partsUrl"
          class="field-input"
          placeholder="https://…/model.fbx"
          type="url"
        />
        <div class="field-hint">
          FBX only · max 100MB · max 30K faces · AIGC models recommended
        </div>
      </div>
      <button
        class="tool-submit-btn parts"
        :disabled="isLoading || !partsUrl"
        @click="submitParts"
      >
        <span v-if="isLoading" class="spin">◌</span>
        ⊕ SPLIT INTO PARTS
      </button>
    </div>

    <!-- Smart Topology -->
    <div v-else-if="activeTool === 'topology'" class="tool-form">
      <div class="field-group">
        <label class="field-label">3D MODEL URL</label>
        <input
          v-model="topoUrl"
          class="field-input"
          placeholder="https://…/model.glb"
          type="url"
        />
        <div class="field-hint">
          GLB or OBJ · max 200MB · best with high-poly AIGC models
        </div>
      </div>
      <div class="field-group">
        <label class="field-label">FORMAT</label>
        <select v-model="topoType" class="field-input">
          <option value="GLB">GLB</option>
          <option value="OBJ">OBJ</option>
        </select>
      </div>
      <div class="field-group">
        <label class="field-label">POLYGON TYPE</label>
        <div class="format-grid">
          <button
            class="fmt-btn"
            :class="{ active: topoPolyType === 'triangle' }"
            @click="topoPolyType = 'triangle'"
          >
            Triangle
          </button>
          <button
            class="fmt-btn"
            :class="{ active: topoPolyType === 'quadrilateral' }"
            @click="topoPolyType = 'quadrilateral'"
          >
            Quad Mix
          </button>
        </div>
      </div>
      <div class="field-group">
        <label class="field-label">REDUCTION LEVEL</label>
        <div class="format-grid">
          <button
            class="fmt-btn"
            :class="{ active: topoFaceLevel === 'low' }"
            @click="topoFaceLevel = 'low'"
          >
            Low
          </button>
          <button
            class="fmt-btn"
            :class="{ active: topoFaceLevel === 'medium' }"
            @click="topoFaceLevel = 'medium'"
          >
            Medium
          </button>
          <button
            class="fmt-btn"
            :class="{ active: topoFaceLevel === 'high' }"
            @click="topoFaceLevel = 'high'"
          >
            High
          </button>
        </div>
        <div class="field-hint">
          Low = fewest faces · High = most detail retained
        </div>
      </div>
      <button
        class="tool-submit-btn topology"
        :disabled="isLoading || !topoUrl"
        @click="submitTopology"
      >
        <span v-if="isLoading" class="spin">◌</span>
        ◇ SMART RETOPOLOGY
      </button>
    </div>

    <div v-if="toolError" class="tool-error">{{ toolError }}</div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import {
  submitUVUnfold,
  convertFormat,
  submitPartSplit,
  submitSmartTopology,
} from '../composables/useApi.js';

const emit = defineEmits(['job-submitted']);

const activeTool = ref('convert');
const isLoading = ref(false);
const toolError = ref('');

const uvUrl = ref('');
const uvType = ref('GLB');
const convertUrl = ref('');
const targetFormat = ref('STL');
const partsUrl = ref('');
const topoUrl = ref('');
const topoType = ref('GLB');
const topoPolyType = ref('triangle');
const topoFaceLevel = ref('medium');

const tools = [
  { key: 'convert', icon: '⇄', name: 'Convert', desc: 'Change file format' },
  { key: 'uv', icon: '⟳', name: 'UV Unfold', desc: 'Unwrap UV map' },
  { key: 'parts', icon: '⊕', name: 'Part Split', desc: 'Split components' },
  { key: 'topology', icon: '◇', name: 'Retopo', desc: 'Fix mesh topology' },
];
const convertFormats = ['STL', 'FBX', 'USDZ', 'MP4', 'GIF'];

// Allow parent to pre-fill a tool with a model URL
function prefillTool(tool, url, type) {
  activeTool.value = tool;
  if (tool === 'topology') {
    topoUrl.value = url;
    topoType.value = ['GLB', 'OBJ'].includes(type) ? type : 'GLB';
  } else if (tool === 'uv') {
    uvUrl.value = url;
    uvType.value = ['GLB', 'FBX', 'OBJ'].includes(type) ? type : 'GLB';
  } else if (tool === 'parts') {
    partsUrl.value = url;
  } else if (tool === 'convert') {
    convertUrl.value = url;
  }
}

defineExpose({ prefillTool });

async function submitUV() {
  toolError.value = '';
  isLoading.value = true;
  try {
    const { data, error } = await submitUVUnfold({
      modelUrl: uvUrl.value,
      modelType: uvType.value,
    });
    if (error) {
      toolError.value = error;
      return;
    }
    emit('job-submitted', {
      ...data,
      type: 'UV UNFOLD',
      queryAction: 'DescribeHunyuanTo3DUVJob',
      inputLabel: uvUrl.value.split('/').pop(),
      chips: [uvType.value, 'UV Unfold'],
    });
  } finally {
    isLoading.value = false;
  }
}

async function submitConvert() {
  toolError.value = '';
  isLoading.value = true;
  try {
    const { data, error } = await convertFormat({
      fileUrl: convertUrl.value,
      targetFormat: targetFormat.value,
    });
    if (error) {
      toolError.value = error;
      return;
    }
    emit('job-submitted', {
      type: 'FORMAT CONVERT',
      status: 'DONE',
      resultUrl: data.resultUrl,
      requestId: data.requestId,
      inputLabel: convertUrl.value.split('/').pop(),
      chips: [`→ ${targetFormat.value}`],
      jobId: data.requestId,
      id: Date.now(),
      createdAt: Date.now(),
    });
  } finally {
    isLoading.value = false;
  }
}

async function submitParts() {
  toolError.value = '';
  isLoading.value = true;
  try {
    const { data, error } = await submitPartSplit({ modelUrl: partsUrl.value });
    if (error) {
      toolError.value = error;
      return;
    }
    emit('job-submitted', {
      ...data,
      type: 'PART SPLIT',
      queryAction: 'QueryHunyuan3DPartJob',
      inputLabel: partsUrl.value.split('/').pop(),
      chips: ['FBX', 'Part Split'],
    });
  } finally {
    isLoading.value = false;
  }
}

async function submitTopology() {
  toolError.value = '';
  isLoading.value = true;
  try {
    const { data, error } = await submitSmartTopology({
      modelUrl: topoUrl.value,
      modelType: topoType.value,
      polygonType: topoPolyType.value,
      faceLevel: topoFaceLevel.value,
    });
    if (error) {
      toolError.value = error;
      return;
    }
    emit('job-submitted', {
      ...data,
      type: 'SMART TOPOLOGY',
      queryAction: 'Describe3DSmartTopologyJob',
      inputLabel: topoUrl.value.split('/').pop(),
      chips: [topoType.value, topoPolyType.value, topoFaceLevel.value],
    });
  } finally {
    isLoading.value = false;
  }
}
</script>

<style scoped>
.tools-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.panel-title {
  font-family: var(--font-display);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 2px;
  color: var(--c-yellow);
  display: flex;
  align-items: center;
  gap: 8px;
}
.tool-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
}
.tool-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 8px;
  border-radius: 10px;
  background: var(--bg3);
  border: 1px solid var(--border);
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
}
.tool-card:hover {
  border-color: var(--border2);
}
.tool-card.active {
  background: rgba(251, 191, 36, 0.06);
  border-color: rgba(251, 191, 36, 0.3);
}
.tool-icon {
  font-size: 20px;
}
.tool-name {
  font-family: var(--font-display);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 1px;
  color: var(--text);
}
.tool-desc {
  font-size: 9px;
  color: var(--text3);
}

.tool-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.field-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.field-label {
  font-family: var(--font-display);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 1.5px;
  color: var(--text2);
}
.field-input {
  padding: 9px 12px;
  width: 100%;
  background: var(--bg3);
  border: 1px solid var(--border2);
  color: var(--text);
  border-radius: 8px;
  font-family: var(--font-mono);
  font-size: 12px;
  outline: none;
  transition: border-color 0.2s;
}
.field-input:focus {
  border-color: var(--c-yellow);
}
.field-hint {
  font-size: 10px;
  color: var(--text3);
}

.format-grid {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
}
.fmt-btn {
  padding: 6px 14px;
  border-radius: 6px;
  background: var(--bg4);
  border: 1px solid var(--border);
  color: var(--text2);
  font-family: var(--font-mono);
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
}
.fmt-btn.active {
  background: rgba(251, 191, 36, 0.12);
  border-color: rgba(251, 191, 36, 0.4);
  color: var(--c-yellow);
}
.fmt-btn:hover:not(.active) {
  border-color: var(--border2);
  color: var(--text);
}

.tool-submit-btn {
  width: 100%;
  padding: 12px;
  border-radius: 10px;
  border: none;
  font-family: var(--font-display);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 2px;
  cursor: pointer;
  transition: all 0.25s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.tool-submit-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.tool-submit-btn.uv {
  background: rgba(77, 159, 255, 0.15);
  border: 1px solid rgba(77, 159, 255, 0.3);
  color: var(--c-blue);
}
.tool-submit-btn.uv:hover:not(:disabled) {
  box-shadow: 0 0 20px rgba(77, 159, 255, 0.2);
}
.tool-submit-btn.convert {
  background: rgba(251, 191, 36, 0.12);
  border: 1px solid rgba(251, 191, 36, 0.3);
  color: var(--c-yellow);
}
.tool-submit-btn.convert:hover:not(:disabled) {
  box-shadow: 0 0 20px rgba(251, 191, 36, 0.15);
}
.tool-submit-btn.parts {
  background: rgba(34, 211, 160, 0.1);
  border: 1px solid rgba(34, 211, 160, 0.3);
  color: var(--c-green);
}
.tool-submit-btn.parts:hover:not(:disabled) {
  box-shadow: 0 0 20px rgba(34, 211, 160, 0.15);
}
.tool-submit-btn.topology {
  background: rgba(168, 85, 247, 0.12);
  border: 1px solid rgba(168, 85, 247, 0.3);
  color: #a855f7;
}
.tool-submit-btn.topology:hover:not(:disabled) {
  box-shadow: 0 0 20px rgba(168, 85, 247, 0.2);
}

.tool-error {
  background: rgba(248, 113, 113, 0.08);
  border: 1px solid rgba(248, 113, 113, 0.2);
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 11px;
  color: var(--c-red);
}
</style>
