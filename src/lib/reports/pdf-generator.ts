import { renderToBuffer } from '@react-pdf/renderer';
import { TaxReportPDF, type TaxReportData } from './templates/tax-report';

export interface GeneratePDFOptions {
  data: TaxReportData;
  reportTitle?: string;
}

/**
 * Generate a tax report PDF
 */
export async function generateTaxReportPDF(
  options: GeneratePDFOptions
): Promise<Buffer> {
  const { data, reportTitle } = options;

  const doc = TaxReportPDF({
    data,
    reportTitle: reportTitle || `Tax Report ${data.year}`,
  });

  const buffer = await renderToBuffer(doc);
  return Buffer.from(buffer);
}

export function formatReportDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
}

export function formatBTC(amount: number): string {
  return amount.toLocaleString('en-US', { minimumFractionDigits: 8, maximumFractionDigits: 8 }) + ' BTC';
}
