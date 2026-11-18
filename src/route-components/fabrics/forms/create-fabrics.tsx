import z from 'zod'
import { type FunctionComponent, useContext } from "react";
import { useAppForm } from "@/components/main-form";
import { revalidateLogic } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "convex/_generated/api";
import { type Id } from "convex/_generated/dataModel";
import { Plus } from "lucide-react";
import { DialogContext } from "@/contexts/dialog";
import { Button } from "@/components/ui/button";
import { SupplierForm } from "@/route-components/suppliers/forms/supplier-form";
import { useCreateSupplier } from "@/route-components/suppliers/actions";

const SUPPLIER_FORM_ID = 'fabric-supplier-form'

const fabricUnitsOptions = [
  { value: 'кг', label: 'кг' },
  { value: 'м', label: 'м' },
]

const formSchema = z.object({
  name: z.string().min(1),
  skuPrefix: z.string().min(1),
  units: z.enum(['кг', 'м']),
  processingType: z.string().nullable().optional(),
  supplierId: z.custom<Id<'suppliers'>>().nullable().optional(),
})

type FormValuesType = z.infer<typeof formSchema>;

interface CreateFabricFormProps {
  formId: string
  isEdit?: boolean
  defaultValues?: Partial<FormValuesType>
  actionSubmit: (values: FormValuesType) => void
}

const CreateFabricForm: FunctionComponent<CreateFabricFormProps> = ({ formId, isEdit, defaultValues, actionSubmit }) => {
  const { data: suppliers = [] } = useQuery(convexQuery(api.queries.suppliers.getSuppliers, {}))
  const supplierOptions = suppliers.map(s => ({ value: s._id, label: s.name }))
  const { openDialog, closeDialog } = useContext(DialogContext)
  const { mutate: createSupplier } = useCreateSupplier()

  const form = useAppForm({
    validationLogic: revalidateLogic(),
    validators: { onDynamic: formSchema },
    defaultValues:  defaultValues ?? { name: '', skuPrefix: '', units: '', processingType: null, supplierId: null },
    onSubmit: ({ value }) => actionSubmit({ ...value, supplierId: value.supplierId ?? null } as FormValuesType),
  })

  const handleAddSupplier = () => {
    const id = openDialog({
      title: 'Додати постачальника',
      formId: SUPPLIER_FORM_ID,
      withForm: true,
      content: (
        <SupplierForm
          formId={SUPPLIER_FORM_ID}
          onSubmit={(values) =>
            createSupplier(values, {
              onSuccess: (supplierId) => {
                form.setFieldValue('supplierId', supplierId)
                closeDialog(id)
              },
            })
          }
        />
      ),
    })
  }

  return ( 
    <form
      id={formId}
      onSubmit={(e) => { e.preventDefault(); form.handleSubmit() }}
      className="flex flex-col gap-3"
    >
      <div className="flex gap-2 items-end">
        <form.AppField name="name" children={(f) => <f.FormTextField label="Назва" />} />
        <form.AppField name="processingType" children={(f) => <f.FormTextField label="Обробка" />} />
      </div>
      <div className="flex gap-2 items-end">
        <form.AppField name="skuPrefix" children={(f) => isEdit
          ? <f.FormTextField label="SKU префікс" disabled />
          : (
            <f.FormAsyncTextField
              label="SKU префікс"
              buildArgs={(value) => ({ skuPrefix: value })}
              isTaken={(result) => result?.exists === true}
              query={api.queries.fabrics.checkSkuPrefix}
              takenMessage="Цей SKU префікс вже використовується"
            />
          )
        } />
        <form.AppField name="units" children={(f) => <f.FormSelect options={fabricUnitsOptions} label="Одиниці вим." />} />
      </div>
      <div className="flex gap-2 items-end">
        <form.AppField name="supplierId" children={(f) => <f.FormSelect isClearable options={supplierOptions} label="Постачальник" />} />
        <Button type="button" variant="outline" size="icon" className="size-[38px] shrink-0" title="Додати постачальника" onClick={handleAddSupplier}>
          <Plus size={16} />
        </Button>
      </div>
    </form>
  )
}

export default CreateFabricForm
