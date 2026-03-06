/**
 * useApi — composable for all Hunyuan 3D server calls
 */
import { ref } from 'vue';
import axios from 'axios';

const BASE = '/api';

// Global credentials store (user can set them in the UI)
export const credentials = ref({
  secretId: '',
  secretKey: '',
});

function getHeaders() {
  return {
    'x-secret-id': credentials.value.secretId,
    'x-secret-key': credentials.value.secretKey,
  };
}

async function handle(promise) {
  try {
    const res = await promise;
    return { data: res.data, error: null };
  } catch (err) {
    const msg = err?.response?.data?.error || err.message || 'Unknown error';
    return { data: null, error: msg };
  }
}

/** Submit image/prompt → 3D generation job */
export function submitGenerate(payload) {
  return handle(
    axios.post(`${BASE}/generate`, payload, { headers: getHeaders() }),
  );
}

/** Poll a job by ID */
export function pollJob(jobId, action = 'QueryHunyuanTo3DProJob') {
  return handle(
    axios.get(`${BASE}/job/${jobId}`, {
      params: { action },
      headers: getHeaders(),
    }),
  );
}

/** Submit texture edit job */
export function submitTextureEdit(payload) {
  return handle(
    axios.post(`${BASE}/texture-edit`, payload, { headers: getHeaders() }),
  );
}

/** Submit UV unfold job */
export function submitUVUnfold(payload) {
  return handle(
    axios.post(`${BASE}/uv-unfold`, payload, { headers: getHeaders() }),
  );
}

/** Convert 3D format (sync) */
export function convertFormat(payload) {
  return handle(
    axios.post(`${BASE}/convert`, payload, { headers: getHeaders() }),
  );
}

/** Submit part split job */
export function submitPartSplit(payload) {
  return handle(
    axios.post(`${BASE}/part-split`, payload, { headers: getHeaders() }),
  );
}

/** Submit smart topology (retopology) job */
export function submitSmartTopology(payload) {
  return handle(
    axios.post(`${BASE}/smart-topology`, payload, { headers: getHeaders() }),
  );
}

/** Health check */
export function checkHealth() {
  return handle(axios.get(`${BASE}/health`, { headers: getHeaders() }));
}

/** Convert File object → base64 string */
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** Poll a job until DONE or FAIL, calling onUpdate each tick */
export async function pollUntilDone(
  jobId,
  action,
  onUpdate,
  intervalMs = 3000,
) {
  while (true) {
    const { data, error } = await pollJob(jobId, action);
    if (error) {
      onUpdate({ status: 'FAIL', error });
      return;
    }
    onUpdate(data);
    if (data.status === 'DONE' || data.status === 'FAIL') return;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}
