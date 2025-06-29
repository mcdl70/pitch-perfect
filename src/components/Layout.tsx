import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LogOut, User, Shield, FileText, Briefcase, FolderOpen } from 'lucide-react'
import { toast } from 'sonner'

interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  const { user, signOut, loading } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    const { error } = await signOut()
    if (error) {
      toast.error('Error signing out')
    } else {
      toast.success('Signed out successfully')
      navigate('/')
    }
  }

  const getUserInitials = (email: string) => {
    return email.split('@')[0].slice(0, 2).toUpperCase()
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-neutral-200 bg-background/95 nav-backdrop">
        <div className="container mx-auto px-4 h-[64px] flex items-center justify-between max-w-container">
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Shield className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-xl text-foreground">PitchPerfect</span>
          </Link>

          <nav className="hidden md:flex items-center space-x-32px">
            <Link 
              to="/" 
              className="text-caption font-medium transition-colors hover:text-primary text-neutral-700"
            >
              Home
            </Link>
            {user && (
              <>
                <Link 
                  to="/interviews" 
                  className="text-caption font-medium transition-colors hover:text-primary text-neutral-700"
                >
                  Interviews
                </Link>
                <Link 
                  to="/reports" 
                  className="text-caption font-medium transition-colors hover:text-primary text-neutral-700"
                >
                  Reports
                </Link>
              </>
            )}
          </nav>

          <div className="flex items-center space-x-4">
            {loading ? (
              <div className="h-8 w-8 animate-pulse bg-muted rounded-full" />
            ) : user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {getUserInitials(user.email!)}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <div className="flex flex-col space-y-1 p-2">
                    <p className="text-sm font-medium leading-none">{user.email}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      Authenticated User
                    </p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/interview" className="cursor-pointer">
                      <Briefcase className="mr-2 h-4 w-4" />
                      New Interview
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/interviews" className="cursor-pointer">
                      <FolderOpen className="mr-2 h-4 w-4" />
                      Manage Interviews
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/reports" className="cursor-pointer">
                      <FileText className="mr-2 h-4 w-4" />
                      All Reports
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="cursor-pointer text-red-600 focus:text-red-600"
                    onClick={handleSignOut}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center space-x-2">
                <Button asChild>
                  <Link to="/login">Sign In</Link>
                </Button>
                <Button asChild>
                  <Link to="/signup">Sign Up</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        {children}
      </main>
    </div>
  )
}