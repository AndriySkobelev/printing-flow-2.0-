import { type FunctionComponent, useMemo } from 'react';
import { DotIcon } from 'lucide-react';
import Select, { type SingleValue, MultiValue } from 'react-select';
import { useFieldContext } from "@/components/main-form";
import clsx from 'clsx';
import Divider from '@/components/ui/divider';

export type Option = {
  value: string | number;
  label: string | number;
}

const regex4 = /^([^·]+) · ([^·]+) · ([^·]+) · ([^·]+)$/;
const regex3 = /^([^·]+) · ([^·]+) · ([^·]+)$/;

const valueToOption = (value: string | number | null | undefined, options: Array<{ value: string, label: string}>) => {
  const findValue = options.find((o: { value: string, label: string}) => o.value === value);

  return findValue;
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

const CustomFabricSmallOption: FunctionComponent<{ innerProps: any, innerRef: any, data: Option }> = ({ innerProps, innerRef, data }) => {
  const label = data.label as string;
  const regLabel = label.match(regex3) || [];
  const [_, fabricName, color] = regLabel || [];

  return (
    <div ref={innerRef} {...innerProps} className="px-2 py-1 hover:bg-primary/5 cursor-pointer">
      <div className='flex items-center text-md'>
        {fabricName}
      </div>
      <div className='text-[#868686]'>{color}</div>
    </div>
  );
};

const CustomMaterialsOption: FunctionComponent<{ innerProps: any, innerRef: any, data: Option }> = ({ innerProps, innerRef, data }) => {
  const label = data.label as string;
  const regLabel = label.match(regex4) || [];
  console.log("🚀 ~ CustomMaterialsOption ~ regLabel:", regLabel)
  const [_, name, size, color] = regLabel || [];

  return (
    <div ref={innerRef} {...innerProps} className="px-2 py-1 hover:bg-primary/5 cursor-pointer">
      <div className='flex items-center text-md'>
        {name}
      </div>
      <div className='flex items-center text-md gap-2'>
        <span className='text-[#868686]'>{size}</span>
        <Divider type='vertical' className='border-[#868686]' />
        <span className='text-[#868686]'>{color}</span>
      </div>
    </div>
  );
};

const OptionModes = {
  fabric: CustomFabricOption,
  default: CustomDefaultOption,
  materials: CustomMaterialsOption,
  smallFabric: CustomFabricSmallOption,
};

type OptionTypes = typeof OptionModes;

interface FormSelectProps {
  label?: string;
  isMulti?: boolean,
  disabled?: boolean;
  className?: string,
  addOnChange?: () => void;
  modeOption?: keyof OptionTypes;
  valueMode?: 'value' | 'object';
  options: Array<{ value: string | number; label: string }> | any;
}

const FormSelect: FunctionComponent<FormSelectProps> = ({ options, label, disabled, isMulti = false, valueMode = 'value', className, modeOption = 'default', addOnChange }) => {
  const field = useFieldContext();
  const name = useMemo(() => field.name, [field.name]);
  const value = useMemo(() => field.state.value as string | number | undefined, [field.state.value]);
  const fieldOnChange = useMemo(() => (newValue: SingleValue<Option>, actionMeta: any) => {
    field.handleChange(valueMode === 'object' ? newValue : newValue?.value);
    addOnChange && addOnChange()
  }, [field.handleChange]);
  const fieldMultiOnChange = useMemo(() => (newValue: MultiValue<Option>, actionMeta: any) => {
    field.handleChange(newValue)
    addOnChange && addOnChange()
  }, [field.handleChange]);
  const errors = useMemo(() => field.state.meta.errors as Array<{ message: string }> | undefined, [field.state.meta.errors]);
  const isValid = useMemo(() => field.state.meta.isValid as boolean | undefined, [field.state.meta.isValid]);
  
  return (
    <div className={clsx('flex flex-col gap-1 w-full', className)}>
      <label className="text-sm ml-2 text-[#bbbfc7]">{label}</label>
      <Select
        name={name}
        options={options}
        isMulti={isMulti}
        isDisabled={disabled}
        placeholder="Виберіть..."
        className='hover:active:border-none'
        value={
          typeof value === 'string' || typeof value === 'number'
          ? valueToOption(value, options)
          : value
        }
        onChange={(newValue, actionMeta) => (
          isMulti
            ? fieldMultiOnChange(newValue as MultiValue<Option>, actionMeta)
            : fieldOnChange(newValue as SingleValue<Option>, actionMeta)
        )}
        components={{
          Option: OptionModes[modeOption || 'default'],
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
 
export default FormSelect;