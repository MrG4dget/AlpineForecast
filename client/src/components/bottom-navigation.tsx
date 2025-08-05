import { Link, useLocation } from "wouter";
import { MapPin, BookOpen, Bookmark, User } from "lucide-react";

interface BottomNavigationProps {
  currentPage: "map" | "species" | "finds" | "profile";
}

export default function BottomNavigation({ currentPage }: BottomNavigationProps) {
  const [location] = useLocation();

  const navItems = [
    {
      id: "map",
      label: "Map",
      icon: MapPin,
      href: "/",
      testId: "nav-map",
    },
    {
      id: "species",
      label: "Species",
      icon: BookOpen,
      href: "/species",
      testId: "nav-species",
    },
    {
      id: "finds",
      label: "My Finds",
      icon: Bookmark,
      href: "/finds",
      testId: "nav-finds",
    },
    {
      id: "profile",
      label: "Profile",
      icon: User,
      href: "/profile",
      testId: "nav-profile",
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-forest-200 px-4 py-2 safe-area-inset-bottom">
      <div className="flex justify-around items-center">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          
          return (
            <Link key={item.id} href={item.href}>
              <button 
                className={`flex flex-col items-center space-y-1 transition-colors ${
                  isActive 
                    ? "text-forest-600" 
                    : "text-gray-400 hover:text-gray-600"
                }`}
                data-testid={item.testId}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
