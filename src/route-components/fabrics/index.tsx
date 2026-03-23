import { lazy, Suspense, memo, useState } from "react";
import z from "zod";
import { type FunctionComponent, useContext } from "react";
import { type HeaderObject } from "simple-table-core";
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from "convex/_generated/api";
import { DialogContext } from '@/contexts/dialog'
import { useCreateFabrics } from "./queries";
import { Button } from "@/components/ui/button";
import CreateFabrics from "./forms/create-fabrics";
import "simple-table-core/styles.css";
import { useAppForm } from "@/components/main-form";
import { Search } from "lucide-react";
const SimpleTable = lazy(() =>
  import('simple-table-core').then(m => ({ default: m.SimpleTable }))
)

interface FabricsProps {
}

const headers: Array<HeaderObject> = [
  {
    accessor: "fabricName",
    label: "Назва",
    width: 80,
    // isSortable: true,
    type: "string",
    minWidth: 200
  },
  { accessor: "color", label: "Колір", width: 200, isSortable: true, type: "string" },
  { accessor: "sku", label: "SKU", width: 150, isSortable: true, type: "string" },
  { accessor: "threds", label: "Номера ниток", width: 200, isSortable: true, type: "string" },
];

interface TableComponentProps {
  rows: Array<any>;
  searchText?: string;
  isLoading?: boolean;
  handleSelectRow?: ({ row, isSelected, selectedRows }: any) => void;
}

const TableComponent = memo(({ rows, searchText = '', isLoading, handleSelectRow }: TableComponentProps) => {
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

const Fabrics: FunctionComponent<FabricsProps> = () => {
  const { data, isLoading } = useQuery(convexQuery(api.queries.fabrics.getFabrics));
  const { mutate: createFabrics } = useCreateFabrics();
  const [search, setSearch] = useState('');
  const { openDialog, closeDialog } = useContext(DialogContext);

  const handleCreateFabrics = (data: any) => {
    console.log("🚀 ~ handleSubmit ~ data:", data)
    createFabrics(data)
    closeDialog();
  }

  const handleOpenDialog = () => {
    openDialog({
      title: 'Додати тканину',
      content: <CreateFabrics
        formId="create-products-form"
        actionSubmit={handleCreateFabrics}/>,
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

  const handleKeyPress = (event: any) => {
    console.log("🚀 ~ handleKeyPress ~ event:", event)
  }
  
  console.log('render')
  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-start justify-end w-fit gap-2">
        <Button type="button" onClick={handleOpenDialog}>Додати тканину</Button>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
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
        <Button type="button" variant='secondary' onClick={handleSearch}>
          <Search size={16} />
        </Button>
      </div>
      <TableComponent rows={data || []} searchText={search} isLoading={isLoading} />
    </div>
  );
}
 
export default Fabrics;