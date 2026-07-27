// Server-only helper: mints Google OAuth token from Firebase service account
// and sends FCM HTTP v1 messages. Uses Web Crypto — Cloudflare Worker friendly.

type ServiceAccount = {
  client_email: string;
  private_key: string;
  project_id: string;
  token_uri: string;
};

function b64url(input: ArrayBuffer | Uint8Array | string): string {
  let bytes: Uint8Array;
  if (typeof input === "string") bytes = new TextEncoder().encode(input);
  else if (input instanceof Uint8Array) bytes = input;
  else bytes = new Uint8Array(input);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function pemToPkcs8(pem: string): ArrayBuffer {
  const clean = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const bin = atob(clean);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

let cachedToken: { token: string; expiresAt: number } | null = null;
let cachedSa: ServiceAccount | null = null;

function loadServiceAccount(): ServiceAccount {
  if (cachedSa) return cachedSa;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT não configurada");
  const sa = JSON.parse(raw) as ServiceAccount;
  cachedSa = sa;
  return sa;
}

async function getAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.expiresAt - 60 > now) return cachedToken.token;

  const sa = loadServiceAccount();
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: sa.token_uri,
    iat: now,
    exp: now + 3600,
  };
  const unsigned = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claim))}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToPkcs8(sa.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned));
  const jwt = `${unsigned}.${b64url(sig)}`;

  const res = await fetch(sa.token_uri, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!res.ok) throw new Error(`OAuth Firebase falhou: ${res.status} ${await res.text()}`);
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { token: json.access_token, expiresAt: now + json.expires_in };
  return json.access_token;
}

export type FcmPayload = {
  token: string;
  title: string;
  body: string;
  link?: string;
  imageUrl?: string;
  data?: Record<string, string>;
};

export async function sendFcmMessage(payload: FcmPayload): Promise<{ ok: boolean; error?: string }> {
  const sa = loadServiceAccount();
  const token = await getAccessToken();
  const message = {
    message: {
      token: payload.token,
      android: {
        priority: "HIGH" as const,
        ttl: "86400s",
      },
      apns: {
        headers: {
          "apns-priority": "10",
          "apns-push-type": "background",
        },
        payload: { aps: { "content-available": 1 } },
      },
      webpush: {
        headers: {
          Urgency: "high",
          TTL: "86400",
        },
        fcm_options: payload.link ? { link: payload.link } : undefined,
      },
      data: {
        ...(payload.data ?? {}),
        title: payload.title,
        body: payload.body,
        ...(payload.link ? { link: payload.link } : {}),
        ...(payload.imageUrl ? { image: payload.imageUrl } : {}),
      },
    },
  };
  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(message),
    },
  );
  if (res.ok) return { ok: true };
  const text = await res.text();
  return { ok: false, error: `${res.status} ${text}` };
}