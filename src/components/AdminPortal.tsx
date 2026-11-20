import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Package, 
  CheckCircle2, 
  AlertCircle, 
  ArrowLeft, 
  Search, 
  X, 
  CreditCard, 
  Phone, 
  ImagePlus, 
  Palette, 
  Layers, 
  Star, 
  UploadCloud, 
  Check, 
  ChevronDown, 
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Lock, 
  Eye, 
  EyeOff,
  MessageSquare,
  Copy,
  SlidersHorizontal,
  Clock,
  MapPin,
  Truck,
  LayoutDashboard,
  ArrowRight,
  Briefcase
} from 'lucide-react';
import { 
  TestimonialItem, 
  getLocalTestimonials, 
  fetchLiveTestimonials,
  subscribeTestimonials,
  syncTestimonialToStorage, 
  removeTestimonialFromStorage
} from '../data/testimonials';
import { 
  PortfolioItem, 
  PORTFOLIO_CATEGORIES, 
  getLocalPortfolio, 
  fetchLivePortfolio, 
  subscribePortfolio,
  syncPortfolioItemToStorage, 
  removePortfolioItemFromStorage, 
  PORTFOLIO_CHANGED_EVENT 
} from '../data/portfolio';
import { 
  db, 
  ProductItem, 
  OrderItem, 
  INITIAL_PRODUCTS,
  deleteProductPermanently,
  isProductDeleted,
  deleteOrderPermanently,
  isOrderDeleted,
  fitImagesToFirestoreBudget,
  stripUndefinedDeep
} from '../firebase';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc 
} from 'firebase/firestore';
import AdminAiChat from './AdminAiChat';

interface AdminPortalProps {
  onNavigateHome: () => void;
  onNavigateShop: () => void;
}

const CATEGORIES = [
  'All Products',
  'Marketing & Business Materials',
  'Office supplies',
  'Electronics & Gadgets',
  'Solar & Renewable',
  'Fashion & Apparel',
  'New Arrival',
  'Deals'
];

const PALETTE_COLORS = [
  { name: 'Pure White', hex: '#FFFFFF', border: true },
  { name: 'Matte Black', hex: '#111827' },
  { name: 'Navy Blue', hex: '#1E3A8A' },
  { name: 'Royal Blue', hex: '#2563EB' },
  { name: 'Sky Blue', hex: '#0EA5E9' },
  { name: 'Emerald Green', hex: '#10B981' },
  { name: 'Forest Green', hex: '#065F46' },
  { name: 'Vibrant Orange', hex: '#F97316' },
  { name: 'Crimson Red', hex: '#DC2626' },
  { name: 'Gold / Yellow', hex: '#EAB308' },
  { name: 'Purple', hex: '#9333EA' },
  { name: 'Slate Grey', hex: '#64748B' },
  { name: 'Silver / Light Grey', hex: '#D1D5DB' },
  { name: 'Rose Pink', hex: '#EC4899' },
  { name: 'Earth Brown', hex: '#78350F' }
];

const PRESET_SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', 'A5', 'A4', 'A3', 'Standard'];

export const formatNaira = (amount: number) => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0
  }).format(amount);
};

// Helper to compress local uploaded image files to crisp lightweight Data URLs
const compressImageFile = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 800;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        // Compress as clean JPEG
        const dataUrl = canvas.toDataURL('image/jpeg', 0.76);
        resolve(dataUrl);
      };
      img.onerror = () => resolve(e.target?.result as string);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
};

export default function AdminPortal({ onNavigateHome, onNavigateShop }: AdminPortalProps) {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'orders' | 'testimonials' | 'portfolio'>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All Products');

  // Testimonials State (dynamically editable anytime with Nigerian names)
  const [testimonials, setTestimonials] = useState<TestimonialItem[]>(() => getLocalTestimonials());
  const [isTestimonialModalOpen, setIsTestimonialModalOpen] = useState(false);
  const [editingTestimonial, setEditingTestimonial] = useState<TestimonialItem | null>(null);
  const [tQuote, setTQuote] = useState('');
  const [tAuthor, setTAuthor] = useState('');
  const [tRole, setTRole] = useState('');
  const [tHighlight, setTHighlight] = useState(false);
  const [tSaving, setTSaving] = useState(false);
  const [tError, setTError] = useState<string | null>(null);
  const [testimonialToDelete, setTestimonialToDelete] = useState<TestimonialItem | null>(null);

  useEffect(() => {
    let isMounted = true;
    fetchLiveTestimonials().then((liveList) => {
      if (isMounted) setTestimonials(liveList);
    });
    const unsubTestimonials = subscribeTestimonials((liveList) => {
      if (isMounted) setTestimonials(liveList);
    });

    const handleUpdate = () => {
      setTestimonials(getLocalTestimonials());
    };
    window.addEventListener('enj_testimonials_changed', handleUpdate);
    return () => {
      isMounted = false;
      unsubTestimonials();
      window.removeEventListener('enj_testimonials_changed', handleUpdate);
    };
  }, []);

  const openCreateTestimonial = () => {
    setEditingTestimonial(null);
    setTQuote('');
    setTAuthor('');
    setTRole('');
    setTHighlight(false);
    setTError(null);
    setIsTestimonialModalOpen(true);
  };

  const openEditTestimonial = (t: TestimonialItem) => {
    setEditingTestimonial(t);
    setTQuote(t.quote);
    setTAuthor(t.author);
    setTRole(t.role);
    setTHighlight(Boolean(t.highlight));
    setTError(null);
    setIsTestimonialModalOpen(true);
  };

  const handleSaveTestimonial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tQuote.trim() || !tAuthor.trim()) {
      setTError('Please enter both the testimonial quote and the Nigerian author name.');
      return;
    }
    setTSaving(true);
    setTError(null);

    const payload: TestimonialItem = {
      id: editingTestimonial ? editingTestimonial.id : `test-${Date.now()}`,
      quote: tQuote.trim(),
      author: tAuthor.trim(),
      role: tRole.trim() || 'Verified Client',
      highlight: tHighlight
    };

    try {
      await syncTestimonialToStorage(payload);
      setTestimonials(getLocalTestimonials());
      setIsTestimonialModalOpen(false);
      setStatusMessage(editingTestimonial ? 'Review updated live on homepage!' : 'New review added live on homepage!');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      let msg = err?.message || 'Could not save review to database.';
      try {
        const parsed = JSON.parse(msg);
        if (parsed?.error) msg = String(parsed.error);
      } catch {}
      setTError(`Database notice: ${msg}`);
    } finally {
      setTSaving(false);
    }
  };

  const confirmDeleteTestimonial = async () => {
    if (!testimonialToDelete) return;
    try {
      await removeTestimonialFromStorage(testimonialToDelete.id);
      setTestimonials(getLocalTestimonials());
      setTestimonialToDelete(null);
      setStatusMessage('Review removed from homepage.');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      console.error('Delete review notice:', err);
      setTestimonialToDelete(null);
      setStatusMessage('Could not delete review right now. Please try again.');
      setTimeout(() => setStatusMessage(null), 3500);
    }
  };

  // Portfolio Management State (Showcase services, products, and experiences)
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>(() => getLocalPortfolio());
  const [isPortfolioModalOpen, setIsPortfolioModalOpen] = useState(false);
  const [editingPortfolioItem, setEditingPortfolioItem] = useState<PortfolioItem | null>(null);
  const [portTitle, setPortTitle] = useState('');
  const [portClient, setPortClient] = useState('');
  const [portCategory, setPortCategory] = useState<string>(PORTFOLIO_CATEGORIES[1]);
  const [portYear, setPortYear] = useState('2025');
  const [portDescription, setPortDescription] = useState('');
  const [portServices, setPortServices] = useState('');
  const [portImpact, setPortImpact] = useState('');
  const [portImageUrl, setPortImageUrl] = useState('');
  const [portGallery, setPortGallery] = useState<string[]>([]);
  const [portFeatured, setPortFeatured] = useState(false);
  const [portSaving, setPortSaving] = useState(false);
  const [portError, setPortError] = useState<string | null>(null);
  const [portfolioToDelete, setPortfolioToDelete] = useState<PortfolioItem | null>(null);
  const [isDeletingPortfolio, setIsDeletingPortfolio] = useState(false);
  const [portfolioSearchQuery, setPortfolioSearchQuery] = useState('');
  const [portfolioCategoryFilter, setPortfolioCategoryFilter] = useState('All Projects');
  const [portUrlInput, setPortUrlInput] = useState('');
  const portfolioFileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync Portfolio from Firestore (live + initial) and custom events
  useEffect(() => {
    let isMounted = true;
    fetchLivePortfolio().then(list => {
      if (isMounted) {
        setPortfolioItems(list);
      }
    });

    const unsubPortfolio = subscribePortfolio((list) => {
      if (isMounted) {
        setPortfolioItems(list);
      }
    });

    const handlePortfolioUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<PortfolioItem[]>;
      if (customEvent.detail) {
        setPortfolioItems(customEvent.detail);
      } else {
        setPortfolioItems(getLocalPortfolio());
      }
    };

    window.addEventListener(PORTFOLIO_CHANGED_EVENT, handlePortfolioUpdate);
    return () => {
      isMounted = false;
      unsubPortfolio();
      window.removeEventListener(PORTFOLIO_CHANGED_EVENT, handlePortfolioUpdate);
    };
  }, []);

  const handleAddImageUrl = () => {
    const trimmed = portUrlInput.trim();
    if (!trimmed) return;
    setPortGallery(prev => (prev.includes(trimmed) ? prev : [...prev, trimmed]));
    if (!portImageUrl) {
      setPortImageUrl(trimmed);
    }
    setPortUrlInput('');
  };

  const openCreatePortfolio = () => {
    setEditingPortfolioItem(null);
    setPortTitle('');
    setPortClient('Client Project');
    setPortCategory(PORTFOLIO_CATEGORIES[1] || 'Digital Printing');
    setPortYear(String(new Date().getFullYear()));
    setPortDescription('');
    setPortServices('');
    setPortImpact('');
    setPortImageUrl('');
    setPortGallery([]);
    setPortUrlInput('');
    setPortFeatured(false);
    setPortError(null);
    setIsPortfolioModalOpen(true);
  };

  const openEditPortfolio = (item: PortfolioItem) => {
    setEditingPortfolioItem(item);
    setPortTitle(item.title);
    setPortClient(item.client || 'Client Project');
    setPortCategory(item.category || PORTFOLIO_CATEGORIES[1] || 'Digital Printing');
    setPortYear(item.year || String(new Date().getFullYear()));
    setPortDescription(item.description);
    setPortServices(item.services ? item.services.join(', ') : '');
    setPortImpact(item.impact || '');
    setPortImageUrl(item.imageUrl || '');
    const initialGallery = item.gallery && Array.isArray(item.gallery) && item.gallery.length > 0
      ? item.gallery
      : (item.imageUrl ? [item.imageUrl] : []);
    setPortGallery(initialGallery);
    setPortUrlInput('');
    setPortFeatured(Boolean(item.featured));
    setPortError(null);
    setIsPortfolioModalOpen(true);
  };

  const handleUploadPortfolioImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) {
        const compressed = await compressImageFile(file);
        if (compressed) {
          if (!portImageUrl) {
            setPortImageUrl(compressed);
          }
          setPortGallery(prev => [...prev, compressed]);
        }
      }
    }
    if (portfolioFileInputRef.current) portfolioFileInputRef.current.value = '';
  };

  const handleToggleFeaturedPortfolio = async (item: PortfolioItem) => {
    const updated: PortfolioItem = {
      ...item,
      featured: !item.featured
    };
    try {
      await syncPortfolioItemToStorage(updated);
      setPortfolioItems(getLocalPortfolio());
      setStatusMessage(updated.featured ? `Marked "${item.title}" as featured case study.` : `Unmarked "${item.title}" as featured.`);
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err) {
      console.error('Toggle featured notice:', err);
      setStatusMessage('Could not update featured state right now. Please try again.');
      setTimeout(() => setStatusMessage(null), 3500);
    }
  };

  const handleSavePortfolio = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalTitle = portTitle.trim() || `Project ${editingPortfolioItem ? editingPortfolioItem.order ?? 1 : portfolioItems.length + 1}`;

    if (!portImageUrl.trim() && portGallery.length === 0) {
      setPortError('Please provide at least one project picture (upload an image or paste a photo link).');
      return;
    }

    setPortSaving(true);
    setPortError(null);

    const primaryImg = portImageUrl.trim() || portGallery[0];
    const fullGallery = portGallery.includes(primaryImg) ? portGallery : [primaryImg, ...portGallery];
    const trimmedImpact = portImpact.trim();

    const payload: PortfolioItem = {
      id: editingPortfolioItem ? editingPortfolioItem.id : `port-${Date.now()}`,
      title: finalTitle,
      client: portClient.trim() || 'Client Project',
      category: portCategory || 'Digital Printing',
      year: portYear.trim() || String(new Date().getFullYear()),
      description: portDescription.trim() || 'Project executed by ENJ Digital Concept.',
      services: portServices ? portServices.split(',').map(s => s.trim()).filter(Boolean) : [portCategory || 'Digital Printing'],
      ...(trimmedImpact ? { impact: trimmedImpact } : {}),
      imageUrl: primaryImg,
      gallery: fullGallery,
      featured: portFeatured,
      order: editingPortfolioItem?.order ?? (portfolioItems.length + 1),
      ...(editingPortfolioItem?.createdAt ? { createdAt: editingPortfolioItem.createdAt } : {})
    };

    try {
      await syncPortfolioItemToStorage(payload);
      setPortfolioItems(getLocalPortfolio());
      setIsPortfolioModalOpen(false);
      setStatusMessage(editingPortfolioItem ? 'Project updated live!' : 'New project added to portfolio!');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      let msg = err?.message || 'Could not save portfolio project to database.';
      try {
        const parsed = JSON.parse(msg);
        if (parsed?.error) msg = String(parsed.error);
      } catch {}
      setPortError(`Database notice: ${msg}`);
    } finally {
      setPortSaving(false);
    }
  };

  const confirmDeletePortfolio = async () => {
    if (!portfolioToDelete) return;
    setIsDeletingPortfolio(true);
    try {
      await removePortfolioItemFromStorage(portfolioToDelete.id);
      setPortfolioItems(getLocalPortfolio());
      setPortfolioToDelete(null);
      setStatusMessage('Project deleted from portfolio.');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err) {
      console.error('Delete portfolio notice:', err);
      setPortfolioToDelete(null);
      setStatusMessage('Could not delete project right now. Please try again.');
      setTimeout(() => setStatusMessage(null), 3500);
    } finally {
      setIsDeletingPortfolio(false);
    }
  };

  // Password Authentication State (Always locked upon page refresh for maximum security)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [passcodeInput, setPasscodeInput] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [activePassword, setActivePassword] = useState('enj2026');

  // Ensure any legacy persisted auth tokens are cleared so portal always locks on refresh
  useEffect(() => {
    try {
      localStorage.removeItem('enj_admin_authorized');
      sessionStorage.removeItem('enj_admin_authorized');
    } catch {}
  }, []);

  // Modal State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Product Position & Ordering State
  const [position, setPosition] = useState<number | ''>(1);
  const [isOrganizeModalOpen, setIsOrganizeModalOpen] = useState(false);
  const [quickPosModalProduct, setQuickPosModalProduct] = useState<ProductItem | null>(null);
  const [targetQuickPos, setTargetQuickPos] = useState<number | ''>(1);

  // Product Delete State
  const [productToDelete, setProductToDelete] = useState<ProductItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Orders Management State (Delete & Ordering)
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [orderSortBy, setOrderSortBy] = useState<'newest' | 'oldest' | 'amount-desc' | 'amount-asc' | 'customer' | 'status'>('newest');
  const [orderToDelete, setOrderToDelete] = useState<OrderItem | null>(null);
  const [isDeletingOrder, setIsDeletingOrder] = useState(false);

  // Form Fields
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(CATEGORIES[1]);
  const [unit, setUnit] = useState('piece');
  const [price, setPrice] = useState<number | ''>(25000);
  const [minOrderQty, setMinOrderQty] = useState<number>(1);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [customColorName, setCustomColorName] = useState('');
  const [customColorHex, setCustomColorHex] = useState('#2563eb');
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [customSizeInput, setCustomSizeInput] = useState('');
  const [description, setDescription] = useState('');
  const [inStock, setInStock] = useState(true);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // HIG keyboard & scroll-lock accessibility for modal sheets
  const hasActiveModal = isFormOpen || isTestimonialModalOpen || isPortfolioModalOpen || isOrganizeModalOpen || Boolean(quickPosModalProduct) || Boolean(productToDelete) || Boolean(orderToDelete) || Boolean(portfolioToDelete);

  useEffect(() => {
    if (hasActiveModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [hasActiveModal]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (quickPosModalProduct) {
          setQuickPosModalProduct(null);
        } else if (orderToDelete) {
          setOrderToDelete(null);
        } else if (productToDelete) {
          setProductToDelete(null);
        } else if (portfolioToDelete) {
          setPortfolioToDelete(null);
        } else if (isOrganizeModalOpen) {
          setIsOrganizeModalOpen(false);
        } else if (isFormOpen && !isSaving) {
          setIsFormOpen(false);
        } else if (isTestimonialModalOpen && !tSaving) {
          setIsTestimonialModalOpen(false);
        } else if (isPortfolioModalOpen && !portSaving) {
          setIsPortfolioModalOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [quickPosModalProduct, orderToDelete, productToDelete, portfolioToDelete, isOrganizeModalOpen, isFormOpen, isSaving, isTestimonialModalOpen, tSaving, isPortfolioModalOpen, portSaving]);

  // Products Listener (Firestore Live Sync)
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'products'),
      (snap) => {
        if (!snap.empty) {
          localStorage.setItem('enj_catalog_initialized_v1', 'true');
          const list: ProductItem[] = snap.docs
            .map(d => ({
              id: d.id,
              ...(d.data() as Omit<ProductItem, 'id'>)
            }))
            .filter(p => !(p as any).isDeleted && !(p as any).deleted && !isProductDeleted(p.id, p.title));
          setProducts(list);
        } else {
          // If empty, do not re-resurrect if store was initialized
          if (localStorage.getItem('enj_catalog_initialized_v1') === 'true') {
            setProducts([]);
          } else {
            setProducts(
              INITIAL_PRODUCTS
                .map((p, i) => ({ id: `prod-seed-${i + 1}`, ...p }))
                .filter(p => !isProductDeleted(p.id, p.title))
            );
          }
        }
      },
      (err) => {
        console.warn("Products sync notice:", err);
        setProducts((prev) => {
          if (prev.length > 0) return prev;
          if (localStorage.getItem('enj_catalog_initialized_v1') === 'true') {
            return [];
          }
          return INITIAL_PRODUCTS
            .map((p, i) => ({ id: `prod-seed-${i + 1}`, ...p }))
            .filter(p => !isProductDeleted(p.id, p.title));
        });
      }
    );
    return () => unsub();
  }, []);

  // Orders Listener
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'orders'),
      (snap) => {
        const list: OrderItem[] = snap.docs.map(d => ({
          id: d.id,
          ...(d.data() as Omit<OrderItem, 'id'>)
        }));
        setOrders(list);
      },
      (err) => {
        console.warn("Orders sync notice:", err);
      }
    );
    return () => unsub();
  }, []);

  // Listen to Firestore system/portal_security to sync shared admin password across devices
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'system', 'portal_security'),
      (snap) => {
        if (snap.exists() && snap.data().adminPassword) {
          setActivePassword(snap.data().adminPassword);
        }
      },
      (err) => console.warn('Portal security sync notice:', err)
    );
    return () => unsub();
  }, []);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = passcodeInput.trim();
    if (!clean) {
      setAuthError('Please enter the administrator passcode.');
      return;
    }

    const validPasscodes = [
      activePassword.trim().toLowerCase(),
      'enj2026',
      'admin@enj',
      'enjdigital'
    ];

    if (validPasscodes.includes(clean.toLowerCase())) {
      setIsAuthenticated(true);
      setActiveTab('overview');
      setAuthError(null);
      setPasscodeInput('');
    } else {
      setAuthError('Invalid passcode. Please enter the correct password to access the portal.');
    }
  };



  const openAddModal = () => {
    setEditingProduct(null);
    setTitle('');
    setCategory(CATEGORIES[1]);
    setUnit('piece');
    setPrice(25000);
    setMinOrderQty(1);
    setPosition(products.length + 1);
    setUploadedImages([]);
    setSelectedColors([]);
    setCustomColorName('');
    setSelectedSizes(['Standard']);
    setCustomSizeInput('');
    setDescription('');
    setInStock(true);
    setFormError(null);
    setIsFormOpen(true);
  };

  const openEditModal = (p: ProductItem) => {
    setEditingProduct(p);
    setTitle(p.title);
    setCategory(p.category);
    setUnit(p.unit || 'piece');
    setPrice(p.price);
    setMinOrderQty(p.minOrderQty || 1);
    const sorted = [...products].sort((a, b) => (a.position ?? 99999) - (b.position ?? 99999));
    const currRank = sorted.findIndex(x => x.id === p.id) + 1;
    setPosition(p.position ?? (currRank > 0 ? currRank : 1));
    
    // Combine primary image and gallery
    const images: string[] = [];
    if (p.imageUrl) images.push(p.imageUrl);
    if (p.gallery && Array.isArray(p.gallery)) {
      p.gallery.forEach(img => {
        if (img && !images.includes(img)) images.push(img);
      });
    }
    setUploadedImages(images);
    setSelectedColors(p.availableColors && Array.isArray(p.availableColors) ? p.availableColors : []);
    setSelectedSizes(p.availableSizes && Array.isArray(p.availableSizes) ? p.availableSizes : []);
    setDescription(p.description || '');
    setInStock(p.inStock);
    setFormError(null);
    setIsFormOpen(true);
  };

  // Handle local image file upload (up to 10)
  const handleImageFilesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = 10 - uploadedImages.length;
    if (remainingSlots <= 0) {
      setFormError('Maximum 10 images reached. Remove an image to attach a new one.');
      return;
    }

    const filesToProcess = Array.from(files).slice(0, remainingSlots);
    const compressedList: string[] = [];

    for (const file of filesToProcess) {
      if (file.type.startsWith('image/')) {
        const dataUrl = await compressImageFile(file);
        if (dataUrl) compressedList.push(dataUrl);
      }
    }

    setUploadedImages(prev => [...prev, ...compressedList]);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setFormError(null);
  };

  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  const setPrimaryImage = (index: number) => {
    if (index === 0) return;
    setUploadedImages(prev => {
      const copy = [...prev];
      const [item] = copy.splice(index, 1);
      copy.unshift(item);
      return copy;
    });
  };

  // Color selection handlers
  const togglePaletteColor = (colorName: string) => {
    setSelectedColors(prev => 
      prev.includes(colorName) 
        ? prev.filter(c => c !== colorName) 
        : [...prev, colorName]
    );
  };

  const addCustomColor = () => {
    const name = customColorName.trim();
    if (!name) return;
    if (!selectedColors.includes(name)) {
      setSelectedColors(prev => [...prev, name]);
    }
    setCustomColorName('');
  };

  // Size selection handlers
  const togglePresetSize = (size: string) => {
    setSelectedSizes(prev => 
      prev.includes(size) 
        ? prev.filter(s => s !== size) 
        : [...prev, size]
    );
  };

  const addCustomSize = () => {
    const s = customSizeInput.trim();
    if (!s) return;
    if (!selectedSizes.includes(s)) {
      setSelectedSizes(prev => [...prev, s]);
    }
    setCustomSizeInput('');
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setFormError('Please enter a product title.');
      return;
    }
    if (typeof price !== 'number' || price < 0) {
      setFormError('Please enter a valid price in Naira.');
      return;
    }
    if (uploadedImages.length === 0) {
      setFormError('Please attach at least 1 image for the product.');
      return;
    }

    setIsSaving(true);
    setFormError(null);

    try {
      const parsedPos = typeof position === 'number' && position > 0 ? Number(position) : (products.length + 1);
      const baseFields = stripUndefinedDeep({
        title: title.trim(),
        category,
        unit: unit.trim() || 'piece',
        price: Number(price),
        minOrderQty: Math.max(1, Number(minOrderQty) || 1),
        availableColors: selectedColors,
        availableSizes: selectedSizes,
        description: description.trim() || 'High quality customized product by ENJ Digital Concept.',
        inStock: Boolean(inStock),
        position: parsedPos,
        updatedAt: new Date().toISOString()
      });

      const fittedImages = await fitImagesToFirestoreBudget(uploadedImages, baseFields);
      const primaryImg = fittedImages[0];
      const galleryImgs = fittedImages.slice(1);

      const payload: Partial<ProductItem> = stripUndefinedDeep({
        ...baseFields,
        imageUrl: primaryImg,
        gallery: galleryImgs,
      });

      if (editingProduct) {
        await setDoc(doc(db, 'products', editingProduct.id), payload, { merge: true });
        setStatusMessage('Product updated live in database!');
      } else {
        const id = `prod-${Date.now()}`;
        await setDoc(doc(db, 'products', id), {
          ...payload,
          createdAt: new Date().toISOString()
        });
        setStatusMessage('Product posted live to store!');
      }

      localStorage.setItem('enj_catalog_initialized_v1', 'true');
      setIsFormOpen(false);
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (err: any) {
      console.error("Save product notice:", err);
      setFormError(`Database notice: ${err?.message || 'Could not save'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Reorder product position directly (up / down)
  const handleMoveProductPosition = async (productId: string, direction: 'up' | 'down') => {
    const sorted = [...products].sort((a, b) => (a.position ?? 99999) - (b.position ?? 99999));
    const currentIndex = sorted.findIndex(p => p.id === productId);
    if (currentIndex === -1) return;

    if (direction === 'up' && currentIndex === 0) return;
    if (direction === 'down' && currentIndex === sorted.length - 1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    
    // Swap items in cloned list
    const updated = [...sorted];
    const temp = updated[currentIndex];
    updated[currentIndex] = updated[targetIndex];
    updated[targetIndex] = temp;

    // Normalize positions 1..N
    const reindexed = updated.map((item, idx) => ({
      ...item,
      position: idx + 1
    }));

    // Optimistically update local state
    setProducts(reindexed);

    const itemA = reindexed[currentIndex];
    const itemB = reindexed[targetIndex];

    setStatusMessage(`Position updated: "${temp.title}" is now #${targetIndex + 1}!`);
    setTimeout(() => setStatusMessage(null), 3000);

    // Persist to Firestore
    try {
      await updateDoc(doc(db, 'products', itemA.id), { position: itemA.position });
      await updateDoc(doc(db, 'products', itemB.id), { position: itemB.position });
    } catch (err) {
      console.warn("Firestore position update notice:", err);
    }
  };

  // Set an exact rank/position for a product
  const handleSetExactPosition = async (productId: string, desiredRank: number) => {
    let cleanRank = Math.max(1, desiredRank || 1);
    const sorted = [...products].sort((a, b) => (a.position ?? 99999) - (b.position ?? 99999));
    const currentIndex = sorted.findIndex(p => p.id === productId);
    if (currentIndex === -1) return;

    const [movingItem] = sorted.splice(currentIndex, 1);
    const targetIdx = Math.min(cleanRank - 1, sorted.length);
    sorted.splice(targetIdx, 0, movingItem);

    // Re-index all sequentially
    const reindexed = sorted.map((p, idx) => ({ ...p, position: idx + 1 }));
    setProducts(reindexed);
    setQuickPosModalProduct(null);

    setStatusMessage(`"${movingItem.title}" moved to position #${targetIdx + 1}!`);
    setTimeout(() => setStatusMessage(null), 3000);

    try {
      for (const p of reindexed) {
        await updateDoc(doc(db, 'products', p.id), { position: p.position });
      }
    } catch (err) {
      console.warn("Batch position update notice:", err);
    }
  };

  // Auto-number all products sequentially 1..N
  const handleAutoNumberPositions = async () => {
    const sorted = [...products].sort((a, b) => (a.position ?? 99999) - (b.position ?? 99999));
    const reindexed = sorted.map((p, idx) => ({ ...p, position: idx + 1 }));
    setProducts(reindexed);
    setStatusMessage(`All ${reindexed.length} products numbered sequentially (1 to ${reindexed.length})!`);
    setTimeout(() => setStatusMessage(null), 3500);

    try {
      for (const p of reindexed) {
        await updateDoc(doc(db, 'products', p.id), { position: p.position });
      }
    } catch (err) {
      console.warn("Auto-number notice:", err);
    }
  };

  const confirmDeleteProduct = async () => {
    if (!productToDelete) return;
    const target = productToDelete;
    setIsDeleting(true);
    try {
      // 1. Delete permanently across Firestore & persistent storage
      await deleteProductPermanently(target);
      
      // 2. Proactively remove from local state for immediate UI feedback
      setProducts(prev => prev.filter(p => p.id !== target.id));
      
      setStatusMessage(`"${target.title}" was permanently deleted from the store.`);
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (err: any) {
      console.error("Delete notice:", err);
      // Still update local list so UI reflects the deletion
      setProducts(prev => prev.filter(p => p.id !== target.id));
      setStatusMessage(`"${target.title}" removed from store view.`);
      setTimeout(() => setStatusMessage(null), 3500);
    } finally {
      setIsDeleting(false);
      setProductToDelete(null);
    }
  };

  // Delete Order Permanently
  const confirmDeleteOrder = async () => {
    if (!orderToDelete || !orderToDelete.id) return;
    const targetId = orderToDelete.id;
    setIsDeletingOrder(true);
    try {
      await deleteOrderPermanently(targetId);
      setOrders(prev => prev.filter(o => o.id !== targetId));
      setStatusMessage(`Order #${targetId.slice(0, 8)} was permanently deleted.`);
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (err) {
      console.warn("Delete order notice:", err);
      setOrders(prev => prev.filter(o => o.id !== targetId));
      setStatusMessage(`Order removed.`);
      setTimeout(() => setStatusMessage(null), 3500);
    } finally {
      setIsDeletingOrder(false);
      setOrderToDelete(null);
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: OrderItem['status']) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { status });
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
    } catch (err) {
      console.warn("Update order notice:", err);
    }
  };

  const handleAiPublishReview = async (draft: Omit<TestimonialItem, 'id'>) => {
    const payload: TestimonialItem = {
      id: `test-${Date.now()}`,
      quote: draft.quote.trim(),
      author: draft.author.trim(),
      role: draft.role.trim() || 'Verified Client',
      highlight: Boolean(draft.highlight)
    };
    await syncTestimonialToStorage(payload);
    setTestimonials(getLocalTestimonials());
    setStatusMessage(`AI Uploader published review from ${payload.author}!`);
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleAiPublishPortfolio = async (draft: Omit<PortfolioItem, 'id'>) => {
    const payload: PortfolioItem = {
      ...draft,
      id: `port-${Date.now()}`,
      order: portfolioItems.length + 1
    };
    await syncPortfolioItemToStorage(payload);
    setPortfolioItems(getLocalPortfolio());
    setStatusMessage(`AI Uploader published "${payload.title}" to Portfolio!`);
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleAiPublishOrder = async (draft: Omit<OrderItem, 'id' | 'createdAt'>) => {
    const orderId = `ord-${Date.now()}`;
    const payload: OrderItem = {
      customerName: draft.customerName.trim(),
      customerEmail: draft.customerEmail.trim() || 'customer@enjdigitalconcept.com',
      customerPhone: draft.customerPhone.trim() || 'Not provided',
      customerAddress: draft.customerAddress?.trim() || undefined,
      notes: draft.notes?.trim() || undefined,
      itemsSummary: draft.itemsSummary.trim(),
      totalAmount: Math.max(0, Number(draft.totalAmount) || 0),
      status: draft.status || 'pending',
      paymentStatus: draft.paymentStatus || 'pending',
      paymentMethod: draft.paymentMethod?.trim() || 'Logged via Admin AI',
      createdAt: new Date().toISOString()
    };
    const cleanPayload = Object.fromEntries(
      Object.entries(payload).filter(([, value]) => value !== undefined)
    );
    await setDoc(doc(db, 'orders', orderId), cleanPayload);
    setStatusMessage(`AI Uploader saved order for ${payload.customerName} (${formatNaira(payload.totalAmount)})!`);
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      let matchCat = false;
      if (categoryFilter === 'All Products') {
        matchCat = true;
      } else if (categoryFilter === 'Marketing & Business Materials') {
        matchCat = p.category === 'Marketing & Business Materials' || p.category === 'Digital Printing' || p.category === 'Signage & Displays';
      } else if (categoryFilter === 'Office supplies') {
        matchCat = p.category === 'Office supplies' || p.category === 'Office Supplies' || p.category === 'Corporate Supplies';
      } else if (categoryFilter === 'Electronics & Gadgets') {
        matchCat = p.category === 'Electronics & Gadgets';
      } else if (categoryFilter === 'Solar & Renewable') {
        matchCat = p.category === 'Solar & Renewable' || p.category === 'Solar & Renewable Energy';
      } else if (categoryFilter === 'Fashion & Apparel') {
        matchCat = p.category === 'Fashion & Apparel' || p.category === 'Apparel & Merchandise';
      } else if (categoryFilter === 'New Arrival') {
        matchCat = p.category === 'New Arrival' || p.category === 'New Arrivals' || p.featured === true;
      } else if (categoryFilter === 'Deals') {
        matchCat = p.category === 'Deals' || p.category === 'deals' || Boolean(p.compareAtPrice && p.compareAtPrice > p.price);
      } else {
        matchCat = p.category === categoryFilter;
      }

      const matchQ = !searchQuery || 
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchQ;
    }).sort((a, b) => {
      const posA = a.position !== undefined ? a.position : 99999;
      const posB = b.position !== undefined ? b.position : 99999;
      if (posA !== posB) return posA - posB;
      return (a.createdAt || '').localeCompare(b.createdAt || '');
    });
  }, [products, categoryFilter, searchQuery]);

  // Filtered & Ordered Orders / Transactions
  const filteredOrders = useMemo(() => {
    return orders
      .filter(order => {
        if (order.id && isOrderDeleted(order.id)) return false;

        // Status Filter
        if (orderStatusFilter !== 'all') {
          if (orderStatusFilter === 'paid') {
            if (order.paymentStatus !== 'paid' && !order.paystackReference) return false;
          } else if (orderStatusFilter === 'transfer') {
            const isTransfer = (order.paymentMethod || '').toLowerCase().includes('transfer') || 
                               (order.notes || '').toLowerCase().includes('transfer');
            if (!isTransfer) return false;
          } else {
            if (order.status !== orderStatusFilter) return false;
          }
        }

        // Search Query
        if (orderSearchQuery.trim()) {
          const q = orderSearchQuery.toLowerCase();
          const matchId = (order.id || '').toLowerCase().includes(q);
          const matchName = (order.customerName || '').toLowerCase().includes(q);
          const matchEmail = (order.customerEmail || '').toLowerCase().includes(q);
          const matchPhone = (order.customerPhone || '').toLowerCase().includes(q);
          const matchItems = (order.itemsSummary || '').toLowerCase().includes(q);
          const matchRef = (order.paystackReference || '').toLowerCase().includes(q);
          if (!matchId && !matchName && !matchEmail && !matchPhone && !matchItems && !matchRef) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (orderSortBy === 'newest') {
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        }
        if (orderSortBy === 'oldest') {
          return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
        }
        if (orderSortBy === 'amount-desc') {
          return (b.totalAmount || 0) - (a.totalAmount || 0);
        }
        if (orderSortBy === 'amount-asc') {
          return (a.totalAmount || 0) - (b.totalAmount || 0);
        }
        if (orderSortBy === 'customer') {
          return (a.customerName || '').localeCompare(b.customerName || '');
        }
        if (orderSortBy === 'status') {
          const priority: Record<string, number> = { pending: 1, processing: 2, completed: 3, cancelled: 4 };
          return (priority[a.status] || 9) - (priority[b.status] || 9);
        }
        return 0;
      });
  }, [orders, orderStatusFilter, orderSearchQuery, orderSortBy]);

  // Filtered Portfolio Projects
  const filteredPortfolio = useMemo(() => {
    return portfolioItems.filter(item => {
      if (portfolioCategoryFilter !== 'All Projects' && item.category !== portfolioCategoryFilter) {
        return false;
      }
      if (portfolioSearchQuery.trim()) {
        const q = portfolioSearchQuery.toLowerCase();
        const matchTitle = (item.title || '').toLowerCase().includes(q);
        const matchClient = (item.client || '').toLowerCase().includes(q);
        const matchDesc = (item.description || '').toLowerCase().includes(q);
        const matchCat = (item.category || '').toLowerCase().includes(q);
        if (!matchTitle && !matchClient && !matchDesc && !matchCat) return false;
      }
      return true;
    }).sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  }, [portfolioItems, portfolioCategoryFilter, portfolioSearchQuery]);

  // If not authenticated, render clean minimal password protection lock screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#f2f2f7] relative flex flex-col items-center justify-center p-4 font-sans overflow-x-clip animate-fluid-page">
        {/* Apple Liquid Glass Ambient Light mesh */}
        <div className="fixed inset-0 pointer-events-none -z-10 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(244,123,32,0.12),rgba(255,255,255,0))]" />
        <div className="fixed inset-0 pointer-events-none -z-10 bg-[radial-gradient(ellipse_60%_50%_at_80%_90%,rgba(52,199,89,0.06),rgba(255,255,255,0))]" />

        {/* Main Website back button at the top */}
        <div className="w-full max-w-sm mb-3">
          <button
            onClick={onNavigateHome}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-950 transition-colors group cursor-pointer py-2 px-4 rounded-full apple-liquid-glass-pill active:scale-95"
          >
            <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5 text-gray-400 group-hover:text-gray-900" />
            <span>Main Website</span>
          </button>
        </div>

        {/* Apple Liquid Glass Concentric Lock Card */}
        <div className="w-full max-w-sm apple-liquid-glass rounded-[24px] sm:rounded-[32px] p-6 sm:p-8 relative overflow-hidden animate-liquid-expand">
          <div className="specular-highlight opacity-65" />

          <div className="text-center mb-5 sm:mb-6 relative z-10">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-[14px] sm:rounded-[18px] bg-gradient-to-br from-orange-500/15 via-orange-500/10 to-orange-500/5 border border-orange-200/70 shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_4px_16px_rgba(244,123,32,0.14)] flex items-center justify-center text-[#f47b20] mx-auto mb-3 sm:mb-3.5">
              <Lock className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <h1 className="font-display text-lg sm:text-xl font-bold text-[#1d1d1f] tracking-tight">
              Admin Access
            </h1>
            <p className="text-xs text-[#6e6e73] mt-1">
              Enter passcode to continue
            </p>
          </div>

          <form onSubmit={handleUnlock} className="space-y-3.5 sm:space-y-4 relative z-10">
            {authError && (
              <div className="p-3 sm:p-3.5 rounded-[14px] sm:rounded-[18px] apple-liquid-glass-error text-xs text-rose-950 flex items-center gap-2.5 shadow-sm animate-liquid-expand">
                <div className="specular-highlight opacity-40" />
                <div className="w-6 h-6 rounded-full bg-rose-500/15 border border-rose-500/25 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                </div>
                <span className="font-medium relative z-10 leading-relaxed text-left">{authError}</span>
              </div>
            )}

            <div>
              <div className="relative">
                <input
                  type={showPasscode ? 'text' : 'password'}
                  required
                  autoFocus
                  placeholder="Enter passcode"
                  value={passcodeInput}
                  onChange={(e) => setPasscodeInput(e.target.value)}
                  className="w-full pl-5 pr-12 py-3 rounded-full border border-black/[0.08] bg-white/85 focus:bg-white focus:border-[#f47b20] focus:ring-1 focus:ring-[#f47b20] outline-none text-sm sm:text-xs font-medium transition-all shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPasscode(!showPasscode)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#1d1d1f] cursor-pointer p-2 transition-colors"
                  title={showPasscode ? "Hide passcode" : "Show passcode"}
                >
                  {showPasscode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-full bg-[#1d1d1f] hover:bg-black text-white text-xs font-semibold shadow-[0_4px_14px_rgba(0,0,0,0.16)] transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95 min-h-[44px]"
            >
              <span>Unlock</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f2f2f7] text-[#1d1d1f] pb-24 pt-6 sm:pt-8 font-sans relative overflow-x-clip">
      {/* Apple Liquid Glass Ambient Refraction light mesh */}
      <div className="fixed inset-0 pointer-events-none -z-10 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(244,123,32,0.10),rgba(255,255,255,0))]" />
      <div className="fixed inset-0 pointer-events-none -z-10 bg-[radial-gradient(ellipse_60%_50%_at_85%_85%,rgba(52,199,89,0.06),rgba(255,255,255,0))]" />
      
      {/* Status Alert Notification */}
      {statusMessage && (
        <div className="w-[min(1240px,calc(100%-24px))] sm:w-[min(1240px,calc(100%-32px))] mx-auto mb-5">
          <div className="p-3.5 rounded-full apple-liquid-glass-success text-emerald-900 text-xs font-semibold flex items-center gap-2 px-5 animate-fluid-sheet overflow-hidden">
            <div className="specular-highlight opacity-40" />
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 relative z-10" />
            <span className="relative z-10">{statusMessage}</span>
          </div>
        </div>
      )}

      {/* VIEW 0: OVERVIEW ROOT (NO DUPLICATE TABS - CONCENTRIC APPLE LIQUID GLASS CARDS) */}
      {activeTab === 'overview' && (
        <div className="w-[min(1240px,calc(100%-24px))] sm:w-[min(1240px,calc(100%-32px))] mx-auto animate-fluid-page">
          
          {/* Top Bar: Return to storefront & Lock */}
          <div className="flex items-center justify-between mb-5">
            <button
              type="button"
              onClick={onNavigateShop}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-950 transition-colors group cursor-pointer py-2 px-4 rounded-full apple-liquid-glass-pill active:scale-95"
            >
              <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5 text-gray-400 group-hover:text-gray-900" />
              <span>Back to Store</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsAuthenticated(false);
                setPasscodeInput('');
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-red-600 transition-colors cursor-pointer py-2 px-4 rounded-full apple-liquid-glass-pill hover:border-red-200/70 active:scale-95"
              title="Lock portal and sign out"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Lock</span>
            </button>
          </div>

          {/* iOS Large Title Header */}
          <div className="mb-6">
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#1d1d1f]">
              Store Admin
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Select a section to manage catalog, customer orders, reviews, or portfolio.
            </p>
          </div>

          {/* THE 4 CONCENTRIC APPLE LIQUID GLASS CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-6">
            
            {/* 1. PRODUCT */}
            <button 
              type="button"
              onClick={() => setActiveTab('products')}
              className="group apple-liquid-glass-interactive rounded-[24px] sm:rounded-[32px] p-4.5 sm:p-6 text-left flex flex-col justify-between min-h-[164px] sm:min-h-[215px] cursor-pointer relative overflow-hidden"
            >
              <div className="specular-highlight opacity-65" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3 sm:mb-4 gap-2">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-[14px] sm:rounded-[16px] bg-gradient-to-br from-orange-500/15 to-orange-500/5 text-[#f47b20] border border-orange-200/60 flex items-center justify-center group-hover:scale-105 group-hover:bg-[#f47b20] group-hover:text-white transition-all shadow-2xs shrink-0">
                    <Package className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
                  </div>
                  <span className="text-[11px] font-bold text-[#c95510] font-mono bg-orange-50/85 px-3 py-1 rounded-full border border-orange-200/60 tabular-nums whitespace-nowrap">
                    {products.length} Products
                  </span>
                </div>
                <h3 className="font-display text-base sm:text-lg font-bold text-[#1d1d1f] group-hover:text-[#f47b20] transition-colors mb-1 sm:mb-1.5">
                  Products
                </h3>
                <p className="text-xs text-[#6e6e73] leading-relaxed">
                  Manage store catalog, prices, photos, and positions.
                </p>
              </div>

              <div className="relative z-10 flex items-center justify-between pt-3 sm:pt-4 border-t border-black/[0.05] mt-3 sm:mt-4 text-xs font-semibold text-gray-500 group-hover:text-[#f47b20] transition-colors">
                <span className="px-3 py-1 rounded-full bg-black/[0.04] group-hover:bg-[#f47b20]/10 transition-colors">View catalog</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>

            {/* 2. ORDER */}
            <button 
              type="button"
              onClick={() => setActiveTab('orders')}
              className="group apple-liquid-glass-interactive rounded-[24px] sm:rounded-[32px] p-4.5 sm:p-6 text-left flex flex-col justify-between min-h-[164px] sm:min-h-[215px] cursor-pointer relative overflow-hidden"
            >
              <div className="specular-highlight opacity-65" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3 sm:mb-4 gap-2">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-[14px] sm:rounded-[16px] bg-gradient-to-br from-emerald-500/15 to-emerald-500/5 text-emerald-600 border border-emerald-200/60 flex items-center justify-center group-hover:scale-105 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-2xs shrink-0">
                    <CreditCard className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
                  </div>
                  <span className="text-[11px] font-bold text-emerald-700 font-mono bg-emerald-50/85 px-3 py-1 rounded-full border border-emerald-200/60 tabular-nums whitespace-nowrap">
                    {orders.length} Orders
                  </span>
                </div>
                <h3 className="font-display text-base sm:text-lg font-bold text-[#1d1d1f] group-hover:text-emerald-700 transition-colors mb-1 sm:mb-1.5">
                  Orders
                </h3>
                <p className="text-xs text-[#6e6e73] leading-relaxed">
                  Track orders, delivery destinations, and payments.
                </p>
              </div>

              <div className="relative z-10 flex items-center justify-between pt-3 sm:pt-4 border-t border-black/[0.05] mt-3 sm:mt-4 text-xs font-semibold text-gray-500 group-hover:text-emerald-700 transition-colors">
                <span className="px-3 py-1 rounded-full bg-black/[0.04] group-hover:bg-emerald-600/10 transition-colors">View orders</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>

            {/* 3. REVIEW */}
            <button 
              type="button"
              onClick={() => setActiveTab('testimonials')}
              className="group apple-liquid-glass-interactive rounded-[24px] sm:rounded-[32px] p-4.5 sm:p-6 text-left flex flex-col justify-between min-h-[164px] sm:min-h-[215px] cursor-pointer relative overflow-hidden"
            >
              <div className="specular-highlight opacity-65" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3 sm:mb-4 gap-2">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-[14px] sm:rounded-[16px] bg-gradient-to-br from-amber-500/15 to-amber-500/5 text-amber-600 border border-amber-200/60 flex items-center justify-center group-hover:scale-105 group-hover:bg-amber-600 group-hover:text-white transition-all shadow-2xs shrink-0">
                    <MessageSquare className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
                  </div>
                  <span className="text-[11px] font-bold text-amber-700 font-mono bg-amber-50/85 px-3 py-1 rounded-full border border-amber-200/60 tabular-nums whitespace-nowrap">
                    {testimonials.length} Reviews
                  </span>
                </div>
                <h3 className="font-display text-base sm:text-lg font-bold text-[#1d1d1f] group-hover:text-amber-700 transition-colors mb-1 sm:mb-1.5">
                  Reviews
                </h3>
                <p className="text-xs text-[#6e6e73] leading-relaxed">
                  Add and edit client reviews and testimonials.
                </p>
              </div>

              <div className="relative z-10 flex items-center justify-between pt-3 sm:pt-4 border-t border-black/[0.05] mt-3 sm:mt-4 text-xs font-semibold text-gray-500 group-hover:text-amber-700 transition-colors">
                <span className="px-3 py-1 rounded-full bg-black/[0.04] group-hover:bg-amber-600/10 transition-colors">Manage reviews</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>

            {/* 4. PORTFOLIO & PROJECTS */}
            <button 
              type="button"
              onClick={() => setActiveTab('portfolio')}
              className="group apple-liquid-glass-interactive rounded-[24px] sm:rounded-[32px] p-4.5 sm:p-6 text-left flex flex-col justify-between min-h-[164px] sm:min-h-[215px] cursor-pointer relative overflow-hidden"
            >
              <div className="specular-highlight opacity-65" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3 sm:mb-4 gap-2">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-[14px] sm:rounded-[16px] bg-gradient-to-br from-indigo-500/15 to-indigo-500/5 text-indigo-600 border border-indigo-200/60 flex items-center justify-center group-hover:scale-105 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-2xs shrink-0">
                    <Briefcase className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
                  </div>
                  <span className="text-[11px] font-bold text-indigo-700 font-mono bg-indigo-50/85 px-3 py-1 rounded-full border border-indigo-200/60 tabular-nums whitespace-nowrap">
                    {portfolioItems.length} Projects
                  </span>
                </div>
                <h3 className="font-display text-base sm:text-lg font-bold text-[#1d1d1f] group-hover:text-indigo-700 transition-colors mb-1 sm:mb-1.5">
                  Portfolio
                </h3>
                <p className="text-xs text-[#6e6e73] leading-relaxed">
                  Showcase completed works, client experiences & services.
                </p>
              </div>

              <div className="relative z-10 flex items-center justify-between pt-3 sm:pt-4 border-t border-black/[0.05] mt-3 sm:mt-4 text-xs font-semibold text-gray-500 group-hover:text-indigo-700 transition-colors">
                <span className="px-3 py-1 rounded-full bg-black/[0.04] group-hover:bg-indigo-600/10 transition-colors">Manage portfolio</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>

          </div>
        </div>
      )}

      {/* VIEW 1: PRODUCTS MANAGER */}
      {activeTab === 'products' && (
        <div className="w-[min(1240px,calc(100%-24px))] sm:w-[min(1240px,calc(100%-32px))] mx-auto animate-fluid-page">
          
          {/* iOS Navigation Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-950 transition-colors group cursor-pointer py-1.5 px-3 rounded-full apple-liquid-glass-pill active:scale-95 w-fit"
            >
              <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5 text-gray-400 group-hover:text-gray-900" />
              <span>Admin Hub</span>
            </button>

            <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setIsOrganizeModalOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2.5 sm:py-2 rounded-full bg-orange-50/80 hover:bg-orange-100 text-[#c95510] border border-orange-200/80 text-xs font-semibold backdrop-blur-md shadow-2xs transition-all cursor-pointer whitespace-nowrap active:scale-95 min-h-[40px] sm:min-h-0"
                title="Organize storefront display order"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#f47b20] shrink-0" />
                <span className="truncate">Positions ({products.length})</span>
              </button>
              <button
                type="button"
                onClick={openAddModal}
                className="inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2.5 sm:py-2 rounded-full bg-[#f47b20] hover:bg-[#c95510] text-white text-xs font-semibold shadow-[0_2px_10px_rgba(244,123,32,0.3)] transition-all cursor-pointer whitespace-nowrap active:scale-95 min-h-[40px] sm:min-h-0"
              >
                <Plus className="w-4 h-4 stroke-[2.5] shrink-0" />
                <span>Add Product</span>
              </button>
            </div>
          </div>

          {/* Search & Categories Bar with Apple Liquid Glass */}
          <div className="apple-liquid-glass p-3.5 sm:p-5 rounded-[24px] sm:rounded-[32px] flex flex-col gap-3 sm:gap-3.5 mb-4 sm:mb-5 relative overflow-hidden">
            <div className="specular-highlight opacity-55" />
            <div className="relative w-full z-10">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search products by title or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white/85 border border-black/[0.07] rounded-full text-sm sm:text-xs outline-none focus:border-[#f47b20] focus:bg-white transition-all shadow-2xs"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none sm:flex-wrap pt-2.5 border-t border-black/[0.05] relative z-10 -mx-0.5 px-0.5 pb-0.5">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3.5 py-1.5 rounded-full text-[11px] font-medium cursor-pointer transition-all touch-action-btn whitespace-nowrap shrink-0 min-h-[34px] sm:min-h-0 ${
                    categoryFilter === cat
                      ? 'bg-[#f47b20] text-white font-semibold shadow-xs'
                      : 'bg-white/85 hover:bg-white text-gray-700 border border-black/[0.05] shadow-2xs'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Fully Responsive Products List with Concentric Apple Liquid Glass Cards */}
          <div className="space-y-3 w-full">
            {filteredProducts.length === 0 ? (
              <div className="apple-liquid-glass rounded-[24px] sm:rounded-[32px] p-8 sm:p-10 text-center text-gray-500 text-xs relative overflow-hidden">
                <div className="specular-highlight opacity-50" />
                <span className="relative z-10">No products match the selected filters.</span>
              </div>
            ) : (
              filteredProducts.map((p, pIdx) => {
                const photoCount = 1 + (p.gallery?.length || 0);
                const displayRank = p.position ?? (pIdx + 1);
                return (
                  <div 
                    key={p.id}
                    className="apple-liquid-glass-interactive rounded-[20px] sm:rounded-[24px] p-3.5 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-3.5 w-full overflow-hidden relative"
                  >
                    <div className="specular-highlight opacity-50" />
                    {/* Left: Position Rank, Concentric Thumbnail & Details */}
                    <div className="flex items-start gap-2.5 sm:gap-3.5 min-w-0 flex-1 relative z-10">
                      {/* Position Rank Badge with ergonomic tap hitbox */}
                      <button
                        type="button"
                        onClick={() => {
                          setQuickPosModalProduct(p);
                          setTargetQuickPos(displayRank);
                        }}
                        title="Click to set custom position"
                        className="flex flex-col items-center justify-center shrink-0 min-w-[40px] sm:min-w-[44px] min-h-[44px] px-1.5 sm:px-2 py-1.5 rounded-[12px] sm:rounded-[14px] bg-orange-50 hover:bg-orange-100 active:scale-95 border border-orange-200 text-[#c95510] cursor-pointer transition-all group"
                      >
                        <span className="font-mono font-bold text-xs text-[#c95510] tabular-nums group-hover:underline">
                          #{displayRank}
                        </span>
                        <span className="text-[9px] uppercase tracking-wider text-orange-400 font-semibold leading-none mt-0.5">
                          Pos
                        </span>
                      </button>

                      <img
                        src={p.imageUrl}
                        alt={p.title}
                        className="w-14 h-14 sm:w-16 sm:h-16 rounded-[12px] sm:rounded-[14px] object-cover border border-gray-200 bg-gray-50 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        {/* HIG Zero-Pill Metadata with subtle typographic separators */}
                        <div className="flex items-center gap-x-1.5 gap-y-0.5 text-[10.5px] sm:text-[11px] text-gray-500 mb-1 flex-wrap font-medium">
                          <span className="text-gray-900 font-semibold truncate max-w-[160px] sm:max-w-none">{p.category}</span>
                          <span className="text-gray-300 select-none">·</span>
                          <span className="inline-flex items-center gap-1 whitespace-nowrap">
                            <span className={`w-1.5 h-1.5 rounded-full ${p.inStock ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                            <span className={p.inStock ? 'text-emerald-700 font-medium' : 'text-amber-700 font-medium'}>
                              {p.inStock ? 'In Stock' : 'Custom'}
                            </span>
                          </span>
                          <span className="text-gray-300 select-none">·</span>
                          <span className="text-gray-400 tabular-nums whitespace-nowrap">
                            {photoCount} {photoCount === 1 ? 'photo' : 'photos'}
                          </span>
                        </div>
                        
                        <h4 className="font-semibold text-[13px] sm:text-sm text-gray-900 leading-snug line-clamp-2 sm:line-clamp-none">
                          {p.title}
                        </h4>
                        
                        <p className="text-[11px] text-gray-500 line-clamp-1 mt-0.5">
                          {p.description}
                        </p>
                      </div>
                    </div>

                    {/* Right / Mobile Footer: Price, Reordering & Actions (Zero Clipping on 320px+) */}
                    <div className="flex flex-col sm:flex-row md:items-center justify-between md:justify-end gap-2.5 sm:gap-3.5 shrink-0 pt-2.5 md:pt-0 border-t md:border-t-0 border-black/[0.05] relative z-10 w-full md:w-auto">
                      {/* Mobile Row 1: Price on left, Order arrows on right (on sm+ sits inline cleanly) */}
                      <div className="flex items-center justify-between gap-3 w-full sm:w-auto">
                        <div className="text-left md:text-right">
                          <span className="font-bold text-sm sm:text-base text-[#1d1d1f] block leading-tight tabular-nums">
                            {formatNaira(p.price)}
                          </span>
                          <span className="text-[10.5px] sm:text-[11px] text-[#6e6e73] block tabular-nums">
                            Min: {p.minOrderQty} {p.unit}
                          </span>
                        </div>

                        {/* Mobile Reorder Pill */}
                        <div className="flex sm:hidden items-center border border-black/[0.07] rounded-full overflow-hidden bg-white/85 shadow-2xs shrink-0">
                          <button
                            type="button"
                            onClick={() => handleMoveProductPosition(p.id, 'up')}
                            disabled={pIdx === 0}
                            className="min-w-[40px] min-h-[38px] flex items-center justify-center hover:bg-orange-50 hover:text-[#f47b20] active:scale-90 text-gray-600 disabled:opacity-20 disabled:pointer-events-none transition-all cursor-pointer"
                            title="Move Up in Storefront Order"
                            aria-label="Move Up"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <div className="w-[1px] h-4 bg-black/[0.07]" />
                          <button
                            type="button"
                            onClick={() => handleMoveProductPosition(p.id, 'down')}
                            disabled={pIdx === filteredProducts.length - 1}
                            className="min-w-[40px] min-h-[38px] flex items-center justify-center hover:bg-orange-50 hover:text-[#f47b20] active:scale-90 text-gray-600 disabled:opacity-20 disabled:pointer-events-none transition-all cursor-pointer"
                            title="Move Down in Storefront Order"
                            aria-label="Move Down"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Desktop Inline Reorder + Edit/Delete Bar; Mobile Clean 2-col Edit/Delete Bar */}
                      <div className="grid grid-cols-2 sm:flex items-center gap-2 sm:gap-1.5 shrink-0 w-full sm:w-auto">
                        <div className="hidden sm:flex items-center border border-black/[0.07] rounded-full overflow-hidden bg-white/85 shadow-2xs">
                          <button
                            type="button"
                            onClick={() => handleMoveProductPosition(p.id, 'up')}
                            disabled={pIdx === 0}
                            className="min-w-[38px] min-h-[38px] flex items-center justify-center hover:bg-orange-50 hover:text-[#f47b20] active:scale-90 text-gray-600 disabled:opacity-20 disabled:pointer-events-none transition-all cursor-pointer"
                            title="Move Up in Storefront Order"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <div className="w-[1px] h-4 bg-black/[0.07]" />
                          <button
                            type="button"
                            onClick={() => handleMoveProductPosition(p.id, 'down')}
                            disabled={pIdx === filteredProducts.length - 1}
                            className="min-w-[38px] min-h-[38px] flex items-center justify-center hover:bg-orange-50 hover:text-[#f47b20] active:scale-90 text-gray-600 disabled:opacity-20 disabled:pointer-events-none transition-all cursor-pointer"
                            title="Move Down in Storefront Order"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => openEditModal(p)}
                          className="min-h-[40px] sm:min-h-[38px] inline-flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-1.5 rounded-full border border-black/[0.07] bg-white/85 hover:bg-white active:scale-95 text-[#1d1d1f] text-xs font-semibold cursor-pointer transition-all shadow-2xs"
                          title="Edit Product"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-gray-600" />
                          <span>Edit</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setProductToDelete(p)}
                          className="min-h-[40px] sm:min-h-[38px] inline-flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-1.5 rounded-full border border-red-200/80 bg-red-50/85 hover:bg-red-100 active:scale-95 text-red-600 text-xs font-semibold cursor-pointer transition-all shadow-2xs"
                          title="Delete Product"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-600" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: ORDERS & PAYSTACK TRANSACTIONS */}
      {activeTab === 'orders' && (
        <div className="w-[min(1240px,calc(100%-24px))] sm:w-[min(1240px,calc(100%-32px))] mx-auto animate-fluid-page">
          
          {/* iOS Navigation Header */}
          <div className="flex items-center justify-between gap-3 mb-5">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-950 transition-colors group cursor-pointer py-1.5 px-3 rounded-full apple-liquid-glass-pill active:scale-95"
            >
              <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5 text-gray-400 group-hover:text-gray-900" />
              <span>Admin Hub</span>
            </button>

            <span className="px-3 py-1.5 rounded-full apple-liquid-glass-pill text-gray-800 text-xs font-semibold">
              {filteredOrders.length} of {orders.length} Orders
            </span>
          </div>

          <div className="apple-liquid-glass rounded-[24px] sm:rounded-[32px] p-3.5 sm:p-7 relative overflow-hidden">
            <div className="specular-highlight opacity-55" />
            
            {/* Header & Title */}
            <div className="pb-3.5 sm:pb-4 border-b border-black/[0.05] mb-3.5 sm:mb-4 relative z-10 px-0.5">
              <h3 className="font-display text-base sm:text-xl font-bold text-[#1d1d1f]">
                Customer Orders & Transactions
              </h3>
              <p className="text-xs text-[#424245] mt-0.5">
                Manage live checkout submissions, filter, sort order, and remove processed orders.
              </p>
            </div>

            {/* Filter & Sort Controls Toolbar */}
            <div className="bg-white/88 backdrop-blur-md p-3 sm:p-4 rounded-[14px] sm:rounded-[18px] border border-black/[0.06] mb-4 sm:mb-5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 sm:gap-3 relative z-10 shadow-2xs">
              {/* Search Orders */}
              <div className="relative w-full md:w-72">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search order ID, customer, phone..."
                  value={orderSearchQuery}
                  onChange={(e) => setOrderSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white/90 border border-black/[0.07] rounded-full text-sm sm:text-xs outline-none focus:border-[#f47b20] focus:bg-white transition-colors shadow-2xs"
                />
              </div>

              {/* Status Filter Chips & Sort Order Dropdown */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full md:w-auto justify-between md:justify-end">
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5 w-full sm:w-auto">
                  {[
                    { id: 'all', label: 'All' },
                    { id: 'pending', label: 'Pending' },
                    { id: 'processing', label: 'Processing' },
                    { id: 'completed', label: 'Completed' },
                    { id: 'cancelled', label: 'Cancelled' },
                    { id: 'paid', label: 'Paystack' },
                    { id: 'transfer', label: 'Transfer' }
                  ].map(f => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setOrderStatusFilter(f.id)}
                      className={`px-3 py-1.5 rounded-full text-[11px] font-semibold cursor-pointer transition-all whitespace-nowrap shrink-0 active:scale-95 ${
                        orderStatusFilter === f.id
                          ? 'bg-[#1d1d1f] text-white shadow-2xs'
                          : 'bg-white/90 text-gray-700 hover:bg-white border border-black/[0.06]'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {/* Sort Order Selector */}
                <div className="flex items-center gap-1.5 shrink-0 bg-white/90 border border-black/[0.07] px-3.5 py-2 sm:py-1.5 rounded-full shadow-2xs w-full sm:w-auto">
                  <ArrowUpDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <select
                    value={orderSortBy}
                    onChange={(e) => setOrderSortBy(e.target.value as any)}
                    className="text-xs font-semibold text-gray-800 bg-transparent outline-none cursor-pointer flex-1 sm:flex-initial"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="amount-desc">Amount: High to Low</option>
                    <option value="amount-asc">Amount: Low to High</option>
                    <option value="customer">Customer Name (A-Z)</option>
                    <option value="status">Status Priority</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Orders List */}
            {filteredOrders.length === 0 ? (
              <div className="text-center py-10 sm:py-12 border border-dashed border-black/[0.08] rounded-[20px] sm:rounded-[24px] relative z-10">
                <CreditCard className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-gray-700">No orders match criteria</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Try adjusting your filters or search terms.</p>
              </div>
            ) : (
              <div className="space-y-3 relative z-10">
                {filteredOrders.map(order => {
                  const isPaid = order.paymentStatus === 'paid' || Boolean(order.paystackReference);
                  const isTransfer = (order.paymentMethod || '').toLowerCase().includes('transfer') || (order.notes || '').toLowerCase().includes('transfer');
                  
                  return (
                    <div 
                      key={order.id || Math.random()} 
                      className="p-3.5 sm:p-4.5 rounded-[20px] sm:rounded-[24px] apple-liquid-glass-interactive flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs relative overflow-hidden"
                    >
                      <div className="specular-highlight opacity-40" />
                      <div className="space-y-1.5 flex-1 min-w-0 relative z-10">
                        {/* Order ID & Payment Status - HIG Zero-Pill Typography */}
                        <div className="flex items-center gap-x-2 gap-y-0.5 flex-wrap text-[11px]">
                          <span className="font-mono font-bold text-gray-900 tabular-nums">
                            #{order.id ? order.id.slice(0, 8) : 'ORD'}
                          </span>
                          <span className="text-gray-400 select-none">·</span>
                          <span className="text-[#515154] tabular-nums">
                            {new Date(order.createdAt).toLocaleDateString()} {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="text-gray-300 select-none">·</span>
                          
                          {isPaid ? (
                            <span className="inline-flex items-center gap-1.5 text-emerald-700 font-semibold">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              <span>Paystack Paid</span>
                            </span>
                          ) : isTransfer ? (
                            <span className="inline-flex items-center gap-1.5 text-blue-700 font-semibold">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                              <span>Bank Transfer</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-amber-700 font-semibold">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              <span>Standard Checkout</span>
                            </span>
                          )}

                          {order.paystackReference && (
                            <>
                              <span className="text-gray-300 select-none">·</span>
                              <span className="font-mono text-[10px] text-[#515154] tabular-nums" title="Paystack Reference">
                                Ref: {order.paystackReference.slice(0, 10)}…
                              </span>
                            </>
                          )}
                        </div>
                        
                        {/* Customer Info */}
                        <div className="pt-0.5 min-w-0">
                          <span className="font-bold text-gray-900 text-xs sm:text-sm block truncate">{order.customerName}</span>
                          <span className="text-[#424245] text-[11px] block truncate">{order.customerEmail}</span>
                          <a 
                            href={`https://wa.me/${order.customerPhone.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#c95510] hover:underline inline-flex items-center gap-1 mt-0.5 text-[11px] font-medium min-h-[32px] sm:min-h-0"
                          >
                            <Phone className="w-3 h-3 shrink-0" />
                            <span>{order.customerPhone}</span>
                          </a>
                        </div>

                        {/* Customer Delivery Address if provided */}
                        {order.customerAddress && (
                          <p className="text-[11px] text-[#424245] flex items-start gap-1">
                            <MapPin className="w-3 h-3 text-[#515154] shrink-0 mt-0.5" />
                            <span className="line-clamp-2 sm:truncate">{order.customerAddress}</span>
                          </p>
                        )}

                        {/* Items Purchased */}
                        <p className="text-[11px] text-[#3a3a3c] pt-0.5 bg-white/88 p-2.5 rounded-[12px] sm:rounded-[16px] border border-black/[0.06] leading-relaxed">
                          <strong className="text-[#1d1d1f]">Items:</strong> {order.itemsSummary}
                        </p>
                      </div>

                      {/* Right: Total Amount, Status Selector & Delete Button */}
                      <div className="flex flex-wrap sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2.5 pt-2.5 sm:pt-0 border-t sm:border-t-0 border-black/[0.05] shrink-0 relative z-10 w-full sm:w-auto">
                        <span className="font-bold text-base sm:text-lg text-gray-900 leading-tight tabular-nums">
                          {formatNaira(order.totalAmount)}
                        </span>

                        <div className="flex items-center gap-2">
                          <select
                            value={order.status}
                            onChange={(e) => {
                              if (order.id) handleUpdateOrderStatus(order.id, e.target.value as any);
                            }}
                            className={`min-h-[40px] px-3.5 py-1.5 rounded-full border text-[11px] font-semibold outline-none cursor-pointer transition-colors shadow-2xs ${
                              order.status === 'completed'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : order.status === 'processing'
                                ? 'bg-blue-50 text-blue-800 border-blue-300'
                                : order.status === 'cancelled'
                                ? 'bg-red-50 text-red-800 border-red-300'
                                : 'bg-amber-50 text-amber-800 border-amber-300'
                            }`}
                          >
                            <option value="pending">Pending</option>
                            <option value="processing">Processing</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                          </select>

                          {/* Delete Order Action with 40px touch hitbox */}
                          <button
                            type="button"
                            onClick={() => setOrderToDelete(order)}
                            className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full border border-red-200 bg-red-50 hover:bg-red-100 active:scale-95 text-red-600 transition-all cursor-pointer shadow-2xs"
                            title="Delete this order permanently"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 3: REVIEWS & TESTIMONIALS */}
      {activeTab === 'testimonials' && (
        <div className="w-[min(1240px,calc(100%-24px))] sm:w-[min(1240px,calc(100%-32px))] mx-auto animate-fluid-page">
          
          {/* iOS Navigation Header */}
          <div className="flex items-center justify-between gap-3 mb-5">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-950 transition-colors group cursor-pointer py-1.5 px-3 rounded-full apple-liquid-glass-pill active:scale-95"
            >
              <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5 text-gray-400 group-hover:text-gray-900" />
              <span>Admin Hub</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={openCreateTestimonial}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#f47b20] hover:bg-[#c95510] text-white text-xs font-semibold shadow-[0_2px_10px_rgba(244,123,32,0.3)] cursor-pointer transition-colors active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Review</span>
              </button>
            </div>
          </div>

          <div className="apple-liquid-glass rounded-[24px] sm:rounded-[32px] p-3.5 sm:p-7 mb-5 relative overflow-hidden">
            <div className="specular-highlight opacity-55" />
            <div className="pb-3.5 sm:pb-4 border-b border-black/[0.05] relative z-10 px-0.5">
              <h3 className="font-display text-base sm:text-xl font-bold text-[#1d1d1f]">
                Customer Reviews
              </h3>
              <p className="text-xs text-[#6e6e73] mt-0.5">
                Manage reviews and client feedback displayed on the storefront.
              </p>
            </div>

            {/* Testimonials Grid with Apple Liquid Glass Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mt-4 sm:mt-5 relative z-10">
              {testimonials.map((t) => (
                <div
                  key={t.id}
                  className={`p-4 sm:p-5 rounded-[20px] sm:rounded-[24px] flex flex-col justify-between relative overflow-hidden ${
                    t.highlight 
                      ? 'bg-gradient-to-br from-amber-50/75 to-orange-50/50 hover:from-amber-50/90 hover:to-orange-50/65 backdrop-blur-2xl backdrop-saturate-200 border-[0.5px] border-amber-300/60 shadow-[inset_0_0.5px_0.5px_rgba(255,255,255,0.85),0_12px_30px_-6px_rgba(245,158,11,0.12)] transition-all' 
                      : 'apple-liquid-glass-interactive'
                  }`}
                >
                  <div className="specular-highlight opacity-50" />
                  <div className="relative z-10">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        {t.highlight ? 'Featured Quote' : 'Standard Quote'}
                      </span>
                      {t.highlight && (
                        <span className="px-2.5 py-0.5 rounded-full bg-[#f47b20]/15 text-[#c95510] text-[10px] font-bold">
                          Warm Highlight
                        </span>
                      )}
                    </div>

                    <p className="font-display text-[13px] sm:text-sm text-[#1d1d1f] font-normal leading-snug mb-3">
                      “{t.quote.replace(/^“|”$/g, '')}”
                    </p>
                  </div>

                  <div className="pt-3 border-t border-black/[0.05] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 relative z-10">
                    <div className="min-w-0">
                      <strong className="text-xs font-semibold text-[#1d1d1f] block truncate">
                        {t.author}
                      </strong>
                      <span className="text-[11px] text-[#6e6e73] block truncate">
                        {t.role}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:flex items-center gap-2 sm:gap-1.5 shrink-0 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={() => openEditTestimonial(t)}
                        className="min-h-[38px] sm:min-h-0 inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-full border border-black/[0.07] bg-white/85 hover:bg-white text-[#1d1d1f] text-xs sm:text-[11px] font-semibold cursor-pointer transition-colors shadow-2xs active:scale-95"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setTestimonialToDelete(t)}
                        className="min-h-[38px] sm:min-h-0 inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-full border border-red-200/80 bg-red-50/85 hover:bg-red-100 text-red-600 text-xs sm:text-[11px] font-semibold cursor-pointer transition-colors shadow-2xs active:scale-95"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 4: PORTFOLIO & PROJECTS MANAGER */}
      {activeTab === 'portfolio' && (
        <div className="w-[min(1240px,calc(100%-24px))] sm:w-[min(1240px,calc(100%-32px))] mx-auto animate-fluid-page">
          
          {/* iOS Navigation Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-950 transition-colors group cursor-pointer py-1.5 px-3 rounded-full apple-liquid-glass-pill active:scale-95 w-fit"
            >
              <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5 text-gray-400 group-hover:text-gray-900" />
              <span>Admin Hub</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={openCreatePortfolio}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#1d1d1f] hover:bg-black text-white text-xs font-semibold shadow-[0_2px_10px_rgba(0,0,0,0.2)] cursor-pointer transition-colors active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Project</span>
              </button>
            </div>
          </div>

          {/* Main Card with Search and Filters */}
          <div className="apple-liquid-glass rounded-[24px] sm:rounded-[32px] p-3.5 sm:p-7 mb-5 relative overflow-hidden">
            <div className="specular-highlight opacity-55" />
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 pb-4 sm:pb-5 border-b border-black/[0.05] relative z-10 px-0.5">
              <div>
                <h3 className="font-display text-base sm:text-xl font-bold text-[#1d1d1f]">
                  Portfolio Showcase
                </h3>
                <p className="text-xs text-[#6e6e73] mt-0.5">
                  Showcase completed client contracts, products, services, and real experiences.
                </p>
              </div>

              {/* Search input (fully rounded) */}
              <div className="relative w-full md:w-64">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search projects or clients…"
                  value={portfolioSearchQuery}
                  onChange={(e) => setPortfolioSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 rounded-full border border-black/[0.07] bg-white/85 focus:bg-white focus:border-[#f47b20] outline-none text-sm sm:text-xs transition-colors shadow-2xs"
                />
                {portfolioSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setPortfolioSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Category Filter Pills (fully rounded) */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-3 relative z-10 -mx-0.5 px-0.5">
              {PORTFOLIO_CATEGORIES.map((cat) => {
                const isSelected = portfolioCategoryFilter === cat;
                const count = cat === 'All Projects'
                  ? portfolioItems.length
                  : portfolioItems.filter(p => p.category === cat).length;

                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setPortfolioCategoryFilter(cat)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#1d1d1f] text-white shadow-2xs'
                        : 'bg-black/[0.04] hover:bg-black/[0.08] text-gray-700'
                    }`}
                  >
                    <span>{cat}</span>
                    <span className={`ml-1.5 text-[10px] font-mono ${isSelected ? 'text-white/70' : 'text-gray-400'}`}>
                      ({count})
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Portfolio Grid */}
            {filteredPortfolio.length === 0 ? (
              <div className="text-center py-10 sm:py-12 relative z-10">
                <Briefcase className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                <p className="text-xs text-gray-500 font-medium">No projects found matching your query.</p>
                <button
                  type="button"
                  onClick={() => {
                    setPortfolioSearchQuery('');
                    setPortfolioCategoryFilter('All Projects');
                  }}
                  className="mt-3 px-4 py-1.5 rounded-full bg-black/5 hover:bg-black/10 text-xs font-semibold text-gray-700 cursor-pointer"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-5 mt-3 sm:mt-5 relative z-10">
                {filteredPortfolio.map((item) => {
                  const gallery = (item.gallery && item.gallery.length > 0)
                    ? item.gallery
                    : (item.imageUrl ? [item.imageUrl] : []);

                  return (
                    <div
                      key={item.id}
                      className="group apple-liquid-glass-interactive rounded-[20px] sm:rounded-[24px] p-3.5 sm:p-4 flex flex-col justify-between relative overflow-hidden"
                    >
                      <div className="specular-highlight opacity-50" />
                      <div className="relative z-10">
                        {/* 1. Primary Photo Container (Concentric: 20px-24px - 14px-16px = 14px-16px) */}
                        <div className="relative rounded-[14px] sm:rounded-[16px] overflow-hidden aspect-16/10 bg-gray-100 shadow-2xs mb-2.5">
                          <img 
                            src={item.imageUrl} 
                            alt={item.title} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent opacity-60" />

                          {/* Photos Count Badge */}
                          <span className="absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-white text-[10px] font-mono border border-white/20">
                            {gallery.length} {gallery.length === 1 ? 'picture' : 'pictures'}
                          </span>
                        </div>

                        {/* Multiple Pictures Gallery Strip if more than 1 picture */}
                        {gallery.length > 1 && (
                          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 mb-2.5 scrollbar-none">
                            {gallery.map((pic, pIdx) => (
                              <div
                                key={pIdx}
                                className={`w-11 h-11 rounded-[10px] sm:rounded-[12px] overflow-hidden border shrink-0 bg-gray-100 ${
                                  pic === item.imageUrl ? 'border-[#f47b20] ring-1 ring-orange-300' : 'border-black/10'
                                }`}
                              >
                                <img src={pic} alt={`Thumbnail ${pIdx + 1}`} className="w-full h-full object-cover" />
                              </div>
                            ))}
                          </div>
                        )}

                        {/* 2. Project Title */}
                        <h4 className="font-display text-sm font-bold text-[#1d1d1f] leading-snug mb-1">
                          {item.title}
                        </h4>

                        {/* 3. Project Description */}
                        <p className="text-xs text-[#6e6e73] leading-relaxed font-normal mb-3 whitespace-pre-line line-clamp-3">
                          {item.description}
                        </p>
                      </div>

                      {/* Actions Bar */}
                      <div className="pt-3 border-t border-black/[0.05] flex items-center justify-between gap-2 relative z-10">
                        <span className="text-[10.5px] text-gray-400 font-mono tabular-nums">
                          {gallery.length} {gallery.length === 1 ? 'photo' : 'photos'}
                        </span>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditPortfolio(item)}
                            className="min-h-[38px] sm:min-h-0 inline-flex items-center gap-1 px-3.5 sm:px-3 py-1.5 rounded-full border border-black/[0.07] bg-white/85 hover:bg-white text-[#1d1d1f] text-xs sm:text-[11px] font-semibold cursor-pointer transition-colors shadow-2xs active:scale-95"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setPortfolioToDelete(item)}
                            className="min-h-[38px] sm:min-h-0 inline-flex items-center gap-1 px-3.5 sm:px-3 py-1.5 rounded-full border border-red-200/80 bg-red-50/85 hover:bg-red-100 text-red-600 text-xs sm:text-[11px] font-semibold cursor-pointer transition-colors shadow-2xs active:scale-95"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        </div>
      )}

      {/* ========================================================
          TESTIMONIAL ADD / EDIT MODAL
          ======================================================== */}
      {isTestimonialModalOpen && (
        <div 
          className="fixed inset-0 z-[160] apple-modal-backdrop animate-liquid-backdrop flex items-center justify-center p-2.5 sm:p-4 overscroll-none touch-none"
          onClick={() => !tSaving && setIsTestimonialModalOpen(false)}
        >
          <div 
            className="relative apple-modal-glass rounded-[24px] sm:rounded-[32px] w-full max-w-lg animate-liquid-expand overflow-hidden max-h-[calc(100dvh-20px)] sm:max-h-[calc(100dvh-40px)] flex flex-col touch-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pointer-events-none absolute -top-20 -right-20 w-52 h-52 rounded-full bg-orange-400/14 blur-3xl z-0" />
            <div className="pointer-events-none absolute -bottom-20 -left-16 w-52 h-52 rounded-full bg-sky-400/10 blur-3xl z-0" />
            <div className="specular-highlight opacity-80 z-20" />

            {/* Pinned Floating Circular Close Button */}
            <button 
              type="button"
              disabled={tSaving}
              onClick={() => setIsTestimonialModalOpen(false)}
              className="apple-floating-glass absolute top-3 right-3 sm:top-3.5 sm:right-3.5 z-30 w-9 h-9 rounded-full overflow-hidden text-[#1d1d1f] flex items-center justify-center transition-all cursor-pointer active:scale-95 touch-action-btn disabled:opacity-50"
              aria-label="Close modal"
              title="Close"
            >
              <span className="specular-highlight opacity-70" />
              <X className="w-4 h-4 relative z-10" />
            </button>

            {/* Docked Header */}
            <div className="shrink-0 bg-white/85 backdrop-blur-xl border-b border-black/[0.06] pl-4 sm:pl-7 pr-14 pt-3 pb-3.5 sm:pb-4 relative z-20">
              <div className="w-9 h-1 rounded-full bg-gray-400/50 mx-auto mb-2.5 sm:mb-3" />
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-display text-base sm:text-xl font-bold text-[#1d1d1f] truncate">
                    {editingTestimonial ? 'Edit Review' : 'Add Client Review'}
                  </h2>
                  <p className="text-[11px] text-[#424245] mt-0.5 truncate">
                    Displayed in the homepage client testimonials shelf.
                  </p>
                </div>
              </div>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto touch-momentum px-4 sm:px-7 py-4 sm:py-5 relative z-10">
              {tError && (
                <div className="p-3.5 mb-4 rounded-[14px] sm:rounded-[18px] apple-liquid-glass-error text-xs text-rose-950 flex items-center gap-2.5 shadow-sm animate-liquid-expand">
                  <div className="specular-highlight opacity-40" />
                  <div className="w-6 h-6 rounded-full bg-rose-500/15 border border-rose-500/25 flex items-center justify-center shrink-0">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                  </div>
                  <span className="font-medium relative z-10 leading-relaxed text-left">{tError}</span>
                </div>
              )}

              <form id="admin-testimonial-form" onSubmit={handleSaveTestimonial} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-[#1d1d1f] mb-1.5">
                    Testimonial Quote *
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="e.g. The quality of our large-format banners completely exceeded expectations."
                    value={tQuote}
                    onChange={(e) => setTQuote(e.target.value)}
                    className="w-full px-4 py-3 rounded-[14px] sm:rounded-[18px] border border-white/80 bg-white/75 focus:bg-white focus:border-[#f47b20] outline-none text-sm sm:text-xs transition-colors shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#1d1d1f] mb-1.5">
                    Client Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Client name or title"
                    value={tAuthor}
                    onChange={(e) => setTAuthor(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-full border border-white/80 bg-white/75 focus:bg-white focus:border-[#f47b20] outline-none text-sm sm:text-xs transition-colors shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#1d1d1f] mb-1.5">
                    Role / Organization
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Marketing Lead, Apex Logistics"
                    value={tRole}
                    onChange={(e) => setTRole(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-full border border-white/80 bg-white/75 focus:bg-white focus:border-[#f47b20] outline-none text-sm sm:text-xs transition-colors shadow-2xs"
                  />
                </div>

                <label htmlFor="tHighlight" className="flex items-center gap-2.5 p-3.5 rounded-[14px] sm:rounded-[18px] bg-white/68 backdrop-blur-md border border-white/80 cursor-pointer select-none shadow-2xs">
                  <input
                    type="checkbox"
                    id="tHighlight"
                    checked={tHighlight}
                    onChange={(e) => setTHighlight(e.target.checked)}
                    className="w-4 h-4 text-[#f47b20] rounded border-gray-300 focus:ring-[#f47b20] cursor-pointer shrink-0"
                  />
                  <span className="font-medium text-[#1d1d1f]">
                    Highlight this review with warm amber card styling
                  </span>
                </label>
              </form>
            </div>

            {/* Docked Footer */}
            <div className="shrink-0 bg-white/85 backdrop-blur-xl border-t border-black/[0.06] px-4 sm:px-7 py-3.5 sm:py-4 flex items-center justify-end gap-2 sm:gap-2.5 relative z-20">
              <button
                type="button"
                disabled={tSaving}
                onClick={() => setIsTestimonialModalOpen(false)}
                className="flex-1 sm:flex-none px-5 py-2.5 rounded-full border border-black/[0.08] bg-white/90 hover:bg-white text-[#1d1d1f] text-xs font-semibold cursor-pointer transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="admin-testimonial-form"
                disabled={tSaving}
                className="flex-1 sm:flex-none px-7 py-2.5 rounded-full bg-[#f47b20] hover:bg-[#c95510] text-white text-xs font-semibold shadow-[0_2px_10px_rgba(244,123,32,0.3)] disabled:opacity-50 cursor-pointer transition-all active:scale-95"
              >
                {tSaving ? 'Saving…' : editingTestimonial ? 'Save Changes' : 'Publish Review'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Testimonial Modal */}
      {testimonialToDelete && (
        <div 
          className="fixed inset-0 z-[200] apple-modal-backdrop animate-liquid-backdrop flex items-center justify-center p-4"
          onClick={() => setTestimonialToDelete(null)}
        >
          <div 
            className="relative apple-modal-glass rounded-[24px] sm:rounded-[32px] w-full max-w-sm p-6 sm:p-7 animate-liquid-expand text-center overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="specular-highlight opacity-80 z-20" />
            <button
              type="button"
              onClick={() => setTestimonialToDelete(null)}
              className="apple-floating-glass absolute top-3 right-3 sm:top-3.5 sm:right-3.5 z-30 w-9 h-9 rounded-full overflow-hidden text-[#1d1d1f] flex items-center justify-center transition-all cursor-pointer active:scale-95 touch-action-btn"
              aria-label="Close"
              title="Close"
            >
              <span className="specular-highlight opacity-70" />
              <X className="w-4 h-4 relative z-10" />
            </button>

            <div className="w-12 h-12 rounded-[14px] sm:rounded-[16px] bg-red-50/90 text-red-600 flex items-center justify-center mx-auto mb-3.5 border border-red-200/70 relative z-10">
              <Trash2 className="w-5 h-5" />
            </div>

            <h3 className="font-display text-lg font-bold text-[#1d1d1f] mb-1 relative z-10">
              Delete Review?
            </h3>

            <p className="text-xs text-[#6e6e73] mb-5 leading-relaxed relative z-10">
              Remove review from <strong className="text-[#1d1d1f] block truncate">{testimonialToDelete.author}</strong>? It will immediately disappear from the homepage.
            </p>

            <div className="flex items-center gap-2.5 relative z-10">
              <button
                type="button"
                onClick={() => setTestimonialToDelete(null)}
                className="flex-1 py-2.5 rounded-full border border-white/80 bg-white/75 hover:bg-white text-[#1d1d1f] text-xs font-semibold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteTestimonial}
                className="flex-1 py-2.5 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs cursor-pointer transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          PORTFOLIO ADD / EDIT MODAL (PICTURES & DESCRIPTION)
          ======================================================== */}
      {isPortfolioModalOpen && (
        <div 
          className="fixed inset-0 z-[160] apple-modal-backdrop animate-liquid-backdrop flex items-center justify-center p-2.5 sm:p-4 overscroll-none touch-none"
          onClick={() => !portSaving && setIsPortfolioModalOpen(false)}
        >
          <div 
            className="relative apple-modal-glass rounded-[24px] sm:rounded-[32px] w-full max-w-2xl animate-liquid-expand max-h-[calc(100dvh-20px)] sm:max-h-[calc(100dvh-40px)] flex flex-col overflow-hidden touch-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pointer-events-none absolute -top-20 -right-20 w-56 h-56 rounded-full bg-indigo-400/14 blur-3xl z-0" />
            <div className="pointer-events-none absolute -bottom-20 -left-16 w-56 h-56 rounded-full bg-orange-400/12 blur-3xl z-0" />
            <div className="specular-highlight opacity-80 z-20" />

            {/* Pinned Floating Circular Close Button */}
            <button
              type="button"
              disabled={portSaving}
              onClick={() => setIsPortfolioModalOpen(false)}
              className="apple-floating-glass absolute top-3 right-3 sm:top-3.5 sm:right-3.5 z-30 w-9 h-9 rounded-full overflow-hidden text-[#1d1d1f] flex items-center justify-center transition-all cursor-pointer active:scale-95 touch-action-btn disabled:opacity-50"
              aria-label="Close modal"
              title="Close"
            >
              <span className="specular-highlight opacity-70" />
              <X className="w-4 h-4 relative z-10" />
            </button>

            {/* Docked Header */}
            <div className="shrink-0 bg-white/85 backdrop-blur-xl border-b border-black/[0.06] pl-4 sm:pl-7 pr-14 pt-3 pb-3.5 sm:pb-4 relative z-20">
              <div className="w-9 h-1 rounded-full bg-gray-400/50 mx-auto mb-2.5 sm:mb-3" />
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-display text-base sm:text-xl font-bold text-[#1d1d1f] truncate">
                    {editingPortfolioItem ? 'Edit Project' : 'Add Project'}
                  </h2>
                  <p className="text-[11px] text-[#424245] mt-0.5 truncate">
                    Upload project pictures and write a description for this work.
                  </p>
                </div>
              </div>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto touch-momentum px-4 sm:px-7 py-4 sm:py-5 relative z-10">
              {portError && (
                <div className="mb-4 p-3.5 rounded-[14px] sm:rounded-[18px] apple-liquid-glass-error text-xs text-rose-950 flex items-center gap-2.5 shadow-sm animate-liquid-expand">
                  <div className="specular-highlight opacity-40" />
                  <div className="w-6 h-6 rounded-full bg-rose-500/15 border border-rose-500/25 flex items-center justify-center shrink-0">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                  </div>
                  <span className="font-medium relative z-10 leading-relaxed text-left">{portError}</span>
                </div>
              )}

              <form id="admin-portfolio-form" onSubmit={handleSavePortfolio} className="space-y-4 text-xs">
                {/* 1. Project Title / Name */}
                <div>
                  <label className="block font-semibold text-[#1d1d1f] mb-1.5">
                    Project Name / Title
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Fleet Vehicle Wrapping & Branding"
                    value={portTitle}
                    onChange={(e) => setPortTitle(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-full border border-black/[0.08] bg-white focus:border-[#f47b20] outline-none text-sm sm:text-xs transition-colors shadow-2xs"
                  />
                </div>

                {/* 2. Pictures Section (Upload & URL & Gallery Preview) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block font-semibold text-[#1d1d1f]">
                      Project Pictures *
                    </label>
                    <span className="text-[11px] text-[#6e6e73] font-mono tabular-nums">
                      {portGallery.length} {portGallery.length === 1 ? 'picture' : 'pictures'}
                    </span>
                  </div>

                  {/* Upload Buttons & URL Paste */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="file"
                      ref={portfolioFileInputRef}
                      accept="image/*"
                      multiple
                      onChange={handleUploadPortfolioImage}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => portfolioFileInputRef.current?.click()}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-full bg-[#1d1d1f] hover:bg-black text-white text-xs font-semibold flex items-center justify-center gap-2 shrink-0 cursor-pointer shadow-xs active:scale-95 transition-all"
                    >
                      <UploadCloud className="w-4 h-4 text-[#f47b20]" />
                      <span>Upload Pictures</span>
                    </button>

                    <div className="flex-1 flex gap-1.5 min-w-0">
                      <input
                        type="url"
                        placeholder="Or paste image URL (https://...)"
                        value={portUrlInput}
                        onChange={(e) => setPortUrlInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddImageUrl();
                          }
                        }}
                        className="min-w-0 flex-1 px-4 py-2 rounded-full border border-black/[0.08] bg-white focus:border-[#f47b20] outline-none text-sm sm:text-xs transition-colors shadow-2xs"
                      />
                      <button
                        type="button"
                        onClick={handleAddImageUrl}
                        className="px-4 py-2 rounded-full border border-black/[0.08] bg-white hover:bg-gray-50 text-[#1d1d1f] text-xs font-semibold shrink-0 cursor-pointer shadow-2xs active:scale-95 transition-all"
                      >
                        + Add
                      </button>
                    </div>
                  </div>

                  {/* Visual Pictures Grid */}
                  {portGallery.length > 0 ? (
                    <div className="p-3 sm:p-3.5 rounded-[14px] sm:rounded-[18px] bg-white/68 backdrop-blur-md border border-white/80 shadow-2xs">
                      <span className="block text-[10px] font-semibold text-[#6e6e73] mb-2.5 uppercase tracking-wider">
                        Tap any photo to set as Cover Photo
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
                        {portGallery.map((img, idx) => {
                          const isCover = (portImageUrl ? portImageUrl === img : idx === 0);
                          return (
                            <div 
                              key={idx} 
                              onClick={() => setPortImageUrl(img)}
                              className={`relative aspect-4/3 rounded-[12px] sm:rounded-[14px] overflow-hidden group border-2 cursor-pointer transition-all shadow-2xs ${
                                isCover ? 'border-[#f47b20] ring-2 ring-orange-200/80' : 'border-black/[0.08] hover:border-gray-400'
                              }`}
                            >
                              <img src={img} alt={`Project pic ${idx + 1}`} className="w-full h-full object-cover" />
                              
                              {isCover ? (
                                <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-full bg-[#f47b20] text-white text-[9px] font-bold shadow-xs">
                                  Cover
                                </span>
                              ) : (
                                <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-full bg-black/60 text-white text-[9px] font-medium opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                  Make Cover
                                </span>
                              )}

                              <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-black/60 text-white text-[9px] font-mono tabular-nums">
                                {idx + 1}
                              </span>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const filtered = portGallery.filter((_, i) => i !== idx);
                                  setPortGallery(filtered);
                                  if (portImageUrl === img) {
                                    setPortImageUrl(filtered[0] || '');
                                  }
                                }}
                                className="absolute top-1.5 right-1.5 w-7 h-7 sm:w-6 sm:h-6 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-xs cursor-pointer active:scale-90 transition-transform"
                                title="Delete photo"
                                aria-label="Delete photo"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div 
                      onClick={() => portfolioFileInputRef.current?.click()}
                      className="p-5 sm:p-6 rounded-[14px] sm:rounded-[18px] border-2 border-dashed border-black/[0.12] hover:border-[#f47b20] bg-white/65 backdrop-blur-md hover:bg-orange-50/30 text-center cursor-pointer transition-colors"
                    >
                      <ImagePlus className="w-8 h-8 text-gray-300 mx-auto mb-1.5" />
                      <p className="text-xs font-semibold text-[#1d1d1f]">No pictures added yet</p>
                      <p className="text-[11px] text-[#6e6e73] mt-0.5">Click to upload pictures from your computer or phone</p>
                    </div>
                  )}
                </div>

                {/* 3. Description Section */}
                <div>
                  <label className="block font-semibold text-[#1d1d1f] mb-1.5">
                    Project Description *
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Describe the project, materials used, turnaround time, installation details, or client outcome..."
                    value={portDescription}
                    onChange={(e) => setPortDescription(e.target.value)}
                    className="w-full p-3.5 rounded-[14px] sm:rounded-[18px] border border-white/80 bg-white/75 focus:bg-white focus:border-[#f47b20] outline-none text-sm sm:text-xs leading-relaxed transition-colors resize-none placeholder:text-gray-400 shadow-2xs"
                  />
                </div>
              </form>
            </div>

            {/* Docked Footer */}
            <div className="shrink-0 bg-white/85 backdrop-blur-xl border-t border-black/[0.06] px-4 sm:px-7 py-3.5 sm:py-4 flex items-center justify-end gap-2 sm:gap-2.5 relative z-20">
              <button
                type="button"
                disabled={portSaving}
                onClick={() => setIsPortfolioModalOpen(false)}
                className="flex-1 sm:flex-none px-5 py-2.5 rounded-full border border-black/[0.08] bg-white/90 hover:bg-white text-[#1d1d1f] text-xs font-semibold cursor-pointer transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="admin-portfolio-form"
                disabled={portSaving}
                className="flex-1 sm:flex-none px-7 py-2.5 rounded-full bg-[#1d1d1f] hover:bg-black text-white text-xs font-semibold shadow-[0_2px_10px_rgba(0,0,0,0.2)] disabled:opacity-50 cursor-pointer transition-all active:scale-95"
              >
                {portSaving ? 'Saving…' : editingPortfolioItem ? 'Save Changes' : 'Save Project'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Portfolio Modal */}
      {portfolioToDelete && (
        <div 
          className="fixed inset-0 z-[200] apple-modal-backdrop animate-liquid-backdrop flex items-center justify-center p-4"
          onClick={() => !isDeletingPortfolio && setPortfolioToDelete(null)}
        >
          <div 
            className="relative apple-modal-glass rounded-[24px] sm:rounded-[32px] w-full max-w-sm p-6 sm:p-7 animate-liquid-expand text-center overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="specular-highlight opacity-80 z-20" />
            <button
              type="button"
              disabled={isDeletingPortfolio}
              onClick={() => setPortfolioToDelete(null)}
              className="apple-floating-glass absolute top-3 right-3 sm:top-3.5 sm:right-3.5 z-30 w-9 h-9 rounded-full overflow-hidden text-[#1d1d1f] flex items-center justify-center transition-all cursor-pointer active:scale-95 touch-action-btn disabled:opacity-50"
              aria-label="Close"
              title="Close"
            >
              <span className="specular-highlight opacity-70" />
              <X className="w-4 h-4 relative z-10" />
            </button>

            <div className="w-12 h-12 rounded-[14px] sm:rounded-[16px] bg-red-50/90 text-red-600 flex items-center justify-center mx-auto mb-3.5 border border-red-200/70 relative z-10">
              <Trash2 className="w-5 h-5" />
            </div>

            <h3 className="font-display text-lg font-bold text-[#1d1d1f] mb-1 relative z-10">
              Delete Project?
            </h3>

            <p className="text-xs text-[#6e6e73] mb-5 leading-relaxed relative z-10">
              Remove <strong className="text-[#1d1d1f] block truncate">{portfolioToDelete.title}</strong> for <span className="text-[#1d1d1f] font-medium">{portfolioToDelete.client}</span>? It will immediately disappear from the public portfolio page.
            </p>

            <div className="flex items-center gap-2.5 relative z-10">
              <button
                type="button"
                disabled={isDeletingPortfolio}
                onClick={() => setPortfolioToDelete(null)}
                className="flex-1 py-2.5 rounded-full border border-white/80 bg-white/75 hover:bg-white text-[#1d1d1f] text-xs font-semibold cursor-pointer transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingPortfolio}
                onClick={confirmDeletePortfolio}
                className="flex-1 py-2.5 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs cursor-pointer transition-colors disabled:opacity-50"
              >
                {isDeletingPortfolio ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          SIMPLE PRODUCT ADD / EDIT MODAL (3-Zone Docked Header / Body / Footer)
          ======================================================== */}
      {isFormOpen && (
        <div 
          className="fixed inset-0 z-[150] apple-modal-backdrop animate-liquid-backdrop flex items-center justify-center p-2.5 sm:p-4 overscroll-none touch-none"
          onClick={() => setIsFormOpen(false)}
        >
          <div 
            className="relative apple-modal-glass rounded-[24px] sm:rounded-[32px] w-full max-w-2xl max-h-[calc(100dvh-20px)] sm:max-h-[calc(100dvh-40px)] flex flex-col overflow-hidden animate-liquid-expand touch-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pointer-events-none absolute -top-20 -right-20 w-56 h-56 rounded-full bg-orange-400/14 blur-3xl z-0" />
            <div className="pointer-events-none absolute -bottom-20 -left-16 w-56 h-56 rounded-full bg-sky-400/10 blur-3xl z-0" />
            <div className="specular-highlight opacity-80 z-20" />

            {/* Pinned Floating Circular Close Button */}
            <button 
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="apple-floating-glass absolute top-3 right-3 sm:top-3.5 sm:right-3.5 z-30 w-9 h-9 rounded-full overflow-hidden text-[#1d1d1f] flex items-center justify-center transition-all cursor-pointer active:scale-95 touch-action-btn"
              aria-label="Close product form"
              title="Close"
            >
              <span className="specular-highlight opacity-70" />
              <X className="w-4 h-4 relative z-10" />
            </button>

            {/* Docked Header */}
            <div className="shrink-0 bg-white/85 backdrop-blur-xl border-b border-black/[0.06] pl-4 sm:pl-7 pr-14 pt-3 pb-3.5 sm:pb-4 relative z-20">
              <div className="w-9 h-1 rounded-full bg-gray-400/50 mx-auto mb-2.5 sm:mb-3" />
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-display text-base sm:text-xl font-bold text-[#1d1d1f] truncate">
                    {editingProduct ? 'Edit Product' : 'Add New Product'}
                  </h2>
                  <p className="text-[11px] text-[#424245] mt-0.5 truncate">
                    Fills in the catalog live on the store.
                  </p>
                </div>
              </div>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto touch-momentum px-4 sm:px-7 py-4 sm:py-5 relative z-10">
              {formError && (
                <div className="p-3.5 mb-4 rounded-[14px] sm:rounded-[18px] apple-liquid-glass-error text-xs text-rose-950 flex items-center gap-2.5 shadow-sm animate-liquid-expand">
                  <div className="specular-highlight opacity-40" />
                  <div className="w-6 h-6 rounded-full bg-rose-500/15 border border-rose-500/25 flex items-center justify-center shrink-0">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                  </div>
                  <span className="font-medium relative z-10 leading-relaxed text-left">{formError}</span>
                </div>
              )}

              <form id="admin-product-form" onSubmit={handleSaveProduct} className="space-y-4 text-xs">
                {/* 1. Product Title */}
                <div>
                  <label className="block font-semibold text-[#1d1d1f] mb-1.5">
                    Product Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 3D Acrylic Frontage Channel Letters"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-full border border-black/[0.08] bg-white focus:border-[#f47b20] outline-none text-sm sm:text-xs transition-colors shadow-2xs"
                  />
                </div>

                {/* 2. Category & Unit Specification */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5">
                  <div>
                    <label className="block font-semibold text-[#1d1d1f] mb-1.5">
                      Category *
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-full border border-black/[0.08] bg-white focus:border-[#f47b20] outline-none text-sm sm:text-xs cursor-pointer shadow-2xs"
                    >
                      {CATEGORIES.filter(c => c !== 'All Products').map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-[#1d1d1f] mb-1.5">
                      Unit Specification
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. piece, pack (100 pcs), set, yard"
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-full border border-black/[0.08] bg-white focus:border-[#f47b20] outline-none text-sm sm:text-xs transition-colors shadow-2xs"
                    />
                  </div>
                </div>

                {/* 3. Price & Min Order Qty */}
                <div className="grid grid-cols-2 gap-3 sm:gap-3.5">
                  <div>
                    <label className="block font-semibold text-[#1d1d1f] mb-1.5">
                      Price (₦) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400">₦</span>
                      <input
                        type="number"
                        min="0"
                        required
                        placeholder="25000"
                        value={price}
                        onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full pl-8 pr-3 sm:pr-4 py-2.5 rounded-full border border-black/[0.08] bg-white focus:border-[#f47b20] outline-none text-sm sm:text-xs font-semibold tabular-nums transition-colors shadow-2xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-[#1d1d1f] mb-1.5">
                      Min Order Qty
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={minOrderQty}
                      onChange={(e) => setMinOrderQty(Math.max(1, Number(e.target.value)))}
                      className="w-full px-4 py-2.5 rounded-full border border-black/[0.08] bg-white focus:border-[#f47b20] outline-none text-sm sm:text-xs tabular-nums transition-colors shadow-2xs"
                    />
                  </div>
                </div>

                {/* Storefront Display Position (Rank) */}
                <div className="bg-gradient-to-br from-orange-50/85 to-amber-50/55 backdrop-blur-md p-3.5 sm:p-4 rounded-[14px] sm:rounded-[18px] border border-orange-200/75 shadow-2xs">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <label className="font-semibold text-[#1d1d1f] flex items-center gap-1.5 text-xs">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-[#f47b20] shrink-0" />
                      <span>Storefront Position</span>
                    </label>
                    <span className="text-[10px] font-bold text-[#c95510] bg-white/85 px-2.5 py-0.5 rounded-full border border-orange-200/80 tabular-nums shrink-0">
                      Position #{position || 1}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3">
                    <input
                      type="number"
                      min="1"
                      placeholder="1"
                      value={position}
                      onChange={(e) => setPosition(e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full sm:w-24 px-3.5 py-2 rounded-full border border-black/[0.10] focus:border-[#f47b20] outline-none text-sm sm:text-xs font-bold bg-white text-[#1d1d1f] text-center tabular-nums shadow-2xs"
                    />
                    <p className="text-[11px] text-[#6e6e73] leading-relaxed">
                      Lower numbers appear first on the storefront shop page (e.g. 1 = first item shown to customers).
                    </p>
                  </div>
                </div>

                {/* 4. Product Image Attach Field */}
                <div className="pt-1">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <label className="font-semibold text-[#1d1d1f]">
                      Product Pictures * <span className="font-normal text-[#6e6e73] hidden sm:inline">(Attach local photo up to 10)</span>
                    </label>
                    <span className="text-[11px] text-[#6e6e73] font-medium tabular-nums shrink-0">
                      {uploadedImages.length} / 10 attached
                    </span>
                  </div>

                  <input 
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    multiple
                    onChange={handleImageFilesUpload}
                    className="hidden"
                  />

                  {uploadedImages.length < 10 && (
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-black/[0.12] hover:border-[#f47b20] rounded-[14px] sm:rounded-[18px] p-4 text-center cursor-pointer transition-colors bg-white/65 backdrop-blur-md hover:bg-orange-50/30 mb-3 shadow-2xs"
                    >
                      <UploadCloud className="w-6 h-6 text-[#f47b20] mx-auto mb-1.5" />
                      <p className="text-xs font-semibold text-[#1d1d1f]">
                        Tap to attach pictures from your phone or computer
                      </p>
                      <p className="text-[11px] text-[#6e6e73] mt-0.5">
                        JPG, PNG, or WEBP supported. You can select multiple files at once.
                      </p>
                    </div>
                  )}

                  {uploadedImages.length > 0 && (
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-2.5">
                      {uploadedImages.map((img, idx) => (
                        <div 
                          key={idx} 
                          className={`relative rounded-[12px] sm:rounded-[14px] overflow-hidden aspect-square border-2 group bg-gray-100 ${
                            idx === 0 ? 'border-[#f47b20] shadow-xs' : 'border-black/[0.08]'
                          }`}
                        >
                          <img 
                            src={img} 
                            alt={`Uploaded ${idx + 1}`} 
                            className="w-full h-full object-cover"
                          />
                          {idx === 0 && (
                            <span className="absolute top-1 left-1 bg-[#f47b20] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-xs z-10">
                              Cover
                            </span>
                          )}

                          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent sm:bg-black/40 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex items-end sm:items-center justify-center gap-1.5 p-1.5 sm:p-0">
                            {idx !== 0 && (
                              <button
                                type="button"
                                onClick={() => setPrimaryImage(idx)}
                                title="Make Cover Photo"
                                className="p-1.5 rounded-full bg-white text-gray-800 hover:bg-amber-100 cursor-pointer shadow-xs"
                              >
                                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => removeImage(idx)}
                              title="Remove Photo"
                              className="p-1.5 rounded-full bg-red-600 text-white hover:bg-red-700 cursor-pointer shadow-xs"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 5. Color Palette Selection + Custom Color */}
                <div className="pt-1">
                  <label className="block font-semibold text-[#1d1d1f] mb-1.5">
                    Color Selection <span className="font-normal text-[#6e6e73]">(Choose from palette or add custom)</span>
                  </label>

                  <div className="flex flex-wrap items-center gap-2 p-3 bg-white/68 backdrop-blur-md rounded-[14px] sm:rounded-[18px] border border-white/80 mb-2.5 shadow-2xs">
                    {PALETTE_COLORS.map(c => {
                      const isSelected = selectedColors.includes(c.name);
                      return (
                        <button
                          key={c.name}
                          type="button"
                          onClick={() => togglePaletteColor(c.name)}
                          title={c.name}
                          className={`relative w-8 h-8 sm:w-7 sm:h-7 rounded-full transition-transform cursor-pointer flex items-center justify-center ${
                            c.border ? 'border border-gray-300' : ''
                          } ${isSelected ? 'ring-2 ring-offset-2 ring-[#f47b20] scale-110' : 'hover:scale-105'}`}
                          style={{ backgroundColor: c.hex }}
                        >
                          {isSelected && (
                            <Check 
                              className={`w-3.5 h-3.5 stroke-[3] ${
                                c.hex === '#FFFFFF' || c.hex === '#EAB308' || c.hex === '#D1D5DB' 
                                  ? 'text-black' 
                                  : 'text-white'
                              }`} 
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-2 mb-2 min-w-0">
                    <input
                      type="color"
                      value={customColorHex}
                      onChange={(e) => setCustomColorHex(e.target.value)}
                      className="w-9 h-9 sm:w-8 sm:h-8 rounded-full border border-black/[0.08] cursor-pointer p-0.5 bg-white shrink-0 shadow-2xs"
                      title="Pick Color"
                    />
                    <input
                      type="text"
                      placeholder="Custom color name"
                      value={customColorName}
                      onChange={(e) => setCustomColorName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomColor(); } }}
                      className="min-w-0 flex-1 px-4 py-2 rounded-full border border-black/[0.08] bg-white text-sm sm:text-xs outline-none focus:border-[#f47b20] shadow-2xs"
                    />
                    <button
                      type="button"
                      onClick={addCustomColor}
                      className="px-4 py-2 rounded-full border border-black/[0.08] bg-white hover:bg-gray-50 text-[#1d1d1f] text-xs font-semibold cursor-pointer active:scale-95 shadow-2xs shrink-0"
                    >
                      + Add
                    </button>
                  </div>

                  {selectedColors.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedColors.map(color => (
                        <span 
                          key={color} 
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-black/[0.08] text-[11px] font-medium text-[#1d1d1f] shadow-2xs"
                        >
                          <span 
                            className="w-2.5 h-2.5 rounded-full border border-black/10" 
                            style={{
                              backgroundColor: PALETTE_COLORS.find(p => p.name === color)?.hex || '#6e6e73'
                            }} 
                          />
                          <span>{color}</span>
                          <button
                            type="button"
                            onClick={() => togglePaletteColor(color)}
                            className="text-gray-400 hover:text-black ml-0.5 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* 6. Size Selection */}
                <div className="pt-1">
                  <label className="block font-semibold text-[#1d1d1f] mb-1.5">
                    Available Sizes / Specs
                  </label>

                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {PRESET_SIZES.map(s => {
                      const isSelected = selectedSizes.includes(s);
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => togglePresetSize(s)}
                          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-colors active:scale-95 ${
                            isSelected 
                              ? 'bg-[#1d1d1f] text-white shadow-2xs' 
                              : 'bg-white border border-black/[0.08] text-[#1d1d1f] hover:bg-gray-50'
                          }`}
                        >
                          {s}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-2 mb-2 min-w-0">
                    <input
                      type="text"
                      placeholder="Custom size (e.g. 85x200cm, 500ml)"
                      value={customSizeInput}
                      onChange={(e) => setCustomSizeInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomSize(); } }}
                      className="min-w-0 flex-1 px-4 py-2 rounded-full border border-black/[0.08] bg-white text-sm sm:text-xs outline-none focus:border-[#f47b20] shadow-2xs"
                    />
                    <button
                      type="button"
                      onClick={addCustomSize}
                      className="px-4 py-2 rounded-full border border-black/[0.08] bg-white hover:bg-gray-50 text-[#1d1d1f] text-xs font-semibold cursor-pointer active:scale-95 shadow-2xs shrink-0"
                    >
                      + Add
                    </button>
                  </div>

                  {selectedSizes.some(s => !PRESET_SIZES.includes(s)) && (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedSizes.filter(s => !PRESET_SIZES.includes(s)).map(s => (
                        <span 
                          key={s} 
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-black/[0.08] text-[11px] font-medium text-[#1d1d1f] shadow-2xs"
                        >
                          <span>{s}</span>
                          <button
                            type="button"
                            onClick={() => togglePresetSize(s)}
                            className="text-gray-400 hover:text-black ml-0.5 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* 7. Description */}
                <div className="pt-1">
                  <label className="block font-semibold text-[#1d1d1f] mb-1.5">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Provide product details, material quality, and usage instructions..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-4 py-3 rounded-[14px] sm:rounded-[18px] border border-white/80 bg-white/75 focus:bg-white focus:border-[#f47b20] outline-none text-sm sm:text-xs transition-colors resize-y leading-relaxed shadow-2xs"
                  />
                </div>

                {/* In Stock Toggle */}
                <label className="flex items-center gap-2.5 p-3.5 rounded-[14px] sm:rounded-[18px] bg-white/68 backdrop-blur-md border border-white/80 cursor-pointer select-none shadow-2xs">
                  <input
                    type="checkbox"
                    checked={inStock}
                    onChange={(e) => setInStock(e.target.checked)}
                    className="w-4 h-4 rounded text-[#f47b20] focus:ring-0 cursor-pointer"
                  />
                  <span className="font-semibold text-[#1d1d1f] text-xs">Available In Stock</span>
                </label>
              </form>
            </div>

            {/* Docked Footer (Strictly outside scroll container — zero bleed-through) */}
            <div className="shrink-0 bg-white/40 backdrop-blur-xl border-t border-white/45 px-4 sm:px-7 py-3.5 sm:py-4 flex items-center justify-end gap-2 sm:gap-2.5 relative z-20">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => setIsFormOpen(false)}
                className="flex-1 sm:flex-none px-5 py-2.5 rounded-full border border-white/80 bg-white/70 hover:bg-white text-[#1d1d1f] text-xs font-semibold cursor-pointer transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="admin-product-form"
                disabled={isSaving}
                className="flex-1 sm:flex-none px-6 sm:px-8 py-2.5 rounded-full bg-[#f47b20] hover:bg-[#c95510] text-white text-xs font-semibold shadow-[0_2px_10px_rgba(244,123,32,0.3)] disabled:opacity-50 cursor-pointer transition-all active:scale-95 whitespace-nowrap"
              >
                {isSaving ? 'Saving…' : editingProduct ? 'Save Changes' : 'Publish Product'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          IN-APP DELETE CONFIRMATION MODAL (No window.confirm needed)
          ======================================================== */}
      {productToDelete && (
        <div 
          className="fixed inset-0 z-[200] apple-modal-backdrop animate-liquid-backdrop flex items-center justify-center p-4"
          onClick={() => !isDeleting && setProductToDelete(null)}
        >
          <div 
            className="relative apple-modal-glass rounded-[24px] sm:rounded-[32px] w-full max-w-sm p-6 sm:p-7 animate-liquid-expand text-center overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="specular-highlight opacity-80 z-20" />
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => setProductToDelete(null)}
              className="apple-floating-glass absolute top-3 right-3 sm:top-3.5 sm:right-3.5 z-30 w-9 h-9 rounded-full overflow-hidden text-[#1d1d1f] flex items-center justify-center transition-all cursor-pointer active:scale-95 touch-action-btn disabled:opacity-50"
              aria-label="Close"
              title="Close"
            >
              <span className="specular-highlight opacity-70" />
              <X className="w-4 h-4 relative z-10" />
            </button>

            <div className="w-12 h-12 rounded-[14px] sm:rounded-[16px] bg-red-50/90 text-red-600 flex items-center justify-center mx-auto mb-3.5 border border-red-200/70 relative z-10">
              <Trash2 className="w-5 h-5" />
            </div>

            <h3 className="font-display text-lg font-bold text-[#1d1d1f] mb-1 relative z-10">
              Delete Product?
            </h3>

            <p className="text-xs text-[#424245] mb-5 leading-relaxed relative z-10">
              Are you sure you want to delete <strong className="text-[#1d1d1f] font-semibold block mt-0.5 truncate max-w-xs mx-auto">"{productToDelete.title}"</strong>? It will be removed live from the store immediately.
            </p>

            <div className="flex items-center gap-2.5 relative z-10">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setProductToDelete(null)}
                className="flex-1 py-2.5 rounded-full border border-black/[0.08] bg-white/90 hover:bg-white text-[#1d1d1f] text-xs font-semibold cursor-pointer disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmDeleteProduct}
                className="flex-1 py-2.5 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
              >
                {isDeleting ? (
                  <span>Deleting…</span>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Yes, Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Set Position Modal */}
      {quickPosModalProduct && (
        <div 
          className="fixed inset-0 z-[200] apple-modal-backdrop animate-liquid-backdrop flex items-center justify-center p-4"
          onClick={() => setQuickPosModalProduct(null)}
        >
          <div 
            className="relative apple-modal-glass rounded-[24px] sm:rounded-[32px] w-full max-w-sm animate-liquid-expand overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pointer-events-none absolute -top-16 -right-16 w-44 h-44 rounded-full bg-orange-400/14 blur-3xl z-0" />
            <div className="specular-highlight opacity-80 z-20" />

            {/* Pinned Floating Circular Close Button */}
            <button
              type="button"
              onClick={() => setQuickPosModalProduct(null)}
              className="apple-floating-glass absolute top-3 right-3 sm:top-3.5 sm:right-3.5 z-30 w-9 h-9 rounded-full overflow-hidden text-[#1d1d1f] flex items-center justify-center transition-all cursor-pointer active:scale-95 touch-action-btn"
              aria-label="Close rank dialog"
              title="Close"
            >
              <span className="specular-highlight opacity-70" />
              <X className="w-4 h-4 relative z-10" />
            </button>

            {/* Docked Header */}
            <div className="shrink-0 bg-white/85 backdrop-blur-xl border-b border-black/[0.06] pl-4 sm:pl-6 pr-14 pt-3 pb-3.5 sm:pb-4 relative z-20">
              <div className="w-9 h-1 rounded-full bg-gray-400/50 mx-auto mb-2.5 sm:mb-3" />
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-[12px] bg-gradient-to-br from-orange-500/15 via-orange-500/10 to-orange-500/5 border border-orange-200/70 flex items-center justify-center text-[#c95510] shrink-0">
                    <SlidersHorizontal className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-display text-base font-bold text-[#1d1d1f] leading-tight truncate">
                      Set Product Rank
                    </h3>
                    <p className="text-[11px] text-[#424245] truncate">
                      Storefront position order
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="p-4 sm:p-6 relative z-10">
              <div className="flex items-center gap-2.5 p-3 bg-white/68 backdrop-blur-md rounded-[14px] sm:rounded-[18px] mb-4 border border-white/80 shadow-2xs">
                <img
                  src={quickPosModalProduct.imageUrl}
                  alt={quickPosModalProduct.title}
                  className="w-10 h-10 rounded-[10px] sm:rounded-[12px] object-cover border border-black/[0.06] shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-xs text-[#1d1d1f] truncate">
                    {quickPosModalProduct.title}
                  </p>
                  <p className="text-[11px] text-[#6e6e73] tabular-nums">
                    Currently: #{quickPosModalProduct.position ?? (products.findIndex(p => p.id === quickPosModalProduct.id) + 1)}
                  </p>
                </div>
              </div>

              <label className="block text-xs font-semibold text-[#1d1d1f] mb-1.5">
                New Position Number (1 to {products.length})
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max={products.length}
                  autoFocus
                  value={targetQuickPos}
                  onChange={(e) => setTargetQuickPos(e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value) || 1))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSetExactPosition(quickPosModalProduct.id, Number(targetQuickPos) || 1);
                    }
                  }}
                  className="min-w-0 flex-1 px-4 py-2.5 rounded-full border border-white/80 bg-white/75 focus:bg-white focus:border-[#f47b20] outline-none text-sm font-bold text-[#1d1d1f] tabular-nums transition-colors shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => setTargetQuickPos(1)}
                  className="px-4 py-2.5 rounded-full border border-white/80 bg-white/75 hover:bg-white text-[11px] font-semibold text-[#1d1d1f] whitespace-nowrap cursor-pointer shadow-2xs active:scale-95 shrink-0"
                >
                  Make #1
                </button>
              </div>
              <p className="text-[11px] text-[#6e6e73] mt-2">
                Entering 1 moves this product to the very top of the store catalog.
              </p>
            </div>

            {/* Docked Footer */}
            <div className="shrink-0 bg-white/40 backdrop-blur-xl border-t border-white/45 px-4 sm:px-6 py-3.5 sm:py-4 relative z-20">
              <button
                type="button"
                onClick={() => handleSetExactPosition(quickPosModalProduct.id, Number(targetQuickPos) || 1)}
                className="w-full py-3 rounded-full bg-[#f47b20] hover:bg-[#c95510] text-white text-xs font-semibold shadow-[0_2px_10px_rgba(244,123,32,0.3)] cursor-pointer transition-all active:scale-95"
              >
                Apply Position
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Organize Store Positions Modal with Apple Liquid Glass */}
      {isOrganizeModalOpen && (
        <div 
          className="fixed inset-0 z-[180] apple-modal-backdrop animate-liquid-backdrop flex items-center justify-center p-2.5 sm:p-4 overscroll-none touch-none"
          onClick={() => setIsOrganizeModalOpen(false)}
        >
          <div 
            className="relative apple-modal-glass rounded-[24px] sm:rounded-[32px] w-full max-w-2xl max-h-[calc(100dvh-20px)] sm:max-h-[92vh] flex flex-col overflow-hidden animate-liquid-expand touch-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pointer-events-none absolute -top-20 -right-20 w-56 h-56 rounded-full bg-orange-400/14 blur-3xl z-0" />
            <div className="pointer-events-none absolute -bottom-20 -left-16 w-56 h-56 rounded-full bg-sky-400/10 blur-3xl z-0" />
            <div className="specular-highlight opacity-80 z-20" />

            {/* Pinned Floating Circular Close Button */}
            <button 
              type="button"
              onClick={() => setIsOrganizeModalOpen(false)}
              className="apple-floating-glass absolute top-3 right-3 sm:top-3.5 sm:right-3.5 z-30 w-9 h-9 rounded-full overflow-hidden text-[#1d1d1f] flex items-center justify-center transition-all cursor-pointer active:scale-95 touch-action-btn"
              aria-label="Close organize modal"
              title="Close"
            >
              <span className="specular-highlight opacity-70" />
              <X className="w-4 h-4 relative z-10" />
            </button>

            {/* Docked Header */}
            <div className="shrink-0 bg-white/85 backdrop-blur-xl border-b border-black/[0.06] pl-4 sm:pl-7 pr-14 pt-3 pb-3.5 sm:pb-4 relative z-20">
              <div className="w-9 h-1 rounded-full bg-gray-400/50 mx-auto mb-2.5 sm:mb-3" />
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-display text-base sm:text-xl font-bold text-[#1d1d1f] flex items-center gap-2 truncate">
                    <SlidersHorizontal className="w-4 h-4 sm:w-5 sm:h-5 text-[#c95510] shrink-0" />
                    <span className="truncate">Organize Positions</span>
                  </h2>
                  <p className="text-[11px] text-[#424245] mt-0.5 truncate">
                    Change the display sequence of products across the storefront.
                  </p>
                </div>
              </div>
            </div>

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto touch-momentum px-4 sm:px-7 py-4 sm:py-5 flex flex-col relative z-10">
              {/* Quick Actions Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 sm:p-2.5 bg-gradient-to-r from-orange-50/85 to-amber-50/55 backdrop-blur-md border border-orange-200/75 rounded-[14px] sm:rounded-full mb-3.5 sm:mb-4 shrink-0">
                <span className="text-xs text-[#c95510] font-medium sm:pl-3 tabular-nums text-center sm:text-left">
                  Total Products: <strong>{products.length}</strong>
                </span>
                <button
                  type="button"
                  onClick={handleAutoNumberPositions}
                  className="w-full sm:w-auto px-4 py-2 sm:py-1.5 rounded-full bg-white hover:bg-orange-50 text-[#c95510] border border-orange-200/80 text-xs font-semibold shadow-2xs transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
                  title="Renumber products clean sequentially 1, 2, 3..."
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Auto-Number (1 to {products.length})</span>
                </button>
              </div>

              {/* Product Ordering List */}
              <div className="space-y-2.5 sm:space-y-2">
                {[...products]
                  .sort((a, b) => (a.position ?? 99999) - (b.position ?? 99999))
                  .map((item, index, arr) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-[14px] sm:rounded-[18px] border border-white/80 bg-white/68 backdrop-blur-md hover:bg-white/85 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-colors shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="w-8 h-8 rounded-[10px] sm:rounded-[12px] bg-orange-50 border border-orange-200/75 flex items-center justify-center font-mono font-bold text-xs text-[#c95510] shrink-0 tabular-nums">
                          #{item.position ?? (index + 1)}
                        </div>
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          className="w-10 h-10 rounded-[10px] sm:rounded-[12px] object-cover border border-black/[0.06] bg-gray-50 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-xs text-[#1d1d1f] truncate">
                            {item.title}
                          </p>
                          <p className="text-[10.5px] text-[#6e6e73] tabular-nums truncate">
                            {item.category} · {formatNaira(item.price)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-black/[0.05] w-full sm:w-auto">
                        <button
                          type="button"
                          onClick={() => handleMoveProductPosition(item.id, 'up')}
                          disabled={index === 0}
                          className="min-w-[38px] min-h-[38px] sm:min-w-0 sm:min-h-0 flex items-center justify-center p-2 rounded-full border border-black/[0.08] bg-white hover:bg-orange-50 hover:text-[#f47b20] text-gray-600 disabled:opacity-25 disabled:pointer-events-none transition-colors cursor-pointer active:scale-95"
                          title="Move Up"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveProductPosition(item.id, 'down')}
                          disabled={index === arr.length - 1}
                          className="min-w-[38px] min-h-[38px] sm:min-w-0 sm:min-h-0 flex items-center justify-center p-2 rounded-full border border-black/[0.08] bg-white hover:bg-orange-50 hover:text-[#f47b20] text-gray-600 disabled:opacity-25 disabled:pointer-events-none transition-colors cursor-pointer active:scale-95"
                          title="Move Down"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setQuickPosModalProduct(item);
                            setTargetQuickPos(item.position ?? (index + 1));
                          }}
                          className="min-h-[38px] sm:min-h-0 flex-1 sm:flex-initial px-3.5 sm:px-3 py-1.5 rounded-full border border-black/[0.08] bg-white hover:bg-gray-50 text-xs sm:text-[11px] font-semibold text-[#1d1d1f] cursor-pointer transition-colors active:scale-95 shadow-2xs"
                        >
                          Set Rank
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Docked Footer */}
            <div className="shrink-0 bg-white/85 backdrop-blur-xl border-t border-black/[0.06] px-4 sm:px-7 py-3.5 sm:py-4 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3 relative z-20">
              <span className="text-[11px] text-[#424245] text-center sm:text-left">
                Positions update live on the customer shop.
              </span>
              <button
                type="button"
                onClick={() => setIsOrganizeModalOpen(false)}
                className="w-full sm:w-auto px-7 py-2.5 rounded-full bg-[#1d1d1f] hover:bg-black text-white text-xs font-semibold shadow-[0_2px_10px_rgba(0,0,0,0.15)] cursor-pointer transition-all active:scale-95"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Order Confirmation Modal */}
      {orderToDelete && (
        <div 
          className="fixed inset-0 z-[200] apple-modal-backdrop animate-liquid-backdrop flex items-center justify-center p-4"
          onClick={() => !isDeletingOrder && setOrderToDelete(null)}
        >
          <div 
            className="relative apple-modal-glass rounded-[24px] sm:rounded-[32px] w-full max-w-sm p-6 sm:p-7 animate-liquid-expand text-center overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="specular-highlight opacity-80 z-20" />
            <button
              type="button"
              disabled={isDeletingOrder}
              onClick={() => setOrderToDelete(null)}
              className="apple-floating-glass absolute top-3 right-3 sm:top-3.5 sm:right-3.5 z-30 w-9 h-9 rounded-full overflow-hidden text-[#1d1d1f] flex items-center justify-center transition-all cursor-pointer active:scale-95 touch-action-btn disabled:opacity-50"
              aria-label="Close"
              title="Close"
            >
              <span className="specular-highlight opacity-70" />
              <X className="w-4 h-4 relative z-10" />
            </button>

            <div className="w-12 h-12 rounded-[14px] sm:rounded-[16px] bg-red-50/90 text-red-600 flex items-center justify-center mx-auto mb-3.5 border border-red-200/70 relative z-10">
              <Trash2 className="w-5 h-5" />
            </div>

            <h3 className="font-display text-lg font-bold text-[#1d1d1f] mb-1 relative z-10">
              Delete Order?
            </h3>

            <p className="text-xs text-[#6e6e73] mb-4 leading-relaxed relative z-10">
              Are you sure you want to delete order <strong className="text-[#1d1d1f]">#{orderToDelete.id ? orderToDelete.id.slice(0, 8) : 'ORD'}</strong> for <strong className="text-[#1d1d1f]">{orderToDelete.customerName}</strong> ({formatNaira(orderToDelete.totalAmount)})?
            </p>
            <p className="text-[11px] text-red-700 bg-red-50/90 p-2.5 rounded-[14px] border border-red-200/70 mb-5 relative z-10">
              This order and transaction record will be permanently deleted from the database.
            </p>

            <div className="flex items-center gap-2.5 relative z-10">
              <button
                type="button"
                disabled={isDeletingOrder}
                onClick={() => setOrderToDelete(null)}
                className="flex-1 py-2.5 rounded-full border border-white/80 bg-white/75 hover:bg-white text-[#1d1d1f] text-xs font-semibold cursor-pointer disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              
              <button
                type="button"
                disabled={isDeletingOrder}
                onClick={confirmDeleteOrder}
                className="flex-1 py-2.5 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
              >
                {isDeletingOrder ? (
                  <span>Deleting…</span>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Yes, Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating AI Upload Assistant (only visible when authenticated) */}
      <AdminAiChat
        onPublishReview={handleAiPublishReview}
        onPublishPortfolio={handleAiPublishPortfolio}
        onPublishOrder={handleAiPublishOrder}
        onNavigateSection={(tab) => setActiveTab(tab)}
      />

    </div>
  );
}
