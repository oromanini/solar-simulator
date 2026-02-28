import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";
import { API } from "@/App";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      const endpoint = isRegister ? "/auth/register" : "/auth/login";
      await axios.post(`${API}${endpoint}`, form, { withCredentials: true });
      navigate("/admin");
    } catch (error) {
      const message = error.response?.data?.detail || "Não foi possível autenticar.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-100 via-orange-50 to-stone-100 noise-bg flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-12"
      >
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-6">
            <img
              src="/logo_site.svg"
              alt="Alluz Energia"
              className="w-14 h-14 object-contain"
            />
            <span className="text-3xl font-bold text-secondary">Alluz Energia</span>
          </div>
          <h1 className="text-2xl font-bold text-secondary mb-2">Área Administrativa</h1>
          <p className="text-stone-600">Acesso restrito a administradores</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {isRegister && (
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Seu nome completo"
                required
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="email@empresa.com"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              placeholder="••••••••"
              required
            />
          </div>
          <Button
            type="submit"
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-12 rounded-full font-semibold shadow-lg"
            disabled={isSubmitting}
          >
            {isRegister ? "Cadastrar e entrar" : "Entrar"}
          </Button>
        </form>

        <div className="mt-4 text-center text-sm text-stone-600">
          {isRegister ? "Já possui cadastro?" : "Primeiro acesso?"}{" "}
          <button
            type="button"
            onClick={() => setIsRegister((prev) => !prev)}
            className="text-primary font-semibold hover:underline"
          >
            {isRegister ? "Entrar" : "Cadastrar"}
          </button>
        </div>

        <div className="mt-8 text-center">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="text-stone-600 hover:text-primary"
            data-testid="back-to-home-button"
          >
            ← Voltar ao site
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
