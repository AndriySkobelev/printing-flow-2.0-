import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from 'convex/_generated/api'
import { type Id } from 'convex/_generated/dataModel'
import { useStore } from '@tanstack/react-form'
import { UTCDate } from '@date-fns/utc'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { ExternalLink, Loader2, Plus, Search, Trash2 } from 'lucide-react'
import { useAppForm } from '@/components/main-form'
import { Button } from '@/components/ui/button'
import { amountInWords } from '@/lib/amount-in-words'
import { cn } from '@/lib/utils'
import { INVOICE_SUPPLIERS, type PayerTax } from '../constants'
import { SavedInvoices, type SavedInvoice } from './saved-invoices'
import type { InvoiceData } from './invoice-pdf'
import { useLookupRegistration, useSaveInvoicePdf, useSaveWaybillPdf } from '../actions'

const CARD = 'flex flex-col gap-3 rounded-xl bg-background p-4 shadow-[0px_0px_3px_#021b333d]'

type InvoiceLine = {
  name:     string
  unit:     string
  quantity: string
  price:    string
}

const EMPTY_LINE: InvoiceLine = { name: '', unit: 'шт.', quantity: '', price: '' }

// №, name, unit, quantity, price, sum, delete
const LINE_GRID = 'grid grid-cols-[24px_minmax(0,1fr)_64px_96px_120px_110px_38px] items-center gap-2'

const toNumber = (value: string) => Number(String(value).replace(',', '.')) || 0

const formatMoney = (value: number) =>
  value.toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// The PDF library is heavy — loaded only when a file is asked for.
type PdfKind = 'invoice' | 'waybill'

const buildPdf = async (kind: PdfKind, data: InvoiceData) => {
  const [{ pdf }, { InvoicePdf, WaybillPdf }] = await Promise.all([import('@react-pdf/renderer'), import('./invoice-pdf')])
  const Doc = kind === 'invoice' ? InvoicePdf : WaybillPdf
  return pdf(<Doc data={data} />).toBlob()
}

type TaxBlocks = Record<string, Record<string, unknown>>

// The payer is on the single tax when the API returns a singleTax block with a group.
const payerTaxOf = (taxes: TaxBlocks): PayerTax => {
  const single = (taxes.taxes?.singleTax ?? taxes.singleTax) as { group?: unknown } | undefined
  return single?.group != null ? 'singleTax' : 'other'
}

const lineSum = (line: InvoiceLine) => Math.round(toNumber(line.quantity) * toNumber(line.price) * 100) / 100

const getDefaultValues = () => ({
  supplierId:    INVOICE_SUPPLIERS[0]?.id ?? null,
  payerCode:     '',
  payerName:     '',
  recipientName: '',
  recipientCode: '',
  orderNumber:   '',
  date:          new UTCDate().valueOf(),
  contract:      '',
  lines:         [EMPTY_LINE],
})

// `orderNumber` — opened from a KeyCRM order link: its saved invoice, or a new one with that number.
export const InvoiceForm = ({ orderNumber }: { orderNumber?: string }) => {
  // Built once — a fresh date each render would reset the form in a loop.
  const [defaultValues] = useState(getDefaultValues)
  const form = useAppForm({ defaultValues })
  const values = useStore(form.store, state => state.values)
  const { mutate: lookup, isPending: isLookingUp, data: lookupResult } = useLookupRegistration()
  const { mutate: savePdf, isPending: isSaving } = useSaveInvoicePdf()
  const { mutate: saveWaybill, isPending: isSavingWaybill } = useSaveWaybillPdf()
  const [generating, setGenerating] = useState<PdfKind | null>(null)
  // The saved invoice the form shows — saving updates it instead of adding one.
  // The invoice saved or opened last: waybills go onto it, and saving the
  // invoice updates it only while the order number is still its own.
  const [saved, setSaved] = useState<{ id: Id<'invoices'>; orderNumber: string; date: number } | null>(null)
  const invoiceId = saved && saved.orderNumber === values.orderNumber.trim() ? saved.id : null
  const [payerTax, setPayerTax]   = useState<PayerTax | null>(null)
  const isAllowed = (forPayers: PayerTax) => !payerTax || forPayers === payerTax
  const supplier  = INVOICE_SUPPLIERS.find(s => s.id === values.supplierId && isAllowed(s.forPayers))
  const total    = values.lines.reduce((sum, line) => sum + lineSum(line), 0)

  const filledLines = values.lines.filter(line => line.name.trim())

  // The tab opens right on click — browsers block windows opened after an await.
  const handleOpen = async (kind: PdfKind) => {
    if (!supplier) return
    const tab = window.open('', '_blank')
    setGenerating(kind)
    try {
      const blob = await buildPdf(kind, {
        supplier,
        recipient:   { name: values.recipientName.trim(), code: values.recipientCode.trim() },
        payer:       { name: values.payerName.trim(), code: values.payerCode.trim() },
        orderNumber: values.orderNumber.trim(),
        date:        format(new Date(values.date), 'dd.MM.yyyy'),
        contract:    values.contract.trim(),
        lines:       filledLines.map(line => ({
          name:     line.name.trim(),
          unit:     line.unit.trim(),
          quantity: toNumber(line.quantity),
          price:    toNumber(line.price),
          sum:      lineSum(line),
        })),
        total: filledLines.reduce((sum, line) => sum + lineSum(line), 0),
        invoiceRef: saved ? { orderNumber: saved.orderNumber, date: format(new Date(saved.date), 'dd.MM.yyyy') } : undefined,
      })
      const url = URL.createObjectURL(blob)
      if (tab) tab.location.href = url
      else window.location.assign(url)

      // A waybill goes onto the current invoice, one per order number; the
      // invoice's data changes only when the invoice itself is generated.
      if (kind === 'waybill') {
        if (saved) {
          saveWaybill({
            invoiceId:   saved.id,
            blob,
            orderNumber: values.orderNumber.trim(),
            date:        values.date,
            lines:       filledLines,
            total,
          }, { onSuccess: () => toast.success(`Видаткову накладну № ${values.orderNumber.trim() || 'б/н'} збережено`) })
        }
        return
      }
      savePdf({
        id:          invoiceId ?? undefined,
        blob,
        supplierId:  supplier.id,
        payerTax:    payerTax ?? undefined,
        payer:       { name: values.payerName.trim(), code: values.payerCode.trim() },
        recipient:   { name: values.recipientName.trim(), code: values.recipientCode.trim() },
        orderNumber: values.orderNumber.trim(),
        date:        values.date,
        contract:    values.contract.trim(),
        lines:       filledLines,
        total,
      }, {
        onSuccess: (id) => {
          setSaved({ id, orderNumber: values.orderNumber.trim(), date: values.date })
          toast.success('Рахунок збережено')
        },
      })
    } catch (e) {
      tab?.close()
      toast.error(`Не вдалося створити PDF: ${(e as Error).message}`)
    } finally {
      setGenerating(null)
    }
  }

  const fillForm = (next: ReturnType<typeof getDefaultValues>) => {
    for (const [key, value] of Object.entries(next)) form.setFieldValue(key as keyof typeof next, value as never)
  }

  const openSaved = (invoice: SavedInvoice) => {
    setSaved({ id: invoice._id, orderNumber: invoice.orderNumber, date: invoice.date })
    setPayerTax(invoice.payerTax ?? null)
    fillForm({
      supplierId:    invoice.supplierId,
      payerCode:     invoice.payer.code,
      payerName:     invoice.payer.name,
      recipientName: invoice.recipient.name,
      recipientCode: invoice.recipient.code,
      orderNumber:   invoice.orderNumber,
      date:          invoice.date,
      contract:      invoice.contract,
      lines:         invoice.lines.length ? invoice.lines : [EMPTY_LINE],
    })
  }

  const startNew = () => {
    setSaved(null)
    setPayerTax(null)
    fillForm(getDefaultValues())
  }

  const { data: linkedInvoice, isSuccess: isLinkedLoaded } = useQuery(convexQuery(
    api.queries.invoices.getInvoiceByOrderNumber,
    orderNumber ? { orderNumber } : 'skip',
  ))
  const [linkApplied, setLinkApplied] = useState(false)
  useEffect(() => {
    if (!orderNumber || linkApplied || !isLinkedLoaded) return
    setLinkApplied(true)
    if (linkedInvoice) openSaved(linkedInvoice)
    else form.setFieldValue('orderNumber', orderNumber)
  }, [orderNumber, linkApplied, isLinkedLoaded, linkedInvoice])

  // The recipient starts as the payer — edited afterwards if it differs.
  const handleLookup = () => {
    const code = values.payerCode.trim()
    if (!code) return
    lookup(code, {
      onSuccess: (result) => {
        if (result.status !== 'found') return
        const name = result.fullName ?? result.name
        form.setFieldValue('payerName', name)
        form.setFieldValue('payerCode', result.code)
        form.setFieldValue('recipientName', name)
        form.setFieldValue('recipientCode', result.code)

        // Only the suppliers that may bill this payer stay selectable.
        const tax = payerTaxOf(result.taxes)
        setPayerTax(tax)
        const current = INVOICE_SUPPLIERS.find(s => s.id === form.getFieldValue('supplierId'))
        const allowed = INVOICE_SUPPLIERS.find(s => s.forPayers === tax)
        if (current?.forPayers !== tax && allowed) form.setFieldValue('supplierId', allowed.id)
      },
    })
  }

  return (
    <div className="grid grid-cols-1 items-start gap-3 p-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <div className="lg:col-span-2">
        <SavedInvoices currentId={saved?.id ?? null} onSelect={openSaved} onNew={startNew} onDeleted={id => id === saved?.id && setSaved(null)} />
      </div>

      <div className="flex flex-col gap-3">
        <section className={CARD}>
          <h2 className="text-sm font-semibold">Постачальник</h2>
          <form.AppField
            name="supplierId"
            children={(f) => (
              <f.FormSelect options={INVOICE_SUPPLIERS.map(s => ({ value: s.id, label: s.name, isDisabled: !isAllowed(s.forPayers) }))} />
            )}
          />
          {supplier && (
            <div className="flex flex-col text-xs text-muted-foreground">
              <span>{`IBAN: ${supplier.iban}`}</span>
              <span>{`в ${supplier.bank}`}</span>
              <span>{`МФО ${supplier.mfo}`}</span>
              <span>{`ЄДРПОУ: ${supplier.code}`}</span>
            </div>
          )}
        </section>

        <section className={CARD}>
          <h2 className="text-sm font-semibold">Платник</h2>
          <div className="flex items-end gap-2">
            <form.AppField
              name="payerCode"
              children={(f) => <f.FormTextField label="ЄДРПОУ / ІПН" placeholder="Напр. 25254440" className="max-w-56" />}
            />
            <Button type="button" variant="secondary" className="h-[38px]" disabled={!values.payerCode.trim() || isLookingUp} onClick={handleLookup}>
              {isLookingUp ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
              <span>Знайти</span>
            </Button>
          </div>
          {lookupResult?.status === 'not_found' && <p className="text-xs text-muted-foreground">За цим кодом нічого не знайдено</p>}
          {lookupResult?.status === 'error' && <p className="text-xs text-red-600">{lookupResult.message}</p>}
          <form.AppField name="payerName" children={(f) => <f.FormTextField label="Повна назва" />} />
        </section>

        <section className={CARD}>
          <h2 className="text-sm font-semibold">Одержувач</h2>
          <div className="flex flex-col gap-2 sm:flex-row">
            <form.AppField name="recipientName" children={(f) => <f.FormTextField label="Повна назва" className="flex-3" />} />
            <form.AppField name="recipientCode" children={(f) => <f.FormTextField label="ЄДРПОУ" className="flex-1" />} />
          </div>
        </section>
      </div>

      <div className="flex min-w-0 flex-col gap-3">
        <section className={CARD}>
          <h2 className="text-sm font-semibold">Рахунок</h2>
          <div className="flex flex-col gap-2 sm:flex-row">
            <form.AppField name="orderNumber" children={(f) => <f.FormTextField label="По замовленню №" className="flex-1" />} />
            <form.AppField name="date" children={(f) => <f.InputDate label="Від" className="flex-1" />} />
            <form.AppField name="contract" children={(f) => <f.FormTextField label="Договір" placeholder="Напр. ДОГОВІР ПОСТАВКИ № SH-10.4/3" className="flex-2" />} />
          </div>
        </section>

        <section className={CARD}>
          <h2 className="text-sm font-semibold">Товари</h2>
          <form.Field name="lines" mode="array">
            {(field) => (
              <div className="flex flex-col gap-2">
                {/* Padding keeps the inputs' focus ring inside the scroll box. */}
                <div className="-m-1.5 overflow-x-auto p-1.5">
                  <div className="flex min-w-[640px] flex-col gap-1.5">
                    <div className={cn(LINE_GRID, 'px-0.5 text-[11px] font-medium text-muted-foreground')}>
                      <span className="text-center">№</span>
                      <span>Назва</span>
                      <span>Од.</span>
                      <span>Кількість</span>
                      <span>Ціна без ПДВ</span>
                      <span className="text-right">Сума без ПДВ</span>
                      <span />
                    </div>
                    {values.lines.map((line, i) => (
                      <div key={i} className={cn(LINE_GRID, 'px-0.5')}>
                        <span className="text-center text-xs tabular-nums text-muted-foreground">{i + 1}</span>
                        <form.AppField name={`lines[${i}].name`} children={(f) => <f.FormTextField placeholder="Напр. Худі брендоване" />} />
                        <form.AppField name={`lines[${i}].unit`} children={(f) => <f.FormTextField />} />
                        <form.AppField name={`lines[${i}].quantity`} children={(f) => <f.FormTextNumberField type="number" />} />
                        <form.AppField name={`lines[${i}].price`} children={(f) => <f.FormTextNumberField type="number" />} />
                        <span className="text-right text-sm tabular-nums">{formatMoney(lineSum(line))}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-[38px] text-muted-foreground"
                          disabled={values.lines.length === 1}
                          onClick={() => field.removeValue(i)}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
                <Button type="button" variant="secondary" className="self-start" onClick={() => field.pushValue(EMPTY_LINE)}>
                  <Plus size={14} /> Додати товар
                </Button>
              </div>
            )}
          </form.Field>

          <div className="flex flex-col items-end gap-1 border-t pt-3">
            <div className="flex items-baseline gap-3">
              <span className="text-sm text-muted-foreground">Всього</span>
              <span className="text-lg font-semibold tabular-nums">{formatMoney(total)}</span>
            </div>
            <span className={cn('text-right text-xs', total > 0 ? 'text-foreground' : 'text-muted-foreground')}>
              {`${amountInWords(total)}. Без ПДВ.`}
            </span>
          </div>
        </section>

        <div className="flex flex-wrap justify-end gap-2">
          {([['waybill', 'Видаткова накладна'], ['invoice', 'Рахунок']] as const).map(([kind, label]) => (
            <Button
              key={kind}
              type="button"
              variant={kind === 'invoice' ? 'default' : 'outline'}
              className="h-10"
              disabled={!supplier || !filledLines.length || !!generating || isSaving || isSavingWaybill}
              onClick={() => handleOpen(kind)}
            >
              {generating === kind ? <Loader2 className="size-4 animate-spin" /> : <ExternalLink className="size-4" />}
              <span>{label}</span>
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}
