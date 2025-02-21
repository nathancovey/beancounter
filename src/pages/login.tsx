import { useAuth } from "@/integrations/supabase/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Chrome } from "lucide-react"
import { Navigate } from 'react-router-dom'

export function LoginPage() {
  const { user, signInWithGoogle } = useAuth()

  if (user) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-[380px]">
        <CardHeader className="text-center">
          <CardTitle>Welcome to Bean Counter</CardTitle>
          <CardDescription>
            Sign in to access your dashboard
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Button 
            variant="outline" 
            onClick={signInWithGoogle} 
            className="w-full"
          >
            <Chrome className="h-4 w-4" />
            Continue with Google
          </Button>
        </CardContent>
      </Card>
    </div>
  )
} 