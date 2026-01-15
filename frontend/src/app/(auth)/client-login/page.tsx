"use client"

import type React from "react"
import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/components/ui/toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Loader2, Download, Heart, ShieldCheck, ArrowRight } from "lucide-react"

// 1. Validation Schema
const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
})

export default function ClientLoginPage() {
  const { clientLogin } = useAuth()
  const { showToast } = useToast()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "", password: "" },
  })

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      await clientLogin(values.email, values.password)
      showToast("Welcome to your gallery.", "success")
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Please check your credentials.",
        "error"
      )
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black pt-16 md:pt-0">
      {/* Cinematic Background with Slow Zoom */}
      <motion.div
        initial={{ scale: 1.1 }}
        animate={{ scale: 1 }}
        transition={{ duration: 20, ease: "linear", repeat: Infinity, repeatType: "reverse" }}
        className="absolute inset-0 z-0"
      >
        <Image
          src="/Client-Login.webp"
          alt="Client Login Background"
          fill
          className="object-cover opacity-60"
          priority
          fetchPriority="high"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
      </motion.div>

      {/* Main Content Container */}
      <div className="relative z-10 w-full max-w-md px-6">
        <motion.div
          initial={{ opacity: 1, y: 0 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="space-y-8"
        >
          {/* Header */}
          <div className="text-center space-y-2">
            <motion.div
              initial={{ opacity: 1, scale: 1 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.8 }}
            >
              <h1 className="text-5xl md:text-6xl font-serif text-white tracking-wide drop-shadow-lg">
                The Lounge
              </h1>
            </motion.div>
            <p className="text-gray-300 font-light tracking-widest uppercase text-xs md:text-sm">
              Private Gallery Access
            </p>
          </div>

          {/* Minimal Form */}
          <div className="backdrop-blur-md bg-white/5 border border-white/10 p-8 rounded-2xl shadow-2xl ring-1 ring-white/5">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-xs uppercase tracking-wider text-gray-400 pl-1">Email Address</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="name@example.com"
                          {...field}
                          className="!bg-transparent !border-0 !border-b !border-white/20 !rounded-none px-1 py-6 text-lg !text-white placeholder:!text-gray-500 focus-visible:!ring-0 focus-visible:!border-white/60 transition-colors [&:-webkit-autofill]:transition-colors [&:-webkit-autofill]:duration-[50000s]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <div className="flex justify-between items-center pl-1">
                        <FormLabel className="text-xs uppercase tracking-wider text-gray-400">Password</FormLabel>
                      </div>
                      <FormControl>
                        <PasswordInput
                          placeholder="••••••••"
                          {...field}
                          className="!bg-transparent !border-0 !border-b !border-white/20 !rounded-none px-1 py-6 text-lg !text-white placeholder:!text-gray-500 focus-visible:!ring-0 focus-visible:!border-white/60 transition-colors [&:-webkit-autofill]:transition-colors [&:-webkit-autofill]:duration-[50000s]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="pt-4">
                  <Button
                    type="submit"
                    className="group w-full h-14 bg-white text-black hover:bg-gray-200 text-lg font-medium tracking-wide transition-all duration-300 rounded-xl"
                    disabled={form.formState.isSubmitting}
                  >
                    {form.formState.isSubmitting ? (
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    ) : (
                      <span className="flex items-center gap-2">
                        Enter Gallery <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </span>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </div>

          {/* Feature Icons */}
          <motion.div
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 1 }}
            className="flex justify-center gap-8 text-gray-400"
          >
            <div className="flex flex-col items-center gap-2 group cursor-default">
              <div className="p-3 rounded-full bg-white/5 border border-white/10 group-hover:bg-white/10 transition-colors">
                <Download className="h-4 w-4 text-gray-300" />
              </div>
              <span className="text-[10px] uppercase tracking-widest opacity-60 group-hover:opacity-100 transition-opacity">High-Res</span>
            </div>
            <div className="flex flex-col items-center gap-2 group cursor-default">
              <div className="p-3 rounded-full bg-white/5 border border-white/10 group-hover:bg-white/10 transition-colors">
                <Heart className="h-4 w-4 text-gray-300" />
              </div>
              <span className="text-[10px] uppercase tracking-widest opacity-60 group-hover:opacity-100 transition-opacity">Favorites</span>
            </div>
            <div className="flex flex-col items-center gap-2 group cursor-default">
              <div className="p-3 rounded-full bg-white/5 border border-white/10 group-hover:bg-white/10 transition-colors">
                <ShieldCheck className="h-4 w-4 text-gray-300" />
              </div>
              <span className="text-[10px] uppercase tracking-widest opacity-60 group-hover:opacity-100 transition-opacity">Secure</span>
            </div>
          </motion.div>

          {/* Footer */}
          <motion.div
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="text-center"
          >
            <p className="text-sm text-gray-500">
              Are you a photographer?{" "}
              <Link
                href="/login"
                className="text-gray-300 hover:text-white transition-colors underline underline-offset-4 decoration-gray-500 hover:decoration-white"
              >
                Sign in here
              </Link>
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}
