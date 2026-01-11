'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Endpoint {
  method: 'GET' | 'POST' | 'DELETE';
  path: string;
  description: string;
  auth: 'bearer' | 'session';
  params?: { name: string; type: string; required: boolean; description: string }[];
  queryParams?: { name: string; type: string; required: boolean; description: string }[];
  requestBody?: { example: object; description: string };
  response: { example: object; description: string };
}

const endpoints: Endpoint[] = [
  {
    method: 'GET',
    path: '/api/v1/wallets',
    description: 'List all wallets for the authenticated user',
    auth: 'bearer',
    queryParams: [
      { name: 'page', type: 'integer', required: false, description: 'Page number (default: 1)' },
      { name: 'per_page', type: 'integer', required: false, description: 'Items per page (default: 100, max: 100)' },
      { name: 'network', type: 'string', required: false, description: 'Filter by network (bitcoin, ethereum)' },
    ],
    response: {
      description: 'List of wallets with balance and sync status',
      example: {
        data: [
          {
            id: 'uuid-1234',
            name: 'Cold Storage',
            type: 'single_sig',
            network: 'bitcoin',
            balance: '1.23456789',
            balance_usd: 98765.43,
            address_count: 5,
            last_synced_at: '2026-01-11T12:00:00Z',
            created_at: '2025-06-15T10:30:00Z',
          },
        ],
        meta: {
          total: 5,
          page: 1,
          per_page: 100,
          total_pages: 1,
        },
        rate_limit: {
          remaining: 995,
          limit: 1000,
          reset: '2026-01-12T00:00:00Z',
        },
      },
    },
  },
  {
    method: 'GET',
    path: '/api/v1/wallets/:id',
    description: 'Get details for a specific wallet',
    auth: 'bearer',
    params: [{ name: 'id', type: 'uuid', required: true, description: 'Wallet ID' }],
    response: {
      description: 'Wallet details including addresses',
      example: {
        data: {
          id: 'uuid-1234',
          name: 'Cold Storage',
          type: 'single_sig',
          network: 'bitcoin',
          balance: '1.23456789',
          balance_usd: 98765.43,
          addresses: [
            { address: 'bc1q...', label: 'Main', balance: '1.0' },
          ],
          last_synced_at: '2026-01-11T12:00:00Z',
        },
      },
    },
  },
  {
    method: 'GET',
    path: '/api/v1/transactions',
    description: 'List transactions with optional filters',
    auth: 'bearer',
    queryParams: [
      { name: 'wallet_id', type: 'uuid', required: false, description: 'Filter by wallet' },
      { name: 'category', type: 'string', required: false, description: 'Filter by category (receive, send, internal)' },
      { name: 'start_date', type: 'ISO date', required: false, description: 'Start date filter' },
      { name: 'end_date', type: 'ISO date', required: false, description: 'End date filter' },
      { name: 'network', type: 'string', required: false, description: 'Filter by network' },
      { name: 'page', type: 'integer', required: false, description: 'Page number' },
      { name: 'per_page', type: 'integer', required: false, description: 'Items per page (max 100)' },
    ],
    response: {
      description: 'Paginated list of transactions',
      example: {
        data: [
          {
            id: 'uuid-5678',
            txid: 'abc123def456...',
            wallet_id: 'uuid-1234',
            wallet_name: 'Cold Storage',
            category: 'receive',
            amount: '0.5',
            amount_usd: 45000.0,
            fee: '0.00001',
            fee_usd: 0.95,
            block_height: 850000,
            block_timestamp: '2026-01-10T15:30:00Z',
            confirmations: 6,
            is_internal_transfer: false,
          },
        ],
        meta: { total: 150, page: 1, per_page: 100, total_pages: 2 },
      },
    },
  },
  {
    method: 'GET',
    path: '/api/v1/tax-lots',
    description: 'List tax lots with disposal status and cost basis',
    auth: 'bearer',
    queryParams: [
      { name: 'wallet_id', type: 'uuid', required: false, description: 'Filter by wallet' },
      { name: 'asset', type: 'string', required: false, description: 'Filter by asset (BTC, ETH)' },
      { name: 'is_disposed', type: 'boolean', required: false, description: 'Filter by disposal status' },
      { name: 'year', type: 'integer', required: false, description: 'Filter by acquisition year' },
      { name: 'page', type: 'integer', required: false, description: 'Page number' },
      { name: 'per_page', type: 'integer', required: false, description: 'Items per page (max 100)' },
    ],
    response: {
      description: 'Tax lots with cost basis and gain/loss information',
      example: {
        data: [
          {
            id: 'uuid-lot-1',
            wallet_id: 'uuid-1234',
            wallet_name: 'Cold Storage',
            asset: 'BTC',
            amount: '0.5',
            acquisition_date: '2024-01-15',
            acquisition_price_usd: 42000.0,
            cost_basis_usd: 21000.0,
            acquisition_type: 'purchase',
            is_disposed: true,
            disposal_date: '2025-06-20',
            disposal_price_usd: 65000.0,
            proceeds_usd: 32500.0,
            gain_loss_usd: 11500.0,
            is_long_term: true,
          },
        ],
        meta: { total: 45, page: 1, per_page: 100, total_pages: 1 },
      },
    },
  },
  {
    method: 'GET',
    path: '/api/v1/tax/summary',
    description: 'Get tax summary for a specific year',
    auth: 'bearer',
    queryParams: [
      { name: 'year', type: 'integer', required: true, description: 'Tax year (2009-current)' },
      { name: 'method', type: 'string', required: false, description: 'Cost basis method: FIFO, LIFO, or HIFO (default: FIFO)' },
    ],
    response: {
      description: 'Tax summary with short-term/long-term breakdown',
      example: {
        data: {
          year: 2025,
          method: 'FIFO',
          short_term: {
            proceeds: 50000.0,
            cost_basis: 45000.0,
            gain_loss: 5000.0,
            transaction_count: 12,
          },
          long_term: {
            proceeds: 100000.0,
            cost_basis: 40000.0,
            gain_loss: 60000.0,
            transaction_count: 8,
          },
          income: {
            total: 5000.0,
            by_type: {
              mining: 3000.0,
              interest: 2000.0,
            },
          },
          fees_paid: 150.25,
          total_gain_loss: 65000.0,
          total_disposals: 20,
        },
      },
    },
  },
  {
    method: 'GET',
    path: '/api/v1/keys',
    description: 'List your API keys (session auth only)',
    auth: 'session',
    response: {
      description: 'List of API keys with metadata',
      example: {
        data: [
          {
            id: 'uuid-key-1',
            name: 'Production Integration',
            key_prefix: 'sct_live',
            scopes: ['read'],
            rate_limit_daily: 1000,
            last_used_at: '2026-01-11T10:00:00Z',
            created_at: '2025-12-01T09:00:00Z',
          },
        ],
      },
    },
  },
  {
    method: 'POST',
    path: '/api/v1/keys',
    description: 'Create a new API key (session auth only)',
    auth: 'session',
    requestBody: {
      description: 'API key configuration',
      example: {
        name: 'Production Integration',
        scopes: ['read'],
      },
    },
    response: {
      description: 'Created API key (shown only once)',
      example: {
        data: {
          id: 'uuid-key-new',
          key: 'sct_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
          name: 'Production Integration',
          message: 'Save this key securely. It will not be shown again.',
        },
      },
    },
  },
  {
    method: 'DELETE',
    path: '/api/v1/keys/:id',
    description: 'Revoke an API key (session auth only)',
    auth: 'session',
    params: [{ name: 'id', type: 'uuid', required: true, description: 'API key ID' }],
    response: {
      description: 'Confirmation of revocation',
      example: {
        data: {
          id: 'uuid-key-1',
          revoked: true,
          message: 'API key has been revoked',
        },
      },
    },
  },
];

const errorCodes = [
  { code: 400, name: 'Bad Request', description: 'Invalid request parameters or body' },
  { code: 401, name: 'Unauthorized', description: 'Missing or invalid API key' },
  { code: 403, name: 'Forbidden', description: 'API access requires Advisor tier subscription' },
  { code: 404, name: 'Not Found', description: 'Resource not found' },
  { code: 429, name: 'Too Many Requests', description: 'Rate limit exceeded' },
  { code: 500, name: 'Internal Server Error', description: 'Server error - contact support with request ID' },
];

export default function ApiDocsPage() {
  const [selectedEndpoint, setSelectedEndpoint] = useState<Endpoint | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'endpoints' | 'errors'>('overview');

  const generateCurl = (endpoint: Endpoint) => {
    const key = apiKey || 'YOUR_API_KEY';
    let curl = `curl -X ${endpoint.method}`;

    if (endpoint.auth === 'bearer') {
      curl += ` \\\n  -H "Authorization: Bearer ${key}"`;
    }

    curl += ` \\\n  -H "Content-Type: application/json"`;

    let path = endpoint.path;
    if (endpoint.params) {
      endpoint.params.forEach((p) => {
        path = path.replace(`:${p.name}`, `{${p.name}}`);
      });
    }

    curl += ` \\\n  "https://selfcustodytax.com${path}"`;

    if (endpoint.requestBody) {
      curl += ` \\\n  -d '${JSON.stringify(endpoint.requestBody.example, null, 2)}'`;
    }

    return curl;
  };

  const generatePython = (endpoint: Endpoint) => {
    const key = apiKey || 'YOUR_API_KEY';
    let path = endpoint.path;
    if (endpoint.params) {
      endpoint.params.forEach((p) => {
        path = path.replace(`:${p.name}`, `{${p.name}}`);
      });
    }

    let code = `import requests

`;
    if (endpoint.auth === 'bearer') {
      code += `headers = {
    "Authorization": "Bearer ${key}",
    "Content-Type": "application/json"
}

`;
    }

    if (endpoint.method === 'GET') {
      code += `response = requests.get(
    "https://selfcustodytax.com${path}",
    headers=headers
)`;
    } else if (endpoint.method === 'POST') {
      code += `data = ${JSON.stringify(endpoint.requestBody?.example || {}, null, 4)}

response = requests.post(
    "https://selfcustodytax.com${path}",
    headers=headers,
    json=data
)`;
    } else if (endpoint.method === 'DELETE') {
      code += `response = requests.delete(
    "https://selfcustodytax.com${path}",
    headers=headers
)`;
    }

    code += `

print(response.json())`;
    return code;
  };

  const generateJavaScript = (endpoint: Endpoint) => {
    const key = apiKey || 'YOUR_API_KEY';
    let path = endpoint.path;
    if (endpoint.params) {
      endpoint.params.forEach((p) => {
        path = path.replace(`:${p.name}`, `\${${p.name}}`);
      });
    }

    let code = '';
    if (endpoint.method === 'GET') {
      code = `const response = await fetch('https://selfcustodytax.com${path}', {
  method: '${endpoint.method}',
  headers: {${endpoint.auth === 'bearer' ? `
    'Authorization': 'Bearer ${key}',` : ''}
    'Content-Type': 'application/json'
  }
});

const data = await response.json();
console.log(data);`;
    } else if (endpoint.method === 'POST') {
      code = `const response = await fetch('https://selfcustodytax.com${path}', {
  method: 'POST',
  headers: {${endpoint.auth === 'bearer' ? `
    'Authorization': 'Bearer ${key}',` : ''}
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(${JSON.stringify(endpoint.requestBody?.example || {}, null, 4)})
});

const data = await response.json();
console.log(data);`;
    } else if (endpoint.method === 'DELETE') {
      code = `const response = await fetch('https://selfcustodytax.com${path}', {
  method: 'DELETE',
  headers: {${endpoint.auth === 'bearer' ? `
    'Authorization': 'Bearer ${key}',` : ''}
    'Content-Type': 'application/json'
  }
});

const data = await response.json();
console.log(data);`;
    }

    return code;
  };

  const methodColors = {
    GET: 'bg-green-600',
    POST: 'bg-blue-600',
    DELETE: 'bg-red-600',
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <Link href="/settings" className="text-orange-400 hover:text-orange-300 text-sm">
            &larr; Back to Settings
          </Link>
          <h1 className="text-3xl font-bold mt-4">API Documentation</h1>
          <p className="text-gray-400 mt-2">
            Programmatic access to your Self Custody Tax data. Available for Advisor tier subscribers.
          </p>
        </div>

        <div className="mb-6 flex gap-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === 'overview' ? 'bg-orange-600' : 'bg-gray-800 hover:bg-gray-700'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('endpoints')}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === 'endpoints' ? 'bg-orange-600' : 'bg-gray-800 hover:bg-gray-700'
            }`}
          >
            Endpoints
          </button>
          <button
            onClick={() => setActiveTab('errors')}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === 'errors' ? 'bg-orange-600' : 'bg-gray-800 hover:bg-gray-700'
            }`}
          >
            Errors
          </button>
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
              <h2 className="text-xl font-semibold mb-4">Getting Started</h2>
              <div className="space-y-4 text-gray-300">
                <p>
                  The Self Custody Tax API allows you to programmatically access your wallet data,
                  transactions, tax lots, and generate tax summaries. Perfect for integrating with
                  your practice management software or building custom reporting tools.
                </p>
                <h3 className="text-lg font-medium text-white mt-6">Base URL</h3>
                <code className="block bg-gray-800 p-3 rounded text-sm">
                  https://selfcustodytax.com/api/v1
                </code>
                <h3 className="text-lg font-medium text-white mt-6">Authentication</h3>
                <p>
                  API requests are authenticated using Bearer tokens. Generate an API key from your{' '}
                  <Link href="/settings" className="text-orange-400 hover:underline">
                    Settings page
                  </Link>{' '}
                  and include it in the Authorization header:
                </p>
                <code className="block bg-gray-800 p-3 rounded text-sm">
                  Authorization: Bearer sct_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
                </code>
              </div>
            </div>

            <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
              <h2 className="text-xl font-semibold mb-4">Rate Limits</h2>
              <div className="space-y-4 text-gray-300">
                <p>
                  API requests are rate limited to <strong>1,000 requests per day</strong> per API key.
                  Rate limit information is included in response headers:
                </p>
                <ul className="list-disc list-inside space-y-2">
                  <li><code className="text-orange-400">X-RateLimit-Limit</code>: Your daily limit</li>
                  <li><code className="text-orange-400">X-RateLimit-Remaining</code>: Requests remaining today</li>
                  <li><code className="text-orange-400">X-RateLimit-Reset</code>: When the limit resets (ISO 8601)</li>
                </ul>
              </div>
            </div>

            <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
              <h2 className="text-xl font-semibold mb-4">Response Format</h2>
              <div className="space-y-4 text-gray-300">
                <p>All responses are JSON with a consistent structure:</p>
                <pre className="bg-gray-800 p-4 rounded text-sm overflow-x-auto">
{`{
  "data": { ... },         // Response data
  "meta": {                // Pagination info (for list endpoints)
    "total": 100,
    "page": 1,
    "per_page": 100,
    "total_pages": 1
  },
  "rate_limit": {          // Rate limit status
    "remaining": 995,
    "limit": 1000,
    "reset": "2026-01-12T00:00:00Z"
  }
}`}
                </pre>
              </div>
            </div>

            <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
              <h2 className="text-xl font-semibold mb-4">Try It Out</h2>
              <div className="space-y-4">
                <p className="text-gray-300">
                  Enter your API key to generate ready-to-use code examples:
                </p>
                <input
                  type="text"
                  placeholder="sct_live_..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                />
                <p className="text-gray-500 text-sm">
                  Your API key is only used locally in your browser for generating examples.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'endpoints' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <h2 className="text-lg font-semibold mb-4">Endpoints</h2>
              {endpoints.map((endpoint, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedEndpoint(endpoint)}
                  className={`w-full text-left p-3 rounded-lg border ${
                    selectedEndpoint === endpoint
                      ? 'bg-gray-800 border-orange-500'
                      : 'bg-gray-900 border-gray-800 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`${methodColors[endpoint.method]} text-white text-xs font-medium px-2 py-0.5 rounded`}
                    >
                      {endpoint.method}
                    </span>
                    <span className="text-sm font-mono">{endpoint.path}</span>
                  </div>
                  <p className="text-gray-400 text-sm mt-1">{endpoint.description}</p>
                </button>
              ))}
            </div>

            <div className="lg:col-span-2">
              {selectedEndpoint ? (
                <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <span
                      className={`${methodColors[selectedEndpoint.method]} text-white text-sm font-medium px-3 py-1 rounded`}
                    >
                      {selectedEndpoint.method}
                    </span>
                    <code className="text-lg font-mono">{selectedEndpoint.path}</code>
                  </div>
                  <p className="text-gray-300 mb-6">{selectedEndpoint.description}</p>

                  <div className="mb-4 inline-block">
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        selectedEndpoint.auth === 'bearer'
                          ? 'bg-orange-900/50 text-orange-400'
                          : 'bg-blue-900/50 text-blue-400'
                      }`}
                    >
                      {selectedEndpoint.auth === 'bearer' ? 'API Key Auth' : 'Session Auth'}
                    </span>
                  </div>

                  {selectedEndpoint.params && (
                    <div className="mb-6">
                      <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">
                        Path Parameters
                      </h3>
                      <div className="space-y-2">
                        {selectedEndpoint.params.map((param) => (
                          <div key={param.name} className="flex items-start gap-4">
                            <code className="text-orange-400 font-mono text-sm">{param.name}</code>
                            <span className="text-gray-500 text-sm">{param.type}</span>
                            <span className="text-gray-400 text-sm">{param.description}</span>
                            {param.required && (
                              <span className="text-red-400 text-xs">required</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedEndpoint.queryParams && (
                    <div className="mb-6">
                      <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">
                        Query Parameters
                      </h3>
                      <div className="space-y-2">
                        {selectedEndpoint.queryParams.map((param) => (
                          <div key={param.name} className="flex items-start gap-4 flex-wrap">
                            <code className="text-orange-400 font-mono text-sm">{param.name}</code>
                            <span className="text-gray-500 text-sm">{param.type}</span>
                            <span className="text-gray-400 text-sm flex-1">{param.description}</span>
                            {param.required && (
                              <span className="text-red-400 text-xs">required</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedEndpoint.requestBody && (
                    <div className="mb-6">
                      <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">
                        Request Body
                      </h3>
                      <p className="text-gray-400 text-sm mb-2">{selectedEndpoint.requestBody.description}</p>
                      <pre className="bg-gray-800 p-4 rounded text-sm overflow-x-auto">
                        {JSON.stringify(selectedEndpoint.requestBody.example, null, 2)}
                      </pre>
                    </div>
                  )}

                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">
                      Response
                    </h3>
                    <p className="text-gray-400 text-sm mb-2">{selectedEndpoint.response.description}</p>
                    <pre className="bg-gray-800 p-4 rounded text-sm overflow-x-auto">
                      {JSON.stringify(selectedEndpoint.response.example, null, 2)}
                    </pre>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">
                      Code Examples
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-gray-300 text-sm font-medium">cURL</span>
                        </div>
                        <pre className="bg-gray-800 p-4 rounded text-sm overflow-x-auto">
                          {generateCurl(selectedEndpoint)}
                        </pre>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-gray-300 text-sm font-medium">Python</span>
                        </div>
                        <pre className="bg-gray-800 p-4 rounded text-sm overflow-x-auto">
                          {generatePython(selectedEndpoint)}
                        </pre>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-gray-300 text-sm font-medium">JavaScript</span>
                        </div>
                        <pre className="bg-gray-800 p-4 rounded text-sm overflow-x-auto">
                          {generateJavaScript(selectedEndpoint)}
                        </pre>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-900 rounded-lg border border-gray-800 p-6 text-center text-gray-400">
                  <p>Select an endpoint to view details and code examples.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'errors' && (
          <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
            <h2 className="text-xl font-semibold mb-6">Error Codes</h2>
            <div className="space-y-4">
              {errorCodes.map((error) => (
                <div key={error.code} className="flex items-start gap-4 p-4 bg-gray-800 rounded-lg">
                  <span className="text-orange-400 font-mono font-semibold">{error.code}</span>
                  <div>
                    <h3 className="font-medium">{error.name}</h3>
                    <p className="text-gray-400 text-sm">{error.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <h2 className="text-xl font-semibold mt-8 mb-6">Error Response Format</h2>
            <pre className="bg-gray-800 p-4 rounded text-sm overflow-x-auto">
{`{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid API key",
    "request_id": "req_abc123def456"
  },
  "rate_limit": {
    "remaining": 995,
    "limit": 1000,
    "reset": "2026-01-12T00:00:00Z"
  }
}`}
            </pre>

            <h2 className="text-xl font-semibold mt-8 mb-6">Common Issues</h2>
            <div className="space-y-4 text-gray-300">
              <div>
                <h3 className="font-medium text-white">API key not working</h3>
                <p className="text-sm">
                  Ensure your API key starts with <code className="text-orange-400">sct_live_</code>{' '}
                  and is included in the Authorization header as a Bearer token.
                </p>
              </div>
              <div>
                <h3 className="font-medium text-white">403 Forbidden error</h3>
                <p className="text-sm">
                  API access requires an Advisor tier subscription. Upgrade your plan in{' '}
                  <Link href="/settings" className="text-orange-400 hover:underline">
                    Settings
                  </Link>
                  .
                </p>
              </div>
              <div>
                <h3 className="font-medium text-white">Rate limit exceeded</h3>
                <p className="text-sm">
                  You&apos;ve exceeded 1,000 requests today. Check the{' '}
                  <code className="text-orange-400">X-RateLimit-Reset</code> header for when your
                  limit resets.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>
            Need help? Contact support at{' '}
            <a href="mailto:support@selfcustodytax.com" className="text-orange-400 hover:underline">
              support@selfcustodytax.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
