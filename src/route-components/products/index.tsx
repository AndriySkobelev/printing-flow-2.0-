import { useState } from "react";
import { uniq } from "ramda";
import { type FunctionComponent, useContext } from "react";
import { type HeaderObject } from "simple-table-core";
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from "convex/_generated/api";
import { DialogContext } from '@/contexts/dialog'
import { useCreateProducts, useUpdateProducts } from "./queries";
import { Button } from "@/components/ui/button";
import CreateProductForm from "./forms/create-product";
import { useAppForm } from "@/components/main-form";
import { Search, Shirt } from "lucide-react";
import ChangeMaterials from "./forms/change-materials";
import { Spinner } from "@/components/ui/spinner";
import AppTable from "@/components/ui/app-table";
import { MaterialsCellComponent } from "../specifications";
import { MyPopover } from "@/components/my-popover";
interface ProductsProps {
}

const headers: Array<HeaderObject> = [
  {
    accessor: "specName",
    label: "Назва",
    width: 80,
    // isSortable: true,
    type: "string",
    minWidth: 200
  },
  { accessor: "size", label: "Розмір", width: 120, isSortable: true, type: "string" },
  { accessor: "color", label: "Колір", width: 120, isSortable: true, type: "string" },
  {
    accessor: "style", label: "Матеріали", width: 120, isSortable: true, type: "string",
    cellRenderer: ({ row }) => {
      const materials: Array<any> = Array.isArray(row['resolvedMaterials']) ? row['resolvedMaterials'] : [];
      if (!materials) return null;
      return (
        <MyPopover
          trigger={<div className="flex items-center p-1 bg-primary/5 rounded cursor-pointer">
            <Shirt className="cursor-pointer" size={14}/>
            </div>}
          content={<MaterialsCellComponent materials={materials} />}
        />
      );
    }
  },
  { accessor: "sku", label: "SKU", width: 150, isSortable: true, type: "string" },
];

const Products: FunctionComponent<ProductsProps> = () => {
  const { data: dataAllProducts, isLoading } = useQuery(convexQuery(api.queries.products.getProductsWithResolvedMaterials));
  const { mutate: updateProducts } = useUpdateProducts();
  const [search, setSearch] = useState('');
  const [selectedData, setSelectedData] = useState<Array<any>>([]);
  const createProduct = useCreateProducts();
  const { openDialog, closeDialog, setIsLoading } = useContext(DialogContext);

  const handleAddProducts = (data: any) => {
    console.log('data', data)
    createProduct.mutate(data);
    closeDialog();
  }

  const handleSubmitChangeMaterials = (data: any) => {
    setIsLoading(true);
    const ids = selectedData.map((el) => el._id);
    
    updateProducts({ ...data, ids }, {
      onSuccess: () => {
        closeDialog();
        setIsLoading(false);
      }
    });
  }

  const handleOpenDialog = () => {
    openDialog({
      title: 'Додати товари',
      content: <CreateProductForm
        formId="create-products-form"
        actionSubmit={handleAddProducts}/>,
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

  const handleSelectRow = ({ selectedRows }: any) => {
    const arrSelected = Array.from(selectedRows.values()) as Array<string>;
    const splitId = arrSelected.map((el) => String(el).match(/-(\w+)$/)?.[1] || '');
    const getRowData = dataAllProducts ? splitId.map((rowIndex: string) => dataAllProducts.find(el => el._id === rowIndex)) : [];
    setSelectedData(getRowData)
  }

  const handleChangeMaterials = () => {
    openDialog({
      title: 'Редагувати матеріали',
      content: <ChangeMaterials
        formId="change-materials-form"
        actionSubmit={handleSubmitChangeMaterials}
        specificationIds={uniq(selectedData.map((el) => el.parentId))}/>,
      withForm: true,
      className: 'min-w-150',
      formId: 'change-materials-form',
    });
  }
  
  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-start justify-end w-fit gap-2">
        <Button type="button" onClick={handleOpenDialog}>Додати товари</Button>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSearch()
          }}
        >
          <form.AppField
            name="search"
            children={(field) =>
              <field.FormTextField
                type="text"
                placeholder="Пошук..."/>
            }
          />
        </form>
        <Button type="button" variant='secondary'>
          <Search size={16} />
        </Button>
        <Button type="button" variant='secondary' disabled={selectedData?.length === 0} onClick={handleChangeMaterials}>
          Редагувати матеріали
        </Button>
      </div>
      <AppTable
        height={500}
        enableRowSelection
        enableStickyParents
        isLoading={isLoading}
        defaultHeaders={headers}
        rows={dataAllProducts || []}
        rowGrouping={['group', 'data']}
        onRowSelectionChange={handleSelectRow}
        getRowId={(row) => row.row._id as string}
        quickFilter={{ mode: 'smart', text: search, caseSensitive: false }}
        fallback={<div className="flex items-center justify-center w-full h-125"><Spinner className="w-5 h-5" /></div>}
      />
    </div>
  );
}
 
export default Products;