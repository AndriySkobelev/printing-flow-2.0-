import { lazy, Suspense, type ComponentProps, type ComponentType } from 'react';
import { createFormHook, createFormHookContexts } from '@tanstack/react-form';
import { cn } from '@/lib/utils';

// Each field waits for its own chunk in a placeholder of its size, so a form
// never suspends the page around it.
const lazyField = <T extends ComponentType<any>>(load: () => Promise<{ default: T }>, height = 'h-9.5') => {
  const Field = lazy(load);
  return (props: ComponentProps<T>) => (
    <Suspense
      fallback={
        <div className={cn('flex w-full flex-col gap-1', props.className)}>
          {props.label ? <div className="ml-2 text-sm text-transparent">{props.label}</div> : null}
          <div className={`${height} w-full animate-pulse rounded-md bg-muted/50`} />
        </div>
      }
    >
      <Field {...props} />
    </Suspense>
  );
};

const FormTextField = lazyField(() => import('./text-field'));
const FormSelect = lazyField(() => import('./select/form-select'));
const FormAsyncSelect = lazyField(() => import('./select/async-select'));
const FormCreatableSelect = lazyField(() => import('./select/creatable-select'));
const FormButton = lazyField(() => import('./from-button'));
const InputDate = lazyField(() => import('./input-date'));
const TextAreaField = lazyField(() => import('./text-area'), 'h-20');
const FormInputNumber = lazyField(() => import('./input-number'));
const FormTextNumberField = lazyField(() => import('./text-number'));
const FormAsyncTextField = lazyField(() => import('./async-text-filed'));
export const { fieldContext, formContext, useFieldContext, useFormContext } = createFormHookContexts();

export const { useAppForm } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: {
    InputDate,
    FormSelect,
    FormTextField,
    FormAsyncSelect,
    TextAreaField,
    FormCreatableSelect,
    FormInputNumber,
    FormTextNumberField,
    FormAsyncTextField,
  },
  formComponents: {
    FormButton
  },
})
