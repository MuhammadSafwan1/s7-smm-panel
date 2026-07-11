// Next.js API route — server-side proxy for SMM provider APIs
// This bypasses CORS since requests are made from the server, not the browser

export async function POST(request) {
  try {
    const body = await request.json();
    const { apiUrl, apiKey, action, search } = body;

    if (!apiUrl || !apiKey || !action) {
      return Response.json({ error: 'Missing apiUrl, apiKey, or action' }, { status: 400 });
    }

    // Build the request params
    const params = new URLSearchParams();
    params.append('key', apiKey);
    params.append('action', action);

    // Build URL
    const url = `${apiUrl}?${params.toString()}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      return Response.json({ error: `Provider responded with status ${res.status}` }, { status: 502 });
    }

    const data = await res.json();
    return Response.json({ success: true, data });
  } catch (err) {
    console.error('Provider proxy error:', err);
    return Response.json({ error: err.message || 'Proxy request failed' }, { status: 500 });
  }
}
