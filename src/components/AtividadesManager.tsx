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
import { Plus, BookOpen, Trash2, Calendar, Users, CheckCircle, Clock, AlertCircle } from "lucide-react";

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
  created_at?: string;
}

interface AtividadesManagerProps {
  turmas: Turma[];
  atividades: Atividade[];
  setAtividades: (atividades: Atividade[]) => void;
}

const AtividadesManager = ({ turmas, atividades, setAtividades }: AtividadesManagerProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [filterTurma, setFilterTurma] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [formData, setFormData] = useState({
    titulo: "",
    descricao: "",
    data_entrega: "",
    tipo: "",
    turma_id: "",
    status: "ativa"
  });
  const { toast } = useToast();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormData({
      titulo: "",
      descricao: "",
      data_entrega: "",
      tipo: "",
      turma_id: "",
      status: "ativa"
    });
  };

  const handleCreateAtividade = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.titulo || !formData.tipo || !formData.turma_id) {
      toast({
        variant: "destructive",
        title: "Campos obrigatórios",
        description: "Por favor, preencha título, tipo e selecione uma turma.",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('atividades')
        .insert([{
          titulo: formData.titulo,
          descricao: formData.descricao || null,
          data_entrega: formData.data_entrega || null,
          tipo: formData.tipo,
          turma_id: formData.turma_id,
          status: formData.status
        }])
        .select(`
          *,
          turma:turmas(*)
        `)
        .single();

      if (error) throw error;

      setAtividades([data, ...atividades]);
      resetForm();
      setIsDialogOpen(false);
      
      toast({
        title: "Atividade criada com sucesso!",
        description: `A atividade "${data.titulo}" foi adicionada.`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao criar atividade",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAtividade = async (atividadeId: string, atividadeTitulo: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('atividades')
        .delete()
        .eq('id', atividadeId);

      if (error) throw error;

      setAtividades(atividades.filter(a => a.id !== atividadeId));
      
      toast({
        title: "Atividade excluída",
        description: `A atividade "${atividadeTitulo}" foi removida com sucesso.`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao excluir atividade",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (atividadeId: string, novoStatus: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('atividades')
        .update({ status: novoStatus })
        .eq('id', atividadeId)
        .select(`
          *,
          turma:turmas(*)
        `)
        .single();

      if (error) throw error;

      setAtividades(atividades.map(a => a.id === atividadeId ? data : a));
      
      toast({
        title: "Status atualizado",
        description: `Atividade marcada como ${novoStatus}.`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar status",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'tarefa': return 'bg-blue-500 text-white';
      case 'prova': return 'bg-red-500 text-white';
      case 'projeto': return 'bg-purple-500 text-white';
      case 'exercicio': return 'bg-green-500 text-white';
      case 'trabalho': return 'bg-orange-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ativa': return <Clock className="h-3 w-3" />;
      case 'finalizada': return <CheckCircle className="h-3 w-3" />;
      case 'cancelada': return <AlertCircle className="h-3 w-3" />;
      default: return <Clock className="h-3 w-3" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ativa': return 'bg-gradient-primary text-primary-foreground';
      case 'finalizada': return 'bg-gradient-secondary text-secondary-foreground';
      case 'cancelada': return 'bg-gray-500 text-white';
      default: return 'bg-muted';
    }
  };

  // Filtrar atividades
  const filteredAtividades = atividades.filter(atividade => {
    const matchTurma = filterTurma === "all" || atividade.turma_id === filterTurma;
    const matchStatus = filterStatus === "all" || atividade.status === filterStatus;
    return matchTurma && matchStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Gerenciar Atividades</h2>
          <p className="text-muted-foreground">
            Crie e organize atividades para suas turmas
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              className="bg-gradient-primary hover:shadow-hover transition-all duration-300"
              disabled={turmas.length === 0}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nova Atividade
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <BookOpen className="h-5 w-5 mr-2 text-primary" />
                Criar Nova Atividade
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateAtividade} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="titulo">Título da Atividade *</Label>
                <Input
                  id="titulo"
                  placeholder="Ex: Exercícios de Matemática, Redação sobre..."
                  value={formData.titulo}
                  onChange={(e) => handleInputChange('titulo', e.target.value)}
                  disabled={isLoading}
                  className="transition-all duration-200 focus:shadow-elegant"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="turma_id">Turma *</Label>
                <Select value={formData.turma_id} onValueChange={(value) => handleInputChange('turma_id', value)}>
                  <SelectTrigger className="transition-all duration-200 focus:shadow-elegant">
                    <SelectValue placeholder="Selecione a turma" />
                  </SelectTrigger>
                  <SelectContent>
                    {turmas.map((turma) => (
                      <SelectItem key={turma.id} value={turma.id}>
                        {turma.nome} - {turma.periodo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo *</Label>
                <Select value={formData.tipo} onValueChange={(value) => handleInputChange('tipo', value)}>
                  <SelectTrigger className="transition-all duration-200 focus:shadow-elegant">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tarefa">Tarefa</SelectItem>
                    <SelectItem value="prova">Prova</SelectItem>
                    <SelectItem value="projeto">Projeto</SelectItem>
                    <SelectItem value="exercicio">Exercício</SelectItem>
                    <SelectItem value="trabalho">Trabalho</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="data_entrega">Data de Entrega</Label>
                <Input
                  id="data_entrega"
                  type="date"
                  value={formData.data_entrega}
                  onChange={(e) => handleInputChange('data_entrega', e.target.value)}
                  disabled={isLoading}
                  className="transition-all duration-200 focus:shadow-elegant"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  placeholder="Descrição detalhada da atividade..."
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
                  className="flex-1 bg-gradient-primary hover:shadow-hover transition-all duration-300"
                >
                  {isLoading ? "Criando..." : "Criar Atividade"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtros */}
      {turmas.length > 0 && (
        <Card className="bg-gradient-card shadow-card">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Label htmlFor="filterTurma">Filtrar por Turma</Label>
                <Select value={filterTurma} onValueChange={setFilterTurma}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as turmas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as turmas</SelectItem>
                    {turmas.map((turma) => (
                      <SelectItem key={turma.id} value={turma.id}>
                        {turma.nome} - {turma.periodo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Label htmlFor="filterStatus">Filtrar por Status</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    <SelectItem value="ativa">Ativa</SelectItem>
                    <SelectItem value="finalizada">Finalizada</SelectItem>
                    <SelectItem value="cancelada">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de atividades */}
      <div className="space-y-4">
        {turmas.length === 0 ? (
          <Card className="bg-gradient-card shadow-card">
            <CardContent className="text-center py-12">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">Crie uma turma primeiro</h3>
              <p className="text-muted-foreground">
                Para criar atividades, você precisa ter pelo menos uma turma criada.
              </p>
            </CardContent>
          </Card>
        ) : filteredAtividades.length === 0 ? (
          <Card className="bg-gradient-card shadow-card">
            <CardContent className="text-center py-12">
              <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">Nenhuma atividade encontrada</h3>
              <p className="text-muted-foreground mb-4">
                {atividades.length === 0 
                  ? "Comece criando sua primeira atividade para uma de suas turmas." 
                  : "Ajuste os filtros ou crie uma nova atividade."
                }
              </p>
              <Button 
                onClick={() => setIsDialogOpen(true)}
                className="bg-gradient-primary hover:shadow-hover transition-all duration-300"
              >
                <Plus className="h-4 w-4 mr-2" />
                Criar Atividade
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredAtividades.map((atividade) => (
            <Card key={atividade.id} className="bg-gradient-card shadow-card hover:shadow-hover transition-all duration-300">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-2">{atividade.titulo}</CardTitle>
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <Badge className={getTipoColor(atividade.tipo)}>
                        {atividade.tipo}
                      </Badge>
                      <Badge className={getStatusColor(atividade.status)}>
                        {getStatusIcon(atividade.status)}
                        <span className="ml-1">{atividade.status}</span>
                      </Badge>
                      <Badge variant="outline">
                        <Users className="h-3 w-3 mr-1" />
                        {atividade.turma?.nome}
                      </Badge>
                      {atividade.data_entrega && (
                        <Badge variant="outline">
                          <Calendar className="h-3 w-3 mr-1" />
                          {new Date(atividade.data_entrega).toLocaleDateString('pt-BR')}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {atividade.status === 'ativa' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUpdateStatus(atividade.id, 'finalizada')}
                        disabled={isLoading}
                        className="text-green-600 hover:text-green-600 hover:bg-green-50"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    )}
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
                          <AlertDialogTitle>Excluir Atividade</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja excluir a atividade "{atividade.titulo}"? 
                            Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteAtividade(atividade.id, atividade.titulo)}
                            className="bg-destructive hover:bg-destructive/90"
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {atividade.descricao && (
                  <p className="text-sm text-muted-foreground mb-3">
                    {atividade.descricao}
                  </p>
                )}
                <div className="text-xs text-muted-foreground">
                  Criada em {new Date(atividade.created_at || '').toLocaleDateString('pt-BR')}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default AtividadesManager;