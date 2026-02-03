import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Zap, PiggyBank, Home, ArrowRight, Instagram } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-100 via-orange-50 to-stone-100 noise-bg">
      {/* Header */}
      <header className="fixed top-0 w-full bg-white/80 backdrop-blur-md border-b border-stone-200 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img
              src="/logo_site.png"
              alt="Alluz Energia"
              className="w-8 h-8 object-contain"
            />
            <span className="text-2xl font-bold text-secondary">Alluz Energia</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="https://www.instagram.com/alluzenergia/" target="_blank" rel="noopener noreferrer" className="hover:scale-110 transition-transform">
              <Instagram className="w-6 h-6 text-stone-600 hover:text-primary" />
            </a>
            <a href="https://alluzenergia.com.br/" target="_blank" rel="noopener noreferrer" className="text-stone-600 hover:text-primary font-medium">
              Site
            </a>
            <a href="https://wa.me/5544988574869" target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="outline" data-testid="header-whatsapp-btn">
                WhatsApp
              </Button>
            </a>
            <Button 
              size="sm" 
              variant="ghost"
              onClick={() => navigate('/admin/login')}
              data-testid="header-login-btn"
              className="text-stone-600 hover:text-primary hover:bg-amber-50"
            >
              Login
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-block bg-amber-100 px-4 py-2 rounded-full mb-6">
                <p className="text-sm font-semibold text-amber-800">Alluz. Onde há luz, lá nos estaremos!</p>
              </div>
              
              <h1 className="text-4xl md:text-6xl font-bold text-secondary tracking-tight mb-6 leading-tight">
                Em apenas <span className="text-primary">5 passos</span>, descubra quanto custa energia solar para você
              </h1>
              
              <p className="text-lg text-stone-600 mb-8 leading-relaxed">
                Simule agora e descubra a economia mensal, payback do investimento e valorização do seu imóvel. <strong>100% gratuito e sem compromisso.</strong>
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  size="lg"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 h-14 px-10 rounded-full font-semibold shadow-lg shadow-amber-500/20 transition-all hover:scale-105 active:scale-95 text-lg"
                  onClick={() => navigate('/simulador')}
                  data-testid="start-simulator-btn"
                >
                  Começar Simulação
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-14 px-10 rounded-full font-medium border-2"
                  onClick={() => window.open('https://wa.me/5544988574869', '_blank')}
                  data-testid="contact-whatsapp-btn"
                >
                  Falar com Especialista
                </Button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-6 mt-12">
                <div>
                  <p className="text-3xl font-bold text-primary">95%</p>
                  <p className="text-sm text-stone-600">Economia na Conta</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-primary">4-6</p>
                  <p className="text-sm text-stone-600">Anos de Payback</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-primary">+8%</p>
                  <p className="text-sm text-stone-600">Valorização</p>
                </div>
              </div>
            </motion.div>

            {/* Right Image */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                <img
                  src="https://images.unsplash.com/photo-1723046106153-8d3810267931?crop=entropy&cs=srgb&fm=jpg&q=85"
                  alt="Casa moderna com painéis solares"
                  className="w-full h-auto"
                />
                <div className="absolute top-6 right-6 bg-white rounded-xl p-4 shadow-xl">
                  <div className="flex items-center gap-3">
                    <div className="bg-green-100 rounded-full p-3">
                      <PiggyBank className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-secondary">R$ 450</p>
                      <p className="text-sm text-stone-600">Economia/mês</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-secondary mb-4">Por que energia solar?</h2>
            <p className="text-stone-600 text-lg">Invista no futuro, economize no presente</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <motion.div
              whileHover={{ y: -8 }}
              className="bg-white rounded-2xl p-8 border border-stone-100 shadow-sm hover:shadow-md transition-all duration-300"
            >
              <div className="bg-amber-100 rounded-full w-16 h-16 flex items-center justify-center mb-6">
                <PiggyBank className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-secondary mb-3">Economia Imediata</h3>
              <p className="text-stone-600 leading-relaxed">Reduza até 95% da sua conta de energia logo no primeiro mês de instalação.</p>
            </motion.div>

            <motion.div
              whileHover={{ y: -8 }}
              className="bg-white rounded-2xl p-8 border border-stone-100 shadow-sm hover:shadow-md transition-all duration-300"
            >
              <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mb-6">
                <Home className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-secondary mb-3">Valorização do Imóvel</h3>
              <p className="text-stone-600 leading-relaxed">Seu imóvel vale mais com energia solar. Valorização média de 8% + IPCA.</p>
            </motion.div>

            <motion.div
              whileHover={{ y: -8 }}
              className="bg-white rounded-2xl p-8 border border-stone-100 shadow-sm hover:shadow-md transition-all duration-300"
            >
              <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mb-6">
                <Zap className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-secondary mb-3">Energia Limpa</h3>
              <p className="text-stone-600 leading-relaxed">Contribua para um planeta mais sustentável com energia 100% renovável.</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-amber-500 to-orange-500">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">Pronto para economizar?</h2>
          <p className="text-xl text-amber-50 mb-8">Faça sua simulação gratuita em menos de 2 minutos</p>
          <Button
            size="lg"
            className="bg-white text-primary hover:bg-amber-50 h-14 px-10 rounded-full font-semibold shadow-xl text-lg"
            onClick={() => navigate('/simulador')}
            data-testid="cta-simulator-btn"
          >
            Simular Agora
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-stone-900 text-stone-300 py-12 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <img
              src="/logo_site.png"
              alt="Alluz Energia"
              className="w-8 h-8 object-contain"
            />
            <span className="text-2xl font-bold text-white">Alluz Energia</span>
          </div>
          <p className="mb-4">Alluz. Onde há luz, lá nos estaremos!</p>
          <p className="text-sm text-stone-400">CNPJ: 34.782.317/0001-49</p>
          <div className="flex justify-center gap-6 mt-6">
            <a href="https://www.instagram.com/alluzenergia/" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
              Instagram
            </a>
            <a href="https://alluzenergia.com.br/" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
              Site Oficial
            </a>
            <a href="https://wa.me/5544988574869" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
              WhatsApp
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
