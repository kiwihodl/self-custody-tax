# PRD: Public API Access (Phase 8)

**Status:** Draft
**Author:** Self Custody Tax Team
**Created:** January 11, 2026
**Last Updated:** January 11, 2026
**Target Tier:** Advisor ($499/year)

---

## 1. Overview

### Problem Statement

Advisor tier users (CPAs, wealth managers, tax professionals) need programmatic access to Self Custody Tax data to integrate with their existing workflows. Currently, all data access requires manual login and UI interaction, which doesn't scale for professionals managing multiple clients or using custom reporting tools.

Competitors like Ledgible, TaxBit, and Cryptoworth offer API access for enterprise users. Our Advisor tier promises "API access" but doesn't deliver it yet.

### Proposed Solution

Build a RESTful API with API key authentication that allows Advisor tier users to:
- Retrieve wallet and transaction data programmatically
- Generate tax reports via API calls
- Integrate with accounting software and practice management tools
- Receive webhooks for real-time updates

### Goals

1. **Enable automation** - Advisor users can script data retrieval and report generation
2. **Support integration** - API can connect with QuickBooks, Xero, practice management tools
3. **Maintain security** - API keys with proper scoping, rate limiting, and audit logging
4. **Provide documentation** - Clear, developer-friendly API docs with examples

### Non-Goals

- Public API for all users (Advisor tier only)
- GraphQL support (REST only for v1)
- Real-time streaming (webhooks are sufficient)
- OAuth2 for third-party apps (API keys for direct access only)

---

## 2. User Stories

### Primary User: CPA/Tax Professional

**Story 1: Bulk Data Export**
As a CPA managing 20 Bitcoin clients, I want to export all client data via API so that I can import it into my tax preparation software.

**Acceptance Criteria:**
- [ ] Given I have a valid API key, when I call GET /api/v1/wallets, then I receive JSON with all wallet data
- [ ] Given I call with invalid API key, when I make any request, then I receive 401 Unauthorized
- [ ] Given I exceed rate limits, when I make additional requests, then I receive 429 Too Many Requests

**Story 2: Automated Report Generation**
As a wealth manager, I want to generate tax reports automatically at year-end so that I can deliver reports to all clients efficiently.

**Acceptance Criteria:**
- [ ] Given a valid tax year, when I call POST /api/v1/tax/report, then I receive a PDF or CSV download URL
- [ ] Given the report is generating, when I poll the status endpoint, then I see progress updates
- [ ] Given the report is complete, when I access the download URL, then I get the full report

**Story 3: Integration Webhook**
As a tax professional using practice management software, I want to receive notifications when client wallets sync so that I know when data is fresh.

**Acceptance Criteria:**
- [ ] Given I configure a webhook URL, when a wallet sync completes, then my endpoint receives a POST with sync details
- [ ] Given the webhook fails, when it's retried 3 times, then I receive an email notification
- [ ] Given I view webhook history, when I access settings, then I see recent deliveries with status

---

## 3. Requirements

### Functional Requirements

| ID | Requirement | Priority | Notes |
|----|-------------|----------|-------|
| FR-1 | API key generation and management | Must Have | Users create/revoke keys in settings |
| FR-2 | GET /api/v1/wallets endpoint | Must Have | List all user wallets |
| FR-3 | GET /api/v1/wallets/:id endpoint | Must Have | Single wallet details |
| FR-4 | GET /api/v1/transactions endpoint | Must Have | Paginated, filterable |
| FR-5 | GET /api/v1/tax-lots endpoint | Must Have | With disposal status |
| FR-6 | GET /api/v1/tax/summary endpoint | Must Have | Year and method params |
| FR-7 | POST /api/v1/tax/report endpoint | Must Have | Async report generation |
| FR-8 | Rate limiting per API key | Must Have | 1000 requests/day |
| FR-9 | API documentation page | Must Have | OpenAPI spec + examples |
| FR-10 | Webhook configuration | Should Have | Sync complete events |
| FR-11 | API usage dashboard | Should Have | Request counts, errors |
| FR-12 | Multiple API keys per user | Nice to Have | For different integrations |

### Non-Functional Requirements

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-1 | Response time | < 500ms for list endpoints |
| NFR-2 | Availability | 99.9% uptime |
| NFR-3 | Security | API keys hashed, HTTPS only |
| NFR-4 | Rate limiting | Token bucket, 1000/day default |
| NFR-5 | Pagination | Max 100 items per page |

---

## 4. User Experience

### API Key Management Flow

1. User navigates to Settings > API Keys
2. User clicks "Generate New API Key"
3. Modal shows generated key (only shown once)
4. User copies key and stores securely
5. Key appears in list with created date, last used
6. User can revoke keys anytime

### API Documentation Flow

1. User navigates to /docs/api
2. Sees OpenAPI/Swagger UI with all endpoints
3. Can test endpoints directly with their API key
4. Copy-paste code examples (curl, Python, JavaScript)
5. Download OpenAPI spec for code generation

### Edge Cases

- **Empty data:** Return empty arrays with 200 status
- **Invalid API key:** Return 401 with clear error message
- **Rate limit exceeded:** Return 429 with reset time in headers
- **Server error:** Return 500 with request ID for support
- **Non-Advisor user:** Return 403 "Upgrade required"

---

## 5. Technical Considerations

### Database Schema

```sql
-- API Keys table
CREATE TABLE public.api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL,  -- SHA-256 hash of key
  key_prefix TEXT NOT NULL, -- First 8 chars for identification
  scopes TEXT[] DEFAULT ARRAY['read'],
  rate_limit_daily INTEGER DEFAULT 1000,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_revoked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_prefix CHECK (LENGTH(key_prefix) = 8)
);

-- API request log for rate limiting and analytics
CREATE TABLE public.api_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  api_key_id UUID REFERENCES public.api_keys(id),
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INTEGER,
  response_time_ms INTEGER,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for rate limiting queries
CREATE INDEX idx_api_requests_key_date ON public.api_requests(api_key_id, created_at);

-- Webhooks table
CREATE TABLE public.webhooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  events TEXT[] DEFAULT ARRAY['wallet.synced'],
  secret TEXT NOT NULL,  -- For HMAC signing
  is_active BOOLEAN DEFAULT TRUE,
  last_triggered_at TIMESTAMPTZ,
  failure_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### API Key Format

```
sct_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

- Prefix: `sct_live_` (or `sct_test_` for test mode)
- Body: 32 character random string
- Total: 40 characters
- Only shown once at creation, stored as SHA-256 hash

### Authentication Middleware

```typescript
// /src/lib/api/auth.ts
import { createHash } from 'crypto';
import { createClient } from '@/lib/supabase/server';

export async function validateApiKey(request: Request) {
  const authHeader = request.headers.get('Authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return { error: 'Missing API key', status: 401 };
  }

  const apiKey = authHeader.slice(7);
  const keyHash = createHash('sha256').update(apiKey).digest('hex');
  const keyPrefix = apiKey.slice(0, 8);

  const supabase = await createClient();

  const { data: key } = await supabase
    .from('api_keys')
    .select('*, user_profiles!inner(*)')
    .eq('key_hash', keyHash)
    .eq('key_prefix', keyPrefix)
    .eq('is_revoked', false)
    .single();

  if (!key) {
    return { error: 'Invalid API key', status: 401 };
  }

  if (key.user_profiles.subscription_tier !== 'advisor') {
    return { error: 'API access requires Advisor tier', status: 403 };
  }

  // Update last used
  await supabase
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', key.id);

  return { user: key.user_profiles, apiKey: key };
}
```

### Rate Limiting

```typescript
// /src/lib/api/rate-limit.ts
export async function checkRateLimit(apiKeyId: string, limit: number = 1000) {
  const supabase = await createClient();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from('api_requests')
    .select('*', { count: 'exact', head: true })
    .eq('api_key_id', apiKeyId)
    .gte('created_at', today.toISOString());

  if (count >= limit) {
    const resetTime = new Date(today);
    resetTime.setDate(resetTime.getDate() + 1);

    return {
      allowed: false,
      remaining: 0,
      reset: resetTime.toISOString()
    };
  }

  return {
    allowed: true,
    remaining: limit - count - 1,
    reset: null
  };
}
```

### File Structure

```
src/
├── app/
│   ├── api/
│   │   └── v1/
│   │       ├── wallets/
│   │       │   ├── route.ts          # GET /api/v1/wallets
│   │       │   └── [id]/
│   │       │       └── route.ts      # GET /api/v1/wallets/:id
│   │       ├── transactions/
│   │       │   └── route.ts          # GET /api/v1/transactions
│   │       ├── tax-lots/
│   │       │   └── route.ts          # GET /api/v1/tax-lots
│   │       └── tax/
│   │           ├── summary/
│   │           │   └── route.ts      # GET /api/v1/tax/summary
│   │           └── report/
│   │               └── route.ts      # POST /api/v1/tax/report
│   ├── docs/
│   │   └── api/
│   │       └── page.tsx              # API documentation
│   └── settings/
│       └── api-keys/
│           └── page.tsx              # API key management
├── lib/
│   └── api/
│       ├── auth.ts                   # API key validation
│       ├── rate-limit.ts             # Rate limiting
│       ├── response.ts               # Standard response helpers
│       └── openapi.ts                # OpenAPI spec generation
└── components/
    └── api/
        ├── api-key-list.tsx          # Key management UI
        └── api-docs.tsx              # Documentation components
```

### Dependencies

- Existing: Supabase, Next.js API routes
- New: `swagger-ui-react` for API docs display
- New: `crypto` (Node built-in) for key hashing

### Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| API abuse | Medium | High | Rate limiting, request logging, auto-revoke on anomalies |
| Key exposure | Medium | High | Hash storage, prefix-only display, expiration support |
| Breaking changes | Low | Medium | Version endpoints (v1), deprecation notices |
| Performance impact | Low | Medium | Caching, pagination limits, async reports |

---

## 6. Success Metrics

### Key Metrics

| Metric | Current Baseline | Target | How to Measure |
|--------|-----------------|--------|----------------|
| API key activations | 0 | 50% of Advisor users | Count keys created |
| Daily API calls | 0 | 100+ per active key | Request logs |
| Report generations via API | 0 | 30% of Advisor reports | Track source |
| Integration webhooks active | 0 | 20% of Advisor users | Webhook table |

### Definition of Done

- [ ] All acceptance criteria met
- [ ] API endpoints functional with correct auth
- [ ] Rate limiting working correctly
- [ ] API documentation complete and accurate
- [ ] Key management UI functional
- [ ] Database migrations applied
- [ ] Tests written for auth and rate limiting
- [ ] Deployed to production

---

## 7. Phases

### Phase 1: Core API Infrastructure

**Deliverables:**
- API key generation/revocation
- Authentication middleware
- Rate limiting
- Basic endpoints (wallets, transactions)

**Dependencies:**
- Supabase migrations for api_keys table

### Phase 2: Full Endpoint Coverage

**Deliverables:**
- Tax lots endpoint
- Tax summary endpoint
- Report generation endpoint
- Pagination and filtering

**Dependencies:**
- Phase 1 complete

### Phase 3: Documentation and Polish

**Deliverables:**
- OpenAPI specification
- Interactive documentation page
- Code examples
- Usage dashboard

**Dependencies:**
- Phase 2 complete

### Phase 4: Webhooks (Optional)

**Deliverables:**
- Webhook configuration UI
- Sync complete events
- Retry logic
- Delivery history

**Dependencies:**
- Phase 3 complete

---

## 8. Open Questions

- [ ] Should API keys have scopes (read-only vs read-write)?
- [ ] What's the right rate limit for Advisor tier (1000/day proposed)?
- [ ] Should we support test mode API keys for development?
- [ ] Do we need IP allowlisting for additional security?

---

## 9. API Specification

### Authentication

All requests require Bearer token authentication:

```
Authorization: Bearer sct_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Endpoints

#### GET /api/v1/wallets

List all wallets for authenticated user.

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Cold Storage",
      "type": "single_sig",
      "network": "bitcoin",
      "balance": "1.23456789",
      "balance_usd": 98765.43,
      "last_synced_at": "2026-01-11T12:00:00Z"
    }
  ],
  "meta": {
    "total": 5,
    "page": 1,
    "per_page": 100
  }
}
```

#### GET /api/v1/transactions

List transactions with optional filters.

**Query Parameters:**
- `wallet_id` - Filter by wallet
- `category` - Filter by category (receive, send, internal)
- `start_date` - ISO date
- `end_date` - ISO date
- `page` - Page number
- `per_page` - Items per page (max 100)

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "txid": "abc123...",
      "wallet_id": "uuid",
      "category": "receive",
      "amount": "0.5",
      "amount_usd": 45000.00,
      "fee": "0.00001",
      "fee_usd": 0.95,
      "block_timestamp": "2026-01-10T15:30:00Z",
      "is_internal_transfer": false
    }
  ],
  "meta": {
    "total": 150,
    "page": 1,
    "per_page": 100
  }
}
```

#### GET /api/v1/tax/summary

Get tax summary for a year.

**Query Parameters:**
- `year` - Tax year (required)
- `method` - Cost basis method (FIFO, LIFO, HIFO)

**Response:**
```json
{
  "data": {
    "year": 2025,
    "method": "FIFO",
    "short_term": {
      "proceeds": 50000.00,
      "cost_basis": 45000.00,
      "gain_loss": 5000.00,
      "transaction_count": 12
    },
    "long_term": {
      "proceeds": 100000.00,
      "cost_basis": 40000.00,
      "gain_loss": 60000.00,
      "transaction_count": 8
    },
    "income": {
      "total": 5000.00,
      "by_type": {
        "mining": 3000.00,
        "staking": 2000.00
      }
    }
  }
}
```

#### POST /api/v1/tax/report

Generate a tax report (async).

**Request:**
```json
{
  "year": 2025,
  "format": "8949",
  "method": "FIFO"
}
```

**Response:**
```json
{
  "data": {
    "report_id": "uuid",
    "status": "generating",
    "download_url": null,
    "expires_at": null
  }
}
```

**Poll for completion:**
```
GET /api/v1/tax/report/:report_id
```

---

## Appendix

### SEO Keywords

- bitcoin api tax reporting
- crypto tax api integration
- programmatic crypto tax reports
- CPA crypto tax software api

### Competitor API Pricing

| Competitor | API Access | Tier |
|------------|-----------|------|
| Ledgible | Yes | Enterprise (custom) |
| TaxBit | Yes | Enterprise only |
| Cryptoworth | Yes | $89+/month |
| Koinly | Limited (import only) | All tiers |
| CoinTracker | No public API | - |

**Our Position:** Full API at $499/year (Advisor tier) is competitive for small firms.
