import * as React from "react"
import { Loader2Icon } from "lucide-react"

import { cn } from "@/lib/utils"

function Spinner({
  className,
  "aria-label": ariaLabel,
  ...props
}: React.ComponentProps<"svg">) {
  return (
    <Loader2Icon
      role="status"
      aria-hidden={ariaLabel ? undefined : true}
      aria-label={ariaLabel}
      className={cn("size-4 animate-spin", className)}
      {...props}
    />
  )
}

export { Spinner }
