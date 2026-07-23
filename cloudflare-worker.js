const SA_EMAIL = 'firebase-adminsdk-fbsvc@msfsmm.iam.gserviceaccount.com';
const SA_JWK = {"kty":"RSA","n":"ubKeR8l1KLp5nEfQ6gXWHHzS6skXVNtmvaiQcyIoW0DIkwAgJWi4T-thW44aSch5nXXSRIY5C6bTj3N7CKObA1Nd-m_RVjJ5B79ElhHGBDmVcwFUE-oz_nC1_84dRdO5-XlOb08Rg69Qf1mDzNvdH3kVeXwIZqteP2FBxlDt8QK85NSb6gcJF4nTHpVz_XV5oUnsjhVLaicguU3yoVb7LDzaaQAwl2zknmsugQOvwviOmZWg7x7fZM3RdX9KTRgOuJOI87ZbBwgzGta6O8GdulJRODs5qdKe5LXlQ2aYAsrbJmIFoar8d8Hufiu_VbvGZdl8LNgKna0KoCdRsqE68w","e":"AQAB","d":"mvhjQ6oTLmongMS3XXFc4o3bdxTIUYjH_jYJxFTPfaE3eOPYy19icZjrb_ynPMdstsSvNYCFGtjC_r1zJrA95Aicd3XZmN7z_bn8udLSNyIgX8dgmhl-SqIy937UgV9CwpQePFhkoNxSY6vQiThg0PVymwH6ANknTisS8BJ1W3STALYpCz-fEcG0s7PRxFkXYmaYYKtSM0m5CSnJGpvTPkoVCFi1CXxvrEx6r55h35p09hEHOXxHJGz7a_O3IKNqEx0x2FPZIVGzWrRHkXmZGsOTeT8mWPPvZCwdVdQ4HBxV5PDe269HxiJAI7-87yWQ1Q7_WNCBuIAMN_3UyQPV","p":"6VQ-vl1NAsYB7JOqBWL1C7srdA4hipoPV3wqCI8AL4nyexoc64X71dNhUKATAMaZo75gHg1RrQDc0-bkkVZOQzz4TDqj_YTSsXKIOh6VxS29fnIb2YzFixtft8LxoIFgCmpx4R7Qmy2xJwuW0H8Ig1mPLPrKAmpKanMnCbqEPf8","q":"y72bD-mzfjERMxwa0sfVwt5BEtPbHzQwL48Z24sl1la_lUWk2BSMTrWdwU9R1P9MSnf7aIOM6m1ee3jFshtsyzpEYgDw1tcrsfqsO3yOVPzIuzVuUBS2HxmTtcCLwQ7YQ9jLBYL1QrKWnNajHceEh6F--uq6EoPU6MArRez_6w0","dp":"Iw-9ve1XPStz7pDh451TJUgi53WYJLOxynul9VNHu90GyujJn7qqdR8maG8la-BsBeb9moZ114FhrZXskspdSE1JImtNaTMkVfXX8qPV7aNJ7k5HURGOPbEHWR26IVxPikEki6eNwUPEcxGSwBHWvaYflaq54FMIi6ZyH0wfwxE","dq":"dg2ZSbEqlhYsVycTy8qK6-0IW7ZyIzSELyqF2xZXiEifngjKqYHOgtTtYdNqITcEp6m5_ScsgbF5q6WhN8B4W5GZigfthS8MXIZZQea8OjZ2wTMGhlRZ6s9RLWEyGV1Wpol5qenl3w3IA3zC60BuZICJKS7VPmEw_uRKrqvS5gk","qi":"uSQepIv4bN6ZwNQDyoZXATlVbIlBgt9sVKyqw711kx7AaTU_pUI3nywZ96koRw8tLSnlRiFJBjTdTPdxpjWeMJkuFe759tSGA9dYRmxhJJYxsSSmNjW6N6qqflKjily_RKvE_ERo-4-pIAEpR3WUZxe-GUwDdMYM3NCap2jmpVk"};
const PROJECT_ID = 'msfsmm';
const FIREBASE_API_KEY = 'AIzaSyCxvV0yCJIaY2T7lEIiHG4PXljvXdHqZMg';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function b64urlEncode(str) {
  const bytes = new TextEncoder().encode(str);
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function b64urlEncodeRaw(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function getAccessToken() {
  const key = await crypto.subtle.importKey('jwk', SA_JWK,
    { name: 'RSASSA-PKCS1-v1_5', hash: { name: 'SHA-256' } }, false, ['sign']);

  const now = Math.floor(Date.now() / 1000);
  const h = b64urlEncode(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const p = b64urlEncode(JSON.stringify({
    iss: SA_EMAIL,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600, iat: now,
  }));
  const input = h + '.' + p;
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(input));
  const jwt = input + '.' + b64urlEncodeRaw(new Uint8Array(sig));

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=' + jwt,
  });
  const data = await res.json();
  const token = data.access_token || data.id_token;
  if (!token) throw new Error('No token: ' + JSON.stringify(data));
  return token;
}

async function handleSmmProxy(body) {
  const { apiUrl, apiKey, action, ...rest } = body;
  if (!apiUrl || !apiKey || !action) return { success: false, error: 'Missing fields' };
  const params = new URLSearchParams({ key: apiKey, action, ...rest });
  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  const data = await res.json();
  return { success: true, data };
}

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
    try {
      const text = await request.text();
      let body;
      try { body = JSON.parse(text); } catch (e) {
        return Response.json({ success: false, error: 'Invalid JSON body', raw: text }, { status: 400, headers: CORS });
      }

      // Get user's Firebase Auth providers
      if (body.type === 'admin' && body.action === 'getUserProviders') {
        if (!body.userId) return Response.json({ success: false, error: 'Missing userId' }, { status: 400, headers: CORS });

        try {
          const token = await getAccessToken();
          const r = await fetch(
            'https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + FIREBASE_API_KEY,
            { 
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
              },
              body: JSON.stringify({ localId: [body.userId] })
            }
          );
          
          const data = await r.json();
          
          if (data.users && data.users[0]) {
            const user = data.users[0];
            const providers = user.providerUserInfo ? user.providerUserInfo.map(p => p.providerId) : [];
            return Response.json({
              success: true,
              providers: providers,
              email: user.email,
              emailVerified: user.emailVerified
            }, { headers: CORS });
          }
          
          return Response.json({ success: false, error: 'User not found' }, { status: 404, headers: CORS });
        } catch (e) {
          return Response.json({ success: false, error: e.message }, { status: 500, headers: CORS });
        }
      }

      // Update user password
      if (body.type === 'admin' && body.action === 'updatePassword') {
        if (!body.userId || !body.newPassword) return Response.json({ success: false, error: 'Missing userId or newPassword' }, { status: 400, headers: CORS });

        try {
          const token = await getAccessToken();
          const r = await fetch(
            'https://identitytoolkit.googleapis.com/v1/accounts:update?key=' + FIREBASE_API_KEY,
            { 
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
              },
              body: JSON.stringify({ 
                localId: body.userId,
                password: body.newPassword,
                returnSecureToken: false
              })
            }
          );
          const data = await r.json();
          if (data.error) {
            return Response.json({ success: false, error: data.error.message || 'Password update failed' }, { status: 400, headers: CORS });
          }
          return Response.json({ success: true, message: 'Password updated successfully' }, { headers: CORS });
        } catch (e) {
          return Response.json({ success: false, error: e.message }, { status: 500, headers: CORS });
        }
      }

      // Delete user (existing code)
      if (body.type === 'admin' && body.action === 'deleteUser') {
        if (!body.userId) return Response.json({ success: false, error: 'Missing userId' }, { status: 400, headers: CORS });

        const token = await getAccessToken();

        let authResult = { status: 0, ok: false };
        try {
          const r = await fetch(
            'https://identitytoolkit.googleapis.com/admin/v2/projects/' + PROJECT_ID + '/accounts/' + body.userId,
            { method: 'DELETE', headers: { Authorization: 'Bearer ' + token } }
          );
          authResult = { status: r.status, ok: r.ok, body: await r.text() };
        } catch (e) { authResult.error = e.message; }

        let fsResult = { status: 0, ok: false };
        try {
          const r = await fetch(
            'https://firestore.googleapis.com/v1/projects/' + PROJECT_ID + '/databases/(default)/documents/users/' + body.userId,
            { method: 'DELETE', headers: { Authorization: 'Bearer ' + token } }
          );
          fsResult = { status: r.status, ok: r.ok, body: await r.text() };
        } catch (e) { fsResult.error = e.message; }

        return Response.json({
          success: authResult.ok || fsResult.ok,
          auth: authResult, firestore: fsResult,
        }, { headers: CORS });
      }

      if (body.apiUrl) {
        return Response.json(await handleSmmProxy(body), { headers: CORS });
      }

      return Response.json({ success: false, error: 'Unknown request' }, { status: 400, headers: CORS });
    } catch (err) {
      return Response.json({ success: false, error: err.message }, { status: 500, headers: CORS });
    }
  }
};
