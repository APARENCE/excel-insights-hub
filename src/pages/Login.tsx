"use client";

import { supabase } from "@/integrations/supabase/client";
import { Container, ShieldCheck, ArrowRight } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";

const ALLOWED_EMAILS = ["patiotlog@outlook.com", "renaultdobrasil.com@outlook.com"];

export default function Login() {
  const { session } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (session) {
      window.location.href = "/";
    }
  }, [session]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);

    const lowerEmail = email.toLowerCase().trim();

    if (!ALLOWED_EMAILS.includes(lowerEmail)) {
      setMessage("Este e-mail não possui autorização de acesso ao sistema.");
      setSubmitting(false);
      return;
    }

    const authAction = isSignUp
      ? supabase.auth.signUp({
          email: lowerEmail,
          password,
          options: { emailRedirectTo: window.location.origin },
        })
      : supabase.auth.signInWithPassword({ email: lowerEmail, password });

    const { error } = await authAction;
    setSubmitting(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    if (isSignUp) {
      setMessage("Cadastro solicitado. Verifique seu e-mail para confirmar o acesso.");
      return;
    }

    window.location.href = "/";
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] relative overflow-hidden font-sans">
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/20 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-600/20 blur-[120px] animate-pulse delay-700" />
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
            backgroundSize: "32px 32px",
          }}
        />
      </div>

      <div className="w-full max-w-[440px] z-10 px-6 py-12">
        <div className="bg-black/40 backdrop-blur-xl p-8 md:p-10 rounded-3xl border border-white/10 shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)]">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-blue-600/10 border border-blue-600/20 mb-6 shadow-inner">
              <Container className="h-10 w-10 text-blue-500" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
              Portal Operacional
            </h1>
            <p className="text-gray-400 text-sm font-medium">
              Gestão Spot Renault <span className="text-blue-500 mx-1">•</span> Terminal TLOG
            </p>
          </div>

          <div className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="text-[10px] font-bold uppercase text-gray-500 mb-1.5 ml-1 tracking-wider block"
                >
                  E-mail Corporativo
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  autoComplete="email"
                  className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 text-sm text-white outline-none transition-all placeholder:text-white/30 focus:border-blue-500/50"
                  placeholder="seu.email@empresa.com"
                />
              </div>
              <div>
                <label
                  htmlFor="password"
                  className="text-[10px] font-bold uppercase text-gray-500 mb-1.5 ml-1 tracking-wider block"
                >
                  Senha de Acesso
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength={6}
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                  className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 text-sm text-white outline-none transition-all placeholder:text-white/30 focus:border-blue-500/50"
                  placeholder="Digite sua senha"
                />
              </div>
              {message && (
                <div className="rounded-lg border border-red-400/20 bg-red-400/10 p-3 text-xs text-red-400">
                  {message}
                </div>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-blue-600 py-4 text-[11px] font-bold uppercase tracking-widest text-white shadow-lg shadow-blue-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting
                  ? "Verificando credenciais..."
                  : isSignUp
                    ? "Solicitar Acesso"
                    : "Acessar Sistema"}
              </button>
            </form>
            <button
              type="button"
              onClick={() => {
                setIsSignUp((value) => !value);
                setMessage(null);
              }}
              className="w-full text-center text-xs font-semibold text-blue-500 transition-colors hover:text-blue-400"
            >
              {isSignUp
                ? "Já possui uma conta? Entre aqui"
                : "Primeiro acesso? Solicite seu cadastro"}
            </button>
          </div>

          <div className="mt-10 pt-8 border-t border-white/5 flex flex-col items-center gap-4">
            <div className="flex items-center gap-2 text-gray-500">
              <ShieldCheck className="h-4 w-4 text-green-500/70" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em]">
                Ambiente Criptografado
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}