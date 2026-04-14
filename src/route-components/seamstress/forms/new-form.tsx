import z from 'zod';
import clsx from 'clsx';
import { useState, useMemo, type FunctionComponent } from 'react';
import { revalidateLogic } from "@tanstack/react-form";
import { useAppForm } from '@/components/main-form';
import { Button } from '@/components/ui/button';
import { PlusIcon, CheckIcon, Trash2 } from 'lucide-react';
import { api } from 'convex/_generated/api';
import { useQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { UTCDate } from '@date-fns/utc';
import { TextField } from '@/components/main-form/text-field';
import { ProductsList, type SizeEntry, type ProductEntry } from '@/route-components/seamstress/components/products-list';

// --- Schema ---
const formSchema = z.object({
  comment: z.string().optional(),
  isSideWork: z.boolean().optional(),
  timeStamp: z.number({ error: 'Заповніть дату' }).nullable(),
  products: z.array(z.object(), { error: 'Додайте вироби' }).min(1, 'Додайте хочаб один виріб'),
});

const defaultFormValues = {
  comment: '',
  color: null,
  products: [],
  isSideWork: false,
  specification: null,
  timeStamp: new UTCDate().valueOf(),
};

// --- Props ---
interface NewFormProps {
  formId: string;
  defaultValues?: any;
  actionSubmit: (values: any) => void;
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
      const clearProducts = value.products.map((el: any) => ({
        color: el.color,
        comment: el.comment,
        sizes: el.sizes ?? [],
        isSideWork: el.isSideWork ?? false,
        price: el?.specification?.price ?? '?',
        specification: el?.specification?.value ?? null,
      }));
      const allProductsQuantity = clearProducts.reduce((sum: number, p: any) =>
        sum + (p.sizes as SizeEntry[]).reduce((s: number, sz) => s + Number(sz.quantity), 0), 0);
      const income = clearProducts.reduce((sum: number, p: any) =>
        sum + (p.sizes as SizeEntry[]).reduce((s: number, sz) => s + Number(sz.quantity) * Number(p.price), 0), 0);
      actionSubmit({ timeStamp: value.timeStamp, income, allProductsQuantity, products: clearProducts });
    },
  });

  return (
    <div>
      <form
        id={formId}
        onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }}
        className="flex flex-col gap-3"
      >
        <div className='flex gap-2 items-end'>
          <form.AppField name="timeStamp" children={(field) => <field.InputDate />} />
          <form.AppField name="isSideWork">
            {(field) => (
              <div
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-2 rounded-lg border cursor-pointer select-none text-sm transition-colors',
                  field.state.value
                    ? 'bg-primary text-white border-primary'
                    : 'border-[#e7e3e4] text-primary/50 hover:bg-primary/5'
                )}
                onClick={() => field.handleChange(!field.state.value)}
              >
                <div className={clsx('flex size-4 shrink-0 items-center justify-center rounded-lg border transition-colors', field.state.value ? 'bg-white border-white' : 'border-current opacity-60')}>
                  {field.state.value && <CheckIcon size={10} className='text-primary' />}
                </div>
                <span>Каст</span>
              </div>
            )}
          </form.AppField>
        </div>
        <form.Subscribe selector={(state) => state.values.isSideWork}>
          {(isSideWork: any) => isSideWork ? null : (
          <>
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
                    <div className='grid grid-cols-7 gap-2'>
                      {allSizes.map(size => {
                        const isAdded = size in sizeQuantities;
                        return (
                          <span
                            key={size}
                            onClick={() => {
                              if (!isAdded) setSizeQuantities(prev => ({ ...prev, [size]: 1 }));
                            }}
                            className={clsx(
                              'text-xs px-2.5 py-1 text-center rounded cursor-pointer select-none transition-colors',
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
          </>
        )}
        </form.Subscribe>

        <form.AppField
          name="comment"
          children={(field) => <field.TextAreaField />}
        />

        <form.Field name='products' mode='array'>
          {(field) => (
            <>
              <form.Subscribe
                selector={(state) => ({
                  isSideWork: state.values.isSideWork,
                  specification: state.values.specification,
                  color: state.values.color,
                  comment: state.values.comment,
                })}
              >
                {({ isSideWork, specification, color, comment }: any) => {
                  const hasQuantities = Object.values(sizeQuantities).some(q => q > 0);
                  const canAdd = isSideWork || (!isSideWork && specification && color && hasQuantities);
                  return (
                    <Button
                      type='button'
                      variant='secondary'
                      disabled={!canAdd}
                      onClick={() => {
                        if (isSideWork) {
                          field.pushValue({ isSideWork: true, specification: null, comment });
                        } else {
                          const sizesArray = Object.entries(sizeQuantities)
                            .filter(([_, qty]) => qty > 0)
                            .map(([size, quantity]) => ({ size, quantity }));
                          field.pushValue({ specification, color, sizes: sizesArray, comment });
                          form.setFieldValue('color', null);
                          form.setFieldValue('specification', null);
                          setSizeQuantities({});
                        }
                        form.setFieldValue('comment', '');
                        form.setFieldValue('isSideWork', false);
                      }}
                    >
                      <PlusIcon size={17} />
                    </Button>
                  );
                }}
              </form.Subscribe>
              <form.Subscribe selector={(state) => state.values.products}>
                {(products: any) => (
                  <ProductsList
                    data={products ?? []}
                    error={field.state.meta.errors}
                    onRemove={field.removeValue}
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