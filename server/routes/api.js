/**
 * Hunyuan 3D API Routes
 */
import { Router } from 'express';
import { tencentRequest } from '../tencent.js';

export function createApiRoutes(getCredentials) {
  const router = Router();

  // Helper to get credentials — can come from env or per-request header
  function getCreds(req) {
    const { secretId, secretKey } = getCredentials();
    const headerSecretId = req.headers['x-secret-id'];
    const headerSecretKey = req.headers['x-secret-key'];
    const bodySecretId = req.body?.secretId;
    const bodySecretKey = req.body?.secretKey;

    const id = headerSecretId || bodySecretId || secretId;
    const key = headerSecretKey || bodySecretKey || secretKey;

    if (!id || !key)
      throw new Error(
        'Missing Tencent credentials. Provide via env or x-secret-id / x-secret-key headers.',
      );
    return { secretId: id, secretKey: key };
  }

  // Validate base64 image size (must be ≤ 8MB after encoding, ~6MB raw recommended)
  function validateBase64Image(b64) {
    if (!b64) return null;
    const sizeBytes = Math.ceil((b64.length * 3) / 4);
    const sizeMB = sizeBytes / (1024 * 1024);
    if (sizeMB > 8)
      return `Image too large (${sizeMB.toFixed(1)}MB). Max 8MB after base64 encoding (~6MB raw).`;
    return null;
  }

  // ── POST /api/generate ────────────────────────────────────────────────────
  // Submit image → 3D Pro or Rapid job
  router.post('/generate', async (req, res) => {
    try {
      const { secretId, secretKey } = getCreds(req);
      const {
        imageBase64,
        imageUrl,
        prompt,
        generateType = 'Normal',
        faceCount = 500000,
        enablePBR = false,
        mode = 'pro', // 'pro' | 'rapid'
        resultFormat = 'GLB',
        enableGeometry = false,
        polygonType, // 'triangle' | 'quadrilateral' — only for LowPoly
        multiViewImages, // [{ viewType: 'left'|'right'|'back', imageBase64?, imageUrl? }]
      } = req.body;

      // Sketch mode allows prompt + image together; other modes require one or the other
      if (generateType !== 'Sketch' && !imageBase64 && !imageUrl && !prompt) {
        return res
          .status(400)
          .json({ error: 'Provide imageBase64, imageUrl, or prompt' });
      }
      if (generateType === 'Sketch' && !imageBase64 && !imageUrl) {
        return res
          .status(400)
          .json({ error: 'Sketch mode requires an image (sketch/line art)' });
      }

      // Validate image size
      const imgErr = validateBase64Image(imageBase64);
      if (imgErr) return res.status(400).json({ error: imgErr });

      // Validate face count range
      const fc = Number(faceCount);
      if (mode === 'pro' && (fc < 40000 || fc > 1500000)) {
        return res
          .status(400)
          .json({ error: 'faceCount must be between 40,000 and 1,500,000' });
      }

      const body = {};

      // Input: image or prompt (Sketch mode allows both together)
      if (imageBase64) body.ImageBase64 = imageBase64;
      else if (imageUrl) body.ImageUrl = imageUrl;
      if (generateType === 'Sketch' && prompt) {
        body.Prompt = prompt;
      } else if (!imageBase64 && !imageUrl) {
        body.Prompt = prompt;
      }

      let result;
      if (mode === 'rapid') {
        Object.assign(body, {
          ResultFormat: resultFormat,
          EnablePBR: enablePBR,
          EnableGeometry: enableGeometry,
        });
        result = await tencentRequest(
          'SubmitHunyuanTo3DRapidJob',
          body,
          secretId,
          secretKey,
        );
      } else {
        // Pro mode — full quality options
        Object.assign(body, {
          GenerateType: generateType,
          FaceCount: fc,
          EnablePBR: generateType === 'Geometry' ? false : enablePBR,
        });

        // PolygonType only applies when GenerateType is LowPoly
        if (generateType === 'LowPoly' && polygonType) {
          body.PolygonType = polygonType; // 'triangle' | 'quadrilateral'
        }

        // Multi-view images for better quality (left, right, back views)
        if (Array.isArray(multiViewImages) && multiViewImages.length > 0) {
          body.MultiViewImages = multiViewImages
            .map((v) => {
              const mv = { ViewType: v.viewType };
              if (v.imageBase64) mv.ViewImageBase64 = v.imageBase64;
              else if (v.imageUrl) mv.ViewImageUrl = v.imageUrl;
              return mv;
            })
            .filter((mv) => mv.ViewImageBase64 || mv.ViewImageUrl);
        }

        result = await tencentRequest(
          'SubmitHunyuanTo3DProJob',
          body,
          secretId,
          secretKey,
        );
      }

      res.json({
        success: true,
        jobId: result.JobId,
        requestId: result.RequestId,
        mode,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── GET /api/job/:jobId ───────────────────────────────────────────────────
  // Poll job status
  router.get('/job/:jobId', async (req, res) => {
    try {
      const { secretId, secretKey } = getCreds(req);
      const { jobId } = req.params;
      const { action = 'QueryHunyuanTo3DProJob' } = req.query;

      const result = await tencentRequest(
        action,
        { JobId: jobId },
        secretId,
        secretKey,
      );

      res.json({
        success: true,
        status: result.Status,
        errorCode: result.ErrorCode || null,
        errorMessage: result.ErrorMessage || null,
        files: result.ResultFile3Ds || [],
        requestId: result.RequestId,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── POST /api/texture-edit ────────────────────────────────────────────────
  // Apply texture (image or prompt) to existing 3D model
  router.post('/texture-edit', async (req, res) => {
    try {
      const { secretId, secretKey } = getCreds(req);
      const {
        modelUrl,
        modelType = 'GLB',
        textureImageBase64,
        textureImageUrl,
        prompt,
        enablePBR = false,
      } = req.body;

      if (!modelUrl)
        return res.status(400).json({ error: 'modelUrl is required' });
      if (!textureImageBase64 && !textureImageUrl && !prompt) {
        return res.status(400).json({
          error: 'Provide textureImageBase64, textureImageUrl, or prompt',
        });
      }

      const body = {
        File3D: { Type: modelType, Url: modelUrl },
        EnablePBR: enablePBR,
      };

      if (textureImageBase64) body.Image = { Base64: textureImageBase64 };
      else if (textureImageUrl) body.Image = { Url: textureImageUrl };
      else body.Prompt = prompt;

      const result = await tencentRequest(
        'SubmitHunyuanTo3DTextureEditJob',
        body,
        secretId,
        secretKey,
      );
      res.json({
        success: true,
        jobId: result.JobId,
        requestId: result.RequestId,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── POST /api/uv-unfold ───────────────────────────────────────────────────
  router.post('/uv-unfold', async (req, res) => {
    try {
      const { secretId, secretKey } = getCreds(req);
      const { modelUrl, modelType = 'GLB' } = req.body;

      if (!modelUrl)
        return res.status(400).json({ error: 'modelUrl is required' });

      const result = await tencentRequest(
        'SubmitHunyuanTo3DUVJob',
        {
          File: { Type: modelType, Url: modelUrl },
        },
        secretId,
        secretKey,
      );

      res.json({
        success: true,
        jobId: result.JobId,
        requestId: result.RequestId,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── POST /api/convert ─────────────────────────────────────────────────────
  router.post('/convert', async (req, res) => {
    try {
      const { secretId, secretKey } = getCreds(req);
      const { fileUrl, targetFormat } = req.body;

      if (!fileUrl || !targetFormat)
        return res
          .status(400)
          .json({ error: 'fileUrl and targetFormat are required' });

      const result = await tencentRequest(
        'Convert3DFormat',
        {
          File3D: fileUrl,
          Format: targetFormat,
        },
        secretId,
        secretKey,
      );

      res.json({
        success: true,
        resultUrl: result.ResultFile3D,
        requestId: result.RequestId,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── POST /api/part-split ──────────────────────────────────────────────────
  router.post('/part-split', async (req, res) => {
    try {
      const { secretId, secretKey } = getCreds(req);
      const { modelUrl } = req.body;

      if (!modelUrl)
        return res.status(400).json({ error: 'modelUrl (FBX) is required' });

      const result = await tencentRequest(
        'SubmitHunyuan3DPartJob',
        {
          File: { Type: 'FBX', Url: modelUrl },
        },
        secretId,
        secretKey,
      );

      res.json({
        success: true,
        jobId: result.JobId,
        requestId: result.RequestId,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── POST /api/smart-topology ────────────────────────────────────────────
  // Submit retopology job — clean up mesh, reduce poly count, fix topology
  router.post('/smart-topology', async (req, res) => {
    try {
      const { secretId, secretKey } = getCreds(req);
      const {
        modelUrl,
        modelType = 'GLB', // GLB or OBJ
        polygonType, // 'triangle' | 'quadrilateral' (tri+quad mixed)
        faceLevel, // 'high' | 'medium' | 'low'
      } = req.body;

      if (!modelUrl)
        return res
          .status(400)
          .json({ error: 'modelUrl is required (GLB or OBJ, ≤200MB)' });

      const body = {
        File3D: { Type: modelType, Url: modelUrl },
      };

      if (polygonType) body.PolygonType = polygonType;
      if (faceLevel) body.FaceLevel = faceLevel;

      const result = await tencentRequest(
        'Submit3DSmartTopologyJob',
        body,
        secretId,
        secretKey,
      );

      res.json({
        success: true,
        jobId: result.JobId,
        requestId: result.RequestId,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── GET /api/health ───────────────────────────────────────────────────────
  router.get('/health', (req, res) => {
    const { secretId } = getCredentials();
    res.json({
      status: 'ok',
      time: new Date().toISOString(),
      credentialsConfigured: !!secretId,
    });
  });

  return router;
}
