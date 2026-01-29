import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Sun, CheckCircle2, ArrowRight, Instagram } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ThankYouPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-100 via-orange-50 to-stone-100 noise-bg flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-2xl w-full bg-white rounded-3xl shadow-2xl p-12 text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="inline-flex items-center justify-center w-24 h-24 bg-green-100 rounded-full mb-8"
        >
          <CheckCircle2 className="w-12 h-12 text-green-600" />
        </motion.div>

        <h1 className="text-4xl md:text-5xl font-bold text-secondary mb-6">
          Obrigado!
        </h1>

        <p className="text-xl text-stone-600 mb-8 leading-relaxed">
          Seu projeto foi gerado com sucesso! Em breve, nossa equipe entrará em contato para dar continuidade.
        </p>

        <div className="bg-gradient-to-br from-primary to-amber-600 rounded-2xl p-8 text-white mb-8">
          <h2 className="text-2xl font-bold mb-4">🎉 Oferta Especial!</h2>
          <p className="text-lg mb-4">
            <strong>A Alluz atende todo o Brasil</strong> e estamos com ofertas especiais que vão até o final do mês!
          </p>
          <p className="text-amber-100">
            Ao ser atendido, diga que veio do simulador e ganhe <strong>1 ano de seguro grátis</strong> ao concretizar o projeto! 🛡️
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            size="lg"
            onClick={() => window.open('https://wa.me/5544988574869', '_blank')}
            className="bg-green-600 text-white hover:bg-green-700 h-12 px-8 rounded-full font-semibold"
            data-testid="whatsapp-button"
          >
            Falar no WhatsApp
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>

          <Button
            size="lg"
            variant="outline"
            onClick={() => navigate('/')}
            className="h-12 px-8 rounded-full font-semibold"
            data-testid="home-button"
          >
            Voltar ao Início
          </Button>
        </div>

        <div className="mt-12 pt-8 border-t border-stone-200">
          <div className="flex items-center justify-center gap-4 text-stone-500">
            <a href="https://www.instagram.com/alluzenergia/" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
              <Instagram className="w-6 h-6" />
            </a>
            <span className="text-sm">Alluz Energia - CNPJ: 34.782.317/0001-49</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}