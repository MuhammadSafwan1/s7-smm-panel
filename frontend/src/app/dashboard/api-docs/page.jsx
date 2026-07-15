'use client';

import { useState } from 'react';
import { FiCode, FiCopy, FiCheck } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function ApiDocsPage() {
  const [copiedEndpoint, setCopiedEndpoint] = useState('');

  const copyToClipboard = (text, endpoint) => {
    navigator.clipboard.writeText(text);
    setCopiedEndpoint(endpoint);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedEndpoint(''), 2000);
  };

  const endpoints = [
    {
      method: 'GET',
      path: '/api/v1/services',
      description: 'Get list of all available services',
      auth: true,
      params: [
        { name: 'platform', type: 'string', required: false, description: 'Filter by platform ID' },
        { name: 'category', type: 'string', required: false, description: 'Filter by category ID' },
      ],
      response: `{
  "success": true,
  "data": [
    {
      "id": "service123",
      "name": "Instagram Followers",
      "platform": "instagram",
      "category": "followers",
      "price": 2.50,
      "min": 100,
      "max": 10000,
      "description": "High quality Instagram followers"
    }
  ]
}`
    },
    {
      method: 'GET',
      path: '/api/v1/balance',
      description: 'Get your account balance',
      auth: true,
      params: [],
      response: `{
  "success": true,
  "data": {
    "balance": 150.75,
    "currency": "PKR"
  }
}`
    },
    {
      method: 'POST',
      path: '/api/v1/order',
      description: 'Place a new order',
      auth: true,
      body: {
        serviceId: 'service123',
        link: 'https://instagram.com/username',
        quantity: 1000
      },
      response: `{
  "success": true,
  "data": {
    "orderId": "order123",
    "status": "pending",
    "charge": 25.00
  }
}`
    },
    {
      method: 'GET',
      path: '/api/v1/order/:orderId',
      description: 'Check order status',
      auth: true,
      params: [
        { name: 'orderId', type: 'string', required: true, description: 'Order ID to check' },
      ],
      response: `{
  "success": true,
  "data": {
    "orderId": "order123",
    "status": "completed",
    "startCount": 1000,
    "remains": 0
  }
}`
    }
  ];

  return (
    <div className="min-h-screen px-4 py-12">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-20 h-20 rounded-2xl gradient-bg flex items-center justify-center mx-auto mb-6">
            <FiCode className="text-4xl text-white" />
          </div>
          <h1 className="text-4xl font-bold text-dark-900 dark:text-white mb-4">
            API Documentation
          </h1>
          <p className="text-lg text-dark-600 dark:text-dark-400">
            Integrate MSF SMM services into your application
          </p>
        </div>

        {/* Getting Started */}
        <div className="glass-card p-8 mb-8">
          <h2 className="text-2xl font-bold text-dark-900 dark:text-white mb-4">
            🚀 Getting Started
          </h2>
          <div className="space-y-4 text-dark-700 dark:text-dark-300">
            <p>
              To use the MSF SMM API, you need an API key. Generate one from your{' '}
              <a href="/dashboard/settings" className="text-primary-500 hover:text-primary-600 underline">
                Settings page
              </a>.
            </p>
            <div className="p-4 rounded-xl bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20">
              <p className="text-sm text-yellow-900 dark:text-yellow-300 font-medium">
                ⚠️ Keep your API key secret! Do not share it or commit it to version control.
              </p>
            </div>
          </div>
        </div>

        {/* Authentication */}
        <div className="glass-card p-8 mb-8">
          <h2 className="text-2xl font-bold text-dark-900 dark:text-white mb-4">
            🔐 Authentication
          </h2>
          <p className="text-dark-700 dark:text-dark-300 mb-4">
            Include your API key in the request header:
          </p>
          <div className="relative">
            <pre className="p-4 rounded-xl bg-dark-900 text-green-400 overflow-x-auto text-sm">
              <code>X-API-Key: msfsmm_your_api_key_here</code>
            </pre>
            <button
              onClick={() => copyToClipboard('X-API-Key: msfsmm_your_api_key_here', 'auth')}
              className="absolute top-3 right-3 p-2 rounded-lg bg-dark-800 hover:bg-dark-700 text-white transition-colors"
            >
              {copiedEndpoint === 'auth' ? <FiCheck /> : <FiCopy />}
            </button>
          </div>
        </div>

        {/* Base URL */}
        <div className="glass-card p-8 mb-8">
          <h2 className="text-2xl font-bold text-dark-900 dark:text-white mb-4">
            🌐 Base URL
          </h2>
          <div className="relative">
            <pre className="p-4 rounded-xl bg-dark-900 text-cyan-400 overflow-x-auto text-sm">
              <code>https://your-backend-url.com</code>
            </pre>
            <button
              onClick={() => copyToClipboard('https://your-backend-url.com', 'baseurl')}
              className="absolute top-3 right-3 p-2 rounded-lg bg-dark-800 hover:bg-dark-700 text-white transition-colors"
            >
              {copiedEndpoint === 'baseurl' ? <FiCheck /> : <FiCopy />}
            </button>
          </div>
        </div>

        {/* Endpoints */}
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-dark-900 dark:text-white mb-6">
            📡 API Endpoints
          </h2>

          {endpoints.map((endpoint, index) => (
            <div key={index} className="glass-card p-8">
              {/* Method and Path */}
              <div className="flex items-center gap-4 mb-4">
                <span className={`px-3 py-1 rounded-lg font-bold text-sm ${
                  endpoint.method === 'GET' 
                    ? 'bg-green-500 text-white' 
                    : 'bg-blue-500 text-white'
                }`}>
                  {endpoint.method}
                </span>
                <code className="text-lg font-mono text-dark-900 dark:text-white">
                  {endpoint.path}
                </code>
                {endpoint.auth && (
                  <span className="px-2 py-1 rounded bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 text-xs font-medium">
                    🔐 Auth Required
                  </span>
                )}
              </div>

              {/* Description */}
              <p className="text-dark-700 dark:text-dark-300 mb-6">
                {endpoint.description}
              </p>

              {/* Parameters */}
              {endpoint.params && endpoint.params.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-bold text-dark-900 dark:text-white mb-3">
                    Parameters
                  </h4>
                  <div className="space-y-2">
                    {endpoint.params.map((param, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-dark-50 dark:bg-dark-800">
                        <code className="text-sm font-mono text-primary-500">{param.name}</code>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          param.required 
                            ? 'bg-red-500/20 text-red-700 dark:text-red-400' 
                            : 'bg-gray-500/20 text-gray-700 dark:text-gray-400'
                        }`}>
                          {param.required ? 'required' : 'optional'}
                        </span>
                        <span className="text-sm text-dark-600 dark:text-dark-400">
                          {param.type} - {param.description}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Request Body */}
              {endpoint.body && (
                <div className="mb-6">
                  <h4 className="text-sm font-bold text-dark-900 dark:text-white mb-3">
                    Request Body
                  </h4>
                  <div className="relative">
                    <pre className="p-4 rounded-xl bg-dark-900 text-cyan-400 overflow-x-auto text-sm">
                      <code>{JSON.stringify(endpoint.body, null, 2)}</code>
                    </pre>
                    <button
                      onClick={() => copyToClipboard(JSON.stringify(endpoint.body, null, 2), `body-${index}`)}
                      className="absolute top-3 right-3 p-2 rounded-lg bg-dark-800 hover:bg-dark-700 text-white transition-colors"
                    >
                      {copiedEndpoint === `body-${index}` ? <FiCheck /> : <FiCopy />}
                    </button>
                  </div>
                </div>
              )}

              {/* Response */}
              <div>
                <h4 className="text-sm font-bold text-dark-900 dark:text-white mb-3">
                  Response
                </h4>
                <div className="relative">
                  <pre className="p-4 rounded-xl bg-dark-900 text-green-400 overflow-x-auto text-sm">
                    <code>{endpoint.response}</code>
                  </pre>
                  <button
                    onClick={() => copyToClipboard(endpoint.response, `response-${index}`)}
                    className="absolute top-3 right-3 p-2 rounded-lg bg-dark-800 hover:bg-dark-700 text-white transition-colors"
                  >
                    {copiedEndpoint === `response-${index}` ? <FiCheck /> : <FiCopy />}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Example Code */}
        <div className="glass-card p-8 mt-8">
          <h2 className="text-2xl font-bold text-dark-900 dark:text-white mb-4">
            💻 Example Code
          </h2>
          <div className="space-y-6">
            {/* JavaScript Example */}
            <div>
              <h3 className="text-lg font-semibold text-dark-900 dark:text-white mb-3">
                JavaScript (Node.js)
              </h3>
              <div className="relative">
                <pre className="p-4 rounded-xl bg-dark-900 text-purple-400 overflow-x-auto text-sm">
                  <code>{`const axios = require('axios');

const apiKey = 'msfsmm_your_api_key_here';
const baseURL = 'https://your-backend-url.com';

// Get services
axios.get(\`\${baseURL}/api/v1/services\`, {
  headers: { 'X-API-Key': apiKey }
})
.then(response => console.log(response.data))
.catch(error => console.error(error));

// Place order
axios.post(\`\${baseURL}/api/v1/order\`, {
  serviceId: 'service123',
  link: 'https://instagram.com/username',
  quantity: 1000
}, {
  headers: { 'X-API-Key': apiKey }
})
.then(response => console.log(response.data))
.catch(error => console.error(error));`}</code>
                </pre>
                <button
                  onClick={() => copyToClipboard(`const axios = require('axios');\n\nconst apiKey = 'msfsmm_your_api_key_here';\nconst baseURL = 'https://your-backend-url.com';\n\n// Get services\naxios.get(\`\${baseURL}/api/v1/services\`, {\n  headers: { 'X-API-Key': apiKey }\n})\n.then(response => console.log(response.data))\n.catch(error => console.error(error));\n\n// Place order\naxios.post(\`\${baseURL}/api/v1/order\`, {\n  serviceId: 'service123',\n  link: 'https://instagram.com/username',\n  quantity: 1000\n}, {\n  headers: { 'X-API-Key': apiKey }\n})\n.then(response => console.log(response.data))\n.catch(error => console.error(error));`, 'example-js')}
                  className="absolute top-3 right-3 p-2 rounded-lg bg-dark-800 hover:bg-dark-700 text-white transition-colors"
                >
                  {copiedEndpoint === 'example-js' ? <FiCheck /> : <FiCopy />}
                </button>
              </div>
            </div>

            {/* Python Example */}
            <div>
              <h3 className="text-lg font-semibold text-dark-900 dark:text-white mb-3">
                Python
              </h3>
              <div className="relative">
                <pre className="p-4 rounded-xl bg-dark-900 text-yellow-400 overflow-x-auto text-sm">
                  <code>{`import requests

api_key = 'msfsmm_your_api_key_here'
base_url = 'https://your-backend-url.com'
headers = {'X-API-Key': api_key}

# Get services
response = requests.get(f'{base_url}/api/v1/services', headers=headers)
print(response.json())

# Place order
data = {
    'serviceId': 'service123',
    'link': 'https://instagram.com/username',
    'quantity': 1000
}
response = requests.post(f'{base_url}/api/v1/order', json=data, headers=headers)
print(response.json())`}</code>
                </pre>
                <button
                  onClick={() => copyToClipboard(`import requests\n\napi_key = 'msfsmm_your_api_key_here'\nbase_url = 'https://your-backend-url.com'\nheaders = {'X-API-Key': api_key}\n\n# Get services\nresponse = requests.get(f'{base_url}/api/v1/services', headers=headers)\nprint(response.json())\n\n# Place order\ndata = {\n    'serviceId': 'service123',\n    'link': 'https://instagram.com/username',\n    'quantity': 1000\n}\nresponse = requests.post(f'{base_url}/api/v1/order', json=data, headers=headers)\nprint(response.json())`, 'example-py')}
                  className="absolute top-3 right-3 p-2 rounded-lg bg-dark-800 hover:bg-dark-700 text-white transition-colors"
                >
                  {copiedEndpoint === 'example-py' ? <FiCheck /> : <FiCopy />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Support */}
        <div className="glass-card p-8 mt-8">
          <h2 className="text-2xl font-bold text-dark-900 dark:text-white mb-4">
            💬 Need Help?
          </h2>
          <p className="text-dark-700 dark:text-dark-300 mb-4">
            If you have questions or need assistance with the API, please contact our support team.
          </p>
          <a
            href="/help"
            className="btn-primary inline-block"
          >
            Contact Support
          </a>
        </div>
      </div>
    </div>
  );
}
