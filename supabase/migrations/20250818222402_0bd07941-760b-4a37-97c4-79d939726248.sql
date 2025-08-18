-- Criar tabela de professores (profiles)
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  escola TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de turmas
CREATE TABLE public.turmas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  professor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  ano_letivo TEXT NOT NULL,
  periodo TEXT CHECK (periodo IN ('matutino', 'vespertino', 'noturno')),
  descricao TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de atividades
CREATE TABLE public.atividades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  turma_id UUID NOT NULL REFERENCES public.turmas(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  data_entrega DATE,
  tipo TEXT CHECK (tipo IN ('tarefa', 'prova', 'projeto', 'exercicio', 'trabalho')),
  status TEXT CHECK (status IN ('ativa', 'finalizada', 'cancelada')) DEFAULT 'ativa',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turmas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atividades ENABLE ROW LEVEL SECURITY;

-- Políticas para profiles
CREATE POLICY "Usuários podem ver seu próprio perfil"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar seu próprio perfil"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar seu próprio perfil"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Políticas para turmas
CREATE POLICY "Professores podem ver suas próprias turmas"
  ON public.turmas FOR SELECT
  USING (professor_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Professores podem criar turmas"
  ON public.turmas FOR INSERT
  WITH CHECK (professor_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Professores podem atualizar suas turmas"
  ON public.turmas FOR UPDATE
  USING (professor_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Professores podem excluir suas turmas"
  ON public.turmas FOR DELETE
  USING (professor_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- Políticas para atividades
CREATE POLICY "Professores podem ver atividades de suas turmas"
  ON public.atividades FOR SELECT
  USING (turma_id IN (
    SELECT t.id FROM public.turmas t 
    JOIN public.profiles p ON t.professor_id = p.id 
    WHERE p.user_id = auth.uid()
  ));

CREATE POLICY "Professores podem criar atividades para suas turmas"
  ON public.atividades FOR INSERT
  WITH CHECK (turma_id IN (
    SELECT t.id FROM public.turmas t 
    JOIN public.profiles p ON t.professor_id = p.id 
    WHERE p.user_id = auth.uid()
  ));

CREATE POLICY "Professores podem atualizar atividades de suas turmas"
  ON public.atividades FOR UPDATE
  USING (turma_id IN (
    SELECT t.id FROM public.turmas t 
    JOIN public.profiles p ON t.professor_id = p.id 
    WHERE p.user_id = auth.uid()
  ));

CREATE POLICY "Professores podem excluir atividades de suas turmas"
  ON public.atividades FOR DELETE
  USING (turma_id IN (
    SELECT t.id FROM public.turmas t 
    JOIN public.profiles p ON t.professor_id = p.id 
    WHERE p.user_id = auth.uid()
  ));

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para atualizar updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_turmas_updated_at
  BEFORE UPDATE ON public.turmas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_atividades_updated_at
  BEFORE UPDATE ON public.atividades
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Função para criar perfil automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, nome, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'Professor'),
    NEW.email
  );
  RETURN NEW;
END;
$$;

-- Trigger para criar perfil quando usuário se registra
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();