import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from '@react-pdf/renderer';
import type { AdvisorProfile } from '@/lib/advisor/types';

// Types for report data
export interface TaxLotEntry {
  asset: string;
  amount: number;
  acquisitionDate: string;
  disposalDate: string;
  proceeds: number;
  costBasis: number;
  gainLoss: number;
  holdingPeriod: 'short' | 'long';
}

export interface TaxReportData {
  year: number;
  method: 'FIFO' | 'LIFO' | 'HIFO';
  shortTermGains: number;
  shortTermLosses: number;
  longTermGains: number;
  longTermLosses: number;
  netGainLoss: number;
  totalProceeds: number;
  totalCostBasis: number;
  transactions: TaxLotEntry[];
}

interface TaxReportProps {
  branding: AdvisorProfile | null;
  data: TaxReportData;
  clientName: string;
  reportTitle: string;
}

const DEFAULT_PRIMARY = '#F7931A';
const DEFAULT_SECONDARY = '#1a1a2e';

// Create styles dynamically based on branding
function createStyles(branding: AdvisorProfile | null) {
  const primary = branding?.primary_color || DEFAULT_PRIMARY;
  const secondary = branding?.secondary_color || DEFAULT_SECONDARY;

  return StyleSheet.create({
    page: {
      padding: 40,
      fontFamily: 'Helvetica',
      fontSize: 10,
      color: '#333',
    },
    header: {
      flexDirection: 'row',
      marginBottom: 30,
      paddingBottom: 15,
      borderBottomWidth: 2,
      borderBottomColor: primary,
      alignItems: 'flex-end',
    },
    logo: {
      width: 80,
      height: 40,
      objectFit: 'contain',
      marginRight: 15,
    },
    firmInfo: {
      flex: 1,
    },
    firmName: {
      fontSize: 16,
      fontWeight: 'bold',
      color: secondary,
      marginBottom: 2,
    },
    firmContact: {
      fontSize: 8,
      color: '#666',
    },
    reportDate: {
      fontSize: 8,
      color: '#666',
      textAlign: 'right',
    },
    titleSection: {
      marginBottom: 25,
      alignItems: 'center',
    },
    title: {
      fontSize: 18,
      fontWeight: 'bold',
      color: primary,
      marginBottom: 5,
    },
    subtitle: {
      fontSize: 12,
      color: '#666',
    },
    clientInfo: {
      marginBottom: 20,
      padding: 10,
      backgroundColor: '#f5f5f5',
      borderRadius: 4,
    },
    clientLabel: {
      fontSize: 9,
      color: '#666',
      marginBottom: 2,
    },
    clientName: {
      fontSize: 12,
      fontWeight: 'bold',
    },
    summarySection: {
      marginBottom: 25,
    },
    sectionTitle: {
      fontSize: 12,
      fontWeight: 'bold',
      color: secondary,
      marginBottom: 10,
      paddingBottom: 5,
      borderBottomWidth: 1,
      borderBottomColor: '#ddd',
    },
    summaryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    summaryItem: {
      width: '50%',
      paddingRight: 10,
      marginBottom: 10,
    },
    summaryLabel: {
      fontSize: 8,
      color: '#666',
      marginBottom: 2,
    },
    summaryValue: {
      fontSize: 12,
      fontWeight: 'bold',
    },
    gainValue: {
      color: '#16a34a',
    },
    lossValue: {
      color: '#dc2626',
    },
    table: {
      marginTop: 10,
    },
    tableHeader: {
      flexDirection: 'row',
      backgroundColor: secondary,
      padding: 8,
      marginBottom: 1,
    },
    tableHeaderCell: {
      color: '#fff',
      fontSize: 8,
      fontWeight: 'bold',
    },
    tableRow: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: '#eee',
      padding: 8,
    },
    tableRowAlt: {
      backgroundColor: '#fafafa',
    },
    tableCell: {
      fontSize: 8,
    },
    colAsset: { width: '10%' },
    colAmount: { width: '15%', textAlign: 'right' },
    colDate: { width: '12%' },
    colProceeds: { width: '15%', textAlign: 'right' },
    colBasis: { width: '15%', textAlign: 'right' },
    colGain: { width: '15%', textAlign: 'right' },
    colPeriod: { width: '8%', textAlign: 'center' },
    footer: {
      position: 'absolute',
      bottom: 30,
      left: 40,
      right: 40,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: '#ddd',
    },
    footerText: {
      fontSize: 7,
      color: '#666',
      marginBottom: 5,
    },
    pageNumber: {
      fontSize: 8,
      color: '#999',
      textAlign: 'center',
    },
    disclaimer: {
      marginTop: 20,
      padding: 10,
      backgroundColor: '#fff9e6',
      borderRadius: 4,
    },
    disclaimerText: {
      fontSize: 8,
      color: '#666',
    },
  });
}

function formatCurrency(amount: number): string {
  const formatted = Math.abs(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return amount < 0 ? `($${formatted})` : `$${formatted}`;
}

function formatBtc(amount: number): string {
  return amount.toFixed(8);
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function TaxReportPDF({
  branding,
  data,
  clientName,
  reportTitle,
}: TaxReportProps) {
  const styles = createStyles(branding);
  const generatedDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Construct logo URL if available
  const logoUrl = branding?.logo_path
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/advisor-assets/${branding.logo_path}`
    : null;

  // Format address
  const addressParts = [
    branding?.address_line_1,
    branding?.address_line_2,
    [branding?.city, branding?.state, branding?.postal_code]
      .filter(Boolean)
      .join(', '),
    branding?.country,
  ].filter(Boolean);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image doesn't use alt */}
          {logoUrl && <Image src={logoUrl} style={styles.logo} />}
          <View style={styles.firmInfo}>
            <Text style={styles.firmName}>
              {branding?.firm_name || 'Self Custody Tax'}
            </Text>
            {branding?.contact_email && (
              <Text style={styles.firmContact}>{branding.contact_email}</Text>
            )}
            {branding?.contact_phone && (
              <Text style={styles.firmContact}>{branding.contact_phone}</Text>
            )}
          </View>
          <View>
            <Text style={styles.reportDate}>Generated: {generatedDate}</Text>
          </View>
        </View>

        {/* Title */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>{reportTitle}</Text>
          <Text style={styles.subtitle}>
            Form 8949 Summary - {data.method} Method
          </Text>
        </View>

        {/* Client Info */}
        <View style={styles.clientInfo}>
          <Text style={styles.clientLabel}>Prepared for:</Text>
          <Text style={styles.clientName}>{clientName}</Text>
        </View>

        {/* Summary */}
        <View style={styles.summarySection}>
          <Text style={styles.sectionTitle}>Tax Summary</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Short-Term Gains</Text>
              <Text style={[styles.summaryValue, styles.gainValue]}>
                {formatCurrency(data.shortTermGains)}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Short-Term Losses</Text>
              <Text style={[styles.summaryValue, styles.lossValue]}>
                {formatCurrency(data.shortTermLosses)}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Long-Term Gains</Text>
              <Text style={[styles.summaryValue, styles.gainValue]}>
                {formatCurrency(data.longTermGains)}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Long-Term Losses</Text>
              <Text style={[styles.summaryValue, styles.lossValue]}>
                {formatCurrency(data.longTermLosses)}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Proceeds</Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(data.totalProceeds)}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Cost Basis</Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(data.totalCostBasis)}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Net Gain/Loss</Text>
              <Text
                style={[
                  styles.summaryValue,
                  data.netGainLoss >= 0 ? styles.gainValue : styles.lossValue,
                ]}
              >
                {formatCurrency(data.netGainLoss)}
              </Text>
            </View>
          </View>
        </View>

        {/* Transactions Table */}
        {data.transactions.length > 0 && (
          <View style={styles.table}>
            <Text style={styles.sectionTitle}>
              Disposed Assets ({data.transactions.length})
            </Text>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, styles.colAsset]}>
                Asset
              </Text>
              <Text style={[styles.tableHeaderCell, styles.colAmount]}>
                Amount
              </Text>
              <Text style={[styles.tableHeaderCell, styles.colDate]}>
                Acquired
              </Text>
              <Text style={[styles.tableHeaderCell, styles.colDate]}>Sold</Text>
              <Text style={[styles.tableHeaderCell, styles.colProceeds]}>
                Proceeds
              </Text>
              <Text style={[styles.tableHeaderCell, styles.colBasis]}>
                Cost Basis
              </Text>
              <Text style={[styles.tableHeaderCell, styles.colGain]}>
                Gain/Loss
              </Text>
              <Text style={[styles.tableHeaderCell, styles.colPeriod]}>
                Term
              </Text>
            </View>
            {data.transactions.slice(0, 20).map((tx, index) => (
              <View
                key={index}
                style={[
                  styles.tableRow,
                  index % 2 === 1 ? styles.tableRowAlt : {},
                ]}
              >
                <Text style={[styles.tableCell, styles.colAsset]}>
                  {tx.asset}
                </Text>
                <Text style={[styles.tableCell, styles.colAmount]}>
                  {formatBtc(tx.amount)}
                </Text>
                <Text style={[styles.tableCell, styles.colDate]}>
                  {formatDate(tx.acquisitionDate)}
                </Text>
                <Text style={[styles.tableCell, styles.colDate]}>
                  {formatDate(tx.disposalDate)}
                </Text>
                <Text style={[styles.tableCell, styles.colProceeds]}>
                  {formatCurrency(tx.proceeds)}
                </Text>
                <Text style={[styles.tableCell, styles.colBasis]}>
                  {formatCurrency(tx.costBasis)}
                </Text>
                <Text
                  style={[
                    styles.tableCell,
                    styles.colGain,
                    tx.gainLoss >= 0 ? styles.gainValue : styles.lossValue,
                  ]}
                >
                  {formatCurrency(tx.gainLoss)}
                </Text>
                <Text style={[styles.tableCell, styles.colPeriod]}>
                  {tx.holdingPeriod === 'short' ? 'ST' : 'LT'}
                </Text>
              </View>
            ))}
            {data.transactions.length > 20 && (
              <View style={styles.tableRow}>
                <Text style={styles.tableCell}>
                  ... and {data.transactions.length - 20} more transactions
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            This report is for informational purposes only and does not
            constitute tax advice. Consult a qualified tax professional for
            advice specific to your situation. Calculations are based on the{' '}
            {data.method} cost basis method.
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          {branding?.footer_text && (
            <Text style={styles.footerText}>{branding.footer_text}</Text>
          )}
          {addressParts.length > 0 && (
            <Text style={styles.footerText}>{addressParts.join(' | ')}</Text>
          )}
          <Text
            style={styles.pageNumber}
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} of ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
