import { useEffect, useState, useRef } from "react";
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import "@/App.css";
import LandingPage from "@/pages/LandingPage";
import SimulatorPage from "@/pages/SimulatorPage";
import ResultPage from "@/pages/ResultPage";
import ThankYouPage from "@/pages/ThankYouPage";
import AdminLogin from "@/pages/AdminLogin";
import AdminDashboard from "@/pages/AdminDashboard";
import AuthCallback from "@/pages/AuthCallback";
import ProtectedRoute from "@/components/ProtectedRoute";

const BACKEND_URL = "https://solar-backend-628533922400.us-central1.run.app";
export const API = `${BACKEND_URL}/api`;

function AppRouter() {
  const location = useLocation();
  // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }
  
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/simulador" element={<SimulatorPage />} />
      <Route path="/resultado" element={<ResultPage />} />
      <Route path="/obrigado" element={<ThankYouPage />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={
        <ProtectedRoute>
          <AdminDashboard />
        </ProtectedRoute>
      } />
    </Routes>
  );
}

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AppRouter />
        <Toaster position="top-right" />
      </BrowserRouter>
    </div>
  );
}

export default App;
