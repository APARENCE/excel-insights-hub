-- =========================================================================
-- SCRIPT DE CONFIGURAÇÃO COMPLETO DO BANCO DE DADOS (TLOG & AUTH PROFILES)
-- Copie todo este conteúdo e execute no SQL Editor do seu painel do Supabase
-- =========================================================================

-- 1. Tabela de Perfis de Usuário (Vinculada ao Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- 2. Tabela de Containers Cheios
CREATE TABLE IF NOT EXISTS public.containers_cheios (
  conteiner TEXT PRIMARY KEY,
  lacre TEXT,
  tipo TEXT,
  armador TEXT,
  navio TEXT,
  data_chegada TIMESTAMP WITH TIME ZONE,
  dias_no_patio INTEGER,
  free_time INTEGER,
  demurrage_vencimento TIMESTAMP WITH TIME ZONE,
  dias_para_vencimento INTEGER,
  status TEXT,
  fabrica TEXT,
  data_envio_fabrica TIMESTAMP WITH TIME ZONE,
  conteiner_de_para TEXT,
  data_devolucao_vazio TIMESTAMP WITH TIME ZONE,
  coluna_as TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabela de Vazios Locados
CREATE TABLE IF NOT EXISTS public.vazios_locados (
  conteiner TEXT PRIMARY KEY,
  armador TEXT,
  tipo TEXT,
  data_entrada TIMESTAMP WITH TIME ZONE,
  data_de_para TIMESTAMP WITH TIME ZONE,
  cheio_de_para TEXT,
  status_uso TEXT,
  status_patio TEXT,
  dias_no_patio INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tabela de Vazio Ingesys
CREATE TABLE IF NOT EXISTS public.vazio_ingesys (
  conteiner TEXT PRIMARY KEY,
  status_d TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Tabela de Vazios Locados Renault
CREATE TABLE IF NOT EXISTS public.vazios_locados_renault (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conteiner TEXT UNIQUE,
  coluna_d TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Tabela de Vazios Locados Tlog
CREATE TABLE IF NOT EXISTS public.vazios_locados_tlog (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conteiner TEXT UNIQUE,
  coluna_d TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Tabela de Vazios Armadores
CREATE TABLE IF NOT EXISTS public.vazios_armadores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conteiner TEXT UNIQUE,
  coluna_d TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Tabela de Histórico de Importações
CREATE TABLE IF NOT EXISTS public.import_history (
  id UUID PRIMARY KEY,
  file_name TEXT,
  imported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  item_count INTEGER,
  status TEXT
);

-- 9. Tabela de Solicitações de Prioridade
CREATE TABLE IF NOT EXISTS public.priority_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conteiner TEXT,
  nivel TEXT,
  status TEXT,
  solicitado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  fabrica_destino TEXT,
  previsao_fabrica TIMESTAMP WITH TIME ZONE,
  observacao TEXT
);

-- 10. Tabela de Configurações do Sistema
CREATE TABLE IF NOT EXISTS public.app_settings (
  id UUID DEFAULT '00000000-0000-0000-0000-000000000000'::UUID PRIMARY KEY,
  capacidade_patio INTEGER DEFAULT 600
);

-- Inserir configuração padrão inicial se não existir
INSERT INTO public.app_settings (id, capacidade_patio)
VALUES ('00000000-0000-0000-0000-000000000000'::UUID, 600)
ON CONFLICT (id) DO NOTHING;


-- ==========================================
-- HABILITAR ROW LEVEL SECURITY (RLS)
-- ==========================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.containers_cheios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vazios_locados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vazio_ingesys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vazios_locados_renault ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vazios_locados_tlog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vazios_armadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.priority_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;


-- ==========================================
-- CONCEDER PERMISSÕES (GRANTS)
-- ==========================================
GRANT SELECT, UPDATE ON TABLE public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.profiles TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO service_role;


-- ==========================================
-- CRIAR POLÍTICAS DE SEGURANÇA (RLS POLICIES)
-- ==========================================

-- Políticas para profiles
CREATE POLICY "profiles_select_policy" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_insert_policy" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_policy" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_delete_policy" ON public.profiles FOR DELETE TO authenticated USING (auth.uid() = id);

-- Políticas para containers_cheios
CREATE POLICY "Permitir tudo para usuários autenticados" ON public.containers_cheios FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Políticas para vazios_locados
CREATE POLICY "Permitir tudo para usuários autenticados" ON public.vazios_locados FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Políticas para vazio_ingesys
CREATE POLICY "Permitir tudo para usuários autenticados" ON public.vazio_ingesys FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Políticas para vazios_locados_renault
CREATE POLICY "Permitir tudo para usuários autenticados" ON public.vazios_locados_renault FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Políticas para vazios_locados_tlog
CREATE POLICY "Permitir tudo para usuários autenticados" ON public.vazios_locados_tlog FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Políticas para vazios_armadores
CREATE POLICY "Permitir tudo para usuários autenticados" ON public.vazios_armadores FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Políticas para import_history
CREATE POLICY "Permitir tudo para usuários autenticados" ON public.import_history FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Políticas para priority_requests
CREATE POLICY "Permitir tudo para usuários autenticados" ON public.priority_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Políticas para app_settings
CREATE POLICY "Permitir tudo para usuários autenticados" ON public.app_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- ==========================================
-- TRIGGER PARA AUTO-CRIAR PERFIL NO SIGNUP
-- ==========================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name)
  VALUES (
    new.id,
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name'
  );
  RETURN new;
END;
$$;

-- Ativa o gatilho na criação de usuários
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();