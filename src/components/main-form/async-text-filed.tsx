import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { type FunctionReference } from 'convex/server'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import clsx from 'clsx'
import { Input } from '../ui/input'
import { useFieldContext } from '@/components/main-form'

interface FormAsyncTextFieldProps {
  label?: string
  className?: string
  placeholder?: string
  takenMessage?: string
  // The convex query to call with the current value
  query: FunctionReference<'query', 'public', any, any>
  // Build the query args from the current field value
  buildArgs: (value: string) => Record<string, any>
  // Return true if the query result means the value is already taken
  isTaken: (result: any) => boolean
}

const useDebounce = (value: string, delay: number) => {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

const FormAsyncTextField = ({
  label,
  className,
  placeholder,
  query,
  buildArgs,
  isTaken,
  takenMessage = 'Already taken',
}: FormAsyncTextFieldProps) => {
  const field = useFieldContext()
  const value = (field.state.value as string) ?? ''

  const debouncedValue = useDebounce(value, 400)
  const enabled = debouncedValue.length > 0

  const { data, isFetching } = useQuery({
    ...convexQuery(query, buildArgs(debouncedValue)),
    enabled,
  })

  const isChecking = isFetching && enabled
  const taken = enabled && !isFetching && isTaken(data)
  const available = enabled && !isFetching && !isTaken(data)

  const errors = field.state.meta.errors as Array<{ message: string }> | undefined
  const fieldInvalid = !field.state.meta.isValid && !!errors?.length

  return (
    <div className={clsx('flex flex-col gap-1 w-full', className)}>
      {label && <div className="text-sm text-[#bbbfc7] capitalize ml-2">{label}</div>}
      <div className="relative">
        <Input
          type="text"
          name={field.name}
          value={value}
          placeholder={placeholder}
          onChange={e => field.handleChange(e.target.value as never)}
          className={clsx(
            'placeholder:text-gray-300 h-9.5 shadow-none bg-white pr-8',
            (taken || fieldInvalid) && 'border-red-500',
            available && 'border-green-500',
          )}
        />
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
          {isChecking && <Loader2 size={14} className="animate-spin text-muted-foreground" />}
          {taken && <XCircle size={14} className="text-red-500" />}
          {available && <CheckCircle2 size={14} className="text-green-500" />}
        </div>
      </div>
      {taken && <div className="text-xs text-red-500 ml-2">{takenMessage}</div>}
      {fieldInvalid && !taken && <div className="text-xs text-red-500 ml-2">{errors?.[0]?.message}</div>}
    </div>
  )
}

export default FormAsyncTextField
