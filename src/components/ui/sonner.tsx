import type { CSSProperties } from "react"
import {
  CheckCircle,
  Info,
  SpinnerGap,
  Warning,
  XCircle,
} from "@phosphor-icons/react"
import { Toaster as Sonner, type ToasterProps } from "sonner"

import { useTheme } from "@/components/theme-provider"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        error: <XCircle className="size-4" />,
        info: <Info className="size-4" />,
        loading: <SpinnerGap className="size-4 animate-spin" />,
        success: <CheckCircle className="size-4" />,
        warning: <Warning className="size-4" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
