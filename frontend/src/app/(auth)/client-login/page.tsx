"use client"

import type React from "react"
import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
import { Loader2, Download, Heart, ShieldCheck } from "lucide-react"

// 1. Validation Schema
const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
})

export default function ClientLoginPage() {
  const { clientLogin } = useAuth()
  const { toast } = useToast()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "", password: "" },
  })

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      await clientLogin(values.email, values.password)
      toast({ title: "Success!", description: "Welcome to your gallery." })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description:
          error instanceof Error
            ? error.message
            : "Please check your credentials.",
      })
    }
  }

  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center p-6 bg-black/40">
      {/* Background Image */}
      <Image
        src="/Client-Login.jpg"
        alt="Client Login Background"
        fill
        className="object-cover -z-20 brightness-[0.55]"
        priority
      />

      {/* Gradient Overlay */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/40 via-black/30 to-black/60" />

      {/* Glassmorphism Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md"
      >
        <Card className="border border-white/20 bg-white/15 backdrop-blur-2xl shadow-2xl rounded-2xl">
          <CardHeader className="text-center space-y-2">
            <CardTitle className="text-3xl font-semibold tracking-tight text-white drop-shadow">
              Client Lounge
            </CardTitle>
            <CardDescription className="text-gray-200">
              Welcome. Sign in to access your private gallery.
            </CardDescription>
          </CardHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="grid gap-4">
                {/* Email */}
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-100">Email</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="name@example.com"
                          {...field}
                          className="bg-white/20 border-white/20 text-white placeholder:text-gray-300 focus-visible:ring-[#d1b98b]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Password */}
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center">
                        <FormLabel className="text-gray-100">
                          Password
                        </FormLabel>
                        <Link
                          href="/forgot-password-client"
                          className="ml-auto text-sm text-gray-300 underline hover:text-white transition"
                        >
                          Forgot?
                        </Link>
                      </div>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          {...field}
                          className="bg-white/20 border-white/20 text-white placeholder:text-gray-300 focus-visible:ring-[#d1b98b]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Icons */}
                <ul className="grid grid-cols-3 gap-3 pt-4 text-center text-xs text-gray-200">
                  <li className="flex flex-col items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 p-2 hover:bg-white/20 transition">
                    <Download className="h-4 w-4" />
                    <span>Download</span>
                  </li>
                  <li className="flex flex-col items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 p-2 hover:bg-white/20 transition">
                    <Heart className="h-4 w-4" />
                    <span>Favorites</span>
                  </li>
                  <li className="flex flex-col items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 p-2 hover:bg-white/20 transition">
                    <ShieldCheck className="h-4 w-4" />
                    <span>Secure</span>
                  </li>
                </ul>
              </CardContent>

              <CardFooter className="flex flex-col gap-4 pb-6">
                <Button
                  type="submit"
                  className="w-full bg-[#b19b75] hover:bg-[#a18c67] text-white"
                  disabled={form.formState.isSubmitting}
                >
                  {form.formState.isSubmitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Access Your Gallery
                </Button>

                <p className="text-center text-sm text-gray-300">
                  Are you a photographer?{" "}
                  <Link
                    href="/login"
                    className="font-semibold text-[#d1b98b] underline hover:text-[#f1d8a2] transition"
                  >
                    Sign in here
                  </Link>
                </p>
              </CardFooter>
            </form>
          </Form>
        </Card>
      </motion.div>
    </div>
  )
}
