type CustomField = { name: string; value: unknown }

type Props = {
  fields: CustomField[]
}

const formatValue = (value: unknown): string => {
  if (value === null || value === undefined) return '-'
  if (value === true)  return 'Так'
  if (value === false) return 'Ні'
  return String(value)
}

export const KeycrmCustomFields = ({ fields }: Props) => {
  if (!fields.length) return null

  return (
    <div className="flex flex-col gap-1.5 px-3 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
        Дані KeyCRM
      </p>
      {fields.map((field, i) => (
        <div key={i} className="flex justify-between items-start gap-2">
          <span className="text-[11px] italic text-muted-foreground capitalize shrink-0">{field.name}</span>
          <span className="text-xs font-medium text-right break-all">{formatValue(field.value)}</span>
        </div>
      ))}
    </div>
  )
}
