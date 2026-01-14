"use client"

import type React from "react"

import { createContext, useContext, useState, useCallback } from "react"
import { X, CheckCircle2, AlertCircle, Info } from "lucide-react"
import { cn } from "@/lib/utils"

interface Toast {
  id: string
  message: string
  type: "success" | "error" | "info"
}

interface ToastContextType {
  showToast: (message: string, type: "success" | "error" | "info") => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((message: string, type: "success" | "error" | "info") => {
    const id = Math.random().toString(36).substr(2, 9)
    const toast = { id, message, type }

    setToasts((prev) => [...prev, toast])

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 5000)
  }, [])

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  const getIcon = (type: Toast["type"]) => {
    switch (type) {
      case "success":
        return <CheckCircle2 className="w-5 h-5" />
      case "error":
        return <AlertCircle className="w-5 h-5" />
      case "info":
        return <Info className="w-5 h-5" />
    }
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="toast-container fixed top-4 right-4 z-[100] space-y-3 max-w-sm">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              "flex items-start gap-3 p-4 rounded-xl shadow-2xl backdrop-blur-lg border animate-in slide-in-from-right-full duration-300",
              "bg-background/80 border-border/50 ring-1 ring-border/20",
              {
                "border-green-500/30 bg-green-500/10": toast.type === "success",
                "border-red-500/30 bg-red-500/10": toast.type === "error",
                "border-blue-500/30 bg-blue-500/10": toast.type === "info",
              }
            )}
          >
            <div
              className={cn("mt-0.5", {
                "text-green-600": toast.type === "success",
                "text-red-600": toast.type === "error",
                "text-blue-600": toast.type === "info",
              })}
            >
              {getIcon(toast.type)}
            </div>
            <span className="flex-1 text-sm font-medium text-foreground leading-relaxed">
              {toast.message}
            </span>
            <button
              onClick={() => removeToast(toast.id)}
              className="ml-2 hover:opacity-70 transition-opacity text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error("useToast must be used within ToastProvider")
  }
  return context
}
