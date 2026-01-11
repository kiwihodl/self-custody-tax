# PRD: White-Label Reports (Phase 10)

**Status:** Approved for Implementation
**Author:** Self Custody Tax Team
**Created:** January 11, 2026
**Last Updated:** January 11, 2026
**Target Tier:** Advisor ($499/year)
**Dependencies:** Phase 9 (Multi-Client Dashboard)

## Competitive Research Summary

**Market Gap Identified:** Only CoinTracking Corporate offers white-label reports among major crypto tax platforms. Koinly, CoinTracker, TaxBit, Ledgible, and CryptoTaxCalculator all lack branded report customization - a significant market opportunity.

**Technical Decision:** Use **@react-pdf/renderer** for PDF generation (lightweight, React-native, excellent for serverless) with fallback consideration for Puppeteer if complex layouts needed.

---

## 1. Overview

### Problem Statement

CPAs and wealth managers want to deliver professional reports to clients that carry their firm's branding, not Self Custody Tax's. Currently, all generated reports show our branding, which:
- Undermines the advisor's professional image
- Reveals the underlying software to clients
- Doesn't integrate with the advisor's existing deliverables
- Reduces perceived value of the advisor's services

Competitors like Monaco CPA offer white-label services, and enterprise platforms like Ledgible provide full branding customization.

### Proposed Solution

Allow Advisor tier users to customize report branding:
- Upload firm logo
- Set brand colors
- Add custom headers/footers
- Include firm contact information
- Generate professionally branded PDF reports

### Goals

1. **Professional presentation** - Reports look like advisor's own work product
2. **Brand consistency** - Match advisor's existing materials
3. **Client-ready delivery** - No editing needed before sending
4. **Competitive parity** - Match enterprise platforms at lower cost

### Non-Goals

- Custom report layouts (use our standard formats)
- Custom data fields (use existing fields)
- Email customization beyond basic branding
- White-label the web application itself

---

## 2. User Stories

### Primary User: CPA/Tax Professional

**Story 1: Firm Profile Setup**
As a CPA, I want to set up my firm's branding so that all reports carry my firm's identity.

**Acceptance Criteria:**
- [ ] Given I'm on branding settings, when I upload a logo, then I see a preview
- [ ] Given I enter my firm name, when I save, then it appears on generated reports
- [ ] Given I select brand colors, when I preview a report, then it uses those colors

**Story 2: Branded Report Generation**
As a wealth manager, I want to generate a report with my firm's branding so that clients receive a professional document.

**Acceptance Criteria:**
- [ ] Given I have branding configured, when I generate a report, then it includes my logo
- [ ] Given I generate a PDF report, when I view it, then it has my firm name in header/footer
- [ ] Given a client generates their own report, when they're linked to me, then it uses my branding

**Story 3: Report Preview**
As a tax professional, I want to preview branded reports before sending so that I can verify the appearance.

**Acceptance Criteria:**
- [ ] Given I'm in branding settings, when I click "Preview Report", then I see a sample PDF
- [ ] Given I change branding, when I preview again, then I see the updated branding
- [ ] Given I'm satisfied, when I save, then all future reports use this branding

---

## 3. Requirements

### Functional Requirements

| ID | Requirement | Priority | Notes |
|----|-------------|----------|-------|
| FR-1 | Firm name setting | Must Have | Appears on all reports |
| FR-2 | Logo upload | Must Have | PNG/JPG, max 2MB |
| FR-3 | Primary brand color | Must Have | Headers, accents |
| FR-4 | Secondary brand color | Should Have | Backgrounds, borders |
| FR-5 | Contact information | Must Have | Email, phone, address |
| FR-6 | Footer disclaimer text | Should Have | Legal text, CPA disclaimer |
| FR-7 | Branded PDF generation | Must Have | Form 8949, summaries |
| FR-8 | Report preview | Must Have | Before saving branding |
| FR-9 | Apply to linked clients | Should Have | Client reports use advisor branding |
| FR-10 | Report templates | Nice to Have | Different styles |

### Non-Functional Requirements

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-1 | Logo file size | Max 2MB |
| NFR-2 | Logo dimensions | Min 200x200, displayed 150px height |
| NFR-3 | PDF generation time | < 10 seconds |
| NFR-4 | Color format | Hex (#XXXXXX) |

---

## 4. User Experience

### Branding Settings Page

```
┌─────────────────────────────────────────────────────────────────┐
│  Firm Branding Settings                      [Preview] [Save]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Firm Logo                                                      │
│  ┌──────────────────┐                                          │
│  │   [Upload Logo]  │  PNG or JPG, max 2MB                     │
│  │                  │  Recommended: 400x200px                  │
│  └──────────────────┘                                          │
│                                                                 │
│  Firm Name                                                      │
│  [Smith & Associates CPA_________________]                      │
│                                                                 │
│  Brand Colors                                                   │
│  Primary:   [#1a4d5e] [████]    Headers, accent text           │
│  Secondary: [#f0f4f5] [████]    Backgrounds                    │
│                                                                 │
│  Contact Information                                            │
│  Email:    [tax@smithcpa.com________________]                  │
│  Phone:    [+1 (555) 123-4567_______________]                  │
│  Address:  [123 Main St, Suite 100                             │
│             New York, NY 10001_____________]                    │
│                                                                 │
│  Report Footer                                                  │
│  [Prepared by Smith & Associates CPA. This report is          │
│   provided for informational purposes only._______________]    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Branded Report Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  ┌────────┐                                                     │
│  │ [LOGO] │  SMITH & ASSOCIATES CPA                            │
│  └────────┘  Tax & Financial Advisory                          │
│             ───────────────────────────────────────────────────│
│                                                                 │
│                      TAX REPORT 2025                           │
│                      Form 8949 Summary                         │
│                                                                 │
│  Prepared for: John Smith                                      │
│  Report Date: January 11, 2026                                 │
│                                                                 │
│  ───────────────────────────────────────────────────────────── │
│                                                                 │
│  [Report Content...]                                           │
│                                                                 │
│  ───────────────────────────────────────────────────────────── │
│                                                                 │
│  Prepared by Smith & Associates CPA                            │
│  tax@smithcpa.com | +1 (555) 123-4567                         │
│  123 Main St, Suite 100, New York, NY 10001                   │
│                                                                 │
│  This report is provided for informational purposes only.      │
└─────────────────────────────────────────────────────────────────┘
```

### Edge Cases

- **No logo uploaded:** Use firm name only in header
- **No branding configured:** Use default Self Custody Tax branding
- **Logo too large:** Resize on upload, maintain aspect ratio
- **Invalid color format:** Show validation error
- **Client not linked to advisor:** Use default branding

---

## 5. Technical Considerations

### Database Schema

```sql
-- Advisor branding profile
CREATE TABLE public.advisor_profiles (
  id UUID PRIMARY KEY REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  firm_name TEXT,
  logo_path TEXT,  -- Path in Supabase Storage
  primary_color TEXT DEFAULT '#F7931A',  -- Bitcoin orange default
  secondary_color TEXT DEFAULT '#1a1a2e',
  accent_color TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  address_line_1 TEXT,
  address_line_2 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'USA',
  footer_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.advisor_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own profile"
  ON public.advisor_profiles
  FOR ALL
  USING (auth.uid() = id);
```

### Supabase Storage

```
Storage Bucket: advisor-assets
├── {user_id}/
│   ├── logo.png
│   └── logo-small.png  (auto-generated thumbnail)
```

### PDF Generation Options

**Option 1: @react-pdf/renderer (Recommended)**
- Server-side React PDF generation
- Full control over layout
- No external dependencies
- Works with Next.js API routes

**Option 2: Puppeteer**
- HTML to PDF conversion
- More flexible styling (CSS)
- Larger bundle size
- Chrome dependency

**Option 3: PDFKit**
- Low-level PDF generation
- Lightweight
- More code required

**Recommendation:** Use @react-pdf/renderer for clean React integration.

### PDF Template Structure

```typescript
// /src/lib/reports/templates/tax-report.tsx
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';

interface TaxReportProps {
  branding: AdvisorProfile | null;
  data: TaxSummary;
  clientName: string;
}

export function TaxReportPDF({ branding, data, clientName }: TaxReportProps) {
  const styles = createStyles(branding);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header with logo */}
        <View style={styles.header}>
          {branding?.logo_path && (
            <Image src={getLogoUrl(branding.logo_path)} style={styles.logo} />
          )}
          <View style={styles.firmInfo}>
            <Text style={styles.firmName}>
              {branding?.firm_name || 'Self Custody Tax'}
            </Text>
            {branding?.contact_email && (
              <Text style={styles.contact}>{branding.contact_email}</Text>
            )}
          </View>
        </View>

        {/* Report content */}
        <View style={styles.content}>
          <Text style={styles.title}>Tax Report {data.year}</Text>
          <Text style={styles.subtitle}>Prepared for: {clientName}</Text>

          {/* Tables and data... */}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          {branding?.footer_text && (
            <Text style={styles.footerText}>{branding.footer_text}</Text>
          )}
          <Text style={styles.pageNumber}>
            Page {/* pageNumber */} of {/* totalPages */}
          </Text>
        </View>
      </Page>
    </Document>
  );
}

function createStyles(branding: AdvisorProfile | null) {
  const primary = branding?.primary_color || '#F7931A';
  const secondary = branding?.secondary_color || '#1a1a2e';

  return StyleSheet.create({
    page: {
      padding: 40,
      fontFamily: 'Helvetica',
    },
    header: {
      flexDirection: 'row',
      marginBottom: 30,
      borderBottomWidth: 2,
      borderBottomColor: primary,
      paddingBottom: 10,
    },
    logo: {
      width: 80,
      height: 40,
      objectFit: 'contain',
    },
    firmName: {
      fontSize: 18,
      fontWeight: 'bold',
      color: secondary,
    },
    // ... more styles
  });
}
```

### File Structure

```
src/
├── app/
│   ├── advisor/
│   │   └── branding/
│   │       └── page.tsx              # Branding settings page
│   └── api/
│       └── reports/
│           └── branded/
│               └── route.ts          # Generate branded PDF
├── lib/
│   └── reports/
│       ├── pdf-generator.ts          # PDF generation logic
│       ├── templates/
│       │   ├── tax-report.tsx        # Form 8949 template
│       │   ├── portfolio-summary.tsx # Portfolio overview
│       │   └── common/
│       │       ├── header.tsx        # Branded header
│       │       └── footer.tsx        # Branded footer
│       └── styles/
│           └── themes.ts             # Color theme utilities
├── components/
│   └── advisor/
│       ├── branding-form.tsx         # Branding settings form
│       ├── logo-uploader.tsx         # Logo upload component
│       ├── color-picker.tsx          # Color selection
│       └── report-preview.tsx        # Preview component
└── types/
    └── advisor.ts                    # Advisor type definitions
```

### API Endpoints

```typescript
// POST /api/advisor/branding
// Update branding settings
interface UpdateBrandingRequest {
  firm_name?: string;
  primary_color?: string;
  secondary_color?: string;
  contact_email?: string;
  contact_phone?: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  footer_text?: string;
}

// POST /api/advisor/branding/logo
// Upload logo (multipart/form-data)
// Returns: { logo_path: string }

// GET /api/reports/branded?year=2025&client_id=uuid&format=pdf
// Generate branded report
// Returns: PDF file download

// GET /api/advisor/branding/preview
// Generate preview report with current branding
// Returns: PDF file download
```

### Logo Processing

```typescript
// /src/lib/advisor/logo.ts
import { createClient } from '@/lib/supabase/server';
import sharp from 'sharp';

export async function uploadLogo(
  userId: string,
  file: File
): Promise<string> {
  const supabase = await createClient();

  // Validate file type
  if (!['image/png', 'image/jpeg'].includes(file.type)) {
    throw new Error('Logo must be PNG or JPEG');
  }

  // Validate file size (2MB)
  if (file.size > 2 * 1024 * 1024) {
    throw new Error('Logo must be under 2MB');
  }

  // Process image
  const buffer = await file.arrayBuffer();
  const processed = await sharp(Buffer.from(buffer))
    .resize(400, 200, { fit: 'inside', withoutEnlargement: true })
    .png()
    .toBuffer();

  // Upload to Supabase Storage
  const path = `${userId}/logo.png`;
  const { error } = await supabase.storage
    .from('advisor-assets')
    .upload(path, processed, {
      contentType: 'image/png',
      upsert: true,
    });

  if (error) throw error;

  return path;
}

export function getLogoUrl(path: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/advisor-assets/${path}`;
}
```

---

## 6. Success Metrics

### Key Metrics

| Metric | Current Baseline | Target | How to Measure |
|--------|-----------------|--------|----------------|
| Branding configured | 0 | 70% of Advisors | Count with logo uploaded |
| Branded reports generated | 0 | 80% of Advisor reports | Track branding usage |
| Preview usage | N/A | 3+ per advisor | Track preview calls |

### Definition of Done

- [ ] Branding settings UI complete
- [ ] Logo upload working
- [ ] Color picker functional
- [ ] PDF generation with branding
- [ ] Preview functionality
- [ ] Linked client reports use advisor branding
- [ ] Storage bucket configured
- [ ] Tests for PDF generation

---

## 7. Phases

### Phase 1: Core Branding

**Deliverables:**
- Database schema
- Branding settings page
- Logo upload
- Basic color settings

### Phase 2: PDF Generation

**Deliverables:**
- Install @react-pdf/renderer
- Tax report template with branding
- PDF generation API endpoint
- Download functionality

### Phase 3: Preview and Polish

**Deliverables:**
- Report preview
- Multiple report templates
- Apply to linked clients
- Footer customization

---

## 8. Open Questions

- [ ] Should we offer multiple logo sizes (full, icon)?
- [ ] Do we need custom fonts (adds complexity)?
- [ ] Should branding extend to CSV exports (headers)?
- [ ] What about email report delivery with branding?

---

## Appendix

### Dependencies

```json
{
  "dependencies": {
    "@react-pdf/renderer": "^3.1.0",
    "sharp": "^0.33.0"
  }
}
```

### SEO Keywords

- white label crypto tax reports
- branded tax software for cpas
- custom crypto tax reports
- professional crypto tax documents

### Example Color Schemes

**Professional Blue:**
- Primary: #1a4d5e
- Secondary: #f0f4f5

**Bitcoin Orange:**
- Primary: #F7931A
- Secondary: #1a1a2e

**Wealth Management Green:**
- Primary: #2e5d4b
- Secondary: #f5f7f6

**Classic Black:**
- Primary: #1a1a1a
- Secondary: #f5f5f5
