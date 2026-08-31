import { type ReactNode, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'

type ExpandableSectionProps = {
  title: ReactNode
  children: ReactNode
  defaultOpen?: boolean
  className?: string
}

const ExpandableSection = ({ title, children, defaultOpen = false, className }: ExpandableSectionProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={cn('flex flex-col gap-2', className)}>
      <CollapsibleTrigger className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        <ChevronDown
          size={12}
          className={cn('transition-transform duration-200', !isOpen && '-rotate-90')}
        />
        {title}
      </CollapsibleTrigger>
      <CollapsibleContent className="flex flex-col gap-2">{children}</CollapsibleContent>
    </Collapsible>
  )
}

export { ExpandableSection }
