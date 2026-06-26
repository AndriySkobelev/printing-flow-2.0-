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
  label?: string
  className?: string
  error?: Array<{ message: string }>
  onChange: (value: number) => void
}

export const InputNumber = ({ name, value, max, label, className, error = [], onChange }: InputNumberProps) => {
  const variants = new Array(Math.floor(max / 5)).fill(0).map((_, i) => (i + 1) * 5)

  return (
    <div className={clsx('flex flex-col gap-1 w-full', className)}>
      {label ? <div className="text-sm text-[#bbbfc7] capitalize ml-2">{label}</div> : null}

      <div className="flex items-center gap-2 w-full">
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
          value={value}
          max={max}
          disabled
          title={`${error?.[0]?.message ?? ''}`}
          className={clsx(
            'text-center h-9.5 shadow-none bg-white disabled:opacity-100 [&::-webkit-inner-spin-button]:appearance-none [appearance:textfield]',
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
      </div>

      {variants.length > 0 && (
        <div className="flex items-center gap-2 w-full flex-wrap">
          {variants.map(v => (
            <Button
              key={v}
              type="button"
              variant="outline"
              size="icon"
              className="flex-1"
              onClick={() => onChange(v)}
              disabled={v > max}
            >
              {v}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Form-integrated ─────────────────────────────────────────────────────────

interface FormInputNumberProps {
  max: number
  label?: string
  className?: string
}

export const FormInputNumber = ({ max, label, className }: FormInputNumberProps) => {
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
      label={label}
      className={className}
      error={!isValid && errors?.length ? errors : []}
      onChange={handleChange}
    />
  )
}

export default FormInputNumber
