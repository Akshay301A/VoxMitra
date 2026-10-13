import React, { useState } from 'react';
import { X, Calendar, CheckCircle2, Phone, Mail, Building, Users, Clock, ArrowRight } from 'lucide-react';
import { VoxMitraLogo } from '../common/VoxMitraLogo.tsx';

interface BookDemoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BookDemoModal: React.FC<BookDemoModalProps> = ({ isOpen, onClose }) => {
  const [submitted, setSubmitted] = useState(false);
  const [fullName, setFullName] = useState('');
  const [workEmail, setWorkEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('Real Estate');
  const [callVolume, setCallVolume] = useState('1,000 – 5,000 calls / month');
  const [preferredSlot, setPreferredSlot] = useState('Tomorrow, 3:00 PM IST');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  const handleReset = () => {
    setSubmitted(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl text-slate-100 p-6 md:p-8 my-8 animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {!submitted ? (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <VoxMitraLogo size="sm" />
              <span className="text-xs uppercase tracking-wider font-mono text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded">
                Live Walkthrough
              </span>
            </div>

            <h3 className="text-2xl font-bold tracking-tight text-white">
              Schedule an Autonomous Voice Demo
            </h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Experience a live test call tailored for your industry. We will demonstrate custom FAQs,
              Indian accent conversational tuning, CRM field capture, and warm telephony transfer.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300">Your Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Aditya Sharma"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 text-xs bg-slate-950/80 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300">Business / Clinic Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Aura Health Clinic"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 text-xs bg-slate-950/80 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300">Work Email</label>
                  <input
                    type="email"
                    required
                    placeholder="aditya@aurahealth.in"
                    value={workEmail}
                    onChange={(e) => setWorkEmail(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 text-xs bg-slate-950/80 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300">Direct Phone (For Test Call)</label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98200 12345"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 text-xs bg-slate-950/80 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300">Industry Sector</label>
                  <select
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 text-xs bg-slate-950/80 border border-slate-800 rounded-lg text-white focus:outline-hidden focus:border-indigo-500"
                  >
                    <option value="Healthcare & Clinics">Healthcare & Clinics</option>
                    <option value="Real Estate">Real Estate & Developers</option>
                    <option value="Education & EdTech">Education & EdTech</option>
                    <option value="Retail & D2C">Retail & D2C E-commerce</option>
                    <option value="Hospitality & Travel">Hospitality & Dining</option>
                    <option value="Financial & Agencies">Financial Services & Agencies</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300">Expected Monthly Call Volume</label>
                  <select
                    value={callVolume}
                    onChange={(e) => setCallVolume(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 text-xs bg-slate-950/80 border border-slate-800 rounded-lg text-white focus:outline-hidden focus:border-indigo-500"
                  >
                    <option value="Under 1,000 calls / month">Under 1,000 calls / month</option>
                    <option value="1,000 – 5,000 calls / month">1,000 – 5,000 calls / month</option>
                    <option value="5,000 – 25,000 calls / month">5,000 – 25,000 calls / month</option>
                    <option value="25,000+ enterprise volume">25,000+ enterprise volume</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300">Preferred Consultation Window</label>
                <div className="mt-1.5 grid grid-cols-3 gap-2">
                  {[
                    'Tomorrow, 11:30 AM IST',
                    'Tomorrow, 3:00 PM IST',
                    'Thursday, 4:30 PM IST',
                  ].map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setPreferredSlot(slot)}
                      className={`px-2.5 py-2 text-[11px] rounded-lg border text-left font-mono transition-colors ${
                        preferredSlot === slot
                          ? 'border-indigo-500 bg-indigo-950/40 text-indigo-200'
                          : 'border-slate-800 bg-slate-950/50 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 rounded-lg shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <span>Confirm Demo Reservation</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <p className="text-[11px] text-slate-500 text-center mt-2">
                  No credit card required. Sample configuration and test dial included.
                </p>
              </div>
            </form>
          </div>
        ) : (
          <div className="py-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <h3 className="text-xl font-bold text-white">
              Demo Session Reserved for {fullName}
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              We have scheduled your custom walkthrough on <strong className="text-slate-200 font-mono">{preferredSlot}</strong>.
              A calendar invitation has been prepared for <strong className="text-slate-200">{workEmail}</strong>.
            </p>

            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-left text-xs max-w-sm mx-auto space-y-2">
              <div className="flex justify-between text-slate-400">
                <span>Organization:</span>
                <span className="text-white font-medium">{companyName}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Industry Focus:</span>
                <span className="text-white font-medium">{industry}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Test Phone:</span>
                <span className="text-white font-mono">{phoneNumber}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Dialing Scope:</span>
                <span className="text-white">{callVolume}</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={handleReset}
                className="px-5 py-2 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
              >
                Close & Return to Platform
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
