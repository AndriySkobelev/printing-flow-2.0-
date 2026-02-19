import { type FunctionComponent,  } from "react";
import { type HeaderObject, Theme, SimpleTable } from "simple-table-core";
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from "convex/_generated/api";
import "simple-table-core/styles.css";
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
  const { data } = useQuery(convexQuery(api.queries.materials.getMaterials, {}));

  const handleCellClick = (row: any) => {
    console.log("🚀 ~ handleCellClick ~ data:", row)
  }
  
  return (
    <div className="flex flex-col gap-4 p-4">
      <SimpleTable
        editColumns
        theme={theme}
        height={height}
        selectableCells
        expandAll={false}
        rows={[]}
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
 
export default Store;