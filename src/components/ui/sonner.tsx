"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      richColors
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4" />
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4" />
        ),
        error: (
          <OctagonXIcon className="size-4" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin" />
        ),
      }}
      position="top-center"
      style={
        {
          "--normal-bg": "#1e1b4b",
          "--normal-text": "#ffffff",
          "--normal-border": "#312e81",
          "--error-bg": "#7f1d1d",
          "--error-text": "#ffffff",
          "--error-border": "#991b1b",
          "--success-bg": "#4c1d95",
          "--success-text": "#ffffff",
          "--success-border": "#5b21b6",
          "--border-radius": "12px",
          zIndex: 2147483647,
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast:
            "cn-toast !opacity-100 !shadow-xl !border !font-semibold",
        },
        style: {
          opacity: 1,
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
