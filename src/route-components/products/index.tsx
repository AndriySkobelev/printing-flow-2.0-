import { lazy, Suspense, memo, useState } from "react";
import z from "zod";
import { uniq, remove } from "ramda";
import { type FunctionComponent, useContext } from "react";
import { type HeaderObject } from "simple-table-core";
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from "convex/_generated/api";
import { DialogContext } from '@/contexts/dialog'
import { useCreateProducts } from "./queries";
import { Button } from "@/components/ui/button";
import CreateProductForm from "./forms/create-product";
import "simple-table-core/styles.css";
import { useAppForm } from "@/components/main-form";
import { Search } from "lucide-react";
import ChangeMaterials from "./forms/change-materials";
const SimpleTable = lazy(() =>
  import('simple-table-core').then(m => ({ default: m.SimpleTable }))
)

const searchSchema = z.object({
  search: z.string(),
});
interface ProductsProps {
}

const headers: Array<HeaderObject> = [
  {
    accessor: "name",
    label: "Назва",
    width: 80,
    // isSortable: true,
    type: "string",
    minWidth: 200
  },
  { accessor: "size", label: "Розмір", width: 120, isSortable: true, type: "string" },
  { accessor: "color", label: "Колір", width: 120, isSortable: true, type: "string" },
  { accessor: "style", label: "Стиль", width: 120, isSortable: true, type: "string" },
  { accessor: "sku", label: "SKU", width: 150, isSortable: true, type: "string" },
];

interface TableComponentProps {
  rows: Array<any>;
  searchText: string;
  isLoading: boolean;
  handleSelectRow: ({ row, isSelected, selectedRows }: any) => void;
}

const TableComponent = memo(({ rows, searchText, isLoading, handleSelectRow }: TableComponentProps) => {
  return (
    <Suspense fallback={<div className="text-red w-1 h-1">Loading..</div>}>
      <SimpleTable
        editColumns
        height={500}
        selectableCells
        rows={rows || []}
        expandAll={false}
        enableRowSelection
        enableStickyParents
        isLoading={isLoading}
        theme={'modern-light'}
        quickFilter={{
          mode: 'smart',
          text: searchText,
          caseSensitive: false,
        }}
        onRowSelectionChange={handleSelectRow}
        rowGrouping={['group', 'data']}
        defaultHeaders={headers}
        getRowId={(row) => row.row._id as string}
        customTheme={{
          rowHeight: 40,
          headerHeight: 50,
        }}
      />
    </Suspense>
  );
});

const Products: FunctionComponent<ProductsProps> = () => {
  const { data, isLoading } = useQuery(convexQuery(api.queries.products.getProductsWithSpec));
  console.log("🚀 ~ Products ~ isLoading:", isLoading)
  const [search, setSearch] = useState('');
  const [selectedData, setSelectedData] = useState<Array<any>>([]);
  const createProduct = useCreateProducts();
  const { openDialog, closeDialog } = useContext(DialogContext);

  const handleSubmit = (data: any) => {
    console.log("🚀 ~ handleSubmit ~ data:", data)
    createProduct.mutate(data);
    closeDialog();
  }

  const handleOpenDialog = () => {
    openDialog({
      title: 'Росхід матеріал',
      content: <CreateProductForm
        formId="create-products-form"
        actionSubmit={handleSubmit}/>,
      withForm: true,
      formId: 'create-products-form',
    });
  }

  const form = useAppForm({
    defaultValues: { search: ''},
  })
  
  const handleSearch = () => {
    const searchValue = form.state.values.search || '';
    setSearch(searchValue);
  }

  const handleSelectRow = ({ row, isSelected, selectedRows }: any) => {
    console.log({ row, isSelected, selectedRows })
    const arrSelected = Array.from(selectedRows.values()) as Array<string>;
    const splitId = arrSelected.map((el) => String(el).match(/-(\w+)$/)?.[1] || '');
    const getRowData = data ? splitId.map((rowIndex: string) => data.find(el => el._id === rowIndex)) : [];
    setSelectedData(getRowData)
  }

  const handleChangeMaterials = () => {
    console.log('selectedData', selectedData)
    openDialog({
      title: 'Редагувати матеріали',
      content: <ChangeMaterials
        formId="change-materials-form"
        actionSubmit={handleSubmit}
        specificationIds={uniq(selectedData.map((el) => el.parentId))}/>,
      withForm: true,
      formId: 'change-materials-form',
    });
  }
  
  console.log('render')
  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-start justify-end w-fit gap-2">
        <Button type="button" onClick={handleOpenDialog}>Додати товари</Button>
        <form>
          <form.AppField
            name="search"
            children={(field) =>
              <field.FormTextField
                type="text"
                placeholder="Пошук..."/>
            }
          />
        </form>
        <Button type="button" variant='secondary' onClick={handleSearch}>
          <Search size={16} />
        </Button>
        <Button type="button" variant='secondary' disabled={selectedData?.length === 0} onClick={handleChangeMaterials}>
          Редагувати матеріали
        </Button>
      </div>
      <TableComponent rows={data || []} searchText={search} isLoading={isLoading} handleSelectRow={handleSelectRow} />
    </div>
  );
}
 
export default Products;