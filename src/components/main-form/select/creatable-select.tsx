import { type FunctionComponent, useMemo } from 'react';
import { DotIcon } from 'lucide-react';
import { type SingleValue, MultiValue } from 'react-select';
import CreatableSelect from 'react-select/creatable';
import { useFieldContext } from "@/components/main-form";
import clsx from 'clsx';
import { is } from 'ramda';

export type Option = {
  value: string | number | null | undefined;
  label: string | number | null | undefined;
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

const OptionModes = {
  fabric: CustomFabricOption,
  default: CustomDefaultOption,
  materials: CustomMaterialsOption,
  smallFabric: CustomFabricSmallOption,
};

type OptionTypes = typeof OptionModes;

interface FormAsyncSelectProps {
  label?: string;
  isMulti: boolean;
  className?: string,
  modeOption?: keyof OptionTypes;
  options: Array<{ value: string | number; label: string }> | any;
  defaultOptions?: Array<{ value: string | number; label: string }> | any;
}

const FormAsyncSelect: FunctionComponent<FormAsyncSelectProps> = ({ defaultOptions = [], label, options, className, isMulti = true, modeOption = 'default' }) => {
  const field = useFieldContext();
  const name = useMemo(() => field.name, [field.name]);
  const value = useMemo(() => field.state.value as string | number | undefined, [field.state.value]);
  const fieldOnChangeSingle = useMemo(() => (value: SingleValue<Option>) => field.handleChange(value?.value), [field.handleChange]);
  const fieldOnChangeMulti = useMemo(() => (value: MultiValue<Option>) => field.handleChange(value), [field.handleChange]);
  const errors = useMemo(() => field.state.meta.errors as Array<{ message: string }> | undefined, [field.state.meta.errors]);
  const isValid = useMemo(() => field.state.meta.isValid as boolean | undefined, [field.state.meta.isValid]);

  return (
    <div className={clsx('flex flex-col gap-1 w-full', className)}>
      <label className="text-sm ml-2 text-[#bbbfc7]">{label}</label>
      {
        isMulti
        ? <CreatableSelect
            name={name}
            isMulti={true}
            options={options}
            placeholder="Пошук..."
            onChange={fieldOnChangeMulti}
            className='hover:active:border-none'
            value={valueToOption(value, defaultOptions)}
            defaultValue={valueToOption(value, defaultOptions)}
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
        : <CreatableSelect
            name={name}
            isMulti={false}
            placeholder="Пошук..."
            className='hover:active:border-none'
            value={valueToOption(value, defaultOptions)}
            defaultValue={valueToOption(value, defaultOptions)}
            // onChange={isMulti ? fieldOnChangeMulti : fieldOnChange}
            onChange={fieldOnChangeSingle}
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
          }
        {!isValid && <div className="text-sm text-red-500 ml-2">{errors?.[0]?.message}</div>}
    </div>
  );
}
 
export default FormAsyncSelect;