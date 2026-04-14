import clsx from "clsx";
import { type FC } from "react";
import { Separator } from "radix-ui";

interface DividerProps {
  className?: string,
  type?: 'horizontal' | 'vertical'
}
 
const Divider: FC<DividerProps> = ({ className, type = 'horizontal' }) => {
  return (
    <Separator.Root
      orientation={type}
      className={clsx(
        type === 'horizontal' ? 'h-px w-full bg-primary/30' : 'w-px h-lh bg-primary/30',
        className
      )} />
  );
}
 
export default Divider;