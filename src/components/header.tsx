import React from "react"
import { useAuth } from "../integrations/supabase/auth-context.tsx"
import { Button } from "./ui/button.tsx"
import { LogIn, LogOut } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu.tsx"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar.tsx"
import { ThemeToggle } from "./theme-provider.tsx"
import beanIcon from "../assets/bean.svg"

export function Header() {
  const { user, signInWithGoogle, signOut } = useAuth()

  return (
    <header className="flex justify-between items-center py-4">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <img src={beanIcon} className="h-6 w-6 bean-icon" alt="Bean icon" />
        Bean Counter
      </h1>
      <div className="flex items-center gap-4">
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-3 hover:opacity-80">
              <span className="text-sm text-muted-foreground">{user?.user_metadata?.name}</span>
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.user_metadata?.picture || ''} />
                <AvatarFallback>{user?.user_metadata?.name?.[0] || 'U'}</AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[200px]">
              <DropdownMenuItem 
                className="flex items-center justify-between cursor-default"
                onSelect={(e) => e.preventDefault()}
              >
                <span className="text-muted-foreground">Switch Theme</span>
                <div onClick={(e) => e.stopPropagation()}>
                  <ThemeToggle />
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut}>
                <span className="text-muted-foreground">Sign Out</span>
                <LogOut className="ml-auto h-4 w-4" />
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button 
            variant="default" 
            onClick={signInWithGoogle}
            className="gap-2"
          >
            <LogIn className="h-4 w-4" />
            Sign in with Google
          </Button>
        )}
      </div>
    </header>
  )
} 