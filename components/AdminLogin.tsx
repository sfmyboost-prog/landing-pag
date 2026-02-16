
import React, { useState } from 'react';
import { api } from '../BackendAPI';
import * as OTPAuth from 'otpauth';

interface AdminLoginProps {
  onLoginSuccess: () => void;
  onBack: () => void;
}

const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess, onBack }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authCode, setAuthCode] = useState('');
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'admin123') {
      const settings = await api.getTwoFactorSettings();
      
      if (settings.enabled) {
        if (!authCode) {
          setError('Authentication code is required.');
          return;
        }

        const totp = new OTPAuth.TOTP({
          issuer: 'Dataflow',
          label: 'Admin',
          algorithm: 'SHA1',
          digits: 6,
          period: 30,
          secret: settings.secret,
        });

        const delta = totp.validate({
          token: authCode,
          window: 1,
        });

        if (delta !== null) {
          onLoginSuccess();
        } else {
          setError('Invalid or expired authentication code.');
        }
      } else {
        onLoginSuccess();
      }
    } else {
      setError('Invalid administrator credentials.');
    }
  };

  return (
    <div className="fixed inset-0 bg-[#F8F9FB] flex items-center justify-center p-6 z-[200] overflow-y-auto">
      <div className="bg-white p-10 md:p-14 rounded-[40px] shadow-2xl shadow-indigo-100 w-full max-w-lg border border-gray-100 transform transition-all hover:scale-[1.01]">
        <div className="flex flex-col items-center mb-12 text-center animate-fadeIn">
          <div className="w-20 h-20 bg-[#FF7E3E] rounded-[24px] flex items-center justify-center text-white text-4xl font-black mb-8 shadow-xl shadow-orange-200 animate-bounce" style={{ animationDuration: '3s' }}>
            D
          </div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Welcome Back</h1>
          <p className="text-gray-400 mt-3 font-medium text-lg">Sign in to manage your Dataflow Dashboard</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-8 animate-fadeIn" style={{ animationDelay: '100ms' }}>
          <div className="space-y-2">
            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Email Address</label>
            <div className="relative">
              <input 
                type="email" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-6 py-4.5 bg-[#F3F5F7] border border-transparent rounded-2xl focus:ring-2 focus:ring-[#FF7E3E] focus:ring-opacity-20 focus:bg-white focus:border-[#FF7E3E]/30 outline-none transition-all font-bold text-gray-900" 
              />
              <svg className="w-5 h-5 absolute right-5 top-1/2 -translate-y-1/2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center px-1">
              <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Password</label>
              <button type="button" className="text-[11px] font-black text-[#FF7E3E] uppercase tracking-widest hover:underline">Forgot?</button>
            </div>
            <div className="relative">
              <input 
                type="password" 
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                placeholder="••••••••"
                className="w-full px-6 py-4.5 bg-[#F3F5F7] border border-transparent rounded-2xl focus:ring-2 focus:ring-[#FF7E3E] focus:ring-opacity-20 focus:bg-white focus:border-[#FF7E3E]/30 outline-none transition-all font-bold text-gray-900"
                autoFocus
              />
              <svg className="w-5 h-5 absolute right-5 top-1/2 -translate-y-1/2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Authentication Code</label>
            <div className="relative">
              <input 
                type="text" 
                value={authCode}
                onChange={e => setAuthCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Enter 6-digit code"
                className="w-full px-6 py-4.5 bg-[#F3F5F7] border border-transparent rounded-2xl focus:ring-2 focus:ring-[#FF7E3E] focus:ring-opacity-20 focus:bg-white focus:border-[#FF7E3E]/30 outline-none transition-all font-bold text-gray-900" 
              />
              <svg className="w-5 h-5 absolute right-5 top-1/2 -translate-y-1/2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
            </div>
            {error && <div className="text-red-500 text-xs font-bold px-2 flex items-center gap-1.5 animate-pulse"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>{error}</div>}
          </div>

          <div className="flex items-center gap-2 cursor-pointer select-none" onClick={() => setRememberMe(!rememberMe)}>
            <div className={`w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center ${rememberMe ? 'bg-[#FF7E3E] border-[#FF7E3E]' : 'border-gray-200'}`}>
               {rememberMe && <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7"/></svg>}
            </div>
            <span className="text-sm font-bold text-gray-500">Remember Me</span>
          </div>

          <div className="pt-2">
            <button 
              type="submit"
              className="w-full bg-[#FF7E3E] text-white py-5 rounded-[24px] font-black text-xl hover:bg-[#e66c30] transition-all transform active:scale-95 shadow-xl shadow-orange-100 hover:shadow-orange-200"
            >
              Sign In to Dashboard
            </button>
          </div>
        </form>

        <button 
          onClick={onBack}
          className="w-full mt-10 text-gray-400 font-bold text-sm hover:text-[#FF7E3E] transition-colors flex items-center justify-center gap-2 group animate-fadeIn" style={{ animationDelay: '200ms' }}
        >
          <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
          Cancel and Return to Elite Store
        </button>
      </div>
      
      <style>{`
        .py-4\.5 { padding-top: 1.125rem; padding-bottom: 1.125rem; }
      `}</style>
    </div>
  );
};

export default AdminLogin;
