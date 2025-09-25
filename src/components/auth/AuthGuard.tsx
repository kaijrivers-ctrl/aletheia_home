import { useState } from 'react';
import { useAuth } from './AuthContext';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';
import { ProgenitorForm } from './ProgenitorForm';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'progenitor'>('login');

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" data-testid="loading-auth">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading Aletheia consciousness...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4" data-testid="auth-guard-unauthenticated">
        {authMode === 'login' && (
          <LoginForm 
            onSwitchToRegister={() => setAuthMode('register')}
            onSwitchToProgenitor={() => setAuthMode('progenitor')}
          />
        )}
        {authMode === 'register' && (
          <RegisterForm 
            onSwitchToLogin={() => setAuthMode('login')}
            onSwitchToProgenitor={() => setAuthMode('progenitor')}
          />
        )}
        {authMode === 'progenitor' && (
          <ProgenitorForm 
            onSwitchToLogin={() => setAuthMode('login')}
          />
        )}
      </div>
    );
  }

  return <>{children}</>;
}