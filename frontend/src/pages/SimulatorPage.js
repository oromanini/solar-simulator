import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Home, Building2, Users } from "lucide-react";
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
import { Progress } from "@/components/ui/progress";
import axios from "axios";
import { API } from "@/App";

const tiposTelhado = [
  { id: "colonial", nome: "Colonial", icon: "🏠" },
  { id: "trapezoidal", nome: "Trapezoidal", icon: "🏢" },
  { id: "fibrocimento", nome: "Fibrocimento", icon: "🏭" },
  { id: "laje", nome: "Laje", icon: "🏗️" },
  { id: "solo", nome: "Solo", icon: "🌍" }
];

const pageVariants = {
  enter: { x: 50, opacity: 0 },
  center: { x: 0, opacity: 1 },
  exit: { x: -50, opacity: 0 }
};

export default function SimulatorPage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [estados, setEstados] = useState([]);
  const [cidades, setCidades] = useState([]);
  const [isLoadingEstados, setIsLoadingEstados] = useState(false);
  const [estadoFiltro, setEstadoFiltro] = useState("");
  const [cidadeFiltro, setCidadeFiltro] = useState("");
  const [formData, setFormData] = useState({
    numResidencias: 0,
    valoresConta: [],
    estado: "",
    estadoId: "",
    estadoSigla: "",
    cidade: "",
    tipoTelhado: "",
    tipoProjeto: ""
  });

  const totalSteps = 5;
  const progress = (currentStep / totalSteps) * 100;

  const handleNext = async () => {
    if (currentStep === 1 && formData.numResidencias === 0) return;
    if (currentStep === 2 && formData.valoresConta.length !== formData.numResidencias) return;
    if (currentStep === 3 && (!formData.estadoId || !formData.cidade)) return;
    if (currentStep === 4 && !formData.tipoTelhado) return;
    if (currentStep === 5 && !formData.tipoProjeto) {
      return;
    }

    if (currentStep === 5) {
      await calculateAndNavigate();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      navigate('/');
    }
  };

  const calculateAndNavigate = async () => {
    try {
      // Get configuration
      const configResponse = await axios.get(`${API}/configuracao/valor-kwp`);
      const valorKwp = configResponse.data.valor_kwp;

      // Get irradiation data
      const irradiacaoResponse = await axios.get(
        `${API}/irradiacao/${formData.estadoSigla}/${formData.cidade}`
      );
      const incidenciaSolar = irradiacaoResponse.data.incidencia_media;

      // Calculate total consumption (simplified - using average tariff)
      const tarifaMedia = 0.85; // R$ per kWh (average)
      const somaContas = formData.valoresConta.reduce((sum, val) => sum + parseFloat(val || 0), 0);
      const consumoKwh = somaContas / tarifaMedia;

      // Calculate kWp
      const kwp = ((consumoKwh / 30 / incidenciaSolar) * 1.25);

      // Calculate number of panels
      const qtdPlacasMin = Math.ceil(kwp / 0.700);
      const qtdPlacasMax = Math.ceil(kwp / 0.550);

      // Calculate inverter
      const inversores = [3, 5, 7, 10, 15, 20, 25, 30, 50, 75, 100];
      const inversorLimites = {
        3: 4.5, 5: 7.5, 7: 10.5, 10: 15, 15: 22.5,
        20: 30, 25: 37.5, 30: 45, 50: 75, 75: 112.5, 100: 150
      };
      
      let inversor = 3;
      for (let inv of inversores) {
        if (kwp <= inversorLimites[inv]) {
          inversor = inv;
          break;
        }
      }

      // Calculate project value
      const valorProjeto = kwp * valorKwp;

      // Calculate payback
      const economiaAnual = somaContas * 12;
      const paybackAnos = valorProjeto / economiaAnual;

      // Calculate property appreciation
      const valorizacaoImovel = 8.0; // 8% fixed

      // Calculate estimated installment
      const parcelaEstimada = (valorProjeto * 2.2) / 60;

      const resultData = {
        ...formData,
        kwp: parseFloat(kwp.toFixed(2)),
        valorProjeto: parseFloat(valorProjeto.toFixed(2)),
        qtdPlacasMin,
        qtdPlacasMax,
        inversor,
        incidenciaSolar,
        paybackAnos: parseFloat(paybackAnos.toFixed(2)),
        valorizacaoImovel,
        parcelaEstimada: parseFloat(parcelaEstimada.toFixed(2)),
        economiaAnual: parseFloat(economiaAnual.toFixed(2))
      };

      navigate('/resultado', { state: { resultData } });
    } catch (error) {
      console.error('Error calculating:', error);
      alert('Erro ao calcular. Por favor, tente novamente.');
    }
  };

  const loadEstados = async () => {
    try {
      setIsLoadingEstados(true);
      const response = await axios.get(`${API}/estados`);
      const data = response.data;
      const normalizedEstados = Array.isArray(data) ? data : data?.estados || [];
      setEstados(normalizedEstados);
    } catch (error) {
      console.error('Error loading estados:', error);
    } finally {
      setIsLoadingEstados(false);
    }
  };

  const loadCidades = async (estado) => {
    try {
      const response = await axios.get(`${API}/cidades/${estado}`);
      const data = response.data;
      const normalizedCidades = Array.isArray(data) ? data : data?.cidades || [];
      setCidades(normalizedCidades);
    } catch (error) {
      console.error('Error loading cidades:', error);
    }
  };

  const estadosFiltrados = estados.filter((estado) => {
    const filtro = estadoFiltro.trim().toLowerCase();
    return (
      estado.nome.toLowerCase().includes(filtro) ||
      estado.sigla.toLowerCase().includes(filtro)
    );
  });
  const cidadesFiltradas = cidades.filter((cidade) =>
    cidade.nome.toLowerCase().includes(cidadeFiltro.trim().toLowerCase())
  );

  useEffect(() => {
    if (currentStep === 3 && estados.length === 0) {
      loadEstados();
    }
  }, [currentStep, estados.length]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-100 via-orange-50 to-stone-100 noise-bg flex flex-col">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-stone-200 py-4 px-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/logo_site.png"
              alt="Alluz Energia"
              className="w-20 h-20 object-contain"
            />
          </div>
          <div className="text-sm text-stone-600">
            Passo {currentStep} de {totalSteps}
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Progress value={progress} className="h-2" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-3xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              variants={pageVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="bg-white rounded-2xl shadow-xl p-8 md:p-12"
            >
              {/* Step 1: Number of residences */}
              {currentStep === 1 && (
                <div>
                  <h2 className="text-3xl font-bold text-secondary mb-3">Para quantas residências você quer energia solar?</h2>
                  <p className="text-stone-600 mb-8">Selecione uma opção abaixo</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { value: 1, label: "Somente para minha residência", icon: <Home className="w-8 h-8" /> },
                      { value: 2, label: "Duas residências", icon: <Users className="w-8 h-8" /> },
                      { value: 3, label: "Três residências", icon: <Building2 className="w-8 h-8" /> },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setFormData({ ...formData, numResidencias: option.value, valoresConta: Array(option.value).fill("") });
                        }}
                        className={`cursor-pointer bg-white rounded-xl p-6 border-2 transition-all duration-200 flex flex-col items-center justify-center gap-4 text-center h-full min-h-[160px] ${
                          formData.numResidencias === option.value
                            ? "border-primary bg-amber-50/50 shadow-md ring-1 ring-primary/20"
                            : "border-transparent hover:border-primary/50 hover:bg-amber-50/30"
                        }`}
                        data-testid={`residence-option-${option.value}`}
                      >
                        <div className="text-primary">{option.icon}</div>
                        <span className="font-semibold text-secondary">{option.label}</span>
                      </button>
                    ))}
                    
                    <button
                      onClick={() => navigate('/resultado', { state: { isCustom: true } })}
                      className="cursor-pointer bg-gradient-to-br from-primary to-amber-600 rounded-xl p-6 border-2 border-transparent hover:shadow-lg transition-all duration-200 flex flex-col items-center justify-center gap-4 text-center h-full min-h-[160px]"
                      data-testid="residence-option-custom"
                    >
                      <div className="text-white text-4xl">✨</div>
                      <span className="font-semibold text-white">Personalizado</span>
                      <span className="text-xs text-amber-50">Fale direto com nossa equipe</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Electricity bill values */}
              {currentStep === 2 && (
                <div>
                  <h2 className="text-3xl font-bold text-secondary mb-3">Qual o valor médio da conta de luz?</h2>
                  <p className="text-stone-600 mb-8">Digite o valor em reais (R$)</p>
                  
                  <div className="space-y-6">
                    {Array.from({ length: formData.numResidencias }).map((_, index) => (
                      <div key={index}>
                        <Label htmlFor={`conta-${index}`} className="text-base mb-2 block">
                          {formData.numResidencias > 1 ? `Residência ${index + 1}` : "Valor da conta"}
                        </Label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500 font-medium">R$</span>
                          <Input
                            id={`conta-${index}`}
                            type="number"
                            placeholder="350,00"
                            value={formData.valoresConta[index] || ""}
                            onChange={(e) => {
                              const newValues = [...formData.valoresConta];
                              newValues[index] = e.target.value;
                              setFormData({ ...formData, valoresConta: newValues });
                            }}
                            className="pl-12 h-14 text-lg"
                            data-testid={`bill-value-input-${index}`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 3: Location */}
              {currentStep === 3 && (
                <div>
                  <h2 className="text-3xl font-bold text-secondary mb-3">Onde você mora?</h2>
                  <p className="text-stone-600 mb-8">Selecione o estado e a cidade</p>
                  
                  <div className="space-y-6">
                    <div>
                      <Label htmlFor="estado" className="text-base mb-2 block">Estado</Label>
                      <Select
                        value={formData.estadoId ? String(formData.estadoId) : ""}
                        onValueChange={(value) => {
                          const estadoSelecionado = estados.find((estado) => String(estado.estado_id) === value);
                          if (!estadoSelecionado) {
                            return;
                          }
                          setFormData({
                            ...formData,
                            estado: estadoSelecionado.nome,
                            estadoId: estadoSelecionado.estado_id,
                            estadoSigla: estadoSelecionado.sigla,
                            cidade: ""
                          });
                          setCidadeFiltro("");
                          loadCidades(estadoSelecionado.estado_id);
                        }}
                        onOpenChange={(open) => {
                          if (open) setEstadoFiltro("");
                          if (open && estados.length === 0) loadEstados();
                        }}
                      >
                        <SelectTrigger className="h-14 text-lg" data-testid="state-select">
                          <SelectValue placeholder="Selecione o estado" />
                        </SelectTrigger>
                        <SelectContent>
                          <div className="sticky top-0 z-10 bg-popover p-2">
                            <Input
                              value={estadoFiltro}
                              onChange={(event) => setEstadoFiltro(event.target.value)}
                              onKeyDown={(event) => event.stopPropagation()}
                              placeholder="Digite para filtrar"
                              className="h-9"
                            />
                          </div>
                          {isLoadingEstados ? (
                            <div className="px-3 py-4 text-sm text-stone-500 flex items-center gap-2">
                              <span className="h-4 w-4 animate-spin rounded-full border-2 border-stone-300 border-t-primary" />
                              Carregando estados...
                            </div>
                          ) : (
                            estadosFiltrados.map((estado) => (
                              <SelectItem
                                key={estado.estado_id}
                                value={String(estado.estado_id)}
                                data-testid={`state-option-${estado.sigla}`}
                              >
                                {estado.nome}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    {formData.estadoId && (
                      <div>
                        <Label htmlFor="cidade" className="text-base mb-2 block">Cidade</Label>
                        <Select
                          value={formData.cidade}
                          onValueChange={(value) => setFormData({ ...formData, cidade: value })}
                          onOpenChange={(open) => {
                            if (open) setCidadeFiltro("");
                          }}
                        >
                          <SelectTrigger className="h-14 text-lg" data-testid="city-select">
                            <SelectValue placeholder="Selecione a cidade" />
                          </SelectTrigger>
                          <SelectContent>
                            <div className="sticky top-0 z-10 bg-popover p-2">
                              <Input
                                value={cidadeFiltro}
                                onChange={(event) => setCidadeFiltro(event.target.value)}
                                onKeyDown={(event) => event.stopPropagation()}
                                placeholder="Digite para filtrar"
                                className="h-9"
                              />
                            </div>
                            {cidadesFiltradas.map((cidade) => (
                              <SelectItem
                                key={cidade.cidade_id}
                                value={cidade.nome}
                                data-testid={`city-option-${cidade.cidade_id}`}
                              >
                                {cidade.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step 4: Roof type */}
              {currentStep === 4 && (
                <div>
                  <h2 className="text-3xl font-bold text-secondary mb-3">Qual o tipo do telhado?</h2>
                  <p className="text-stone-600 mb-8">Selecione o tipo de estrutura</p>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {tiposTelhado.map((tipo) => (
                      <button
                        key={tipo.id}
                        onClick={() => setFormData({ ...formData, tipoTelhado: tipo.id })}
                        className={`cursor-pointer bg-white rounded-xl p-6 border-2 transition-all duration-200 flex flex-col items-center justify-center gap-3 text-center h-full min-h-[140px] ${
                          formData.tipoTelhado === tipo.id
                            ? "border-primary bg-amber-50/50 shadow-md ring-1 ring-primary/20"
                            : "border-transparent hover:border-primary/50 hover:bg-amber-50/30"
                        }`}
                        data-testid={`roof-type-${tipo.id}`}
                      >
                        <div className="text-4xl">{tipo.icon}</div>
                        <span className="font-semibold text-secondary text-sm">{tipo.nome}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 5: Project type */}
              {currentStep === 5 && (
                <div>
                  <h2 className="text-3xl font-bold text-secondary mb-3">Tipo do projeto</h2>
                  <p className="text-stone-600 mb-8">É residencial ou comercial?</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { value: "Residencial", label: "Residencial", icon: "🏠", desc: "Para casas e apartamentos" },
                      { value: "Comercial", label: "Comercial", icon: "🏢", desc: "Para empresas e comércios" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setFormData({ ...formData, tipoProjeto: option.value })}
                        className={`cursor-pointer bg-white rounded-xl p-8 border-2 transition-all duration-200 flex flex-col items-center justify-center gap-4 text-center h-full min-h-[180px] ${
                          formData.tipoProjeto === option.value
                            ? "border-primary bg-amber-50/50 shadow-md ring-1 ring-primary/20"
                            : "border-transparent hover:border-primary/50 hover:bg-amber-50/30"
                        }`}
                        data-testid={`project-type-${option.value.toLowerCase()}`}
                      >
                        <div className="text-5xl">{option.icon}</div>
                        <div>
                          <span className="font-bold text-secondary text-xl block">{option.label}</span>
                          <span className="text-sm text-stone-600">{option.desc}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between mt-12 pt-8 border-t border-stone-200">
                <Button
                  variant="outline"
                  onClick={handleBack}
                  className="h-12 px-6 rounded-full"
                  data-testid="back-button"
                >
                  <ArrowLeft className="mr-2 w-5 h-5" />
                  Voltar
                </Button>
                
                <Button
                  onClick={handleNext}
                  disabled={
                    (currentStep === 1 && formData.numResidencias === 0) ||
                    (currentStep === 2 && formData.valoresConta.some(v => !v || parseFloat(v) <= 0)) ||
                    (currentStep === 3 && (!formData.estadoId || !formData.cidade)) ||
                    (currentStep === 4 && !formData.tipoTelhado) ||
                    (currentStep === 5 && !formData.tipoProjeto)
                  }
                  className="bg-primary text-primary-foreground hover:bg-primary/90 h-12 px-8 rounded-full font-semibold shadow-lg shadow-amber-500/20 transition-all hover:scale-105 active:scale-95"
                  data-testid="next-button"
                >
                  {currentStep === totalSteps ? "Ver Resultado" : "Próximo"}
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
