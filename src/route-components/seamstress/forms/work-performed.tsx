import z from 'zod';
import clsx from 'clsx';
import { pick } from 'ramda';
import { Key, useState, type FunctionComponent } from 'react';
import { revalidateLogic } from "@tanstack/react-form";
import { useAppForm } from '@/components/main-form';
import { Button } from '@/components/ui/button';
import { Dot, Pencil, Trash2, PlusIcon } from 'lucide-react';
import { useAsyncOptions } from '@/hooks';
import { api } from 'convex/_generated/api';
import { Separator } from 'radix-ui';

 

const regex4 = /^([^·]+) · ([^·]+) · ([^·]+) · ([^·]+)$/;
const splitLabel = (label: string) => {
  const regLabel = label.match(regex4) || [];
  const [_, name, size, color, sku] = regLabel || [];
  return { name, color, size, sku };
}
interface WorkPerformedFormProps {
  formId: string,
  actionSubmit: (values: any) => void,
  defaultValues?: any,
}

const formSchema = z.object({
  date: z.number(),
  product: z.object().optional(),
  quantity: z.number().optional(),
});

const defaultFormValues = {

}

type ProductListType = {
  data: Array<{
    product: { value: string, label: string },
    quantity: number,
  }>,
}

const price = 100;
const ProductsList = ({ data }: ProductListType) => {

  return (
    <div className='mt-5'>
      {data.map((item: any, i: Key) => {
        const { quantity, product } = item;
        const { name, color, size, sku } = splitLabel(product.label);
        return (
          <>
            <Separator.Root className='w-full h-px bg-primary/10 my-2' />
            <div key={i} className={clsx('flex gap-2 w-full items-end')}>
              <div className='flex flex-col gap-1 flex-1'>
                <div className='flex gap-1 items-center'>
                  <div>{name}</div>
                  {/* <div className='text-sm text-[#868686]'>{sku}</div> */}
                </div>
                <div className='flex items-center gap-1 text-sm text-[#868686]'>
                  <div>{color}</div>
                  <Dot color='#868686' style={{ margin: '0'}}/>
                  <div>{size}</div> 
                </div>
              </div>
              <div>
                <div className='flex gap-1 align-top'>
                  <div className='p-1.5 rounded-md bg-primary/10'><Pencil size={12} /></div>
                  <div className='p-1.5 rounded-md bg-primary/10'><Trash2 size={12} /></div>
                </div>
                <div className='flex gap-1 items-center text-primary/60'>
                  <span >{quantity}</span>
                  <span>{`/`}</span>
                  <span className='text-sm'>x100</span>
                  <span>{` = `}</span>
                  <span className='text-sm'>{price * quantity}{` грн`}</span>
                </div>
              </div>
            </div>
          </>
        )
      }
    )}
    </div>
  );
}
 
const WorkPerformedForm: FunctionComponent<WorkPerformedFormProps> = ({ formId, defaultValues, actionSubmit }) => {
  const [data, setData] = useState<Array<any>>([]);
  const { loadOptions: loadProductsOptions } = useAsyncOptions(api.queries.products.getSearchProducts, 'materials')
  const form = useAppForm({
    validationLogic: revalidateLogic(),
    validators: {
      onDynamic: formSchema,
    },
    defaultValues: defaultValues || defaultFormValues,
    onSubmit: ({ value }) => {
      console.log("🚀 ~ WorkPerformedForm ~ value:", value)
      actionSubmit(value)
    }
  });

  const handleAddProduct = () => {
    const values = form.state.values;
    setData((prev) => [...prev, pick(['product', 'quantity'], values)])
    form.resetField('product');
    form.resetField('quantity');
  }

  console.log("🚀 ~ WorkPerformedForm ~ form:", form.state.values)
  return (
    <div>
      <form
        id={formId}
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
        className="flex flex-col gap-3"
      >
        <form.AppField name="date" children={(field) => (
          <field.InputDate />
        )}/>
        <div className='flex flex-row gap-2 items-end'>
          <form.AppField name="product" children={(field) => (
            <field.FormAsyncSelect
              label="Виріб"
              className='flex-3'
              valueMode='object'
              modeOption='product'
              asyncOptions={loadProductsOptions} />
          )}/>
          <form.AppField name="quantity" children={(field) => (
            <field.FormTextField
              label="Виріб"
              className='flex-2'
              type='number' />
          )}/>
          <Button type="button" onClick={handleAddProduct}><PlusIcon size={17}/></Button>
        </div>
      </form>
      <ProductsList data={data} />
    </div>
  );
}
 
export default WorkPerformedForm;