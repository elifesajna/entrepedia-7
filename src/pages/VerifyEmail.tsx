import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get('token');
      
      if (!token) {
        setStatus('error');
        setMessage('No verification token provided');
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke('verify-email', {
          body: { token }
        });

        if (error || data?.error) {
          setStatus('error');
          setMessage(data?.error || error?.message || 'Verification failed');
          return;
        }

        setStatus('success');
        setMessage('Your email has been verified successfully! You now have a verified profile badge.');
        await refreshProfile();
      } catch (err: any) {
        setStatus('error');
        setMessage(err.message || 'An error occurred during verification');
      }
    };

    verifyEmail();
  }, [searchParams, refreshProfile]);

  return (
    <MainLayout>
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <Card className="w-full max-w-md border-0 shadow-soft">
          <CardHeader className="text-center">
            {status === 'loading' && (
              <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto mb-4" />
            )}
            {status === 'success' && (
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            )}
            {status === 'error' && (
              <XCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
            )}
            <CardTitle className="text-2xl">
              {status === 'loading' && 'Verifying Email...'}
              {status === 'success' && 'Email Verified!'}
              {status === 'error' && 'Verification Failed'}
            </CardTitle>
            <CardDescription className="text-base mt-2">
              {message}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button 
              onClick={() => navigate('/settings')} 
              className="gradient-primary text-white"
            >
              Go to Settings
            </Button>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
