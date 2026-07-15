export default {
  async fetch(request) {
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle OPTIONS preflight request
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: cors });
    }

    try {
      // Parse request body
      let body;
      try {
        body = await request.json();
      } catch (e) {
        return Response.json(
          { success: false, error: 'Invalid JSON in request body' },
          { status: 400, headers: cors }
        );
      }

      const { apiUrl, apiKey, action, ...rest } = body;

      // Validate required fields
      if (!apiUrl || !apiKey || !action) {
        return Response.json(
          { success: false, error: 'Missing required fields: apiUrl, apiKey, or action' },
          { status: 400, headers: cors }
        );
      }

      console.log(`[Proxy] ${action} request to ${apiUrl}`);

      // Build form data
      const params = new URLSearchParams({ key: apiKey, action, ...rest });

      // Make request to provider API
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: params.toString(),
        signal: AbortSignal.timeout(25000), // 25 second timeout
      });

      console.log(`[Proxy] Response status: ${res.status}`);

      // Check if response is OK
      if (!res.ok) {
        const errorText = await res.text();
        console.error(`[Proxy] Provider error: ${errorText}`);
        return Response.json(
          { 
            success: false, 
            error: `Provider API error (${res.status}): ${errorText.substring(0, 200)}` 
          },
          { status: 502, headers: cors }
        );
      }

      // Parse response
      const contentType = res.headers.get('content-type');
      let data;

      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        // Try parsing as JSON anyway
        const text = await res.text();
        try {
          data = JSON.parse(text);
        } catch (e) {
          console.error(`[Proxy] Invalid JSON from provider: ${text.substring(0, 200)}`);
          return Response.json(
            { 
              success: false, 
              error: 'Provider returned invalid JSON response',
              rawResponse: text.substring(0, 200)
            },
            { status: 502, headers: cors }
          );
        }
      }

      // Check for provider-level errors
      if (data && data.error) {
        console.warn(`[Proxy] Provider returned error: ${data.error}`);
        return Response.json(
          { success: false, error: `Provider error: ${data.error}` },
          { status: 200, headers: cors }
        );
      }

      console.log(`[Proxy] Success - returning data`);
      return Response.json({ success: true, data }, { headers: cors });

    } catch (e) {
      console.error(`[Proxy] Exception: ${e.message}`);
      
      let errorMessage = e.message;
      
      // Provide better error messages
      if (e.name === 'TimeoutError') {
        errorMessage = 'Provider API request timeout (>25s). The provider might be slow or down.';
      } else if (errorMessage.includes('fetch')) {
        errorMessage = 'Cannot connect to provider API. The API URL might be incorrect or unreachable.';
      }

      return Response.json(
        { success: false, error: errorMessage },
        { status: 500, headers: cors }
      );
    }
  }
};
