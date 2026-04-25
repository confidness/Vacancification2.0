import React, { useState } from 'react';
import { UserProfile, UserRole } from '../types';
import { motion } from 'motion/react';
import { User, Briefcase, MapPin, Search, Star, AlertCircle, Calendar, Users } from 'lucide-react';

interface OnboardingProps {
  onSubmit: (data: Partial<UserProfile>) => void;
}

export default function Onboarding({ onSubmit }: OnboardingProps) {
  const [role, setRole] = useState<UserRole | null>(null);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    fullName: '',
    city: '',
    profession: '',
    birthDate: '2000-01-01',
    gender: 'male' as const,
    strengths: '',
    weaknesses: '',
    experience: 'junior' as const,
    category: 'IT' as const,
    employmentType: 'full-time' as const,
    district: '',
    microDistrict: '',
    companySize: '1-10' as const
  });

  const handleNext = () => {
    if (step === 1 && !role) return;
    if (step === 2) {
      onSubmit({ ...formData, role: role! });
      return;
    }
    setStep(step + 1);
  };

  return (
    <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl shadow-2xl max-w-xl w-full p-8 overflow-hidden relative"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-stone-100">
          <motion.div 
            className="h-full bg-stone-900"
            initial={{ width: '0%' }}
            animate={{ width: step === 1 ? '50%' : '100%' }}
          />
        </div>

        {step === 1 ? (
          <div className="space-y-8 py-4">
            <div className="text-center">
              <h2 className="text-4xl font-black tracking-tighter mb-2">Vacancification</h2>
              <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-stone-400">Enterprise Career OS</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button 
                onClick={() => setRole('candidate')}
                className={`p-8 rounded-[2rem] border-2 transition-all text-left group relative overflow-hidden ${role === 'candidate' ? 'border-stone-900 bg-stone-50' : 'border-stone-100 hover:border-stone-200'}`}
              >
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 ${role === 'candidate' ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-400 group-hover:bg-stone-200'}`}>
                  <User className="w-8 h-8" />
                </div>
                <h3 className="font-black text-xl mb-2 tracking-tight">Professional</h3>
                <p className="text-xs text-stone-500 leading-relaxed font-medium">Deploy your portfolio to the elite talent pool.</p>
              </button>

              <button 
                onClick={() => setRole('employer')}
                className={`p-8 rounded-[2rem] border-2 transition-all text-left group relative overflow-hidden ${role === 'employer' ? 'border-stone-900 bg-stone-50' : 'border-stone-100 hover:border-stone-200'}`}
              >
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 ${role === 'employer' ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-400 group-hover:bg-stone-200'}`}>
                  <Briefcase className="w-8 h-8" />
                </div>
                <h3 className="font-black text-xl mb-2 tracking-tight">Enterprise</h3>
                <p className="text-xs text-stone-500 leading-relaxed font-medium">Audit and recruit high-integrity candidates.</p>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-8 py-4">
            <div className="text-center">
              <h2 className="text-2xl font-black tracking-tight mb-2 uppercase">Initial Deployment</h2>
              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Metadata Configuration</p>
            </div>

            <div className="space-y-6 max-h-[60vh] overflow-y-auto px-2 custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 ml-1">Full Legal Name</label>
                  <input 
                    type="text" 
                    placeholder="Enter full name..."
                    className="w-full bg-stone-50 border-2 border-stone-100 rounded-2xl px-5 py-4 text-sm focus:border-stone-900 transition-all outline-none font-bold shadow-sm"
                    value={formData.fullName}
                    onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 ml-1">Core Profession</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Senior Architect"
                    className="w-full bg-stone-50 border-2 border-stone-100 rounded-2xl px-5 py-4 text-sm focus:border-stone-900 transition-all outline-none font-bold shadow-sm"
                    value={formData.profession}
                    onChange={(e) => setFormData({...formData, profession: e.target.value})}
                  />
                </div>
              </div>

              {role === 'employer' && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 ml-1">Enterprise Complexity</label>
                  <select 
                    className="w-full bg-stone-50 border-2 border-stone-100 rounded-2xl px-5 py-4 text-sm focus:border-stone-900 transition-all outline-none font-bold"
                    value={formData.companySize}
                    onChange={(e) => setFormData({...formData, companySize: e.target.value as any})}
                  >
                    <option value="1-10">1-10 Employees (Micro-Enterprise)</option>
                    <option value="11-50">11-50 Employees (Small Business)</option>
                    <option value="51-200">51-200 Employees (Mid-Market)</option>
                    <option value="201+">201+ Employees (Global Enterprise)</option>
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 ml-1">Location / City</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Almaty"
                    className="w-full bg-stone-50 border-2 border-stone-100 rounded-2xl px-5 py-4 text-sm focus:border-stone-900 transition-all outline-none font-bold outline-none"
                    value={formData.city}
                    onChange={(e) => setFormData({...formData, city: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 ml-1">District / Район</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Almaly"
                    className="w-full bg-stone-50 border-2 border-stone-100 rounded-2xl px-5 py-4 text-sm focus:border-stone-900 transition-all outline-none font-bold"
                    value={formData.district}
                    onChange={(e) => setFormData({...formData, district: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 ml-1">Identity Status</label>
                  <select 
                    className="w-full bg-stone-50 border-2 border-stone-100 rounded-2xl px-5 py-4 text-sm focus:border-stone-900 transition-all font-bold"
                    value={formData.gender}
                    onChange={(e) => setFormData({...formData, gender: e.target.value as any})}
                  >
                    <option value="male">Male Profile</option>
                    <option value="female">Female Profile</option>
                    <option value="other">Other / Not Disclosed</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 ml-1">Chronology / Birth Date</label>
                  <input 
                    type="date" 
                    className="w-full bg-stone-50 border-2 border-stone-100 rounded-2xl px-5 py-4 text-sm focus:border-stone-900 transition-all font-bold"
                    value={formData.birthDate}
                    onChange={(e) => setFormData({...formData, birthDate: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 ml-1">Micro-district / Street</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Orbita-2"
                    className="w-full bg-stone-50 border-2 border-stone-100 rounded-2xl px-5 py-4 text-sm focus:border-stone-900 transition-all font-bold"
                    value={formData.microDistrict}
                    onChange={(e) => setFormData({...formData, microDistrict: e.target.value})}
                  />
                </div>
              </div>

              {role === 'candidate' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 ml-1">Sphere / Industry</label>
                      <select 
                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-600/20 transition-all outline-none font-bold"
                        value={formData.category}
                        onChange={(e) => setFormData({...formData, category: e.target.value as any})}
                      >
                        <option value="IT">IT</option>
                        <option value="Service">Service</option>
                        <option value="Education">Education</option>
                        <option value="Finance">Finance</option>
                        <option value="Healthcare">Healthcare</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 ml-1">Experience Level</label>
                      <select 
                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-600/20 transition-all outline-none"
                        value={formData.experience}
                        onChange={(e) => setFormData({...formData, experience: e.target.value as any})}
                      >
                        <option value="junior">Junior (Entry Level)</option>
                        <option value="mid">Middle (2-5 years)</option>
                        <option value="senior">Senior (5+ years)</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 ml-1">Desired Schedule / Type</label>
                    <select 
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-600/20 transition-all outline-none font-bold text-orange-600"
                      value={formData.employmentType}
                      onChange={(e) => setFormData({...formData, employmentType: e.target.value as any})}
                    >
                      <option value="full-time">Full-time (Standard)</option>
                      <option value="part-time">Part-time (Selected blocks)</option>
                      <option value="flexible">Flexible / Any</option>
                    </select>
                  </div>
                </>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 ml-1">Strong Sides</label>
                <textarea 
                  placeholder="Creative problems solving, fast learner..."
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-600/20 transition-all outline-none h-24 resize-none"
                  value={formData.strengths}
                  onChange={(e) => setFormData({...formData, strengths: e.target.value})}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 ml-1">Weak Sides</label>
                <textarea 
                  placeholder="Public speaking, technical writing..."
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-600/20 transition-all outline-none h-24 resize-none"
                  value={formData.weaknesses}
                  onChange={(e) => setFormData({...formData, weaknesses: e.target.value})}
                />
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-stone-100 flex justify-between items-center">
          {step === 2 && (
            <button onClick={() => setStep(1)} className="text-stone-400 text-sm hover:text-stone-900 transition-colors">
              Go back
            </button>
          )}
          <div className="flex-1" />
          <button 
            onClick={handleNext}
            className="bg-stone-900 text-white px-8 py-3 rounded-full text-sm font-bold hover:bg-orange-600 transition-all shadow-lg shadow-stone-900/10"
          >
            {step === 1 ? 'Continue' : 'Complete Setup'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
