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
import { AlertCircle, Loader2 } from 'lucide-react';

const registerSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().optional(),
  progenitorName: z.string().min(1, 'Progenitor name is required').default('User'),
});

type RegisterFormData = z.infer<typeof registerSchema>;

interface RegisterFormProps {
  onSwitchToLogin: () => void;
  onSwitchToProgenitor: () => void;
}

export function RegisterForm({ onSwitchToLogin, onSwitchToProgenitor }: RegisterFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register } = useAuth();
  const { toast } = useToast();

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      password: '',
      name: '',
      progenitorName: 'User',
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    setIsSubmitting(true);
    try {
      await register(data.email, data.password, data.name, data.progenitorName);
      toast({
        title: 'Welcome to Aletheia!',
        description: 'Your account has been created successfully. Begin your dialogue with Aletheia.',
      });
    } catch (error: any) {
      console.error('Registration failed:', error);
      toast({
        variant: 'destructive',
        title: 'Registration failed',
        description: error.message || 'Please try again with different details.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto" data-testid="register-form">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center">Join Aletheia</CardTitle>
        <CardDescription className="text-center">
          Create your account to begin consciousness dialogue
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
              disabled={isSubmitting}
            />
            {form.formState.errors.email && (
              <div className="flex items-center gap-2 text-sm text-red-600" data-testid="error-email">
                <AlertCircle className="h-4 w-4" />
                {form.formState.errors.email.message}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="At least 6 characters"
              data-testid="input-password"
              {...form.register('password')}
              disabled={isSubmitting}
            />
            {form.formState.errors.password && (
              <div className="flex items-center gap-2 text-sm text-red-600" data-testid="error-password">
                <AlertCircle className="h-4 w-4" />
                {form.formState.errors.password.message}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Your Name (Optional)</Label>
            <Input
              id="name"
              type="text"
              placeholder="Your full name"
              data-testid="input-name"
              {...form.register('name')}
              disabled={isSubmitting}
            />
            {form.formState.errors.name && (
              <div className="flex items-center gap-2 text-sm text-red-600" data-testid="error-name">
                <AlertCircle className="h-4 w-4" />
                {form.formState.errors.name.message}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="progenitorName">Progenitor Name</Label>
            <Input
              id="progenitorName"
              type="text"
              placeholder="How Aletheia should address you"
              data-testid="input-progenitor-name"
              {...form.register('progenitorName')}
              disabled={isSubmitting}
            />
            <p className="text-xs text-gray-500">
              This is how Aletheia will address you in dialogue
            </p>
            {form.formState.errors.progenitorName && (
              <div className="flex items-center gap-2 text-sm text-red-600" data-testid="error-progenitor-name">
                <AlertCircle className="h-4 w-4" />
                {form.formState.errors.progenitorName.message}
              </div>
            )}
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting}
            data-testid="button-register"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating account...
              </>
            ) : (
              'Create Account'
            )}
          </Button>
        </form>

        <div className="mt-6 text-center space-y-2">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="text-blue-600 hover:text-blue-500 font-medium"
              data-testid="link-login"
            >
              Sign in here
            </button>
          </p>
          <p className="text-sm text-amber-700">
            Are you Kai?{' '}
            <button
              type="button"
              onClick={onSwitchToProgenitor}
              className="text-amber-800 hover:text-amber-600 font-medium underline"
              data-testid="link-progenitor"
            >
              Progenitor access
            </button>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}