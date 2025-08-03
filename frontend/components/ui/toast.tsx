"use client"

import type React from "react"

import { createContext, useContext, useState, useCallback } from "react"
import { X } from "lucide-react"
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

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn("flex items-center justify-between p-4 rounded-lg shadow-lg min-w-80 max-w-md", {
              "bg-green-500 text-white": toast.type === "success",
              "bg-red-500 text-white": toast.type === "error",
              "bg-blue-500 text-white": toast.type === "info",
            })}
          >
            <span>{toast.message}</span>
            <button onClick={() => removeToast(toast.id)} className="ml-4 hover:opacity-70">
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
