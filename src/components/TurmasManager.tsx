import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Users, Trash2, Calendar, Clock } from "lucide-react";

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

interface TurmasManagerProps {
  profile: Profile;
  turmas: Turma[];
  setTurmas: (turmas: Turma[]) => void;
  setAtividades: (atividades: any[]) => void;
}

const TurmasManager = ({ profile, turmas, setTurmas, setAtividades }: TurmasManagerProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: "",
    ano_letivo: new Date().getFullYear().toString(),
    periodo: "",
    descricao: ""
  });
  const { toast } = useToast();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormData({
      nome: "",
      ano_letivo: new Date().getFullYear().toString(),
      periodo: "",
      descricao: ""
    });
  };

  const handleCreateTurma = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome || !formData.periodo) {
      toast({
        variant: "destructive",
        title: "Campos obrigatórios",
        description: "Por favor, preencha nome da turma e período.",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('turmas')
        .insert([{
          professor_id: profile.id,
          nome: formData.nome,
          ano_letivo: formData.ano_letivo,
          periodo: formData.periodo,
          descricao: formData.descricao || null
        }])
        .select()
        .single();

      if (error) throw error;

      setTurmas([data, ...turmas]);
      resetForm();
      setIsDialogOpen(false);
      
      toast({
        title: "Turma criada com sucesso!",
        description: `A turma "${data.nome}" foi adicionada.`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao criar turma",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTurma = async (turmaId: string, turmaNome: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('turmas')
        .delete()
        .eq('id', turmaId);

      if (error) throw error;

      setTurmas(turmas.filter(t => t.id !== turmaId));
      
      // Atualizar atividades (remover as da turma excluída)
      const { data: atividadesRestantes } = await supabase
        .from('atividades')
        .select(`
          *,
          turma:turmas(*)
        `)
        .in('turma_id', turmas.filter(t => t.id !== turmaId).map(t => t.id));
      
      setAtividades(atividadesRestantes || []);
      
      toast({
        title: "Turma excluída",
        description: `A turma "${turmaNome}" foi removida com sucesso.`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao excluir turma",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getPeriodoColor = (periodo: string) => {
    switch (periodo) {
      case 'matutino': return 'bg-gradient-primary text-primary-foreground';
      case 'vespertino': return 'bg-gradient-secondary text-secondary-foreground';
      case 'noturno': return 'bg-gray-600 text-white';
      default: return 'bg-muted';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Gerenciar Turmas</h2>
          <p className="text-muted-foreground">
            Crie e organize suas turmas escolares
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-secondary hover:shadow-hover transition-all duration-300">
              <Plus className="h-4 w-4 mr-2" />
              Nova Turma
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2 text-secondary" />
                Criar Nova Turma
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateTurma} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome da Turma *</Label>
                <Input
                  id="nome"
                  placeholder="Ex: 5º Ano A, Ensino Médio 1º"
                  value={formData.nome}
                  onChange={(e) => handleInputChange('nome', e.target.value)}
                  disabled={isLoading}
                  className="transition-all duration-200 focus:shadow-elegant"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="ano_letivo">Ano Letivo</Label>
                <Input
                  id="ano_letivo"
                  placeholder="2024"
                  value={formData.ano_letivo}
                  onChange={(e) => handleInputChange('ano_letivo', e.target.value)}
                  disabled={isLoading}
                  className="transition-all duration-200 focus:shadow-elegant"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="periodo">Período *</Label>
                <Select value={formData.periodo} onValueChange={(value) => handleInputChange('periodo', value)}>
                  <SelectTrigger className="transition-all duration-200 focus:shadow-elegant">
                    <SelectValue placeholder="Selecione o período" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="matutino">Matutino</SelectItem>
                    <SelectItem value="vespertino">Vespertino</SelectItem>
                    <SelectItem value="noturno">Noturno</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  placeholder="Descrição opcional da turma..."
                  value={formData.descricao}
                  onChange={(e) => handleInputChange('descricao', e.target.value)}
                  disabled={isLoading}
                  className="transition-all duration-200 focus:shadow-elegant resize-none"
                  rows={3}
                />
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  disabled={isLoading}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 bg-gradient-secondary hover:shadow-hover transition-all duration-300"
                >
                  {isLoading ? "Criando..." : "Criar Turma"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista de turmas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {turmas.length === 0 ? (
          <Card className="col-span-full bg-gradient-card shadow-card">
            <CardContent className="text-center py-12">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">Nenhuma turma criada</h3>
              <p className="text-muted-foreground mb-4">
                Comece criando sua primeira turma para organizar suas atividades.
              </p>
              <Button 
                onClick={() => setIsDialogOpen(true)}
                className="bg-gradient-secondary hover:shadow-hover transition-all duration-300"
              >
                <Plus className="h-4 w-4 mr-2" />
                Criar Primera Turma
              </Button>
            </CardContent>
          </Card>
        ) : (
          turmas.map((turma) => (
            <Card key={turma.id} className="bg-gradient-card shadow-card hover:shadow-hover transition-all duration-300">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-2">{turma.nome}</CardTitle>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={getPeriodoColor(turma.periodo)}>
                        <Clock className="h-3 w-3 mr-1" />
                        {turma.periodo}
                      </Badge>
                      <Badge variant="outline">
                        <Calendar className="h-3 w-3 mr-1" />
                        {turma.ano_letivo}
                      </Badge>
                    </div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        disabled={isLoading}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir Turma</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja excluir a turma "{turma.nome}"? 
                          Esta ação também removerá todas as atividades associadas e não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteTurma(turma.id, turma.nome)}
                          className="bg-destructive hover:bg-destructive/90"
                        >
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardHeader>
              <CardContent>
                {turma.descricao && (
                  <p className="text-sm text-muted-foreground mb-3">
                    {turma.descricao}
                  </p>
                )}
                <div className="text-xs text-muted-foreground">
                  Criada em {new Date(turma.created_at).toLocaleDateString('pt-BR')}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default TurmasManager;