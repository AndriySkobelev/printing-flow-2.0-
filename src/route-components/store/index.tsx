import { type FunctionComponent } from "react";
import { type HeaderObject, Theme } from "simple-table-core";
import AppTable from "@/components/ui/app-table";
interface StoreProps {
  height?: number | string;
  theme?: Theme;
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
 
const Store: FunctionComponent<StoreProps> = ({
  height = 500,
  theme
}) => {
  return (
    <div className="flex flex-col gap-4 p-4">
      <AppTable
        editColumns
        theme={theme}
        height={height}
        selectableCells
        expandAll={false}
        rows={[]}
        columnResizing
        enableStickyParents
        rowGrouping={['group', 'data']}
        defaultHeaders={headers}
        getRowId={({ row }) => row.id as string}
      />
    </div>
  );
}
 
export default Store;