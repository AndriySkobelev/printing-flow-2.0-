import clsx from "clsx";
import z from 'zod'
import { type FunctionComponent } from "react";
import { api } from "convex/_generated/api";
import { revalidateLogic, useStore } from "@tanstack/react-form";
import { Trash2Icon } from "lucide-react";
import { Id } from "convex/_generated/dataModel";
import { useAppForm } from "@/components/main-form";
import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useAsyncOptions } from "@/route-components/specifications/utils/hooks";

const productSchema = z.object({
  materials: z.array(z.object({
    overwriteMaterialId: z.string(),
    type: z.enum(['fabric', 'material']),
    parentLabel: z.string(),
    multiplier: z.number().min(0.01, 'Мінімум 0.01').optional(),
    newMaterial: z.object({ value: z.string(), label: z.string() }).optional(),
  }))
})

type FormValuesType = z.infer<typeof productSchema>;

interface ChangeMaterialsFormProps {
  formId: string,
  defaultValues?: Partial<FormValuesType>,
  specificationIds: Array<Id<'specifications'>>,
  actionSubmit: (values: {
    materials: Array<{
      overwriteMaterialId: string,
      fabricId?: string,
      materialId?: string,
      multiplier?: number,
    }>
  }) => void
}

const ParentMaterials = ({
  data,
  selected,
  onToggle,
}: {
  data: any,
  selected: string[],
  onToggle: (material: any) => void
}) => {
  if (!data) return null;
  return (
    <div className="flex flex-col gap-2">
      {data.map((spec: any, i: number) => (
        <div key={`${spec?.name}-${i}`}>
          <div className="font-medium text-sm mb-1">{spec?.name}</div>
          <div className="flex flex-wrap gap-1">
            {spec?.materials.map((material: any, j: number) => {
              const id = material.fabricId || material.materialId;
              const isSelected = selected.includes(id);
              return (
                <div
                  key={`${material?.name}-${j}`}
                  className={clsx(
                    "flex flex-col items-start gap-0.5 text-sm bg-primary/5 rounded-md px-2 py-1 cursor-pointer hover:bg-primary/10 transition-colors",
                    isSelected && 'bg-green-100 border border-green-300'
                  )}
                  onClick={() => onToggle(material)}
                >
                  <div className="text-xs">{material?.name}{material?.size ? `-${material?.size}` : ''}</div>
                  <div className="flex items-center gap-0.5 text-xs">
                    <span className="text-[#868686]">{material?.color}</span>
                    <span className="text-[#706f6f]">({material?.quantity}{material?.units})</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

const ChangeMaterials: FunctionComponent<ChangeMaterialsFormProps> = ({
  formId,
  defaultValues,
  actionSubmit,
  specificationIds,
}) => {
  const { data } = useQuery(convexQuery(api.queries.specifications.getSpecsWithMaterials, { specs: specificationIds }));
  const { loadOptions: fabricOptions } = useAsyncOptions(api.queries.fabrics.getFabricsOptionsByColor, 'fabric');
  const { loadOptions: materialOptions } = useAsyncOptions(api.queries.materials.getMaterialOptions, 'materials');

  const form = useAppForm({
    validationLogic: revalidateLogic(),
    validators: { onDynamic: productSchema },
    defaultValues: defaultValues || { materials: [] },
    onSubmit: ({ value }) => {
      const materials = value?.materials ? value?.materials.map((m) => ({
        overwriteMaterialId: m.overwriteMaterialId,
        multiplier: m.multiplier,
        ...(m.type === 'fabric'
          ? { fabricId: m.newMaterial?.value }
          : { materialId: m.newMaterial?.value }
        ),
      })) : [];
      actionSubmit({ materials });
    }
  });

  const selectedIds = useStore(form.store, (state: any) =>
    (state.values.materials as FormValuesType['materials']).map((m) => m.overwriteMaterialId)
  );

  const handleToggleMaterial = (material: any) => {
    const id = material.fabricId || material.materialId;
    const materials = form.getFieldValue('materials') || [];
    const existingIndex = materials && materials.findIndex((m: any) => m.overwriteMaterialId === id);

    if (existingIndex !== -1) {
      form.setFieldValue('materials', materials ? materials.filter((_: any, idx: number) => idx !== existingIndex) : []);
      return;
    }

    const isFabric = !!material.fabricId;
    const label = `${material.name ?? ''}${material.size ? `-${material.size}` : ''} ${material.color ?? ''}`.trim();
    form.setFieldValue('materials', [
      ...materials,
      {
        overwriteMaterialId: id,
        type: isFabric ? 'fabric' : 'material',
        parentLabel: label,
        multiplier: undefined,
        newMaterial: undefined,
      },
    ]);
  };

  return (
    <div>
      <form
        id={formId}
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
        className="flex flex-col gap-4"
      >
        <ParentMaterials
          data={data}
          selected={selectedIds}
          onToggle={handleToggleMaterial}
        />

        <form.Field mode="array" name="materials">
          {(field) => (
            <div className="flex flex-col gap-2 w-full">
              {field.state.value?.map((value, i) => (
                <div
                  key={i}
                  className={clsx(
                    'flex gap-2 w-full items-start rounded-md p-2 border',
                    value.type === 'fabric' ? 'bg-primary/5' : 'bg-secondary/20'
                  )}
                >
                  <form.AppField
                    key={`newMaterial-${i}`}
                    name={`materials[${i}].newMaterial`}
                    children={(subField) => (
                      <div className="flex flex-col gap-2 items-center w-full">
                        <subField.FormAsyncSelect
                          className="flex-5"
                          valueMode="object"
                          label={value.type === 'fabric' ? 'Нова тканина' : 'Новий матеріал'}
                          modeOption={value.type === 'fabric' ? 'fabric' : 'materials'}
                          asyncOptions={value.type === 'fabric' ? fabricOptions : materialOptions}
                        />
                        <div className="flex-none self-start text-xs text-muted-foreground min-w-[80px]">
                          {`Осн. матеріал: ${value.parentLabel}`}
                        </div>
                      </div>
                    )}
                  />
                  <form.AppField
                    key={`multiplier-${i}`}
                    name={`materials[${i}].multiplier`}
                    children={(subField) => (
                      <subField.FormTextField className="flex-2" type="number" label="Множник" />
                    )}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    className="self-center"
                    onClick={() => field.removeValue(i)}
                  >
                    <Trash2Icon size={17} />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </form.Field>
      </form>
    </div>
  );
};

export default ChangeMaterials;
