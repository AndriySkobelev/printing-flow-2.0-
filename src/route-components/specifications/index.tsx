import { type FunctionComponent, memo, useContext } from "react";
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from "convex/_generated/api";
import { type HeaderObject } from "simple-table-core";
import { DialogContext } from '@/contexts/dialog'
import { useCreateSpecification } from "./utils/queries";
import { Button } from "@/components/ui/button";
import { type Specifications } from 'convex/schema'
import SpecificationForm, { type SpecificationFormType } from './forms/create-specefication';
import { Ellipsis, Trash2, Copy, SquarePen, Shirt } from "lucide-react";
import AppTable from "@/components/ui/app-table";
import { MyPopover } from "@/components/my-popover";
import clsx from "clsx";
import { useDeleteSpecification, useDuplicateSpecification, useUpdateSpecification } from "./utils/queries";
import { Separator } from "radix-ui";
import { EditSpecifications } from "./forms/edit-specifications";
import { omit } from "ramda";
import { Id } from "convex/_generated/dataModel";
interface SpecificationsProps {
}


const actionsList = [
  {icon: <SquarePen size={12} />, label: 'Редагувати', isDisable: false, actionName: 'edit'},
  {icon: <Copy size={12} />, label: 'Дублювати', isDisable: false, actionName: 'duplicate'},
  {icon: <Trash2 size={12} />, label: 'Видалити', isDisable: false, actionName: 'delete' },
];

const ActionsListComponent = ({ row, handleEditSpec }: { row: any, handleEditSpec: (data: any) => void }) => {
  const { mutate: duplicateAction } = useDuplicateSpecification();
  const { mutate: deleteAction } = useDeleteSpecification();

  const handleActions = (actionName: string) => {
    const actionData = { id: row._id };
    const actions = {
      duplicate: () => duplicateAction(actionData),
      delete: () => deleteAction(actionData),
      edit: () => handleEditSpec(row)
    }
    actions[actionName as keyof typeof actions]?.();
  }

  return (
    <div className="flex flex-col">
      {actionsList.map((action) => (
        <div 
          key={action.label} 
          onClick={() => action.isDisable ? null : handleActions(action.actionName)}
          className={clsx(
            "flex flex-row items-center gap-2 cursor-pointer hover:bg-gray-100 p-2 rounded",
            action.isDisable && "cursor-not-allowed opacity-50 hover:bg-transparent"
          )}
        >
          {action.icon}
          <span className="text-sm">{action.label}</span>
        </div>
      ))}
    </div>
  )
};

export const MaterialsCellComponent = memo(({ materials }: { materials: any }) => {
  console.log('materials', materials)
  return (
    <div className="flex flex-col gap-1">
      {materials?.map((material: any, i: number) => (
        <div key={material.id} className="flex flex-col gap-1">
          {i != 0 && <Separator.Separator className="w-full h-px bg-primary/10" />}
          <div className="flex flex-row items-center gap-1">
            <div>{material.name ?? material.fabricName}</div>
            {material.size && <div className="text-xs text-primary/60">{material.size}</div>}
          </div>
          <div className="flex flex-row items-center text-primary/60 gap-1">
            <div>{material.color}</div>
            <Separator.Separator orientation="vertical" className="w-px h-2 bg-primary/10" />
            <div>{material.quantity}</div>
            <div>{material.units}</div>
          </div>
        </div>
      ))}
    </div>
  );
});

type HeaderProps = {
  handleEditSpec: (data: any) => void
}

const headers: ({ handleEditSpec }: HeaderProps) => Array<HeaderObject> = ({ handleEditSpec }: HeaderProps) => [
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
    label: "Матеріали",
    accessor: "materials",
    cellRenderer: ({ row }) => {
      const materials: Array<any> = Array.isArray(row['materials']) ? row['materials'] : [];
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
  {
    width: 50,
    type: 'other',
    label: "",
    accessor: "",
    pinned: 'right',
    cellRenderer: ({ row }) => (
      <MyPopover
        trigger={<Ellipsis className="cursor-pointer" size={14}/>}
        content={<ActionsListComponent row={row} handleEditSpec={handleEditSpec} />}
      />
    )
  },
];
 
const Specifications: FunctionComponent<SpecificationsProps> = () => {
  const { data } = useQuery(convexQuery(api.queries.specifications.getSpecificationsWithMaterials));
  const { mutate: createSpec } = useCreateSpecification();
  const { mutate: updateSpec } = useUpdateSpecification();
  const { openDialog, closeDialog } = useContext(DialogContext);

  const handleSubmitAdd = (values: SpecificationFormType) => {
    const newMaterials = values.materials.map((material) => ({
      fabricId: 'fabricId' in material ? material.fabricId?.value as Id<'fabrics'> : undefined,
      materialId: 'materialId' in material ? material.materialId?.value as Id<'materials'>: undefined,
      units: material.units,
      quantity: material.quantity,
    }));
    createSpec({...values, materials: newMaterials} as Specifications);
    closeDialog();
  }

  const handleSubmitEdit = (values: SpecificationFormType | (SpecificationFormType & { _id: Id<'specifications'>, _creationTime: string })) => {
    if ('_id' in values && '_creationTime' in values) {
      const newMaterials = values.materials.map((material) => ({
        fabricId: 'fabricId' in material ? material.fabricId?.value as Id<'fabrics'> : undefined,
        materialId: 'materialId' in material ? material.materialId?.value as Id<'materials'>: undefined,
        units: material.units,
        quantity: material.quantity,
      }));

      const newData = {
        ...omit(['_id', '_creationTime', 'materials'], values),
        materials: newMaterials
      };
      updateSpec({ id: values._id, data: newData });
    }
    closeDialog();
  }

  const handleAddSpec = () => {
    openDialog({
      title: 'Створення специфікації',
      content: <SpecificationForm
        formId="create-specification-form"
        actionSubmit={handleSubmitAdd}/>,
      withForm: true,
      formId: 'create-specification-form',
    });
  }

  const handleEditSpec = (data: Omit<Specifications, 'productionPrice'> & { productionPrice: number }) => {
    openDialog({
      title: 'Редагування специфікації',
      content: <EditSpecifications
        formId="edit-specification-form"
        actionSubmit={handleSubmitEdit}
        specification={data as any}/>,
      withForm: true,
      formId: 'edit-specification-form',
    });
  };
  
  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="w-fit">
        <Button className="w-full" onClick={handleAddSpec}>Додати специфікацію</Button>
      </div>
      <AppTable
        height={600}
        rows={data || []}
        defaultHeaders={headers({ handleEditSpec })}
        getRowId={({ row }: any) => row.id as string}
      />
    </div>
  );
}
 
export default Specifications;