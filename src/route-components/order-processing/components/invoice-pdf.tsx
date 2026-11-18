import { Document, Font, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import { amountInWords } from '@/lib/amount-in-words'
import { type InvoiceSupplier } from '../constants'

// The built-in PDF fonts have no Cyrillic.
Font.register({
  family: 'Roboto',
  fonts: [
    { src: '/fonts/Roboto-Regular.ttf' },
    { src: '/fonts/Roboto-Bold.ttf', fontWeight: 'bold' },
  ],
})
// The default hyphenation is English — it would break Ukrainian words.
Font.registerHyphenationCallback(word => [word])

export type InvoiceParty = { name: string; code: string }

export type InvoiceData = {
  supplier:    InvoiceSupplier
  recipient:   InvoiceParty
  payer:       InvoiceParty
  orderNumber: string
  date:        string
  contract:    string
  lines:       { name: string; unit: string; quantity: number; price: number; sum: number }[]
  total:       number
  // The saved invoice a waybill refers to — its own number and date otherwise.
  invoiceRef?: { orderNumber: string; date: string }
}

// Group spaces as plain non-breaking ones — the font may lack U+202F.
export const formatMoney = (value: number) =>
  value.toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/\s/g, ' ')

const BORDER = '1pt solid #000'

const COLUMNS = [
  { key: 'no',       label: '№',            width: '5%',  align: 'center' },
  { key: 'name',     label: 'Назва',        width: '45%', align: 'center' },
  { key: 'unit',     label: 'Од.',          width: '7%',  align: 'center' },
  { key: 'quantity', label: 'Кількість',    width: '13%', align: 'center' },
  { key: 'price',    label: 'Ціна без ПДВ', width: '15%', align: 'center' },
  { key: 'sum',      label: 'Сума без ПДВ', width: '15%', align: 'center' },
] as const

const styles = StyleSheet.create({
  page:       { paddingVertical: 48, paddingHorizontal: 44, fontFamily: 'Roboto', fontSize: 10.5, lineHeight: 1.3 },
  party:      { flexDirection: 'row', marginBottom: 12 },
  partyLabel: { width: 110, paddingRight: 12, alignSelf: 'center', textAlign: 'right', fontWeight: 'bold', textDecoration: 'underline' },
  partyValue: { flex: 1 },
  titleRow:   { flexDirection: 'row', alignItems: 'flex-start', marginTop: 4 },
  title:      { flex: 1, paddingLeft: 110, fontWeight: 'bold' },
  contract:   { width: 170, fontWeight: 'bold' },
  date:       { paddingLeft: 190, marginTop: 4, marginBottom: 6, fontWeight: 'bold' },
  row:        { flexDirection: 'row' },
  headCell:   { backgroundColor: '#8c8c8c', fontWeight: 'bold', paddingVertical: 2, paddingHorizontal: 3 },
  cell:       { paddingVertical: 8, paddingHorizontal: 3 },
  totalLabel: { fontWeight: 'bold', textAlign: 'center', paddingVertical: 3 },
  totalValue: { fontWeight: 'bold', textAlign: 'center', paddingVertical: 3 },
  words:      { marginTop: 22 },
  signature:  { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'flex-end', marginTop: 28 },
  signLine:   { width: 170, marginLeft: 12, borderBottom: BORDER },
})

const cellBorders = (index: number, isFirstRow: boolean) => ({
  borderLeft:   index === 0 ? BORDER : undefined,
  borderRight:  BORDER,
  borderBottom: BORDER,
  borderTop:    isFirstRow ? BORDER : undefined,
})

const Party = ({ label, lines }: { label: string; lines: string[] }) => (
  <View style={styles.party} wrap={false}>
    <Text style={styles.partyLabel}>{label}</Text>
    <View style={styles.partyValue}>
      {lines.map((line, i) => <Text key={i}>{line}</Text>)}
    </View>
  </View>
)

const ItemsTable = ({ data, cellStyle }: { data: InvoiceData; cellStyle: (typeof styles)['cell'] }) => (
  <View>
    <View style={styles.row} wrap={false}>
      {COLUMNS.map((col, i) => (
        <Text key={col.key} style={[styles.headCell, cellBorders(i, true), { width: col.width, textAlign: col.align }]}>
          {col.label}
        </Text>
      ))}
    </View>
    {data.lines.map((line, index) => (
      <View key={index} style={styles.row} wrap={false}>
        {COLUMNS.map((col, i) => (
          <Text key={col.key} style={[cellStyle, cellBorders(i, false), { width: col.width, textAlign: col.align }]}>
            {cellText(line, index, col.key)}
          </Text>
        ))}
      </View>
    ))}
    <View style={styles.row} wrap={false}>
      {/* The line left of "Всього" sits where the column line above does — at the end of the 70%. */}
      <View style={{ width: '70%', borderRight: BORDER }} />
      <Text style={[styles.totalLabel, cellBorders(1, false), { width: '15%' }]}>Всього</Text>
      <Text style={[styles.totalValue, cellBorders(1, false), { width: '15%' }]}>{formatMoney(data.total)}</Text>
    </View>
  </View>
)

const cellText = (line: InvoiceData['lines'][number], index: number, key: (typeof COLUMNS)[number]['key']) => ({
  no:       String(index + 1),
  name:     line.name,
  unit:     line.unit,
  quantity: String(line.quantity).replace('.', ','),
  price:    formatMoney(line.price),
  sum:      formatMoney(line.sum),
})[key]

const partyLines = (party: InvoiceParty) => [party.name, party.code && `ЄДРПОУ ${party.code}`].filter(Boolean)

const supplierLines = (supplier: InvoiceSupplier) =>
  [supplier.name, `IBAN: ${supplier.iban}`, `в ${supplier.bank}`, `МФО ${supplier.mfo}`, `ЄДРПОУ: ${supplier.code}`]

export const InvoicePdf = ({ data }: { data: InvoiceData }) => {
  const { supplier, recipient, payer } = data

  return (
    <Document title={`Рахунок № ${data.orderNumber} від ${data.date}`}>
      <Page size="A4" style={styles.page}>
        <Party
          label="Постачальник"
          lines={supplierLines(supplier)}
        />
        <Party label="Одержувач" lines={partyLines(recipient)} />
        <Party
          label="Платник"
          lines={partyLines(payer)}
        />

        <View style={styles.titleRow}>
          <Text style={styles.title}>{`Рахунок по замовленню № ${data.orderNumber}`}</Text>
          {!!data.contract && <Text style={styles.contract}>{data.contract}</Text>}
        </View>
        <Text style={styles.date}>{`від ${data.date}`}</Text>

        <ItemsTable data={data} cellStyle={styles.cell} />

        <View style={styles.words} wrap={false}>
          <Text>Всього на суму:</Text>
          <Text style={{ fontWeight: 'bold' }}>{`${amountInWords(data.total)}. Без ПДВ.`}</Text>
        </View>

        <View style={styles.signature} wrap={false}>
          <Text>Виписав(ла):</Text>
          <View style={styles.signLine} />
        </View>
      </Page>
    </Document>
  )
}

const waybillStyles = StyleSheet.create({
  title:      { flexDirection: 'row', paddingBottom: 4, borderBottom: '2pt solid #000', fontSize: 13, fontWeight: 'bold' },
  box:        { marginTop: 18, marginBottom: 18, borderTop: BORDER, borderLeft: BORDER },
  boxRow:     { flexDirection: 'row', borderBottom: BORDER, borderRight: BORDER },
  boxLabel:   { width: 125, paddingVertical: 2, borderRight: BORDER, alignSelf: 'stretch', justifyContent: 'center' },
  boxLabelText: { textAlign: 'center', fontWeight: 'bold', textDecoration: 'underline' },
  boxValue:   { flex: 1, paddingVertical: 2, paddingHorizontal: 4 },
  cell:       { paddingVertical: 2, paddingHorizontal: 3 },
  words:      { marginTop: 6, paddingBottom: 18, borderBottom: '1.5pt solid #000', fontWeight: 'bold' },
  signs:      { flexDirection: 'row', marginTop: 18 },
  sign:       { width: '50%', gap: 22 },
})

const BoxRow = ({ label, lines, bold }: { label: string; lines: string[]; bold?: boolean }) => (
  <View style={waybillStyles.boxRow} wrap={false}>
    <View style={waybillStyles.boxLabel}><Text style={waybillStyles.boxLabelText}>{label}</Text></View>
    <View style={waybillStyles.boxValue}>
      {lines.map((line, i) => <Text key={i} style={bold ? { fontWeight: 'bold' } : undefined}>{line}</Text>)}
    </View>
  </View>
)

// Видаткова накладна — from the same data as the invoice; the buyer is its recipient.
export const WaybillPdf = ({ data }: { data: InvoiceData }) => (
  <Document title={`Видаткова накладна № ${data.orderNumber} від ${data.date}`}>
    <Page size="A4" style={styles.page}>
      <View style={waybillStyles.title}>
        <Text style={{ flex: 1 }}>{`Видаткова накладна № ${data.orderNumber} від ${data.date}`}</Text>
      </View>

      <View style={waybillStyles.box}>
        <BoxRow label="Постачальник:" lines={supplierLines(data.supplier)} />
        <BoxRow label="Покупець:" lines={partyLines(data.recipient)} />
        <BoxRow label="Розр. док.:" lines={[`рахунок на оплату № ${data.invoiceRef?.orderNumber ?? data.orderNumber} від ${data.invoiceRef?.date ?? data.date}`]} bold />
      </View>

      <ItemsTable data={data} cellStyle={waybillStyles.cell} />

      <Text style={waybillStyles.words}>{`${amountInWords(data.total)}. Без ПДВ.`}</Text>

      <View style={waybillStyles.signs} wrap={false}>
        <View style={waybillStyles.sign}>
          <Text>Передав(ла):</Text>
          <Text>{data.supplier.name}</Text>
        </View>
        <View style={waybillStyles.sign}>
          <Text>Отримав(ла):</Text>
        </View>
      </View>
    </Page>
  </Document>
)
