import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { useStore } from '@tanstack/react-form'
import { useDebounce } from 'use-debounce'
import { Plus, Trash2 } from 'lucide-react'
import { api } from 'convex/_generated/api'
import { type Doc, type Id } from 'convex/_generated/dataModel'
import { useAppForm } from '@/components/main-form'
import { Button } from '@/components/ui/button'
import { WorkloadCalendar } from '@/components/workload-calendar'
import { MaterialRequirementRow, isMaterialSufficient } from '@/components/material-requirement-row'
import { cn } from '@/lib/utils'

type Line = {
  specificationId: Id<'specifications'> | null
  color: string | null
  quantity: string
  prints: string
}

const PRINT_MINUTES = 3.3

const EMPTY_LINE: Line = { specificationId: null, color: null, quantity: '', prints: '' }

const STAGES = [
  { key: 'cutting',  label: 'Розкрій' },
  { key: 'sewing',   label: 'Пошив' },
  { key: 'branding', label: 'Брендування' },
  { key: 'packing',  label: 'Пакування' },
] as const

type StageKey = (typeof STAGES)[number]['key']
type StageMinutes = Record<StageKey, number>

const EMPTY_MINUTES: StageMinutes = { cutting: 0, sewing: 0, branding: 0, packing: 0 }

const CARD = 'flex flex-col gap-3 rounded-xl bg-background p-4 shadow-[0px_0px_3px_#021b333d]'

const toNumber = (value?: number | string | null) => Number(value) || 0

const getLineMinutes = (spec: Doc<'specifications'>, line: Line): StageMinutes => {
  const quantity = toNumber(line.quantity)
  return {
    cutting:  toNumber(spec.cutTime) * quantity,
    sewing:   toNumber(spec.productionTime) * quantity,
    branding: PRINT_MINUTES * quantity * toNumber(line.prints),
    packing:  toNumber(spec.packingTime) * quantity,
  }
}

const formatHours = (minutes: number) =>
  `${Number((minutes / 60).toFixed(1)).toLocaleString('uk-UA')} год`

const ColorField = ({ form, index, specificationId }: {
  form: any
  index: number
  specificationId: Id<'specifications'> | null
}) => {
  const { data: products = [] } = useQuery({
    ...convexQuery(api.queries.products.getProductsBySpec, specificationId ? { specificationId } : 'skip'),
  })
  const options = [...new Set(products.map(p => p.color))]
    .sort((a, b) => a.localeCompare(b, 'uk'))
    .map(color => ({ value: color, label: color }))

  return (
    <form.AppField
      name={`lines[${index}].color`}
      children={(field: any) => (
        <field.FormSelect label="Колір" className="flex-2 min-w-0" disabled={!specificationId} options={options} />
      )}
    />
  )
}

const StageTile = ({ label, minutes, accent }: { label: string; minutes: number; accent?: boolean }) => (
  <div className={cn('flex flex-col gap-1 rounded-lg p-3', accent ? 'bg-primary text-primary-foreground' : 'bg-muted/50')}>
    <span className={cn('text-[11px]', accent ? 'text-primary-foreground/80' : 'text-muted-foreground')}>{label}</span>
    <span className="text-lg font-semibold tabular-nums leading-none">{formatHours(minutes)}</span>
  </div>
)

const OrderProcessing = () => {
  const { data: specs = [] } = useQuery(convexQuery(api.queries.specifications.getSpecifications, {}))
  const form = useAppForm({ defaultValues: { lines: [EMPTY_LINE] } })
  const lines = useStore(form.store, state => state.values.lines)

  const specOptions = specs.map(spec => ({ value: spec._id, label: spec.name }))
  const lineMinutes = lines.map(line => {
    const spec = specs.find(s => s._id === line.specificationId)
    return spec ? getLineMinutes(spec, line) : EMPTY_MINUTES
  })
  const totals = STAGES.reduce<StageMinutes>((acc, { key }) => ({
    ...acc,
    [key]: lineMinutes.reduce((sum, minutes) => sum + minutes[key], 0),
  }), EMPTY_MINUTES)
  const totalMinutes = STAGES.reduce((sum, { key }) => sum + totals[key], 0)

  const completeLines = lines.flatMap(({ specificationId, color, quantity }) =>
    specificationId && color && toNumber(quantity) > 0
      ? [{ specificationId, color, quantity: toNumber(quantity) }]
      : [],
  )
  const [debouncedLines] = useDebounce(JSON.stringify(completeLines), 300)
  const requestedLines = JSON.parse(debouncedLines) as typeof completeLines

  const { data: materials } = useQuery({
    ...convexQuery(
      api.queries.movements.getOrderProcessingMaterials,
      requestedLines.length ? { lines: requestedLines } : 'skip',
    ),
    placeholderData: keepPreviousData,
  })
  const visibleMaterials = requestedLines.length ? materials ?? [] : []
  const allSufficient = visibleMaterials.every(isMaterialSufficient)

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto p-3 lg:flex-row lg:overflow-hidden">
      <div className="flex min-w-0 flex-1 flex-col gap-3 p-1 lg:overflow-y-auto">
        <section className={CARD}>
          <h2 className="text-sm font-semibold">Вироби</h2>
          <form.Field name="lines" mode="array">
            {(field) => (
              <div className="flex flex-col gap-3">
                {lines.map((line, i) => (
                  <div key={i} className="flex flex-col gap-1">
                    <div className="flex items-end gap-2">
                      <form.AppField
                        name={`lines[${i}].specificationId`}
                        children={(f) => (
                          <f.FormSelect
                            label="Виріб"
                            className="flex-3 min-w-0"
                            options={specOptions}
                            addOnChange={() => form.setFieldValue(`lines[${i}].color`, null)}
                          />
                        )}
                      />
                      <ColorField form={form} index={i} specificationId={line.specificationId} />
                      <form.AppField
                        name={`lines[${i}].quantity`}
                        children={(f) => <f.FormTextNumberField type="number" label="Кількість" className="flex-1 min-w-16" />}
                      />
                      <form.AppField
                        name={`lines[${i}].prints`}
                        children={(f) => <f.FormTextNumberField type="number" label="Друків" className="flex-1 min-w-16" />}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-[38px] shrink-0 text-muted-foreground"
                        disabled={lines.length === 1}
                        onClick={() => field.removeValue(i)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                    {STAGES.some(({ key }) => lineMinutes[i][key] > 0) && (
                      <p className="ml-2 text-[11px] text-muted-foreground">
                        {STAGES.map(({ key, label }) => `${label} ${formatHours(lineMinutes[i][key])}`).join(' · ')}
                      </p>
                    )}
                  </div>
                ))}
                <Button type="button" variant="secondary" className="self-start" onClick={() => field.pushValue(EMPTY_LINE)}>
                  <Plus size={14} /> Додати виріб
                </Button>
              </div>
            )}
          </form.Field>
        </section>

        <section className={CARD}>
          <h2 className="text-sm font-semibold">Час виконання</h2>
          <div className="grid grid-cols-2 gap-2 xl:grid-cols-5">
            {STAGES.map(({ key, label }) => <StageTile key={key} label={label} minutes={totals[key]} />)}
            <StageTile label="Загалом" minutes={totalMinutes} accent />
          </div>
        </section>

        <section className={CARD}>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold">Матеріали</h2>
            {visibleMaterials.length > 0 && (
              <span className={cn(
                'rounded-full px-1.5 py-0.5 text-[10px] font-medium',
                allSufficient ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700',
              )}>
                {allSufficient ? 'Достатньо' : 'Недостатньо'}
              </span>
            )}
          </div>
          {visibleMaterials.length > 0
            ? <div className="flex flex-col gap-1.5">{visibleMaterials.map((row, i) => <MaterialRequirementRow key={i} row={row} />)}</div>
            : <p className="text-xs text-muted-foreground">Виберіть виріб, колір і кількість</p>}
        </section>
      </div>

      <div className={cn(CARD, 'min-w-0 flex-1 lg:my-1 lg:mr-1')}>
        <WorkloadCalendar />
      </div>
    </div>
  )
}

export default OrderProcessing
