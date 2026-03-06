<template>
  <div
    class="dropzone"
    :class="{ 'drag-over': isDragging, 'has-file': !!preview }"
    @dragover.prevent="isDragging = true"
    @dragleave="isDragging = false"
    @drop.prevent="handleDrop"
    @click="$refs.fileInput.click()"
  >
    <input
      ref="fileInput"
      type="file"
      :accept="accept"
      @change="handleFileInput"
      style="display:none"
    />

    <transition name="fade" mode="out-in">
      <!-- Preview -->
      <div v-if="preview" class="preview-wrap" key="preview">
        <img :src="preview" class="preview-img" :alt="fileName" />
        <div class="preview-meta">
          <span class="file-name truncate">{{ fileName }}</span>
          <span class="file-size">{{ fileSize }}</span>
        </div>
        <button class="clear-btn" @click.stop="clearFile">✕</button>
      </div>

      <!-- Empty state -->
      <div v-else class="empty-wrap" key="empty">
        <div class="drop-icon">{{ icon }}</div>
        <div class="drop-title">{{ title }}</div>
        <div class="drop-sub">{{ subtitle }}</div>
        <div class="drop-formats">{{ formats }}</div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  modelValue: File,
  accept: { type: String, default: 'image/jpeg,image/png,image/webp' },
  icon: { type: String, default: '⬆' },
  title: { type: String, default: 'Drop image here' },
  subtitle: { type: String, default: 'or click to browse' },
  formats: { type: String, default: 'JPG · PNG · WEBP — max 20MB' },
})

const emit = defineEmits(['update:modelValue', 'file-selected'])

const isDragging = ref(false)
const preview = ref(null)
const fileName = ref('')
const fileSizeBytes = ref(0)

const fileSize = computed(() => {
  const b = fileSizeBytes.value
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1024 / 1024).toFixed(2)} MB`
})

function handleDrop(e) {
  isDragging.value = false
  const file = e.dataTransfer.files[0]
  if (file) processFile(file)
}

function handleFileInput(e) {
  const file = e.target.files[0]
  if (file) processFile(file)
}

function processFile(file) {
  fileName.value = file.name
  fileSizeBytes.value = file.size
  const reader = new FileReader()
  reader.onload = (e) => { preview.value = e.target.result }
  reader.readAsDataURL(file)
  emit('update:modelValue', file)
  emit('file-selected', file)
}

function clearFile() {
  preview.value = null
  fileName.value = ''
  fileSizeBytes.value = 0
  emit('update:modelValue', null)
}
</script>

<style scoped>
.dropzone {
  border: 1.5px dashed var(--border2);
  border-radius: var(--radius-lg);
  padding: 28px 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.25s;
  background: var(--bg2);
  position: relative;
  overflow: hidden;
  min-height: 160px;
  display: flex; align-items: center; justify-content: center;
}
.dropzone::before {
  content: '';
  position: absolute; inset: 0;
  background: radial-gradient(ellipse at 50% 0%, rgba(0,255,224,0.04), transparent 70%);
  pointer-events: none;
  opacity: 0; transition: opacity 0.3s;
}
.dropzone:hover, .dropzone.drag-over {
  border-color: var(--c-cyan);
  background: rgba(0,255,224,0.03);
}
.dropzone:hover::before, .dropzone.drag-over::before { opacity: 1; }
.dropzone.has-file {
  border-style: solid;
  border-color: rgba(0,255,224,0.3);
  padding: 12px;
}

.drop-icon { font-size: 36px; margin-bottom: 10px; opacity: 0.6; }
.drop-title {
  font-family: var(--font-display); font-size: 13px; font-weight: 500;
  color: var(--text); margin-bottom: 4px;
}
.drop-sub { font-size: 11px; color: var(--text2); margin-bottom: 6px; }
.drop-formats {
  font-size: 10px; color: var(--text3); letter-spacing: 0.5px;
}

.preview-wrap {
  width: 100%; position: relative;
}
.preview-img {
  width: 100%; max-height: 200px; object-fit: contain;
  border-radius: 8px; display: block; margin-bottom: 8px;
}
.preview-meta {
  display: flex; align-items: center; justify-content: space-between;
  font-size: 10px; color: var(--text2);
}
.file-name { max-width: 200px; }
.file-size { color: var(--text3); flex-shrink: 0; }
.clear-btn {
  position: absolute; top: 0; right: 0;
  background: rgba(248,113,113,0.15); border: 1px solid rgba(248,113,113,0.3);
  color: var(--c-red); border-radius: 6px;
  width: 26px; height: 26px; cursor: pointer;
  font-size: 11px; transition: all 0.2s;
  display: flex; align-items: center; justify-content: center;
}
.clear-btn:hover { background: rgba(248,113,113,0.3); }

/* Transitions */
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s, transform 0.2s; }
.fade-enter-from { opacity: 0; transform: scale(0.97); }
.fade-leave-to { opacity: 0; transform: scale(1.02); }
</style>
