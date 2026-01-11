// Bulk operations for advisor dashboard
// Handles sync and report generation for multiple clients

import { createClient } from '@/lib/supabase/server';
import { syncBitcoinWallet } from '@/lib/bitcoin/sync';
import { syncEthereumWallet } from '@/lib/ethereum/sync';
import { createTaxLotsForWallet, processSendTransactions } from '@/lib/tax/lots';
import { getTaxSummary, formatAs8949CSV } from '@/lib/tax/reporting';
import { logAdvisorAction, AuditActions } from './audit';

// Types
export interface BulkSyncResult {
  clientId: string;
  clientEmail: string;
  success: boolean;
  walletsProcessed: number;
  totalNewTransactions: number;
  errors: string[];
}

export interface BulkSyncSummary {
  totalClients: number;
  successfulClients: number;
  failedClients: number;
  totalWallets: number;
  totalNewTransactions: number;
  results: BulkSyncResult[];
}

export interface BulkReportResult {
  clientId: string;
  clientEmail: string;
  success: boolean;
  year: number;
  method: string;
  shortTermGainLoss: number;
  longTermGainLoss: number;
  csvData?: string;
  error?: string;
}

export interface BulkReportSummary {
  totalClients: number;
  successfulReports: number;
  failedReports: number;
  year: number;
  method: string;
  results: BulkReportResult[];
}

/**
 * Bulk sync wallets for multiple clients
 */
export async function bulkSyncClients(
  advisorId: string,
  clientLinkIds: string[],
  requestInfo?: { ipAddress?: string; userAgent?: string }
): Promise<BulkSyncSummary> {
  const supabase = await createClient();
  const results: BulkSyncResult[] = [];
  let totalWallets = 0;
  let totalNewTransactions = 0;

  // Process clients sequentially to avoid rate limiting
  for (const linkId of clientLinkIds) {
    // Get client info from advisor_clients link
    const { data: link } = await supabase
      .from('advisor_clients')
      .select('client_id, client_email, permission_level')
      .eq('id', linkId)
      .eq('advisor_id', advisorId)
      .eq('status', 'active')
      .single();

    if (!link || !link.client_id) {
      results.push({
        clientId: linkId,
        clientEmail: 'Unknown',
        success: false,
        walletsProcessed: 0,
        totalNewTransactions: 0,
        errors: ['Client link not found or not active'],
      });
      continue;
    }

    const clientResult: BulkSyncResult = {
      clientId: link.client_id,
      clientEmail: link.client_email,
      success: true,
      walletsProcessed: 0,
      totalNewTransactions: 0,
      errors: [],
    };

    try {
      // Get client's wallets
      const { data: wallets, error: walletsError } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', link.client_id)
        .eq('is_deleted', false);

      if (walletsError) {
        throw new Error(`Failed to fetch wallets: ${walletsError.message}`);
      }

      if (!wallets || wallets.length === 0) {
        clientResult.errors.push('No wallets found');
        results.push(clientResult);
        continue;
      }

      // Sync each wallet
      for (const wallet of wallets) {
        try {
          let newTxCount = 0;

          if (wallet.network === 'bitcoin') {
            const syncResult = await syncBitcoinWallet(supabase, wallet);
            if (syncResult.success) {
              clientResult.walletsProcessed++;
              newTxCount = syncResult.newTransactions || 0;
            } else {
              clientResult.errors.push(
                `Wallet ${wallet.name}: ${syncResult.error || 'Sync failed'}`
              );
            }
          } else if (wallet.network === 'ethereum') {
            const syncResult = await syncEthereumWallet(supabase, wallet);
            if (syncResult.success) {
              clientResult.walletsProcessed++;
              newTxCount = syncResult.transactionsAdded || 0;
            } else {
              clientResult.errors.push(
                `Wallet ${wallet.name}: ${syncResult.error || 'Sync failed'}`
              );
            }
          } else {
            clientResult.errors.push(`Unknown network: ${wallet.network}`);
            continue;
          }

          clientResult.totalNewTransactions += newTxCount;
        } catch (walletError) {
          clientResult.errors.push(
            `Wallet ${wallet.name}: ${walletError instanceof Error ? walletError.message : 'Unknown error'}`
          );
        }
      }

      totalWallets += clientResult.walletsProcessed;
      totalNewTransactions += clientResult.totalNewTransactions;

      if (clientResult.errors.length > 0 && clientResult.walletsProcessed === 0) {
        clientResult.success = false;
      }
    } catch (error) {
      clientResult.success = false;
      clientResult.errors.push(
        error instanceof Error ? error.message : 'Unknown error'
      );
    }

    results.push(clientResult);

    // Log audit entry
    logAdvisorAction({
      advisorId,
      clientId: link.client_id,
      action: AuditActions.TRIGGERED_SYNC,
      category: 'sync',
      details: {
        bulk: true,
        walletsProcessed: clientResult.walletsProcessed,
        newTransactions: clientResult.totalNewTransactions,
        success: clientResult.success,
      },
      ...requestInfo,
    });
  }

  const successfulClients = results.filter((r) => r.success).length;

  return {
    totalClients: clientLinkIds.length,
    successfulClients,
    failedClients: clientLinkIds.length - successfulClients,
    totalWallets,
    totalNewTransactions,
    results,
  };
}

/**
 * Bulk generate tax reports for multiple clients
 */
export async function bulkGenerateReports(
  advisorId: string,
  clientLinkIds: string[],
  year: number,
  method: 'FIFO' | 'LIFO' | 'HIFO' = 'FIFO',
  requestInfo?: { ipAddress?: string; userAgent?: string }
): Promise<BulkReportSummary> {
  const supabase = await createClient();
  const results: BulkReportResult[] = [];

  for (const linkId of clientLinkIds) {
    // Get client info
    const { data: link } = await supabase
      .from('advisor_clients')
      .select('client_id, client_email, permission_level')
      .eq('id', linkId)
      .eq('advisor_id', advisorId)
      .eq('status', 'active')
      .single();

    if (!link || !link.client_id) {
      results.push({
        clientId: linkId,
        clientEmail: 'Unknown',
        success: false,
        year,
        method,
        shortTermGainLoss: 0,
        longTermGainLoss: 0,
        error: 'Client link not found or not active',
      });
      continue;
    }

    try {
      // Get client's wallets for tax lot processing
      const { data: wallets } = await supabase
        .from('wallets')
        .select('id')
        .eq('user_id', link.client_id)
        .eq('is_deleted', false);

      // Process tax lots for each wallet
      for (const wallet of wallets || []) {
        await createTaxLotsForWallet(supabase, wallet.id);
        await processSendTransactions(supabase, wallet.id, method);
      }

      // Get tax summary
      const summary = await getTaxSummary(supabase, link.client_id, year, method);

      // Get disposed tax lots for CSV
      const { data: taxLots } = await supabase
        .from('tax_lots')
        .select('*')
        .eq('user_id', link.client_id)
        .eq('is_disposed', true)
        .gte('disposal_date', `${year}-01-01`)
        .lte('disposal_date', `${year}-12-31`)
        .order('disposal_date', { ascending: true });

      // Generate CSV
      const csvData = formatAs8949CSV(taxLots || []);

      results.push({
        clientId: link.client_id,
        clientEmail: link.client_email,
        success: true,
        year,
        method,
        shortTermGainLoss: summary.shortTerm.gainLoss,
        longTermGainLoss: summary.longTerm.gainLoss,
        csvData,
      });

      // Log audit entry
      logAdvisorAction({
        advisorId,
        clientId: link.client_id,
        action: AuditActions.BULK_GENERATED_REPORTS,
        category: 'report',
        details: {
          year,
          method,
          shortTermGainLoss: summary.shortTerm.gainLoss,
          longTermGainLoss: summary.longTerm.gainLoss,
        },
        ...requestInfo,
      });
    } catch (error) {
      results.push({
        clientId: link.client_id,
        clientEmail: link.client_email,
        success: false,
        year,
        method,
        shortTermGainLoss: 0,
        longTermGainLoss: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  const successfulReports = results.filter((r) => r.success).length;

  return {
    totalClients: clientLinkIds.length,
    successfulReports,
    failedReports: clientLinkIds.length - successfulReports,
    year,
    method,
    results,
  };
}

/**
 * Generate ZIP file containing all client reports
 */
export async function generateBulkReportsZip(
  reports: BulkReportResult[]
): Promise<{ filename: string; content: string }[]> {
  const files: { filename: string; content: string }[] = [];

  for (const report of reports) {
    if (report.success && report.csvData) {
      // Sanitize email for filename
      const safeEmail = report.clientEmail.replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `${safeEmail}_${report.year}_${report.method}_8949.csv`;
      files.push({ filename, content: report.csvData });
    }
  }

  return files;
}
