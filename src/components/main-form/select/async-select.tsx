import { type FunctionComponent, useMemo } from 'react';
import { DotIcon } from 'lucide-react';
import { type SingleValue } from 'react-select';
import AsyncSelect from 'react-select/async';
import { useFieldContext } from "@/components/main-form";
import clsx from 'clsx';

export type Option = {
  value: string | number | null | undefined;
  label: string | number | null | undefined;
}

const regex = /^([^·]+) · ([^·]+) · ([^·]+)$/;

interface FormAsyncSelectProps {
  label?: string;
  className?: string,
  modeOption?: keyof OptionTypes;
  asyncOptions: Array<{ value: string | number; label: string }> | any;
  defaultOptions?: Array<{ value: string | number; label: string }> | any;
}

const valueToOption = (value: string | number | null | undefined, options: Array<{ value: string, label: string}>) => {
  const findValue = options.find((o: { value: string, label: string}) => o.value === value);
  console.log("🚀 ~ valueToOption ~ findValue:", findValue)
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
  const regLabel = label.match(regex) || [];
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
  const regLabel = label.match(regex) || [];
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

const OptionModes = {
  fabric: CustomFabricOption,
  default: CustomDefaultOption,
  smallFabric: CustomFabricSmallOption,
};

type OptionTypes = typeof OptionModes;
 
const FormAsyncSelect: FunctionComponent<FormAsyncSelectProps> = ({ asyncOptions, defaultOptions = [], label, className, modeOption = 'default' }) => {
  const field = useFieldContext();
  const name = useMemo(() => field.name, [field.name]);
  const value = useMemo(() => field.state.value as string | number | undefined, [field.state.value]);
  const fieldOnChange = useMemo(() => (value: SingleValue<Option>) => field.handleChange(value?.value), [field.handleChange]);
  const errors = useMemo(() => field.state.meta.errors as Array<{ message: string }> | undefined, [field.state.meta.errors]);
  const isValid = useMemo(() => field.state.meta.isValid as boolean | undefined, [field.state.meta.isValid]);

  return (
    <div className={clsx('flex flex-col gap-1 w-full', className)}>
      <label className="text-sm ml-2 text-[#bbbfc7]">{label}</label>
      <AsyncSelect
        name={name}
        cacheOptions
        placeholder="Пошук..."
        // defaultOptions={defaultOptions}
        className='hover:active:border-none'
        loadOptions={(inputValue) => asyncOptions({inputValue})}
        onChange={fieldOnChange}
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
 
export default FormAsyncSelect;