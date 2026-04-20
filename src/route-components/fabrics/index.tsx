import { useState } from "react";
import { type FunctionComponent, useContext } from "react";
import { type HeaderObject } from "simple-table-core";
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from "convex/_generated/api";
import { DialogContext } from '@/contexts/dialog'
import { useCreateFabrics, useCreateFabricsName } from "./queries";
import { Button } from "@/components/ui/button";
import CreateFabrics from "./forms/create-fabrics";
import { useAppForm } from "@/components/main-form";
import { Search } from "lucide-react";
import AppTable from "@/components/ui/app-table";

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


const Fabrics: FunctionComponent<FabricsProps> = () => {
  const { data, isLoading } = useQuery(convexQuery(api.queries.fabrics.getFabrics));
  const { mutate: migrateFabricsAddName } = useCreateFabricsName();
  const { mutate: createFabrics } = useCreateFabrics();
  const [search, setSearch] = useState('');
  const { openDialog, closeDialog } = useContext(DialogContext);

  const handleCreateFabrics = (data: any) => {
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
  
  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-start justify-end w-fit gap-2">
        <Button type="button" onClick={handleOpenDialog}>Додати тканину</Button>
        <Button type="button" onClick={() => migrateFabricsAddName({})}>Додати name</Button>
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
      <AppTable
        editColumns
        height={500}
        selectableCells
        rows={data || []}
        expandAll={false}
        enableRowSelection
        enableStickyParents
        isLoading={isLoading}
        quickFilter={{ mode: 'smart', text: search, caseSensitive: false }}
        rowGrouping={['group', 'data']}
        defaultHeaders={headers}
        getRowId={(row) => row.row._id as string}
      />
    </div>
  );
}
 
export default Fabrics;