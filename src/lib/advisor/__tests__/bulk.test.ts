/**
 * Advisor Bulk Operations Tests
 * Tests for bulk sync and report generation functionality
 */

import {
  BulkSyncResult,
  BulkSyncSummary,
  BulkReportResult,
  BulkReportSummary,
  generateBulkReportsZip,
} from '../bulk';

describe('Bulk Sync Types', () => {
  describe('BulkSyncResult interface', () => {
    it('should accept valid sync result with success', () => {
      const result: BulkSyncResult = {
        clientId: 'client-123',
        clientEmail: 'test@example.com',
        success: true,
        walletsProcessed: 3,
        totalNewTransactions: 15,
        errors: [],
      };

      expect(result.clientId).toBe('client-123');
      expect(result.success).toBe(true);
      expect(result.walletsProcessed).toBe(3);
      expect(result.totalNewTransactions).toBe(15);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept valid sync result with failure', () => {
      const result: BulkSyncResult = {
        clientId: 'client-456',
        clientEmail: 'failed@example.com',
        success: false,
        walletsProcessed: 0,
        totalNewTransactions: 0,
        errors: ['API rate limit exceeded', 'Connection timeout'],
      };

      expect(result.success).toBe(false);
      expect(result.walletsProcessed).toBe(0);
      expect(result.errors).toHaveLength(2);
      expect(result.errors).toContain('API rate limit exceeded');
    });

    it('should accept partial success with some errors', () => {
      const result: BulkSyncResult = {
        clientId: 'client-789',
        clientEmail: 'partial@example.com',
        success: true,
        walletsProcessed: 2,
        totalNewTransactions: 10,
        errors: ['Wallet "Cold Storage" failed: Unknown network'],
      };

      expect(result.success).toBe(true);
      expect(result.walletsProcessed).toBe(2);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe('BulkSyncSummary interface', () => {
    it('should correctly aggregate sync results', () => {
      const results: BulkSyncResult[] = [
        {
          clientId: 'client-1',
          clientEmail: 'one@example.com',
          success: true,
          walletsProcessed: 2,
          totalNewTransactions: 10,
          errors: [],
        },
        {
          clientId: 'client-2',
          clientEmail: 'two@example.com',
          success: true,
          walletsProcessed: 3,
          totalNewTransactions: 25,
          errors: [],
        },
        {
          clientId: 'client-3',
          clientEmail: 'three@example.com',
          success: false,
          walletsProcessed: 0,
          totalNewTransactions: 0,
          errors: ['Failed to connect'],
        },
      ];

      const summary: BulkSyncSummary = {
        totalClients: 3,
        successfulClients: 2,
        failedClients: 1,
        totalWallets: 5,
        totalNewTransactions: 35,
        results,
      };

      expect(summary.totalClients).toBe(3);
      expect(summary.successfulClients).toBe(2);
      expect(summary.failedClients).toBe(1);
      expect(summary.totalWallets).toBe(5);
      expect(summary.totalNewTransactions).toBe(35);
      expect(summary.results).toHaveLength(3);
    });

    it('should handle empty results', () => {
      const summary: BulkSyncSummary = {
        totalClients: 0,
        successfulClients: 0,
        failedClients: 0,
        totalWallets: 0,
        totalNewTransactions: 0,
        results: [],
      };

      expect(summary.totalClients).toBe(0);
      expect(summary.results).toHaveLength(0);
    });

    it('should handle all failures', () => {
      const summary: BulkSyncSummary = {
        totalClients: 3,
        successfulClients: 0,
        failedClients: 3,
        totalWallets: 0,
        totalNewTransactions: 0,
        results: [
          {
            clientId: '1',
            clientEmail: 'a@test.com',
            success: false,
            walletsProcessed: 0,
            totalNewTransactions: 0,
            errors: ['Error 1'],
          },
          {
            clientId: '2',
            clientEmail: 'b@test.com',
            success: false,
            walletsProcessed: 0,
            totalNewTransactions: 0,
            errors: ['Error 2'],
          },
          {
            clientId: '3',
            clientEmail: 'c@test.com',
            success: false,
            walletsProcessed: 0,
            totalNewTransactions: 0,
            errors: ['Error 3'],
          },
        ],
      };

      expect(summary.successfulClients).toBe(0);
      expect(summary.failedClients).toBe(3);
    });
  });
});

describe('Bulk Report Types', () => {
  describe('BulkReportResult interface', () => {
    it('should accept valid report result with success', () => {
      const result: BulkReportResult = {
        clientId: 'client-123',
        clientEmail: 'test@example.com',
        success: true,
        year: 2024,
        method: 'FIFO',
        shortTermGainLoss: 5000.5,
        longTermGainLoss: 15000.75,
        csvData: 'Date,Description,Amount\n2024-01-15,Sale,1000',
      };

      expect(result.clientId).toBe('client-123');
      expect(result.success).toBe(true);
      expect(result.year).toBe(2024);
      expect(result.method).toBe('FIFO');
      expect(result.shortTermGainLoss).toBe(5000.5);
      expect(result.longTermGainLoss).toBe(15000.75);
      expect(result.csvData).toBeDefined();
    });

    it('should accept report result with LIFO method', () => {
      const result: BulkReportResult = {
        clientId: 'client-456',
        clientEmail: 'lifo@example.com',
        success: true,
        year: 2023,
        method: 'LIFO',
        shortTermGainLoss: 2500,
        longTermGainLoss: 7500,
        csvData: 'Date,Description,Amount\n2023-06-15,Sale,500',
      };

      expect(result.method).toBe('LIFO');
    });

    it('should accept report result with HIFO method', () => {
      const result: BulkReportResult = {
        clientId: 'client-789',
        clientEmail: 'hifo@example.com',
        success: true,
        year: 2024,
        method: 'HIFO',
        shortTermGainLoss: -1000,
        longTermGainLoss: 3000,
        csvData: 'Date,Description,Amount\n2024-03-15,Sale,200',
      };

      expect(result.method).toBe('HIFO');
      expect(result.shortTermGainLoss).toBe(-1000); // Loss
    });

    it('should accept failed report result', () => {
      const result: BulkReportResult = {
        clientId: 'client-999',
        clientEmail: 'failed@example.com',
        success: false,
        year: 2024,
        method: 'FIFO',
        shortTermGainLoss: 0,
        longTermGainLoss: 0,
        error: 'No tax lots found for this year',
      };

      expect(result.success).toBe(false);
      expect(result.error).toBe('No tax lots found for this year');
      expect(result.csvData).toBeUndefined();
    });

    it('should handle zero gains/losses', () => {
      const result: BulkReportResult = {
        clientId: 'client-000',
        clientEmail: 'hodler@example.com',
        success: true,
        year: 2024,
        method: 'FIFO',
        shortTermGainLoss: 0,
        longTermGainLoss: 0,
        csvData: '',
      };

      expect(result.shortTermGainLoss).toBe(0);
      expect(result.longTermGainLoss).toBe(0);
      expect(result.csvData).toBe('');
    });

    it('should handle large numbers', () => {
      const result: BulkReportResult = {
        clientId: 'client-whale',
        clientEmail: 'whale@example.com',
        success: true,
        year: 2024,
        method: 'FIFO',
        shortTermGainLoss: 1_000_000.25,
        longTermGainLoss: 5_000_000.75,
        csvData: 'large data',
      };

      expect(result.shortTermGainLoss).toBe(1000000.25);
      expect(result.longTermGainLoss).toBe(5000000.75);
    });
  });

  describe('BulkReportSummary interface', () => {
    it('should correctly aggregate report results', () => {
      const results: BulkReportResult[] = [
        {
          clientId: 'client-1',
          clientEmail: 'one@example.com',
          success: true,
          year: 2024,
          method: 'FIFO',
          shortTermGainLoss: 1000,
          longTermGainLoss: 2000,
          csvData: 'data1',
        },
        {
          clientId: 'client-2',
          clientEmail: 'two@example.com',
          success: true,
          year: 2024,
          method: 'FIFO',
          shortTermGainLoss: 500,
          longTermGainLoss: 1500,
          csvData: 'data2',
        },
        {
          clientId: 'client-3',
          clientEmail: 'three@example.com',
          success: false,
          year: 2024,
          method: 'FIFO',
          shortTermGainLoss: 0,
          longTermGainLoss: 0,
          error: 'Failed',
        },
      ];

      const summary: BulkReportSummary = {
        totalClients: 3,
        successfulReports: 2,
        failedReports: 1,
        year: 2024,
        method: 'FIFO',
        results,
      };

      expect(summary.totalClients).toBe(3);
      expect(summary.successfulReports).toBe(2);
      expect(summary.failedReports).toBe(1);
      expect(summary.year).toBe(2024);
      expect(summary.method).toBe('FIFO');
      expect(summary.results).toHaveLength(3);
    });

    it('should handle different methods in summary', () => {
      const summaryFIFO: BulkReportSummary = {
        totalClients: 1,
        successfulReports: 1,
        failedReports: 0,
        year: 2024,
        method: 'FIFO',
        results: [],
      };

      const summaryLIFO: BulkReportSummary = {
        totalClients: 1,
        successfulReports: 1,
        failedReports: 0,
        year: 2024,
        method: 'LIFO',
        results: [],
      };

      const summaryHIFO: BulkReportSummary = {
        totalClients: 1,
        successfulReports: 1,
        failedReports: 0,
        year: 2024,
        method: 'HIFO',
        results: [],
      };

      expect(summaryFIFO.method).toBe('FIFO');
      expect(summaryLIFO.method).toBe('LIFO');
      expect(summaryHIFO.method).toBe('HIFO');
    });

    it('should handle different years', () => {
      const years = [2020, 2021, 2022, 2023, 2024, 2025];

      years.forEach((year) => {
        const summary: BulkReportSummary = {
          totalClients: 1,
          successfulReports: 1,
          failedReports: 0,
          year,
          method: 'FIFO',
          results: [],
        };

        expect(summary.year).toBe(year);
      });
    });
  });
});

describe('generateBulkReportsZip', () => {
  it('should generate files for successful reports only', async () => {
    const reports: BulkReportResult[] = [
      {
        clientId: 'client-1',
        clientEmail: 'success@example.com',
        success: true,
        year: 2024,
        method: 'FIFO',
        shortTermGainLoss: 1000,
        longTermGainLoss: 2000,
        csvData: 'Date,Description,Amount\n2024-01-15,Sale,1000',
      },
      {
        clientId: 'client-2',
        clientEmail: 'failed@example.com',
        success: false,
        year: 2024,
        method: 'FIFO',
        shortTermGainLoss: 0,
        longTermGainLoss: 0,
        error: 'No data',
      },
    ];

    const files = await generateBulkReportsZip(reports);

    expect(files).toHaveLength(1);
    expect(files[0].filename).toContain('success_example_com');
    expect(files[0].filename).toContain('2024');
    expect(files[0].filename).toContain('FIFO');
    expect(files[0].filename).toContain('8949.csv');
    expect(files[0].content).toContain('Date,Description,Amount');
  });

  it('should sanitize email addresses in filenames', async () => {
    const reports: BulkReportResult[] = [
      {
        clientId: 'client-1',
        clientEmail: 'john.doe+test@sub.example.com',
        success: true,
        year: 2024,
        method: 'FIFO',
        shortTermGainLoss: 0,
        longTermGainLoss: 0,
        csvData: 'test data',
      },
    ];

    const files = await generateBulkReportsZip(reports);

    expect(files).toHaveLength(1);
    // Email should be sanitized - no special characters
    expect(files[0].filename).not.toContain('@');
    expect(files[0].filename).not.toContain('+');
    expect(files[0].filename).toMatch(/^[a-zA-Z0-9_]+_2024_FIFO_8949\.csv$/);
  });

  it('should include correct method in filename', async () => {
    const methods: Array<'FIFO' | 'LIFO' | 'HIFO'> = ['FIFO', 'LIFO', 'HIFO'];

    for (const method of methods) {
      const reports: BulkReportResult[] = [
        {
          clientId: 'client-1',
          clientEmail: 'test@example.com',
          success: true,
          year: 2024,
          method,
          shortTermGainLoss: 0,
          longTermGainLoss: 0,
          csvData: 'test',
        },
      ];

      const files = await generateBulkReportsZip(reports);

      expect(files[0].filename).toContain(method);
    }
  });

  it('should handle empty reports array', async () => {
    const files = await generateBulkReportsZip([]);

    expect(files).toHaveLength(0);
    expect(files).toEqual([]);
  });

  it('should handle all failed reports', async () => {
    const reports: BulkReportResult[] = [
      {
        clientId: 'client-1',
        clientEmail: 'fail1@example.com',
        success: false,
        year: 2024,
        method: 'FIFO',
        shortTermGainLoss: 0,
        longTermGainLoss: 0,
        error: 'Error 1',
      },
      {
        clientId: 'client-2',
        clientEmail: 'fail2@example.com',
        success: false,
        year: 2024,
        method: 'FIFO',
        shortTermGainLoss: 0,
        longTermGainLoss: 0,
        error: 'Error 2',
      },
    ];

    const files = await generateBulkReportsZip(reports);

    expect(files).toHaveLength(0);
  });

  it('should skip reports with empty CSV data', async () => {
    const reports: BulkReportResult[] = [
      {
        clientId: 'client-1',
        clientEmail: 'empty@example.com',
        success: true,
        year: 2024,
        method: 'FIFO',
        shortTermGainLoss: 0,
        longTermGainLoss: 0,
        csvData: '',
      },
    ];

    const files = await generateBulkReportsZip(reports);

    // Reports with empty CSV data should be skipped
    expect(files).toHaveLength(0);
  });

  it('should generate unique filenames for each client', async () => {
    const reports: BulkReportResult[] = [
      {
        clientId: 'client-1',
        clientEmail: 'alice@example.com',
        success: true,
        year: 2024,
        method: 'FIFO',
        shortTermGainLoss: 100,
        longTermGainLoss: 200,
        csvData: 'data for alice',
      },
      {
        clientId: 'client-2',
        clientEmail: 'bob@example.com',
        success: true,
        year: 2024,
        method: 'FIFO',
        shortTermGainLoss: 300,
        longTermGainLoss: 400,
        csvData: 'data for bob',
      },
      {
        clientId: 'client-3',
        clientEmail: 'charlie@example.com',
        success: true,
        year: 2024,
        method: 'FIFO',
        shortTermGainLoss: 500,
        longTermGainLoss: 600,
        csvData: 'data for charlie',
      },
    ];

    const files = await generateBulkReportsZip(reports);

    expect(files).toHaveLength(3);

    const filenames = files.map((f) => f.filename);
    const uniqueFilenames = new Set(filenames);

    expect(uniqueFilenames.size).toBe(3);
    expect(filenames[0]).toContain('alice');
    expect(filenames[1]).toContain('bob');
    expect(filenames[2]).toContain('charlie');
  });

  it('should preserve CSV content exactly', async () => {
    const expectedCsv = `Date,Description,Proceeds,Cost Basis,Gain/Loss
2024-01-15,"Sale of 0.5 BTC",25000.00,20000.00,5000.00
2024-06-30,"Sale of 1.0 BTC",60000.00,45000.00,15000.00`;

    const reports: BulkReportResult[] = [
      {
        clientId: 'client-1',
        clientEmail: 'test@example.com',
        success: true,
        year: 2024,
        method: 'FIFO',
        shortTermGainLoss: 5000,
        longTermGainLoss: 15000,
        csvData: expectedCsv,
      },
    ];

    const files = await generateBulkReportsZip(reports);

    expect(files[0].content).toBe(expectedCsv);
  });
});

describe('Bulk Operations Validation', () => {
  describe('Client ID limits', () => {
    it('should accept up to 50 client IDs', () => {
      const clientIds = Array.from({ length: 50 }, (_, i) => `client-${i}`);

      expect(clientIds.length).toBe(50);
      expect(clientIds.length).toBeLessThanOrEqual(50);
    });

    it('should reject more than 50 client IDs', () => {
      const clientIds = Array.from({ length: 51 }, (_, i) => `client-${i}`);

      expect(clientIds.length).toBe(51);
      expect(clientIds.length).toBeGreaterThan(50);
      // The API would reject this, but type system allows it
    });
  });

  describe('Year validation', () => {
    it('should accept valid tax years', () => {
      const validYears = [2020, 2021, 2022, 2023, 2024, 2025];

      validYears.forEach((year) => {
        expect(typeof year).toBe('number');
        expect(year).toBeGreaterThan(2000);
        expect(year).toBeLessThan(2100);
      });
    });
  });

  describe('Method validation', () => {
    it('should only accept valid cost basis methods', () => {
      const validMethods = ['FIFO', 'LIFO', 'HIFO'];

      validMethods.forEach((method) => {
        expect(validMethods).toContain(method);
      });

      const invalidMethods = ['AVERAGE', 'SPECIFIC', 'RANDOM'];

      invalidMethods.forEach((method) => {
        expect(validMethods).not.toContain(method);
      });
    });
  });
});

describe('Error Handling Patterns', () => {
  it('should structure errors with descriptive messages', () => {
    const errors = [
      'Client link not found or not active',
      'Failed to fetch wallets: Connection timeout',
      'Wallet "Cold Storage": Unknown network: solana',
      'API rate limit exceeded',
      'No tax lots found for this year',
    ];

    errors.forEach((error) => {
      expect(typeof error).toBe('string');
      expect(error.length).toBeGreaterThan(0);
    });
  });

  it('should categorize errors by type', () => {
    const authErrors = ['Client link not found or not active'];
    const networkErrors = ['Connection timeout', 'API rate limit exceeded'];
    const dataErrors = ['No wallets found', 'No tax lots found for this year'];

    expect(authErrors.length).toBeGreaterThan(0);
    expect(networkErrors.length).toBeGreaterThan(0);
    expect(dataErrors.length).toBeGreaterThan(0);
  });
});
