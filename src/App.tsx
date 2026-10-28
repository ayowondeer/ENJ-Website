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
  Loader2, 
  Send, 
  AlertCircle, 
  RotateCcw, 
  ArrowRight,
  ShieldCheck,
  Store
} from 'lucide-react';
import ShopView from './components/ShopView';
import AdminPortal from './components/AdminPortal';
import CartDrawer from './components/CartDrawer';
import { CartItem, ProductItem } from './firebase';
import { 
  TestimonialItem, 
  getLocalTestimonials, 
  fetchLiveTestimonials 
} from './data/testimonials';

export default function App() {
  const [currentPage, setCurrentPage] = useState<'home' | 'shop' | 'company' | 'contact' | 'admin'>('home');
  const [targetPage, setTargetPage] = useState<'home' | 'shop' | 'company' | 'contact' | 'admin' | null>(null);
  const [isPageLoading, setIsPageLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Testimonials State (dynamically editable, with Nigerian names)
  const [testimonials, setTestimonials] = useState<TestimonialItem[]>(() => getLocalTestimonials());

  // Cart State (stored in localStorage for seamless persistence)
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('enj_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('enj_cart', JSON.stringify(cart));
    } catch (e) {
      console.warn("Could not save cart to localStorage", e);
    }
  }, [cart]);

  const addToCart = (product: ProductItem, qty: number = 1, selectedColor?: string, selectedSize?: string) => {
    setCart((prev) => {
      const existing = prev.find(item => 
        item.product.id === product.id && 
        item.selectedColor === selectedColor && 
        item.selectedSize === selectedSize
      );
      if (existing) {
        return prev.map(item => 
          (item.product.id === product.id && item.selectedColor === selectedColor && item.selectedSize === selectedSize)
            ? { ...item, quantity: item.quantity + qty } 
            : item
        );
      }
      return [...prev, { product, quantity: qty, selectedColor, selectedSize }];
    });
  };

  const updateQuantity = (itemIndex: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemIndex);
      return;
    }
    setCart((prev) => prev.map((item, idx) => 
      idx === itemIndex ? { ...item, quantity } : item
    ));
  };

  const removeFromCart = (itemIndex: number) => {
    setCart((prev) => prev.filter((_, idx) => idx !== itemIndex));
  };

  const clearCart = () => {
    setCart([]);
  };

  // Contact Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    service: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedData, setSubmittedData] = useState<{
    name: string;
    email: string;
    service: string;
    message: string;
  } | null>(null);
  const [submitStatus, setSubmitStatus] = useState<{
    type: 'idle' | 'loading' | 'success' | 'error';
    message: string;
  }>({
    type: 'idle',
    message: "We'll send your message directly to ENJ Digital Concept."
  });

  // Newsletter State
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterStatus, setNewsletterStatus] = useState('');

  // Testimonials live sync
  useEffect(() => {
    fetchLiveTestimonials().then(setTestimonials);

    const handleTestimonialsUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<TestimonialItem[]>;
      if (customEvent.detail) {
        setTestimonials(customEvent.detail);
      }
    };

    window.addEventListener('enj_testimonials_changed', handleTestimonialsUpdate);
    return () => window.removeEventListener('enj_testimonials_changed', handleTestimonialsUpdate);
  }, []);

  // Scroll Position State for Apple Fluid Parallax Effect
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setScrollY(window.scrollY);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Apple HIG Scroll-Reveal Observer for all sections and cards
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
          }
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -30px 0px' }
    );

    const timer = setTimeout(() => {
      const elements = document.querySelectorAll('.scroll-reveal');
      elements.forEach((el) => observer.observe(el));
    }, 60);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [currentPage]);

  // Sync hash routing and browser back/forward buttons
  useEffect(() => {
    const getCleanHash = () => {
      return window.location.hash.replace(/^#\/?/, '').replace(/\/$/, '').toLowerCase();
    };

    const handleHashChange = () => {
      const hash = getCleanHash();
      const target: 'home' | 'shop' | 'company' | 'contact' | 'admin' = 
        hash === 'shop' ? 'shop' :
        hash === 'admin' ? 'admin' :
        hash === 'company' ? 'company' : 
        hash === 'contact' ? 'contact' : 'home';

      setCurrentPage((prev) => {
        if (prev !== target) {
          window.scrollTo({ top: 0, behavior: 'instant' });
          return target;
        }
        return prev;
      });

      if (target === 'shop') {
        document.title = 'Store & Products — ENJ Digital Concept';
      } else if (target === 'admin') {
        document.title = 'Merchant Admin — ENJ Store Manager';
      } else if (target === 'company') {
        document.title = 'Company — ENJ Digital Concept';
      } else if (target === 'contact') {
        document.title = 'Contact — ENJ Digital Concept';
      } else {
        document.title = 'ENJ Digital Concept — High-Quality Prints';
      }
    };

    const initial = getCleanHash();
    if (initial === 'shop' || initial === 'admin' || initial === 'company' || initial === 'contact') {
      setCurrentPage(initial);
      if (initial === 'shop') document.title = 'Store & Products — ENJ Digital Concept';
      if (initial === 'admin') document.title = 'Merchant Admin — ENJ Store Manager';
      if (initial === 'company') document.title = 'Company — ENJ Digital Concept';
      if (initial === 'contact') document.title = 'Contact — ENJ Digital Concept';
    }

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateTo = (page: 'home' | 'shop' | 'company' | 'contact' | 'admin') => {
    if (page === currentPage) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setMobileMenuOpen(false);
    setCurrentPage(page);
    window.location.hash = page === 'home' ? '' : page;
    window.scrollTo({ top: 0, behavior: 'instant' });

    if (page === 'shop') {
      document.title = 'Store & Products — ENJ Digital Concept';
    } else if (page === 'admin') {
      document.title = 'Merchant Admin — ENJ Store Manager';
    } else if (page === 'company') {
      document.title = 'Company — ENJ Digital Concept';
    } else if (page === 'contact') {
      document.title = 'Contact — ENJ Digital Concept';
    } else {
      document.title = 'ENJ Digital Concept — High-Quality Prints';
    }
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = formData.name.trim();
    const trimmedEmail = formData.email.trim();
    const trimmedMessage = formData.message.trim();

    if (!trimmedName || !trimmedEmail || !trimmedMessage) {
      setSubmitStatus({
        type: 'error',
        message: 'Please provide your name, email, and message.'
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setSubmitStatus({
        type: 'error',
        message: 'Please enter a valid email address.'
      });
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus({
      type: 'loading',
      message: 'Dispatching your message directly to enjdigitalconcept@gmail.com…'
    });

    const payload = {
      name: trimmedName,
      email: trimmedEmail,
      service: formData.service || 'General Enquiry',
      message: trimmedMessage,
      _subject: `New Enquiry from ${trimmedName} — ${formData.service || 'ENJ Digital Concept'}`,
      _replyto: trimmedEmail,
      _template: 'table',
      _captcha: 'false'
    };

    try {
      const response = await fetch('https://formsubmit.co/ajax/enjdigitalconcept@gmail.com', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json().catch(() => ({}));

      if (response.ok || result.success === true || result.success === 'true' || result.message) {
        setSubmittedData({
          name: payload.name,
          email: payload.email,
          service: payload.service,
          message: payload.message
        });
        setSubmitStatus({
          type: 'success',
          message: 'Your message has been sent directly to enjdigitalconcept@gmail.com!'
        });
        setFormData({ name: '', email: '', service: '', message: '' });
      } else {
        throw new Error(result.message || 'Submission failed');
      }
    } catch {
      setSubmitStatus({
        type: 'error',
        message: 'Direct automated dispatch could not complete. Click below to send via your email client or WhatsApp.'
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

  // If on the dedicated Shop App: render the isolated clean ShopView
  if (currentPage === 'shop') {
    return (
      <div className="animate-ios-enter selection:bg-[#f47b20] selection:text-white">
        <ShopView
          cart={cart}
          addToCart={addToCart}
          openCart={() => setIsCartOpen(true)}
          onNavigateHome={() => navigateTo('home')}
          onNavigateAdmin={() => navigateTo('admin')}
        />
        <CartDrawer
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
          cart={cart}
          updateQuantity={updateQuantity}
          removeFromCart={removeFromCart}
          clearCart={clearCart}
        />
      </div>
    );
  }

  // If on the dedicated Store Owner / Merchant Portal: render AdminPortal
  if (currentPage === 'admin') {
    return (
      <div className="animate-ios-enter selection:bg-[#f47b20] selection:text-white">
        <AdminPortal
          onNavigateHome={() => navigateTo('home')}
          onNavigateShop={() => navigateTo('shop')}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-[#1d1d1f] relative flex flex-col selection:bg-[#f47b20] selection:text-white">
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

      {/* Floating Pill Navigation Header: Scaled for a refined, compact, luxury feel */}
      <header className="fixed top-3 sm:top-5 left-1/2 -translate-x-1/2 z-50 w-[min(780px,calc(100%-32px))] pointer-events-auto">
        <nav className="glass-pill rounded-full px-3 sm:px-4 py-1.5 flex items-center justify-between shadow-[0_16px_36px_-6px_rgba(0,0,0,0.14),0_3px_12px_rgba(0,0,0,0.06)] border border-white/85">
          {/* Logo Icon Only */}
          <button 
            onClick={() => navigateTo('home')} 
            className="flex items-center text-left focus:outline-none cursor-pointer group apple-bounce"
            aria-label="ENJ Digital Concept Home"
          >
            <img 
              src="/logo.png" 
              alt="ENJ Logo" 
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover bg-white border border-gray-100 shadow-xs transition-transform duration-200 group-hover:scale-110 active:scale-90"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/assets/aistudio/logo_3018c959.png';
              }}
            />
          </button>

          {/* Navigation Menu: Home, Company, Contact */}
          <div className="hidden md:flex items-center gap-1 bg-black/5 p-0.5 rounded-full border border-black/5">
            <button
              onClick={() => navigateTo('home')}
              className={`px-3 py-1 text-[11px] font-semibold rounded-full cursor-pointer nav-pill-btn ${
                currentPage === 'home'
                  ? 'bg-white text-[#1d1d1f] shadow-xs font-bold scale-[1.02]'
                  : 'text-[#515154] hover:text-[#c95510]'
              }`}
            >
              Home
            </button>
            <button
              onClick={() => navigateTo('company')}
              className={`px-3 py-1 text-[11px] font-semibold rounded-full cursor-pointer nav-pill-btn ${
                currentPage === 'company'
                  ? 'bg-white text-[#1d1d1f] shadow-xs font-bold scale-[1.02]'
                  : 'text-[#515154] hover:text-[#c95510]'
              }`}
            >
              Company
            </button>
            <button
              onClick={() => navigateTo('contact')}
              className={`px-3 py-1 text-[11px] font-semibold rounded-full cursor-pointer nav-pill-btn ${
                currentPage === 'contact'
                  ? 'bg-white text-[#1d1d1f] shadow-xs font-bold scale-[1.02]'
                  : 'text-[#515154] hover:text-[#c95510]'
              }`}
            >
              Contact
            </button>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigateTo('shop')}
              className="inline-flex items-center px-3.5 py-1.5 rounded-full bg-[#1d1d1f] hover:bg-[#3a3a3c] text-white text-[11px] font-semibold tracking-wide shadow-xs cursor-pointer apple-bounce"
            >
              <span>Start Order</span>
            </button>

            {/* Mobile Menu Toggle Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1 rounded-full bg-black/5 hover:bg-black/10 text-[#1d1d1f] transition-colors cursor-pointer apple-bounce"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-3.5 h-3.5" /> : <Menu className="w-3.5 h-3.5" />}
            </button>
          </div>
        </nav>

        {/* Floating Mobile Dropdown Panel */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-2 p-3 bg-white/95 backdrop-blur-2xl border border-white/80 rounded-2xl shadow-xl flex flex-col gap-1 animate-ios-slide-up">
            <button
              onClick={() => navigateTo('home')}
              className={`w-full text-left px-3.5 py-2 rounded-xl text-xs font-medium cursor-pointer apple-bounce ${
                currentPage === 'home' ? 'bg-[#f47b20]/15 text-[#1d1d1f] font-bold' : 'hover:bg-gray-100 text-[#424245]'
              }`}
            >
              Home
            </button>
            <button
              onClick={() => navigateTo('company')}
              className={`w-full text-left px-3.5 py-2 rounded-xl text-xs font-medium cursor-pointer apple-bounce ${
                currentPage === 'company' ? 'bg-[#f47b20]/15 text-[#1d1d1f] font-bold' : 'hover:bg-gray-100 text-[#424245]'
              }`}
            >
              Company
            </button>
            <button
              onClick={() => navigateTo('contact')}
              className={`w-full text-left px-3.5 py-2 rounded-xl text-xs font-medium cursor-pointer apple-bounce ${
                currentPage === 'contact' ? 'bg-[#f47b20]/15 text-[#1d1d1f] font-bold' : 'hover:bg-gray-100 text-[#424245]'
              }`}
            >
              Contact
            </button>
            <div className="pt-1.5 border-t border-gray-100 flex flex-col gap-1">
              <button
                onClick={() => navigateTo('shop')}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#f47b20] text-white text-xs font-semibold shadow-xs cursor-pointer apple-bounce"
              >
                <Store className="w-3.5 h-3.5" />
                <span>Visit Online Store</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Entire Page Content: fast, snappy bouncy transition per view */}
      <div 
        key={currentPage}
        className="flex-1 flex flex-col min-h-screen animate-ios-enter"
      >
        <main className={`flex-1 ${currentPage === 'home' ? 'pt-0' : 'pt-20 sm:pt-24'} pb-16`}>

        {/* ========================================================
            PAGE 1: HOME PAGE
           ======================================================== */}
        {currentPage === 'home' && (
          <div className="animate-in fade-in duration-300">
            {/* Hero Banner: Fullscreen viewport height (100dvh) fitting any screen before scrolling */}
            <div className="w-full m-0 p-0 relative">
              <div className="relative w-full h-[100dvh] min-h-[560px] overflow-hidden text-white flex flex-col justify-between items-center px-4 sm:px-8 md:px-12 pt-20 sm:pt-24 pb-6 sm:pb-8 isolate">
                
                {/* 1. Background Image with Apple Fluid Parallax Effect */}
                <div 
                  className="absolute inset-0 w-full h-[120%] pointer-events-none select-none overflow-hidden"
                  style={{
                    transform: `translate3d(0, ${Math.min(scrollY * 0.22, 180)}px, 0)`,
                    willChange: 'transform'
                  }}
                >
                  <img
                    src="/hero-bg.png"
                    alt="Industrial Digital Printing Press"
                    style={{
                      transform: `scale(${1.02 + Math.min(scrollY * 0.00035, 0.08)})`,
                      willChange: 'transform'
                    }}
                    className="w-full h-full object-cover object-center transition-transform duration-75 ease-out"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/assets/aistudio/image_699b0ca6.png';
                    }}
                  />
                </div>

                {/* 2. Cinematic Dark Gradient Overlay */}
                <div 
                  className="absolute inset-0 z-0 pointer-events-none"
                  style={{
                    background: 'radial-gradient(circle at center, rgba(3, 7, 18, 0.65) 0%, rgba(3, 7, 18, 0.85) 75%, rgba(2, 4, 10, 0.95) 100%)'
                  }}
                />

                {/* 3. Subtle Colored Ambient Accents */}
                <div 
                  className="absolute -bottom-12 left-1/4 w-[360px] h-[180px] rounded-full pointer-events-none z-0"
                  style={{
                    background: 'radial-gradient(ellipse, rgba(6, 182, 212, 0.24) 0%, transparent 70%)',
                    filter: 'blur(50px)'
                  }}
                />

                {/* Top spacer to balance navbar */}
                <div className="h-2 sm:h-4 w-full" aria-hidden="true" />

                {/* Center Content: Heading, Description, and CTAs with Parallax Depth */}
                <div 
                  className="relative z-10 max-w-2xl mx-auto text-center flex flex-col items-center my-auto px-2 transition-transform duration-75 ease-out"
                  style={{
                    transform: `translate3d(0, ${Math.min(scrollY * 0.1, 75)}px, 0)`,
                    opacity: Math.max(1 - scrollY / 650, 0),
                    willChange: 'transform, opacity'
                  }}
                >
                  <h1 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold leading-[1.12] tracking-tight mb-3 sm:mb-4 text-white drop-shadow-sm">
                    High-quality prints, delivered right on time.
                  </h1>
                  
                  <p className="text-slate-200/90 text-xs sm:text-sm md:text-base leading-relaxed max-w-lg mx-auto mb-6 sm:mb-8 font-normal drop-shadow-xs">
                    Turning ideas into striking physical realities. As a premier printing powerhouse, we specialize in high-impact print solutions for ambitious brands, corporate organizations, and creative individuals.
                  </p>

                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <button
                      onClick={() => navigateTo('shop')}
                      className="inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-[#f47b20] hover:bg-[#c95510] text-white text-xs font-semibold shadow-md transition-all hover:scale-105 active:scale-95 cursor-pointer apple-interactive"
                    >
                      <span>Start Order</span>
                    </button>

                    <button
                      onClick={() => navigateTo('company')}
                      className="inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-black/40 hover:bg-black/60 text-white border border-white/25 text-xs font-medium backdrop-blur-md transition-all hover:border-white/50 cursor-pointer hover:scale-105 active:scale-95 apple-interactive"
                    >
                      <span>Explore Company</span>
                    </button>
                  </div>
                </div>

                {/* Bottom Scroll Cue */}
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('services-section');
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="relative z-10 flex flex-col items-center gap-1.5 opacity-75 hover:opacity-100 transition-opacity cursor-pointer group pb-1"
                  aria-label="Scroll to services"
                >
                  <span className="text-[10px] uppercase tracking-widest text-slate-300 font-medium group-hover:text-white transition-colors">
                    Scroll to explore
                  </span>
                  <div className="w-4 h-7 rounded-full border border-white/40 group-hover:border-white/80 transition-colors flex justify-center pt-1.5">
                    <span className="w-1 h-1.5 rounded-full bg-[#f47b20] animate-bounce" />
                  </div>
                </button>
              </div>
            </div>

            {/* Section: Print Services Grid - Contained with proper luxury whitespace */}
            <div id="services-section" className="max-w-5xl mx-auto px-4 sm:px-6 pt-12 sm:pt-16 pb-6 scroll-reveal">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                <div>
                  <p className="text-[10px] font-bold tracking-widest text-[#6e6e73] uppercase mb-1.5">What we do</p>
                  <h2 className="font-display text-2xl sm:text-3xl font-medium tracking-tight text-[#1d1d1f]">
                    Print made to<br className="hidden sm:inline" /> make an impact.
                  </h2>
                </div>
                <p className="text-[#6e6e73] text-xs sm:text-sm max-w-sm leading-relaxed">
                  Professional branding solutions tailored for corporate marketing, events, and personal project needs.
                </p>
              </div>

              {/* 6 Visual Services Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {/* 01 */}
                <div 
                  onClick={() => navigateTo('shop')} 
                  className="group rounded-2xl p-3 bg-white/70 backdrop-blur-md border border-white/90 shadow-xs hover:shadow-lg transition-all duration-300 cursor-pointer"
                >
                  <div className="relative h-44 sm:h-48 rounded-xl overflow-hidden bg-gray-100 mb-3">
                    <img 
                      src="/paper.jpeg" 
                      alt="Paper & Corporate Printing" 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => { (e.target as HTMLImageElement).src = '/assets/aistudio/paper_f6713a43.jpeg'; }}
                    />
                    <span className="absolute top-2.5 left-2.5 w-7 h-7 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center font-display font-bold text-[10px] text-[#1d1d1f] shadow-xs">
                      01
                    </span>
                  </div>
                  <div className="mb-1">
                    <h3 className="font-display text-sm font-semibold text-[#1d1d1f]">Paper & Corporate Printing</h3>
                  </div>
                  <p className="text-[#6e6e73] text-xs leading-relaxed line-clamp-2">
                    Elevate your brand touchpoints with crisp, high-resolution stationery and marketing collateral.
                  </p>
                </div>

                {/* 02 */}
                <div 
                  onClick={() => navigateTo('shop')}
                  className="group rounded-2xl p-3 bg-white/70 backdrop-blur-md border border-white/90 shadow-xs hover:shadow-lg transition-all duration-300 cursor-pointer"
                >
                  <div className="relative h-44 sm:h-48 rounded-xl overflow-hidden bg-gray-100 mb-3">
                    <img 
                      src="/banner.jpeg" 
                      alt="Large-format & Outdoor Signage" 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => { (e.target as HTMLImageElement).src = '/assets/aistudio/banner_f14a3920.jpeg'; }}
                    />
                    <span className="absolute top-2.5 left-2.5 w-7 h-7 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center font-display font-bold text-[10px] text-[#1d1d1f] shadow-xs">
                      02
                    </span>
                  </div>
                  <div className="mb-1">
                    <h3 className="font-display text-sm font-semibold text-[#1d1d1f]">Large-format & Outdoor Signage</h3>
                  </div>
                  <p className="text-[#6e6e73] text-xs leading-relaxed line-clamp-2">
                    Turn heads and capture foot traffic with high-impact visuals designed to withstand the elements.
                  </p>
                </div>

                {/* 03 */}
                <div 
                  onClick={() => navigateTo('shop')}
                  className="group rounded-2xl p-3 bg-white/70 backdrop-blur-md border border-white/90 shadow-xs hover:shadow-lg transition-all duration-300 cursor-pointer"
                >
                  <div className="relative h-44 sm:h-48 rounded-xl overflow-hidden bg-gray-100 mb-3">
                    <img 
                      src="/shirt.jpeg" 
                      alt="Custom Apparel & Textile Printing" 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => { (e.target as HTMLImageElement).src = '/assets/aistudio/shirt_f6a3624f.jpeg'; }}
                    />
                    <span className="absolute top-2.5 left-2.5 w-7 h-7 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center font-display font-bold text-[10px] text-[#1d1d1f] shadow-xs">
                      03
                    </span>
                  </div>
                  <div className="mb-1">
                    <h3 className="font-display text-sm font-semibold text-[#1d1d1f]">Custom Apparel & Textile</h3>
                  </div>
                  <p className="text-[#6e6e73] text-xs leading-relaxed line-clamp-2">
                    Outfit your team or launch your merch line with durable, vibrant apparel customization.
                  </p>
                </div>

                {/* 04 */}
                <div 
                  onClick={() => navigateTo('shop')}
                  className="group rounded-2xl p-3 bg-white/70 backdrop-blur-md border border-white/90 shadow-xs hover:shadow-lg transition-all duration-300 cursor-pointer"
                >
                  <div className="relative h-44 sm:h-48 rounded-xl overflow-hidden bg-gray-100 mb-3">
                    <img 
                      src="/stitch.jpg" 
                      alt="Stitch & Embroidery" 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => { (e.target as HTMLImageElement).src = '/assets/aistudio/stitch_2384090b.jpg'; }}
                    />
                    <span className="absolute top-2.5 left-2.5 w-7 h-7 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center font-display font-bold text-[10px] text-[#1d1d1f] shadow-xs">
                      04
                    </span>
                  </div>
                  <div className="mb-1">
                    <h3 className="font-display text-sm font-semibold text-[#1d1d1f]">Stitch & Embroidery</h3>
                  </div>
                  <p className="text-[#6e6e73] text-xs leading-relaxed line-clamp-2">
                    Bring your brand to life with premium, textured thread work that adds depth and durability.
                  </p>
                </div>

                {/* 05 */}
                <div 
                  onClick={() => navigateTo('shop')}
                  className="group rounded-2xl p-3 bg-white/70 backdrop-blur-md border border-white/90 shadow-xs hover:shadow-lg transition-all duration-300 cursor-pointer"
                >
                  <div className="relative h-44 sm:h-48 rounded-xl overflow-hidden bg-gray-100 mb-3">
                    <img 
                      src="/engrave.jpg" 
                      alt="Laser Engraving" 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => { (e.target as HTMLImageElement).src = '/assets/aistudio/engrave_020d7bfe.jpg'; }}
                    />
                    <span className="absolute top-2.5 left-2.5 w-7 h-7 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center font-display font-bold text-[10px] text-[#1d1d1f] shadow-xs">
                      05
                    </span>
                  </div>
                  <div className="mb-1">
                    <h3 className="font-display text-sm font-semibold text-[#1d1d1f]">Laser Engraving</h3>
                  </div>
                  <p className="text-[#6e6e73] text-xs leading-relaxed line-clamp-2">
                    Permanent, high-precision marking and dimensional cutting that delivers a refined touch.
                  </p>
                </div>

                {/* 06 */}
                <div 
                  onClick={() => navigateTo('shop')}
                  className="group rounded-2xl p-3 bg-white/70 backdrop-blur-md border border-white/90 shadow-xs hover:shadow-lg transition-all duration-300 cursor-pointer"
                >
                  <div className="relative h-44 sm:h-48 rounded-xl overflow-hidden bg-gray-100 mb-3">
                    <img 
                      src="/graphic.jpg" 
                      alt="Graphic Design & Creative Services" 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => { (e.target as HTMLImageElement).src = '/assets/aistudio/graphic_363550c6.jpg'; }}
                    />
                    <span className="absolute top-2.5 left-2.5 w-7 h-7 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center font-display font-bold text-[10px] text-[#1d1d1f] shadow-xs">
                      06
                    </span>
                  </div>
                  <div className="mb-1">
                    <h3 className="font-display text-sm font-semibold text-[#1d1d1f]">Graphic Design & Creative</h3>
                  </div>
                  <p className="text-[#6e6e73] text-xs leading-relaxed line-clamp-2">
                    Professional design solutions built to optimize production and engage your target audience.
                  </p>
                </div>
              </div>

              {/* Explore Store Banner */}
              <div className="mt-10 p-6 rounded-2xl bg-white/50 border border-black/5 flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="font-display text-lg font-medium text-[#1d1d1f]">Visit our separate online store app</h3>
                  <p className="text-[#6e6e73] text-xs mt-0.5">Browse live print products, compare prices in Naira, and pay securely online.</p>
                </div>
                <button
                  onClick={() => navigateTo('shop')}
                  className="whitespace-nowrap px-5 py-2.5 rounded-full bg-[#f47b20] hover:bg-[#c95510] text-white text-xs font-semibold tracking-wide transition-colors cursor-pointer shadow-xs"
                >
                  Start Order
                </button>
              </div>
            </div>

            {/* Section: Impact in Numbers - Compact and Elegant */}
            <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-16 sm:mt-20 scroll-reveal">
              <div className="rounded-3xl p-6 sm:p-10 md:p-12 bg-white/70 backdrop-blur-xl border border-white/80 shadow-xs">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                  <div>
                    <p className="text-[10px] font-bold tracking-widest text-[#6e6e73] uppercase mb-1.5">Our impact</p>
                    <h2 className="font-display text-2xl sm:text-3xl font-medium tracking-tight text-[#1d1d1f]">In numbers.</h2>
                  </div>
                  <p className="text-[#6e6e73] text-xs max-w-xs leading-relaxed">
                    Milestones achieved together with clients across northern Nigeria.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-black/10">
                  <div className="space-y-1">
                    <span className="block font-display text-3xl sm:text-4xl font-light tracking-tight text-[#1d1d1f]">20k+</span>
                    <span className="text-xs font-medium text-[#6e6e73]">Prints & Orders Delivered</span>
                  </div>
                  <div className="space-y-1 md:border-l md:border-black/10 md:pl-6">
                    <span className="block font-display text-3xl sm:text-4xl font-light tracking-tight text-[#1d1d1f]">5+</span>
                    <span className="text-xs font-medium text-[#6e6e73]">Years of Industry Excellence</span>
                  </div>
                  <div className="space-y-1 md:border-l md:border-black/10 md:pl-6">
                    <span className="block font-display text-3xl sm:text-4xl font-light tracking-tight text-[#f47b20]">99%</span>
                    <span className="text-xs font-medium text-[#6e6e73]">Client Satisfaction Rating</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Section: Testimonials */}
            <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-16 sm:mt-20 scroll-reveal">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                <div>
                  <p className="text-[10px] font-bold tracking-widest text-[#6e6e73] uppercase mb-1.5">Kind words</p>
                  <h2 className="font-display text-2xl sm:text-3xl font-medium tracking-tight text-[#1d1d1f]">
                    Trusted by local brands.
                  </h2>
                </div>
                <p className="text-[#6e6e73] text-xs max-w-xs leading-relaxed">
                  We care about the details just as much as the people behind every print.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <figure className="p-6 rounded-2xl bg-white border border-black/5 shadow-xs flex flex-col justify-between">
                  <blockquote className="font-display text-base sm:text-lg text-[#1d1d1f] font-normal leading-snug mb-6">
                    “The clarity of the brochures exceeded all our expectations.”
                  </blockquote>
                  <figcaption className="text-xs font-semibold text-[#1d1d1f]">
                    Sabine Delcroix
                    <span className="block text-[11px] font-normal text-[#6e6e73] mt-0.5">Marketing Manager, Tech</span>
                  </figcaption>
                </figure>

                <figure className="p-6 rounded-2xl bg-[#fff0df]/60 border border-[#f47b20]/20 shadow-xs flex flex-col justify-between">
                  <blockquote className="font-display text-base sm:text-lg text-[#1d1d1f] font-normal leading-snug mb-6">
                    “The quality of our large-format banners completely exceeded expectations. Our go-to-print partner.”
                  </blockquote>
                  <figcaption className="text-xs font-semibold text-[#1d1d1f]">
                    Engr. Emmanuel I. Moses
                    <span className="block text-[11px] font-normal text-[#6e6e73] mt-0.5">CEO — ENJ Digital Concept</span>
                  </figcaption>
                </figure>

                <figure className="p-6 rounded-2xl bg-white border border-black/5 shadow-xs flex flex-col justify-between">
                  <blockquote className="font-display text-base sm:text-lg text-[#1d1d1f] font-normal leading-snug mb-6">
                    “The fastest turnaround on business cards we've ever seen, with absolute color accuracy.”
                  </blockquote>
                  <figcaption className="text-xs font-semibold text-[#1d1d1f]">
                    Lars Vilanova
                    <span className="block text-[11px] font-normal text-[#6e6e73] mt-0.5">Founder of Creative Firm</span>
                  </figcaption>
                </figure>

                <figure className="p-6 rounded-2xl bg-white border border-black/5 shadow-xs flex flex-col justify-between">
                  <blockquote className="font-display text-base sm:text-lg text-[#1d1d1f] font-normal leading-snug mb-6">
                    “Sharp details, consistent colors, and fast turnaround. A truly reliable partner.”
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
            PAGE 2: COMPANY PAGE - Refined & Balanced
           ======================================================== */}
        {currentPage === 'company' && (
          <div className="max-w-5xl mx-auto px-4 sm:px-6 animate-in fade-in duration-300 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 items-end gap-6 mb-10">
              <div>
                <p className="text-[10px] font-bold tracking-widest text-[#6e6e73] uppercase mb-2">What we do</p>
                <h1 className="font-display text-3xl sm:text-4xl font-medium tracking-tight text-[#1d1d1f] leading-tight">
                  One dependable partner for everyday needs.
                </h1>
              </div>
              <div>
                <p className="text-[#6e6e73] text-xs sm:text-sm leading-relaxed">
                  We supply a wide range of products and services to companies, individuals, hotels, churches, schools and government offices.
                </p>
                <div className="flex flex-wrap gap-1.5 mt-4">
                  {['Companies', 'Hotels', 'Churches', 'Schools', 'Government offices'].map((tag) => (
                    <span key={tag} className="px-3 py-1 rounded-full border border-black/10 text-[11px] font-medium text-[#515154] bg-white/60">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* General Supply Section */}
            <div className="mb-12">
              <div className="flex items-center gap-2.5 mb-4">
                <span className="w-7 h-7 rounded-full bg-black/5 text-[#1d1d1f] flex items-center justify-center">
                  <Package className="w-3.5 h-3.5" />
                </span>
                <h2 className="font-display text-xl sm:text-2xl font-medium text-[#1d1d1f]">General supply</h2>
              </div>
              <p className="text-xs text-[#6e6e73] max-w-xl mb-6 leading-relaxed">
                From everyday office essentials to specialized equipment and renewable solar hardware.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {[
                  { title: 'Home appliances', desc: 'Televisions, refrigerators, air conditioners, fans and small kitchen appliances.', icon: 'icon-appliance' },
                  { title: 'Office consumables', desc: 'Paper, toner and ink cartridges, folders, pens, envelopes and desktop supplies.', icon: 'icon-office' },
                  { title: 'Office furniture & fittings', desc: 'Desks, ergonomic chairs, file cabinets, conference tables and reception seating.', icon: 'icon-furniture' },
                  { title: 'Electronics', desc: 'Display screens, audio systems, projectors, power banks and consumer tech.', icon: 'icon-electronics' },
                  { title: 'Electrical equipment', desc: 'Wiring devices, circuit breakers, extension reels, surge protectors and fittings.', icon: 'icon-electrical' },
                  { title: 'Building materials', desc: 'Paints, adhesives, tiles, fasteners, pipes and basic structural supplies.', icon: 'icon-building' },
                  { title: 'Motor vehicle spare parts', desc: 'Filters, brake pads, wiper blades, fluids and common maintenance spares.', icon: 'icon-vehicle' },
                  { title: 'Safety items', desc: 'First-aid kits, fire blankets, extinguishers, signage and safety barriers.', icon: 'icon-safety' },
                  { title: 'Personal protective equipment', desc: 'Helmets, high-vis vests, steel-toe boots, gloves, goggles and masks.', icon: 'icon-safety' },
                  { title: 'Cleaning detergents', desc: 'Disinfectants, mops, industrial cleaners, trash cans and paper towels.', icon: 'icon-cleaning' },
                  { title: 'Computers & ICT accessories', desc: 'Laptops, desktops, keyboards, mice, storage drives and networking parts.', icon: 'icon-computer' }
                ].map((item, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-white/70 border border-white/90 shadow-xs hover:shadow-sm transition-shadow">
                    <span className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-[#1d1d1f] mb-3">
                      <svg className="w-4 h-4"><use href={`#${item.icon}`}></use></svg>
                    </span>
                    <h3 className="font-display text-sm font-semibold text-[#1d1d1f] mb-1">{item.title}</h3>
                    <p className="text-[11px] text-[#6e6e73] leading-relaxed line-clamp-2">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Renewable Energy Solutions */}
            <div className="mb-12 p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-[#1d1d1f] to-[#2d2d30] text-white">
              <div className="max-w-xl">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 text-white/80 text-[11px] font-medium mb-3">
                  <SunMedium className="w-3 h-3 text-white/70" />
                  Renewable Energy
                </span>
                <h2 className="font-display text-2xl sm:text-3xl font-medium tracking-tight mb-3">
                  Clean, reliable solar power for business & home.
                </h2>
                <p className="text-gray-300 text-xs sm:text-sm leading-relaxed mb-5">
                  Complete solar packages: hybrid inverters, deep-cycle tubular & lithium batteries, Tier-1 solar PV modules.
                </p>
                <button
                  onClick={() => navigateTo('shop')}
                  className="px-5 py-2.5 rounded-full bg-[#f47b20] hover:bg-[#c95510] text-white text-xs font-semibold tracking-wide transition-colors cursor-pointer"
                >
                  Explore
                </button>
              </div>
            </div>

            {/* Callout */}
            <div className="p-6 sm:p-8 rounded-2xl bg-[#171717] text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-md mb-12">
              <div>
                <h2 className="font-display text-xl sm:text-2xl font-medium max-w-md">
                  Tell us what you need. We’ll help with the rest.
                </h2>
              </div>
              <button
                onClick={() => navigateTo('contact')}
                className="whitespace-nowrap px-6 py-2.5 rounded-full bg-white text-[#1d1d1f] hover:bg-gray-100 font-bold text-xs tracking-wider uppercase transition-colors cursor-pointer"
              >
                Contact Our Team
              </button>
            </div>
          </div>
        )}

        {/* ========================================================
            PAGE 3: CONTACT PAGE - Refined & Balanced
           ======================================================== */}
        {currentPage === 'contact' && (
          <div className="max-w-5xl mx-auto px-4 sm:px-6 animate-in fade-in duration-300 pt-2">
            <div className="max-w-xl mb-8">
              <p className="text-[10px] font-bold tracking-widest text-[#6e6e73] uppercase mb-1.5">
                ENJ Digital Concept · Maiduguri, Nigeria
              </p>
              <h1 className="font-display text-3xl sm:text-4xl font-medium tracking-tight text-[#1d1d1f] mb-2">
                Let’s make something happen.
              </h1>
              <p className="text-[#6e6e73] text-xs sm:text-sm leading-relaxed">
                Tell us about your print job, product supply needs or renewable energy enquiry.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[0.85fr_1.15fr] gap-6 items-stretch mb-10">
              <aside className="p-6 rounded-2xl bg-white/70 backdrop-blur-xl border border-white/90 shadow-xs flex flex-col gap-6">
                <div>
                  <p className="text-[10px] font-bold tracking-widest text-[#6e6e73] uppercase mb-1">Get in touch</p>
                  <h2 className="font-display text-xl font-medium text-[#1d1d1f] mb-2">We’re here to help.</h2>
                  <p className="text-[#6e6e73] text-xs leading-relaxed">
                    Reach out directly or send us a message using the form.
                  </p>
                </div>

                <div className="space-y-3.5 pt-1">
                  <a 
                    href="tel:+2348133535756" 
                    className="text-xs font-medium text-[#1d1d1f] hover:text-[#c95510] transition-colors flex items-center gap-2.5"
                  >
                    <Phone className="w-4 h-4 text-[#f47b20] shrink-0" />
                    <span>+234 (0) 813 353 5756</span>
                  </a>

                  <a 
                    href="mailto:enjdigitalconcept@gmail.com" 
                    className="text-xs font-medium text-[#1d1d1f] hover:text-[#c95510] transition-colors flex items-center gap-2.5"
                  >
                    <Mail className="w-4 h-4 text-[#f47b20] shrink-0" />
                    <span>enjdigitalconcept@gmail.com</span>
                  </a>

                  <div className="text-xs font-medium text-[#1d1d1f] flex items-start gap-2.5 leading-relaxed">
                    <MapPin className="w-4 h-4 text-[#f47b20] shrink-0 mt-0.5" />
                    <span>No. 1 Thatcher Building, Jiddari Junction, Maiduguri, Borno State</span>
                  </div>
                </div>
              </aside>

              {/* Working Contact Form */}
              <section className="p-6 rounded-2xl bg-white border border-black/5 shadow-xs flex flex-col justify-between">
                {submittedData ? (
                  <div className="py-4 flex flex-col items-start gap-4 animate-in fade-in zoom-in-95 duration-200">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                      <CheckCircle2 className="w-7 h-7" />
                    </div>

                    <div>
                      <h3 className="font-display text-xl font-bold text-[#1d1d1f]">Message Dispatched!</h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Sent to <strong className="text-black">enjdigitalconcept@gmail.com</strong>.
                      </p>
                    </div>

                    <div className="w-full p-3.5 rounded-xl bg-gray-50 border border-gray-200/70 text-xs text-gray-700 space-y-1.5">
                      <div><strong className="text-gray-900">Name:</strong> {submittedData.name}</div>
                      <div><strong className="text-gray-900">Email:</strong> {submittedData.email}</div>
                      <div><strong className="text-gray-900">Service:</strong> {submittedData.service}</div>
                      <div><strong className="text-gray-900">Message:</strong> {submittedData.message}</div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        onClick={() => { setSubmittedData(null); setSubmitStatus({ type: 'idle', message: "We'll send your message directly to ENJ Digital Concept." }); }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Send Another
                      </button>

                      <a
                        href={`https://wa.me/2348133535756?text=${encodeURIComponent(`Hello ENJ Digital Concept! I am ${submittedData.name}. I just sent a website message regarding ${submittedData.service}.`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#25D366] text-white text-xs font-semibold shadow-xs hover:bg-[#20b858] transition-colors"
                      >
                        <Phone className="w-3 h-3" />
                        Confirm via WhatsApp
                      </a>
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      <h3 className="font-display text-xl font-medium text-[#1d1d1f] mb-1">Send us a direct message</h3>
                      <p className="text-xs text-[#6e6e73] mb-4">
                        Fill in your details below and we will get back to you promptly.
                      </p>
                    </div>

                    <form onSubmit={handleContactSubmit} className="space-y-3.5">
                      <div>
                        <label className="block text-[11px] font-semibold text-[#1d1d1f] mb-1">
                          Your Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="e.g. Emmanuel Moses"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-[#f5f5f7] border border-transparent focus:border-[#f47b20] focus:bg-white text-xs outline-none transition-all"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-[#1d1d1f] mb-1">
                            Email Address *
                          </label>
                          <input
                            type="email"
                            required
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="emmanuel@example.com"
                            className="w-full px-3.5 py-2.5 rounded-xl bg-[#f5f5f7] border border-transparent focus:border-[#f47b20] focus:bg-white text-xs outline-none transition-all"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-[#1d1d1f] mb-1">
                            Service / Enquiry
                          </label>
                          <select
                            value={formData.service}
                            onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                            className="w-full px-3.5 py-2.5 rounded-xl bg-[#f5f5f7] border border-transparent focus:border-[#f47b20] focus:bg-white text-xs outline-none transition-all cursor-pointer"
                          >
                            <option value="General Enquiry">General Enquiry</option>
                            <option value="Digital Printing">Digital Printing</option>
                            <option value="Large-format Signage">Large-format Signage</option>
                            <option value="Custom Apparel / Embroidery">Custom Apparel / Embroidery</option>
                            <option value="Laser Engraving">Laser Engraving</option>
                            <option value="Renewable Energy / Solar">Renewable Energy / Solar</option>
                            <option value="Corporate Supplies">Corporate Supplies</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-[#1d1d1f] mb-1">
                          Your Message *
                        </label>
                        <textarea
                          rows={3}
                          required
                          value={formData.message}
                          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                          placeholder="Tell us about the project, quantities, dimensions, or timeline..."
                          className="w-full px-3.5 py-2.5 rounded-xl bg-[#f5f5f7] border border-transparent focus:border-[#f47b20] focus:bg-white text-xs outline-none transition-all resize-y leading-relaxed"
                        />
                      </div>

                      {submitStatus.type === 'error' && (
                        <div className="p-3 rounded-xl bg-red-50 border border-red-200/80 text-xs text-red-700 space-y-2">
                          <div className="flex items-start gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
                            <p className="leading-relaxed text-[11px]">{submitStatus.message}</p>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                            <a
                              href={`mailto:enjdigitalconcept@gmail.com?subject=${encodeURIComponent(`Website enquiry from ${formData.name || 'Client'}: ${formData.service || 'General'}`)}&body=${encodeURIComponent(`Name: ${formData.name}\nEmail: ${formData.email}\nService: ${formData.service}\n\nMessage:\n${formData.message}`)}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-red-600 hover:bg-red-700 text-white font-medium text-[11px] transition-colors"
                            >
                              <Mail className="w-3 h-3" />
                              Open Mail App
                            </a>
                            <a
                              href={`https://wa.me/2348133535756?text=${encodeURIComponent(`Hello ENJ Digital Concept! My name is ${formData.name || 'a customer'}. I would like to enquire about ${formData.service || 'your services'}: ${formData.message}`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-red-300 hover:bg-red-100 text-red-800 font-medium text-[11px] transition-colors"
                            >
                              <Phone className="w-3 h-3" />
                              Send via WhatsApp
                            </a>
                          </div>
                        </div>
                      )}

                      <div className="pt-1 flex flex-col sm:flex-row sm:items-center gap-3">
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-[#1d1d1f] hover:bg-[#3a3a3c] text-white text-xs font-semibold tracking-wide transition-colors disabled:opacity-60 cursor-pointer shadow-xs"
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                              <span>Sending…</span>
                            </>
                          ) : (
                            <span className="inline-flex items-center gap-1.5">
                              <span>Send Message</span>
                              <Send className="w-3 h-3" />
                            </span>
                          )}
                        </button>

                        {submitStatus.type !== 'error' && (
                          <p className={`text-[11px] ${
                            submitStatus.type === 'loading'
                              ? 'text-[#c95510] font-medium flex items-center gap-1'
                              : 'text-[#6e6e73]'
                          }`}>
                            {submitStatus.type === 'loading' && <Loader2 className="w-3 h-3 animate-spin" />}
                            {submitStatus.message}
                          </p>
                        )}
                      </div>
                    </form>
                  </>
                )}
              </section>
            </div>
          </div>
        )}

      </main>

      {/* ========================================================
          FOOTER - Compact, Clean, Luxury
         ======================================================== */}
      <footer className="max-w-5xl mx-auto px-4 sm:px-6 w-full pb-10 pt-8 border-t border-black/10 mt-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-8">
          
          {/* Brand Info */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5 mb-3">
              <img 
                src="/logo.png" 
                alt="ENJ Logo" 
                className="w-10 h-10 rounded-full object-cover bg-white border border-gray-200" 
                onError={(e) => { (e.target as HTMLImageElement).src = '/assets/aistudio/logo_3018c959.png'; }}
              />
              <div>
                <strong className="block font-display text-base font-medium text-[#1d1d1f]">ENJ Digital Concept</strong>
                <span className="block text-[10px] text-[#6e6e73]">Ideas Made Visible</span>
              </div>
            </div>
            <p className="text-xs text-[#6e6e73] leading-relaxed max-w-sm">
              Digital printing, general product supplies, and clean renewable energy solutions in Maiduguri, Borno State, Nigeria.
            </p>
          </div>

          {/* Quick Location & Direct Contact */}
          <div>
            <h3 className="text-[10px] font-bold tracking-widest text-[#6e6e73] uppercase mb-2">Visit Us</h3>
            <p className="text-xs text-[#515154] leading-relaxed mb-1.5">
              No. 1 Thatcher Building, Jiddari Junction,<br />
              Maiduguri, Borno State — Nigeria
            </p>
            <a href="tel:+2348133535756" className="block text-xs text-[#515154] hover:text-[#c95510] mb-0.5">
              +234 (0) 813 353 5756
            </a>
            <a href="mailto:enjdigitalconcept@gmail.com" className="block text-xs text-[#515154] hover:text-[#c95510]">
              enjdigitalconcept@gmail.com
            </a>
          </div>
        </div>

        {/* Footer Bottom Bar */}
        <div className="pt-4 border-t border-black/10 flex items-center justify-between text-[11px] text-[#6e6e73]">
          <span>© 2026 ENJ Digital Concept. All Rights Reserved.</span>
        </div>
      </footer>
      </div>

      {/* Elegant Page Loader with Full-Page Blur */}
      {isPageLoading && (
        <div 
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 pointer-events-none animate-in fade-in duration-150"
          aria-live="polite"
        >
          <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/90 backdrop-blur-2xl border border-white/90 shadow-md">
            <div className="w-3.5 h-3.5 border-2 border-black/15 border-t-[#f47b20] rounded-full animate-spin shrink-0" />
            <span className="text-[11px] font-medium tracking-wide text-[#1d1d1f]">Loading…</span>
          </div>
        </div>
      )}
    </div>
  );
}
