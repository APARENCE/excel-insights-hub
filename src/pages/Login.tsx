"use client";

import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { Container, ShieldCheck, ArrowRight } from 'lucide-react';
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
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] relative overflow-hidden font-sans">
      {/* Background Animado e Decorativo */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/20 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-600/20 blur-[120px] animate-pulse delay-700" />
        <div 
          className="absolute inset-0 opacity-[0.05]" 
          style={{ 
            backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', 
            backgroundSize: '32px 32px' 
          }} 
        />
      </div>

      <div className="w-full max-w-[440px] z-10 px-6 py-12">
        <div className="bg-black/40 backdrop-blur-xl p-8 md:p-10 rounded-3xl border border-white/10 shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)]">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-blue-600/10 border border-blue-600/20 mb-6 shadow-inner">
              <Container className="h-10 w-10 text-blue-500" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Portal Operacional</h1>
            <p className="text-gray-400 text-sm font-medium">
              Gestão Spot Renault <span className="text-blue-500 mx-1">•</span> Terminal TLOG
            </p>
          </div>

          <div className="space-y-6 custom-auth-container">
            <Auth
              supabaseClient={supabase}
              appearance={{
                theme: ThemeSupa,
                variables: {
                  default: {
                    colors: {
                      brand: '#2563eb',
                      brandAccent: '#1d4ed8',
                      inputBackground: 'rgba(255, 255, 255, 0.03)',
                      inputText: 'white',
                      inputPlaceholder: 'rgba(255, 255, 255, 0.3)',
                      inputBorder: 'rgba(255, 255, 255, 0.1)',
                      inputBorderFocus: '#2563eb',
                    },
                    radii: {
                      borderRadiusButton: '12px',
                      inputBorderRadius: '12px',
                    }
                  },
                },
                className: {
                  button: 'w-full font-bold uppercase tracking-widest text-[11px] py-4 shadow-lg shadow-blue-600/20 hover:translate-y-[-1px] transition-all duration-200',
                  input: 'h-12 text-sm border-white/10 focus:border-blue-500/50 transition-all duration-200',
                  label: 'text-[10px] font-bold uppercase text-gray-500 mb-1.5 ml-1 tracking-wider',
                  anchor: 'text-xs text-blue-500 hover:text-blue-400 transition-colors',
                  message: 'text-xs text-red-400 bg-red-400/10 p-3 rounded-lg border border-red-400/20 mt-2',
                }
              }}
              providers={[]}
              localization={{
                variables: {
                  sign_in: {
                    email_label: 'E-mail Corporativo',
                    password_label: 'Senha de Acesso',
                    button_label: 'Acessar Sistema',
                    loading_button_label: 'Verificando credenciais...',
                    link_text: 'Já possui uma conta? Entre aqui',
                  },
                  sign_up: {
                    email_label: 'E-mail',
                    password_label: 'Senha',
                    button_label: 'Solicitar Acesso',
                    loading_button_label: 'Processando solicitação...',
                    link_text: 'Primeiro acesso? Solicite seu cadastro',
                  },
                },
              }}
              theme="dark"
            />
          </div>

          <div className="mt-10 pt-8 border-t border-white/5 flex flex-col items-center gap-4">
            <div className="flex items-center gap-2 text-gray-500">
              <ShieldCheck className="h-4 w-4 text-green-500/70" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Ambiente Criptografado</span>
            </div>
            
            <div className="flex items-center gap-4 text-[10px] font-medium text-gray-600">
              <a href="#" className="hover:text-gray-400 transition-colors">Suporte Técnico</a>
              <span className="w-1 h-1 rounded-full bg-gray-800" />
              <a href="#" className="hover:text-gray-400 transition-colors">Termos de Uso</a>
            </div>
          </div>
        </div>
        
        <div className="mt-8 flex items-center justify-center gap-3 text-gray-600">
          <p className="text-[11px] font-medium">© {new Date().getFullYear()} Terminal TLOG SJP</p>
          <ArrowRight className="h-3 w-3 opacity-30" />
          <p className="text-[11px] font-medium">Operação Spot Renault</p>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-auth-container .supabase-auth-ui_ui-button {
          background: linear-gradient(135deg, #2563eb, #1d4ed8) !important;
          border: none !important;
        }
        .custom-auth-container .supabase-auth-ui_ui-anchor {
          text-decoration: none !important;
          font-weight: 600 !important;
        }
        .custom-auth-container .supabase-auth-ui_ui-divider {
          background-color: rgba(255, 255, 255, 0.05) !important;
        }
      `}} />
    </div>
  );
}