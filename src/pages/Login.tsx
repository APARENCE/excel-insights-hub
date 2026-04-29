"use client";

import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { Container } from 'lucide-react';
import { useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';

export default function Login() {
  const { session } = useAuth();

  useEffect(() => {
    if (session) {
      // Usamos redirecionamento direto para garantir compatibilidade 
      // entre TanStack Router (Editor) e React Router (Vercel)
      window.location.href = '/';
    }
  }, [session]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8 bg-card p-8 rounded-xl border border-border shadow-sm">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Container className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Operação Spot Renault</h1>
          <p className="text-muted-foreground mt-2">Terminal TLOG - SJP</p>
        </div>

        <Auth
          supabaseClient={supabase}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: 'oklch(0.55 0.18 260)',
                  brandAccent: 'oklch(0.65 0.2 260)',
                },
              },
            },
          }}
          providers={[]}
          localization={{
            variables: {
              sign_in: {
                email_label: 'E-mail',
                password_label: 'Senha',
                button_label: 'Entrar',
                loading_button_label: 'Entrando...',
                social_provider_text: 'Entrar com {{provider}}',
                link_text: 'Já tem uma conta? Entre',
              },
              sign_up: {
                email_label: 'E-mail',
                password_label: 'Senha',
                button_label: 'Cadastrar',
                loading_button_label: 'Cadastrando...',
                link_text: 'Não tem uma conta? Cadastre-se',
              },
            },
          }}
          theme="light"
        />
      </div>
    </div>
  );
}