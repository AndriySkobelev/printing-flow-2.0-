import { useContext, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { type Id } from 'convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DialogContext } from '@/contexts/dialog'
import { useSetSewerCoefficient } from '../actions'

const describe = (k: number) =>
  k === 1 ? 'Норма без змін'
  : k > 1 ? `Шиє на ${Math.round((k - 1) * 100)}% довше за норму`
  : `Шиє на ${Math.round((1 - k) * 100)}% швидше за норму`

export const SewerCoefficient = ({ sewerId, coefficient }: { sewerId: string; coefficient: number }) => {
  const { closeDialog } = useContext(DialogContext)
  const [value, setValue] = useState(String(coefficient))
  const { mutate: save, isPending } = useSetSewerCoefficient()

  const k       = Number(value.replace(',', '.'))
  const isValid = k > 0 && k <= 5

  const handleSave = () => {
    if (!isValid) return
    save({ userId: sewerId as Id<'users'>, coefficient: k }, { onSuccess: () => closeDialog() })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">×</span>
        <Input
          type="number"
          inputMode="decimal"
          step={0.05}
          min={0.1}
          max={5}
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
          className="h-10 w-28 tabular-nums"
        />
        <span className={isValid ? 'text-sm text-muted-foreground' : 'text-sm text-red-500'}>
          {isValid ? describe(k) : 'Від 0 до 5'}
        </span>
      </div>
      <Button type="button" className="h-10 w-full" disabled={!isValid || isPending} onClick={handleSave}>
        {isPending && <Loader2 className="size-4 animate-spin" />}
        <span>Зберегти</span>
      </Button>
    </div>
  )
}
