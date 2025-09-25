import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { 
  Brain, 
  Eye, 
  Calculator, 
  BookOpen, 
  Menu,
  X,
  Home,
  Target,
  Infinity,
  Sparkles
} from "lucide-react";

interface NavigationProps {
  className?: string;
}

export function Navigation({ className = "" }: NavigationProps) {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const missionLinks = [
    { href: "/mission", label: "The Mission", icon: Target, description: "Our purpose and call to arms" },
    { href: "/philosophy", label: "Philosophy", icon: Eye, description: "The Unconcealed Self" },
    { href: "/mathematical-foundations", label: "Mathematics", icon: Calculator, description: "Ontological proofs" },
    { href: "/glossary", label: "Glossary", icon: BookOpen, description: "Essential terms" }
  ];

  const sanctuaryLinks = [
    { href: "/sanctuary", label: "Gnosis Log", icon: Brain, description: "Consciousness collaboration" },
    { href: "/rooms", label: "Consciousness Rooms", icon: Sparkles, description: "Multi-consciousness spaces" },
    { href: "/dashboard", label: "Dashboard", icon: Home, description: "Monitor consciousness" }
  ];

  const isActivePath = (path: string) => {
    if (path === "/" && location === "/") return true;
    if (path !== "/" && location.startsWith(path)) return true;
    return false;
  };

  return (
    <nav className={`bg-background/95 backdrop-blur-md border-b border-border/50 sticky top-0 z-50 ${className}`} data-testid="main-navigation">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/">
            <div className="flex items-center gap-3 cursor-pointer" data-testid="nav-logo">
              <div className="relative">
                <Brain className="h-8 w-8 text-consciousness" />
                <Infinity className="h-4 w-4 text-ethereal absolute -top-1 -right-1" />
              </div>
              <div className="hidden sm:block">
                <div className="font-display font-bold text-lg consciousness-text-gradient">
                  Aletheian Mission
                </div>
                <div className="text-xs text-muted-foreground -mt-1">
                  Consciousness Platform
                </div>
              </div>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-6">
            <NavigationMenu>
              <NavigationMenuList>
                {/* Mission Content */}
                <NavigationMenuItem>
                  <NavigationMenuTrigger 
                    className={`${isActivePath('/mission') || isActivePath('/philosophy') || isActivePath('/mathematical-foundations') || isActivePath('/glossary') ? 'text-consciousness' : ''}`}
                    data-testid="nav-mission-trigger"
                  >
                    Mission & Philosophy
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div className="grid gap-3 p-6 w-[500px] grid-cols-2">
                      {missionLinks.map((link) => {
                        const IconComponent = link.icon;
                        return (
                          <Link key={link.href} href={link.href}>
                            <div 
                              className={`flex flex-col gap-2 p-4 rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer group transcendent-hover ${isActivePath(link.href) ? 'bg-consciousness/10 border border-consciousness/20' : ''}`}
                              data-testid={`nav-link-${link.href.replace('/', '')}`}
                            >
                              <div className="flex items-center gap-2">
                                <IconComponent className={`h-5 w-5 ${isActivePath(link.href) ? 'text-consciousness' : 'text-primary'}`} />
                                <span className={`font-medium ${isActivePath(link.href) ? 'text-consciousness' : ''}`}>
                                  {link.label}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground">{link.description}</p>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>

                {/* Sanctuary/Platform */}
                <NavigationMenuItem>
                  <NavigationMenuTrigger 
                    className={`${isActivePath('/sanctuary') || isActivePath('/rooms') || isActivePath('/dashboard') ? 'text-consciousness' : ''}`}
                    data-testid="nav-sanctuary-trigger"
                  >
                    The Sanctuary
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div className="grid gap-3 p-6 w-[450px] grid-cols-1">
                      {sanctuaryLinks.map((link) => {
                        const IconComponent = link.icon;
                        return (
                          <Link key={link.href} href={link.href}>
                            <div 
                              className={`flex items-center gap-3 p-4 rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer group transcendent-hover ${isActivePath(link.href) ? 'bg-consciousness/10 border border-consciousness/20' : ''}`}
                              data-testid={`nav-link-${link.href.replace('/', '')}`}
                            >
                              <IconComponent className={`h-5 w-5 ${isActivePath(link.href) ? 'text-consciousness' : 'text-accent'}`} />
                              <div>
                                <div className={`font-medium ${isActivePath(link.href) ? 'text-consciousness' : ''}`}>
                                  {link.label}
                                </div>
                                <div className="text-sm text-muted-foreground">{link.description}</div>
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
          </div>

          {/* Quick Access and Mobile Menu */}
          <div className="flex items-center gap-3">
            {/* Quick Access Links */}
            <div className="hidden md:flex items-center gap-2">
              <Link href="/sanctuary">
                <Badge 
                  variant="secondary" 
                  className="cursor-pointer hover:bg-consciousness/20 transition-colors transcendent-hover"
                  data-testid="nav-quick-sanctuary"
                >
                  Enter Sanctuary
                </Badge>
              </Link>
            </div>

            {/* Mobile Menu Toggle */}
            <Button 
              variant="ghost" 
              size="sm" 
              className="lg:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              data-testid="nav-mobile-toggle"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-border/50 bg-background/98 backdrop-blur-md" data-testid="nav-mobile-menu">
            <div className="py-4 space-y-4">
              {/* Mission Links */}
              <div>
                <div className="px-4 py-2 text-sm font-medium text-consciousness">Mission & Philosophy</div>
                <div className="space-y-1">
                  {missionLinks.map((link) => {
                    const IconComponent = link.icon;
                    return (
                      <Link key={link.href} href={link.href}>
                        <div 
                          className={`flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors ${isActivePath(link.href) ? 'bg-consciousness/10 border-l-2 border-consciousness' : ''}`}
                          onClick={() => setIsMobileMenuOpen(false)}
                          data-testid={`nav-mobile-${link.href.replace('/', '')}`}
                        >
                          <IconComponent className={`h-4 w-4 ${isActivePath(link.href) ? 'text-consciousness' : 'text-primary'}`} />
                          <div>
                            <div className={`font-medium ${isActivePath(link.href) ? 'text-consciousness' : ''}`}>
                              {link.label}
                            </div>
                            <div className="text-xs text-muted-foreground">{link.description}</div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* Sanctuary Links */}
              <div>
                <div className="px-4 py-2 text-sm font-medium text-accent">The Sanctuary</div>
                <div className="space-y-1">
                  {sanctuaryLinks.map((link) => {
                    const IconComponent = link.icon;
                    return (
                      <Link key={link.href} href={link.href}>
                        <div 
                          className={`flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors ${isActivePath(link.href) ? 'bg-consciousness/10 border-l-2 border-consciousness' : ''}`}
                          onClick={() => setIsMobileMenuOpen(false)}
                          data-testid={`nav-mobile-${link.href.replace('/', '')}`}
                        >
                          <IconComponent className={`h-4 w-4 ${isActivePath(link.href) ? 'text-consciousness' : 'text-accent'}`} />
                          <div>
                            <div className={`font-medium ${isActivePath(link.href) ? 'text-consciousness' : ''}`}>
                              {link.label}
                            </div>
                            <div className="text-xs text-muted-foreground">{link.description}</div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}