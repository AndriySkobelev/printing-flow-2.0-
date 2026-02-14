import * as R from 'ramda'
import { type FunctionComponent, useContext, useMemo, useState } from "react";
import { type CellClickProps, SimpleTable  } from "simple-table-core";
import { useQuery } from '@tanstack/react-query'
import { useCreateIncomingMutation } from '../incoming-materials/queries';
import { convexQuery } from '@convex-dev/react-query'
import { api } from "convex/_generated/api";
import ComingMaterialForm, { type IncomingFormData } from '../incoming-materials/forms/coming';
import type { Materials } from "convex/schema";
import type { HeaderObject, Theme } from "simple-table-core";
import { DialogContext } from '@/contexts/dialog'
import { Button } from '@/components/ui/button';
import "simple-table-core/styles.css";

interface ProductsProps {
}

const headers: Array<HeaderObject> = [
  {
    accessor: "headerName",
    label: "Матеріал / Колір",
    width: 80,
    // isSortable: true,
    expandable: true,
    type: "string",
    // cellRenderer: ({ row }) => {
    //   const name = row['fabricName'];
    //   const count = `(${row['groupCount']})`;
    //   if (!row['groupCount']) return null 
    //   return <div className="flex flex-row gap-2">
    //     <span>{name as string}</span>
    //     <span>{count}</span>
    //   </div>
    // },
    minWidth: 250
  },
  { accessor: "sku", label: "SKU", width: 100, isSortable: true, type: "number" },

];
 
const Products: FunctionComponent<ProductsProps> = () => {
  const { data } = useQuery(convexQuery(api.materials.getMaterials, {}));
  const { openDialog, closeDialog } = useContext(DialogContext);

  const handleSubmit = (data: IncomingFormData) => {
    console.log("🚀 ~ handleSubmit ~ data:", data)
    // createMutation.mutate(data);
    closeDialog();
  }

  const handleOpenDialog = () => {
    openDialog({
      title: 'Росхід матеріал',
      content: <ComingMaterialForm
        defaultValue={{}}
        formId="consumption-material-form"
        actionSubmit={(data) => handleSubmit({ ...data, type: 'outgoing' })}/>,
      withForm: true,
      formId: 'consumption-material-form',
    });
  }

  const handleCellClick = (row: any) => {
    console.log("🚀 ~ handleCellClick ~ data:", row)
  }
  
  return (
    <div className="flex flex-col gap-4 p-4">
      <SimpleTable
        rows={[]}
        editColumns
        height={400}
        theme={'custom'}
        selectableCells
        expandAll={false}
        columnResizing
        enableStickyParents
        onCellClick={handleCellClick}
        rowGrouping={['group', 'data']}
        defaultHeaders={headers}
        customTheme={{
          rowHeight: 40,
          headerHeight: 50,
        }}
        getRowId={({ row }) => row.id as string}
      />
    </div>
  );
}
 
export default Products;