import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API } from "@/App";
import { Sun, LogOut, Users, DollarSign, TrendingUp, Filter, Search, Plus, X, Edit, Trash2, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("leads");
  const [leads, setLeads] = useState([]);
  const [statusTypes, setStatusTypes] = useState([]);
  const [tarifas, setTarifas] = useState([]);
  const [config, setConfig] = useState({ valor_kwp: 3500 });
  const [stats, setStats] = useState({ total_leads: 0, total_valor: 0, status_counts: [] });
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Filters
  const [filters, setFilters] = useState({
    nome: "",
    status: "",
    estado: "",
    cidade: "",
    valor_min: "",
    valor_max: "",
    data_inicio: "",
    data_fim: ""
  });
  
  // Modals
  const [showLeadDetails, setShowLeadDetails] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [showStatusForm, setShowStatusForm] = useState(false);
  const [showTarifaForm, setShowTarifaForm] = useState(false);
  const [showConfigForm, setShowConfigForm] = useState(false);
  
  // Forms
  const [statusForm, setStatusForm] = useState({ nome: "", cor: "#3B82F6", ordem: 0 });
  const [tarifaForm, setTarifaForm] = useState({ tarifa_id: "", estado: "", concessionaria: "", valor_kwh: 0 });
  const [configForm, setConfigForm] = useState({ valor_kwp: 3500 });

  useEffect(() => {
    loadData();
  }, [activeTab, currentPage, filters]);

  const loadData = async () => {
    try {
      if (activeTab === "leads") {
        await loadLeads();
        await loadStats();
      } else if (activeTab === "status") {
        await loadStatusTypes();
      } else if (activeTab === "tarifas") {
        await loadTarifas();
      } else if (activeTab === "config") {
        await loadConfig();
      }
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  const loadLeads = async () => {
    try {
      const params = new URLSearchParams({
        page: currentPage,
        limit: 20,
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v))
      });
      
      const response = await axios.get(`${API}/admin/leads?${params}`, {
        withCredentials: true
      });
      
      setLeads(response.data.leads);
      setTotalPages(response.data.pages);
    } catch (error) {
      console.error("Error loading leads:", error);
      if (error.response?.status === 401) {
        navigate('/admin/login');
      }
    }
  };

  const loadStats = async () => {
    try {
      const response = await axios.get(`${API}/admin/stats`, {
        withCredentials: true
      });
      setStats(response.data);
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  const loadStatusTypes = async () => {
    try {
      const response = await axios.get(`${API}/admin/status-types`, {
        withCredentials: true
      });
      setStatusTypes(response.data);
    } catch (error) {
      console.error("Error loading status types:", error);
    }
  };

  const loadTarifas = async () => {
    try {
      const response = await axios.get(`${API}/admin/tarifas`, {
        withCredentials: true
      });
      setTarifas(response.data);
    } catch (error) {
      console.error("Error loading tarifas:", error);
    }
  };

  const loadConfig = async () => {
    try {
      const response = await axios.get(`${API}/admin/configuracao`, {
        withCredentials: true
      });
      setConfig(response.data);
      setConfigForm({ valor_kwp: response.data.valor_kwp });
    } catch (error) {
      console.error("Error loading config:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post(`${API}/auth/logout`, {}, { withCredentials: true });
      navigate('/admin/login');
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleUpdateLeadStatus = async (leadId, newStatus) => {
    try {
      await axios.patch(
        `${API}/admin/leads/${leadId}/status`,
        { status: newStatus },
        { withCredentials: true }
      );
      toast.success("Status atualizado!");
      loadLeads();
    } catch (error) {
      toast.error("Erro ao atualizar status");
    }
  };

  const handleCreateStatus = async () => {
    try {
      await axios.post(`${API}/admin/status-types`, statusForm, {
        withCredentials: true
      });
      toast.success("Status criado!");
      setShowStatusForm(false);
      setStatusForm({ nome: "", cor: "#3B82F6", ordem: 0 });
      loadStatusTypes();
    } catch (error) {
      toast.error("Erro ao criar status");
    }
  };

  const handleDeleteStatus = async (statusId) => {
    if (!window.confirm("Deseja excluir este status?")) return;
    
    try {
      await axios.delete(`${API}/admin/status-types/${statusId}`, {
        withCredentials: true
      });
      toast.success("Status excluído!");
      loadStatusTypes();
    } catch (error) {
      toast.error("Erro ao excluir status");
    }
  };

  const handleSaveTarifa = async () => {
    try {
      if (tarifaForm.tarifa_id) {
        await axios.put(`${API}/admin/tarifas/${tarifaForm.tarifa_id}`, {
          estado: tarifaForm.estado,
          concessionaria: tarifaForm.concessionaria,
          valor_kwh: parseFloat(tarifaForm.valor_kwh)
        }, { withCredentials: true });
        toast.success("Tarifa atualizada!");
      } else {
        await axios.post(`${API}/admin/tarifas`, {
          estado: tarifaForm.estado,
          concessionaria: tarifaForm.concessionaria,
          valor_kwh: parseFloat(tarifaForm.valor_kwh)
        }, { withCredentials: true });
        toast.success("Tarifa criada!");
      }
      
      setShowTarifaForm(false);
      setTarifaForm({ tarifa_id: "", estado: "", concessionaria: "", valor_kwh: 0 });
      loadTarifas();
    } catch (error) {
      toast.error("Erro ao salvar tarifa");
    }
  };

  const handleDeleteTarifa = async (tarifaId) => {
    if (!window.confirm("Deseja excluir esta tarifa?")) return;
    
    try {
      await axios.delete(`${API}/admin/tarifas/${tarifaId}`, {
        withCredentials: true
      });
      toast.success("Tarifa excluída!");
      loadTarifas();
    } catch (error) {
      toast.error("Erro ao excluir tarifa");
    }
  };

  const handleUpdateConfig = async () => {
    try {
      await axios.put(`${API}/admin/configuracao`, {
        valor_kwp: parseFloat(configForm.valor_kwp)
      }, { withCredentials: true });
      toast.success("Configuração atualizada!");
      setShowConfigForm(false);
      loadConfig();
    } catch (error) {
      toast.error("Erro ao atualizar configuração");
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Sun className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-xl font-bold text-secondary">Alluz Energia</h1>
              <p className="text-xs text-stone-500">Painel Administrativo</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            data-testid="logout-button"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="leads" data-testid="tab-leads">Leads</TabsTrigger>
            <TabsTrigger value="status" data-testid="tab-status">Status</TabsTrigger>
            <TabsTrigger value="tarifas" data-testid="tab-tarifas">Tarifas</TabsTrigger>
            <TabsTrigger value="config" data-testid="tab-config">Configurações</TabsTrigger>
          </TabsList>

          {/* Leads Tab */}
          <TabsContent value="leads" className="space-y-6">
            {/* Stats */}
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-stone-200">
                <div className="flex items-center gap-3 mb-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  <span className="text-sm text-stone-600">Total de Leads</span>
                </div>
                <p className="text-3xl font-bold text-secondary">{stats.total_leads}</p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-stone-200">
                <div className="flex items-center gap-3 mb-2">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-stone-600">Valor Total</span>
                </div>
                <p className="text-3xl font-bold text-secondary">{formatCurrency(stats.total_valor)}</p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-stone-200">
                <div className="flex items-center gap-3 mb-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  <span className="text-sm text-stone-600">Valor Médio</span>
                </div>
                <p className="text-3xl font-bold text-secondary">
                  {stats.total_leads > 0 ? formatCurrency(stats.total_valor / stats.total_leads) : formatCurrency(0)}
                </p>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-stone-200">
              <div className="flex items-center gap-2 mb-4">
                <Filter className="w-5 h-5 text-stone-600" />
                <h3 className="font-semibold text-secondary">Filtros</h3>
              </div>
              <div className="grid md:grid-cols-4 gap-4">
                <Input
                  placeholder="Nome"
                  value={filters.nome}
                  onChange={(e) => setFilters({ ...filters, nome: e.target.value })}
                  data-testid="filter-name"
                />
                <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}>
                  <SelectTrigger data-testid="filter-status">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value=" ">Todos</SelectItem>
                    {statusTypes.map((s) => (
                      <SelectItem key={s.status_id} value={s.nome}>{s.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Estado"
                  value={filters.estado}
                  onChange={(e) => setFilters({ ...filters, estado: e.target.value })}
                  data-testid="filter-state"
                />
                <Input
                  placeholder="Cidade"
                  value={filters.cidade}
                  onChange={(e) => setFilters({ ...filters, cidade: e.target.value })}
                  data-testid="filter-city"
                />
              </div>
              <div className="grid md:grid-cols-4 gap-4 mt-4">
                <Input
                  type="number"
                  placeholder="Valor mínimo"
                  value={filters.valor_min}
                  onChange={(e) => setFilters({ ...filters, valor_min: e.target.value })}
                  data-testid="filter-min-value"
                />
                <Input
                  type="number"
                  placeholder="Valor máximo"
                  value={filters.valor_max}
                  onChange={(e) => setFilters({ ...filters, valor_max: e.target.value })}
                  data-testid="filter-max-value"
                />
                <Input
                  type="date"
                  placeholder="Data início"
                  value={filters.data_inicio}
                  onChange={(e) => setFilters({ ...filters, data_inicio: e.target.value })}
                  data-testid="filter-start-date"
                />
                <Input
                  type="date"
                  placeholder="Data fim"
                  value={filters.data_fim}
                  onChange={(e) => setFilters({ ...filters, data_fim: e.target.value })}
                  data-testid="filter-end-date"
                />
              </div>
              <div className="mt-4 flex gap-2">
                <Button onClick={() => loadLeads()} data-testid="apply-filters">Aplicar Filtros</Button>
                <Button variant="outline" onClick={() => {
                  setFilters({ nome: "", status: "", estado: "", cidade: "", valor_min: "", valor_max: "", data_inicio: "", data_fim: "" });
                  setCurrentPage(1);
                }} data-testid="clear-filters">Limpar</Button>
              </div>
            </div>

            {/* Leads Table */}
            <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Localização</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((lead) => (
                    <TableRow key={lead.lead_id}>
                      <TableCell className="text-sm">{formatDate(lead.created_at)}</TableCell>
                      <TableCell className="font-medium">{lead.nome}</TableCell>
                      <TableCell>{lead.telefone}</TableCell>
                      <TableCell className="text-sm">{lead.cidade} - {lead.estado}</TableCell>
                      <TableCell className="font-semibold">{formatCurrency(lead.valor_projeto)}</TableCell>
                      <TableCell>
                        <Select
                          value={lead.status}
                          onValueChange={(value) => handleUpdateLeadStatus(lead.lead_id, value)}
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {statusTypes.map((s) => (
                              <SelectItem key={s.status_id} value={s.nome}>
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.cor }}></div>
                                  {s.nome}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedLead(lead);
                            setShowLeadDetails(true);
                          }}
                          data-testid={`view-lead-${lead.lead_id}`}
                        >
                          Ver Detalhes
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex justify-between items-center p-4 border-t border-stone-200">
                <p className="text-sm text-stone-600">
                  Página {currentPage} de {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(currentPage - 1)}
                    data-testid="prev-page"
                  >
                    Anterior
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(currentPage + 1)}
                    data-testid="next-page"
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Status Tab */}
          <TabsContent value="status" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-secondary">Status de Leads</h2>
              <Button onClick={() => setShowStatusForm(true)} data-testid="add-status-button">
                <Plus className="w-4 h-4 mr-2" />
                Novo Status
              </Button>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {statusTypes.map((status) => (
                <div key={status.status_id} className="bg-white rounded-xl p-6 shadow-sm border border-stone-200">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: status.cor }}></div>
                      <div>
                        <h3 className="font-semibold text-secondary">{status.nome}</h3>
                        <p className="text-sm text-stone-500">Ordem: {status.ordem}</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteStatus(status.status_id)}
                      data-testid={`delete-status-${status.status_id}`}
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Tarifas Tab */}
          <TabsContent value="tarifas" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-secondary">Tarifas das Concessionárias</h2>
              <Button onClick={() => {
                setTarifaForm({ tarifa_id: "", estado: "", concessionaria: "", valor_kwh: 0 });
                setShowTarifaForm(true);
              }} data-testid="add-tarifa-button">
                <Plus className="w-4 h-4 mr-2" />
                Nova Tarifa
              </Button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Estado</TableHead>
                    <TableHead>Concessionária</TableHead>
                    <TableHead>Valor kWh</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tarifas.map((tarifa) => (
                    <TableRow key={tarifa.tarifa_id}>
                      <TableCell className="font-medium">{tarifa.estado}</TableCell>
                      <TableCell>{tarifa.concessionaria}</TableCell>
                      <TableCell className="font-semibold">{formatCurrency(tarifa.valor_kwh)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setTarifaForm(tarifa);
                              setShowTarifaForm(true);
                            }}
                            data-testid={`edit-tarifa-${tarifa.tarifa_id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteTarifa(tarifa.tarifa_id)}
                            data-testid={`delete-tarifa-${tarifa.tarifa_id}`}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Config Tab */}
          <TabsContent value="config" className="space-y-6">
            <h2 className="text-2xl font-bold text-secondary">Configurações do Sistema</h2>

            <div className="bg-white rounded-xl p-8 shadow-sm border border-stone-200 max-w-2xl">
              <div className="flex items-center gap-3 mb-6">
                <Settings className="w-6 h-6 text-primary" />
                <h3 className="text-xl font-semibold text-secondary">Valor do kWp</h3>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label className="text-base mb-2 block">Valor atual por kWp</Label>
                  <p className="text-4xl font-bold text-primary mb-4">{formatCurrency(config.valor_kwp)}</p>
                  <p className="text-sm text-stone-600">
                    Este valor é usado para calcular o preço total dos projetos simulados.
                  </p>
                </div>
                
                <Button onClick={() => setShowConfigForm(true)} data-testid="edit-config-button">
                  <Edit className="w-4 h-4 mr-2" />
                  Alterar Valor
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Lead Details Modal */}
      <Dialog open={showLeadDetails} onOpenChange={setShowLeadDetails}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Lead</DialogTitle>
          </DialogHeader>
          {selectedLead && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-stone-600">Nome</Label>
                  <p className="font-semibold">{selectedLead.nome}</p>
                </div>
                <div>
                  <Label className="text-sm text-stone-600">Telefone</Label>
                  <p className="font-semibold">{selectedLead.telefone}</p>
                </div>
                <div>
                  <Label className="text-sm text-stone-600">Email</Label>
                  <p className="font-semibold">{selectedLead.email || "Não informado"}</p>
                </div>
                <div>
                  <Label className="text-sm text-stone-600">Data</Label>
                  <p className="font-semibold">{formatDate(selectedLead.created_at)}</p>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3">Informações do Projeto</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-stone-600">Localização</Label>
                    <p className="font-semibold">{selectedLead.cidade} - {selectedLead.estado}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-stone-600">Tipo</Label>
                    <p className="font-semibold">{selectedLead.tipo_projeto}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-stone-600">Potência (kWp)</Label>
                    <p className="font-semibold">{selectedLead.kwp} kWp</p>
                  </div>
                  <div>
                    <Label className="text-sm text-stone-600">Valor do Projeto</Label>
                    <p className="font-semibold text-primary">{formatCurrency(selectedLead.valor_projeto)}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-stone-600">Placas</Label>
                    <p className="font-semibold">{selectedLead.qtd_placas_min} a {selectedLead.qtd_placas_max}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-stone-600">Inversor</Label>
                    <p className="font-semibold">{selectedLead.inversor} kW</p>
                  </div>
                  <div>
                    <Label className="text-sm text-stone-600">Payback</Label>
                    <p className="font-semibold">{selectedLead.payback_anos} anos</p>
                  </div>
                  <div>
                    <Label className="text-sm text-stone-600">Parcela Estimada</Label>
                    <p className="font-semibold">{formatCurrency(selectedLead.parcela_estimada)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Status Form Modal */}
      <Dialog open={showStatusForm} onOpenChange={setShowStatusForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Status</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="status-nome">Nome</Label>
              <Input
                id="status-nome"
                value={statusForm.nome}
                onChange={(e) => setStatusForm({ ...statusForm, nome: e.target.value })}
                data-testid="status-name-input"
              />
            </div>
            <div>
              <Label htmlFor="status-cor">Cor</Label>
              <Input
                id="status-cor"
                type="color"
                value={statusForm.cor}
                onChange={(e) => setStatusForm({ ...statusForm, cor: e.target.value })}
                data-testid="status-color-input"
              />
            </div>
            <div>
              <Label htmlFor="status-ordem">Ordem</Label>
              <Input
                id="status-ordem"
                type="number"
                value={statusForm.ordem}
                onChange={(e) => setStatusForm({ ...statusForm, ordem: parseInt(e.target.value) })}
                data-testid="status-order-input"
              />
            </div>
            <Button onClick={handleCreateStatus} className="w-full" data-testid="save-status-button">
              Criar Status
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Tarifa Form Modal */}
      <Dialog open={showTarifaForm} onOpenChange={setShowTarifaForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tarifaForm.tarifa_id ? "Editar" : "Nova"} Tarifa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="tarifa-estado">Estado</Label>
              <Input
                id="tarifa-estado"
                value={tarifaForm.estado}
                onChange={(e) => setTarifaForm({ ...tarifaForm, estado: e.target.value })}
                placeholder="SP"
                data-testid="tarifa-state-input"
              />
            </div>
            <div>
              <Label htmlFor="tarifa-concessionaria">Concessionária</Label>
              <Input
                id="tarifa-concessionaria"
                value={tarifaForm.concessionaria}
                onChange={(e) => setTarifaForm({ ...tarifaForm, concessionaria: e.target.value })}
                placeholder="ENEL"
                data-testid="tarifa-company-input"
              />
            </div>
            <div>
              <Label htmlFor="tarifa-valor">Valor por kWh (R$)</Label>
              <Input
                id="tarifa-valor"
                type="number"
                step="0.01"
                value={tarifaForm.valor_kwh}
                onChange={(e) => setTarifaForm({ ...tarifaForm, valor_kwh: e.target.value })}
                placeholder="0.85"
                data-testid="tarifa-value-input"
              />
            </div>
            <Button onClick={handleSaveTarifa} className="w-full" data-testid="save-tarifa-button">
              Salvar Tarifa
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Config Form Modal */}
      <Dialog open={showConfigForm} onOpenChange={setShowConfigForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Valor do kWp</DialogTitle>
            <DialogDescription>
              Este valor será usado para calcular o preço de todos os novos projetos simulados.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="config-valor">Valor por kWp (R$)</Label>
              <Input
                id="config-valor"
                type="number"
                step="0.01"
                value={configForm.valor_kwp}
                onChange={(e) => setConfigForm({ valor_kwp: e.target.value })}
                data-testid="config-kwp-input"
              />
            </div>
            <Button onClick={handleUpdateConfig} className="w-full" data-testid="save-config-button">
              Salvar Configuração
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
