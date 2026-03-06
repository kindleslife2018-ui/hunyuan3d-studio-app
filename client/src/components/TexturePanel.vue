<template>
  <div class="texture-panel">
    <div class="panel-title">
      <span>🎨</span>
      TEXTURE EDITOR
    </div>
    <p class="panel-sub">Apply a texture image or prompt to an existing 3D model</p>

    <!-- Model URL input -->
    <div class="field-group">
      <label class="field-label">3D MODEL URL</label>
      <div class="url-input-row">
        <input
          v-model="modelUrl"
          class="field-input"
          placeholder="https://…/model.glb"
          type="url"
        />
        <select v-model="modelType" class="field-input type-select">
          <option value="GLB">GLB</option>
          <option value="FBX">FBX</option>
          <option value="OBJ">OBJ</option>
        </select>
      </div>
      <div v-if="prefillNote" class="prefill-note">📌 Pre-filled from generation result</div>
    </div>

    <!-- Texture source tabs -->
    <div class="mode-tabs">
      <button
        v-for="m in textureModes" :key="m.key"
        class="mode-tab" :class="{ active: textureMode === m.key }"
        @click="textureMode = m.key"
      >{{ m.label }}</button>
    </div>

    <!-- Texture image upload -->
    <div v-if="textureMode === 'image'" class="field-group">
      <ImageDropzone
        v-model="textureFile"
        title="Drop texture image"
        subtitle="reference image for the 3D model surface"
        icon="🖼"
        formats="JPG · PNG — max 10MB, min 128px"
      />
    </div>

    <!-- Texture image URL -->
    <div v-else-if="textureMode === 'url'" class="field-group">
      <label class="field-label">TEXTURE IMAGE URL</label>
      <input
        v-model="textureImageUrl"
        class="field-input"
        placeholder="https://example.com/texture.jpg"
        type="url"
      />
    </div>

    <!-- Prompt -->
    <div v-else class="field-group">
      <label class="field-label">TEXTURE PROMPT</label>
      <textarea
        v-model="texturePrompt"
        class="field-textarea"
        placeholder="A rusty metallic surface with orange patina..."
        rows="3"
      ></textarea>
      <div class="field-hint">Describe the desired texture / material style</div>
    </div>

    <!-- PBR toggle -->
    <div class="toggle-row" v-if="textureMode === 'prompt'">
      <span class="toggle-label">Enable PBR Materials</span>
      <button class="toggle-btn" :class="{ on: enablePBR }" @click="enablePBR = !enablePBR">
        <span class="toggle-knob"></span>
      </button>
    </div>

    <button
      class="submit-btn"
      :disabled="isLoading || !canSubmit"
      @click="submit"
    >
      <span v-if="isLoading" class="spin">◌</span>
      <span v-else>🎨</span>
      {{ isLoading ? 'SUBMITTING...' : 'APPLY TEXTURE' }}
    </button>

    <div v-if="submitError" class="submit-error">{{ submitError }}</div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import ImageDropzone from './ImageDropzone.vue'
import { submitTextureEdit, fileToBase64 } from '../composables/useApi.js'

const props = defineProps({
  prefillModelUrl: String,
  prefillModelType: { type: String, default: 'GLB' },
})
const emit = defineEmits(['job-submitted'])

const modelUrl = ref(props.prefillModelUrl || '')
const modelType = ref(props.prefillModelType || 'GLB')
const prefillNote = ref(!!props.prefillModelUrl)

watch(() => props.prefillModelUrl, (v) => {
  if (v) { modelUrl.value = v; prefillNote.value = true }
})

const textureMode = ref('image')
const textureFile = ref(null)
const textureImageUrl = ref('')
const texturePrompt = ref('')
const enablePBR = ref(false)
const isLoading = ref(false)
const submitError = ref('')

const textureModes = [
  { key: 'image',  label: '📷 Image Upload' },
  { key: 'url',    label: '🔗 Image URL' },
  { key: 'prompt', label: '✏️ Prompt' },
]

const canSubmit = computed(() => {
  if (!modelUrl.value.trim()) return false
  if (textureMode.value === 'image') return !!textureFile.value
  if (textureMode.value === 'url') return textureImageUrl.value.trim().startsWith('http')
  return texturePrompt.value.trim().length > 0
})

async function submit() {
  submitError.value = ''
  isLoading.value = true
  try {
    const payload = {
      modelUrl: modelUrl.value.trim(),
      modelType: modelType.value,
      enablePBR: enablePBR.value,
    }

    let inputPreview = null
    if (textureMode.value === 'image' && textureFile.value) {
      payload.textureImageBase64 = await fileToBase64(textureFile.value)
      inputPreview = URL.createObjectURL(textureFile.value)
    } else if (textureMode.value === 'url') {
      payload.textureImageUrl = textureImageUrl.value.trim()
    } else {
      payload.prompt = texturePrompt.value.trim()
    }

    const { data, error } = await submitTextureEdit(payload)
    if (error) { submitError.value = error; return }

    emit('job-submitted', {
      ...data,
      type: 'TEXTURE EDIT',
      queryAction: 'QueryHunyuanTo3DProJob',
      inputPreview,
      inputLabel: `Texture → ${modelUrl.value.split('/').pop()}`,
      chips: [modelType.value, textureMode.value, ...(enablePBR.value ? ['PBR'] : [])],
    })
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.texture-panel { display: flex; flex-direction: column; gap: 14px; }
.panel-title {
  font-family: var(--font-display); font-size: 10px; font-weight: 700;
  letter-spacing: 2px; color: var(--c-purple);
  display: flex; align-items: center; gap: 8px;
}
.panel-sub { font-size: 11px; color: var(--text2); margin-top: -8px; }
.field-group { display: flex; flex-direction: column; gap: 6px; }
.field-label {
  font-family: var(--font-display); font-size: 9px; font-weight: 700;
  letter-spacing: 1.5px; color: var(--text2);
}
.url-input-row { display: flex; gap: 8px; }
.field-input {
  flex: 1; padding: 9px 12px;
  background: var(--bg3); border: 1px solid var(--border2);
  color: var(--text); border-radius: 8px;
  font-family: var(--font-mono); font-size: 12px;
  outline: none; transition: border-color 0.2s;
}
.field-input:focus { border-color: var(--c-purple); }
.type-select { flex: 0 0 80px; cursor: pointer; }
.field-textarea {
  padding: 10px 12px; resize: vertical;
  background: var(--bg3); border: 1px solid var(--border2);
  color: var(--text); border-radius: 8px;
  font-family: var(--font-mono); font-size: 12px;
  outline: none; transition: border-color 0.2s; min-height: 80px; width: 100%;
}
.field-textarea:focus { border-color: var(--c-purple); }
.field-hint { font-size: 10px; color: var(--text3); }
.prefill-note { font-size: 10px; color: var(--c-yellow); }
.mode-tabs { display: flex; gap: 4px; }
.mode-tab {
  flex: 1; padding: 8px 4px; text-align: center;
  background: var(--bg3); border: 1px solid var(--border);
  color: var(--text2); border-radius: 8px;
  font-family: var(--font-mono); font-size: 11px;
  cursor: pointer; transition: all 0.2s;
}
.mode-tab.active { background: rgba(168,85,247,0.1); border-color: rgba(168,85,247,0.3); color: var(--c-purple); }
.toggle-row { display: flex; align-items: center; justify-content: space-between; }
.toggle-label { font-size: 11px; color: var(--text2); }
.toggle-btn {
  width: 38px; height: 21px; border-radius: 11px;
  background: var(--bg4); border: 1px solid var(--border2);
  cursor: pointer; position: relative; padding: 0;
  transition: background 0.25s, border-color 0.25s;
}
.toggle-btn.on { background: rgba(168,85,247,0.2); border-color: rgba(168,85,247,0.4); }
.toggle-knob {
  position: absolute; top: 2px; left: 2px;
  width: 15px; height: 15px; border-radius: 50%;
  background: var(--text3); transition: transform 0.25s, background 0.25s;
}
.toggle-btn.on .toggle-knob { transform: translateX(17px); background: var(--c-purple); }
.submit-btn {
  width: 100%; padding: 14px 20px;
  background: linear-gradient(135deg, rgba(168,85,247,0.15), rgba(244,114,182,0.15));
  border: 1px solid rgba(168,85,247,0.3);
  color: var(--c-purple); border-radius: 10px;
  font-family: var(--font-display); font-size: 11px; font-weight: 700;
  letter-spacing: 2px; cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: 10px;
  transition: all 0.25s;
}
.submit-btn:hover:not(:disabled) { box-shadow: var(--glow-purple); transform: translateY(-1px); }
.submit-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
.submit-error {
  background: rgba(248,113,113,0.08); border: 1px solid rgba(248,113,113,0.2);
  border-radius: 8px; padding: 10px 12px;
  font-size: 11px; color: var(--c-red);
}
</style>
