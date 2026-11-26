import { useContext } from 'react'
import { omit } from 'ramda'
import { type Id } from 'convex/_generated/dataModel'
import { DialogContext } from '@/contexts/dialog'
import { EditSpecifications } from '../forms/edit-specifications'
import { type SpecificationFormType } from '../forms/create-specification'
import { useUpdateSpecification } from './queries'

type EditValues = SpecificationFormType | (SpecificationFormType & { _id: Id<'specifications'>; _creationTime: string })

// The spec edit dialog — shared by the specifications list and a spec's own page.
export const useEditSpecificationDialog = () => {
  const { mutate: updateSpec } = useUpdateSpecification()
  const { openDialog, closeDialog } = useContext(DialogContext)

  const handleSubmit = (values: EditValues) => {
    if ('_id' in values && '_creationTime' in values) {
      const materials = values.materials.map((material) => ({
        lineId:   (material as any).lineId,
        id:       material.id?.value as Id<'fabrics'> | Id<'materials'>,
        type:     material.type,
        name:     material.name,
        quantity: material.quantity,
      }))
      const { category_crm, ...rest } = values
      updateSpec({
        id: values._id,
        data: {
          ...omit(['_id', '_creationTime', 'materials'], rest),
          materials,
          category_crm_id: category_crm ? Number(category_crm.value) : undefined,
          category_name:   category_crm?.label,
        } as any,
      })
    }
    closeDialog()
  }

  return (specification: any) =>
    openDialog({
      title:     'Редагування специфікації',
      className: 'sm:w-300 sm:max-w-300',
      content:   <EditSpecifications formId="edit-specification-form" actionSubmit={handleSubmit} specification={specification} />,
      withForm:  true,
      formId:    'edit-specification-form',
    })
}
