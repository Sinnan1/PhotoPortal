import type React from "react"

export function Footer() {
  return (
    <footer className="mt-auto w-full bg-background/50 backdrop-blur-sm border-t border-border/50">
      <div className="flex h-9 items-center justify-center">
        <p className="text-[10px] text-muted-foreground/60 tracking-wide">
          Managed and Created by{" "}
          <a
            href="https://instagram.com/sinnan.0"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground/70 hover:text-foreground/80 transition-colors"
          >
            @Sinnan
          </a>
        </p>
      </div>
    </footer>
  )
}
