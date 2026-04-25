import React, { useState } from 'react';
import { JobPosting } from '../types';
import { X, DollarSign, MapPin, Briefcase } from 'lucide-react';
import { motion } from 'motion/react';

interface JobFormProps {
  onClose: () => void;
  onSubmit: (data: Partial<JobPosting>) => void;
}

export default function JobForm({ onClose, onSubmit }: JobFormProps) {
  const [formData, setFormData] = useState({
    profession: '',
    city: '',
    description: '',
    minSalary: 0,
    maxSalary: 0,
    preferredSalary: 0,
    category: 'IT' as const,
    experienceRequired: 'junior' as const,
    employmentType: 'full-time' as const,
    district: '',
    microDistrict: ''
  });

  return (
    <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-2xl max-w-xl w-full p-8"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-serif italic text-stone-900">Post New Vacancy</h2>
          <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-stone-400" />
          </button>
        </div>

        <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 ml-1">Job Title / Profession</label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-300" />
                <input 
                  type="text" 
                  placeholder="Senior React Dev"
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-orange-600/20 transition-all outline-none"
                  value={formData.profession}
                  onChange={(e) => setFormData({...formData, profession: e.target.value})}
                />
              </div>
            </div>
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
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 ml-1">Experience Required</label>
              <select 
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-600/20 transition-all outline-none"
                value={formData.experienceRequired}
                onChange={(e) => setFormData({...formData, experienceRequired: e.target.value as any})}
              >
                <option value="junior">Junior (Entry Level)</option>
                <option value="mid">Middle (2-5 years)</option>
                <option value="senior">Senior (5+ years)</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 ml-1">Employment Type</label>
              <select 
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-600/20 transition-all outline-none font-bold text-orange-600"
                value={formData.employmentType}
                onChange={(e) => setFormData({...formData, employmentType: e.target.value as any})}
              >
                <option value="full-time">Full-time</option>
                <option value="part-time">Part-time</option>
                <option value="flexible">Flexible / Project</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 ml-1">City</label>
              <input 
                type="text" 
                placeholder="Moscow"
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-orange-600/20 transition-all outline-none"
                value={formData.city}
                onChange={(e) => setFormData({...formData, city: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 ml-1">District</label>
              <input 
                type="text" 
                placeholder="Arbat"
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-orange-600/20 transition-all outline-none"
                value={formData.district}
                onChange={(e) => setFormData({...formData, district: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 ml-1">Sub-district</label>
              <input 
                type="text" 
                placeholder="Microdistrict 5"
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-orange-600/20 transition-all outline-none"
                value={formData.microDistrict}
                onChange={(e) => setFormData({...formData, microDistrict: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 ml-1">Detailed Description</label>
            <textarea 
              placeholder="Responsibilities, requirements, and benefits..."
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-600/20 transition-all outline-none h-24 resize-none"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 ml-1">Min Salary</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-stone-300" />
                <input 
                  type="number" 
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-8 pr-4 py-2 text-sm focus:ring-2 focus:ring-orange-600/20 transition-all outline-none"
                  value={formData.minSalary}
                  onChange={(e) => setFormData({...formData, minSalary: parseFloat(e.target.value)})}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 ml-1">Max Salary</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-stone-300" />
                <input 
                  type="number" 
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-8 pr-4 py-2 text-sm focus:ring-2 focus:ring-orange-600/20 transition-all outline-none"
                  value={formData.maxSalary}
                  onChange={(e) => setFormData({...formData, maxSalary: parseFloat(e.target.value)})}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 ml-1">Preferred</label>
              <div className="relative text-orange-600 font-bold">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 " />
                <input 
                  type="number" 
                  className="w-full bg-orange-50 border border-orange-200 text-orange-600 rounded-xl pl-8 pr-4 py-2 text-sm focus:ring-2 focus:ring-orange-600/20 transition-all outline-none"
                  value={formData.preferredSalary}
                  onChange={(e) => setFormData({...formData, preferredSalary: parseFloat(e.target.value)})}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <button 
            onClick={() => onSubmit(formData)}
            className="w-full bg-stone-900 text-white py-4 rounded-2xl font-bold hover:bg-orange-600 transition-all"
          >
            Publish Vacancy
          </button>
        </div>
      </motion.div>
    </div>
  );
}
