<template>
  <div class="job-card slide-up" :class="`status-${job.status?.toLowerCase()}`">
    <!-- Header -->
    <div class="card-header">
      <div class="card-header-left">
        <span class="job-type-badge">{{ job.type }}</span>
        <span class="job-id mono">{{ job.jobId }}</span>
      </div>
      <div class="status-pill" :class="job.status?.toLowerCase()">
        <span class="status-indicator">
          <span
            v-if="job.status === 'RUN' || job.status === 'WAIT'"
            class="spin"
            >◌</span
          >
          <span v-else-if="job.status === 'DONE'">✓</span>
          <span v-else-if="job.status === 'FAIL'">✕</span>
          <span v-else>…</span>
        </span>
        <span class="status-label">{{ job.status || 'PENDING' }}</span>
      </div>
    </div>

    <!-- Input preview row -->
    <div class="card-body">
      <div class="input-row" v-if="job.inputPreview || job.inputLabel">
        <div class="input-thumb-wrap">
          <img
            v-if="job.inputPreview"
            :src="job.inputPreview"
            class="input-thumb"
          />
          <div v-else class="input-thumb-placeholder">
            {{ job.type?.charAt(0) }}
          </div>
        </div>
        <div class="input-meta">
          <div class="input-label">{{ job.inputLabel || 'Input' }}</div>
          <div class="chips-row">
            <span class="chip" v-for="chip in job.chips" :key="chip">{{
              chip
            }}</span>
          </div>
          <div class="time-label mono">{{ formatTime(job.createdAt) }}</div>
        </div>
      </div>

      <!-- Progress bar (RUN / WAIT) -->
      <div
        v-if="job.status === 'RUN' || job.status === 'WAIT'"
        class="progress-wrap"
      >
        <div
          class="progress-bar"
          :class="{ indeterminate: job.status !== 'RUN' }"
        ></div>
        <span class="progress-label mono">{{
          job.status === 'WAIT'
            ? 'Queued — waiting for slot'
            : 'Generating 3D model...'
        }}</span>
      </div>

      <!-- Error -->
      <div v-if="job.status === 'FAIL'" class="error-box">
        <span class="error-code mono" v-if="job.errorCode"
          >[{{ job.errorCode }}]</span
        >
        {{ job.errorMessage || job.error || 'Job failed with no message' }}
      </div>

      <!-- Results -->
      <div
        v-if="job.status === 'DONE' && job.files?.length"
        class="results-section"
      >
        <div class="results-label">OUTPUT FILES</div>
        <div class="result-files">
          <div class="result-file" v-for="file in job.files" :key="file.Url">
            <div class="result-file-left">
              <span class="fmt-badge">{{ file.Type }}</span>
              <a
                :href="file.Url"
                target="_blank"
                class="file-url mono truncate"
                >{{ file.Url }}</a
              >
            </div>
            <div class="result-actions">
              <button
                class="action-btn"
                @click="copyUrl(file.Url)"
                title="Copy URL"
              >
                ⎘
              </button>
              <a
                :href="file.Url"
                target="_blank"
                class="action-btn"
                title="Open in new tab"
                >↗</a
              >
              <button
                v-if="showTextureBtn"
                class="action-btn texture-btn"
                @click="$emit('use-as-texture-target', file)"
                title="Apply texture to this model"
              >
                🎨
              </button>
              <button
                v-if="showTextureBtn && isRetopable(file.Type)"
                class="action-btn retopo-btn"
                @click="$emit('use-in-tool', { file, tool: 'topology' })"
                title="Smart Retopology"
              >
                ◇
              </button>
              <button
                v-if="showTextureBtn"
                class="action-btn uv-btn"
                @click="$emit('use-in-tool', { file, tool: 'uv' })"
                title="UV Unfold"
              >
                ⟳
              </button>
            </div>
          </div>
        </div>

        <!-- Preview image if available -->
        <div v-if="previewImageUrl" class="model-preview">
          <div class="preview-label">PREVIEW</div>
          <img :src="previewImageUrl" class="model-preview-img" />
        </div>
      </div>

      <!-- Convert result (sync) -->
      <div v-if="job.resultUrl" class="results-section">
        <div class="results-label">CONVERTED FILE</div>
        <div class="result-file">
          <a
            :href="job.resultUrl"
            target="_blank"
            class="file-url mono truncate"
            >{{ job.resultUrl }}</a
          >
          <div class="result-actions">
            <button class="action-btn" @click="copyUrl(job.resultUrl)">
              ⎘
            </button>
            <a :href="job.resultUrl" target="_blank" class="action-btn">↗</a>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="card-footer">
      <span class="req-id mono" v-if="job.requestId"
        >req: {{ job.requestId?.slice(0, 16) }}…</span
      >
      <div class="footer-actions">
        <button
          v-if="['DONE', 'FAIL'].includes(job.status)"
          class="dismiss-btn"
          @click="$emit('dismiss', job.id)"
        >
          dismiss
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  job: { type: Object, required: true },
  showTextureBtn: { type: Boolean, default: true },
});

defineEmits(['dismiss', 'use-as-texture-target', 'use-in-tool']);

function isRetopable(type) {
  return ['GLB', 'OBJ'].includes(type?.toUpperCase());
}

const previewImageUrl = computed(
  () => props.job.files?.find((f) => f.PreviewImageUrl)?.PreviewImageUrl,
);

function formatTime(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleTimeString();
}

function copyUrl(url) {
  navigator.clipboard.writeText(url).catch(() => {});
}
</script>

<style scoped>
.job-card {
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  transition: border-color 0.3s;
}
.job-card.status-done {
  border-color: rgba(34, 211, 160, 0.2);
}
.job-card.status-fail {
  border-color: rgba(248, 113, 113, 0.2);
}
.job-card.status-run {
  border-color: rgba(0, 255, 224, 0.15);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  background: var(--bg3);
}
.card-header-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.job-type-badge {
  font-family: var(--font-display);
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 1.5px;
  padding: 3px 9px;
  border-radius: 4px;
  flex-shrink: 0;
  background: linear-gradient(
    135deg,
    rgba(0, 255, 224, 0.15),
    rgba(168, 85, 247, 0.15)
  );
  border: 1px solid rgba(0, 255, 224, 0.2);
  color: var(--c-cyan);
}
.job-id {
  font-size: 10px;
  color: var(--text3);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 20px;
  flex-shrink: 0;
  font-family: var(--font-display);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 1.5px;
  background: var(--bg4);
  border: 1px solid var(--border);
  color: var(--text2);
}
.status-pill.wait {
  color: var(--c-yellow);
  border-color: rgba(251, 191, 36, 0.2);
  background: rgba(251, 191, 36, 0.05);
}
.status-pill.run {
  color: var(--c-cyan);
  border-color: rgba(0, 255, 224, 0.2);
  background: rgba(0, 255, 224, 0.05);
}
.status-pill.done {
  color: var(--c-green);
  border-color: rgba(34, 211, 160, 0.2);
  background: rgba(34, 211, 160, 0.05);
}
.status-pill.fail {
  color: var(--c-red);
  border-color: rgba(248, 113, 113, 0.2);
  background: rgba(248, 113, 113, 0.05);
}

.card-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.input-row {
  display: flex;
  gap: 14px;
  align-items: flex-start;
}
.input-thumb-wrap {
  flex-shrink: 0;
}
.input-thumb {
  width: 72px;
  height: 72px;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid var(--border2);
  display: block;
}
.input-thumb-placeholder {
  width: 72px;
  height: 72px;
  border-radius: 8px;
  background: var(--bg4);
  border: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-display);
  font-size: 22px;
  color: var(--text3);
}
.input-meta {
  flex: 1;
  min-width: 0;
}
.input-label {
  font-family: var(--font-display);
  font-size: 11px;
  font-weight: 500;
  color: var(--text);
  margin-bottom: 6px;
}
.chips-row {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-bottom: 6px;
}
.chip {
  font-size: 9px;
  padding: 2px 8px;
  border-radius: 3px;
  background: var(--bg4);
  border: 1px solid var(--border2);
  color: var(--text2);
  letter-spacing: 0.5px;
}
.time-label {
  font-size: 10px;
  color: var(--text3);
}

/* Progress */
.progress-wrap {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.progress-bar {
  height: 3px;
  border-radius: 2px;
  overflow: hidden;
  background: var(--bg4);
  position: relative;
}
.progress-bar::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent, var(--c-cyan), transparent);
  animation: shimmer 2s linear infinite;
  background-size: 200% 100%;
}
.progress-label {
  font-size: 10px;
  color: var(--text2);
}

/* Error */
.error-box {
  background: rgba(248, 113, 113, 0.05);
  border: 1px solid rgba(248, 113, 113, 0.2);
  border-radius: 8px;
  padding: 12px 14px;
  font-size: 11px;
  color: var(--c-red);
  line-height: 1.5;
}
.error-code {
  margin-right: 6px;
  opacity: 0.7;
}

/* Results */
.results-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.results-label {
  font-family: var(--font-display);
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 2px;
  color: var(--text3);
}
.result-files {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.result-file {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  background: var(--bg3);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 8px 12px;
}
.result-file-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex: 1;
}
.fmt-badge {
  font-family: var(--font-display);
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 1px;
  padding: 3px 7px;
  border-radius: 4px;
  flex-shrink: 0;
  background: linear-gradient(135deg, var(--c-purple), var(--c-pink));
  color: white;
}
.file-url {
  font-size: 10px;
  color: var(--text2);
  max-width: 340px;
  text-decoration: none;
  transition: color 0.2s;
}
.file-url:hover {
  color: var(--c-cyan);
}
.result-actions {
  display: flex;
  gap: 5px;
  flex-shrink: 0;
}
.action-btn {
  background: var(--bg4);
  border: 1px solid var(--border2);
  color: var(--text2);
  border-radius: 6px;
  width: 28px;
  height: 28px;
  cursor: pointer;
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  text-decoration: none;
}
.action-btn:hover {
  border-color: var(--c-cyan);
  color: var(--c-cyan);
}
.texture-btn:hover {
  border-color: var(--c-purple) !important;
  color: var(--c-purple) !important;
}
.retopo-btn:hover {
  border-color: #a855f7 !important;
  color: #a855f7 !important;
}
.uv-btn:hover {
  border-color: var(--c-blue) !important;
  color: var(--c-blue) !important;
}

.model-preview {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.preview-label {
  font-family: var(--font-display);
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 2px;
  color: var(--text3);
}
.model-preview-img {
  width: 100%;
  max-height: 200px;
  object-fit: contain;
  border-radius: 8px;
  border: 1px solid var(--border);
}

/* Footer */
.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  border-top: 1px solid var(--border);
  background: var(--bg3);
}
.req-id {
  font-size: 9px;
  color: var(--text3);
}
.dismiss-btn {
  background: none;
  border: none;
  color: var(--text3);
  font-family: var(--font-mono);
  font-size: 10px;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  transition: color 0.2s;
}
.dismiss-btn:hover {
  color: var(--c-red);
}

@keyframes shimmer {
  0% {
    background-position: -200% center;
  }
  100% {
    background-position: 200% center;
  }
}
</style>
