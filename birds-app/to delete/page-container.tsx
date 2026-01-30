import * as React from "react"
import { cn } from "@/lib/utils"

interface PageContainerProps extends React.ComponentProps<"div"> {
  title?: string
  description?: string
  size?: "default" | "narrow" | "wide"
}

function PageContainer({
  children,
  title,
  description,
  size = "default",
  className,
  ...props
}: PageContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10",
        {
          "max-w-3xl": size === "narrow",
          "max-w-4xl": size === "default",
          "max-w-6xl": size === "wide",
        },
        className
      )}
      {...props}
    >
      {(title || description) && (
        <header className="mb-8 sm:mb-10">
          {title && (
            <h1 className="heading-display text-2xl sm:text-3xl text-foreground">
              {title}
            </h1>
          )}
          {description && (
            <p className="text-muted-foreground text-base sm:text-lg mt-2 max-w-2xl">
              {description}
            </p>
          )}
        </header>
      )}
      {children}
    </div>
  )
}

function PageSection({
  children,
  title,
  description,
  className,
  ...props
}: {
  children: React.ReactNode
  title?: string
  description?: string
  className?: string
} & React.ComponentProps<"section">) {
  return (
    <section className={cn("mb-8 sm:mb-10", className)} {...props}>
      {(title || description) && (
        <header className="mb-4 sm:mb-6">
          {title && (
            <h2 className="text-lg sm:text-xl font-semibold text-foreground tracking-tight">
              {title}
            </h2>
          )}
          {description && (
            <p className="text-muted-foreground text-sm sm:text-base mt-1">
              {description}
            </p>
          )}
        </header>
      )}
      {children}
    </section>
  )
}

export { PageContainer, PageSection }
