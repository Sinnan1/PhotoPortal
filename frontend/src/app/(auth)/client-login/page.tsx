"use client"

import type React from "react"
import Link from "next/link"
import Image from "next/image"
import { useAuth } from "@/lib/auth-context" // Assuming this path
import { useToast } from "@/components/ui/use-toast" // Standard shadcn path
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Loader2, Download, Heart, ShieldCheck } from "lucide-react"

// 1. Define the form schema
const formSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  password: z.string().min(1, {
    message: "Password is required.",
  }),
})

export default function ClientLoginPage() {
  const { clientLogin } = useAuth()
  const { toast } = useToast()

  // 2. Set up the form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "", password: "" },
  })

  // 3. Handle submission
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      await clientLogin(values.email, values.password)
      toast({ title: "Success!", description: "Welcome to your gallery." })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: error instanceof Error ? error.message : "Please check your credentials.",
      })
    }
  }

  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
      {/* 1. Full-screen Background Image */}
      <Image
        src="/placeholder-wedding-photo-3.jpg" // Replace with your BEST photo
        alt="Yarrow Weddings & Co gallery"
        layout="fill"
        objectFit="cover"
        className="-z-20 brightness-[0.6]" // Darken the image for contrast
        priority
      />

      {/* Optional: Add a subtle dark overlay for better text readability */}
      <div className="absolute inset-0 -z-10 bg-black/30" />

      {/* 2. Centered "Glassmorphism" Card */}
      <Card className="relative z-10 w-full max-w-md border-white/20 bg-background/70 backdrop-blur-lg shadow-2xl">
        <CardHeader className="text-center">
          <Image
            src="/LOGO-02.png" // Using the light-on-dark logo
            alt="Yarrow Weddings & Co"
            width={180}
            height={50}
            className="mx-auto mb-4"
          />
          <CardTitle className="text-3xl font-bold">Client Lounge</CardTitle>
          <CardDescription>Welcome. Sign in to access your private gallery.</CardDescription>
        </CardHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="grid gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="name@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center">
                      <FormLabel>Password</FormLabel>
                      <Link
                        href="/forgot-password-client" // Ensure this link is correct
                        className="ml-auto inline-block text-sm underline"
                      >
                        Forgot?
                      </Link>
                    </div>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Feature Callouts - Kept from your original design */}
              <ul className="grid grid-cols-3 gap-3 pt-2 text-center text-xs text-muted-foreground">
                <li className="flex flex-col items-center gap-1.5 rounded-lg border bg-background/50 p-2">
                  <Download className="h-4 w-4" />
                  <span>Download</span>
                </li>
                <li className="flex flex-col items-center gap-1.5 rounded-lg border bg-background/50 p-2">
                  <Heart className="h-4 w-4" />
                  <span>Favorites</span>
                </li>
                <li className="flex flex-col items-center gap-1.5 rounded-lg border bg-background/50 p-2">
                  <ShieldCheck className="h-4 w-4" />
                  <span>Secure</span>
                </li>
              </ul>
            </CardContent>

            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Access Your Gallery
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Are you a photographer?{" "}
                <Link href="/login" className="font-semibold text-primary underline">
                  Sign in here
                </Link>
              </p>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  )
}
