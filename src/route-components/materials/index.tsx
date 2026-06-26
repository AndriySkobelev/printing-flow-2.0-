import { useContext, useState } from 'react';
import { type FunctionComponent } from 'react';
import { type HeaderObject } from 'simple-table-core';
import { useQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { api } from 'convex/_generated/api';
import { type Id } from 'convex/_generated/dataModel';
import { DialogContext } from '@/contexts/dialog';
import { Button } from '@/components/ui/button';
import { Ellipsis, Trash2, SquarePen, Search } from 'lucide-react';
import { MyPopover } from '@/components/my-popover';
import clsx from 'clsx';
import { type Materials } from 'convex/schema';
import { useAppForm } from '@/components/main-form';
import { useCreateMaterials, useUpdateMaterial, useDeleteMaterial } from './queries';
import MaterialForm, { type MaterialFormType } from './forms/material-form';
import MaterialEditForm, { type MaterialEditFormType } from './forms/material-edit-form';
import AppTable from '@/components/ui/app-table';

const actionsList = [
  { icon: <SquarePen size={12} />, label: 'Редагувати', actionName: 'edit' },
  { icon: <Trash2 size={12} />, label: 'Видалити', actionName: 'delete' },
];

const ActionsCell = ({ row, onEdit }: { row: any; onEdit: (row: any) => void }) => {
  const { mutate: deleteMaterial } = useDeleteMaterial();

  const handleAction = (actionName: string) => {
    if (actionName === 'delete') deleteMaterial({ id: row._id as Id<'materials'> });
    if (actionName === 'edit') onEdit(row);
  };

  return (
    <div className="flex flex-col">
      {actionsList.map((action) => (
        <div
          key={action.actionName}
          onClick={() => handleAction(action.actionName)}
          className={clsx('flex flex-row items-center gap-2 cursor-pointer hover:bg-gray-100 p-2 rounded')}
        >
          {action.icon}
          <span className="text-sm">{action.label}</span>
        </div>
      ))}
    </div>
  );
};

const headers = (onEdit: (row: any) => void): Array<HeaderObject> => [
  { accessor: 'name', label: 'Назва', width: 80, type: 'string', minWidth: 180 },
  { accessor: 'category', label: 'Категорія', width: 150, isSortable: true, type: 'string' },
  { accessor: 'color', label: 'Колір', width: 120, isSortable: true, type: 'string' },
  { accessor: 'size', label: 'Розмір', width: 100, isSortable: true, type: 'string' },
  { accessor: 'units', label: 'Одиниці', width: 100, isSortable: true, type: 'string' },
  { accessor: 'sku', label: 'SKU', width: 140, isSortable: true, type: 'string' },
  { accessor: 'material', label: 'Матеріал', width: 140, isSortable: true, type: 'string' },
  { accessor: 'code', label: 'Код', width: 100, isSortable: true, type: 'string' },
  {
    accessor: '',
    label: '',
    width: 50,
    type: 'other',
    pinned: 'right',
    cellRenderer: ({ row }) => (
      <MyPopover
        trigger={<Ellipsis className="cursor-pointer" size={14} />}
        content={<ActionsCell row={row} onEdit={onEdit} />}
      />
    ),
  },
];


const Materials: FunctionComponent = () => {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useQuery(convexQuery(api.queries.materials.getMaterials));
  const { mutate: createMaterials } = useCreateMaterials();
  const { mutate: updateMaterial } = useUpdateMaterial();
  const { openDialog, closeDialog } = useContext(DialogContext);

  const form = useAppForm({ defaultValues: { search: '' } });
  const handleSearch = () => setSearch(form.state.values.search || '');

  const handleCreate = (values: MaterialFormType) => {
    const colors = values.colors.map(c => c.value);
    const sizes = (values.sizes ?? []).map(s => s.value);

    const combinations: Array<any> = [];
    let idx = 0;

    if (sizes.length > 0) {
      for (const color of colors) {
        for (const size of sizes) {
          const skuNumber = idx + 1;
          combinations.push({
            name: values.name,
            units: values.units,
            category: values.category,
            skuPrefix: values.skuPrefix,
            color,
            size,
            skuNumber,
            sku: `${values.skuPrefix}-${String(skuNumber).padStart(3, '0')}`,
            searchText: `${values.name}.${color}`,
          });
          idx++;
        }
      }
    } else {
      for (const color of colors) {
        const skuNumber = idx + 1;
        combinations.push({
          name: values.name,
          units: values.units,
          category: values.category,
          skuPrefix: values.skuPrefix,
          color,
          skuNumber,
          sku: `${values.skuPrefix}-${String(skuNumber).padStart(3, '0')}`,
          searchText: `${values.name}.${color}`,
        });
        idx++;
      }
    }

    createMaterials({ materials: combinations });
    closeDialog();
  };

  const handleUpdate = (id: Id<'materials'>, values: MaterialEditFormType) => {
    updateMaterial({ id, data: values });
    closeDialog();
  };

  const handleOpenCreate = () => {
    openDialog({
      title: 'Додати матеріал',
      content: <MaterialForm formId="material-form" actionSubmit={handleCreate} />,
      withForm: true,
      formId: 'material-form',
    });
  };

  const handleOpenEdit = (row: Materials & { _id: Id<'materials'> }) => {
    openDialog({
      title: 'Редагувати матеріал',
      content: (
        <MaterialEditForm
          formId="material-edit-form"
          defaultValues={row}
          actionSubmit={(values) => handleUpdate(row._id, values)}
        />
      ),
      withForm: true,
      formId: 'material-edit-form',
    });
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-start justify-end w-fit gap-2">
        <Button type="button" onClick={handleOpenCreate}>Додати матеріал</Button>
        <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }}>
          <form.AppField
            name="search"
            children={(field) => <field.FormTextField type="text" placeholder="Пошук..." />}
          />
        </form>
        <Button type="button" variant="secondary" onClick={handleSearch}>
          <Search size={16} />
        </Button>
      </div>
      <AppTable
        height={600}
        rows={data || []}
        isLoading={isLoading}
        quickFilter={{
          mode: 'smart',
          text: search,
          caseSensitive: false,
        }}
        defaultHeaders={headers(handleOpenEdit)}
        getRowId={({ row }) => row._id as string}
      />
    </div>
  );
};

export default Materials;
