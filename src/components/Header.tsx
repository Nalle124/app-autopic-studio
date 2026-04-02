import { User } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useTheme } from "next-themes";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import autopicLogoDark from "@/assets/autopic-logo-dark.png";
import autopicLogoWhite from "@/assets/autopic-logo-white.png";

interface HeaderProps {
  onUpgradeClick?: () => void;
  activeTab?: string;
}

export const Header = ({ onUpgradeClick, activeTab = "history" }: HeaderProps) => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { t } = useTranslation();

  const handleTabChange = (value: string) => {
    if (value === 'new') navigate('/');
    else if (value === 'ai-studio') navigate('/classic?tab=ai-studio');
    else if (value === 'history') navigate('/classic?tab=history');
  };

  return (
    <header className="border-b border-border/30 bg-card/90 backdrop-blur-md sticky top-0 z-50 pt-[max(env(safe-area-inset-top),12px)] before:absolute before:inset-x-0 before:-top-20 before:bottom-0 before:bg-card/90 before:-z-10">
      <div className="container mx-auto px-4 py-2 sm:py-3 flex items-center justify-between">
        <button 
          onClick={() => navigate('/')}
          className="hover:opacity-80 transition-opacity"
        >
          <img 
            src={theme === 'light' ? autopicLogoDark : autopicLogoWhite} 
            alt="AutoPic" 
            className="h-[26px] sm:h-8 w-auto"
          />
        </button>
        
        <div className="flex items-center gap-2">
          <Select value={activeTab} onValueChange={handleTabChange}>
            <SelectTrigger className={`${isMobile ? 'w-[120px] h-8 text-xs' : 'w-[150px] h-9 text-sm'} bg-background/80 backdrop-blur-sm`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover z-[60]">
              <SelectItem value="new">{t('nav.project')}</SelectItem>
              <SelectItem value="ai-studio">{t('nav.aiStudio')}</SelectItem>
              <SelectItem value="history">{t('nav.gallery')}</SelectItem>
            </SelectContent>
          </Select>
          {user && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/profil')} title="Profil">
              <User className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};
