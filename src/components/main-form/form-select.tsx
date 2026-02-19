import { type FunctionComponent, useMemo } from 'react';
import { DotIcon } from 'lucide-react';
import Select, { type SingleValue } from 'react-select';
import { useFieldContext } from "@/components/main-form";

export type Option = {
  value: string | number | null | undefined;
  label: string | number | null | undefined;
}

const regex = /^([^·]+) · ([^·]+) · ([^·]+)$/;

interface FormSelectProps {
  label?: string;
  modeOption?: 'default' | 'fabric';
  options: Array<{ value: string | number; label: string }> | any;
}

const valueToOption = (value: string | number | null | undefined) => ({
  value,
  label: value,
});

const CustomDefaultOption: FunctionComponent<{ innerProps: any, innerRef: any, data: Option }> = ({ innerProps, innerRef, data }) => {
  return (
    <div ref={innerRef} {...innerProps} className="px-4 py-2 hover:bg-gray-400 cursor-pointer">
      {data.label}
    </div>
  );
}
const CustomFabricOption: FunctionComponent<{ innerProps: any, innerRef: any, data: Option }> = ({ innerProps, innerRef, data }) => {
  const label = data.label as string;
  const regLabel = label.match(regex) || [];
  const [_, fabricName, color, sku] = regLabel || [];
  return (
    <div ref={innerRef} {...innerProps} className="px-2 py-1 hover:bg-gray-100 cursor-pointer">
      <div className='text-sm'>{fabricName}</div>
      <div className="flex items-center text-xs gap-0.5">
        <div className='text-[#868686]'>{color}</div>
        <DotIcon color='#868686' style={{ margin: '0'}}/>
        <div className='text-[#868686]'>{sku}</div>
      </div>
    </div>
  );
}

const OptionModes = {
  default: CustomDefaultOption,
  fabric: CustomFabricOption,
}
 
const FormSelect: FunctionComponent<FormSelectProps> = ({ options, label, modeOption = 'default' }) => {
  const field = useFieldContext();
  const name = useMemo(() => field.name, [field.name]);
  const value = useMemo(() => field.state.value as string | number | undefined, [field.state.value]);
  const fieldOnChange = useMemo(() => (value: SingleValue<Option>) => field.handleChange(value), [field.handleChange]);
  const errors = useMemo(() => field.state.meta.errors as Array<{ message: string }> | undefined, [field.state.meta.errors]);
  // const isValid = useMemo(() => field.state.meta.isValid as boolean | undefined, [field.state.meta.isValid]);
  
  return (
    <div className='flex flex-col gap-1'>
      <label className="text-sm ml-2 text-[#bbbfc7]">{label}</label>
      <Select
        name={name}
        options={options}
        placeholder="Виберіть..."
        value={
          typeof value === 'string' || typeof value === 'number'
          ? valueToOption(value)
          : value
        }
        onChange={fieldOnChange}
        components={{
          Option: OptionModes[modeOption || 'default'],
        }}
        styles={{
          control: (baseStyles, state) => ({
            ...baseStyles,
            borderRadius: '8px',
            borderColor: state.isFocused ? 'grey' : '#e7e3e4',
          }),
        }}/>
        <span className="text-sm ml-2 text-[#ef4c4c]">{errors && errors[0]?.message}</span>
    </div>
  );
}
 
export default FormSelect;