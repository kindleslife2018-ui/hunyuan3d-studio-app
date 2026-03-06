/**
 * Tencent Cloud API v3 Signature Utility
 * Implements TC3-HMAC-SHA256 signing algorithm
 */
import crypto from 'crypto';
import https from 'https';

const HOST = 'hunyuan.intl.tencentcloudapi.com';
const SERVICE = 'hunyuan'; // Signing service derived from hostname — must stay 'hunyuan'
const ALGORITHM = 'TC3-HMAC-SHA256';
const REGION = 'ap-singapore';
const VERSION = '2023-09-01'; // Version for the hunyuan service endpoint

function hmacSHA256(key, data) {
  return crypto.createHmac('sha256', key).update(data).digest();
}

function sha256Hex(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function buildAuthorizationHeader(action, bodyObj, secretId, secretKey) {
  const timestamp = Math.floor(Date.now() / 1000);
  const date = new Date(timestamp * 1000).toISOString().slice(0, 10);
  const payload = JSON.stringify(bodyObj);

  // Step 1: Canonical request
  const hashedPayload = sha256Hex(payload);
  const canonicalHeaders = `content-type:application/json\nhost:${HOST}\nx-tc-action:${action.toLowerCase()}\n`;
  const signedHeaders = 'content-type;host;x-tc-action';
  const canonicalRequest = [
    'POST',
    '/',
    '',
    canonicalHeaders,
    signedHeaders,
    hashedPayload,
  ].join('\n');

  // Step 2: String to sign
  const credentialScope = `${date}/${SERVICE}/tc3_request`;
  const stringToSign = [
    ALGORITHM,
    timestamp,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join('\n');

  // Step 3: Signing key
  const secretDate = hmacSHA256(`TC3${secretKey}`, date);
  const secretService = hmacSHA256(secretDate, SERVICE);
  const secretSigning = hmacSHA256(secretService, 'tc3_request');
  const signature = crypto
    .createHmac('sha256', secretSigning)
    .update(stringToSign)
    .digest('hex');

  // Step 4: Authorization header
  const authorization = `${ALGORITHM} Credential=${secretId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return {
    'Content-Type': 'application/json',
    Host: HOST,
    'X-TC-Action': action,
    'X-TC-Version': VERSION,
    'X-TC-Region': REGION,
    'X-TC-Timestamp': String(timestamp),
    Authorization: authorization,
  };
}

/**
 * Make a signed request to Tencent Cloud Hunyuan API
 */
export function tencentRequest(action, body, secretId, secretKey) {
  return new Promise((resolve, reject) => {
    // Region belongs in the X-TC-Region header (set by buildAuthorizationHeader),
    // NOT in the JSON body. Including it in the body can cause API errors.
    const payload = JSON.stringify(body);
    const headers = buildAuthorizationHeader(action, body, secretId, secretKey);

    // ── Trace: log full request details ──────────────────────────────────
    const maskedId = secretId.slice(0, 8) + '***' + secretId.slice(-4);
    console.log('\n┌─── TENCENT API REQUEST ───────────────────────────────');
    console.log('│ Action:      ', headers['X-TC-Action']);
    console.log('│ Version:     ', headers['X-TC-Version']);
    console.log('│ Region:      ', headers['X-TC-Region']);
    console.log('│ Timestamp:   ', headers['X-TC-Timestamp']);
    console.log('│ Host:        ', headers['Host']);
    console.log('│ SecretId:    ', maskedId);
    console.log('│ Content-Type:', headers['Content-Type']);
    console.log(
      '│ Authorization:',
      headers['Authorization'].slice(0, 80) + '…',
    );
    console.log(
      '│ Body:        ',
      payload.length > 500 ? payload.slice(0, 500) + '…(truncated)' : payload,
    );
    console.log('└──────────────────────────────────────────────────────\n');

    const options = {
      hostname: HOST,
      path: '/',
      method: 'POST',
      headers: { ...headers, 'Content-Length': Buffer.byteLength(payload) },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);

          // ── Trace: log full response ─────────────────────────────────
          const status = parsed.Response?.Error ? 'ERROR' : 'OK';
          console.log(
            '\n┌─── TENCENT API RESPONSE (' +
              status +
              ') ────────────────────────',
          );
          console.log('│ HTTP Status: ', res.statusCode);
          console.log('│ RequestId:   ', parsed.Response?.RequestId || 'N/A');
          if (parsed.Response?.Error) {
            console.log('│ Error Code:  ', parsed.Response.Error.Code);
            console.log('│ Error Msg:   ', parsed.Response.Error.Message);
          } else {
            console.log(
              '│ Response:    ',
              JSON.stringify(parsed.Response).slice(0, 300),
            );
          }
          console.log(
            '└──────────────────────────────────────────────────────\n',
          );

          // Tencent API wraps response in { Response: { ... } }
          if (parsed.Response?.Error) {
            reject(
              new Error(
                `[${parsed.Response.Error.Code}] ${parsed.Response.Error.Message}`,
              ),
            );
          } else {
            resolve(parsed.Response || parsed);
          }
        } catch (e) {
          reject(new Error(`Failed to parse response: ${data.slice(0, 200)}`));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy(new Error('Request timeout'));
    });
    req.write(payload);
    req.end();
  });
}
