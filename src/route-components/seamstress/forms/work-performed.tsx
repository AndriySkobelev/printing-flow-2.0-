import z from 'zod';
import clsx from 'clsx';
import { pick, omit, remove } from 'ramda';
import { Key, useState, type FunctionComponent } from 'react';
import { revalidateLogic } from "@tanstack/react-form";
import { useAppForm } from '@/components/main-form';
import { Button } from '@/components/ui/button';
import { Dot, Pencil, Trash2, PlusIcon, EditIcon } from 'lucide-react';
import { useAsyncOptions } from '@/hooks';
import { api } from 'convex/_generated/api';
import { Separator } from 'radix-ui';
import { ScrollArea } from '@/components/ui/scroll-area';
import { UTCDate } from '@date-fns/utc';


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
  timeStamp: z.number({ error: 'Заповніть дату' }).nullable(),
  comment: z.string().optional(),
  products: z.array(z.object(), { error: 'Додайте вироби' }).min(1, 'Додайте хочаб один виріб'),
  quantity: z.number().optional().nullable(),
});

const defaultFormValues = {
  quantity: null,
  comment: '',
  timeStamp: new UTCDate().valueOf(),
}

type ProductListType = {
  error: any,
  handleRemove: (index: number) => void
  handleEdit: (index: number) => void
  data: Array<{
    comment?: string,
    product: { value: string, label: string, price: number },
    quantity: number,
  }>,
}

const ProductsList = ({ data, error, handleRemove, handleEdit }: ProductListType) => {
  const sumOfProducts = data.reduce((prev, curr) => prev + (curr.quantity * curr.product?.price), 0)
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
            const { quantity, product, comment } = item;
            const { name, color, size } = splitLabel(product.label);
            return (
              <>
                <Separator.Root className='flex w-full h-px bg-primary/10 my-2' />
                <div key={i} className={clsx('flex gap-2 w-full items-end')}>
                  <div className='flex flex-col gap-1 flex-1'>
                    <div className='flex gap-1 items-center'>
                      <div>{name}</div>
                    </div>
                    <div className='flex items-center gap-1 text-sm text-[#868686]'>
                      <div>{color}</div>
                      <Dot color='#868686' style={{ margin: '0'}}/>
                      <div>{size}</div> 
                    </div>
                    <div className='text-xs text-primary/30'>{comment}</div>
                  </div>
                  <div className='flex flex-col gap-1 self-start justify-end'>
                    <div className='flex gap-1 align-top justify-end'>
                      <div className='p-1.5 rounded-md bg-primary/10' onClick={() => handleEdit(i)}><Pencil size={12} /></div>
                      <div className='p-1.5 rounded-md bg-primary/10' onClick={() => handleRemove(i)}><Trash2 size={12} /></div>
                    </div>
                    <div className='flex gap-1 items-center text-primary/60'>
                      <span >{quantity}</span>
                      <span>{`/`}</span>
                      <span className='text-sm'>{`x${product?.price}`}</span>
                      <span>{` = `}</span>
                      <span className='text-sm'>{product?.price * quantity}{` грн`}</span>
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
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const { loadOptions: loadProductsOptions } = useAsyncOptions(api.queries.products.getSearchProducts, 'products')
  const form = useAppForm({
    validationLogic: revalidateLogic(),
    validators: {
      onDynamic: formSchema,
      onSubmit: (some) => {
      }
    },
    defaultValues: defaultValues || defaultFormValues,
    onSubmit: ({ value }) => {
      const allProductsQuantity = value.products.reduce((prev: number, curr: { quantity: number }) => prev + curr.quantity,0)
      const income = value.products.reduce((prev: number, curr: { quantity: number, product: { price: number} }) => prev + (curr.quantity * curr.product.price), 0)
      const clearProducts = value.products.map((el: any) => ({ id: el?.product.value, quantity: el?.quantity, price: el?.product.price }))
      actionSubmit(omit(['product', 'quantity', 'comment'], {...value, income, allProductsQuantity, products: clearProducts}))
    }
  });

  const handleEdit = (index: number) => {
    setEditIndex(index)
    const product = form.getFieldValue(`products[${index}]`);
    form.setFieldValue('product', product?.product);
    form.setFieldValue('quantity', product?.quantity);
    form.setFieldValue('comment', product?.comment);
  }

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
        <form.AppField name="timeStamp" children={(field) => (
          <field.InputDate />
        )}/>
        <form.Field name='products' mode='array'>
          {(field) => (
            <>
              <div className='flex flex-row gap-2 items-end'>
                <div className='flex flex-col gap-2 w-full'>
                  <div className='flex flex-row gap-2 items-end w-full'>
                    <form.AppField name="product" children={(field) => (
                      <field.FormAsyncSelect
                        label="Виріб"
                        className='flex-4'
                        valueMode='object'
                        modeOption='product'
                        modeControl='compact'
                        asyncOptions={loadProductsOptions} />
                    )}/>
                    <form.AppField name="quantity" children={(field) => (
                      <field.FormTextField
                        label="Кількість"
                        className='flex-1'
                        type='number' />
                    )}/>
                  </div>
                  <form.AppField name="comment" children={(field) => (
                      <field.TextAreaField />
                    )}/>
                </div>
              </div>
              <form.Subscribe selector={(state) => [state.values.product, state.values.quantity, state.values.comment]}>
                {([product, quantity, comment]) => (
                  <Button
                    type="button"
                    disabled={!product}
                    variant='secondary'
                    onClick={() => {
                      if (editIndex !== null) {
                        form.setFieldValue(`products[${editIndex}]`, { product, quantity, comment })
                        setEditIndex(null)
                      } else {
                        field.pushValue({ product, quantity, comment })
                      }
                      form.setFieldValue('product', null);
                      form.resetField('quantity');
                      form.resetField('comment');
                    }}
                  >
                    {
                      editIndex !== null
                      ? <EditIcon size={17}/>
                      : <PlusIcon size={17}/>
                    }
                  </Button>
                )}
              </form.Subscribe>
              <form.Subscribe selector={(state) => state.values.products}>
                {(products) => (
                  <ProductsList
                    error={field.state.meta.errors}
                    data={products ?? []}
                    handleEdit={handleEdit}
                    handleRemove={field.removeValue} />
                )}
              </form.Subscribe>
            </>
          )}
        </form.Field>
      </form>
    </div>
  );
}
 
export default WorkPerformedForm;