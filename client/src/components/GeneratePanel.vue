<template>
  <div class="generate-panel">
    <div class="panel-title">
      <span class="panel-icon">◈</span>
      IMAGE → 3D GENERATION
    </div>

    <!-- Input mode tabs -->
    <div class="mode-tabs">
      <button
        v-for="m in modes"
        :key="m.key"
        class="mode-tab"
        :class="{ active: inputMode === m.key }"
        @click="inputMode = m.key"
      >
        {{ m.label }}
      </button>
    </div>

    <!-- Image upload -->
    <div v-if="inputMode === 'image'" class="field-group">
      <ImageDropzone
        v-model="imageFile"
        title="Drop source image"
        subtitle="single object, solid background"
        icon="◉"
      />
    </div>

    <!-- Image URL -->
    <div v-else-if="inputMode === 'url'" class="field-group">
      <label class="field-label">IMAGE URL</label>
      <input
        v-model="imageUrl"
        class="field-input"
        placeholder="https://example.com/image.jpg"
        type="url"
      />
      <div class="field-hint">
        Supports JPG, PNG, WEBP — max 8MB, min 128px per side
      </div>
    </div>

    <!-- Text prompt -->
    <div v-else class="field-group">
      <label class="field-label">TEXT PROMPT</label>
      <textarea
        v-model="prompt"
        class="field-textarea"
        placeholder="A red ceramic coffee mug with a handle..."
        rows="3"
      ></textarea>
      <div class="field-hint">Max 1024 UTF-8 characters · Text-to-3D mode</div>
    </div>

    <!-- Sketch mode: optional prompt alongside image -->
    <div
      v-if="
        config.mode === 'pro' &&
        config.generateType === 'Sketch' &&
        inputMode !== 'text'
      "
      class="field-group"
    >
      <label class="field-label"
        >SKETCH PROMPT <span class="optional-badge">OPTIONAL</span></label
      >
      <textarea
        v-model="sketchPrompt"
        class="field-textarea"
        placeholder="Describe what the sketch represents... (e.g., a cartoon cat sitting)"
        rows="2"
      ></textarea>
      <div class="field-hint">
        Sketch mode allows combining an image + prompt for better results
      </div>
    </div>

    <!-- Multi-view images (Pro mode quality boost) -->
    <div
      v-if="
        config.mode === 'pro' &&
        inputMode !== 'text' &&
        config.generateType !== 'Sketch'
      "
      class="multiview-section"
    >
      <div class="section-header" @click="showMultiView = !showMultiView">
        <span class="field-label" style="cursor: pointer"
          >◈ MULTI-VIEW IMAGES
          <span class="optional-badge">OPTIONAL</span></span
        >
        <span class="expand-icon">{{ showMultiView ? '▾' : '▸' }}</span>
      </div>
      <div class="field-hint">
        Provide additional views for higher quality mesh generation
      </div>

      <div v-if="showMultiView" class="multiview-grid">
        <div v-for="view in multiViews" :key="view.type" class="multiview-item">
          <ImageDropzone
            v-model="view.file"
            :title="`${view.label} view`"
            :subtitle="`${view.label} angle of object`"
            :icon="view.icon"
            :formats="'JPG · PNG · WEBP'"
          />
        </div>
      </div>
    </div>

    <!-- Settings -->
    <div class="settings-grid">
      <div class="field-group">
        <label class="field-label">API MODE</label>
        <select v-model="config.mode" class="field-input">
          <option value="pro">Pro — High quality (3 concurrent)</option>
          <option value="rapid">Rapid — Fast generation (1 concurrent)</option>
        </select>
      </div>

      <div class="field-group" v-if="config.mode === 'pro'">
        <label class="field-label">GENERATE TYPE</label>
        <select v-model="config.generateType" class="field-input">
          <option value="Normal">Normal — Textured model</option>
          <option value="LowPoly">LowPoly — Smart polygon reduction</option>
          <option value="Geometry">Geometry — White model (no texture)</option>
          <option value="Sketch">Sketch — From sketch/line art</option>
        </select>
      </div>

      <div class="field-group" v-if="config.mode === 'pro'">
        <label class="field-label">FACE COUNT</label>
        <input
          v-model.number="config.faceCount"
          class="field-input"
          type="number"
          min="40000"
          max="1500000"
          step="10000"
        />
        <div class="field-hint">Range: 40K – 1.5M faces</div>
      </div>

      <div
        class="field-group"
        v-if="config.mode === 'pro' && config.generateType === 'LowPoly'"
      >
        <label class="field-label">POLYGON TYPE</label>
        <select v-model="config.polygonType" class="field-input">
          <option value="triangle">Triangle — Standard tris</option>
          <option value="quadrilateral">
            Quadrilateral — Quads + tris mix
          </option>
        </select>
        <div class="field-hint">
          Quad mesh is better for subdivision & editing
        </div>
      </div>

      <div class="field-group" v-if="config.mode === 'rapid'">
        <label class="field-label">OUTPUT FORMAT</label>
        <select v-model="config.resultFormat" class="field-input">
          <option v-for="f in rapidFormats" :key="f" :value="f">{{ f }}</option>
        </select>
      </div>
    </div>

    <!-- Toggles -->
    <div class="toggles-row">
      <div
        class="toggle-item"
        v-if="inputMode === 'image' || inputMode === 'url'"
      >
        <span class="toggle-label">Auto Remove Background</span>
        <button
          class="toggle-btn"
          :class="{ on: config.autoRemoveBackground }"
          @click="config.autoRemoveBackground = !config.autoRemoveBackground"
        >
          <span class="toggle-knob"></span>
        </button>
      </div>
      <div
        class="toggle-item"
        v-if="!(config.mode === 'pro' && config.generateType === 'Geometry')"
      >
        <span class="toggle-label">PBR Materials</span>
        <button
          class="toggle-btn"
          :class="{ on: config.enablePBR }"
          @click="config.enablePBR = !config.enablePBR"
        >
          <span class="toggle-knob"></span>
        </button>
      </div>
      <div class="toggle-item" v-if="config.mode === 'rapid'">
        <span class="toggle-label">Geometry only</span>
        <button
          class="toggle-btn"
          :class="{ on: config.enableGeometry }"
          @click="config.enableGeometry = !config.enableGeometry"
        >
          <span class="toggle-knob"></span>
        </button>
      </div>
    </div>

    <!-- Submit -->
    <button
      class="submit-btn"
      :class="{ loading: isLoading }"
      :disabled="isLoading || !canSubmit"
      @click="submit"
    >
      <span v-if="isLoading" class="spin">◌</span>
      <span v-else>◈</span>
      {{ isLoading ? 'SUBMITTING...' : 'GENERATE 3D MODEL' }}
    </button>

    <div v-if="submitError" class="submit-error">{{ submitError }}</div>
  </div>
</template>

<script setup>
import { ref, computed, reactive } from 'vue';
import ImageDropzone from './ImageDropzone.vue';
import { submitGenerate, fileToBase64 } from '../composables/useApi.js';
import { removeBackground } from '@imgly/background-removal';

const emit = defineEmits(['job-submitted']);

const inputMode = ref('image');
const imageFile = ref(null);
const imageUrl = ref('');
const prompt = ref('');
const sketchPrompt = ref('');
const isLoading = ref(false);
const submitError = ref('');
const showMultiView = ref(false);

const modes = [
  { key: 'image', label: '📷 Image Upload' },
  { key: 'url', label: '🔗 Image URL' },
  { key: 'text', label: '✏️ Text Prompt' },
];

const rapidFormats = ['GLB', 'OBJ', 'STL', 'USDZ', 'FBX', 'MP4', 'GIF'];

const multiViews = reactive([
  { type: 'left', label: 'Left', icon: '⬅', file: null },
  { type: 'right', label: 'Right', icon: '➡', file: null },
  { type: 'back', label: 'Back', icon: '⬆', file: null },
]);

const config = reactive({
  mode: 'pro',
  generateType: 'Normal',
  faceCount: 500000,
  resultFormat: 'GLB',
  enablePBR: false,
  enableGeometry: false,
  polygonType: 'triangle',
  autoRemoveBackground: true,
});

const canSubmit = computed(() => {
  if (inputMode.value === 'image') return !!imageFile.value;
  if (inputMode.value === 'url')
    return imageUrl.value.trim().startsWith('http');
  return prompt.value.trim().length > 0;
});

async function submit() {
  submitError.value = '';
  isLoading.value = true;

  try {
    const payload = {
      mode: config.mode,
      generateType: config.generateType,
      faceCount: config.faceCount,
      resultFormat: config.resultFormat,
      enablePBR: config.enablePBR,
      enableGeometry: config.enableGeometry,
    };

    // PolygonType for LowPoly mode
    if (config.mode === 'pro' && config.generateType === 'LowPoly') {
      payload.polygonType = config.polygonType;
    }

    let inputPreview = null;
    let inputLabel = '';

    let finalImageFile = imageFile.value;
    let finalImageUrl = imageUrl.value.trim();

    // Auto Remove Background processing
    if (config.autoRemoveBackground && (inputMode.value === 'image' || inputMode.value === 'url')) {
      isLoading.value = true;
      submitError.value = '';
      try {
        let imageSource = null;
        if (inputMode.value === 'image' && finalImageFile) {
          imageSource = finalImageFile;
        } else if (inputMode.value === 'url' && finalImageUrl) {
          imageSource = finalImageUrl;
        }

        if (imageSource) {
           // We need a way to let the user know what's happening
           // It's a bit of a hack since we don't have a dedicated status text
           // but we can at least log it or update a loading string if we had one.
           // For now, it will just show "SUBMITTING..." longer.
           const blob = await removeBackground(imageSource);
           // Convert blob back to File object to reuse existing logic
           finalImageFile = new File([blob], "removed-bg.png", { type: "image/png" });
           // If it was URL, we switch logic to use base64 of the new file instead
           if (inputMode.value === 'url') {
              finalImageUrl = ''; // clear url so it uses base64 logic
           }
        }
      } catch (err) {
        console.error("Background removal failed:", err);
        submitError.value = "Background removal failed: " + err.message;
        isLoading.value = false;
        return;
      }
    }

    if ((inputMode.value === 'image' || (inputMode.value === 'url' && config.autoRemoveBackground)) && finalImageFile) {
      payload.imageBase64 = await fileToBase64(finalImageFile);
      inputPreview = URL.createObjectURL(finalImageFile);
      inputLabel = finalImageFile.name || "removed-bg.png";
    } else if (inputMode.value === 'url' && finalImageUrl) {
      payload.imageUrl = finalImageUrl;
      inputLabel = payload.imageUrl;
    } else {
      payload.prompt = prompt.value.trim();
      inputLabel = payload.prompt;
    }

    // Sketch mode: include prompt alongside image
    if (
      config.mode === 'pro' &&
      config.generateType === 'Sketch' &&
      sketchPrompt.value.trim()
    ) {
      payload.prompt = sketchPrompt.value.trim();
    }

    // Multi-view images for Pro mode (higher quality)
    if (
      config.mode === 'pro' &&
      inputMode.value !== 'text' &&
      config.generateType !== 'Sketch'
    ) {
      const mvImages = [];
      for (const view of multiViews) {
        if (view.file) {
          const b64 = await fileToBase64(view.file);
          mvImages.push({ viewType: view.type, imageBase64: b64 });
        }
      }
      if (mvImages.length > 0) {
        payload.multiViewImages = mvImages;
      }
    }

    const { data, error } = await submitGenerate(payload);
    if (error) {
      submitError.value = error;
      return;
    }

    const chips = [config.mode.toUpperCase()];
    if (config.mode === 'pro') {
      chips.push(
        config.generateType,
        `${(config.faceCount / 1000).toFixed(0)}K faces`,
      );
      if (config.generateType === 'LowPoly') chips.push(config.polygonType);
    } else chips.push(config.resultFormat);
    if (config.enablePBR) chips.push('PBR');
    if (payload.multiViewImages?.length)
      chips.push(`+${payload.multiViewImages.length} views`);

    emit('job-submitted', {
      ...data,
      type: config.mode === 'pro' ? 'PRO GEN' : 'RAPID GEN',
      queryAction:
        config.mode === 'pro'
          ? 'QueryHunyuanTo3DProJob'
          : 'QueryHunyuanTo3DRapidJob',
      inputPreview,
      inputLabel,
      chips,
    });
  } finally {
    isLoading.value = false;
  }
}
</script>

<style scoped>
.generate-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.panel-title {
  font-family: var(--font-display);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 2px;
  color: var(--c-cyan);
  display: flex;
  align-items: center;
  gap: 8px;
}
.panel-icon {
  font-size: 16px;
}

.mode-tabs {
  display: flex;
  gap: 4px;
}
.mode-tab {
  flex: 1;
  padding: 8px 4px;
  background: var(--bg3);
  border: 1px solid var(--border);
  color: var(--text2);
  border-radius: 8px;
  font-family: var(--font-mono);
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
}
.mode-tab.active {
  background: rgba(0, 255, 224, 0.08);
  border-color: rgba(0, 255, 224, 0.3);
  color: var(--c-cyan);
}
.mode-tab:hover:not(.active) {
  border-color: var(--border2);
  color: var(--text);
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
  width: 100%;
  padding: 9px 12px;
  background: var(--bg3);
  border: 1px solid var(--border2);
  color: var(--text);
  border-radius: 8px;
  font-family: var(--font-mono);
  font-size: 12px;
  outline: none;
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
  appearance: none;
}
.field-input:focus {
  border-color: var(--c-cyan);
  box-shadow: 0 0 0 3px rgba(0, 255, 224, 0.07);
}
select.field-input {
  cursor: pointer;
}
.field-textarea {
  width: 100%;
  padding: 10px 12px;
  resize: vertical;
  background: var(--bg3);
  border: 1px solid var(--border2);
  color: var(--text);
  border-radius: 8px;
  font-family: var(--font-mono);
  font-size: 12px;
  outline: none;
  transition: border-color 0.2s;
  min-height: 80px;
}
.field-textarea:focus {
  border-color: var(--c-cyan);
}
.field-hint {
  font-size: 10px;
  color: var(--text3);
}

.settings-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.toggles-row {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}
.toggle-item {
  display: flex;
  align-items: center;
  gap: 8px;
}
.toggle-label {
  font-size: 11px;
  color: var(--text2);
}
.toggle-btn {
  width: 38px;
  height: 21px;
  border-radius: 11px;
  background: var(--bg4);
  border: 1px solid var(--border2);
  cursor: pointer;
  position: relative;
  transition:
    background 0.25s,
    border-color 0.25s;
  padding: 0;
}
.toggle-btn.on {
  background: rgba(0, 255, 224, 0.2);
  border-color: rgba(0, 255, 224, 0.4);
}
.toggle-knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 15px;
  height: 15px;
  border-radius: 50%;
  background: var(--text3);
  transition:
    transform 0.25s,
    background 0.25s;
}
.toggle-btn.on .toggle-knob {
  transform: translateX(17px);
  background: var(--c-cyan);
}

.submit-btn {
  width: 100%;
  padding: 14px 20px;
  background: linear-gradient(
    135deg,
    rgba(0, 255, 224, 0.15),
    rgba(168, 85, 247, 0.15)
  );
  border: 1px solid rgba(0, 255, 224, 0.3);
  color: var(--c-cyan);
  border-radius: 10px;
  font-family: var(--font-display);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 2px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  transition: all 0.25s;
}
.submit-btn:hover:not(:disabled) {
  background: linear-gradient(
    135deg,
    rgba(0, 255, 224, 0.25),
    rgba(168, 85, 247, 0.25)
  );
  box-shadow: var(--glow-cyan);
  transform: translateY(-1px);
}
.submit-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none;
}
.submit-btn.loading {
  border-color: rgba(0, 255, 224, 0.5);
}

.submit-error {
  background: rgba(248, 113, 113, 0.08);
  border: 1px solid rgba(248, 113, 113, 0.2);
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 11px;
  color: var(--c-red);
}

/* Multi-view section */
.multiview-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  user-select: none;
}
.expand-icon {
  font-size: 12px;
  color: var(--text3);
}
.multiview-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 8px;
  margin-top: 4px;
}
.multiview-item {
  min-height: 100px;
}
.multiview-item :deep(.dropzone) {
  min-height: 100px;
  padding: 12px 8px;
}
.multiview-item :deep(.drop-icon) {
  font-size: 22px;
  margin-bottom: 4px;
}
.multiview-item :deep(.drop-title) {
  font-size: 10px;
}
.multiview-item :deep(.drop-sub) {
  font-size: 9px;
}
.multiview-item :deep(.drop-formats) {
  font-size: 8px;
}
.multiview-item :deep(.preview-img) {
  max-height: 80px;
}

/* Optional badge */
.optional-badge {
  font-size: 8px;
  color: var(--text3);
  letter-spacing: 1px;
  background: var(--bg3);
  padding: 1px 5px;
  border-radius: 4px;
  margin-left: 6px;
  vertical-align: middle;
}
</style>
