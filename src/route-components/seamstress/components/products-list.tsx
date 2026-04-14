import clsx from 'clsx';
import { type FunctionComponent } from 'react';
import { Trash2 } from 'lucide-react';
import { Separator } from 'radix-ui';
import { ScrollArea } from '@/components/ui/scroll-area';
import Divider from '@/components/ui/divider';

// --- Types ---
export type SizeEntry = { size: string; quantity: number };

export type ProductEntry = {
  isSideWork?: boolean;
  comment?: string;
  specification: { value: string; label: string; price?: number } | null;
  color?: string;
  sizes?: SizeEntry[];
};

// --- ProductItemInfo ---
type ProductItemInfoProps = {
  item: ProductEntry;
};

export const ProductItemInfo: FunctionComponent<ProductItemInfoProps> = ({ item }) => {
  if (item.isSideWork) {
    return (
      <div className='flex flex-col gap-1 flex-1'>
        <span>Каст</span>
        {item.comment && <span className='text-xs text-[#868686]'>{item.comment}</span>}
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-1 flex-1'>
      <div className='flex items-center gap-1 text-primary'>
        <span>{item.specification?.label}</span>
        <Divider type='vertical' className='w-2 mx-2' />
        <span className='text-primary/50'>{item.color}</span>
      </div>
      <div className='flex flex-wrap gap-1 mt-1'>
        {(item.sizes ?? []).map(s => (
          <span key={s.size} className='text-xs px-1.5 py-0.5 rounded bg-primary/5'>
            {s.size}: {s.quantity}
          </span>
        ))}
      </div>
      {item.comment && <span className='text-xs text-[#868686]'>{item.comment}</span>}
    </div>
  );
};

// --- ProductItemMeta ---
type ProductItemMetaProps = {
  item: ProductEntry;
  onRemove?: () => void;
};

export const ProductItemMeta: FunctionComponent<ProductItemMetaProps> = ({ item, onRemove }) => {
  const totalQty = (item.sizes ?? []).reduce((s, sz) => s + sz.quantity, 0);
  const price = item?.specification?.price ?? 0;
  const totalPrice = totalQty * price;

  return (
    <div className='flex flex-col gap-1 items-end self-start'>
      {onRemove && (
        <div className='p-1.5 rounded-md bg-primary/10 cursor-pointer' onClick={onRemove}>
          <Trash2 size={12} />
        </div>
      )}
      {item.isSideWork ? (
        <span className='text-primary/60 text-sm'>?</span>
      ) : (
        <div className='flex gap-1 items-center text-primary/60 text-sm'>
          <span>{totalQty}</span>
          <span>/</span>
          <span>{price ? `x${price}` : '?'}</span>
          <span>=</span>
          <span>{price ? `${totalPrice} грн` : '?'}</span>
        </div>
      )}
    </div>
  );
};

// --- ProductItem ---
type ProductItemProps = {
  item: ProductEntry;
  onRemove?: () => void;
};

export const ProductItem: FunctionComponent<ProductItemProps> = ({ item, onRemove }) => (
  <div>
    <Separator.Root className='flex w-full h-px bg-primary/10 my-2' />
    <div className={clsx('flex gap-2 w-full items-start')}>
      <ProductItemInfo item={item} />
      <ProductItemMeta item={item} onRemove={onRemove} />
    </div>
  </div>
);

// --- ProductsTotal ---
type ProductsTotalProps = {
  data: ProductEntry[];
};

export const ProductsTotal: FunctionComponent<ProductsTotalProps> = ({ data }) => {
  const total = data.reduce((sum, item) => {
    const qty = (item.sizes ?? []).reduce((s, sz) => s + sz.quantity, 0);
    return sum + qty * (item?.specification?.price ?? 0);
  }, 0);

  return (
    <div className='flex gap-1 text-md text-primary/40 justify-end'>
      <span>Загальна сумма:</span>
      <span className='text-primary/80'>{`${total} грн`}</span>
    </div>
  );
};

// --- ProductsList ---
type ProductsListProps = {
  data: ProductEntry[];
  error?: any[];
  onRemove?: (index: number) => void;
};

export const ProductsList: FunctionComponent<ProductsListProps> = ({ data, error = [], onRemove }) => (
  <div className='mt-5'>
    <ScrollArea className='h-50'>
      {error.length > 0 ? (
        <div className='flex justify-center text-xs text-red-500'>
          <span>{error[0]?.message}</span>
        </div>
      ) : (
        data.map((item, i) => (
          <ProductItem
            key={i}
            item={item}
            onRemove={onRemove ? () => onRemove(i) : undefined}
          />
        ))
      )}
    </ScrollArea>
    <Separator.Root className='w-full h-px bg-primary/10 my-2' />
    <ProductsTotal data={data} />
  </div>
);
