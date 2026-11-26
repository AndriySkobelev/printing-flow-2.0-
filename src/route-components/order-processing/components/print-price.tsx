import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { useStore } from '@tanstack/react-form'
import { Plus, Settings2, Trash2, X } from 'lucide-react'
import { api } from 'convex/_generated/api'
import { type Id } from 'convex/_generated/dataModel'
import {
  MAX_PRINTS_PER_ITEM,
  canEditPrintPricing,
  isLargePrint,
  itemUnitPrice,
  printUnitPrice,
  type PrintBases,
} from 'convex/lib/printPricing'
import { useAppForm } from '@/components/main-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MyPopover } from '@/components/my-popover'
import { useAuth } from '@/hooks/auth-hooks'
import { cn } from '@/lib/utils'
import { useUpdatePrintPricing } from '../actions'

type PrintLine = { widthCm: string; heightCm: string; quantity: string }

const EMPTY_PRINT: PrintLine = { widthCm: '', heightCm: '', quantity: '' }

const CARD = 'flex flex-col gap-3 rounded-xl bg-background p-4 shadow-[0px_0px_3px_#021b333d]'

const toNumber = (value?: number | string | null) => Number(value) || 0

const formatMoney = (value: number) =>
  `${value.toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} грн`

const PrintBasesEditor = ({ bases }: { bases: PrintBases }) => {
  const [open, setOpen] = useState(false)
  const [standard, setStandard] = useState('')
  const [large, setLarge] = useState('')
  const { mutate: save, isPending } = useUpdatePrintPricing()

  const onOpenChange = (next: boolean) => {
    if (next) {
      setStandard(String(bases.standard))
      setLarge(String(bases.large))
    }
    setOpen(next)
  }

  const valid = standard.trim() !== '' && large.trim() !== '' && toNumber(standard) >= 0 && toNumber(large) >= 0

  return (
    <MyPopover
      open={open}
      onOpenChange={onOpenChange}
      trigger={
        <Button type="button" variant="ghost" size="icon" className="size-7 text-muted-foreground">
          <Settings2 size={15} />
        </Button>
      }
      content={
        <form
          className="flex w-56 flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            save({ standard: toNumber(standard), large: toNumber(large) }, { onSuccess: () => setOpen(false) })
          }}
        >
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            База, стандартний принт (грн)
            <Input inputMode="decimal" value={standard} onChange={e => setStandard(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            База, великий принт (грн)
            <Input inputMode="decimal" value={large} onChange={e => setLarge(e.target.value)} />
          </label>
          <Button type="submit" disabled={!valid || isPending}>Зберегти</Button>
        </form>
      }
    />
  )
}

const SummaryRow = ({ label, quantity, price }: { label: string; quantity: number; price: number }) => (
  <div className="grid grid-cols-[1fr_auto_auto_auto] items-baseline gap-x-3 text-sm tabular-nums">
    <span className="truncate">{label}</span>
    <span className="text-right text-muted-foreground">{quantity} ×</span>
    <span className="text-right">{formatMoney(price)}</span>
    <span className="min-w-28 text-right font-medium">{formatMoney(price * quantity)}</span>
  </div>
)

const PrintCalculation = ({ hidden, onTitleChange }: { hidden: boolean; onTitleChange: (title?: string) => void }) => {
  const { user } = useAuth()
  const { data: specs = [] } = useQuery(convexQuery(api.queries.specifications.getSpecifications, {}))
  const { data: bases } = useQuery(convexQuery(api.queries.settings.getPrintPricing, {}))

  const form = useAppForm({
    defaultValues: {
      specificationId: null as Id<'specifications'> | null,
      quantity: '',
      prints: [EMPTY_PRINT] as PrintLine[],
    },
  })
  const values = useStore(form.store, state => state.values)

  const spec = specs.find(s => s._id === values.specificationId)
  const quantity = toNumber(values.quantity)
  const salePrice = toNumber(spec?.salePrice)
  const itemPrice = itemUnitPrice(salePrice, quantity)

  const printPrices = values.prints.map(print => {
    const widthCm = toNumber(print.widthCm)
    const heightCm = toNumber(print.heightCm)
    // An empty print run follows the item quantity.
    const printQty = toNumber(print.quantity) || quantity
    return bases && widthCm > 0 && heightCm > 0 && printQty > 0
      ? { price: printUnitPrice({ widthCm, heightCm, quantity: printQty }, bases), large: isLargePrint({ widthCm, heightCm }) }
      : null
  })
  const printPrice = printPrices.reduce((sum, p) => sum + (p?.price ?? 0), 0)
  const unitTotal = itemPrice + printPrice

  const specOptions = specs.map(s => ({ value: s._id, label: s.name }))

  useEffect(() => onTitleChange(spec?.name), [spec?.name])

  return (
    <div className={cn('flex flex-col gap-3 p-1 lg:flex-row lg:items-start', hidden && 'hidden')}>
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <section className={CARD}>
          <h2 className="text-sm font-semibold">Виріб</h2>
          <div className="flex items-end gap-2">
            <form.AppField
              name="specificationId"
              children={(f) => <f.FormSelect label="Виріб" className="flex-3 min-w-0" options={specOptions} />}
            />
            <form.AppField
              name="quantity"
              children={(f) => <f.FormTextNumberField type="number" label="Тираж" className="flex-1 min-w-20" />}
            />
          </div>
          {spec && !salePrice && (
            <p className="ml-2 text-xs text-red-600">У специфікації не вказана ціна продажу</p>
          )}
        </section>

        <section className={CARD}>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold">Друки</h2>
            {bases && (
              <span className="text-[11px] text-muted-foreground">
                база {bases.standard} / {bases.large} грн
              </span>
            )}
            <div className="ml-auto">
              {bases && canEditPrintPricing(user?.role) && <PrintBasesEditor bases={bases} />}
            </div>
          </div>
          <form.Field name="prints" mode="array">
            {(field) => (
              <div className="flex flex-col gap-3">
                {values.prints.map((_, i) => (
                  <div key={i} className="flex items-end gap-2">
                    <span className="mb-2.5 w-5 shrink-0 text-xs text-muted-foreground">{i + 1}</span>
                    <form.AppField
                      name={`prints[${i}].widthCm`}
                      children={(f) => <f.FormTextNumberField type="number" label="Ширина, см" className="flex-1 min-w-16" />}
                    />
                    <form.AppField
                      name={`prints[${i}].heightCm`}
                      children={(f) => <f.FormTextNumberField type="number" label="Висота, см" className="flex-1 min-w-16" />}
                    />
                    <form.AppField
                      name={`prints[${i}].quantity`}
                      children={(f) => (
                        <f.FormTextNumberField
                          type="number"
                          label="Тираж"
                          placeholder={quantity ? String(quantity) : undefined}
                          className="flex-1 min-w-16"
                        />
                      )}
                    />
                    <div className="flex h-9.5 w-28 shrink-0 flex-col items-end justify-center tabular-nums">
                      <span className="text-sm font-medium">{printPrices[i] ? formatMoney(printPrices[i].price) : '—'}</span>
                      {printPrices[i]?.large && <span className="text-[10px] text-muted-foreground">великий</span>}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-[38px] shrink-0 text-muted-foreground"
                      disabled={values.prints.length === 1}
                      onClick={() => field.removeValue(i)}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="secondary"
                  className="self-start"
                  disabled={values.prints.length >= MAX_PRINTS_PER_ITEM}
                  onClick={() => field.pushValue(EMPTY_PRINT)}
                >
                  <Plus size={14} /> Додати друк
                </Button>
              </div>
            )}
          </form.Field>
        </section>
      </div>

      <section className={cn(CARD, 'min-w-0 lg:w-[35%] lg:shrink-0')}>
        <h2 className="text-sm font-semibold">Вартість</h2>
        <SummaryRow label={spec?.name ?? 'Виріб'} quantity={quantity} price={itemPrice} />
        <SummaryRow label="Нанесення принта" quantity={quantity} price={printPrice} />
        <div className="mt-1 grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1 rounded-lg bg-muted/50 p-3">
            <span className="text-[11px] text-muted-foreground">Ціна за виріб + принт</span>
            <span className="text-lg font-semibold tabular-nums leading-none">{formatMoney(unitTotal)}</span>
          </div>
          <div className="flex flex-col gap-1 rounded-lg bg-primary p-3 text-primary-foreground">
            <span className="text-[11px] text-primary-foreground/80">Сума за все замовлення</span>
            <span className="text-lg font-semibold tabular-nums leading-none">{formatMoney(unitTotal * quantity)}</span>
          </div>
        </div>
      </section>
    </div>
  )
}

type Calculation = { id: number; title?: string }

export const PrintPrice = () => {
  const [calculations, setCalculations] = useState<Calculation[]>([{ id: 1 }])
  const [activeId, setActiveId] = useState(1)

  const add = () => {
    const id = Math.max(...calculations.map(c => c.id)) + 1
    setCalculations(prev => [...prev, { id }])
    setActiveId(id)
  }

  const remove = (id: number) => {
    const index = calculations.findIndex(c => c.id === id)
    const rest = calculations.filter(c => c.id !== id)
    setCalculations(rest)
    if (id === activeId) setActiveId(rest[Math.max(0, index - 1)].id)
  }

  const setTitle = (id: number, title?: string) =>
    setCalculations(prev => prev.map(c => (c.id === id ? { ...c, title } : c)))

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1 overflow-x-auto p-1">
        {calculations.map((c, i) => (
          <div
            key={c.id}
            className={cn(
              'flex shrink-0 items-center rounded-lg',
              c.id === activeId ? 'bg-background shadow-[0px_0px_3px_#021b333d]' : 'text-muted-foreground',
            )}
          >
            <Button type="button" variant="ghost" className="h-8 max-w-48 px-3 hover:bg-transparent" onClick={() => setActiveId(c.id)}>
              <span className="truncate">{c.title ?? `Виріб ${i + 1}`}</span>
            </Button>
            {calculations.length > 1 && (
              <Button type="button" variant="ghost" size="icon" className="-ml-2 mr-1 size-6 text-muted-foreground" onClick={() => remove(c.id)}>
                <X size={13} />
              </Button>
            )}
          </div>
        ))}
        <Button type="button" variant="ghost" size="icon" className="size-8 shrink-0 text-muted-foreground" onClick={add}>
          <Plus size={16} />
        </Button>
      </div>
      {calculations.map(c => (
        <PrintCalculation key={c.id} hidden={c.id !== activeId} onTitleChange={title => setTitle(c.id, title)} />
      ))}
    </div>
  )
}
