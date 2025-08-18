import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  GraduationCap, 
  Users, 
  BookOpen, 
  Plus, 
  LogOut,
  Calendar,
  ClipboardList
} from "lucide-react";
import TurmasManager from "./TurmasManager";
import AtividadesManager from "./AtividadesManager";

interface Profile {
  id: string;
  nome: string;
  email: string;
  escola?: string;
}

interface Turma {
  id: string;
  nome: string;
  ano_letivo: string;
  periodo: string;
  descricao?: string;
  created_at: string;
}

interface Atividade {
  id: string;
  titulo: string;
  descricao?: string;
  data_entrega?: string;
  tipo: string;
  status: string;
  turma_id: string;
  turma: Turma;
}

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const { toast } = useToast();

  useEffect(() => {
    // Configurar listener de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (event === 'SIGNED_IN' && session?.user) {
          setTimeout(() => {
            loadUserData(session.user.id);
          }, 0);
        }
      }
    );

    // Verificar sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        loadUserData(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUserData = async (userId: string) => {
    try {
      // Carregar perfil
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError) {
        console.error('Erro ao carregar perfil:', profileError);
        setIsLoading(false);
        return;
      }

      setProfile(profileData);

      // Carregar turmas
      const { data: turmasData, error: turmasError } = await supabase
        .from('turmas')
        .select('*')
        .eq('professor_id', profileData.id)
        .order('created_at', { ascending: false });

      if (turmasError) {
        console.error('Erro ao carregar turmas:', turmasError);
      } else {
        setTurmas(turmasData || []);
      }

      // Carregar atividades
      const { data: atividadesData, error: atividadesError } = await supabase
        .from('atividades')
        .select(`
          *,
          turma:turmas(*)
        `)
        .in('turma_id', (turmasData || []).map(t => t.id))
        .order('created_at', { ascending: false });

      if (atividadesError) {
        console.error('Erro ao carregar atividades:', atividadesError);
      } else {
        setAtividades(atividadesData || []);
      }

    } catch (error) {
      console.error('Erro geral:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao carregar dados do usuário",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error) throw error;
      
      // Limpar estado local
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
          localStorage.removeItem(key);
        }
      });
      
      window.location.href = '/auth';
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao sair",
        description: error.message,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="text-center p-6">
            <p className="text-muted-foreground mb-4">Você não está autenticado</p>
            <Button onClick={() => window.location.href = '/auth'}>
              Fazer Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const atividadesPendentes = atividades.filter(a => a.status === 'ativa').length;
  const turmasAtivas = turmas.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b shadow-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center shadow-hover">
              <GraduationCap className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Professor Aid</h1>
              <p className="text-sm text-muted-foreground">
                Bem-vindo, {profile.nome}
              </p>
            </div>
          </div>
          <Button 
            variant="outline" 
            onClick={handleSignOut}
            className="hover:shadow-elegant transition-all duration-200"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-fit lg:flex">
            <TabsTrigger value="overview" className="data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground">
              <ClipboardList className="h-4 w-4 mr-2" />
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="turmas" className="data-[state=active]:bg-gradient-secondary data-[state=active]:text-secondary-foreground">
              <Users className="h-4 w-4 mr-2" />
              Turmas
            </TabsTrigger>
            <TabsTrigger value="atividades" className="data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground">
              <BookOpen className="h-4 w-4 mr-2" />
              Atividades
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Cards de estatísticas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="bg-gradient-card shadow-card hover:shadow-hover transition-all duration-300">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total de Turmas</CardTitle>
                  <Users className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">{turmasAtivas}</div>
                  <p className="text-xs text-muted-foreground">
                    {turmasAtivas === 1 ? 'turma ativa' : 'turmas ativas'}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-card shadow-card hover:shadow-hover transition-all duration-300">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Atividades Pendentes</CardTitle>
                  <BookOpen className="h-4 w-4 text-warning" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-warning">{atividadesPendentes}</div>
                  <p className="text-xs text-muted-foreground">
                    {atividadesPendentes === 1 ? 'atividade pendente' : 'atividades pendentes'}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-card shadow-card hover:shadow-hover transition-all duration-300">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total de Atividades</CardTitle>
                  <Calendar className="h-4 w-4 text-secondary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-secondary">{atividades.length}</div>
                  <p className="text-xs text-muted-foreground">
                    {atividades.length === 1 ? 'atividade criada' : 'atividades criadas'}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Atividades recentes */}
            <Card className="bg-gradient-card shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BookOpen className="h-5 w-5 mr-2 text-primary" />
                  Atividades Recentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {atividades.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhuma atividade criada ainda</p>
                    <p className="text-sm">Crie sua primeira atividade na aba "Atividades"</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {atividades.slice(0, 5).map((atividade) => (
                      <div key={atividade.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex-1">
                          <p className="font-medium">{atividade.titulo}</p>
                          <p className="text-sm text-muted-foreground">
                            {atividade.turma?.nome} • {atividade.tipo}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge 
                            variant={atividade.status === 'ativa' ? 'default' : 'secondary'}
                            className={atividade.status === 'ativa' ? 'bg-gradient-primary' : ''}
                          >
                            {atividade.status}
                          </Badge>
                          {atividade.data_entrega && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(atividade.data_entrega).toLocaleDateString('pt-BR')}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="turmas">
            <TurmasManager 
              profile={profile} 
              turmas={turmas} 
              setTurmas={setTurmas}
              setAtividades={setAtividades}
            />
          </TabsContent>

          <TabsContent value="atividades">
            <AtividadesManager 
              turmas={turmas}
              atividades={atividades}
              setAtividades={setAtividades}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;