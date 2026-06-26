import { useAppForm } from '@/components/main-form'

type FormValues = {
  keycrmOrderId: string
  keycrmManager: string
  plannedShipDate: number | null
}

type Props = {
  formId: string
  actionSubmit: (values: FormValues) => void
}

const CreateOrderForm = ({ formId, actionSubmit }: Props) => {
  const form = useAppForm({
    defaultValues: {
      keycrmOrderId: '',
      keycrmManager: '',
      plannedShipDate: null as number | null,
    },
    onSubmit: ({ value }) => actionSubmit(value),
  })

  return (
    <form
      id={formId}
      className="flex flex-col gap-3"
      onSubmit={e => { e.preventDefault(); form.handleSubmit() }}
    >
      <form.AppField
        name="keycrmOrderId"
        children={field => <field.FormTextField label="№ замовлення" />}
      />
      <form.AppField
        name="keycrmManager"
        children={field => <field.FormTextField label="Менеджер" />}
      />
      <form.AppField
        name="plannedShipDate"
        children={field => <field.InputDate label="Дата відвантаження" />}
      />
    </form>
  )
}

export default CreateOrderForm
