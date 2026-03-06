<template>
  <div class="creds-bar" :class="{ configured: isConfigured }">
    <div class="creds-inner">
      <div class="creds-left">
        <span class="creds-icon">🔑</span>
        <span class="creds-label">TENCENT CREDENTIALS</span>
        <span class="status-dot" :class="{ online: serverOnline, checking: serverChecking }"></span>
        <span class="status-text mono">{{ serverStatusText }}</span>
      </div>

      <div class="creds-fields">
        <div class="cred-input-wrap">
          <label>SECRET ID</label>
          <input
            v-model="credentials.secretId"
            type="text"
            placeholder="AKIDxxxxxxxxxxxxxxxx"
            autocomplete="off"
            spellcheck="false"
          />
        </div>
        <div class="cred-input-wrap">
          <label>SECRET KEY</label>
          <input
            v-model="credentials.secretKey"
            :type="showKey ? 'text' : 'password'"
            placeholder="••••••••••••••••••••"
            autocomplete="off"
          />
          <button class="eye-btn" @click="showKey = !showKey" tabindex="-1">
            {{ showKey ? '🙈' : '👁' }}
          </button>
        </div>
      </div>

      <button class="btn-check" @click="$emit('check-health')" :disabled="serverChecking">
        <span v-if="serverChecking" class="spin">⟳</span>
        <span v-else>PING</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { credentials } from '../composables/useApi.js'

defineEmits(['check-health'])

const props = defineProps({
  serverOnline: Boolean,
  serverChecking: Boolean,
})

const showKey = ref(false)
const isConfigured = computed(() => credentials.value.secretId && credentials.value.secretKey)
const serverStatusText = computed(() => {
  if (props.serverChecking) return 'checking...'
  if (props.serverOnline) return 'server online'
  return 'server offline'
})
</script>

<style scoped>
.creds-bar {
  background: var(--bg2);
  border-bottom: 1px solid var(--border);
  padding: 10px 24px;
  transition: border-color 0.3s;
}
.creds-bar.configured {
  border-bottom-color: rgba(0,255,224,0.2);
}
.creds-inner {
  display: flex; align-items: center; gap: 16px;
  max-width: 1400px; margin: 0 auto;
}
.creds-left {
  display: flex; align-items: center; gap: 10px;
  flex-shrink: 0;
}
.creds-icon { font-size: 14px; }
.creds-label {
  font-family: var(--font-display);
  font-size: 9px; font-weight: 700;
  letter-spacing: 2px; color: var(--text2);
}
.status-dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: var(--text3); flex-shrink: 0;
  transition: background 0.3s, box-shadow 0.3s;
}
.status-dot.online {
  background: var(--c-green);
  box-shadow: 0 0 8px var(--c-green);
  animation: pulse 2s ease-in-out infinite;
}
.status-dot.checking { background: var(--c-yellow); animation: pulse 0.8s ease-in-out infinite; }
.status-text { font-size: 10px; color: var(--text2); }

.creds-fields {
  display: flex; gap: 10px; flex: 1;
}
.cred-input-wrap {
  display: flex; align-items: center; gap: 8px; flex: 1;
  position: relative;
}
.cred-input-wrap label {
  font-size: 9px; font-weight: 700; letter-spacing: 1.5px;
  color: var(--text3); white-space: nowrap; flex-shrink: 0;
}
.cred-input-wrap input {
  flex: 1;
  background: var(--bg3);
  border: 1px solid var(--border2);
  color: var(--text); border-radius: 7px;
  padding: 7px 32px 7px 10px;
  font-family: var(--font-mono); font-size: 11px;
  outline: none; width: 0;
  transition: border-color 0.2s;
}
.cred-input-wrap input:focus { border-color: var(--c-cyan); }
.eye-btn {
  position: absolute; right: 8px;
  background: none; border: none; cursor: pointer;
  font-size: 13px; padding: 2px; line-height: 1;
  color: var(--text2); opacity: 0.6;
}
.eye-btn:hover { opacity: 1; }

.btn-check {
  background: var(--bg3); border: 1px solid var(--border2);
  color: var(--text2); padding: 7px 16px; border-radius: 7px;
  font-family: var(--font-display); font-size: 9px; font-weight: 700;
  letter-spacing: 1.5px; cursor: pointer; flex-shrink: 0;
  transition: all 0.2s;
}
.btn-check:hover:not(:disabled) { border-color: var(--c-cyan); color: var(--c-cyan); }
.btn-check:disabled { opacity: 0.4; cursor: not-allowed; }
</style>
