import { type FunctionComponent, lazy, useContext, Suspense } from "react";
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from "convex/_generated/api";
import { type IncomingFormData } from '../incoming-materials/forms/coming';
import { type HeaderObject } from "simple-table-core";
import { DialogContext } from '@/contexts/dialog'
import { useCreateAllMaterials } from "./queries";
import someJsonDataKashkorse from '@/custom-data/materials_rows (kashkorse).json'
import someJsonDataRiabana from '@/custom-data/materials_rows (ribana).json'
import someJsonDataTape from '@/custom-data/materials_rows.json'
import { Button } from "@/components/ui/button";
import "simple-table-core/styles.css";
const SimpleTable = lazy(() => 
  import('simple-table-core').then(m => ({ default: m.SimpleTable }))
)
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

const convertDataMaterials = () => {
  const data = someJsonDataTape;
  const newData = data.map((el: any) => {
    return {
      units: 'м',
      name: 'Стрічка кіперна',
      sku: el.sku,
      color: el.color,
      category: el.category,
      skuNumber: el.skuNumber,
      skuPrefix: el.skuPrefix,
    }
  })

  return newData;
}
 
const SpecificationsTable: FunctionComponent<ProductsProps> = () => {
  const { data } = useQuery(convexQuery(api.queries.materials.getMaterials, {}));
  const createMutation = useCreateAllMaterials();
  const { openDialog, closeDialog } = useContext(DialogContext);

  const handleSubmit = (data: IncomingFormData) => {
    console.log("🚀 ~ handleSubmit ~ data:", data)
    // createMutation.mutate(data);
    closeDialog();
  }

  const handleOpenDialog = () => {
    // openDialog({
    //   title: 'Росхід матеріал',
    //   content: <ComingMaterialForm
    //     defaultValue={{}}
    //     formId="consumption-material-form"
    //     actionSubmit={(data) => handleSubmit({ ...data, type: 'outgoing' })}/>,
    //   withForm: true,
    //   formId: 'consumption-material-form',
    // });
  }

  const handleCellClick = (row: any) => {
    console.log("🚀 ~ handleCellClick ~ data:", row)
  }

  const handleCrateMaterial = () => {
    createMutation.mutate({ materials: convertDataMaterials() })
    console.log('convertDataMaterials', convertDataMaterials())
  }
  
  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="w-fit">
        <Button className="w-full" onClick={handleCrateMaterial}>Додати специфікацію</Button>
      </div>
      <Suspense fallback={<div>Loading...</div>}>
        <SimpleTable
          rows={[]}
          height={400}
          theme={'custom'}
          columnResizing
          enableStickyParents
          onCellClick={handleCellClick}
          // rowGrouping={['group', 'data']}
          defaultHeaders={headers}
          customTheme={{
            rowHeight: 40,
            headerHeight: 50,
          }}
          getRowId={({ row }) => row.id as string}
        />
      </Suspense>
    </div>
  );
}
 
export default SpecificationsTable;