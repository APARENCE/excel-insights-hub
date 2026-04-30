"use client";

import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { Container, ShieldCheck } from 'lucide-react';
import { useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';

export default function Login() {
  const { session } = useAuth();

  useEffect(() => {
    if (session) {
      window.location.href = '/';
    }
  }, [session]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      {/* Background Decorativo */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-linear-to-br from-primary/5 via-background to-info/5" />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, var(--color-primary) 1px, transparent 0)', backgroundSize: '24px 24px' }} />
      </div>

      <div className="w-full max-w-md z-10 px-4">
        <div className="bg-card p-8 rounded-2xl border border-border shadow-xl backdrop-blur-sm">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4 rotate-3 hover:rotate-0 transition-transform duration-300">
              <Container className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Operação Spot Renault</h1>
            <p className="text-muted-foreground text-sm mt-1">Terminal TLOG — São José dos Pinhais</p>
          </div>

          <div className="space-y-6">
            <Auth
              supabaseClient={supabase}
              appearance={{
                theme: ThemeSupa,
                variables: {
                  default: {
                    colors: {
                      brand: 'oklch(0.55 0.18 260)',
                      brandAccent: 'oklch(0.65 0.2 260)',
                      inputBackground: 'transparent',
                      inputText: 'inherit',
                      inputPlaceholder: 'oklch(0.5 0.02 255)',
                    },
                    radii: {
                      buttonRadius: '0.75rem',
                      inputRadius: '0.75rem',
                    }
                  },
                },
                className: {
                  button: 'font-bold uppercase tracking-wider text-xs py-3',
                  input: 'bg-background border-border focus:ring-2 focus:ring-primary/20 transition-all',
                  label: 'text-[10px] font-bold uppercase text-muted-foreground mb-1 ml-1',
                }
              }}
              providers={[]}
              localization={{
                variables: {
                  sign_in: {
                    email_label: 'E-mail Corporativo',
                    password_label: 'Senha de Acesso',
                    button_label: 'Entrar no Sistema',
                    loading_button_label: 'Autenticando...',
                    link_text: 'Já possui acesso? Entre aqui',
                  },
                  sign_up: {
                    email_label: 'E-mail',
                    password_label: 'Senha',
                    button_label: 'Solicitar Cadastro',
                    loading_button_label: 'Processando...',
                    link_text: 'Novo por aqui? Crie sua conta',
                  },
                },
              }}
              theme="light"
            />
          </div>

          <div className="mt-8 pt-6 border-t border-border flex items-center justify-center gap-2 text-muted-foreground">
            <ShieldCheck className="h-4 w-4" />
            <span className="text-[10px] font-medium uppercase tracking-widest">Acesso Restrito e Seguro</span>
          </div>
        </div>
        
        <p className="text-center text-[11px] text-muted-foreground/60 mt-6">
          © {new Date().getFullYear()} Terminal TLOG. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}