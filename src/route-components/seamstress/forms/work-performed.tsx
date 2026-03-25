import z from 'zod';
import clsx from 'clsx';
import { pick, remove } from 'ramda';
import { Key, useState, type FunctionComponent } from 'react';
import { revalidateLogic } from "@tanstack/react-form";
import { useAppForm } from '@/components/main-form';
import { Button } from '@/components/ui/button';
import { Dot, Pencil, Trash2, PlusIcon } from 'lucide-react';
import { useAsyncOptions } from '@/hooks';
import { api } from 'convex/_generated/api';
import { Separator } from 'radix-ui';
import { ScrollArea } from '@/components/ui/scroll-area';


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
  date: z.number({ error: 'Заповніть дату' }).nullable(),
  products: z.array(z.object(), { error: 'Додайте вироби' }).min(1, 'Додайте хочаб один виріб'),
  product: z.object().optional().nullable(),
  quantity: z.number().optional(),
});

const defaultFormValues = {
  quantity: 1
}

type ProductListType = {
  error: any,
  handleRemove: (index: number) => void
  data: Array<{
    product: { value: string, label: string },
    quantity: number,
  }>,
}

const price = 100;
const ProductsList = ({ data, error, handleRemove }: ProductListType) => {
  console.log("🚀 ~ ProductsList ~ error:", error)
  
  const sumOfProducts = data.reduce((prev, curr) => prev + (curr.quantity * price), 0)
  return (
    <div className='mt-5'>
      <ScrollArea className='h-70'>

        {
          error.length > 0
          ? (
            <div className='flex justify-center text-xs text-red-500'>
              <span>{error.length > 0 && error[0]?.message}</span>
            </div>
          )
          : data.map((item: any, i: number) => {
            const { quantity, product } = item;
            const { name, color, size, sku } = splitLabel(product.label);
            return (
              <>
                <Separator.Root className='flex w-full h-px bg-primary/10 my-2' />
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
                    <div className='flex gap-1 align-top justify-end'>
                      <div className='p-1.5 rounded-md bg-primary/10'><Pencil size={12} /></div>
                      <div className='p-1.5 rounded-md bg-primary/10' onClick={() => handleRemove(i)}><Trash2 size={12} /></div>
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
          })
        }
      </ScrollArea>
      <Separator.Root className='w-full h-px bg-primary/10 my-2' />
      <div className='flex gap-1 text-md text-primary/40 justify-end'>
        <span>Загальна сумма:</span>
        <span className='text-primary text-primary/80'>{`${sumOfProducts} грн`}</span>
      </div>
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
      onSubmit: (some) => {
        console.log('onSubmit validators', some)
      }
    },
    defaultValues: defaultValues || defaultFormValues,
    onSubmit: ({ value }) => {
      console.log("🚀 ~ WorkPerformedForm ~ value:", value)
      actionSubmit(value)
    }
  });


  console.log("🚀 ~ WorkPerformedForm ~ form:", form.state)
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
        <form.Field name='products' mode='array'>
          {(field) => (
            <>
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
                    label="Кількість"
                    className='flex-2'
                    type='number' />
                )}/>
                <form.Subscribe selector={(state) => [state.values.product, state.values.quantity]}>
                  {([product, quantity]) => (
                    <Button
                      type="button"
                      disabled={!product}
                      onClick={() => {
                        field.pushValue({ product, quantity })
                        form.setFieldValue('product', null);
                        form.resetField('quantity');
                      }}
                    >
                      <PlusIcon size={17}/>
                    </Button>
                  )}
                </form.Subscribe>
              </div>
              <ProductsList
                error={field.state.meta.errors}
                data={field.state.value ?? []}
                handleRemove={field.removeValue} />
            </>
          )}
        </form.Field>
      </form>
    </div>
  );
}
 
export default WorkPerformedForm;