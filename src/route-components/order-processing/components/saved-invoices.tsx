import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { useState } from 'react'
import { useDebounce } from 'use-debounce'
import { format } from 'date-fns'
import { FilePlus, FileText, Trash2, Truck } from 'lucide-react'
import { useConfirmDeleteInvoice } from '../actions'
import { api } from 'convex/_generated/api'
import { type Id } from 'convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MyPopover } from '@/components/my-popover'
import { cn } from '@/lib/utils'

const CARD = 'flex flex-col gap-3 rounded-xl bg-background p-4 shadow-[0px_0px_3px_#021b333d]'

export type SavedInvoice = (typeof api.queries.invoices.searchInvoices._returnType)[number]

const formatMoney = (value: number) =>
  value.toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const FileLink = ({ url, title, icon }: { url: string | null; title: string; icon: React.ReactNode }) =>
  url ? (
    <Button asChild variant="ghost" size="icon-sm" title={title}>
      <a href={url} target="_blank" rel="noopener noreferrer">{icon}</a>
    </Button>
  ) : null

const WaybillsMenu = ({ waybills }: { waybills: SavedInvoice['waybills'] }) =>
  waybills.length ? (
    <MyPopover
      trigger={
        <Button type="button" variant="ghost" size="sm" className="h-8 gap-1 px-1.5 tabular-nums" title="Видаткові накладні">
          <Truck className="size-4" />
          <span className="text-xs">{waybills.length}</span>
        </Button>
      }
      content={
        <div className="flex min-w-48 flex-col">
          {[...waybills].sort((a, b) => a.orderNumber.localeCompare(b.orderNumber, 'uk', { numeric: true })).map(waybill => (
            <Button key={waybill._id} asChild variant="ghost" size="sm" className="justify-between gap-4 font-normal">
              <a href={waybill.url ?? undefined} target="_blank" rel="noopener noreferrer">
                <span className="font-medium tabular-nums">{`№ ${waybill.orderNumber || 'б/н'}`}</span>
                <span className="text-xs tabular-nums text-muted-foreground">{format(new Date(waybill.date), 'dd.MM.yyyy')}</span>
              </a>
            </Button>
          ))}
        </div>
      }
    />
  ) : null

export const SavedInvoices = ({ currentId, onSelect, onNew, onDeleted }: {
  currentId: Id<'invoices'> | null
  onSelect:  (invoice: SavedInvoice) => void
  onNew:     () => void
  onDeleted: (id: Id<'invoices'>) => void
}) => {
  const confirmDelete = useConfirmDeleteInvoice()
  const [search, setSearch] = useState('')
  const [debounced] = useDebounce(search, 300)
  const { data: invoices = [], isLoading } = useQuery(convexQuery(api.queries.invoices.searchInvoices, { search: debounced }))

  return (
    <section className={CARD}>
      <div className="flex items-center gap-2">
        <Input
          value={search}
          placeholder="Пошук: № замовлення, платник, ЄДРПОУ, договір"
          className="h-10 flex-1"
          onChange={e => setSearch(e.target.value)}
        />
        <Button type="button" variant="outline" className="h-10" onClick={onNew}>
          <FilePlus className="size-4" />
          <span>Новий</span>
        </Button>
      </div>

      {!isLoading && invoices.length === 0 && (
        <p className="text-xs text-muted-foreground">{debounced ? 'Нічого не знайдено' : 'Збережених рахунків ще немає'}</p>
      )}
      {invoices.length > 0 && (
        <div className="flex max-h-60 flex-col divide-y overflow-y-auto rounded-md border">
          {invoices.map(invoice => (
            <div
              key={invoice._id}
              className={cn('flex items-center gap-1 pr-2', invoice._id === currentId && 'bg-primary/10')}
            >
              <Button
                type="button"
                variant="ghost"
                className="h-auto min-w-0 flex-1 justify-start gap-3 rounded-none px-3 py-1.5 text-left font-normal"
                onClick={() => onSelect(invoice)}
              >
                <span className="w-24 shrink-0 font-medium tabular-nums">{`№ ${invoice.orderNumber || 'б/н'}`}</span>
                <span className="min-w-0 flex-1 truncate">{invoice.payer.name || '—'}</span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{format(new Date(invoice.date), 'dd.MM.yyyy')}</span>
                <span className="w-28 shrink-0 text-right tabular-nums">{formatMoney(invoice.total)}</span>
              </Button>
              <span className="flex w-28 shrink-0 items-center justify-end">
                <FileLink url={invoice.invoiceUrl} title="Рахунок" icon={<FileText className="size-4" />} />
                <WaybillsMenu waybills={invoice.waybills} />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  title="Видалити"
                  className="text-muted-foreground hover:text-red-500"
                  onClick={() => confirmDelete(invoice, () => onDeleted(invoice._id))}
                >
                  <Trash2 className="size-4" />
                </Button>
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
