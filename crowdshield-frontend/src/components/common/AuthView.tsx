import React, { useState } from 'react';
import { ViewMode } from '../../types';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { 
  ShieldCheck, 
  Lock, 
  Smartphone, 
  ArrowRight, 
  Cpu, 
  Volume2, 
  FileSpreadsheet, 
  CheckCircle2, 
  Layers, 
  PhoneCall, 
  Camera, 
  ShieldAlert,
  HardDrive,
  Mail,
  KeyRound,
  User,
  Menu,
  X,
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';

interface AuthViewProps {
  onLogin: (mode: ViewMode) => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ onLogin }) => {
  const { login } = useAuth();
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Login Credentials State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Register Credentials State
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const response = await api.post('/auth/login', {
        email,
        password,
      });
      
      login(response.data.access_token);
      const role = response.data.role;
      onLogin(role === 'ADMIN' ? 'admin' : 'citizen');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Incorrect email or password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const response = await api.post('/auth/register', {
        name: registerName,
        email: registerEmail,
        password: registerPassword,
      });
      
      login(response.data.access_token);
      onLogin('citizen');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Registration failed. Email may already be in use.');
    } finally {
      setIsLoading(false);
    }
  };

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#FAFAF7] text-[#151726] flex flex-col font-body relative overflow-x-hidden w-full selection:bg-[#2C7BE5]/20">
      {/* Light Ambient Decorative Background Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-[400px] sm:h-[500px] bg-gradient-to-b from-[#2C7BE5]/10 via-[#7C6CFF]/5 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute top-[600px] right-0 w-60 sm:w-[500px] h-60 sm:h-[500px] bg-[#22D3A6]/10 rounded-full blur-3xl pointer-events-none overflow-hidden" />

      {/* Top Navbar */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-[#E7E5DD] px-4 sm:px-6 py-3 sm:py-4 shadow-xs w-full">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          {/* Logo */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#2C7BE5] text-white flex items-center justify-center shadow-md font-heading font-bold text-base sm:text-lg shrink-0">
              <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-heading font-bold text-base sm:text-xl tracking-tight text-[#151726] flex items-center gap-1.5 sm:gap-2 truncate">
                CrowdShield <span className="text-[10px] sm:text-xs bg-[#2C7BE5]/10 text-[#2C7BE5] border border-[#2C7BE5]/30 px-2 py-0.5 rounded-full font-mono font-bold shrink-0">v3.4</span>
              </span>
              <span className="text-[10px] sm:text-[11px] text-[#059669] font-mono-num flex items-center gap-1 font-semibold truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-[#059669] animate-ping shrink-0" />
                NDRF Sentinel AI
              </span>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden lg:flex items-center gap-8 text-xs font-semibold text-[#5B5F73]">
            <button onClick={() => scrollToSection('features')} className="hover:text-[#2C7BE5] transition-colors cursor-pointer bg-transparent border-none">
              Platform Features
            </button>
            <button onClick={() => scrollToSection('login-deck')} className="hover:text-[#2C7BE5] transition-colors cursor-pointer bg-transparent border-none">
              Authentication Gateways
            </button>
            <button onClick={() => scrollToSection('features')} className="hover:text-[#2C7BE5] transition-colors cursor-pointer bg-transparent border-none">
              YOLO Vision Engine
            </button>
            <button onClick={() => scrollToSection('features')} className="hover:text-[#2C7BE5] transition-colors cursor-pointer bg-transparent border-none">
              NDRF Compliance
            </button>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              onClick={() => {
                setAuthMode('register');
                scrollToSection('login-deck');
              }}
              className="px-3 sm:px-4 py-2 rounded-xl bg-[#22D3A6] hover:bg-[#1ebf95] text-[#151726] text-xs font-heading font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95 border-none"
            >
              <Smartphone className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Register</span>
            </button>

            <button
              onClick={() => {
                setAuthMode('login');
                scrollToSection('login-deck');
              }}
              className="px-3 sm:px-4 py-2 rounded-xl bg-[#151726] hover:bg-[#25283e] text-white text-xs font-heading font-bold transition-all cursor-pointer shadow-sm active:scale-95 border-none"
            >
              <span>Sign In</span>
            </button>

            {/* Mobile Hamburger Toggle */}
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-[#151726] hover:bg-[#FAFAF7] rounded-lg border border-[#E7E5DD] ml-1 bg-transparent"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden mt-3 pt-3 border-t border-[#E7E5DD] flex flex-col gap-2.5 pb-2 text-xs font-semibold text-[#5B5F73]">
            <button onClick={() => scrollToSection('features')} className="text-left py-1.5 hover:text-[#2C7BE5] bg-transparent border-none">
              Platform Features
            </button>
            <button onClick={() => scrollToSection('login-deck')} className="text-left py-1.5 hover:text-[#2C7BE5] bg-transparent border-none">
              Authentication Gateways
            </button>
            <button onClick={() => scrollToSection('features')} className="text-left py-1.5 hover:text-[#2C7BE5] bg-transparent border-none">
              YOLO Vision Engine
            </button>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative px-4 sm:px-6 pt-8 sm:pt-16 pb-12 sm:pb-20 max-w-7xl mx-auto w-full flex flex-col items-center text-center z-10">
        <div className="inline-flex items-center gap-1.5 sm:gap-2 bg-[#2C7BE5]/10 border border-[#2C7BE5]/30 px-3 sm:px-4 py-1.5 rounded-full text-[10px] sm:text-xs font-mono-num font-bold text-[#2C7BE5] mb-4 sm:mb-6 shadow-xs max-w-full">
          <ShieldAlert className="w-3.5 h-3.5 text-[#059669] shrink-0" />
          <span className="truncate">ZERO STAMPEDE TARGET · AI SURGE PREVENTION ENGINE</span>
        </div>

        <h1 className="font-heading font-bold text-2xl sm:text-5xl lg:text-6xl text-[#151726] tracking-tight max-w-4xl leading-[1.2] sm:leading-[1.15]">
          Predict the Surge. Prevent the Crush.
          <span className="bg-gradient-to-r from-[#2C7BE5] via-[#7C6CFF] to-[#059669] bg-clip-text text-transparent"> AI-powered crowd intelligence</span> that sees danger before it unfolds.
        </h1>

        <p className="mt-3 sm:mt-6 text-xs sm:text-base text-[#5B5F73] max-w-2xl leading-relaxed font-medium px-2">
          CrowdShield transforms live CCTV and aerial feeds into real-time crowd intelligence—detecting dangerous density, bottlenecks and abnormal movement to predict risks early and help authorities act before conditions become critical.
        </p>

        {/* Hero CTAs */}
        <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 w-full sm:w-auto px-2">
          <button
            onClick={() => {
              setAuthMode('login');
              scrollToSection('login-deck');
            }}
            className="px-5 sm:px-6 py-3.5 bg-[#2C7BE5] hover:bg-[#2066c6] text-white rounded-2xl font-heading font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg hover:shadow-[#2C7BE5]/25 transition-all cursor-pointer active:scale-95 border-none"
          >
            <Lock className="w-4 h-4 shrink-0" />
            <span>Sign In to Platform</span>
            <ArrowRight className="w-4 h-4 shrink-0" />
          </button>

          <button
            onClick={() => {
              setAuthMode('register');
              scrollToSection('login-deck');
            }}
            className="px-5 sm:px-6 py-3.5 bg-[#22D3A6] hover:bg-[#1ebf95] text-[#151726] rounded-2xl font-heading font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg hover:shadow-[#22D3A6]/25 transition-all cursor-pointer active:scale-95 border-none"
          >
            <Smartphone className="w-4 h-4 shrink-0" />
            <span>Register Citizen Account</span>
          </button>
        </div>

        {/* Real-time System Key Statistics Cards */}
        <div className="mt-10 sm:mt-16 w-full max-w-5xl grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 p-4 sm:p-6 bg-white border border-[#E7E5DD] rounded-2xl sm:rounded-3xl shadow-sm">
          <div className="flex flex-col items-center p-2 sm:p-3 border-r border-b sm:border-b-0 border-[#E7E5DD]">
            <span className="font-mono-num text-xl sm:text-3xl font-bold text-[#2C7BE5]">1.4M+</span>
            <span className="text-[10px] sm:text-[11px] text-[#5B5F73] mt-1 uppercase tracking-wider font-semibold text-center">Crowd Tracked</span>
          </div>

          <div className="flex flex-col items-center p-2 sm:p-3 sm:border-r border-b sm:border-b-0 border-[#E7E5DD]">
            <span className="font-mono-num text-xl sm:text-3xl font-bold text-[#059669]">&lt; 50ms</span>
            <span className="text-[10px] sm:text-[11px] text-[#5B5F73] mt-1 uppercase tracking-wider font-semibold text-center">YOLO Latency</span>
          </div>

          <div className="flex flex-col items-center p-2 sm:p-3 border-r border-[#E7E5DD]">
            <span className="font-mono-num text-xl sm:text-3xl font-bold text-[#7C6CFF]">5 Languages</span>
            <span className="text-[10px] sm:text-[11px] text-[#5B5F73] mt-1 uppercase tracking-wider font-semibold text-center">Neural Voice</span>
          </div>

          <div className="flex flex-col items-center p-2 sm:p-3">
            <span className="font-mono-num text-xl sm:text-3xl font-bold text-[#D97706]">99.8%</span>
            <span className="text-[10px] sm:text-[11px] text-[#5B5F73] mt-1 uppercase tracking-wider font-semibold text-center">Surge Prevent</span>
          </div>
        </div>
      </section>

      {/* Dedicated Authentication Gateways Deck Section */}
      <section id="login-deck" className="px-4 sm:px-6 py-10 sm:py-16 bg-white border-y border-[#E7E5DD] z-10 w-full">
        <div className="max-w-4xl mx-auto flex flex-col items-center">
          <div className="text-center mb-6 sm:mb-8">
            <span className="text-xs font-mono-num font-bold text-[#2C7BE5] uppercase tracking-wider bg-[#2C7BE5]/10 px-3 py-1 rounded-full border border-[#2C7BE5]/20">
              Authentication Gateway
            </span>
            <h2 className="font-heading font-bold text-2xl sm:text-3xl text-[#151726] mt-3">
              {authMode === 'login' ? 'Sign In to Your Account' : 'Register Citizen Account'}
            </h2>
            <p className="text-xs text-[#5B5F73] mt-1.5 px-2 max-w-md">
              {authMode === 'login' 
                ? 'Enter your registered email and passcode to access your dashboard.'
                : 'Create an account as a citizen to access density alerts and report emergency SOS.'}
            </p>
          </div>

          {/* Login/Register Card Container */}
          <div className="w-full max-w-md bg-[#FAFAF7] border border-[#E7E5DD] rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-md relative">
            {/* Enhanced Error Banner */}
            {errorMsg && (
              <div className="mb-5 p-3 sm:p-4 rounded-xl bg-red-50 border border-red-500/50 flex items-start gap-3 text-red-700 text-xs font-semibold animate-fadeIn shadow-sm">
                <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />
                <span className="mt-0.5 leading-relaxed">{errorMsg}</span>
              </div>
            )}

            {authMode === 'login' ? (
              <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1 border-b border-[#E7E5DD] pb-3">
                  <h3 className="font-heading font-bold text-base text-[#151726] flex items-center gap-2">
                    <Lock className="w-4 h-4 text-[#2C7BE5] shrink-0" />
                    <span>Secure Sign In</span>
                  </h3>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-[#5B5F73] uppercase tracking-wider flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-[#2C7BE5]" />
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@domain.com"
                    className="w-full mt-1.5 p-3 rounded-xl bg-white border border-[#E7E5DD] text-xs text-[#151726] focus:outline-none focus:border-[#2C7BE5] focus:ring-2 focus:ring-[#2C7BE5]/20"
                    required
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-[#5B5F73] uppercase tracking-wider flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-[#2C7BE5]" />
                    Security Passcode
                  </label>
                  <div className="relative mt-1.5">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full p-3 pr-10 rounded-xl bg-white border border-[#E7E5DD] text-xs text-[#151726] focus:outline-none focus:border-[#2C7BE5] focus:ring-2 focus:ring-[#2C7BE5]/20"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5B5F73] hover:text-[#2C7BE5] transition-colors cursor-pointer bg-transparent border-none"
                      title={showPassword ? "Hide Password" : "Show Password"}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="mt-2 py-3 bg-[#2C7BE5] hover:bg-[#2066c6] text-white rounded-xl font-heading font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed border-none"
                >
                  <span>{isLoading ? 'Signing In...' : 'Authenticate & Launch Portal'}</span>
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </button>

                <div className="text-center mt-3 pt-3 border-t border-[#E7E5DD] text-xs">
                  <span className="text-[#5B5F73]">Don't have a citizen account? </span>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('register');
                      setErrorMsg(null);
                    }}
                    className="text-[#2C7BE5] font-bold hover:underline cursor-pointer bg-transparent border-none"
                  >
                    Register as Citizen
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1 border-b border-[#E7E5DD] pb-3">
                  <h3 className="font-heading font-bold text-base text-[#151726] flex items-center gap-2">
                    <User className="w-4 h-4 text-[#22D3A6] shrink-0" />
                    <span>Citizen Registration</span>
                  </h3>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-[#5B5F73] uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-[#2C7BE5]" />
                    Full Name / Alias
                  </label>
                  <input
                    type="text"
                    value={registerName}
                    onChange={(e) => setRegisterName(e.target.value)}
                    placeholder="Ananya Sharma"
                    className="w-full mt-1.5 p-3 rounded-xl bg-white border border-[#E7E5DD] text-xs text-[#151726] focus:outline-none focus:border-[#22D3A6] focus:ring-2 focus:ring-[#22D3A6]/20"
                    required
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-[#5B5F73] uppercase tracking-wider flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-[#2C7BE5]" />
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    placeholder="name@domain.com"
                    className="w-full mt-1.5 p-3 rounded-xl bg-white border border-[#E7E5DD] text-xs text-[#151726] focus:outline-none focus:border-[#22D3A6] focus:ring-2 focus:ring-[#22D3A6]/20"
                    required
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-[#5B5F73] uppercase tracking-wider flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-[#2C7BE5]" />
                    Create Password
                  </label>
                  <div className="relative mt-1.5">
                    <input
                      type={showRegisterPassword ? "text" : "password"}
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full p-3 pr-10 rounded-xl bg-white border border-[#E7E5DD] text-xs text-[#151726] focus:outline-none focus:border-[#22D3A6] focus:ring-2 focus:ring-[#22D3A6]/20"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5B5F73] hover:text-[#22D3A6] transition-colors cursor-pointer bg-transparent border-none"
                      title={showRegisterPassword ? "Hide Password" : "Show Password"}
                    >
                      {showRegisterPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="mt-2 py-3 bg-[#22D3A6] hover:bg-[#1ebf95] text-[#151726] rounded-xl font-heading font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed border-none"
                >
                  <span>{isLoading ? 'Creating Account...' : 'Register & Enter Portal'}</span>
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </button>

                <div className="text-center mt-3 pt-3 border-t border-[#E7E5DD] text-xs">
                  <span className="text-[#5B5F73]">Already have an account? </span>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('login');
                      setErrorMsg(null);
                    }}
                    className="text-[#2C7BE5] font-bold hover:underline cursor-pointer bg-transparent border-none"
                  >
                    Sign In here
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* Platform Features Grid */}
      <section id="features" className="px-4 sm:px-6 py-12 sm:py-20 max-w-7xl mx-auto w-full z-10">
        <div className="text-center mb-10 sm:mb-16">
          <span className="text-xs font-mono-num font-bold text-[#2C7BE5] uppercase tracking-widest bg-[#2C7BE5]/10 px-3 py-1 rounded-full border border-[#2C7BE5]/20">
            End-To-End Architecture
          </span>
          <h2 className="font-heading font-bold text-2xl sm:text-4xl text-[#151726] mt-3">
            Built for Extreme Density & High-Stakes Public Safety
          </h2>
          <p className="text-xs sm:text-sm text-[#5B5F73] mt-2 max-w-xl mx-auto">
            Combining multi-camera computer vision, physics flow simulations, neural voice broadcasts, and citizen SOS feeds.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Card 1 */}
          <div className="bg-white border border-[#E7E5DD] rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-xs hover:border-[#2C7BE5]/50 transition-all flex flex-col justify-between gap-4">
            <div className="flex flex-col gap-3">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#2C7BE5]/10 text-[#2C7BE5] border border-[#2C7BE5]/30 flex items-center justify-center shrink-0">
                <Cpu className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <h3 className="font-heading font-bold text-base sm:text-lg text-[#151726]">YOLO v8 Vision Engine</h3>
              <p className="text-xs text-[#5B5F73] leading-relaxed">
                Sub-50ms person counting, crowd density heatmaps, bounding box annotations, and velocity anomaly detection on edge camera nodes.
              </p>
            </div>
            <span className="text-[11px] font-mono-num text-[#2C7BE5] font-bold">NVIDIA CUDA Accelerated ➔</span>
          </div>

          {/* Card 2 */}
          <div className="bg-white border border-[#E7E5DD] rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-xs hover:border-[#7C6CFF]/50 transition-all flex flex-col justify-between gap-4">
            <div className="flex flex-col gap-3">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#7C6CFF]/10 text-[#7C6CFF] border border-[#7C6CFF]/30 flex items-center justify-center shrink-0">
                <Layers className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <h3 className="font-heading font-bold text-base sm:text-lg text-[#151726]">3D Spatial Digital Twin</h3>
              <p className="text-xs text-[#5B5F73] leading-relaxed">
                Microscopic crowd physics simulation engine modeling laminar vs turbulent fluid vectors, gate compression shockwaves, and stress limits.
              </p>
            </div>
            <span className="text-[11px] font-mono-num text-[#7C6CFF] font-bold">Vector Dynamic Physics ➔</span>
          </div>

          {/* Card 3 */}
          <div className="bg-white border border-[#E7E5DD] rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-xs hover:border-[#059669]/50 transition-all flex flex-col justify-between gap-4">
            <div className="flex flex-col gap-3">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#22D3A6]/20 text-[#059669] border border-[#22D3A6]/40 flex items-center justify-center shrink-0">
                <Volume2 className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <h3 className="font-heading font-bold text-base sm:text-lg text-[#151726]">Bhashini Multilingual PA</h3>
              <p className="text-xs text-[#5B5F73] leading-relaxed">
                Autonomous 1-click audio broadcast generator in Hindi, Odia, Bengali, Tamil, and English with neural speech synthesis for panic reduction.
              </p>
            </div>
            <span className="text-[11px] font-mono-num text-[#059669] font-bold">5 Language Neural Voice ➔</span>
          </div>

          {/* Card 4 */}
          <div className="bg-white border border-[#E7E5DD] rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-xs hover:border-[#FF7A45]/50 transition-all flex flex-col justify-between gap-4">
            <div className="flex flex-col gap-3">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#FF7A45]/10 text-[#FF7A45] border border-[#FF7A45]/30 flex items-center justify-center shrink-0">
                <Camera className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <h3 className="font-heading font-bold text-base sm:text-lg text-[#151726]">Citizen Photo & Video SOS</h3>
              <p className="text-xs text-[#5B5F73] leading-relaxed">
                Mobile companion for visitors to submit instant photo and video reports of blocked gates or fainting incidents directly to the control room.
              </p>
            </div>
            <span className="text-[11px] font-mono-num text-[#FF7A45] font-bold">Image & Video Evidence ➔</span>
          </div>

          {/* Card 5 */}
          <div className="bg-white border border-[#E7E5DD] rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-xs hover:border-[#D97706]/50 transition-all flex flex-col justify-between gap-4">
            <div className="flex flex-col gap-3">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#FFB627]/15 text-[#D97706] border border-[#FFB627]/40 flex items-center justify-center shrink-0">
                <HardDrive className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <h3 className="font-heading font-bold text-base sm:text-lg text-[#151726]">IndexedDB Offline Sync</h3>
              <p className="text-xs text-[#5B5F73] leading-relaxed">
                Zero-packet-loss edge daemon buffers event telemetry locally in IndexedDB when network connectivity drops, syncing automatically on recovery.
              </p>
            </div>
            <span className="text-[11px] font-mono-num text-[#D97706] font-bold">Zero Data Loss Cache ➔</span>
          </div>

          {/* Card 6 */}
          <div className="bg-white border border-[#E7E5DD] rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-xs hover:border-[#FF3B5C]/50 transition-all flex flex-col justify-between gap-4">
            <div className="flex flex-col gap-3">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#FF3B5C]/10 text-[#FF3B5C] border border-[#FF3B5C]/30 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <h3 className="font-heading font-bold text-base sm:text-lg text-[#151726]">NDRF Audit & CSV Export</h3>
              <p className="text-xs text-[#5B5F73] leading-relaxed">
                One-click legal audit log exports, historical bottleneck frequency bar charts, and compliance documentation for disaster management authorities.
              </p>
            </div>
            <span className="text-[11px] font-mono-num text-[#FF3B5C] font-bold">Disaster Compliance Ready ➔</span>
          </div>
        </div>
      </section>

      {/* Multi-Column Footer */}
      <footer className="bg-white border-t border-[#E7E5DD] text-[#5B5F73] font-body pt-12 sm:pt-16 pb-8 sm:pb-12 px-4 sm:px-6 z-10 w-full">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 sm:gap-10 pb-10 border-b border-[#E7E5DD]">
          {/* Brand Col */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#2C7BE5] text-white flex items-center justify-center shadow-md font-bold shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <span className="font-heading font-bold text-lg sm:text-xl text-[#151726]">CrowdShield AI</span>
            </div>
            <p className="text-xs text-[#5B5F73] leading-relaxed max-w-sm">
              National AI Safety Sentinel for crowd surge monitoring, stampede prevention, YOLO computer vision analytics, and disaster management authority integration.
            </p>

            <div className="flex items-center gap-3 mt-1">
              <div className="p-2.5 bg-[#FAFAF7] border border-[#E7E5DD] rounded-xl flex items-center gap-2 shadow-xs max-w-full">
                <PhoneCall className="w-4 h-4 text-[#FF3B5C] animate-pulse shrink-0" />
                <span className="text-xs font-mono-num font-bold text-[#151726] truncate">National Emergency Helpline: 112 / 108</span>
              </div>
            </div>
          </div>

          {/* Col 1 */}
          <div className="flex flex-col gap-2.5">
            <span className="font-heading font-bold text-xs text-[#151726] uppercase tracking-wider">Control Deck</span>
            <ul className="flex flex-col gap-2 text-xs">
              <li>
                <button onClick={() => { setAuthMode('login'); scrollToSection('login-deck'); }} className="hover:text-[#2C7BE5] transition-colors cursor-pointer bg-transparent border-none p-0 text-[#5B5F73]">
                  Command Dashboard
                </button>
              </li>
              <li>
                <button onClick={() => { setAuthMode('login'); scrollToSection('login-deck'); }} className="hover:text-[#2C7BE5] transition-colors cursor-pointer bg-transparent border-none p-0 text-[#5B5F73]">
                  Live GIS Map
                </button>
              </li>
              <li>
                <button onClick={() => { setAuthMode('login'); scrollToSection('login-deck'); }} className="hover:text-[#2C7BE5] transition-colors cursor-pointer bg-transparent border-none p-0 text-[#5B5F73]">
                  YOLO Camera Feeds
                </button>
              </li>
              <li>
                <button onClick={() => { setAuthMode('login'); scrollToSection('login-deck'); }} className="hover:text-[#2C7BE5] transition-colors cursor-pointer bg-transparent border-none p-0 text-[#5B5F73]">
                  Sentinel AI Alerts
                </button>
              </li>
            </ul>
          </div>

          {/* Col 2 */}
          <div className="flex flex-col gap-2.5">
            <span className="font-heading font-bold text-xs text-[#151726] uppercase tracking-wider">Citizen Companion</span>
            <ul className="flex flex-col gap-2 text-xs">
              <li>
                <button onClick={() => { setAuthMode('login'); scrollToSection('login-deck'); }} className="hover:text-[#059669] transition-colors cursor-pointer bg-transparent border-none p-0 text-[#5B5F73]">
                  Live Density Gauge
                </button>
              </li>
              <li>
                <button onClick={() => { setAuthMode('login'); scrollToSection('login-deck'); }} className="hover:text-[#059669] transition-colors cursor-pointer bg-transparent border-none p-0 text-[#5B5F73]">
                  Evacuation Path Finder
                </button>
              </li>
              <li>
                <button onClick={() => { setAuthMode('login'); scrollToSection('login-deck'); }} className="hover:text-[#059669] transition-colors cursor-pointer bg-transparent border-none p-0 text-[#5B5F73]">
                  Photo & Video SOS Upload
                </button>
              </li>
              <li>
                <button onClick={() => { setAuthMode('login'); scrollToSection('login-deck'); }} className="hover:text-[#059669] transition-colors cursor-pointer bg-transparent border-none p-0 text-[#5B5F73]">
                  Bhashini Multilingual PA
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3 */}
          <div className="flex flex-col gap-2.5">
            <span className="font-heading font-bold text-xs text-[#151726] uppercase tracking-wider">NDRF Compliance</span>
            <ul className="flex flex-col gap-2 text-xs">
              <li className="hover:text-[#151726] transition-colors cursor-pointer">Disaster Management Act 2005</li>
              <li className="hover:text-[#151726] transition-colors cursor-pointer">ISO 22301 Public Resilience</li>
              <li className="hover:text-[#151726] transition-colors cursor-pointer">Anonymized YOLO Feeds</li>
              <li className="hover:text-[#151726] transition-colors cursor-pointer">IndexedDB Buffer Audit</li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="max-w-7xl mx-auto pt-6 flex flex-col sm:flex-row items-center justify-between text-[11px] text-[#5B5F73] gap-3 text-center sm:text-left">
          <span>© 2026 CrowdShield AI Infrastructure. All rights reserved.</span>
          <div className="flex flex-wrap justify-center items-center gap-4">
            <span className="hover:text-[#151726] cursor-pointer">Privacy Policy</span>
            <span className="hover:text-[#151726] cursor-pointer">Terms of Service</span>
            <span className="hover:text-[#151726] cursor-pointer">Disaster Audit Accreditation</span>
          </div>
        </div>
      </footer>
    </div>
  );
};