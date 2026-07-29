import { type FunctionComponent, type MutableRefObject, memo, useContext, useMemo } from "react";
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from "convex/_generated/api";
import { type HeaderObject, type CellClickProps } from "simple-table-core";
import { useNavigate } from '@tanstack/react-router'
import { Route as specificationsRoute } from '@/routes/_authenticated/app/specifications'
import { Route as specDetailsRoute } from '@/routes/_authenticated/app/specifications_.$specId'
import { DialogContext } from '@/contexts/dialog'
import { useCreateSpecification } from "./utils/queries";
import { Button } from "@/components/ui/button";
import { type Specifications } from 'convex/schema'
import SpecificationForm, { type SpecificationFormType } from './forms/create-specification';
import { Trash2, Copy, SquarePen, Shirt } from "lucide-react";
import AppTable from "@/components/ui/app-table";
import { MyPopover } from "@/components/my-popover";
import { ActionsMenu } from "@/components/actions-menu";
import { useDeleteSpecification, useUpdateSpecification } from "./utils/queries";
import { Separator } from "radix-ui";
import { EditSpecifications } from "./forms/edit-specifications";
import { DuplicateSpecification } from "./forms/duplicate-specification";
import { omit } from "ramda";
import { Id } from "convex/_generated/dataModel";
import { useSpecificationDraftsStore, type SpecificationDraft } from "./utils/drafts-store";
interface SpecificationsProps {
}

const DraftBadge = () => (
  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 shrink-0">Чернетка</span>
);

const SpecActionsCell = ({
  row,
  handleEditSpec,
  handleEditDraft,
  handleDeleteDraft,
  handleDuplicateSpec,
}: {
  row: any;
  handleEditSpec: (data: any) => void;
  handleEditDraft: (draft: any) => void;
  handleDeleteDraft: (id: string) => void;
  handleDuplicateSpec: (data: any) => void;
}) => {
  const { mutate: deleteAction } = useDeleteSpecification();
  const { openDialog, closeDialog } = useContext(DialogContext);
  const isDraft = row._isDraft === true;

  const handleDelete = (id: Id<'specifications'>) => {
    openDialog({
      title: 'Видалення специфікації',
      withForm: true,
      content: <div>Ви впевнені, що хочете видалити специфікацію?</div>,
      actionSubmit: () => {
        deleteAction({ id })
        closeDialog()
      },
    });
  }

  const handleDeleteDraftConfirm = (id: string) => {
    openDialog({
      title: 'Видалення чернетки',
      withForm: true,
      content: <div>Ви впевнені, що хочете видалити чернетку?</div>,
      actionSubmit: () => {
        handleDeleteDraft(id)
        closeDialog()
      },
    });
  }

  if (isDraft) {
    return (
      <ActionsMenu
        items={[
          { label: 'Редагувати', icon: <SquarePen className="size-3" />, onClick: () => handleEditDraft(row) },
          { label: 'Видалити', icon: <Trash2 className="size-3" />, destructive: true, onClick: () => handleDeleteDraftConfirm(row._id) },
        ]}
      />
    );
  }

  return (
    <ActionsMenu
      items={[
        { label: 'Редагувати', icon: <SquarePen className="size-3" />, onClick: () => handleEditSpec(row) },
        { label: 'Дублювати', icon: <Copy className="size-3" />, onClick: () => handleDuplicateSpec(row) },
        { label: 'Видалити', icon: <Trash2 className="size-3" />, destructive: true, onClick: () => handleDelete(row._id) },
      ]}
    />
  );
};

export const MaterialsCellComponent = memo(({ materials }: { materials: any }) => {
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
  handleEditDraft: (draft: any) => void
  handleDeleteDraft: (id: string) => void
  handleDuplicateSpec: (data: any) => void
}

const headers: (props: HeaderProps) => Array<HeaderObject> = ({ handleEditSpec, handleEditDraft, handleDeleteDraft, handleDuplicateSpec }: HeaderProps) => [
  {
    accessor: "name",
    label: "Назва",
    width: 80,
    // isSortable: true,
    type: "string",
    cellRenderer: ({ row }) => (
      <div className="flex items-center gap-2">
        <span>{row['name'] as string}</span>
        {row['_isDraft'] === true && <DraftBadge />}
      </div>
    ),
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
    accessor: "_actions",
    pinned: 'right',
    cellRenderer: ({ row }) => (
      <SpecActionsCell
        row={row}
        handleEditSpec={handleEditSpec}
        handleEditDraft={handleEditDraft}
        handleDeleteDraft={handleDeleteDraft}
        handleDuplicateSpec={handleDuplicateSpec}
      />
    )
  },
];

const Specifications: FunctionComponent<SpecificationsProps> = () => {
  const { data } = useQuery(convexQuery(api.queries.specifications.getSpecificationsWithMaterials));
  const { mutate: createSpec } = useCreateSpecification();
  const { mutate: updateSpec } = useUpdateSpecification();
  const { openDialog, closeDialog } = useContext(DialogContext);
  const navigate = useNavigate({ from: specificationsRoute.to });
  const drafts = useSpecificationDraftsStore((s) => s.drafts);
  const saveDraft = useSpecificationDraftsStore((s) => s.saveDraft);
  const removeDraft = useSpecificationDraftsStore((s) => s.removeDraft);

  const draftRows = useMemo(() => Object.values(drafts).map((draft) => ({
    _id: draft.id,
    _isDraft: true,
    name: draft.values.name || 'Без назви',
    category: draft.values.category || '',
    skuPrefix: draft.values.skuPrefix || '',
    materials: [],
  })), [drafts]);

  const rows = useMemo(() => [...(data || []), ...draftRows], [data, draftRows]);

  const handleCellClick = ({ row, accessor }: CellClickProps) => {
    if (accessor === '_actions') return;
    const r = row as any;
    if (!r._id) return;
    if (r._isDraft) {
      const draft = drafts[r._id];
      if (draft) handleAddSpec(draft);
      return;
    }
    navigate({ to: specDetailsRoute.to, params: { specId: r._id } });
  };

  const handleSubmitAdd = (values: SpecificationFormType) => {
    const newMaterials = values.materials.map((material) => ({
      lineId: (material as any).lineId,
      units: material.units,
      quantity: material.quantity,
      type: material.type,
      id: material.id?.value as Id<'fabrics'> | Id<'materials'>,
    }));
    const { category_crm, ...rest } = values;
    createSpec(omit(['_id', '_creationTime'], {
      ...rest,
      materials: newMaterials,
      category_crm_id: category_crm ? Number(category_crm.value) : undefined,
      category_name: category_crm?.label,
    } as any) as Specifications);
    closeDialog();
  }

  const handleSubmitEdit = (values: SpecificationFormType | (SpecificationFormType & { _id: Id<'specifications'>, _creationTime: string })) => {
    if ('_id' in values && '_creationTime' in values) {
      const newMaterials = values.materials.map((material) => ({
        lineId: (material as any).lineId,
        id: material.id?.value as Id<'fabrics'> | Id<'materials'>,
        type: material.type,
        units: material.units,
        quantity: material.quantity,
      }));

      const { category_crm, ...rest } = values;
      const newData = {
        ...omit(['_id', '_creationTime', 'materials'], rest),
        materials: newMaterials,
        category_crm_id: category_crm ? Number(category_crm.value) : undefined,
        category_name: category_crm?.label,
      };
      updateSpec({ id: values._id, data: newData as any });
    }
    closeDialog();
  }

  const handleAddSpec = (draft?: SpecificationDraft) => {
    const draftId = draft?.id ?? Math.random().toString(36).slice(2, 9);
    const formApiRef: MutableRefObject<(() => SpecificationFormType) | null> = { current: null };

    openDialog({
      title: draft ? 'Редагування чернетки' : 'Створення специфікації',
      className: 'sm:w-250 sm:max-w-250',
      content: <SpecificationForm
        formId="create-specification-form"
        formApiRef={formApiRef}
        defaultValues={draft?.values as SpecificationFormType}
        actionSubmit={(values) => {
          handleSubmitAdd(values as SpecificationFormType);
          removeDraft(draftId);
        }}/>,
      withForm: true,
      formId: 'create-specification-form',
      onDismiss: () => {
        const values = formApiRef.current?.();
        if (values) saveDraft(draftId, values);
      },
    });
  }

  const handleDeleteDraft = (id: string) => {
    removeDraft(id);
  };

  const handleEditDraft = (row: any) => {
    const draft = drafts[row._id];
    if (draft) handleAddSpec(draft);
  };

  const handleEditSpec = (data: Omit<Specifications, 'productionPrice'> & { productionPrice: number }) => {
    openDialog({
      title: 'Редагування специфікації',
      className: 'sm:w-250 sm:max-w-250',
      content: <EditSpecifications
        formId="edit-specification-form"
        actionSubmit={handleSubmitEdit}
        specification={data as any}/>,
      withForm: true,
      formId: 'edit-specification-form',
    });
  };

  const handleDuplicateSpec = (data: any) => {
    const draftId = Math.random().toString(36).slice(2, 9);
    const formApiRef: MutableRefObject<(() => SpecificationFormType) | null> = { current: null };

    openDialog({
      title: 'Дублювання специфікації',
      className: 'sm:w-250 sm:max-w-250',
      content: <DuplicateSpecification
        formId="duplicate-specification-form"
        formApiRef={formApiRef}
        specification={omit(['_id', '_creationTime'], data) as any}
        actionSubmit={(values) => {
          handleSubmitAdd(values);
          removeDraft(draftId);
        }}/>,
      withForm: true,
      formId: 'duplicate-specification-form',
      onDismiss: () => {
        const values = formApiRef.current?.();
        if (values) saveDraft(draftId, values);
      },
    });
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="w-fit">
        <Button className="w-full" onClick={() => handleAddSpec()}>Додати специфікацію</Button>
      </div>
      <AppTable
        height={600}
        rows={rows}
        defaultHeaders={headers({ handleEditSpec, handleEditDraft, handleDeleteDraft, handleDuplicateSpec })}
        getRowId={({ row }: any) => row._id as string}
        onCellClick={handleCellClick}
      />
    </div>
  );
}
 
export default Specifications;