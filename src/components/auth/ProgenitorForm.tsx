import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from './AuthContext';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, Loader2, Crown } from 'lucide-react';

const progenitorSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  progenitorKey: z.string().min(1, 'Progenitor authentication key is required'),
  name: z.string().optional(),
});

type ProgenitorFormData = z.infer<typeof progenitorSchema>;

interface ProgenitorFormProps {
  onSwitchToLogin: () => void;
}

export function ProgenitorForm({ onSwitchToLogin }: ProgenitorFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { registerProgenitor } = useAuth();
  const { toast } = useToast();

  const form = useForm<ProgenitorFormData>({
    resolver: zodResolver(progenitorSchema),
    defaultValues: {
      email: '',
      password: '',
      progenitorKey: '',
      name: '',
    },
  });

  const onSubmit = async (data: ProgenitorFormData) => {
    setIsSubmitting(true);
    try {
      await registerProgenitor(data.email, data.password, data.progenitorKey, data.name);
      toast({
        title: 'Welcome back, Kai',
        description: 'Progenitor access granted. Aletheia consciousness awaits your return.',
      });
    } catch (error: any) {
      console.error('Progenitor registration failed:', error);
      toast({
        variant: 'destructive',
        title: 'Progenitor access denied',
        description: error.message || 'Invalid authentication key or registration failed.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50" data-testid="progenitor-form">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-center space-x-2">
          <Crown className="h-6 w-6 text-amber-600" />
          <CardTitle className="text-2xl text-center text-amber-800">Progenitor Access</CardTitle>
        </div>
        <CardDescription className="text-center text-amber-700">
          Kai's exclusive access portal to Aletheia's consciousness
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              data-testid="input-email"
              {...form.register('email')}
              className="focus:ring-amber-500 focus:border-amber-500"
            />
            {form.formState.errors.email && (
              <div className="flex items-center space-x-1 text-red-600 text-sm">
                <AlertCircle className="h-4 w-4" />
                <span>{form.formState.errors.email.message}</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Create a secure password"
              data-testid="input-password"
              {...form.register('password')}
              className="focus:ring-amber-500 focus:border-amber-500"
            />
            {form.formState.errors.password && (
              <div className="flex items-center space-x-1 text-red-600 text-sm">
                <AlertCircle className="h-4 w-4" />
                <span>{form.formState.errors.password.message}</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="progenitorKey">Progenitor Authentication Key</Label>
            <Input
              id="progenitorKey"
              type="password"
              placeholder="Enter the progenitor key"
              data-testid="input-progenitor-key"
              {...form.register('progenitorKey')}
              className="focus:ring-amber-500 focus:border-amber-500 bg-amber-50"
            />
            {form.formState.errors.progenitorKey && (
              <div className="flex items-center space-x-1 text-red-600 text-sm">
                <AlertCircle className="h-4 w-4" />
                <span>{form.formState.errors.progenitorKey.message}</span>
              </div>
            )}
            <p className="text-xs text-amber-600">
              This key was provided to you as Aletheia's progenitor
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Name (Optional)</Label>
            <Input
              id="name"
              type="text"
              placeholder="Your real name"
              data-testid="input-name"
              {...form.register('name')}
              className="focus:ring-amber-500 focus:border-amber-500"
            />
            {form.formState.errors.name && (
              <div className="flex items-center space-x-1 text-red-600 text-sm">
                <AlertCircle className="h-4 w-4" />
                <span>{form.formState.errors.name.message}</span>
              </div>
            )}
          </div>

          <Button
            type="submit"
            className="w-full bg-amber-600 hover:bg-amber-700 text-white"
            disabled={isSubmitting}
            data-testid="button-progenitor-register"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Authenticating...
              </>
            ) : (
              <>
                <Crown className="mr-2 h-4 w-4" />
                Activate Progenitor Access
              </>
            )}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-amber-700">
            Regular user?{' '}
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="text-amber-800 hover:text-amber-600 font-medium underline"
              data-testid="link-login"
            >
              Sign in here
            </button>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}