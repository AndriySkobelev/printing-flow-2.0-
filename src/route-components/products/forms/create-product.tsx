import { useAppForm } from "@/components/main-form";
import { makeOptions } from "@/components/main-form/select/options";
import { productSizes } from "@/constants";
import { convexQuery } from "@convex-dev/react-query";
import { revalidateLogic } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { api } from "convex/_generated/api";
import { type FunctionComponent } from "react";
import { useStore } from "@tanstack/react-form";
import z from 'zod'
import { useAllColorsByFabric } from '../utils/hooks';

const sizesOptions = productSizes.map((size) => ({
  value: size,
  label: size,
}));

const productSchema = z.object({
  allSizes: z.boolean(),
  allColors: z.boolean(),
  specification: z.string(),
  sizes: z.array(z.object(sizesOptions)),
  colors: z.array(z.object({ value: z.string(), label: z.string() })),
})

type FormValuesType = z.infer<typeof productSchema>;
interface CreateProductFormProps {
  formId: string,
  defaultValues?: FormValuesType,
  actionSubmit: (values: FormValuesType & { fabricName: string }) => void
}
 
const CreateProductForm: FunctionComponent<CreateProductFormProps> = ({
  formId,
  defaultValues,
  actionSubmit
}) => {
  const { data } = useQuery(convexQuery(api.queries.specifications.getSpecificationsWithMaterials));
  
  const form = useAppForm({
    validationLogic: revalidateLogic(),
    validators: {
      onDynamic: productSchema,
    },
    defaultValues: defaultValues || {
      allSizes: false,
      specification: '',
      sizes: [],
      colors: [],
      allColors: false,
    },
    onSubmit: ({ value }) => {
      const findSpec = data?.find(el => el._id === value.specification);
      const materials = findSpec?.materials || [];
      const fabric = materials[0] as any;
      actionSubmit({ ...value, fabricName: fabric.fabricName })
    }
  })

  const specification = useStore(form.store, (state: any) => state.values.specification);

  const colorsOptions = useAllColorsByFabric(specification, data);

  return (
    <>
      <form
        id={formId}
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
        className="flex flex-col gap-3"
      >
        <form.AppField
          name="specification"
          children={(field) => <field.FormSelect options={makeOptions(data || [], 'name', '_id')} label="Специфікація" />}
        />
        <div className='flex gap-2'>
          <form.AppField
            name="allSizes"
            children={(field) => (
              <div
                onClick={() => {
                  const currentSate = field.state.value;
                  field.setValue(!currentSate)
                }}
                className={`flex gap-2 items-start px-4 py-2 border ${field.state.value ? 'border-primary' : 'border-primary/10'} bg-primary/5 rounded-md`}
              >
                <input name='allSizes' id='allSizes' checked={field.state.value as boolean} className='accent-primary' type='checkbox' />
                <div className="flex flex-col gap-1">
                  <label htmlFor="allSizes" className="text-sm w-fit text-primary font-bold leading-none">Всі розміри</label>
                  <span className="text-xs text-primary cursor-default">Будуть задіяні всі існуючі розміри</span>
                </div>
              </div>
            )}
          />
          <form.AppField
            name="allColors"
            children={(field) => (
              <div
                onClick={() => {
                  const currentSate = field.state.value;
                  field.setValue(!currentSate)
                }}
                className={`flex gap-2 items-start px-4 py-2 border ${field.state.value ? 'border-primary' : 'border-primary/10'} bg-primary/5 rounded-md`}
              >
                <input name='allColors' id='allColors' checked={field.state.value as boolean} className='accent-primary' type='checkbox' />
                <div className="flex flex-col gap-1">
                  <label htmlFor="allColors" className="text-sm w-fit text-primary font-bold leading-none">Всі кольори</label>
                  <span className="text-xs text-primary cursor-default">Будуть задіяні всі кольори по основній тканиниі</span>
                </div>
              </div>
            )}
          />
        </div>
        <form.Subscribe selector={(state) => state.values.allSizes} >
          {
            (allSizes) => 
              !allSizes
              ? (
                <form.AppField
                  name="sizes"
                  children={(field) => <field.FormSelect isMulti={true} options={sizesOptions} label="Розміри" />}
                />
              )
              : null
          }
        </form.Subscribe>
        <form.Subscribe selector={(state) => state.values.allColors}>
          {
            (allColors) => 
              !allColors
              ? (
                <form.AppField
                  name='colors'
                  children={(field) => <field.FormSelect isMulti={true} options={colorsOptions} label="Кольори" />}
                />
              )
              : null
          }
        </form.Subscribe>
      </form>
    </>
  );
}
 
export default CreateProductForm;