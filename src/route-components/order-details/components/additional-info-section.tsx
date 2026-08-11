import { useCallback, useState } from 'react'
import { type Id } from 'convex/_generated/dataModel'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/check-box'
import { cn } from '@/lib/utils'
import { useUpdateProductionOrderAdditionalInfo } from '../actions'
import { type AdditionalInfo } from '../types'
import { InlineEdit } from './inline-edit'

type TextField = 'packaging' | 'printComment' | 'identifier'
type BoolField = 'isCuttingPrint' | 'isCuttingEmbroidery'

type Props = {
  productionOrderId: string
  info: AdditionalInfo
  readOnly?: boolean
}

const TEXT_FIELDS: { key: TextField; label: string }[] = [
  { key: 'packaging',    label: 'Пакування' },
  { key: 'printComment', label: 'Коментар до друку' },
  { key: 'identifier',   label: 'Індифікатор' },
]

const BOOL_FIELDS: { key: BoolField; label: string }[] = [
  { key: 'isCuttingPrint',      label: 'Друк на кроях' },
  { key: 'isCuttingEmbroidery', label: 'Вишивка на кроях' },
]

export const AdditionalInfoSection = ({ productionOrderId, info, readOnly }: Props) => {
  const [expanded, setExpanded] = useState(true)
  const { mutate: update } = useUpdateProductionOrderAdditionalInfo()

  const saveText = useCallback((field: TextField, value: string) => {
    update({ productionOrderId: productionOrderId as Id<'productionOrders'>, [field]: value })
  }, [productionOrderId, update])

  const saveBool = useCallback((field: BoolField, value: boolean) => {
    update({ productionOrderId: productionOrderId as Id<'productionOrders'>, [field]: value })
  }, [productionOrderId, update])

  return (
    <div className="flex flex-col gap-1.5 px-3 py-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Додаткова інформація
        </p>
        <Button onClick={() => setExpanded(prev => !prev)} size="sm" variant="outline" className="h-6">
          {expanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
        </Button>
      </div>

      {expanded && (
        <div className="flex flex-col gap-2 mt-1">
          {TEXT_FIELDS.map(({ key, label }) => (
            <div key={key} className="flex justify-between items-start gap-2">
              <span className="text-[11px] italic text-muted-foreground shrink-0 pt-0.5">{label}</span>
              {readOnly ? (
                <span className="text-xs font-medium text-right break-all">{info[key] || '-'}</span>
              ) : (
                <InlineEdit value={info[key] ?? ''} onSave={val => saveText(key, val)} placeholder="—" />
              )}
            </div>
          ))}
          {BOOL_FIELDS.map(({ key, label }) => (
            <label key={key} className={cn('flex items-center gap-2 select-none', !readOnly && 'cursor-pointer')}>
              <Checkbox
                checked={!!info[key]}
                disabled={readOnly}
                onCheckedChange={v => saveBool(key, !!v)}
              />
              <span className="text-[11px] italic text-muted-foreground">{label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
