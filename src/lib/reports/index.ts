export {
  generateTaxReportPDF,
  getLogoUrl,
  formatReportDate,
  formatUSD,
  formatBTC,
} from './pdf-generator';

export type { GeneratePDFOptions } from './pdf-generator';

export { TaxReportPDF } from './templates/tax-report';

export type { TaxReportData, TaxLotEntry } from './templates/tax-report';
