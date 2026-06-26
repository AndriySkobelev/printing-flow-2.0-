import { useState, useContext } from "react";
import { type FunctionComponent } from "react";
import { type HeaderObject, type CellClickProps } from "simple-table-core";
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from "convex/_generated/api";
import { type Id } from "convex/_generated/dataModel";
import { DialogContext } from '@/contexts/dialog'
import { useCreateFabric, useAddFabricVariants, useDeleteFabric, useDeleteFabricVariant } from "./queries";
import { Button } from "@/components/ui/button";
import { ActionsMenu } from "@/components/actions-menu";
import { Trash2 } from "lucide-react";
import CreateFabricForm from "./forms/create-fabrics";
import AddFabricVariantForm from "./forms/add-fabric-variant";
import AppTable from "@/components/ui/app-table";

interface FabricsProps {}

const renderHeader = ({ header }: { header: HeaderObject }) => (
  <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/50 px-2">
    {header.label}
  </span>
)

type DeleteFabricFn  = (args: { id: Id<'fabrics'> }) => void
type DeleteVariantFn = (args: { id: Id<'fabricVariants'> }) => void

const fabricHeaders = (
  deleteFabric: DeleteFabricFn,
  selectedFabricId: Id<'fabrics'> | null,
  setSelectedFabricId: (id: Id<'fabrics'> | null) => void,
): HeaderObject[] => [
  { accessor: "name",           label: "Назва",       width: 220, type: "string", headerRenderer: renderHeader },
  { accessor: "skuPrefix",      label: "SKU префікс", width: 110, type: "string", headerRenderer: renderHeader },
  { accessor: "units",          label: "Од.",          width: 70,  type: "string", headerRenderer: renderHeader },
  { accessor: "processingType", label: "Обробка",      width: 130, type: "string", headerRenderer: renderHeader },
  { accessor: "variantCount",   label: "Кольорів",     width: 90,  type: "number", headerRenderer: renderHeader },
  {
    accessor: "_actions",
    label: "",
    width: 40,
    type: "string",
    cellRenderer: ({ row }: any) => (
      <ActionsMenu items={[{
        label: 'Видалити',
        icon: <Trash2 className="size-3" />,
        destructive: true,
        onClick: () => {
          deleteFabric({ id: row._id });
          if (selectedFabricId === row._id) setSelectedFabricId(null);
        },
      }]} />
    ),
  },
]

const variantHeaders = (deleteVariant: DeleteVariantFn): HeaderObject[] => [
  { accessor: "color",     label: "Колір",       width: 180, type: "string", headerRenderer: renderHeader },
  { accessor: "sku",       label: "SKU",         width: 120, type: "string", headerRenderer: renderHeader },
  { accessor: "skuNumber", label: "№",           width: 60,  type: "number", headerRenderer: renderHeader },
  { accessor: "threds",    label: "Номер нитки", width: 140, type: "string", headerRenderer: renderHeader },
  {
    accessor: "_actions",
    label: "",
    width: 40,
    type: "string",
    cellRenderer: ({ row }: any) => (
      <ActionsMenu items={[{
        label: 'Видалити',
        icon: <Trash2 className="size-3" />,
        destructive: true,
        onClick: () => deleteVariant({ id: row._id }),
      }]} />
    ),
  },
]

const Fabrics: FunctionComponent<FabricsProps> = () => {
  const { data = [], isLoading } = useQuery(convexQuery(api.queries.fabrics.getFabrics));
  const { mutate: createFabric } = useCreateFabric();
  const { mutate: addVariant } = useAddFabricVariants();
  const { mutate: deleteFabric } = useDeleteFabric();
  const { mutate: deleteVariant } = useDeleteFabricVariant();
  const { openDialog, closeDialog } = useContext(DialogContext);
  const [selectedFabricId, setSelectedFabricId] = useState<Id<'fabrics'> | null>(null);

  const fabricRows = data.map(fabric => ({
    _id: fabric._id,
    name: fabric.name,
    skuPrefix: fabric.skuPrefix,
    units: fabric.units,
    processingType: fabric.processingType ?? '',
    variantCount: fabric.variants.length,
  }));

  const selectedFabric = data.find(f => f._id === selectedFabricId) ?? null;

  const variantRows = (selectedFabric?.variants ?? [])
    .slice()
    .sort((a, b) => a.skuNumber - b.skuNumber)
    .map(v => ({
      _id: v._id,
      color: v.color,
      sku: v.sku,
      skuNumber: v.skuNumber,
      threds: v.threds ?? '',
    }));

  const handleFabricClick = ({ row, accessor }: CellClickProps) => {
    if (accessor === '_actions') return;
    setSelectedFabricId((row as any)._id as Id<'fabrics'>);
  };

  const handleCreateFabric = (values: any) => {
    createFabric(values);
    closeDialog();
  }

  const handleAddVariant = (values: any) => {
    if (!selectedFabricId) return;
    addVariant({ parentId: selectedFabricId, ...values });
    closeDialog();
  }

  const handleOpenCreateFabric = () => {
    openDialog({
      title: 'Додати тканину',
      content: <CreateFabricForm formId="create-fabric-form" actionSubmit={handleCreateFabric} />,
      withForm: true,
      formId: 'create-fabric-form',
    });
  }

  const handleOpenAddVariant = () => {
    openDialog({
      title: `Додати колір — ${selectedFabric?.name}`,
      content: <AddFabricVariantForm formId="add-variant-form" actionSubmit={handleAddVariant} />,
      withForm: true,
      formId: 'add-variant-form',
    });
  }

  return (
    <div className="flex flex-col gap-4 p-4 w-full">
      <div className="flex gap-4 justify-between w-full">
        <div className="flex flex-col gap-2 flex-1">
          <div className="flex justify-end">
            <Button type="button" onClick={handleOpenCreateFabric}>Додати тканину</Button>
          </div>
          <AppTable
            height={650}
            rows={fabricRows}
            isLoading={isLoading}
            defaultHeaders={fabricHeaders(deleteFabric, selectedFabricId, setSelectedFabricId)}
            onCellClick={handleFabricClick}
            getRowId={(row) => row.row._id as string}
          />
        </div>
        <div className="flex flex-col gap-2 flex-1">
          <div className="flex justify-end">
            <Button
              type="button"
              disabled={!selectedFabricId}
              onClick={handleOpenAddVariant}
            >
              Додати колір
            </Button>
          </div>
          <AppTable
            height={650}
            rows={variantRows}
            isLoading={isLoading}
            defaultHeaders={variantHeaders(deleteVariant)}
            getRowId={(row) => row.row._id as string}
          />
        </div>
      </div>
    </div>
  );
}

export default Fabrics;
