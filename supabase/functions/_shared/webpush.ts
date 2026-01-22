// Native Web Push implementation for Deno Edge Functions
// Implements RFC 8291 (Message Encryption) and RFC 8292 (VAPID)

function base64UrlEncode(data: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...data));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64UrlDecode(str: string): Uint8Array {
  // Add padding if needed
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Helper to convert Uint8Array to ArrayBuffer for crypto APIs
function toBuffer(arr: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(arr.length);
  new Uint8Array(buffer).set(arr);
  return buffer;
}

async function createVapidJwt(
  endpoint: string,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<string> {
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;
  
  const header = {
    typ: 'JWT',
    alg: 'ES256',
  };
  
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 12 * 60 * 60, // 12 hours
    sub: 'mailto:notifications@us-better.lovable.app',
  };
  
  const headerB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;
  
  // Import the private key for signing
  const privateKeyBytes = base64UrlDecode(vapidPrivateKey);
  
  // Create the full key by combining with public key for ECDSA
  const publicKeyBytes = base64UrlDecode(vapidPublicKey);
  
  // Build JWK for the private key
  const jwk = {
    kty: 'EC',
    crv: 'P-256',
    x: base64UrlEncode(publicKeyBytes.slice(1, 33)),
    y: base64UrlEncode(publicKeyBytes.slice(33, 65)),
    d: base64UrlEncode(privateKeyBytes),
  };
  
  const key = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    new TextEncoder().encode(unsignedToken)
  );
  
  // Convert DER signature to raw format (r || s)
  const signatureBytes = new Uint8Array(signature);
  const signatureB64 = base64UrlEncode(signatureBytes);
  
  return `${unsignedToken}.${signatureB64}`;
}

async function hkdf(
  salt: Uint8Array,
  ikm: Uint8Array,
  info: Uint8Array,
  length: number
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    toBuffer(ikm),
    { name: 'HKDF' },
    false,
    ['deriveBits']
  );
  
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: toBuffer(salt),
      info: toBuffer(info),
    },
    key,
    length * 8
  );
  
  return new Uint8Array(bits);
}

function concat(...arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

async function encryptPayload(
  payload: string,
  p256dh: string,
  auth: string
): Promise<{ ciphertext: Uint8Array; salt: Uint8Array; publicKey: Uint8Array }> {
  // Generate ephemeral key pair
  const keyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );
  
  // Export the public key
  const publicKeyBuffer = await crypto.subtle.exportKey('raw', keyPair.publicKey);
  const localPublicKey = new Uint8Array(publicKeyBuffer);
  
  // Import the client's public key
  const clientPublicKeyBytes = base64UrlDecode(p256dh);
  const clientPublicKey = await crypto.subtle.importKey(
    'raw',
    toBuffer(clientPublicKeyBytes),
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );
  
  // Derive shared secret using ECDH
  const sharedSecretBuffer = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: clientPublicKey },
    keyPair.privateKey,
    256
  );
  const sharedSecret = new Uint8Array(sharedSecretBuffer);
  
  // Get auth secret
  const authSecret = base64UrlDecode(auth);
  
  // Generate random salt
  const salt = crypto.getRandomValues(new Uint8Array(16));
  
  // Build info strings for HKDF
  const encoder = new TextEncoder();
  
  // IKM = HKDF(auth_secret, ecdh_secret, "WebPush: info" || 0x00 || client_public_key || server_public_key)
  const keyInfoPrefix = encoder.encode('WebPush: info\0');
  const keyInfo = concat(keyInfoPrefix, clientPublicKeyBytes, localPublicKey);
  const ikm = await hkdf(authSecret, sharedSecret, keyInfo, 32);
  
  // Derive content encryption key: HKDF(salt, ikm, "Content-Encoding: aes128gcm\0", 16)
  const cekInfo = encoder.encode('Content-Encoding: aes128gcm\0');
  const contentEncryptionKey = await hkdf(salt, ikm, cekInfo, 16);
  
  // Derive nonce: HKDF(salt, ikm, "Content-Encoding: nonce\0", 12)
  const nonceInfo = encoder.encode('Content-Encoding: nonce\0');
  const nonce = await hkdf(salt, ikm, nonceInfo, 12);
  
  // Encrypt the payload
  const payloadBytes = encoder.encode(payload);
  // Add padding delimiter (0x02 for final record)
  const paddedPayload = concat(payloadBytes, new Uint8Array([2]));
  
  const key = await crypto.subtle.importKey(
    'raw',
    toBuffer(contentEncryptionKey),
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );
  
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: toBuffer(nonce) },
    key,
    toBuffer(paddedPayload)
  );
  
  return {
    ciphertext: new Uint8Array(encrypted),
    salt,
    publicKey: localPublicKey,
  };
}

function buildAes128GcmBody(
  salt: Uint8Array,
  publicKey: Uint8Array,
  ciphertext: Uint8Array
): Uint8Array {
  // aes128gcm format:
  // salt (16 bytes) || rs (4 bytes, big endian) || keyid_len (1 byte) || keyid || ciphertext
  const rs = new Uint8Array([0, 0, 16, 0]); // record size = 4096
  const keyIdLen = new Uint8Array([publicKey.length]);
  
  return concat(salt, rs, keyIdLen, publicKey, ciphertext);
}

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface PushResult {
  success: boolean;
  statusCode?: number;
  error?: string;
}

export async function sendPushNotification(
  subscription: PushSubscription,
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<PushResult> {
  try {
    // Create VAPID JWT
    const jwt = await createVapidJwt(subscription.endpoint, vapidPublicKey, vapidPrivateKey);
    
    // Encrypt the payload
    const { ciphertext, salt, publicKey } = await encryptPayload(
      payload,
      subscription.keys.p256dh,
      subscription.keys.auth
    );
    
    // Build the body
    const body = buildAes128GcmBody(salt, publicKey, ciphertext);
    
    // Build Authorization header
    const vapidPublicKeyB64 = vapidPublicKey;
    const authorization = `vapid t=${jwt}, k=${vapidPublicKeyB64}`;
    
    // Send the request
    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': authorization,
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'TTL': '86400',
        'Urgency': 'normal',
      },
      body: toBuffer(body),
    });
    
    if (response.ok || response.status === 201) {
      return { success: true, statusCode: response.status };
    }
    
    const errorText = await response.text();
    return {
      success: false,
      statusCode: response.status,
      error: errorText,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
