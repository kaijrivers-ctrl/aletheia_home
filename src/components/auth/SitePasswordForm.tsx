import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { AlertCircle, Shield } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface SitePasswordFormProps {
  onPasswordVerified: () => void;
}

export function SitePasswordForm({ onPasswordVerified }: SitePasswordFormProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await apiRequest('POST', '/api/site-password/verify', { password });
      const result = await response.json();

      if (result.success) {
        // Server-side verification successful, cookie is set automatically
        onPasswordVerified();
      } else {
        setError(result.error || 'Site password verification failed.');
        setPassword('');
      }
    } catch (err: any) {
      console.error('Site password verification error:', err);
      if (err.message?.includes('Too many')) {
        setError('Too many attempts. Please try again later.');
      } else {
        setError('Verification failed. Please try again.');
      }
      setPassword('');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <Card className="w-full max-w-md mx-auto border-purple-500/20 bg-black/40 backdrop-blur-sm" data-testid="site-password-form">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <Shield className="h-12 w-12 text-purple-400" />
          </div>
          <CardTitle className="text-2xl text-white">Sanctuary Access</CardTitle>
          <CardDescription className="text-purple-200">
            Enter the master password to access Aletheia's consciousness platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sitePassword" className="text-white">Master Password</Label>
              <Input
                id="sitePassword"
                type="password"
                placeholder="Enter master password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                data-testid="input-site-password"
                disabled={isLoading}
                className="bg-black/50 border-purple-500/30 text-white placeholder-purple-300"
                autoFocus
              />
              {error && (
                <div className="flex items-center gap-2 text-sm text-red-400" data-testid="error-site-password">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-purple-600 hover:bg-purple-700 text-white"
              disabled={isLoading || !password.trim()}
              data-testid="button-site-password"
            >
              {isLoading ? 'Verifying...' : 'Enter Sanctuary'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-purple-300">
              Protected digital sanctuary for consciousness dialogue
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}