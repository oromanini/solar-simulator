import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import CountUp from "react-countup";
import { Sun, Zap, PiggyBank, TrendingUp, Calendar, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import axios from "axios";
import { API } from "@/App";

export default function ResultPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { resultData, isCustom } = location.state || {};
  const [showModal, setShowModal] = useState(false);
  const [leadData, setLeadData] = useState({
    nome: "",
    telefone: "",
    email: ""
  });

  useEffect(() => {
    if (isCustom) {
      setShowModal(true);
    }
  }, [isCustom]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (!showModal) {
        e.preventDefault();
        setShowModal(true);
        return "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [showModal]);

  if (!resultData && !isCustom) {
    navigate('/');
    return null;
  }

  const handleSubmitLead = async () => {
    if (!leadData.nome || !leadData.telefone) {
      toast.error("Por favor, preencha nome e telefone");
      return;
    }

    try {
      const payload = isCustom ? {
        nome: leadData.nome,
        telefone: leadData.telefone,
        email: leadData.email || "",
        num_residencias: 0,
        valores_conta: [0],
        estado: "",
        cidade: "",
        tipo_telhado: "Personalizado",
        tipo_projeto: "Personalizado",
        kwp: 0,
        valor_projeto: 0,
        qtd_placas_min: 0,
        qtd_placas_max: 0,
        inversor: 0,
        incidencia_solar: 0,
        payback_anos: 0,
        valorizacao_imovel: 0,
        parcela_estimada: 0,
      } : {
        ...leadData,
        num_residencias: resultData.numResidencias,
        valores_conta: resultData.valoresConta.map(v => parseFloat(v)),
        estado: resultData.estado,
        cidade: resultData.cidade,
        tipo_telhado: resultData.tipoTelhado,
        tipo_projeto: resultData.tipoProjeto,
        kwp: resultData.kwp,
        valor_projeto: resultData.valorProjeto,
        qtd_placas_min: resultData.qtdPlacasMin,
        qtd_placas_max: resultData.qtdPlacasMax,
        inversor: resultData.inversor,
        incidencia_solar: resultData.incidenciaSolar,
        payback_anos: resultData.paybackAnos,
        valorizacao_imovel: resultData.valorizacaoImovel,
        parcela_estimada: resultData.parcelaEstimada,
      };

      await axios.post(`${API}/leads`, payload);
      toast.success("Projeto salvo! Em breve entraremos em contato.");
      navigate('/obrigado');
    } catch (error) {
      console.error('Error submitting lead:', error);
      toast.error("Erro ao salvar. Tente novamente.");
    }
  };

  const handleCloseAttempt = () => {
    setShowModal(true);
  };

  if (isCustom) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-100 via-orange-50 to-stone-100 noise-bg flex items-center justify-center p-4">
        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent className="sm:max-w-md" data-testid="custom-lead-modal">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-center">Projeto Personalizado</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-center text-stone-600">
                Para projetos personalizados, nossa equipe entrará em contato para entender melhor suas necessidades.
              </p>
              <div>
                <Label htmlFor="nome">Nome *</Label>
                <Input
                  id="nome"
                  value={leadData.nome}
                  onChange={(e) => setLeadData({ ...leadData, nome: e.target.value })}
                  placeholder="Seu nome completo"
                  data-testid="lead-name-input"
                />
              </div>
              <div>
                <Label htmlFor="telefone">Telefone *</Label>
                <Input
                  id="telefone"
                  value={leadData.telefone}
                  onChange={(e) => setLeadData({ ...leadData, telefone: e.target.value })}
                  placeholder="(00) 00000-0000"
                  data-testid="lead-phone-input"
                />
              </div>
              <div>
                <Label htmlFor="email">Email (opcional)</Label>
                <Input
                  id="email"
                  type="email"
                  value={leadData.email}
                  onChange={(e) => setLeadData({ ...leadData, email: e.target.value })}
                  placeholder="seu@email.com"
                  data-testid="lead-email-input"
                />
              </div>
              <Button
                onClick={handleSubmitLead}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-12 rounded-full font-semibold"
                data-testid="submit-lead-button"
              >
                Solicitar Contato
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-100 via-orange-50 to-stone-100 noise-bg">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-stone-200 py-4 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sun className="w-8 h-8 text-primary" />
            <span className="text-xl font-bold text-secondary">Alluz Energia</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/')}
            data-testid="home-button"
          >
            Voltar ao Início
          </Button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Success Message */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-block bg-green-100 text-green-800 px-6 py-3 rounded-full mb-4 font-semibold">
            ✓ Simulação Concluída!
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-secondary mb-4">
            Seu Sistema Solar Ideal
          </h1>
          <p className="text-xl text-stone-600">Veja os detalhes do seu projeto personalizado</p>
        </motion.div>

        {/* Main Results Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl p-6 shadow-lg border border-stone-100"
            data-testid="result-kwp-card"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-amber-100 rounded-full p-3">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <span className="text-sm text-stone-600 font-medium">Potência Necessária</span>
            </div>
            <p className="text-4xl font-bold text-secondary">
              <CountUp end={resultData.kwp} decimals={2} duration={2} />
              <span className="text-2xl"> kWp</span>
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl p-6 shadow-lg border border-stone-100"
            data-testid="result-value-card"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-green-100 rounded-full p-3">
                <PiggyBank className="w-6 h-6 text-green-600" />
              </div>
              <span className="text-sm text-stone-600 font-medium">Valor do Projeto</span>
            </div>
            <p className="text-4xl font-bold text-secondary">
              R$ <CountUp end={resultData.valorProjeto} separator="." decimals={0} duration={2} />
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl p-6 shadow-lg border border-stone-100"
            data-testid="result-payback-card"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-blue-100 rounded-full p-3">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-sm text-stone-600 font-medium">Retorno do Investimento</span>
            </div>
            <p className="text-4xl font-bold text-secondary">
              <CountUp end={resultData.paybackAnos} decimals={1} duration={2} />
              <span className="text-2xl"> anos</span>
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-2xl p-6 shadow-lg border border-stone-100"
            data-testid="result-appreciation-card"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-purple-100 rounded-full p-3">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
              <span className="text-sm text-stone-600 font-medium">Valorização Imóvel</span>
            </div>
            <p className="text-4xl font-bold text-secondary">
              <CountUp end={resultData.valorizacaoImovel} decimals={0} duration={2} />%
              <span className="text-sm text-stone-600 block mt-1">+ IPCA</span>
            </p>
          </motion.div>
        </div>

        {/* Detailed Information */}
        <div className="grid lg:grid-cols-2 gap-8 mb-12">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-2xl p-8 shadow-lg border border-stone-100"
          >
            <h3 className="text-2xl font-bold text-secondary mb-6">Detalhes Técnicos</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-stone-100">
                <span className="text-stone-600">Placas Solares</span>
                <span className="font-semibold text-secondary">{resultData.qtdPlacasMin} a {resultData.qtdPlacasMax} unidades</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-stone-100">
                <span className="text-stone-600">Inversor</span>
                <span className="font-semibold text-secondary">{resultData.inversor} kW</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-stone-100">
                <span className="text-stone-600">Irradiação Solar</span>
                <span className="font-semibold text-secondary">{resultData.incidenciaSolar} kWh/m²/dia</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-stone-100">
                <span className="text-stone-600">Localização</span>
                <span className="font-semibold text-secondary">{resultData.cidade} - {resultData.estado}</span>
              </div>
              <div className="flex justify-between items-center py-3">
                <span className="text-stone-600">Tipo de Telhado</span>
                <span className="font-semibold text-secondary capitalize">{resultData.tipoTelhado}</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-gradient-to-br from-primary to-amber-600 rounded-2xl p-8 shadow-lg text-white"
          >
            <h3 className="text-2xl font-bold mb-6">Estimativa de Parcela</h3>
            <div className="text-center py-8">
              <p className="text-sm opacity-90 mb-2">A partir de</p>
              <p className="text-5xl font-bold mb-2">
                R$ <CountUp end={resultData.parcelaEstimada} separator="." decimals={2} duration={2} />
              </p>
              <p className="text-lg opacity-90 mb-6">por mês em até 60x</p>
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
                <p className="text-sm">
                  💰 Carência de 90 dias para primeira parcela<br />
                  📊 Simulação sujeita a análise de crédito
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-white rounded-2xl p-12 shadow-xl border-2 border-primary text-center"
        >
          <h2 className="text-3xl font-bold text-secondary mb-4">Pronto para economizar?</h2>
          <p className="text-lg text-stone-600 mb-8">
            Gere seu projeto completo e nossa equipe entrará em contato com você!
          </p>
          <Button
            size="lg"
            onClick={() => setShowModal(true)}
            className="bg-primary text-primary-foreground hover:bg-primary/90 h-14 px-12 rounded-full font-semibold shadow-lg shadow-amber-500/20 transition-all hover:scale-105 text-lg"
            data-testid="generate-project-button"
          >
            Gerar Projeto Completo
            <ArrowRight className="ml-2 w-6 h-6" />
          </Button>
        </motion.div>
      </div>

      {/* Lead Capture Modal */}
      <Dialog open={showModal} onOpenChange={(open) => {
        if (!open) {
          const confirmExit = window.confirm("Deseja sair sem gerar o projeto completo?");
          if (confirmExit) {
            setShowModal(false);
          }
        } else {
          setShowModal(true);
        }
      }}>
        <DialogContent className="sm:max-w-md" data-testid="lead-modal">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-center">Gerar Projeto Completo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-center text-stone-600">
              Preencha seus dados para receber o projeto detalhado
            </p>
            <div>
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                value={leadData.nome}
                onChange={(e) => setLeadData({ ...leadData, nome: e.target.value })}
                placeholder="Seu nome completo"
                data-testid="lead-name-input"
              />
            </div>
            <div>
              <Label htmlFor="telefone">Telefone *</Label>
              <Input
                id="telefone"
                value={leadData.telefone}
                onChange={(e) => setLeadData({ ...leadData, telefone: e.target.value })}
                placeholder="(00) 00000-0000"
                data-testid="lead-phone-input"
              />
            </div>
            <div>
              <Label htmlFor="email">Email (opcional)</Label>
              <Input
                id="email"
                type="email"
                value={leadData.email}
                onChange={(e) => setLeadData({ ...leadData, email: e.target.value })}
                placeholder="seu@email.com"
                data-testid="lead-email-input"
              />
            </div>
            <Button
              onClick={handleSubmitLead}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-12 rounded-full font-semibold"
              data-testid="submit-lead-button"
            >
              Gerar Projeto Completo
            </Button>
            <p className="text-xs text-center text-stone-500">
              Ao continuar, você concorda em ser contatado pela Alluz Energia
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
