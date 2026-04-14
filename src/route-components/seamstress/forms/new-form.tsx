import z from 'zod';
import clsx from 'clsx';
import { useState, useMemo, type FunctionComponent } from 'react';
import { revalidateLogic } from "@tanstack/react-form";
import { useAppForm } from '@/components/main-form';
import { Button } from '@/components/ui/button';
import { Dot, PlusIcon, Trash2 } from 'lucide-react';
import { api } from 'convex/_generated/api';
import { Separator } from 'radix-ui';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { TextField } from '@/components/main-form/text-field';

// --- Types ---
type SizeEntry = { size: string; quantity: number };

type ProductEntry = {
  specification: { value: string; label: string; price?: number };
  color: string;
  sizes: SizeEntry[];
};

// --- List ---
type SpecProductsListProps = {
  data: ProductEntry[];
  error: any;
  handleRemove: (index: number) => void;
};

const SpecProductsList: FunctionComponent<SpecProductsListProps> = ({ data, error, handleRemove }) => {
  const total = data.reduce((sum, item) => {
    const qty = item.sizes.reduce((s, sz) => s + sz.quantity, 0);
    return sum + qty * (item.specification.price ?? 0);
  }, 0);

  return (
    <div className='mt-5'>
      <ScrollArea className='h-50'>
        {error.length > 0 ? (
          <div className='flex justify-center text-xs text-red-500'>
            <span>{error[0]?.message}</span>
          </div>
        ) : (
          data.map((item, i) => {
            const totalQty = item.sizes.reduce((s, sz) => s + sz.quantity, 0);
            const price = item.specification.price;
            const totalPrice = price != null ? totalQty * price : null;
            return (
              <div key={i}>
                <Separator.Root className='flex w-full h-px bg-primary/10 my-2' />
                <div className={clsx('flex gap-2 w-full items-start')}>
                  <div className='flex flex-col gap-1 flex-1'>
                    <div>{item.specification.label}</div>
                    <div className='flex items-center gap-1 text-sm text-[#868686]'>
                      <Dot color='#868686' style={{ margin: '0' }} />
                      <div>{item.color}</div>
                    </div>
                    <div className='flex flex-wrap gap-1 mt-1'>
                      {item.sizes.map(s => (
                        <span key={s.size} className='text-xs px-1.5 py-0.5 rounded bg-primary/5'>
                          {s.size}: {s.quantity}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className='flex flex-col gap-1 items-end self-start'>
                    <div
                      className='p-1.5 rounded-md bg-primary/10 cursor-pointer'
                      onClick={() => handleRemove(i)}
                    >
                      <Trash2 size={12} />
                    </div>
                    <div className='flex gap-1 items-center text-primary/60 text-sm'>
                      <span>{totalQty}</span>
                      <span>/</span>
                      <span>{price != null ? `x${price}` : '?'}</span>
                      <span>=</span>
                      <span>{totalPrice != null ? `${totalPrice} грн` : '?'}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </ScrollArea>
      <Separator.Root className='w-full h-px bg-primary/10 my-2' />
      <div className='flex gap-1 text-md text-primary/40 justify-end'>
        <span>Загальна сумма:</span>
        <span className='text-primary/80'>{`${total} грн`}</span>
      </div>
    </div>
  );
};

// --- Schema ---
const formSchema = z.object({
  comment: z.string().optional(),
  products: z.array(z.object(), { error: 'Додайте вироби' }).min(1, 'Додайте хочаб один виріб'),
});

const defaultFormValues = {
  comment: '',
  specification: null,
  color: null,
  products: [],
};

// --- Props ---
interface NewFormProps {
  formId: string;
  actionSubmit: (values: any) => void;
  defaultValues?: any;
}

// --- Component ---
const NewForm: FunctionComponent<NewFormProps> = ({ formId, defaultValues, actionSubmit }) => {
  const [sizeQuantities, setSizeQuantities] = useState<Record<string, number>>({});

  const { data: specificationsData } = useQuery(convexQuery(api.queries.specifications.getSpecifications));
  const { data: productsData } = useQuery(convexQuery(api.queries.products.getProductsWithSpec));

  const specOptions = useMemo(
    () => (specificationsData || []).map(spec => ({
      value: spec._id,
      label: spec.name,
      price: spec.productionPrice as number | undefined,
    })),
    [specificationsData],
  );

  const form = useAppForm({
    validationLogic: revalidateLogic(),
    validators: { onDynamic: formSchema },
    defaultValues: defaultValues || defaultFormValues,
    onSubmit: ({ value }) => {
      actionSubmit(value);
    },
  });

  return (
    <div>
      <form
        id={formId}
        onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }}
        className="flex flex-col gap-3"
      >
        <div className='flex gap-2'>
          <form.AppField
            name="specification"
            children={(field) => (
              <field.FormSelect label="Виріб" valueMode='object' options={specOptions} />
            )}
          />
          <form.Subscribe selector={(state) => state.values.specification}>
            {(specification: any) => {
              const colorOptions = [
                ...new Set(
                  (productsData || [])
                    .filter((p: any) => p.parentId === specification?.value)
                    .map((p: any) => p.color)
                    .filter(Boolean)
                ),
              ].map((c: any) => ({ value: c, label: c }));

              return (
                <form.AppField
                  name="color"
                  children={(field) => (
                    <field.FormSelect label="Колір" options={colorOptions} />
                  )}
                />
              );
            }}
          </form.Subscribe>
        </div>
        <form.Subscribe selector={(state) => ({ specification: state.values.specification, color: state.values.color })}>
          {({ specification, color }: any) => {
            if (!specification || !color) return null;
            const allSizes: string[] = (productsData || [])
              .filter((p: any) => p.parentId === specification.value && p.color === color)
              .map((p: any) => p.size)
              .filter(Boolean);
            if (allSizes.length === 0) return null;
            return (
              <div className='flex flex-col gap-2'>
                <div className='flex flex-wrap gap-2'>
                  {allSizes.map(size => {
                    const isAdded = size in sizeQuantities;
                    return (
                      <span
                        key={size}
                        onClick={() => {
                          if (!isAdded) setSizeQuantities(prev => ({ ...prev, [size]: 1 }));
                        }}
                        className={clsx(
                          'text-xs px-2.5 py-1 rounded cursor-pointer select-none transition-colors',
                          isAdded
                            ? 'bg-primary text-white'
                            : 'bg-primary/5 text-primary hover:bg-primary/15'
                        )}
                      >
                        {size}
                      </span>
                    );
                  })}
                </div>
                {Object.entries(sizeQuantities).length > 0 && (
                  <div className='grid grid-cols-3 gap-1'>
                    {Object.entries(sizeQuantities).map(([size, qty]) => (
                      <div key={size} className='flex items-center gap-2 text-sm px-2 py-1 rounded bg-primary/5'>
                        <span className='w-10 font-medium'>{size}</span>
                        <TextField
                          min={1}
                          type='number'
                          otherValue={qty}
                          inputClassName='h-6'
                          onChange={(e: any) => setSizeQuantities(prev => ({ ...prev, [size]: Number(e.target.value) }))}
                        />
                        <div
                          className='ml-auto p-1 rounded bg-primary/10 cursor-pointer'
                          onClick={() => setSizeQuantities(prev => {
                            const next = { ...prev };
                            delete next[size];
                            return next;
                          })}
                        >
                          <Trash2 size={10} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          }}
        </form.Subscribe>

        <form.AppField
          name="comment"
          children={(field) => <field.TextAreaField />}
        />

        <form.Field name='products' mode='array'>
          {(field) => (
            <>
              <form.Subscribe selector={(state) => ({ specification: state.values.specification, color: state.values.color })}>
                {({ specification, color }: any) => {
                  const hasQuantities = Object.values(sizeQuantities).some(q => q > 0);
                  return (
                    <Button
                      type='button'
                      variant='secondary'
                      disabled={!specification || !color || !hasQuantities}
                      onClick={() => {
                        const sizesArray = Object.entries(sizeQuantities)
                          .filter(([_, qty]) => qty > 0)
                          .map(([size, quantity]) => ({ size, quantity }));
                        field.pushValue({ specification, color, sizes: sizesArray });
                        form.setFieldValue('color', null);
                        setSizeQuantities({});
                      }}
                    >
                      <PlusIcon size={17} />
                    </Button>
                  );
                }}
              </form.Subscribe>
              <form.Subscribe selector={(state) => state.values.products}>
                {(products: any) => (
                  <SpecProductsList
                    data={products ?? []}
                    error={field.state.meta.errors}
                    handleRemove={field.removeValue}
                  />
                )}
              </form.Subscribe>
            </>
          )}
        </form.Field>
      </form>
    </div>
  );
};

export default NewForm;