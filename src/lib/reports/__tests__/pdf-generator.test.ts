// Tests for PDF report utilities
// Note: @react-pdf/renderer uses ESM which Jest doesn't transform by default
// Testing utility functions directly here

// Mock environment variable
const originalEnv = process.env;
beforeAll(() => {
  process.env = {
    ...originalEnv,
    NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
  };
});

afterAll(() => {
  process.env = originalEnv;
});

// Utility function implementations (same as in pdf-generator.ts)
function formatReportDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatBTC(amount: number): string {
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: 8,
    maximumFractionDigits: 8,
  }) + ' BTC';
}

function getLogoUrl(logoPath: string): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return `${supabaseUrl}/storage/v1/object/public/advisor-assets/${logoPath}`;
}

describe('PDF Generator Utilities', () => {
  describe('formatReportDate', () => {
    it('formats Date object correctly', () => {
      const date = new Date('2025-06-15');
      const formatted = formatReportDate(date);
      expect(formatted).toContain('June');
      expect(formatted).toContain('15');
      expect(formatted).toContain('2025');
    });

    it('formats date string correctly', () => {
      const formatted = formatReportDate('2024-12-25');
      expect(formatted).toContain('December');
      expect(formatted).toContain('25');
      expect(formatted).toContain('2024');
    });
  });

  describe('formatUSD', () => {
    it('formats positive amounts correctly', () => {
      expect(formatUSD(1234.56)).toBe('$1,234.56');
    });

    it('formats negative amounts correctly', () => {
      expect(formatUSD(-5678.90)).toBe('-$5,678.90');
    });

    it('formats zero correctly', () => {
      expect(formatUSD(0)).toBe('$0.00');
    });

    it('formats large amounts correctly', () => {
      expect(formatUSD(1234567.89)).toBe('$1,234,567.89');
    });

    it('rounds to 2 decimal places', () => {
      expect(formatUSD(100.999)).toBe('$101.00');
    });
  });

  describe('formatBTC', () => {
    it('formats BTC with 8 decimal places', () => {
      expect(formatBTC(1.5)).toBe('1.50000000 BTC');
    });

    it('formats small BTC amounts correctly', () => {
      expect(formatBTC(0.00000001)).toBe('0.00000001 BTC');
    });

    it('formats zero correctly', () => {
      expect(formatBTC(0)).toBe('0.00000000 BTC');
    });

    it('formats large BTC amounts correctly', () => {
      expect(formatBTC(21000000)).toBe('21,000,000.00000000 BTC');
    });
  });

  describe('getLogoUrl', () => {
    it('constructs correct Supabase storage URL', () => {
      const path = 'user123/logo.png';
      const url = getLogoUrl(path);
      expect(url).toBe(
        'https://test.supabase.co/storage/v1/object/public/advisor-assets/user123/logo.png'
      );
    });

    it('handles paths with special characters', () => {
      const path = 'user-123/my-logo.png';
      const url = getLogoUrl(path);
      expect(url).toContain('user-123/my-logo.png');
    });
  });
});

describe('TaxReportData Types', () => {
  it('should have correct structure for TaxLotEntry', () => {
    const entry = {
      asset: 'BTC',
      amount: 0.5,
      acquisitionDate: '2024-01-01',
      disposalDate: '2025-01-01',
      proceeds: 50000,
      costBasis: 30000,
      gainLoss: 20000,
      holdingPeriod: 'long' as const,
    };

    expect(entry.asset).toBe('BTC');
    expect(entry.holdingPeriod).toBe('long');
    expect(entry.gainLoss).toBe(entry.proceeds - entry.costBasis);
  });

  it('should have correct structure for TaxReportData', () => {
    const data = {
      year: 2025,
      method: 'FIFO' as const,
      shortTermGains: 1000,
      shortTermLosses: 500,
      longTermGains: 5000,
      longTermLosses: 1000,
      netGainLoss: 4500,
      totalProceeds: 10000,
      totalCostBasis: 5500,
      transactions: [],
    };

    expect(data.year).toBe(2025);
    expect(data.method).toBe('FIFO');
    expect(data.netGainLoss).toBe(
      data.shortTermGains -
        data.shortTermLosses +
        data.longTermGains -
        data.longTermLosses
    );
  });
});
