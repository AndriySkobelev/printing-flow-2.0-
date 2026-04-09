import { type FunctionComponent, ReactElement, useMemo } from 'react';
import { DotIcon } from 'lucide-react';
import { type SingleValue, components, ControlProps, GroupBase, MultiValue } from 'react-select';
import AsyncSelect from 'react-select/async';
import { PropsValue } from 'react-select';
import { useFieldContext } from "@/components/main-form";
import clsx from 'clsx';
import { makeProductOptions } from './options';
import Divider from '@/components/ui/divider';

export type Option = {
  value: string | number | null | undefined;
  label: string | number | null | undefined;
}

const regex4 = /^([^·]+) · ([^·]+) · ([^·]+) · ([^·]+)$/;
const regex3 = /^([^·]+) · ([^·]+) · ([^·]+)$/;

interface FormAsyncSelectProps {
  label?: string;
  className?: string,
  modeOption?: keyof OptionTypes;
  modeControl?: keyof ControlTypes;
  valueMode?: 'string' | 'object';
  asyncOptions: Array<{ value: string | number; label: string }> | any;
  defaultOptions?: Array<{ value: string | number; label: string }> | any;
}

const valueToOption = <T extends { value: any }>(value: T['value'], options: Array<T>) => {
  const valueToObject: Option = { value: value, label: value !== null && value !== undefined ? `${value}` : null };
  if (options.length < 1) {
    return valueToObject;
  }
  const findValue = options.find((o) => o.value === value);
  return findValue || valueToObject;
};

const CustomDefaultOption: FunctionComponent<{ innerProps: any, innerRef: any, data: Option }> = ({ innerProps, innerRef, data }) => {
  return (
    <div ref={innerRef} {...innerProps} className="px-4 py-2 hover:bg-primary/5 cursor-pointer">
      {data.label}
    </div>
  );
};

const CustomFabricOption: FunctionComponent<{ innerProps: any, innerRef: any, data: Option }> = ({ innerProps, innerRef, data }) => {
  const label = data.label as string;
  const regLabel = label.match(regex3) || [];
  const [_, fabricName, color, sku] = regLabel || [];
  return (
    <div ref={innerRef} {...innerProps} className="px-2 py-1 hover:bg-primary/5 cursor-pointer">
      <div className='text-sm'>{fabricName}</div>
      <div className="flex items-center text-xs gap-0.5">
        <div className='text-[#868686]'>{color}</div>
        <DotIcon color='#868686' style={{ margin: '0'}}/>
        <div className='text-[#868686]'>{sku}</div>
      </div>
    </div>
  );
};

const CustomMaterialsOption: FunctionComponent<{ innerProps: any, innerRef: any, data: Option }> = ({ innerProps, innerRef, data }) => {
  const label = data.label as string;
  const regLabel = label.match(regex4) || [];
  const [_, fabricName, size, color, sku] = regLabel || [];
  return (
    <div ref={innerRef} {...innerProps} className="px-2 py-1 hover:bg-primary/5 cursor-pointer">
      <div className='flex items-center text-sm gap-2'>
        <div className='text-sm'>{fabricName}</div>
        {
            size !== 'undefined' ? (
              <>
                <DotIcon color='#868686' style={{ margin: '0'}}/>
                <div className='text-[#868686] text-sm'>{size}</div>
              </>
            ) : null
        }
      </div>
      <div className="flex items-center text-xs gap-0.5">
        <div className='text-[#868686]'>{color}</div>
        <DotIcon color='#868686' style={{ margin: '0'}}/>
        <div className='text-[#868686]'>{sku}</div>
      </div>
    </div>
  );
};

const CustomFabricSmallOption: FunctionComponent<{ innerProps: any, innerRef: any, data: Option }> = ({ innerProps, innerRef, data }) => {
  const label = data.label as string;
  const regLabel = label.match(regex3) || [];
  const [_, fabricName, color, sku] = regLabel || [];

  return (
    <div ref={innerRef} {...innerProps} className="px-2 py-1 hover:bg-primary/5 cursor-pointer">
      <div className='flex items-center text-m'>
        {fabricName}
      </div>
      <div className='flex items-center text-[#868686] text-xs'>
        {color}
        <DotIcon />
        {sku}
      </div>
    </div>
  );
};


const CustomProductOption: FunctionComponent<{ innerProps: any, innerRef: any, data: Option }> = ({ innerProps, innerRef, data }) => {
  const label = data.label as string;
  const regLabel = label.match(regex4) || [];
  const [_, name, color, sku] = regLabel || [];

  return (
    <div ref={innerRef} {...innerProps} className="px-2 py-1 hover:bg-primary/5 cursor-pointer">
      <div className='flex items-center text-m'>
        {name}
      </div>
      <div className='flex items-center text-[#868686] text-xs'>
        {color}
        <DotIcon />
        {sku}
      </div>
    </div>
  );
};

const DefaultControl: FunctionComponent<ControlProps<Option, boolean, GroupBase<Option>>> = ({ children, ...props }) => {
  return (
    <components.Control {...props}>
      {children}
    </components.Control>
  );
}
const CompactControl: FunctionComponent<ControlProps<Option, boolean, GroupBase<Option>>> = ({ children, ...props }) => {
  return (
    <components.Control {...props} className='text-xs wrap-break-word'>
      {children}
    </components.Control>
  );
}

const optionModes = {
  fabric: CustomFabricOption,
  default: CustomDefaultOption,
  materials: CustomMaterialsOption,
  product: CustomProductOption,
  smallFabric: CustomFabricSmallOption,
};

const controlModes = {
  compact: CompactControl,
  default: DefaultControl,
};

type OptionTypes = typeof optionModes;
type ControlTypes = typeof controlModes;
type Primitive = string | number | unknown;

type ValueObject = {
  value: Primitive;
  label: string;
};

// type ValueType =  ValueObject;
 
const FormAsyncSelect: FunctionComponent<FormAsyncSelectProps> = ({
  label,
  className,
  asyncOptions,
  defaultOptions = [],
  valueMode = 'string',
  modeOption = 'default',
  modeControl = 'default',
}) => {
  const field = useFieldContext();
  const name = useMemo(() => field.name, [field.name]);
  const value: PropsValue<Option> | unknown = useMemo(() => {
    return field.state.value as PropsValue<Option> | unknown
  }, [field.state.value]);
  const fieldOnChange = useMemo(() => (newValue: MultiValue<Option> | SingleValue<Option>, actionMeta: any) => {
    const value = Array.isArray(newValue) ? newValue[0] : newValue;
    field.handleChange(valueMode === 'object' ? value : value?.value);
  }, [field.handleChange]);
  const errors = useMemo(() => field.state.meta.errors as Array<{ message: string }> | undefined, [field.state.meta.errors]);
  const isValid = useMemo(() => field.state.meta.isValid as boolean | undefined, [field.state.meta.isValid]);
  const valueByOptions = useMemo(() => typeof value === 'string' ? valueToOption(value, defaultOptions) : value, [value, defaultOptions]);
  const defaultValue = useMemo(() => defaultOptions.length > 0 ? valueToOption(value, defaultOptions) as PropsValue<Option> : null, [value, defaultOptions]);

  const handleAsyncOptions = ({ inputValue }: { inputValue: string }) => {
    const options = asyncOptions({ inputValue });
    return options;
  }
  return (
    <div className={clsx('flex flex-col gap-1 w-full', className)}>
      <label className="text-sm ml-2 text-[#bbbfc7]">{label}</label>
      <AsyncSelect
        name={name}
        cacheOptions
        placeholder="Пошук..."
        defaultOptions={defaultOptions}
        className='hover:active:border-none'
        value={valueByOptions as PropsValue<Option> ?? null}
        loadOptions={(inputValue) => handleAsyncOptions({inputValue})}
        // loadOptions={(inputValue) => asyncOptions({inputValue})}
        onChange={(newValue, actionMeta) => fieldOnChange(newValue, actionMeta)}
        defaultValue={defaultValue}
        components={{
          Control: controlModes[modeControl || 'default'],
          Option: optionModes[modeOption || 'default'],
        }}
        styles={{
          control: (baseStyles, state) => ({
            ...baseStyles,
            borderRadius: '8px',
            borderColor: '#e7e3e4',
          }),
        }}/>
        {!isValid && <div className="text-sm text-red-500 ml-2">{errors?.[0]?.message}</div>}
    </div>
  );
}
 
export default FormAsyncSelect;