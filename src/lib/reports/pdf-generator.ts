import { renderToBuffer } from '@react-pdf/renderer';
import type { AdvisorProfile } from '@/lib/advisor/types';
import { TaxReportPDF, type TaxReportData } from './templates/tax-report';

export interface GeneratePDFOptions {
  branding: AdvisorProfile | null;
  data: TaxReportData;
  clientName: string;
  reportTitle?: string;
}

/**
 * Generate a branded tax report PDF
 */
export async function generateTaxReportPDF(
  options: GeneratePDFOptions
): Promise<Buffer> {
  const { branding, data, clientName, reportTitle } = options;

  const doc = TaxReportPDF({
    branding,
    data,
    clientName,
    reportTitle: reportTitle || `Tax Report ${data.year}`,
  });

  const buffer = await renderToBuffer(doc);
  return Buffer.from(buffer);
}

/**
 * Get the public URL for a logo stored in Supabase
 */
export function getLogoUrl(logoPath: string): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return `${supabaseUrl}/storage/v1/object/public/advisor-assets/${logoPath}`;
}

/**
 * Format a date for display in reports
 */
export function formatReportDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Format currency for reports
 */
export function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format BTC for reports
 */
export function formatBTC(amount: number): string {
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: 8,
    maximumFractionDigits: 8,
  }) + ' BTC';
}
