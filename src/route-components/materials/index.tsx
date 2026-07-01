import { useContext, useState } from 'react';
import { type FunctionComponent } from 'react';
import { type HeaderObject, type CellClickProps } from 'simple-table-core';
import { useQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { api } from 'convex/_generated/api';
import { type Id } from 'convex/_generated/dataModel';
import { DialogContext } from '@/contexts/dialog';
import { Button } from '@/components/ui/button';
import { Trash2, SquarePen, Search } from 'lucide-react';
import { type Materials } from 'convex/schema';
import { useAppForm } from '@/components/main-form';
import { ActionsMenu } from '@/components/actions-menu';
import { useCreateMaterials, useUpdateMaterial, useDeleteMaterial } from './queries';
import MaterialForm, { type MaterialFormType } from './forms/material-form';
import MaterialEditForm, { type MaterialEditFormType } from './forms/material-edit-form';
import { MaterialDetail } from './components/material-detail';
import AppTable from '@/components/ui/app-table';

const headers = (
  onEdit: (row: any) => void,
  onDelete: (id: Id<'materials'>) => void,
): Array<HeaderObject> => [
  { accessor: 'name',     label: 'Назва',    width: 80,  type: 'string', minWidth: 180 },
  { accessor: 'category', label: 'Категорія',width: 150, isSortable: true, type: 'string' },
  { accessor: 'units',    label: 'Одиниці',  width: 100, isSortable: true, type: 'string' },
  { accessor: 'material', label: 'Склад',    width: 140, isSortable: true, type: 'string' },
  { accessor: 'skuPrefix',label: 'SKU prefix',width: 120,isSortable: true, type: 'string' },
  {
    accessor: '_actions',
    label: '',
    width: 50,
    type: 'other',
    pinned: 'right',
    cellRenderer: ({ row }) => (
      <ActionsMenu items={[
        { label: 'Редагувати', icon: <SquarePen className="size-3" />, onClick: () => onEdit(row) },
        { label: 'Видалити',   icon: <Trash2 className="size-3" />, destructive: true, onClick: () => onDelete((row as any)._id) },
      ]} />
    ),
  },
];


const Materials: FunctionComponent = () => {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useQuery(convexQuery(api.queries.materials.getMaterials));
  const { mutate: createMaterials } = useCreateMaterials();
  const { mutate: updateMaterial } = useUpdateMaterial();
  const { mutate: deleteMaterial } = useDeleteMaterial();
  const { openDialog, closeDialog } = useContext(DialogContext);

  const form = useAppForm({ defaultValues: { search: '' } });
  const handleSearch = () => setSearch(form.state.values.search || '');

  const handleCreate = (values: MaterialFormType) => {
    createMaterials({
      ...values,
      material: values.material || undefined,
    });
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

  const handleRowClick = ({ row, accessor }: CellClickProps) => {
    if (accessor === '_actions') return;
    const id = (row as any)._id as Id<'materials'>;
    openDialog({
      title: 'Деталі матеріалу',
      className: 'sm:w-[640px] sm:max-w-[640px]',
      content: <MaterialDetail materialId={id} />,
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
        defaultHeaders={headers(handleOpenEdit, (id) => deleteMaterial({ id }))}
        getRowId={({ row }) => row._id as string}
        onCellClick={handleRowClick}
      />
    </div>
  );
};

export default Materials;
