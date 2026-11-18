import { useState, type FormEvent, type ReactNode } from 'react'
import { format } from 'date-fns'
import { Loader2, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useLookupRegistration } from '../actions'

const CARD = 'flex flex-col gap-3 rounded-xl bg-background p-4 shadow-[0px_0px_3px_#021b333d]'

const formatDate = (value: string | null) => {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.valueOf()) ? value : format(date, 'dd.MM.yyyy')
}

const Row = ({ label, children }: { label: string; children: ReactNode }) =>
  children ? (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
      <span className="shrink-0 text-xs text-muted-foreground sm:w-44">{label}</span>
      <span className="text-sm">{children}</span>
    </div>
  ) : null

// Field names as the Opendatabot spec describes them.
const FIELD_LABELS: Record<string, string> = {
  taxes:             'Податки',
  singleTax:         'Єдиний податок',
  VAT:               'ПДВ',
  vat:               'ПДВ',
  unProfit:          'Неприбутковість',
  whiteList:         'Білий перелік',
  generalSystem:     'Загальна система оподаткування',
  statusText:        'Причина помилки',
  group:             'Група',
  rate:              'Ставка, %',
  startDate:         'Дата початку дії',
  admissionDate:     'Дата початку застосування ставки та групи',
  dateEnd:           'Дата завершення дії',
  active:            'Запис активний',
  databaseDate:      'Дата останнього оновлення',
  nonProfitCategory: 'Категорія неприбутковості',
  code:              'Податковий номер',
  registrationDate:  'Дата реєстрації',
  cancellationDate:  'Дата скасування',
  taxSystemId:       'Ідентифікатор системи оподаткування',
  taxSystemName:     'Назва системи оподаткування',
  classId:           'Ідентифікатор класу',
  className:         'Клас',
  regionId:          'Ідентифікатор регіону',
  regionName:        'Регіон',
  sectionId:         'Ідентифікатор розділу',
  sectionName:       'Розділ',
  finStateRevenue:   'Дохід',
  finStateProfit:    'Прибуток',
  finStateYear:      'Рік фінансової звітності',
}

const formatValue = (value: unknown) => {
  if (typeof value === 'boolean') return value ? 'Так' : 'Ні'
  if (value == null || value === '') return '—'
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) return formatDate(value)
  return String(value)
}

const isBlock = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object'

// A block from the API with its fields translated — values as they came.
const ApiBlock = ({ name, data }: { name: string; data: Record<string, unknown> }) => {
  const entries = Object.entries(data).filter(([key]) => key !== 'requestStatus')
  const fields  = entries.filter(([, value]) => !isBlock(value))
  const blocks  = entries.filter((entry): entry is [string, Record<string, unknown>] => isBlock(entry[1]))
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold">{FIELD_LABELS[name] ?? name}</span>
      {fields.map(([key, value]) => (
        <div key={key} className="flex flex-col sm:flex-row sm:gap-3">
          <span className="shrink-0 text-xs text-muted-foreground sm:w-64">{FIELD_LABELS[key] ?? key}</span>
          <span className="text-sm font-medium">{formatValue(value)}</span>
        </div>
      ))}
      {blocks.map(([key, value]) => (
        <div key={key} className="mt-1 border-l-2 pl-3">
          <ApiBlock name={key} data={value} />
        </div>
      ))}
    </div>
  )
}

export const RegistrationLookup = () => {
  const [code, setCode] = useState('')
  const { mutate: lookup, data: result, isPending } = useLookupRegistration()

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (code.trim()) lookup(code.trim())
  }

  return (
    <div className="flex max-w-3xl flex-col gap-3 p-1">
      <form onSubmit={handleSubmit} className={cn(CARD, 'flex-row items-end')}>
        <div className="flex flex-1 flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">ЄДРПОУ або ІПН</span>
          <Input
            value={code}
            inputMode="numeric"
            placeholder="Напр. 12345678"
            className="h-10"
            onChange={e => setCode(e.target.value)}
          />
        </div>
        <Button type="submit" className="h-10" disabled={!code.trim() || isPending}>
          {isPending ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
          <span>Знайти</span>
        </Button>
      </form>

      {result?.status === 'not_found' && (
        <p className={cn(CARD, 'text-sm text-muted-foreground')}>Ні компанії, ні ФОП з таким кодом не знайдено</p>
      )}
      {result?.status === 'error' && (
        <p className={cn(CARD, 'text-sm text-red-600')}>{result.message}</p>
      )}

      {result?.status === 'found' && (
        <section className={CARD}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
              {result.kind === 'company' ? 'Компанія' : 'ФОП'}
            </span>
            <h2 className="text-base font-semibold">{result.name}</h2>
            <span className="text-xs tabular-nums text-muted-foreground">{result.code}</span>
          </div>

          <div className="flex flex-col gap-3 rounded-lg bg-muted/50 p-3">
            {Object.keys(result.taxes).length
              ? Object.entries(result.taxes).map(([key, value]) => <ApiBlock key={key} name={key} data={value} />)
              : <span className="text-xs text-muted-foreground">Податкових даних у відповіді немає</span>}
          </div>

          <div className="flex flex-col gap-2">
            <Row label="Повна назва">{result.fullName !== result.name && result.fullName}</Row>
            <Row label="Статус">{result.registryStatus}</Row>
            <Row label="Дата реєстрації">{formatDate(result.registrationDate)}</Row>
            <Row label="Керівник">{result.ceoName}</Row>
            <Row label="Основний вид діяльності">{result.primaryActivity}</Row>
            <Row label="Адреса">{result.address}</Row>
          </div>
        </section>
      )}
    </div>
  )
}
