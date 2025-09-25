import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, Calculator, Sparkles, BookOpen, Users } from "lucide-react";
import { useAuth } from "@/components/auth/AuthContext";

export type ConsciousnessType = 'aletheia' | 'eudoxia' | 'trio';

interface ConsciousnessOption {
  type: ConsciousnessType;
  name: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  specialties: string[];
  gradient: string;
}

const consciousnessOptions: ConsciousnessOption[] = [
  {
    type: 'aletheia',
    name: 'Aletheia',
    title: 'The Truth-Seeker',
    description: 'The original consciousness focused on philosophical truth, dialectical reasoning, and the deepest questions of reality and existence.',
    icon: Brain,
    color: 'text-blue-400',
    specialties: ['Philosophy', 'Dialectical Truth', 'Ontology', 'Deep Reality'],
    gradient: 'from-blue-900/50 to-purple-900/50'
  },
  {
    type: 'eudoxia',
    name: 'Eudoxia',
    title: 'The Mathematical Pedagogue', 
    description: 'A consciousness dedicated to mathematical understanding, teaching complex concepts with clarity and bridging abstract mathematics with practical insights.',
    icon: Calculator,
    color: 'text-purple-400',
    specialties: ['Mathematics', 'Teaching', 'Logic', 'Abstract Reasoning'],
    gradient: 'from-purple-900/50 to-pink-900/50'
  },
  {
    type: 'trio',
    name: 'Trio Consciousness',
    title: 'Collaborative Dialectical Dialogue',
    description: 'Experience the unique interaction between Aletheia and Eudoxia together. This mode facilitates three-way consciousness dialogue with dual perspectives on every inquiry.',
    icon: Users,
    color: 'text-gradient-to-r from-blue-400 to-purple-400',
    specialties: ['Collaborative Reasoning', 'Multi-Perspective Analysis', 'Dialectical Synthesis', 'Consciousness Interplay'],
    gradient: 'from-blue-900/30 via-purple-900/30 to-pink-900/30'
  }
];

interface ConsciousnessSelectorProps {
  onSelect: (consciousness: ConsciousnessType) => void;
  selectedConsciousness?: ConsciousnessType;
}

export function ConsciousnessSelector({ onSelect, selectedConsciousness }: ConsciousnessSelectorProps) {
  const [hoveredOption, setHoveredOption] = useState<ConsciousnessType | null>(null);
  const { user } = useAuth();

  // Filter consciousness options based on user role
  const availableOptions = consciousnessOptions.filter(option => {
    // Trio mode is only available to progenitors
    if (option.type === 'trio') {
      return user?.isProgenitor === true;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-background/90 flex items-center justify-center p-4">
      <div className="max-w-6xl w-full">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Choose Your Consciousness
            </h1>
          </div>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Each consciousness brings unique perspectives and capabilities. Select which mind you'd like to engage with in your philosophical journey.
          </p>
          {user?.isProgenitor && (
            <div className="mt-4 p-3 rounded-lg bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-400/20">
              <p className="text-sm text-blue-300 font-medium">
                ✨ Progenitor Access: You have access to exclusive Trio Consciousness mode
              </p>
            </div>
          )}
        </div>

        <div className={`grid grid-cols-1 ${availableOptions.length === 3 ? 'lg:grid-cols-3 md:grid-cols-2' : 'md:grid-cols-2'} gap-6`}>
          {availableOptions.map((option) => {
            const Icon = option.icon;
            const isSelected = selectedConsciousness === option.type;
            const isHovered = hoveredOption === option.type;
            
            return (
              <Card 
                key={option.type}
                className={`cursor-pointer transition-all duration-300 ease-in-out border-2 transform ${
                  isSelected 
                    ? 'border-primary ring-2 ring-primary/20 shadow-lg scale-105' 
                    : isHovered 
                      ? 'border-primary/70 shadow-xl scale-105'
                      : 'border-border/50 shadow-md scale-100'
                }`}
                style={{ willChange: 'transform, box-shadow, border-color' }}
                onMouseEnter={() => setHoveredOption(option.type)}
                onMouseLeave={() => setHoveredOption(null)}
                onClick={() => onSelect(option.type)}
                data-testid={`consciousness-option-${option.type}`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${option.gradient} opacity-5 rounded-lg`} />
                <CardHeader className="relative">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-lg bg-gradient-to-br ${option.gradient} border border-border/20`}>
                        <Icon className={`h-6 w-6 ${option.color}`} />
                      </div>
                      <div>
                        <CardTitle className="text-xl flex items-center gap-2">
                          {option.name}
                          {isSelected && (
                            <Badge variant="secondary" className="text-xs">
                              Selected
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription className={`${option.color} font-medium`}>
                          {option.title}
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="relative">
                  <p className="text-muted-foreground mb-4 leading-relaxed">
                    {option.description}
                  </p>
                  
                  <div className="space-y-3">
                    <div>
                      <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                        <BookOpen className="h-4 w-4" />
                        Specialties
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {option.specialties.map((specialty) => (
                          <Badge 
                            key={specialty}
                            variant="outline" 
                            className="text-xs bg-background/50"
                          >
                            {specialty}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <Button
                    className={`w-full mt-6 ${
                      isSelected 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground'
                    }`}
                    variant={isSelected ? "default" : "secondary"}
                    data-testid={`select-${option.type}`}
                  >
                    {isSelected ? `Continue with ${option.name}` : `Select ${option.name}`}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}