/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  Phone, 
  Mail, 
  MapPin, 
  Printer, 
  SunMedium, 
  Package, 
  Menu, 
  X,
  Sparkles,
  Loader2
} from 'lucide-react';

export default function App() {
  const [currentPage, setCurrentPage] = useState<'home' | 'company' | 'contact'>('home');
  const [targetPage, setTargetPage] = useState<'home' | 'company' | 'contact' | null>(null);
  const [isPageLoading, setIsPageLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Contact Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    service: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{
    type: 'idle' | 'success' | 'error';
    message: string;
  }>({
    type: 'idle',
    message: 'We’ll send your message directly to ENJ Digital Concept.'
  });

  // Newsletter State
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterStatus, setNewsletterStatus] = useState('');

  // Sync hash routing and browser back/forward buttons
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '').toLowerCase();
      const target: 'home' | 'company' | 'contact' = 
        hash === 'company' ? 'company' : hash === 'contact' ? 'contact' : 'home';

      setCurrentPage((prev) => {
        if (prev !== target) {
          setTargetPage(target);
          setIsPageLoading(true);
          setTimeout(() => {
            setCurrentPage(target);
            window.scrollTo({ top: 0, behavior: 'instant' });
            setTimeout(() => {
              setIsPageLoading(false);
              setTargetPage(null);
            }, 80);
          }, 600);
        }
        return prev;
      });

      if (target === 'company') {
        document.title = 'Company — ENJ Digital Concept';
      } else if (target === 'contact') {
        document.title = 'Contact — ENJ Digital Concept';
      } else {
        document.title = 'ENJ Digital Concept — High-Quality Prints';
      }
    };

    const initial = window.location.hash.replace('#', '').toLowerCase();
    if (initial === 'company' || initial === 'contact') {
      setCurrentPage(initial);
    }

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateTo = (page: 'home' | 'company' | 'contact') => {
    if (page === currentPage && !isPageLoading) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setMobileMenuOpen(false);
    setTargetPage(page);
    setIsPageLoading(true);

    setTimeout(() => {
      setCurrentPage(page);
      window.location.hash = page === 'home' ? '' : page;
      window.scrollTo({ top: 0, behavior: 'instant' });

      if (page === 'company') {
        document.title = 'Company — ENJ Digital Concept';
      } else if (page === 'contact') {
        document.title = 'Contact — ENJ Digital Concept';
      } else {
        document.title = 'ENJ Digital Concept — High-Quality Prints';
      }

      setTimeout(() => {
        setIsPageLoading(false);
        setTargetPage(null);
      }, 80);
    }, 600);
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) return;

    setIsSubmitting(true);
    setSubmitStatus({
      type: 'idle',
      message: 'Sending your message…'
    });

    try {
      const response = await fetch('https://formsubmit.co/ajax/enjdigitalconcept@gmail.com', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          service: formData.service || 'General Enquiry',
          message: formData.message,
          _subject: `Website enquiry: ${formData.service || 'General Enquiry'}`,
          _replyto: formData.email
        })
      });

      const result = await response.json().catch(() => ({}));
      if (response.ok && (result.success === true || result.success === 'true' || result.message)) {
        setSubmitStatus({
          type: 'success',
          message: 'Your message was sent successfully! Our team will respond shortly.'
        });
        setFormData({ name: '', email: '', service: '', message: '' });
      } else {
        throw new Error(result.message || 'Submission failed');
      }
    } catch {
      setSubmitStatus({
        type: 'error',
        message: 'Could not send directly via web service. Please email us directly at enjdigitalconcept@gmail.com.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail) return;
    const subject = encodeURIComponent('Newsletter subscription request');
    const body = encodeURIComponent(`Please add ${newsletterEmail} to the ENJ Digital Concept newsletter.`);
    setNewsletterStatus('Opening email client for subscription confirmation…');
    window.location.href = `mailto:enjdigitalconcept@gmail.com?subject=${subject}&body=${body}`;
  };

  return (
    <div className="min-h-screen text-[#1d1d1f] relative flex flex-col selection:bg-[#f47b20] selection:text-white overflow-x-hidden">
      {/* Entire Page Content: deeply blurred and scaled slightly when animating to next page */}
      <div 
        className={`flex flex-col min-h-screen transition-all duration-500 ease-out ${
          isPageLoading 
            ? 'filter blur-[10px] md:blur-[16px] scale-[0.985] opacity-40 pointer-events-none select-none' 
            : 'filter-none scale-100 opacity-100'
        }`}
      >
        {/* Hidden SVG Symbols for Supply & Print Categories */}
      <svg className="hidden" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <symbol id="icon-appliance" viewBox="0 0 24 24"><rect x="5" y="3" width="14" height="18" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8"/><path d="M5 8h14M8 5.5h.01M11 5.5h.01" fill="none" stroke="currentColor" strokeWidth="1.8"/><circle cx="12" cy="14" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.8"/></symbol>
        <symbol id="icon-office" viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2" fill="none" stroke="currentColor" strokeWidth="1.8"/></symbol>
        <symbol id="icon-furniture" viewBox="0 0 24 24"><path d="M5 11V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v5M4 12h16v5H4zM6 17v3m12-3v3" fill="none" stroke="currentColor" strokeWidth="1.8"/></symbol>
        <symbol id="icon-electronics" viewBox="0 0 24 24"><rect x="6" y="2.5" width="12" height="19" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8"/><path d="M10 5h4m-3 13h2" fill="none" stroke="currentColor" strokeWidth="1.8"/></symbol>
        <symbol id="icon-electrical" viewBox="0 0 24 24"><path d="M13 2 5 13h6l-1 9 9-12h-6z" fill="none" stroke="currentColor" strokeWidth="1.8"/></symbol>
        <symbol id="icon-building" viewBox="0 0 24 24"><path d="M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6M8 10h.01M12 10h.01M16 10h.01" fill="none" stroke="currentColor" strokeWidth="1.8"/></symbol>
        <symbol id="icon-vehicle" viewBox="0 0 24 24"><path d="m5 11 2-5h10l2 5M3 11h18v7H3zM5 18v2m14-2v2M6 14h.01M18 14h.01M7 11h10" fill="none" stroke="currentColor" strokeWidth="1.8"/></symbol>
        <symbol id="icon-safety" viewBox="0 0 24 24"><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" fill="none" stroke="currentColor" strokeWidth="1.8"/><path d="m9 12 2 2 4-4" fill="none" stroke="currentColor" strokeWidth="1.8"/></symbol>
        <symbol id="icon-cleaning" viewBox="0 0 24 24"><path d="M12 3s6 7 6 12a6 6 0 0 1-12 0c0-5 6-12 6-12Z" fill="none" stroke="currentColor" strokeWidth="1.8"/><path d="M9 16a3 3 0 0 0 3 3" fill="none" stroke="currentColor" strokeWidth="1.8"/></symbol>
        <symbol id="icon-computer" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="13" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8"/><path d="M8 21h8m-4-4v4M2 17h20" fill="none" stroke="currentColor" strokeWidth="1.8"/></symbol>
        <symbol id="icon-brochure" viewBox="0 0 24 24"><path d="M4 4.5h11a3 3 0 0 1 3 3v12H7a3 3 0 0 1-3-3z" fill="none" stroke="currentColor" strokeWidth="1.8"/><path d="M18 8h2v11.5H7a3 3 0 0 1-3-3M8 8h6m-6 3h6m-6 3h4" fill="none" stroke="currentColor" strokeWidth="1.8"/></symbol>
        <symbol id="icon-letter" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8"/><path d="m4 7 8 6 8-6" fill="none" stroke="currentColor" strokeWidth="1.8"/></symbol>
        <symbol id="icon-flyer" viewBox="0 0 24 24"><path d="M6 3h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" fill="none" stroke="currentColor" strokeWidth="1.8"/><path d="M8 8h8m-8 4h8m-8 4h5" fill="none" stroke="currentColor" strokeWidth="1.8"/></symbol>
        <symbol id="icon-promo" viewBox="0 0 24 24"><path d="M3 10v4a2 2 0 0 0 2 2h2l3 5h3l-2-5h2l7 3V5l-7 3H5a2 2 0 0 0-2 2Z" fill="none" stroke="currentColor" strokeWidth="1.8"/><path d="M7 16V8m13-1 2-2m-2 12 2 2" fill="none" stroke="currentColor" strokeWidth="1.8"/></symbol>
        <symbol id="icon-banner" viewBox="0 0 24 24"><path d="M4 4v16m16-16v16M5 5h14l-3 4 3 4H5m0 0h14l-3 3 3 3H5" fill="none" stroke="currentColor" strokeWidth="1.8"/></symbol>
        <symbol id="icon-print" viewBox="0 0 24 24"><path d="M7 8V3h10v5M6 17H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" fill="none" stroke="currentColor" strokeWidth="1.8"/><path d="M6 14h12v7H6zM18 11h.01" fill="none" stroke="currentColor" strokeWidth="1.8"/></symbol>
      </svg>

      {/* Slim Floating Pill Navigation Header */}
      <header className="fixed top-3 left-1/2 -translate-x-1/2 z-50 w-[min(1240px,calc(100%-32px))]">
        <nav className="glass-pill rounded-full px-3 py-1.5 flex items-center justify-between shadow-xl">
          {/* Logo Icon Only (No name text) */}
          <button 
            onClick={() => navigateTo('home')} 
            className="flex items-center text-left focus:outline-none cursor-pointer"
            aria-label="ENJ Digital Concept Home"
          >
            <img 
              src="/logo.png" 
              alt="ENJ Logo" 
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover bg-white border border-gray-100 shadow-sm transition-transform hover:scale-105"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/assets/aistudio/logo_3018c959.png';
              }}
            />
          </button>

          {/* Separate Page Links: Home, Company, Contact */}
          <div className="hidden md:flex items-center gap-1.5 bg-black/5 p-1 rounded-full border border-black/5">
            <button
              onClick={() => navigateTo('home')}
              className={`px-4 py-1 text-xs font-semibold rounded-full transition-all duration-200 cursor-pointer ${
                currentPage === 'home'
                  ? 'bg-white text-[#1d1d1f] shadow-sm font-bold'
                  : 'text-[#515154] hover:text-[#c95510]'
              }`}
            >
              Home
            </button>
            <button
              onClick={() => navigateTo('company')}
              className={`px-4 py-1 text-xs font-semibold rounded-full transition-all duration-200 cursor-pointer ${
                currentPage === 'company'
                  ? 'bg-white text-[#1d1d1f] shadow-sm font-bold'
                  : 'text-[#515154] hover:text-[#c95510]'
              }`}
            >
              Company
            </button>
            <button
              onClick={() => navigateTo('contact')}
              className={`px-4 py-1 text-xs font-semibold rounded-full transition-all duration-200 cursor-pointer ${
                currentPage === 'contact'
                  ? 'bg-white text-[#1d1d1f] shadow-sm font-bold'
                  : 'text-[#515154] hover:text-[#c95510]'
              }`}
            >
              Contact
            </button>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-2">
            <a
              href="https://enjdigitalshop.odoo.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-1.5 rounded-full bg-[#1d1d1f] text-white text-xs font-semibold tracking-wide hover:bg-[#3a3a3c] transition-colors shadow-sm"
            >
              <span>Start Order</span>
            </a>

            {/* Mobile Menu Toggle Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 rounded-full bg-black/5 hover:bg-black/10 text-[#1d1d1f] transition-colors cursor-pointer"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </nav>

        {/* Mobile Dropdown Panel */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-2 p-3 bg-white/95 backdrop-blur-2xl border border-white/80 rounded-3xl shadow-2xl flex flex-col gap-1.5 animate-in fade-in slide-in-from-top-4 duration-200">
            <button
              onClick={() => navigateTo('home')}
              className={`w-full text-left px-4 py-3 rounded-2xl text-base font-medium transition-colors cursor-pointer ${
                currentPage === 'home' ? 'bg-[#f47b20]/15 text-[#1d1d1f] font-bold' : 'hover:bg-gray-100 text-[#424245]'
              }`}
            >
              Home
            </button>
            <button
              onClick={() => navigateTo('company')}
              className={`w-full text-left px-4 py-3 rounded-2xl text-base font-medium transition-colors cursor-pointer ${
                currentPage === 'company' ? 'bg-[#f47b20]/15 text-[#1d1d1f] font-bold' : 'hover:bg-gray-100 text-[#424245]'
              }`}
            >
              Company
            </button>
            <button
              onClick={() => navigateTo('contact')}
              className={`w-full text-left px-4 py-3 rounded-2xl text-base font-medium transition-colors cursor-pointer ${
                currentPage === 'contact' ? 'bg-[#f47b20]/15 text-[#1d1d1f] font-bold' : 'hover:bg-gray-100 text-[#424245]'
              }`}
            >
              Contact
            </button>
            <div className="pt-2 border-t border-gray-100">
              <a
                href="https://enjdigitalshop.odoo.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center py-3 rounded-2xl bg-[#1d1d1f] text-white text-sm font-semibold"
              >
                <span>Start Order on Odoo Shop</span>
              </a>
            </div>
          </div>
        )}
      </header>

      {/* Main Content Area - Renders Separate Page Based on Selection */}
      <main className={`flex-1 ${currentPage === 'home' ? 'pt-0' : 'pt-18'} pb-16 transition-all duration-300 ease-out`}>

        {/* ========================================================
            PAGE 1: HOME PAGE
           ======================================================== */}
        {currentPage === 'home' && (
          <div className="animate-in fade-in duration-300">
            {/* Hero Banner with 100% Full-Bleed Background (No Margin) */}
            <div className="w-full m-0 p-0 mb-16">
              <div className="relative w-full min-h-[620px] sm:min-h-[700px] md:min-h-[760px] overflow-hidden text-white shadow-2xl flex flex-col justify-center items-center px-6 sm:px-10 md:px-16 pt-28 sm:pt-36 pb-20 sm:pb-28 isolate">
                
                {/* 1. Background Image (100% Full Bleed) */}
                <img
                  src="/hero-bg.png"
                  alt="Industrial Digital Printing Press"
                  className="absolute inset-0 w-full h-full object-cover object-center z-0 scale-105 transition-transform duration-1000 ease-out"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/assets/aistudio/image_699b0ca6.png';
                  }}
                />

                {/* 2. Cinematic Dark Gradient Overlay for Maximum Text Legibility */}
                <div 
                  className="absolute inset-0 z-0 pointer-events-none"
                  style={{
                    background: 'radial-gradient(circle at center, rgba(3, 7, 18, 0.65) 0%, rgba(3, 7, 18, 0.85) 75%, rgba(2, 4, 10, 0.95) 100%)'
                  }}
                />

                {/* 3. Subtle Colored Ambient Accents matching the cyan & magenta ink */}
                <div 
                  className="absolute -bottom-16 left-1/4 w-[480px] h-[220px] rounded-full pointer-events-none z-0"
                  style={{
                    background: 'radial-gradient(ellipse, rgba(6, 182, 212, 0.28) 0%, transparent 70%)',
                    filter: 'blur(60px)'
                  }}
                />

                {/* Center Content: Heading, Description, and Two CTAs */}
                <div className="relative z-10 max-w-4xl mx-auto text-center flex flex-col items-center">
                  <h1 className="font-display text-4xl sm:text-6xl md:text-7xl lg:text-[76px] font-semibold leading-[1.04] tracking-tight mb-6 text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.8)]">
                    High-quality prints, delivered right on time.
                  </h1>
                  
                  <p className="text-slate-100/90 text-base sm:text-lg md:text-xl leading-relaxed max-w-2xl mx-auto mb-10 font-normal drop-shadow-[0_2px_12px_rgba(0,0,0,0.7)]">
                    Turning ideas into striking physical realities. As Maiduguri’s premier printing powerhouse, we specialize in high-impact print solutions for ambitious brands, corporate organizations, and creative individuals.
                  </p>

                  {/* Two Clean CTAs (Start Order & Explore Company - No Arrow Icons) */}
                  <div className="flex flex-wrap items-center justify-center gap-4">
                    <a
                      href="https://enjdigitalshop.odoo.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center px-8 py-3.5 rounded-full bg-[#f47b20] hover:bg-[#c95510] text-white text-sm font-semibold shadow-[0_4px_24px_rgba(244,123,32,0.45)] border border-orange-300/40 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                    >
                      <span>Start Order</span>
                    </a>

                    <button
                      onClick={() => navigateTo('company')}
                      className="inline-flex items-center justify-center px-7 py-3.5 rounded-full bg-black/40 hover:bg-black/60 text-white border border-white/30 text-sm font-medium backdrop-blur-md transition-all hover:border-white/60 cursor-pointer hover:scale-105 active:scale-95"
                    >
                      <span>Explore Company</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Section: Print Services Grid */}
            <div className="w-[min(1240px,calc(100%-32px))] mx-auto mt-20">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                <div>
                  <p className="text-[11px] font-bold tracking-widest text-[#6e6e73] uppercase mb-2">What we do</p>
                  <h2 className="font-display text-3xl sm:text-5xl font-medium tracking-tight text-[#1d1d1f]">
                    Print made to<br className="hidden sm:inline" /> make an impact.
                  </h2>
                </div>
                <p className="text-[#6e6e73] text-sm md:text-base max-w-md leading-relaxed">
                  Professional branding solutions tailored for corporate marketing, events, and personal project needs.
                </p>
              </div>

              {/* 6 Visual Services Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* 01 */}
                <div className="group rounded-3xl p-4 bg-white/70 backdrop-blur-md border border-white/90 shadow-sm hover:shadow-xl transition-all duration-300">
                  <div className="relative h-64 sm:h-72 rounded-2xl overflow-hidden bg-gray-100 mb-4">
                    <img 
                      src="/paper.jpeg" 
                      alt="Paper & Corporate Printing" 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => { (e.target as HTMLImageElement).src = '/assets/aistudio/paper_f6713a43.jpeg'; }}
                    />
                    <span className="absolute top-3 left-3 w-9 h-9 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center font-display font-bold text-xs text-[#1d1d1f] shadow-sm">
                      01
                    </span>
                  </div>
                  <div className="mb-2">
                    <h3 className="font-display text-xl font-semibold text-[#1d1d1f]">Paper & Corporate Printing</h3>
                  </div>
                  <p className="text-[#6e6e73] text-sm leading-relaxed">
                    Elevate your brand touchpoints with crisp, high-resolution stationery and marketing collateral that leaves a lasting impression.
                  </p>
                </div>

                {/* 02 */}
                <div className="group rounded-3xl p-4 bg-white/70 backdrop-blur-md border border-white/90 shadow-sm hover:shadow-xl transition-all duration-300">
                  <div className="relative h-64 sm:h-72 rounded-2xl overflow-hidden bg-gray-100 mb-4">
                    <img 
                      src="/banner.jpeg" 
                      alt="Large-format & Outdoor Signage" 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => { (e.target as HTMLImageElement).src = '/assets/aistudio/banner_f14a3920.jpeg'; }}
                    />
                    <span className="absolute top-3 left-3 w-9 h-9 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center font-display font-bold text-xs text-[#1d1d1f] shadow-sm">
                      02
                    </span>
                  </div>
                  <div className="mb-2">
                    <h3 className="font-display text-xl font-semibold text-[#1d1d1f]">Large-format & Outdoor Signage</h3>
                  </div>
                  <p className="text-[#6e6e73] text-sm leading-relaxed">
                    Turn heads and capture foot traffic with high-impact visuals designed to withstand the elements with vivid ink permanence.
                  </p>
                </div>

                {/* 03 */}
                <div className="group rounded-3xl p-4 bg-white/70 backdrop-blur-md border border-white/90 shadow-sm hover:shadow-xl transition-all duration-300">
                  <div className="relative h-64 sm:h-72 rounded-2xl overflow-hidden bg-gray-100 mb-4">
                    <img 
                      src="/shirt.jpeg" 
                      alt="Custom Apparel & Textile Printing" 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => { (e.target as HTMLImageElement).src = '/assets/aistudio/shirt_f6a3624f.jpeg'; }}
                    />
                    <span className="absolute top-3 left-3 w-9 h-9 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center font-display font-bold text-xs text-[#1d1d1f] shadow-sm">
                      03
                    </span>
                  </div>
                  <div className="mb-2">
                    <h3 className="font-display text-xl font-semibold text-[#1d1d1f]">Custom Apparel & Textile</h3>
                  </div>
                  <p className="text-[#6e6e73] text-sm leading-relaxed">
                    Outfit your team, promote your brand, or launch your merch line with durable, vibrant apparel customization and direct heat transfers.
                  </p>
                </div>

                {/* 04 */}
                <div className="group rounded-3xl p-4 bg-white/70 backdrop-blur-md border border-white/90 shadow-sm hover:shadow-xl transition-all duration-300">
                  <div className="relative h-64 sm:h-72 rounded-2xl overflow-hidden bg-gray-100 mb-4">
                    <img 
                      src="/stitch.jpg" 
                      alt="Stitch & Embroidery" 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => { (e.target as HTMLImageElement).src = '/assets/aistudio/stitch_2384090b.jpg'; }}
                    />
                    <span className="absolute top-3 left-3 w-9 h-9 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center font-display font-bold text-xs text-[#1d1d1f] shadow-sm">
                      04
                    </span>
                  </div>
                  <div className="mb-2">
                    <h3 className="font-display text-xl font-semibold text-[#1d1d1f]">Stitch & Embroidery</h3>
                  </div>
                  <p className="text-[#6e6e73] text-sm leading-relaxed">
                    Bring your brand to life with premium, textured thread work that adds depth, durability, and a classic look to any garment.
                  </p>
                </div>

                {/* 05 */}
                <div className="group rounded-3xl p-4 bg-white/70 backdrop-blur-md border border-white/90 shadow-sm hover:shadow-xl transition-all duration-300">
                  <div className="relative h-64 sm:h-72 rounded-2xl overflow-hidden bg-gray-100 mb-4">
                    <img 
                      src="/engrave.jpg" 
                      alt="Laser Engraving" 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => { (e.target as HTMLImageElement).src = '/assets/aistudio/engrave_020d7bfe.jpg'; }}
                    />
                    <span className="absolute top-3 left-3 w-9 h-9 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center font-display font-bold text-xs text-[#1d1d1f] shadow-sm">
                      05
                    </span>
                  </div>
                  <div className="mb-2">
                    <h3 className="font-display text-xl font-semibold text-[#1d1d1f]">Laser Engraving</h3>
                  </div>
                  <p className="text-[#6e6e73] text-sm leading-relaxed">
                    Achieve permanent, high-precision marking and dimensional cutting that delivers a rustic yet sophisticated touch to hard surfaces.
                  </p>
                </div>

                {/* 06 */}
                <div className="group rounded-3xl p-4 bg-white/70 backdrop-blur-md border border-white/90 shadow-sm hover:shadow-xl transition-all duration-300">
                  <div className="relative h-64 sm:h-72 rounded-2xl overflow-hidden bg-gray-100 mb-4">
                    <img 
                      src="/graphic.jpg" 
                      alt="Graphic Design & Creative Services" 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => { (e.target as HTMLImageElement).src = '/assets/aistudio/graphic_363550c6.jpg'; }}
                    />
                    <span className="absolute top-3 left-3 w-9 h-9 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center font-display font-bold text-xs text-[#1d1d1f] shadow-sm">
                      06
                    </span>
                  </div>
                  <div className="mb-2">
                    <h3 className="font-display text-xl font-semibold text-[#1d1d1f]">Graphic Design & Creative</h3>
                  </div>
                  <p className="text-[#6e6e73] text-sm leading-relaxed">
                    Bring your vision to reality with strategic, professional design solutions built to optimize production and engage your target audience.
                  </p>
                </div>
              </div>

              {/* Explore More Banner */}
              <div className="mt-12 p-8 rounded-3xl bg-white/50 border border-black/5 flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                  <h3 className="font-display text-2xl font-medium text-[#1d1d1f]">Explore more products & services...</h3>
                  <p className="text-[#6e6e73] text-sm mt-1">From your first idea to the finished print, we bring your vision to life with quality you can see and feel.</p>
                </div>
                <button
                  onClick={() => navigateTo('company')}
                  className="whitespace-nowrap px-6 py-3 rounded-full bg-[#1d1d1f] hover:bg-[#3a3a3c] text-white text-xs font-semibold tracking-wide transition-colors cursor-pointer"
                >
                  View Company & General Supply
                </button>
              </div>
            </div>

            {/* Section: Impact in Numbers */}
            <div className="w-[min(1240px,calc(100%-32px))] mx-auto mt-20">
              <div className="rounded-[36px] p-8 sm:p-14 md:p-16 bg-white/70 backdrop-blur-xl border border-white/80 shadow-md">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                  <div>
                    <p className="text-[11px] font-bold tracking-widest text-[#6e6e73] uppercase mb-2">Our impact</p>
                    <h2 className="font-display text-3xl sm:text-5xl font-medium tracking-tight text-[#1d1d1f]">In numbers.</h2>
                  </div>
                  <p className="text-[#6e6e73] text-sm md:text-base max-w-sm leading-relaxed">
                    A quick look at the milestones we've achieved together with our amazing clients across northern Nigeria.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8 border-t border-black/10">
                  <div className="space-y-2">
                    <span className="block font-display text-5xl sm:text-7xl font-light tracking-tight text-[#1d1d1f]">20k+</span>
                    <span className="text-sm font-medium text-[#6e6e73]">Prints & Orders Delivered</span>
                  </div>
                  <div className="space-y-2 md:border-l md:border-black/10 md:pl-8">
                    <span className="block font-display text-5xl sm:text-7xl font-light tracking-tight text-[#1d1d1f]">5+</span>
                    <span className="text-sm font-medium text-[#6e6e73]">Years of Industry Excellence</span>
                  </div>
                  <div className="space-y-2 md:border-l md:border-black/10 md:pl-8">
                    <span className="block font-display text-5xl sm:text-7xl font-light tracking-tight text-[#f47b20]">99%</span>
                    <span className="text-sm font-medium text-[#6e6e73]">Client Satisfaction Rating</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Section: Testimonials */}
            <div className="w-[min(1240px,calc(100%-32px))] mx-auto mt-20">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                <div>
                  <p className="text-[11px] font-bold tracking-widest text-[#6e6e73] uppercase mb-2">Kind words</p>
                  <h2 className="font-display text-3xl sm:text-5xl font-medium tracking-tight text-[#1d1d1f]">
                    Trusted by<br className="hidden sm:inline" /> local brands.
                  </h2>
                </div>
                <p className="text-[#6e6e73] text-sm md:text-base max-w-sm leading-relaxed">
                  We care about the details just as much as the people and brands behind every print.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <figure className="p-8 sm:p-10 rounded-3xl bg-white border border-black/5 shadow-sm flex flex-col justify-between">
                  <blockquote className="font-display text-xl sm:text-2xl text-[#1d1d1f] font-normal leading-snug mb-8">
                    “The clarity of the brochures exceeded all our expectations.”
                  </blockquote>
                  <figcaption className="text-xs font-semibold text-[#1d1d1f]">
                    Sabine Delcroix
                    <span className="block text-[11px] font-normal text-[#6e6e73] mt-0.5">Marketing Manager, Tech</span>
                  </figcaption>
                </figure>

                <figure className="p-8 sm:p-10 rounded-3xl bg-[#fff0df]/60 border border-[#f47b20]/20 shadow-sm flex flex-col justify-between">
                  <blockquote className="font-display text-xl sm:text-2xl text-[#1d1d1f] font-normal leading-snug mb-8">
                    “The quality of our large-format banners and direct-to-film apparel completely exceeded expectations. They are our go-to-print partner for every event.”
                  </blockquote>
                  <figcaption className="text-xs font-semibold text-[#1d1d1f]">
                    Engr. Emmanuel I. Moses
                    <span className="block text-[11px] font-normal text-[#6e6e73] mt-0.5">CEO — ENJ Digital Concept</span>
                  </figcaption>
                </figure>

                <figure className="p-8 sm:p-10 rounded-3xl bg-white border border-black/5 shadow-sm flex flex-col justify-between">
                  <blockquote className="font-display text-xl sm:text-2xl text-[#1d1d1f] font-normal leading-snug mb-8">
                    “The fastest turnaround on business cards we've ever seen, with absolute color accuracy and premium cardstock.”
                  </blockquote>
                  <figcaption className="text-xs font-semibold text-[#1d1d1f]">
                    Lars Vilanova
                    <span className="block text-[11px] font-normal text-[#6e6e73] mt-0.5">Founder of Creative Firm</span>
                  </figcaption>
                </figure>

                <figure className="p-8 sm:p-10 rounded-3xl bg-white border border-black/5 shadow-sm flex flex-col justify-between">
                  <blockquote className="font-display text-xl sm:text-2xl text-[#1d1d1f] font-normal leading-snug mb-8">
                    “Sharp details, consistent colors, and fast turnaround. We finally found a reliable printing partner.”
                  </blockquote>
                  <figcaption className="text-xs font-semibold text-[#1d1d1f]">
                    David O.
                    <span className="block text-[11px] font-normal text-[#6e6e73] mt-0.5">Creative Director — Power Creative</span>
                  </figcaption>
                </figure>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            PAGE 2: COMPANY PAGE
           ======================================================== */}
        {currentPage === 'company' && (
          <div className="w-[min(1240px,calc(100%-32px))] mx-auto animate-in fade-in duration-300 pt-4">
            {/* Company Page Header */}
            <div className="grid grid-cols-1 md:grid-cols-2 items-end gap-8 mb-14">
              <div>
                <p className="text-[11px] font-bold tracking-widest text-[#6e6e73] uppercase mb-3">What we do</p>
                <h1 className="font-display text-4xl sm:text-6xl lg:text-7xl font-medium tracking-tight text-[#1d1d1f] leading-none">
                  One dependable partner for everyday needs.
                </h1>
              </div>
              <div>
                <p className="text-[#6e6e73] text-sm md:text-base leading-relaxed">
                  We supply a wide range of products and services to companies, individuals, hotels, churches, schools and government offices. Our service is organized around your requirements, with flexible quantities for items on our supply list.
                </p>
                <div className="flex flex-wrap gap-2 mt-6">
                  {['Companies', 'Individuals', 'Hotels', 'Churches', 'Schools', 'Government offices'].map((tag) => (
                    <span key={tag} className="px-3.5 py-1.5 rounded-full border border-black/10 text-xs font-medium text-[#515154] bg-white/60">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Three Core Pillars */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
              <div className="p-8 rounded-3xl bg-white/70 backdrop-blur-md border border-white/80 shadow-sm flex flex-col justify-between min-h-[260px]">
                <div>
                  <span className="text-xs font-bold text-[#c95510] tracking-wider block mb-6">01 / GENERAL SUPPLY</span>
                  <h3 className="font-display text-2xl font-medium text-[#1d1d1f] mb-3">Products for work and life</h3>
                  <p className="text-[#6e6e73] text-sm leading-relaxed">
                    From office essentials and electronics to furniture, building materials, vehicles and safety equipment, we help source the items you need.
                  </p>
                </div>
                <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-[#1d1d1f]">
                  <Package className="w-4 h-4 text-[#f47b20]" />
                  <span>Custom Quotations Available</span>
                </div>
              </div>

              <div className="p-8 rounded-3xl bg-white/70 backdrop-blur-md border border-white/80 shadow-sm flex flex-col justify-between min-h-[260px]">
                <div>
                  <span className="text-xs font-bold text-[#c95510] tracking-wider block mb-6">02 / RENEWABLE ENERGY</span>
                  <h3 className="font-display text-2xl font-medium text-[#1d1d1f] mb-3">Energy for a changing world</h3>
                  <p className="text-[#6e6e73] text-sm leading-relaxed">
                    We support the growing demand for renewable energy with quality-focused services and solutions for sustainable power across Borno State.
                  </p>
                </div>
                <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-[#1d1d1f]">
                  <SunMedium className="w-4 h-4 text-[#f47b20]" />
                  <span>Solar & Clean Energy Systems</span>
                </div>
              </div>

              <div className="p-8 rounded-3xl bg-white/70 backdrop-blur-md border border-white/80 shadow-sm flex flex-col justify-between min-h-[260px]">
                <div>
                  <span className="text-xs font-bold text-[#c95510] tracking-wider block mb-6">03 / DIGITAL PRINTING</span>
                  <h3 className="font-display text-2xl font-medium text-[#1d1d1f] mb-3">Print, without the minimums</h3>
                  <p className="text-[#6e6e73] text-sm leading-relaxed">
                    Black-and-white and colour printing for everyday communications, marketing materials and large-format banners—even for smaller print runs.
                  </p>
                </div>
                <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-[#1d1d1f]">
                  <Printer className="w-4 h-4 text-[#f47b20]" />
                  <span>No Minimum Order Runs</span>
                </div>
              </div>
            </div>

            {/* Supply Categories Grid */}
            <div className="mb-16">
              <p className="text-[11px] font-bold tracking-widest text-[#6e6e73] uppercase mb-2">Supply categories</p>
              <h2 className="font-display text-3xl sm:text-4xl font-medium text-[#1d1d1f] mb-8">A broad range of products.</h2>

              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {[
                  { name: 'Home appliances', icon: 'icon-appliance' },
                  { name: 'Office equipment', icon: 'icon-office' },
                  { name: 'Home & office furniture', icon: 'icon-furniture' },
                  { name: 'Electronics', icon: 'icon-electronics' },
                  { name: 'Electrical materials', icon: 'icon-electrical' },
                  { name: 'Building equipment', icon: 'icon-building' },
                  { name: 'Vehicles', icon: 'icon-vehicle' },
                  { name: 'Safety equipment', icon: 'icon-safety' },
                  { name: 'Toiletries & cleaning', icon: 'icon-cleaning' },
                  { name: 'Computers & accessories', icon: 'icon-computer' },
                ].map((item, idx) => (
                  <div 
                    key={idx}
                    className="p-4 rounded-2xl bg-white/60 border border-white/90 shadow-sm hover:bg-white hover:border-[#f47b20]/40 transition-all flex items-center gap-3.5 min-h-[82px]"
                  >
                    <span className="w-9 h-9 rounded-full bg-[#fff1e6] flex items-center justify-center text-[#c95510] shrink-0">
                      <svg className="w-4 h-4"><use href={`#${item.icon}`}></use></svg>
                    </span>
                    <span className="text-xs sm:text-sm font-medium text-[#1d1d1f] leading-snug">{item.name}</span>
                  </div>
                ))}
              </div>

              <p className="mt-6 text-sm text-[#6e6e73] leading-relaxed max-w-2xl">
                Need a particular item or specific bulk quantity? Get in touch with our supply procurement team to discuss your exact requirements. We can supply any quantity of items included in our product supply list.
              </p>
            </div>

            {/* Workplace Consumables Card */}
            <div className="p-8 sm:p-12 md:p-14 rounded-3xl bg-white/70 backdrop-blur-xl border border-white/90 shadow-md mb-16 grid grid-cols-1 md:grid-cols-[0.8fr_1.2fr] gap-8 items-start">
              <div>
                <p className="text-[11px] font-bold tracking-widest text-[#6e6e73] uppercase mb-2">For the workplace</p>
                <h2 className="font-display text-3xl sm:text-4xl font-medium tracking-tight text-[#1d1d1f]">
                  Office consumables &amp; equipment.
                </h2>
              </div>
              <div>
                <p className="text-[#6e6e73] text-sm md:text-base leading-relaxed">
                  We provide everyday office supplies and equipment for written communication, recordkeeping, bookkeeping, cleaning and storage. That includes expendable daily-use products as well as the tools and furnishings that keep an organization running smoothly.
                </p>
                <div className="flex flex-wrap gap-2 mt-6">
                  {[
                    'Stationery',
                    'Paper products',
                    'Bookkeeping supplies',
                    'Cleaning supplies',
                    'Storage',
                    'Small machines',
                    'Computers',
                    'Office furniture'
                  ].map((tag) => (
                    <span key={tag} className="px-3.5 py-1.5 rounded-full bg-white border border-black/10 text-xs text-[#515154]">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Digital Printing Breakdown */}
            <div className="mb-16">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
                <div>
                  <p className="text-[11px] font-bold tracking-widest text-[#6e6e73] uppercase mb-2">Digital printing</p>
                  <h2 className="font-display text-3xl sm:text-4xl font-medium text-[#1d1d1f]">
                    From a single flyer to a bold banner.
                  </h2>
                </div>
                <p className="text-[#6e6e73] text-sm md:text-base max-w-md leading-relaxed">
                  Send us your print-ready PDF and we’ll take care of the rest. Choose black or colour printing, with no minimum order requirement—so even a small print job is welcome.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  { name: 'Brochures & newsletters', icon: 'icon-brochure' },
                  { name: 'Letters & booklets', icon: 'icon-letter' },
                  { name: 'Flyers', icon: 'icon-flyer' },
                  { name: 'Promotional materials', icon: 'icon-promo' },
                  { name: 'Large-format banners', icon: 'icon-banner' },
                  { name: 'Black & colour printing', icon: 'icon-print' }
                ].map((printItem, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-white/60 border border-white/90 shadow-sm flex flex-col items-center text-center gap-3">
                    <span className="w-10 h-10 rounded-full bg-[#fff1e6] flex items-center justify-center text-[#c95510]">
                      <svg className="w-5 h-5"><use href={`#${printItem.icon}`}></use></svg>
                    </span>
                    <span className="text-xs font-medium text-[#1d1d1f] leading-tight">{printItem.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Let's Work Together Callout */}
            <div className="p-8 sm:p-12 rounded-3xl bg-[#171717] text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-xl mb-12">
              <div>
                <p className="text-[11px] font-bold tracking-widest text-[#f47b20] uppercase mb-2">Let’s work together</p>
                <h2 className="font-display text-2xl sm:text-4xl font-medium max-w-xl">
                  Tell us what you need. We’ll help with the rest.
                </h2>
                <p className="text-gray-300 text-sm mt-2 max-w-lg">
                  Contact ENJ Digital Concept to ask about product availability, supply quantities, renewable energy services or custom printing.
                </p>
              </div>
              <button
                onClick={() => navigateTo('contact')}
                className="whitespace-nowrap px-8 py-3.5 rounded-full bg-white text-[#1d1d1f] hover:bg-gray-100 font-bold text-xs tracking-wider uppercase transition-colors cursor-pointer"
              >
                Contact Our Team
              </button>
            </div>
          </div>
        )}

        {/* ========================================================
            PAGE 3: CONTACT PAGE
           ======================================================== */}
        {currentPage === 'contact' && (
          <div className="w-[min(1240px,calc(100%-32px))] mx-auto animate-in fade-in duration-300 pt-4">
            {/* Contact Page Header */}
            <div className="max-w-2xl mb-12">
              <p className="text-[11px] font-bold tracking-widest text-[#6e6e73] uppercase mb-2">
                ENJ Digital Concept · Maiduguri, Nigeria
              </p>
              <h1 className="font-display text-4xl sm:text-6xl font-medium tracking-tight text-[#1d1d1f] mb-4">
                Let’s make something happen.
              </h1>
              <p className="text-[#6e6e73] text-base leading-relaxed">
                Tell us about your print job, product supply needs or renewable energy enquiry. We’ll get back to you as soon as we can.
              </p>
            </div>

            {/* Contact Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-[0.85fr_1.15fr] gap-8 items-stretch mb-12">
              {/* Left: Contact Info Aside */}
              <aside className="p-8 sm:p-10 rounded-3xl bg-white/70 backdrop-blur-xl border border-white/90 shadow-md flex flex-col justify-between gap-10">
                <div>
                  <p className="text-[11px] font-bold tracking-widest text-[#6e6e73] uppercase mb-2">Get in touch</p>
                  <h2 className="font-display text-2xl sm:text-3xl font-medium text-[#1d1d1f] mb-3">We’re here to help.</h2>
                  <p className="text-[#6e6e73] text-sm leading-relaxed">
                    Reach out directly or send us a message using the form. We serve businesses, organizations, institutions and individuals.
                  </p>
                </div>

                <div className="space-y-6">
                  <div className="flex items-start gap-3.5">
                    <div className="w-9 h-9 rounded-full bg-[#fff1e6] flex items-center justify-center text-[#c95510] shrink-0 mt-0.5">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold tracking-wider text-[#6e6e73] uppercase">Email</span>
                      <a href="mailto:enjdigitalconcept@gmail.com" className="text-sm font-medium text-[#1d1d1f] hover:text-[#c95510] transition-colors">
                        enjdigitalconcept@gmail.com
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5">
                    <div className="w-9 h-9 rounded-full bg-[#fff1e6] flex items-center justify-center text-[#c95510] shrink-0 mt-0.5">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold tracking-wider text-[#6e6e73] uppercase">Phone & WhatsApp</span>
                      <a href="tel:+2348133535756" className="text-sm font-medium text-[#1d1d1f] hover:text-[#c95510] transition-colors">
                        +234 (0) 813 353 5756
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5">
                    <div className="w-9 h-9 rounded-full bg-[#fff1e6] flex items-center justify-center text-[#c95510] shrink-0 mt-0.5">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold tracking-wider text-[#6e6e73] uppercase">Physical Address</span>
                      <address className="not-italic text-sm font-medium text-[#1d1d1f] leading-snug">
                        No. 1 Thatcher Building, Jiddari Junction,<br />
                        Maiduguri, Borno State, Nigeria
                      </address>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-black/10">
                  <p className="text-xs text-[#6e6e73]">
                    Business Hours: Monday – Saturday (8:00 AM – 9:00 PM WAT)
                  </p>
                </div>
              </aside>

              {/* Right: Interactive Form Panel */}
              <section className="p-8 sm:p-10 rounded-3xl bg-white border border-black/10 shadow-lg">
                <h2 className="font-display text-2xl sm:text-3xl font-medium text-[#1d1d1f] mb-2">Send an enquiry</h2>
                <p className="text-[#6e6e73] text-sm mb-6">
                  Share a few details and your message will be dispatched directly to our team.
                </p>

                <form onSubmit={handleContactSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="name" className="block text-xs font-semibold text-[#1d1d1f] mb-1.5">
                        Your name *
                      </label>
                      <input
                        id="name"
                        type="text"
                        required
                        placeholder="e.g. Fatima Ali"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-[#f47b20] focus:ring-2 focus:ring-[#f47b20]/20 outline-none text-sm bg-white"
                      />
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-xs font-semibold text-[#1d1d1f] mb-1.5">
                        Email address *
                      </label>
                      <input
                        id="email"
                        type="email"
                        required
                        placeholder="e.g. fatima@example.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-[#f47b20] focus:ring-2 focus:ring-[#f47b20]/20 outline-none text-sm bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="service" className="block text-xs font-semibold text-[#1d1d1f] mb-1.5">
                      What can we help with? *
                    </label>
                    <select
                      id="service"
                      required
                      value={formData.service}
                      onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-[#f47b20] focus:ring-2 focus:ring-[#f47b20]/20 outline-none text-sm bg-white text-[#1d1d1f]"
                    >
                      <option value="" disabled>Select a service</option>
                      <option value="Digital printing">Digital printing & Signage</option>
                      <option value="Product supply">Product & General supply</option>
                      <option value="Renewable energy">Renewable energy & Solar</option>
                      <option value="Custom apparel & embroidery">Custom apparel & Embroidery</option>
                      <option value="Laser engraving">Laser engraving</option>
                      <option value="Other enquiry">Other enquiry</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-xs font-semibold text-[#1d1d1f] mb-1.5">
                      Your message *
                    </label>
                    <textarea
                      id="message"
                      required
                      rows={4}
                      placeholder="Describe your project, quantities, timeline, or required specs..."
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-[#f47b20] focus:ring-2 focus:ring-[#f47b20]/20 outline-none text-sm bg-white resize-y"
                    ></textarea>
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row sm:items-center gap-4">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="inline-flex items-center justify-center px-7 py-3 rounded-full bg-[#1d1d1f] hover:bg-[#3a3a3c] text-white text-xs font-semibold tracking-wide transition-colors disabled:opacity-60 cursor-pointer"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          <span>Sending Message…</span>
                        </>
                      ) : (
                        <span>Send Message</span>
                      )}
                    </button>

                    <p className={`text-xs ${
                      submitStatus.type === 'success' 
                        ? 'text-emerald-600 font-semibold flex items-center gap-1.5' 
                        : submitStatus.type === 'error'
                        ? 'text-red-600'
                        : 'text-[#6e6e73]'
                    }`}>
                      {submitStatus.type === 'success' && <CheckCircle2 className="w-4 h-4" />}
                      {submitStatus.message}
                    </p>
                  </div>
                </form>
              </section>
            </div>
          </div>
        )}

      </main>

      {/* ========================================================
          FOOTER (Brand, Details, Newsletter, Copyright)
         ======================================================== */}
      <footer className="w-[min(1240px,calc(100%-32px))] mx-auto pb-12 pt-8 border-t border-black/10 mt-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-10">
          
          {/* Brand Info */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <img 
                src="/logo.png" 
                alt="ENJ Logo" 
                className="w-12 h-12 rounded-full object-cover bg-white border border-gray-200" 
                onError={(e) => { (e.target as HTMLImageElement).src = '/assets/aistudio/logo_3018c959.png'; }}
              />
              <div>
                <strong className="block font-display text-lg font-medium text-[#1d1d1f]">ENJ Digital Concept</strong>
                <span className="block text-[11px] text-[#6e6e73]">Ideas Made Visible</span>
              </div>
            </div>
            <p className="text-xs text-[#6e6e73] leading-relaxed max-w-sm">
              Your one-stop destination for digital printing, general product supplies, and clean renewable energy solutions in Maiduguri, Borno State, Nigeria.
            </p>
          </div>

          {/* Quick Location & Direct Contact */}
          <div>
            <h3 className="text-[11px] font-bold tracking-widest text-[#6e6e73] uppercase mb-3">Visit Us</h3>
            <p className="text-xs text-[#515154] leading-relaxed mb-2">
              No. 1 Thatcher Building, Jiddari Junction,<br />
              Maiduguri, Borno State — Nigeria
            </p>
            <a href="tel:+2348133535756" className="block text-xs text-[#515154] hover:text-[#c95510] mb-1">
              +234 (0) 813 353 5756
            </a>
            <a href="mailto:enjdigitalconcept@gmail.com" className="block text-xs text-[#515154] hover:text-[#c95510]">
              enjdigitalconcept@gmail.com
            </a>
          </div>

          {/* Newsletter Subscribe */}
          <div>
            <h3 className="text-[11px] font-bold tracking-widest text-[#6e6e73] uppercase mb-3">Get in Touch</h3>
            <form onSubmit={handleNewsletterSubmit} className="flex gap-2 max-w-xs mb-2">
              <input
                type="email"
                required
                placeholder="Your email address"
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-full border border-gray-300 focus:border-[#f47b20] outline-none bg-white"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-full bg-[#1d1d1f] hover:bg-[#3a3a3c] text-white text-xs font-semibold shrink-0 cursor-pointer"
              >
                Subscribe
              </button>
            </form>
            <p className="text-[11px] text-[#6e6e73]">
              {newsletterStatus || 'Opens an email to request newsletter and supply updates.'}
            </p>
          </div>
        </div>

        {/* Footer Bottom Bar */}
        <div className="pt-6 border-t border-black/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#6e6e73]">
          <span>© 2026 ENJ Digital Concept. All Rights Reserved.</span>
          <span>Made with care in Maiduguri, Nigeria</span>
        </div>
      </footer>
      </div>

      {/* Top Animated Laser Progress Bar on Page Switch */}
      {isPageLoading && (
        <div className="fixed top-0 left-0 right-0 h-[3.5px] z-[120] overflow-hidden bg-black/20">
          <div className="h-full w-full bg-gradient-to-r from-[#06b6d4] via-[#ec4899] to-[#f47b20] shadow-[0_0_16px_rgba(244,123,32,0.9)] animate-laser" />
        </div>
      )}

      {/* Full-Page Backdrop Blur & Cool High-Tech CMYK Loading Modal */}
      {isPageLoading && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-2xl animate-in fade-in duration-300">
          <div className="relative w-full max-w-[340px] sm:max-w-sm rounded-[32px] p-8 text-center text-white overflow-hidden shadow-[0_32px_90px_rgba(0,0,0,0.65)] border border-white/20 bg-[#0d1017]/90 backdrop-blur-3xl animate-in zoom-in-95 duration-250">
            
            {/* Ambient CMYK Ink Aura behind the card */}
            <div className="absolute -top-20 -left-20 w-44 h-44 bg-[#06b6d4]/35 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
            <div className="absolute -bottom-20 -right-20 w-44 h-44 bg-[#f47b20]/40 rounded-full blur-3xl pointer-events-none animate-pulse [animation-delay:1s]"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-36 h-36 bg-[#ec4899]/25 rounded-full blur-3xl pointer-events-none"></div>

            {/* High-Tech Vertical Laser Scanning Line */}
            <div className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#06b6d4] to-transparent shadow-[0_0_14px_#06b6d4] animate-scan-laser pointer-events-none z-20"></div>

            {/* Center Holographic Brand Badge with Rotating CMYK Orbit */}
            <div className="relative mx-auto w-24 h-24 mb-5 flex items-center justify-center">
              {/* Outer rotating ring with CMYK ink dots */}
              <div className="absolute inset-0 rounded-full border border-white/15 animate-cmyk-spin">
                <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-[#06b6d4] shadow-[0_0_12px_#06b6d4]"></span>
                <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-[#ec4899] shadow-[0_0_12px_#ec4899]"></span>
                <span className="absolute top-1/2 -left-1.5 -translate-y-1/2 w-3 h-3 rounded-full bg-[#eab308] shadow-[0_0_12px_#eab308]"></span>
                <span className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-3 h-3 rounded-full bg-[#f47b20] shadow-[0_0_12px_#f47b20]"></span>
              </div>

              {/* Secondary pulsing ring */}
              <div className="absolute inset-2 rounded-full border border-[#f47b20]/40 animate-ping [animation-duration:2.5s] pointer-events-none"></div>

              {/* Core Logo Avatar */}
              <div className="relative z-10 w-16 h-16 rounded-2xl bg-white/10 p-1.5 backdrop-blur-md border border-white/30 shadow-inner flex items-center justify-center">
                <img
                  src="/logo.png"
                  alt="ENJ Digital Concept"
                  className="w-full h-full object-cover rounded-xl shadow-md"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/assets/aistudio/logo_3018c959.png';
                  }}
                />
              </div>
            </div>

            {/* Typography */}
            <div className="space-y-1.5 mb-6">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[10px] uppercase font-bold tracking-widest text-[#f47b20]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#06b6d4] animate-ping"></span>
                <span>ENJ DIGITAL STUDIO</span>
              </div>
              <h3 className="font-display text-lg sm:text-xl font-semibold text-white tracking-tight">
                {targetPage === 'company' ? 'Entering Company Profile' : targetPage === 'contact' ? 'Opening Contact & Orders' : 'Entering Main Studio'}
              </h3>
              <p className="text-xs text-white/60">
                Rendering precision print views...
              </p>
            </div>

            {/* High-Precision Progress Bar with Laser Head */}
            <div className="relative w-full h-2 rounded-full bg-white/10 overflow-hidden p-[1px] border border-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-[#06b6d4] via-[#ec4899] to-[#f47b20] shadow-[0_0_14px_rgba(244,123,32,0.9)] animate-progress-fill"></div>
            </div>

            {/* Active CMYK status badges */}
            <div className="flex items-center justify-center gap-4 mt-5 text-[10px] font-mono tracking-wider text-white/50">
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#06b6d4]"></span>C</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#ec4899]"></span>M</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#eab308]"></span>Y</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#f47b20]"></span>K</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
