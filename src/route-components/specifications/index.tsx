import { type FunctionComponent, lazy, useContext, Suspense } from "react";
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from "convex/_generated/api";
import { type HeaderObject } from "simple-table-core";
import { DialogContext } from '@/contexts/dialog'
import { useCreateSpecification } from "./utils/queries";
import { Button } from "@/components/ui/button";
import { type Specifications } from 'convex/schema'
import SpecificationForm, { type SpecificationFormType } from './forms/create-specefication';
import "simple-table-core/styles.css";
const SimpleTable = lazy(() => 
  import('simple-table-core').then(m => ({ default: m.SimpleTable }))
)
interface ProductsProps {
}

const headers: Array<HeaderObject> = [
  {
    accessor: "name",
    label: "Назва",
    width: 80,
    // isSortable: true,
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
  { accessor: "category", label: "Категорія", width: 200, isSortable: true, type: "string" },
  { accessor: "skuPrefix", label: "SKU префікс", width: 150, isSortable: true, type: "string" },
  {
    width: 150,
    type: 'other',
    isSortable: true,
    label: "Матеріали",
    accessor: "materials",
    cellRenderer: ({ row }) => {
      const materials: Array<any> = Array.isArray(row['materials']) ? row['materials'] : [];
      if (!materials) return null;
      return (
        <div>
          {materials?.map((material: any) => (
            <div>{material.units}</div>
          ))}
        </div>
      );
    }
  },
];
 
const SpecificationsTable: FunctionComponent<ProductsProps> = () => {
  const { data } = useQuery(convexQuery(api.queries.specifications.getSpecifications, {}));
  console.log("🚀 ~ SpecificationsTable ~ data:", data)
  const createMutation = useCreateSpecification();
  const { openDialog, closeDialog } = useContext(DialogContext);

  const handleSubmit = (values: SpecificationFormType) => {
    console.log("🚀 ~ handleSubmit ~ values:", values)
    createMutation.mutate(values as Specifications);
    closeDialog();
  }

  const handleOpenDialog = () => {
    openDialog({
      title: 'Створення специфікації',
      content: <SpecificationForm
        formId="create-specification-form"
        actionSubmit={handleSubmit}/>,
      withForm: true,
      formId: 'create-specification-form',
    });
  }
  
  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="w-fit">
        <Button className="w-full" onClick={handleOpenDialog}>Додати специфікацію</Button>
      </div>
      <Suspense fallback={<div>Loading...</div>}>
        <SimpleTable
          height={400}
          columnResizing
          theme={'custom'}
          rows={data || []}
          enableStickyParents
          enableRowSelection
          onRowSelectionChange={({ row, isSelected, selectedRows }) => {
            console.log('Row selection changed:', { row, isSelected, selectedRows });
          }}
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