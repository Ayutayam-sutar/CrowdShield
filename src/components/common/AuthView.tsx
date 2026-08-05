import React, { useState } from 'react';
import { ViewMode } from '../../types';
import { 
  ShieldCheck, 
  Lock, 
  Smartphone, 
  ArrowRight, 
  Activity, 
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
  Sparkles
} from 'lucide-react';

interface AuthViewProps {
  onLogin: (mode: ViewMode) => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ onLogin }) => {
  const [activeTab, setActiveTab] = useState<'admin' | 'citizen'>('citizen');

  // Citizen Authentication State
  const [citizenContact, setCitizenContact] = useState('+91 98765-43210');
  const [citizenName, setCitizenName] = useState('Ananya Sharma');
  const [citizenOtp, setCitizenOtp] = useState('492-015');
  const [selectedCitizenVenue, setSelectedCitizenVenue] = useState('Jawaharlal Nehru Stadium - Sector 7G');

  // Admin Authentication State
  const [operatorId, setOperatorId] = useState('OP-7742');
  const [password, setPassword] = useState('••••••••');
  const [selectedAdminVenue, setSelectedAdminVenue] = useState('Jawaharlal Nehru Stadium - Sector 7G');
  const [mfaCode, setMfaCode] = useState('948-210');

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin('admin');
  };

  const handleCitizenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin('citizen');
  };

  const fillDemoAdmin = () => {
    setOperatorId('CHIEF-OPERATOR-01');
    setPassword('Sentinel2026#Secure');
    setMfaCode('882-194');
  };

  const fillDemoCitizen = () => {
    setCitizenContact('+91 98765-43210');
    setCitizenName('Rahul Verma');
    setCitizenOtp('881-304');
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#FAFAF7] text-[#151726] flex flex-col font-body relative overflow-x-hidden w-full max-w-full">
      {/* Light Ambient Decorative Background Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-[500px] bg-gradient-to-b from-[#2C7BE5]/10 via-[#7C6CFF]/5 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute top-[700px] right-0 w-72 sm:w-[500px] h-72 sm:h-[500px] bg-[#22D3A6]/10 rounded-full blur-3xl pointer-events-none overflow-hidden" />

      {/* Top Navbar */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-[#E7E5DD] px-4 sm:px-6 py-3.5 sm:py-4 shadow-sm w-full">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          {/* Logo */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#2C7BE5] text-white flex items-center justify-center shadow-md font-heading font-bold text-base sm:text-lg shrink-0">
              <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-heading font-bold text-lg sm:text-xl tracking-tight text-[#151726] flex items-center gap-1.5 sm:gap-2 truncate">
                CrowdShield <span className="text-[10px] sm:text-xs bg-[#2C7BE5]/10 text-[#2C7BE5] border border-[#2C7BE5]/30 px-2 py-0.5 rounded-full font-mono font-bold shrink-0">v3.4</span>
              </span>
              <span className="text-[10px] sm:text-[11px] text-[#059669] font-mono-num flex items-center gap-1 font-semibold truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-[#059669] animate-ping shrink-0" />
                NDRF Sentinel AI
              </span>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="hidden lg:flex items-center gap-8 text-xs font-semibold text-[#5B5F73]">
            <button onClick={() => scrollToSection('features')} className="hover:text-[#2C7BE5] transition-colors cursor-pointer">
              Platform Features
            </button>
            <button onClick={() => scrollToSection('login-deck')} className="hover:text-[#2C7BE5] transition-colors cursor-pointer">
              Authentication Gateways
            </button>
            <button onClick={() => scrollToSection('architecture')} className="hover:text-[#2C7BE5] transition-colors cursor-pointer">
              YOLO Vision Engine
            </button>
            <button onClick={() => scrollToSection('compliance')} className="hover:text-[#2C7BE5] transition-colors cursor-pointer">
              NDRF Compliance
            </button>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              onClick={() => {
                setActiveTab('citizen');
                scrollToSection('login-deck');
              }}
              className="px-2.5 sm:px-4 py-2 rounded-xl bg-[#22D3A6] hover:bg-[#1ebf95] text-[#151726] text-xs font-heading font-bold flex items-center gap-1 sm:gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Smartphone className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Citizen Visitor</span>
              <span className="sm:hidden">Visitor</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('admin');
                scrollToSection('login-deck');
              }}
              className="px-2.5 sm:px-4 py-2 rounded-xl bg-[#151726] hover:bg-[#25283e] text-white text-xs font-heading font-bold transition-all cursor-pointer shadow-sm"
            >
              <span className="hidden sm:inline">Control Room</span>
              <span className="sm:hidden">Control</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative px-4 sm:px-6 pt-10 sm:pt-16 pb-14 sm:pb-20 max-w-7xl mx-auto w-full flex flex-col items-center text-center z-10">
        <div className="inline-flex items-center gap-1.5 sm:gap-2 bg-[#2C7BE5]/10 border border-[#2C7BE5]/30 px-3 sm:px-4 py-1.5 rounded-full text-[11px] sm:text-xs font-mono-num font-bold text-[#2C7BE5] mb-5 sm:mb-6 shadow-xs max-w-full truncate">
          <ShieldAlert className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#059669] shrink-0" />
          <span className="truncate">ZERO STAMPEDE TARGET · AI SURGE PREVENTION ENGINE</span>
        </div>

        <h1 className="font-heading font-bold text-3xl sm:text-5xl lg:text-6xl text-[#151726] tracking-tight max-w-4xl leading-[1.15] px-2">
          Prevent Crowd Crushes Before They Happen with <span className="bg-gradient-to-r from-[#2C7BE5] via-[#7C6CFF] to-[#059669] bg-clip-text text-transparent">YOLO Vision & Sentinel AI</span>
        </h1>

        <p className="mt-4 sm:mt-6 text-xs sm:text-base text-[#5B5F73] max-w-2xl leading-relaxed font-medium px-2">
          The comprehensive multi-tenant platform for major event venues, pilgrimages, and stadiums. Features sub-50ms computer vision density tracking, 3D spatial flow physics, 5-language Bhashini neural PA broadcasts, and citizen SOS media uploads.
        </p>

        {/* Hero CTAs */}
        <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 w-full sm:w-auto px-4">
          <button
            onClick={() => {
              setActiveTab('citizen');
              scrollToSection('login-deck');
            }}
            className="px-5 sm:px-6 py-3.5 bg-[#22D3A6] hover:bg-[#1ebf95] text-[#151726] rounded-2xl font-heading font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg hover:shadow-[#22D3A6]/25 transition-all cursor-pointer active:scale-95"
          >
            <Smartphone className="w-4 h-4" />
            <span>Enter Citizen Portal (Email / Mobile)</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('admin');
              scrollToSection('login-deck');
            }}
            className="px-5 sm:px-6 py-3.5 bg-[#2C7BE5] hover:bg-[#2066c6] text-white rounded-2xl font-heading font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg hover:shadow-[#2C7BE5]/25 transition-all cursor-pointer active:scale-95"
          >
            <Lock className="w-4 h-4" />
            <span>Control Room Command Deck</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Real-time System Key Statistics Cards */}
        <div className="mt-12 sm:mt-16 w-full max-w-5xl grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 p-4 sm:p-6 bg-white border border-[#E7E5DD] rounded-2xl sm:rounded-3xl shadow-[0_4px_24px_rgba(21,23,38,0.06)]">
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
      <section id="login-deck" className="px-4 sm:px-6 py-12 sm:py-16 bg-white border-y border-[#E7E5DD] z-10 w-full">
        <div className="max-w-6xl mx-auto flex flex-col items-center">
          <div className="text-center mb-6 sm:mb-8">
            <span className="text-xs font-mono-num font-bold text-[#2C7BE5] uppercase tracking-wider bg-[#2C7BE5]/10 px-3 py-1 rounded-full border border-[#2C7BE5]/20">
              Secure Gateway Access
            </span>
            <h2 className="font-heading font-bold text-2xl sm:text-3xl text-[#151726] mt-3">Select Your Login Role</h2>
            <p className="text-xs text-[#5B5F73] mt-1.5 px-2">
              Citizens log in with Email or Mobile Number. Control Room personnel use Security Credentials.
            </p>
          </div>

          {/* Role Switch Tabs */}
          <div className="flex items-center bg-[#FAFAF7] p-1.5 rounded-2xl border border-[#E7E5DD] mb-6 sm:mb-8 max-w-md w-full shadow-inner">
            <button
              onClick={() => setActiveTab('citizen')}
              className={`flex-1 py-2.5 sm:py-3 rounded-xl font-heading font-bold text-xs flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer ${
                activeTab === 'citizen'
                  ? 'bg-[#22D3A6] text-[#151726] shadow-md'
                  : 'text-[#5B5F73] hover:text-[#151726]'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>Citizen Visitor</span>
            </button>

            <button
              onClick={() => setActiveTab('admin')}
              className={`flex-1 py-2.5 sm:py-3 rounded-xl font-heading font-bold text-xs flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer ${
                activeTab === 'admin'
                  ? 'bg-[#2C7BE5] text-white shadow-md'
                  : 'text-[#5B5F73] hover:text-[#151726]'
              }`}
            >
              <Lock className="w-4 h-4" />
              <span>Control Room</span>
            </button>
          </div>

          {/* Login Card Container */}
          <div className="w-full max-w-2xl bg-[#FAFAF7] border border-[#E7E5DD] rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-[0_8px_30px_rgba(21,23,38,0.08)] relative">
            {activeTab === 'citizen' ? (
              <form onSubmit={handleCitizenSubmit} className="flex flex-col gap-4 sm:gap-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#E7E5DD] pb-4 gap-3">
                  <div>
                    <h3 className="font-heading font-bold text-lg sm:text-xl text-[#151726] flex items-center gap-2">
                      <Smartphone className="w-5 h-5 text-[#059669]" />
                      <span>Citizen Safety Portal Sign-In</span>
                    </h3>
                    <p className="text-xs text-[#5B5F73] mt-0.5">
                      Log in using Mobile Number or Email to view density and upload media SOS.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={fillDemoCitizen}
                    className="self-start sm:self-auto px-3 py-1 bg-[#22D3A6]/15 hover:bg-[#22D3A6]/25 border border-[#22D3A6]/40 text-[#059669] rounded-lg text-xs font-mono-num font-bold transition-colors cursor-pointer"
                  >
                    Demo Citizen Fill
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-semibold text-[#5B5F73] uppercase tracking-wider flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-[#2C7BE5]" />
                      Mobile Number or Email
                    </label>
                    <input
                      type="text"
                      value={citizenContact}
                      onChange={(e) => setCitizenContact(e.target.value)}
                      placeholder="+91 98765-43210 or email@domain.com"
                      className="w-full mt-1.5 p-3 rounded-xl bg-white border border-[#E7E5DD] text-xs text-[#151726] font-mono-num focus:outline-none focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/20"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-[#5B5F73] uppercase tracking-wider flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-[#2C7BE5]" />
                      Your Name / Visitor Alias
                    </label>
                    <input
                      type="text"
                      value={citizenName}
                      onChange={(e) => setCitizenName(e.target.value)}
                      className="w-full mt-1.5 p-3 rounded-xl bg-white border border-[#E7E5DD] text-xs text-[#151726] font-body focus:outline-none focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/20"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-semibold text-[#5B5F73] uppercase tracking-wider flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-[#2C7BE5]" />
                      Verification Code (OTP)
                    </label>
                    <input
                      type="text"
                      value={citizenOtp}
                      onChange={(e) => setCitizenOtp(e.target.value)}
                      className="w-full mt-1.5 p-3 rounded-xl bg-white border border-[#E7E5DD] text-xs text-[#151726] font-mono-num focus:outline-none focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/20"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-[#5B5F73] uppercase tracking-wider">Event Venue / Sector</label>
                    <select
                      value={selectedCitizenVenue}
                      onChange={(e) => setSelectedCitizenVenue(e.target.value)}
                      className="w-full mt-1.5 p-3 rounded-xl bg-white border border-[#E7E5DD] text-xs text-[#151726] font-body focus:outline-none focus:border-[#059669]"
                    >
                      <option value="Jawaharlal Nehru Stadium - Sector 7G">Jawaharlal Nehru Stadium · Sector 7G</option>
                      <option value="Kumbh Mela Sector 4 - Sangam Ghat">Kumbh Mela Sector 4 · Sangam Ghat Corridor</option>
                      <option value="Central Railway Station Concourse">Central Railway Station Concourse</option>
                    </select>
                  </div>
                </div>

                {/* Feature Callout */}
                <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-[#E7E5DD] flex items-center justify-between shadow-xs gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Camera className="w-5 h-5 text-[#059669] shrink-0" />
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-[#151726] block truncate">Photo & Video Media SOS Upload Enabled</span>
                      <span className="text-[11px] text-[#5B5F73] block truncate">Allows submitting live media clips directly to emergency controllers.</span>
                    </div>
                  </div>
                  <CheckCircle2 className="w-5 h-5 text-[#059669] shrink-0" />
                </div>

                <button
                  type="submit"
                  className="py-3.5 bg-[#22D3A6] hover:bg-[#1ebf95] text-[#151726] rounded-xl font-heading font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer active:scale-[0.99]"
                >
                  <span>Authenticate & Launch Citizen Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <form onSubmit={handleAdminSubmit} className="flex flex-col gap-4 sm:gap-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#E7E5DD] pb-4 gap-3">
                  <div>
                    <h3 className="font-heading font-bold text-lg sm:text-xl text-[#151726] flex items-center gap-2">
                      <Lock className="w-5 h-5 text-[#2C7BE5]" />
                      <span>Command Control Access</span>
                    </h3>
                    <p className="text-xs text-[#5B5F73] mt-0.5">
                      For Security Controllers, Police Marshals & AI Operators.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={fillDemoAdmin}
                    className="self-start sm:self-auto px-3 py-1 bg-[#2C7BE5]/10 hover:bg-[#2C7BE5]/20 border border-[#2C7BE5]/30 text-[#2C7BE5] rounded-lg text-xs font-mono-num font-bold transition-colors cursor-pointer"
                  >
                    Auto-Fill Credentials
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-semibold text-[#5B5F73] uppercase tracking-wider">Operator ID</label>
                    <input
                      type="text"
                      value={operatorId}
                      onChange={(e) => setOperatorId(e.target.value)}
                      className="w-full mt-1.5 p-3 rounded-xl bg-white border border-[#E7E5DD] text-xs text-[#151726] font-mono-num focus:outline-none focus:border-[#2C7BE5] focus:ring-2 focus:ring-[#2C7BE5]/20"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-[#5B5F73] uppercase tracking-wider">Security Passcode</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full mt-1.5 p-3 rounded-xl bg-white border border-[#E7E5DD] text-xs text-[#151726] font-mono-num focus:outline-none focus:border-[#2C7BE5] focus:ring-2 focus:ring-[#2C7BE5]/20"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-[#5B5F73] uppercase tracking-wider">Active Venue Command Node</label>
                  <select
                    value={selectedAdminVenue}
                    onChange={(e) => setSelectedAdminVenue(e.target.value)}
                    className="w-full mt-1.5 p-3 rounded-xl bg-white border border-[#E7E5DD] text-xs text-[#151726] font-body focus:outline-none focus:border-[#2C7BE5]"
                  >
                    <option value="Jawaharlal Nehru Stadium - Sector 7G">Jawaharlal Nehru Stadium · Sector 7G (12,450 Headcount)</option>
                    <option value="Kumbh Mela Sector 4 - Sangam Ghat">Kumbh Mela Sector 4 · Sangam Ghat Corridor (28,900 Headcount)</option>
                    <option value="Central Railway Station Concourse">Central Railway Station Concourse (54,200 Headcount)</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                  <div>
                    <label className="text-[11px] font-semibold text-[#5B5F73] uppercase tracking-wider">NDRF MFA Token</label>
                    <input
                      type="text"
                      value={mfaCode}
                      onChange={(e) => setMfaCode(e.target.value)}
                      className="w-full mt-1.5 p-3 rounded-xl bg-white border border-[#E7E5DD] text-xs text-[#151726] font-mono-num focus:outline-none focus:border-[#2C7BE5]"
                    />
                  </div>

                  <button
                    type="submit"
                    className="sm:mt-6 py-3.5 bg-[#2C7BE5] hover:bg-[#2066c6] text-white rounded-xl font-heading font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer active:scale-[0.99]"
                  >
                    <span>Authenticate & Launch Deck</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* Platform Features Grid */}
      <section id="features" className="px-6 py-20 max-w-7xl mx-auto w-full z-10">
        <div className="text-center mb-16">
          <span className="text-xs font-mono-num font-bold text-[#2C7BE5] uppercase tracking-widest bg-[#2C7BE5]/10 px-3 py-1 rounded-full border border-[#2C7BE5]/20">
            End-To-End Architecture
          </span>
          <h2 className="font-heading font-bold text-3xl sm:text-4xl text-[#151726] mt-4">
            Built for Extreme Density & High-Stakes Public Safety
          </h2>
          <p className="text-xs sm:text-sm text-[#5B5F73] mt-2 max-w-xl mx-auto">
            Combining multi-camera computer vision, physics flow simulations, neural voice broadcasts, and citizen SOS feeds.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="bg-white border border-[#E7E5DD] rounded-3xl p-6 shadow-[0_2px_12px_rgba(21,23,38,0.04)] hover:border-[#2C7BE5]/50 transition-all flex flex-col justify-between gap-4">
            <div className="flex flex-col gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#2C7BE5]/10 text-[#2C7BE5] border border-[#2C7BE5]/30 flex items-center justify-center">
                <Cpu className="w-6 h-6" />
              </div>
              <h3 className="font-heading font-bold text-lg text-[#151726]">YOLO v8 Vision Engine</h3>
              <p className="text-xs text-[#5B5F73] leading-relaxed">
                Sub-50ms person counting, crowd density heatmaps, bounding box annotations, and velocity anomaly detection on edge camera nodes.
              </p>
            </div>
            <span className="text-[11px] font-mono-num text-[#2C7BE5] font-bold">NVIDIA CUDA Accelerated ➔</span>
          </div>

          {/* Card 2 */}
          <div className="bg-white border border-[#E7E5DD] rounded-3xl p-6 shadow-[0_2px_12px_rgba(21,23,38,0.04)] hover:border-[#7C6CFF]/50 transition-all flex flex-col justify-between gap-4">
            <div className="flex flex-col gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#7C6CFF]/10 text-[#7C6CFF] border border-[#7C6CFF]/30 flex items-center justify-center">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="font-heading font-bold text-lg text-[#151726]">3D Spatial Digital Twin</h3>
              <p className="text-xs text-[#5B5F73] leading-relaxed">
                Microscopic crowd physics simulation engine modeling laminar vs turbulent fluid vectors, gate compression shockwaves, and stress limits.
              </p>
            </div>
            <span className="text-[11px] font-mono-num text-[#7C6CFF] font-bold">Vector Dynamic Physics ➔</span>
          </div>

          {/* Card 3 */}
          <div className="bg-white border border-[#E7E5DD] rounded-3xl p-6 shadow-[0_2px_12px_rgba(21,23,38,0.04)] hover:border-[#059669]/50 transition-all flex flex-col justify-between gap-4">
            <div className="flex flex-col gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#22D3A6]/20 text-[#059669] border border-[#22D3A6]/40 flex items-center justify-center">
                <Volume2 className="w-6 h-6" />
              </div>
              <h3 className="font-heading font-bold text-lg text-[#151726]">Bhashini Multilingual PA</h3>
              <p className="text-xs text-[#5B5F73] leading-relaxed">
                Autonomous 1-click audio broadcast generator in Hindi, Odia, Bengali, Tamil, and English with neural speech synthesis for panic reduction.
              </p>
            </div>
            <span className="text-[11px] font-mono-num text-[#059669] font-bold">5 Language Neural Voice ➔</span>
          </div>

          {/* Card 4 */}
          <div className="bg-white border border-[#E7E5DD] rounded-3xl p-6 shadow-[0_2px_12px_rgba(21,23,38,0.04)] hover:border-[#FF7A45]/50 transition-all flex flex-col justify-between gap-4">
            <div className="flex flex-col gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#FF7A45]/10 text-[#FF7A45] border border-[#FF7A45]/30 flex items-center justify-center">
                <Camera className="w-6 h-6" />
              </div>
              <h3 className="font-heading font-bold text-lg text-[#151726]">Citizen Photo & Video SOS</h3>
              <p className="text-xs text-[#5B5F73] leading-relaxed">
                Mobile companion for visitors to submit instant photo and video reports of blocked gates or fainting incidents directly to the control room.
              </p>
            </div>
            <span className="text-[11px] font-mono-num text-[#FF7A45] font-bold">Image & Video Evidence ➔</span>
          </div>

          {/* Card 5 */}
          <div className="bg-white border border-[#E7E5DD] rounded-3xl p-6 shadow-[0_2px_12px_rgba(21,23,38,0.04)] hover:border-[#D97706]/50 transition-all flex flex-col justify-between gap-4">
            <div className="flex flex-col gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#FFB627]/15 text-[#D97706] border border-[#FFB627]/40 flex items-center justify-center">
                <HardDrive className="w-6 h-6" />
              </div>
              <h3 className="font-heading font-bold text-lg text-[#151726]">IndexedDB Offline Sync</h3>
              <p className="text-xs text-[#5B5F73] leading-relaxed">
                Zero-packet-loss edge daemon buffers event telemetry locally in IndexedDB when network connectivity drops, syncing automatically on recovery.
              </p>
            </div>
            <span className="text-[11px] font-mono-num text-[#D97706] font-bold">Zero Data Loss Cache ➔</span>
          </div>

          {/* Card 6 */}
          <div className="bg-white border border-[#E7E5DD] rounded-3xl p-6 shadow-[0_2px_12px_rgba(21,23,38,0.04)] hover:border-[#FF3B5C]/50 transition-all flex flex-col justify-between gap-4">
            <div className="flex flex-col gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#FF3B5C]/10 text-[#FF3B5C] border border-[#FF3B5C]/30 flex items-center justify-center">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <h3 className="font-heading font-bold text-lg text-[#151726]">NDRF Audit & CSV Export</h3>
              <p className="text-xs text-[#5B5F73] leading-relaxed">
                One-click legal audit log exports, historical bottleneck frequency bar charts, and compliance documentation for disaster management authorities.
              </p>
            </div>
            <span className="text-[11px] font-mono-num text-[#FF3B5C] font-bold">Disaster Compliance Ready ➔</span>
          </div>
        </div>
      </section>

      {/* High-Impact Multi-Column Light Footer */}
      <footer className="bg-white border-t border-[#E7E5DD] text-[#5B5F73] font-body pt-16 pb-12 px-6 z-10">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-[#E7E5DD]">
          {/* Brand Col */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#2C7BE5] text-white flex items-center justify-center shadow-md font-bold">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <span className="font-heading font-bold text-xl text-[#151726]">CrowdShield AI</span>
            </div>
            <p className="text-xs text-[#5B5F73] leading-relaxed max-w-sm">
              National AI Safety Sentinel for crowd surge monitoring, stampede prevention, YOLO computer vision analytics, and disaster management authority integration.
            </p>

            <div className="flex items-center gap-3 mt-2">
              <div className="p-2.5 bg-[#FAFAF7] border border-[#E7E5DD] rounded-xl flex items-center gap-2 shadow-xs">
                <PhoneCall className="w-4 h-4 text-[#FF3B5C] animate-pulse" />
                <span className="text-xs font-mono-num font-bold text-[#151726]">National Emergency Helpline: 112 / 108</span>
              </div>
            </div>
          </div>

          {/* Col 1 */}
          <div className="flex flex-col gap-3">
            <span className="font-heading font-bold text-xs text-[#151726] uppercase tracking-wider">Control Deck</span>
            <ul className="flex flex-col gap-2 text-xs">
              <li>
                <button onClick={() => { setActiveTab('admin'); scrollToSection('login-deck'); }} className="hover:text-[#2C7BE5] transition-colors cursor-pointer">
                  Command Dashboard
                </button>
              </li>
              <li>
                <button onClick={() => { setActiveTab('admin'); scrollToSection('login-deck'); }} className="hover:text-[#2C7BE5] transition-colors cursor-pointer">
                  Live GIS Map
                </button>
              </li>
              <li>
                <button onClick={() => { setActiveTab('admin'); scrollToSection('login-deck'); }} className="hover:text-[#2C7BE5] transition-colors cursor-pointer">
                  YOLO Camera Feeds
                </button>
              </li>
              <li>
                <button onClick={() => { setActiveTab('admin'); scrollToSection('login-deck'); }} className="hover:text-[#2C7BE5] transition-colors cursor-pointer">
                  Sentinel AI Alerts
                </button>
              </li>
              <li>
                <button onClick={() => { setActiveTab('admin'); scrollToSection('login-deck'); }} className="hover:text-[#2C7BE5] transition-colors cursor-pointer">
                  3D Digital Twin
                </button>
              </li>
            </ul>
          </div>

          {/* Col 2 */}
          <div className="flex flex-col gap-3">
            <span className="font-heading font-bold text-xs text-[#151726] uppercase tracking-wider">Citizen Companion</span>
            <ul className="flex flex-col gap-2 text-xs">
              <li>
                <button onClick={() => { setActiveTab('citizen'); scrollToSection('login-deck'); }} className="hover:text-[#059669] transition-colors cursor-pointer">
                  Live Density Gauge
                </button>
              </li>
              <li>
                <button onClick={() => { setActiveTab('citizen'); scrollToSection('login-deck'); }} className="hover:text-[#059669] transition-colors cursor-pointer">
                  Evacuation Path Finder
                </button>
              </li>
              <li>
                <button onClick={() => { setActiveTab('citizen'); scrollToSection('login-deck'); }} className="hover:text-[#059669] transition-colors cursor-pointer">
                  Photo & Video SOS Upload
                </button>
              </li>
              <li>
                <button onClick={() => { setActiveTab('citizen'); scrollToSection('login-deck'); }} className="hover:text-[#059669] transition-colors cursor-pointer">
                  Bhashini Multilingual PA
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3 */}
          <div className="flex flex-col gap-3">
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
        <div className="max-w-7xl mx-auto pt-8 flex flex-wrap items-center justify-between text-[11px] text-[#5B5F73] gap-4">
          <span>© 2026 CrowdShield AI Infrastructure. All rights reserved. National Disaster Safety Standard.</span>
          <div className="flex items-center gap-6">
            <span className="hover:text-[#151726] cursor-pointer">Privacy Policy</span>
            <span className="hover:text-[#151726] cursor-pointer">Terms of Service</span>
            <span className="hover:text-[#151726] cursor-pointer">Disaster Audit Accreditation</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
