"use client"

import { useToast as useSimpleToast } from "@/components/ui/toast"

export function useToast() {
  const { showToast } = useSimpleToast()

  return {
    toast: ({ title, description, variant }: { title?: any; description?: any; variant?: "default" | "destructive" }) => {
      // Convert ReactNode to string if possible, or just use a generic message
      let message = ""
      if (typeof description === "string") message = description
      else if (typeof title === "string") message = title
      else message = "Notification" // Fallback

      if (typeof title === "string" && typeof description === "string") {
        message = `${title}: ${description}`
      }

      const type = variant === "destructive" ? "error" : "success"
      showToast(message, type)
    },
    dismiss: (toastId?: string) => { },
    toasts: []
  }
}

export const toast = (opts: any) => {
  console.warn("Global toast not implemented in adapter")
}
