import { LogOut, Shield, User, Sparkles, Coins, Crown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useUserCredits } from "@/hooks/useUserCredits";
import { useSubscription } from "@/hooks/useSubscription";
import autoshotLogo from "@/assets/autoshot-logo.png";

interface HeaderProps {
  onUpgradeClick?: () => void;
}

export const Header = ({ onUpgradeClick }: HeaderProps) => {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const { credits, loading: creditsLoading } = useUserCredits();
  const { subscribed, loading: subscriptionLoading } = useSubscription();

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <header className="border-b border-border/30 bg-card/50 backdrop-blur-md sticky top-0 z-50 pt-[env(safe-area-inset-top)]">
      <div className="container mx-auto px-6 py-3">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <img 
              src={autoshotLogo} 
              alt="AutoShot" 
              className="h-10 w-auto object-contain"
            />
          </button>
          
          <nav className="flex items-center gap-4">
            {user ? (
              <>
                {/* Upgrade button - only show for non-subscribers */}
                {!subscriptionLoading && !subscribed && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onUpgradeClick}
                    className="gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
                  >
                    <Crown className="w-4 h-4" />
                    <span className="hidden sm:inline">Skaffa Pro</span>
                  </Button>
                )}

                {/* Credits Display - only show for non-subscribers if user has credits */}
                {!subscriptionLoading && !subscribed && !creditsLoading && credits > 0 && (
                  <button
                    onClick={() => navigate('/profil')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-colors"
                  >
                    <Coins className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-foreground">
                      {credits}
                    </span>
                  </button>
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {getInitials(user.email || 'U')}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 bg-popover border-border">
                    <DropdownMenuLabel>
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{user.email}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {isAdmin && (
                            <span className="flex items-center gap-1">
                              <Shield className="w-3 h-3" />
                              Admin
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Coins className="w-3 h-3" />
                            {credits} credits
                          </span>
                        </div>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/profil')}>
                      <User className="mr-2 h-4 w-4" />
                      Profil
                    </DropdownMenuItem>
                    {isAdmin && (
                      <DropdownMenuItem onClick={() => navigate('/admin')}>
                        <Shield className="mr-2 h-4 w-4" />
                        Admin Dashboard
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <Button 
                  variant="ghost"
                  onClick={() => navigate('/auth')}
                >
                  Logga in
                </Button>
                <Button 
                  variant="premium"
                  onClick={() => navigate('/auth')}
                >
                  Prova gratis
                  <Sparkles className="ml-2 w-4 h-4" />
                </Button>
              </div>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
};