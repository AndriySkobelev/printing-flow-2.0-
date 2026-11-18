import { useMemo } from 'react'
import { Minus, Plus } from 'lucide-react'
import { useFieldContext } from '@/components/main-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import clsx from 'clsx'

// ─── Standalone ──────────────────────────────────────────────────────────────

interface InputNumberProps {
  name?: string
  value: number
  max: number
  // What "Все" fills in; defaults to `max` (differs when over-production is allowed).
  fillValue?: number
  label?: string
  className?: string
  error?: Array<{ message: string }>
  onChange: (value: number) => void
}

const PRESETS = [5, 10, 25, 50, 100, 200, 500]
const MAX_PRESETS = 4

export const InputNumber = ({ name, value, max, fillValue = max, label, className, error = [], onChange }: InputNumberProps) => {
  const fill = Math.max(1, Math.min(fillValue, max))
  const presets = PRESETS.filter(p => p < fill).slice(-MAX_PRESETS)
  const bigStep = fill >= 100 ? 10 : 5
  const showBigStep = max > bigStep

  const handleInput = (raw: string) => {
    const n = parseInt(raw, 10)
    onChange(Number.isNaN(n) ? 0 : Math.min(Math.max(n, 0), max))
  }

  return (
    <div className={clsx('flex flex-col gap-2 w-full', className)}>
      {label ? <div className="text-sm text-[#bbbfc7] capitalize ml-2">{label}</div> : null}

      <div className="flex items-center gap-2 w-full">
        {showBigStep && (
          <Button
            type="button"
            variant="outline"
            className="w-12 shrink-0 px-0"
            onClick={() => onChange(Math.max(1, value - bigStep))}
            disabled={value <= 1}
          >
            −{bigStep}
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => onChange(value - 1)}
          disabled={value <= 1}
        >
          <Minus />
        </Button>
        <Input
          name={name}
          type="number"
          inputMode="numeric"
          min={1}
          max={max}
          value={value || ''}
          onChange={e => handleInput(e.target.value)}
          onFocus={e => e.target.select()}
          title={`${error?.[0]?.message ?? ''}`}
          className={clsx(
            'text-center text-base font-medium h-9.5 shadow-none bg-white [&::-webkit-inner-spin-button]:appearance-none [appearance:textfield]',
            error.length > 0 && 'border-red-500',
          )}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => onChange(value + 1)}
          disabled={value >= max}
        >
          <Plus />
        </Button>
        {showBigStep && (
          <Button
            type="button"
            variant="outline"
            className="w-12 shrink-0 px-0"
            onClick={() => onChange(Math.min(max, value + bigStep))}
            disabled={value >= max}
          >
            +{bigStep}
          </Button>
        )}
      </div>

      {fill > 1 && (
        <div className="flex items-center gap-1.5 w-full">
          {presets.map(v => (
            <Button
              key={v}
              type="button"
              variant={value === v ? 'default' : 'outline'}
              size="sm"
              className="flex-1 px-0 transition-none"
              onClick={() => onChange(v)}
            >
              {v}
            </Button>
          ))}
          <Button
            type="button"
            variant={value === fill ? 'default' : 'outline'}
            size="sm"
            className="flex-[1.5] transition-none"
            onClick={() => onChange(fill)}
          >
            Все · {fill}
          </Button>
        </div>
      )}
    </div>
  )
}

// ─── Form-integrated ─────────────────────────────────────────────────────────

interface FormInputNumberProps {
  max: number
  fillValue?: number
  label?: string
  className?: string
}

export const FormInputNumber = ({ max, fillValue, label, className }: FormInputNumberProps) => {
  const field = useFieldContext()
  const name    = useMemo(() => field.name, [field.name])
  const value   = useMemo(() => Number(field.state.value ?? 1), [field.state.value])
  const errors  = useMemo(() => field.state.meta.errors as Array<{ message: string }> | undefined, [field.state.meta.errors])
  const isValid = useMemo(() => field.state.meta.isValid as boolean | undefined, [field.state.meta.isValid])

  const handleChange = useMemo(() => (v: number) => {
    field.handleChange(v)
  }, [field.handleChange])

  return (
    <InputNumber
      name={name}
      value={value}
      max={max}
      fillValue={fillValue}
      label={label}
      className={className}
      error={!isValid && errors?.length ? errors : []}
      onChange={handleChange}
    />
  )
}

export default FormInputNumber
