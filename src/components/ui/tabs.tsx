"use client"

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"

const Tabs = TabsPrimitive.Root

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",
      className
    )}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

const tabTriggerStyle = "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"

const TabsTrigger = React.forwardRef<
  HTMLButtonElement | HTMLAnchorElement,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> & { asLink?: boolean; href?: string; }
>(({ className, asLink, href, children, ...props }, ref) => {
    const pathname = usePathname();
    
    if (asLink && href) {
        const isActive = pathname === href;
        return (
            <Link 
                href={href} 
                ref={ref as React.Ref<HTMLAnchorElement>}
                className={cn(tabTriggerStyle, className)}
                data-state={isActive ? 'active' : 'inactive'}
                {...props}
            >
              {children}
            </Link>
        )
    }
  
    // For regular triggers, if we are on a page handled by a link, they should be inactive.
    const onLinkedPage = pathname.startsWith('/my-withdrawals') || pathname.startsWith('/profile');
    if (onLinkedPage) {
        // Force inactive state if we are on a page handled by a link tab
        return (<TabsPrimitive.Trigger
            ref={ref as React.Ref<HTMLButtonElement>}
            className={cn(tabTriggerStyle, className)}
            data-state={'inactive'}
            {...props}
        >
          {children}
        </TabsPrimitive.Trigger>)
    }

    return (<TabsPrimitive.Trigger
        ref={ref as React.Ref<HTMLButtonElement>}
        className={cn(tabTriggerStyle, className)}
        {...props}
    >
      {children}
    </TabsPrimitive.Trigger>)
})
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName


const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
