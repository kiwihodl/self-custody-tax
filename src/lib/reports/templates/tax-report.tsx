import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer';

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
  data: TaxReportData;
  reportTitle: string;
}

const PRIMARY = '#FBDC7B';

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10, color: '#333' },
  header: { marginBottom: 30, paddingBottom: 15, borderBottomWidth: 2, borderBottomColor: PRIMARY },
  title: { fontSize: 18, fontWeight: 'bold', color: '#1a1a2e', marginBottom: 4 },
  subtitle: { fontSize: 10, color: '#666' },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 12, fontWeight: 'bold', color: '#1a1a2e', marginBottom: 8, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: '#eee' },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  summaryItem: { width: '30%', padding: 8, backgroundColor: '#f8f8f8', borderRadius: 4 },
  summaryLabel: { fontSize: 8, color: '#666', marginBottom: 2 },
  summaryValue: { fontSize: 14, fontWeight: 'bold', color: '#1a1a2e' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#1a1a2e', padding: 6, borderRadius: 2 },
  tableHeaderText: { color: '#fff', fontSize: 8, fontWeight: 'bold' },
  tableRow: { flexDirection: 'row', padding: 6, borderBottomWidth: 1, borderBottomColor: '#eee' },
  tableCell: { fontSize: 8 },
  col1: { width: '10%' },
  col2: { width: '12%' },
  col3: { width: '14%' },
  col4: { width: '14%' },
  col5: { width: '14%' },
  col6: { width: '14%' },
  col7: { width: '14%' },
  col8: { width: '8%' },
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, flexDirection: 'row', justifyContent: 'space-between', fontSize: 8, color: '#999' },
  gain: { color: '#16a34a' },
  loss: { color: '#dc2626' },
});

function formatUSD(n: number): string {
  return '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function TaxReportPDF({ data, reportTitle }: TaxReportProps) {
  const shortTerm = data.transactions.filter(t => t.holdingPeriod === 'short');
  const longTerm = data.transactions.filter(t => t.holdingPeriod === 'long');

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{reportTitle}</Text>
          <Text style={styles.subtitle}>
            Generated {new Date().toLocaleDateString('en-US')} · Method: {data.method} · Self Custody Tax
          </Text>
        </View>

        {/* Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Summary</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Short-Term Gains</Text>
              <Text style={[styles.summaryValue, styles.gain]}>{formatUSD(data.shortTermGains)}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Short-Term Losses</Text>
              <Text style={[styles.summaryValue, styles.loss]}>({formatUSD(data.shortTermLosses)})</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Long-Term Gains</Text>
              <Text style={[styles.summaryValue, styles.gain]}>{formatUSD(data.longTermGains)}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Long-Term Losses</Text>
              <Text style={[styles.summaryValue, styles.loss]}>({formatUSD(data.longTermLosses)})</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Net Gain/Loss</Text>
              <Text style={[styles.summaryValue, data.netGainLoss >= 0 ? styles.gain : styles.loss]}>
                {data.netGainLoss >= 0 ? '' : '-'}{formatUSD(data.netGainLoss)}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Disposals</Text>
              <Text style={styles.summaryValue}>{data.transactions.length}</Text>
            </View>
          </View>
        </View>

        {/* Short-Term */}
        {shortTerm.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Part I — Short-Term Capital Gains and Losses</Text>
            <TransactionTable entries={shortTerm} />
          </View>
        )}

        {/* Long-Term */}
        {longTerm.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Part II — Long-Term Capital Gains and Losses</Text>
            <TransactionTable entries={longTerm} />
          </View>
        )}

        <View style={styles.footer} fixed>
          <Text>Self Custody Tax · {data.year} Tax Report</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

function TransactionTable({ entries }: { entries: TaxLotEntry[] }) {
  return (
    <View>
      <View style={styles.tableHeader}>
        <Text style={[styles.tableHeaderText, styles.col1]}>Asset</Text>
        <Text style={[styles.tableHeaderText, styles.col2]}>Amount</Text>
        <Text style={[styles.tableHeaderText, styles.col3]}>Acquired</Text>
        <Text style={[styles.tableHeaderText, styles.col4]}>Sold</Text>
        <Text style={[styles.tableHeaderText, styles.col5]}>Proceeds</Text>
        <Text style={[styles.tableHeaderText, styles.col6]}>Cost Basis</Text>
        <Text style={[styles.tableHeaderText, styles.col7]}>Gain/Loss</Text>
        <Text style={[styles.tableHeaderText, styles.col8]}>Term</Text>
      </View>
      {entries.map((entry, i) => (
        <View key={i} style={styles.tableRow}>
          <Text style={[styles.tableCell, styles.col1]}>{entry.asset}</Text>
          <Text style={[styles.tableCell, styles.col2]}>{entry.amount.toFixed(8)}</Text>
          <Text style={[styles.tableCell, styles.col3]}>{entry.acquisitionDate}</Text>
          <Text style={[styles.tableCell, styles.col4]}>{entry.disposalDate}</Text>
          <Text style={[styles.tableCell, styles.col5]}>{formatUSD(entry.proceeds)}</Text>
          <Text style={[styles.tableCell, styles.col6]}>{formatUSD(entry.costBasis)}</Text>
          <Text style={[styles.tableCell, styles.col7, entry.gainLoss >= 0 ? styles.gain : styles.loss]}>
            {entry.gainLoss >= 0 ? '' : '-'}{formatUSD(entry.gainLoss)}
          </Text>
          <Text style={[styles.tableCell, styles.col8]}>{entry.holdingPeriod === 'short' ? 'ST' : 'LT'}</Text>
        </View>
      ))}
    </View>
  );
}
