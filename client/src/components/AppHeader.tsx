import { useAuth } from '@/lib/auth';
import { Menu, Bell } from 'lucide-react';

interface AppHeaderProps {
  title: string;
  onMenuToggle: () => void;
  hasBackButton?: boolean;
}

export default function AppHeader({ title, onMenuToggle, hasBackButton = false }: AppHeaderProps) {
  const { user } = useAuth();
  
  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user || !user.name) return 'U';
    
    const nameParts = user.name.split(' ');
    if (nameParts.length === 1) return nameParts[0].charAt(0).toUpperCase();
    
    return (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase();
  };

  return (
    <header className="bg-primary text-white shadow-md fixed top-0 left-0 w-full z-30">
      <div className="flex items-center justify-between h-14 px-4">
        <div className="flex items-center">
          <button 
            onClick={onMenuToggle}
            className="p-1 -ml-1 mr-2 rounded-full hover:bg-primary-dark focus:outline-none focus:bg-primary-dark"
          >
            <Menu className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-medium">{title}</h1>
        </div>
        <div className="flex items-center">
          <div className="relative mr-2">
            <div className="w-8 h-8 flex items-center justify-center rounded-full bg-primary-dark">
              <Bell className="w-5 h-5" />
            </div>
            <span className="absolute top-0 right-0 w-3 h-3 bg-error rounded-full border border-white"></span>
          </div>
          <div className="w-8 h-8 bg-primary-dark rounded-full flex items-center justify-center">
            <span className="text-sm font-semibold">{getUserInitials()}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
