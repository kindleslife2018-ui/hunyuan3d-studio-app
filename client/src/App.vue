<template>
  <div class="app">
    <!-- Scanline overlay -->
    <div class="scanlines" aria-hidden="true"></div>

    <!-- Header -->
    <header class="header">
      <div class="header-logo">
        <div class="logo-mark">
          <div class="logo-ring"></div>
          <span class="logo-glyph">◈</span>
        </div>
        <div class="logo-text">
          <span class="logo-main">HUNYUAN</span>
          <span class="logo-sub">3D STUDIO</span>
        </div>
        <div class="version-badge">v2.0</div>
      </div>

      <div class="header-stats">
        <div class="stat">
          <span class="stat-val">{{
            jobs.filter((j) => j.status === 'RUN' || j.status === 'WAIT').length
          }}</span>
          <span class="stat-label">ACTIVE</span>
        </div>
        <div class="stat">
          <span class="stat-val" style="color: var(--c-green)">{{
            jobs.filter((j) => j.status === 'DONE').length
          }}</span>
          <span class="stat-label">DONE</span>
        </div>
        <div class="stat">
          <span class="stat-val" style="color: var(--c-red)">{{
            jobs.filter((j) => j.status === 'FAIL').length
          }}</span>
          <span class="stat-label">FAILED</span>
        </div>
      </div>

      <button
        class="clear-all-btn"
        @click="clearDone"
        v-if="jobs.some((j) => j.status === 'DONE' || j.status === 'FAIL')"
      >
        CLEAR DONE
      </button>
    </header>

    <!-- Credentials bar -->
    <CredentialsBar
      :server-online="serverOnline"
      :server-checking="serverChecking"
      @check-health="checkHealth"
    />

    <!-- Main layout -->
    <div class="main">
      <!-- Left sidebar: controls -->
      <aside class="sidebar">
        <!-- Nav tabs -->
        <div class="sidebar-nav">
          <button
            v-for="tab in sidebarTabs"
            :key="tab.key"
            class="nav-tab"
            :class="{ active: activeTab === tab.key }"
            @click="activeTab = tab.key"
          >
            <span class="nav-icon">{{ tab.icon }}</span>
            <span class="nav-label">{{ tab.label }}</span>
          </button>
        </div>

        <!-- Panel content -->
        <div class="sidebar-content">
          <GeneratePanel
            v-if="activeTab === 'generate'"
            @job-submitted="onJobSubmitted"
          />
          <TexturePanel
            v-else-if="activeTab === 'texture'"
            :prefill-model-url="textureTargetUrl"
            :prefill-model-type="textureTargetType"
            @job-submitted="onJobSubmitted"
          />
          <ToolsPanel
            ref="toolsPanelRef"
            v-else-if="activeTab === 'tools'"
            @job-submitted="onJobSubmitted"
          />
        </div>
      </aside>

      <!-- Right: job feed -->
      <main class="feed">
        <!-- Empty state -->
        <div v-if="jobs.length === 0" class="empty-state">
          <div class="empty-animation">
            <div class="orbit-ring ring1"></div>
            <div class="orbit-ring ring2"></div>
            <div class="orbit-ring ring3"></div>
            <span class="empty-icon">◈</span>
          </div>
          <h2 class="empty-title">Ready to Generate</h2>
          <p class="empty-sub">
            Upload an image or enter a prompt to generate your first 3D model.
            Jobs will appear here.
          </p>
          <div class="empty-tips">
            <div class="tip">
              <span class="tip-num">01</span>
              <span>Configure Tencent credentials above</span>
            </div>
            <div class="tip">
              <span class="tip-num">02</span>
              <span>Upload a source image in the Generate panel</span>
            </div>
            <div class="tip">
              <span class="tip-num">03</span>
              <span>Click Generate — poll results automatically</span>
            </div>
            <div class="tip">
              <span class="tip-num">04</span>
              <span>Use 🎨 to apply textures to generated models</span>
            </div>
          </div>
        </div>

        <!-- Job cards -->
        <div v-else class="job-feed">
          <TransitionGroup name="job" tag="div" class="job-list">
            <JobCard
              v-for="job in jobs"
              :key="job.id"
              :job="job"
              :show-texture-btn="job.status === 'DONE' && job.files?.length > 0"
              @dismiss="dismissJob"
              @use-as-texture-target="useAsTextureTarget"
              @use-in-tool="useInTool"
            />
          </TransitionGroup>
        </div>
      </main>
    </div>

    <!-- Toast notifications -->
    <div class="toast-stack">
      <TransitionGroup name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="toast"
          :class="toast.type"
        >
          <span class="toast-icon">{{
            toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : 'ℹ'
          }}</span>
          <span class="toast-msg">{{ toast.message }}</span>
        </div>
      </TransitionGroup>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import CredentialsBar from './components/CredentialsBar.vue';
import GeneratePanel from './components/GeneratePanel.vue';
import TexturePanel from './components/TexturePanel.vue';
import ToolsPanel from './components/ToolsPanel.vue';
import JobCard from './components/JobCard.vue';
import {
  checkHealth as apiCheckHealth,
  pollUntilDone,
} from './composables/useApi.js';

const serverOnline = ref(false);
const serverChecking = ref(false);
const activeTab = ref('generate');
const jobs = ref([]);
const toasts = ref([]);
const textureTargetUrl = ref('');
const textureTargetType = ref('GLB');

const sidebarTabs = [
  { key: 'generate', icon: '◈', label: 'Generate' },
  { key: 'texture', icon: '🎨', label: 'Texture' },
  { key: 'tools', icon: '⚙', label: 'Tools' },
];

// ── Health check ──────────────────────────────────────────────────────────
async function checkHealth() {
  serverChecking.value = true;
  const { data, error } = await apiCheckHealth();
  serverChecking.value = false;
  serverOnline.value = !!data && !error;
  addToast(
    serverOnline.value
      ? 'Server is online ✓'
      : 'Cannot reach server — is it running?',
    serverOnline.value ? 'success' : 'error',
  );
}

// ── Job management ────────────────────────────────────────────────────────
function onJobSubmitted(jobData) {
  // If sync result (format convert), just push with DONE status
  if (jobData.status === 'DONE') {
    jobs.value.unshift({ ...jobData, id: Date.now(), createdAt: Date.now() });
    addToast('Conversion complete!', 'success');
    return;
  }

  const job = reactive({
    id: Date.now(),
    jobId: jobData.jobId,
    requestId: jobData.requestId,
    type: jobData.type,
    queryAction: jobData.queryAction,
    inputPreview: jobData.inputPreview,
    inputLabel: jobData.inputLabel,
    chips: jobData.chips || [],
    status: 'WAIT',
    files: [],
    errorCode: null,
    errorMessage: null,
    error: null,
    createdAt: Date.now(),
  });

  jobs.value.unshift(job);
  addToast(`Job submitted: ${job.jobId?.slice(0, 12)}…`, 'info');

  // Start polling
  pollUntilDone(job.jobId, job.queryAction, (update) => {
    job.status = update.status || update.error ? 'FAIL' : job.status;
    if (update.error) {
      job.status = 'FAIL';
      job.error = update.error;
      return;
    }
    job.status = update.status;
    if (update.files) job.files = update.files;
    if (update.errorCode) job.errorCode = update.errorCode;
    if (update.errorMessage) job.errorMessage = update.errorMessage;
    if (update.status === 'DONE') addToast(`${job.type} complete!`, 'success');
    if (update.status === 'FAIL') addToast(`${job.type} failed`, 'error');
  });
}

function dismissJob(id) {
  const idx = jobs.value.findIndex((j) => j.id === id);
  if (idx !== -1) jobs.value.splice(idx, 1);
}

function clearDone() {
  jobs.value = jobs.value.filter(
    (j) => j.status !== 'DONE' && j.status !== 'FAIL',
  );
}

const toolsPanelRef = ref(null);

function useAsTextureTarget(file) {
  textureTargetUrl.value = file.Url;
  textureTargetType.value = file.Type || 'GLB';
  activeTab.value = 'texture';
  addToast('Model URL pre-filled in Texture Editor', 'info');
}

function useInTool({ file, tool }) {
  activeTab.value = 'tools';
  // Wait a tick so ToolsPanel is mounted, then prefill
  setTimeout(() => {
    if (toolsPanelRef.value?.prefillTool) {
      toolsPanelRef.value.prefillTool(tool, file.Url, file.Type || 'GLB');
    }
  }, 50);
  const toolNames = {
    topology: 'Retopo',
    uv: 'UV Unfold',
    parts: 'Part Split',
    convert: 'Convert',
  };
  addToast(`Model URL sent to ${toolNames[tool] || tool}`, 'info');
}

// ── Toasts ────────────────────────────────────────────────────────────────
function addToast(message, type = 'info') {
  const id = Date.now() + Math.random();
  toasts.value.push({ id, message, type });
  setTimeout(() => {
    const idx = toasts.value.findIndex((t) => t.id === id);
    if (idx !== -1) toasts.value.splice(idx, 1);
  }, 4000);
}

onMounted(() => checkHealth());
</script>

<style>
/* App shell */
.app {
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

/* Scanlines */
.scanlines {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 1000;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0, 0, 0, 0.03) 2px,
    rgba(0, 0, 0, 0.03) 4px
  );
}

/* Header */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  height: 56px;
  border-bottom: 1px solid var(--border);
  background: var(--bg1);
  flex-shrink: 0;
  z-index: 10;
}
.header-logo {
  display: flex;
  align-items: center;
  gap: 14px;
}
.logo-mark {
  width: 36px;
  height: 36px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}
.logo-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 1.5px solid rgba(0, 255, 224, 0.3);
  animation: spin 8s linear infinite;
}
.logo-ring::before {
  content: '';
  position: absolute;
  top: -2px;
  left: 50%;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--c-cyan);
  transform: translateX(-50%);
  box-shadow: 0 0 8px var(--c-cyan);
}
.logo-glyph {
  font-size: 16px;
  color: var(--c-cyan);
  z-index: 1;
}
.logo-text {
  display: flex;
  flex-direction: column;
  line-height: 1;
}
.logo-main {
  font-family: var(--font-display);
  font-size: 14px;
  font-weight: 900;
  color: var(--text);
  letter-spacing: 2px;
}
.logo-sub {
  font-family: var(--font-display);
  font-size: 8px;
  font-weight: 400;
  color: var(--c-cyan);
  letter-spacing: 4px;
  margin-top: 2px;
}
.version-badge {
  font-family: var(--font-mono);
  font-size: 9px;
  padding: 2px 8px;
  border-radius: 20px;
  background: rgba(0, 255, 224, 0.08);
  border: 1px solid rgba(0, 255, 224, 0.15);
  color: var(--c-cyan);
  letter-spacing: 1px;
}

.header-stats {
  display: flex;
  gap: 24px;
}
.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.stat-val {
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 700;
  color: var(--text);
  line-height: 1;
}
.stat-label {
  font-family: var(--font-mono);
  font-size: 8px;
  color: var(--text3);
  letter-spacing: 1.5px;
}

.clear-all-btn {
  background: none;
  border: 1px solid var(--border2);
  color: var(--text3);
  padding: 6px 14px;
  border-radius: 6px;
  font-family: var(--font-display);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 1.5px;
  cursor: pointer;
  transition: all 0.2s;
}
.clear-all-btn:hover {
  color: var(--c-red);
  border-color: rgba(248, 113, 113, 0.3);
}

/* Main layout */
.main {
  flex: 1;
  display: flex;
  overflow: hidden;
  background: var(--bg);
}

/* Sidebar */
.sidebar {
  width: 340px;
  flex-shrink: 0;
  border-right: 1px solid var(--border);
  background: var(--bg1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.sidebar-nav {
  display: flex;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.nav-tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 8px;
  background: none;
  border: none;
  border-right: 1px solid var(--border);
  cursor: pointer;
  transition: all 0.2s;
  color: var(--text3);
}
.nav-tab:last-child {
  border-right: none;
}
.nav-tab:hover {
  background: var(--bg2);
  color: var(--text2);
}
.nav-tab.active {
  background: var(--bg2);
  color: var(--c-cyan);
  position: relative;
}
.nav-tab.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, var(--c-cyan), var(--c-purple));
}
.nav-icon {
  font-size: 18px;
}
.nav-label {
  font-family: var(--font-display);
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 1.5px;
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px 18px;
}

/* Feed */
.feed {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
}
.job-feed {
  flex: 1;
}
.job-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* Empty state */
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 60px 40px;
}
.empty-animation {
  width: 120px;
  height: 120px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 32px;
}
.orbit-ring {
  position: absolute;
  border-radius: 50%;
  border: 1px solid rgba(0, 255, 224, 0.15);
}
.ring1 {
  inset: 0;
  animation: spin 6s linear infinite;
}
.ring2 {
  inset: 14px;
  animation: spin 4s linear infinite reverse;
  border-color: rgba(168, 85, 247, 0.15);
}
.ring3 {
  inset: 28px;
  animation: spin 3s linear infinite;
  border-color: rgba(244, 114, 182, 0.15);
}
.ring1::before {
  content: '';
  position: absolute;
  top: -3px;
  left: 50%;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--c-cyan);
  transform: translateX(-50%);
  box-shadow: 0 0 10px var(--c-cyan);
}
.ring2::before {
  content: '';
  position: absolute;
  bottom: -3px;
  right: 0;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--c-purple);
  box-shadow: 0 0 10px var(--c-purple);
}
.empty-icon {
  font-size: 32px;
  color: var(--c-cyan);
  text-shadow: 0 0 20px var(--c-cyan);
  z-index: 1;
}
.empty-title {
  font-family: var(--font-display);
  font-size: 24px;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 10px;
  letter-spacing: -0.5px;
}
.empty-sub {
  font-size: 13px;
  color: var(--text2);
  max-width: 380px;
  line-height: 1.6;
  margin-bottom: 36px;
}
.empty-tips {
  display: flex;
  flex-direction: column;
  gap: 10px;
  text-align: left;
}
.tip {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  font-size: 12px;
  color: var(--text2);
}
.tip-num {
  font-family: var(--font-display);
  font-size: 10px;
  font-weight: 700;
  color: var(--c-cyan);
  opacity: 0.5;
  flex-shrink: 0;
  width: 20px;
}

/* Toast */
.toast-stack {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: none;
}
.toast {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  border-radius: 10px;
  background: var(--bg2);
  border: 1px solid var(--border2);
  font-size: 12px;
  color: var(--text);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
  min-width: 240px;
  max-width: 360px;
  pointer-events: auto;
}
.toast.success {
  border-color: rgba(34, 211, 160, 0.3);
}
.toast.error {
  border-color: rgba(248, 113, 113, 0.3);
}
.toast.info {
  border-color: rgba(0, 255, 224, 0.15);
}
.toast-icon {
  font-size: 14px;
  flex-shrink: 0;
}
.toast.success .toast-icon {
  color: var(--c-green);
}
.toast.error .toast-icon {
  color: var(--c-red);
}
.toast.info .toast-icon {
  color: var(--c-cyan);
}

/* Job list transitions */
.job-enter-active {
  animation: slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}
.job-leave-active {
  animation: slideUp 0.25s reverse;
}
.toast-enter-active {
  animation: slideUp 0.3s ease;
}
.toast-leave-active {
  transition:
    opacity 0.3s,
    transform 0.3s;
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
