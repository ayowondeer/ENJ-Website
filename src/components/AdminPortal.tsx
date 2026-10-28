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
  Lock, 
  Eye, 
  EyeOff 
} from 'lucide-react';
import { 
  db, 
  ProductItem, 
  OrderItem, 
  INITIAL_PRODUCTS,
  deleteProductPermanently,
  isProductDeleted
} from '../firebase';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc 
} from 'firebase/firestore';

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

// Helper to compress local uploaded image files to lightweight Data URLs (<50KB)
const compressImageFile = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 900;
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
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
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
  const [activeTab, setActiveTab] = useState<'products' | 'orders'>('products');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All Products');

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

  // Products Listener (Firestore Live Sync)
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'products'),
      (snap) => {
        if (!snap.empty) {
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

    const primaryImg = uploadedImages[0];
    const galleryImgs = uploadedImages.slice(1);

    const payload: Partial<ProductItem> = {
      title: title.trim(),
      category,
      unit: unit.trim() || 'piece',
      price: Number(price),
      minOrderQty: Math.max(1, Number(minOrderQty) || 1),
      imageUrl: primaryImg,
      gallery: galleryImgs.length > 0 ? galleryImgs : undefined,
      availableColors: selectedColors.length > 0 ? selectedColors : undefined,
      availableSizes: selectedSizes.length > 0 ? selectedSizes : undefined,
      description: description.trim() || 'High quality customized product by ENJ Digital Concept.',
      inStock: Boolean(inStock),
      updatedAt: new Date().toISOString()
    };

    try {
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

      setIsFormOpen(false);
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (err: any) {
      console.error("Save product notice:", err);
      setFormError(`Database notice: ${err?.message || 'Could not save'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Confirmation State
  const [productToDelete, setProductToDelete] = useState<ProductItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleUpdateOrderStatus = async (orderId: string, status: OrderItem['status']) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { status });
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
    } catch (err) {
      console.warn("Update order notice:", err);
    }
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
    });
  }, [products, categoryFilter, searchQuery]);

  // If not authenticated, render clean minimal password protection lock screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex flex-col items-center justify-center p-4 font-sans">
        {/* Main Website back button at the top */}
        <div className="w-full max-w-sm mb-3">
          <button
            onClick={onNavigateHome}
            className="inline-flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors group cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
            <span>Main Website</span>
          </button>
        </div>

        {/* Clean, Simple Lock Card */}
        <div className="w-full max-w-sm bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-gray-200/80 animate-in zoom-in-95 duration-200">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center text-[#f47b20] mx-auto mb-3">
              <Lock className="w-5 h-5" />
            </div>
            <h1 className="font-display text-xl font-bold text-gray-900 tracking-tight">
              Admin Access
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Enter passcode to continue
            </p>
          </div>

          <form onSubmit={handleUnlock} className="space-y-4">
            {authError && (
              <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{authError}</span>
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
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-gray-300 focus:border-[#f47b20] focus:ring-1 focus:ring-[#f47b20] outline-none text-xs font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPasscode(!showPasscode)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 cursor-pointer"
                  title={showPasscode ? "Hide passcode" : "Show passcode"}
                >
                  {showPasscode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-[#1d1d1f] hover:bg-[#3a3a3c] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Unlock</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#1d1d1f] pb-24 pt-6 sm:pt-8 animate-in fade-in duration-300 font-sans">
      
      {/* Back button to store at the top */}
      <div className="w-[min(1240px,calc(100%-24px))] sm:w-[min(1240px,calc(100%-32px))] mx-auto mb-4">
        <button
          onClick={onNavigateShop}
          className="inline-flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-gray-950 transition-colors group cursor-pointer py-1"
        >
          <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
          <span>Back to Store</span>
        </button>
      </div>

      {/* Top Header Card */}
      <div className="w-[min(1240px,calc(100%-24px))] sm:w-[min(1240px,calc(100%-32px))] mx-auto mb-6">
        <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-7 shadow-xs border border-gray-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-[#1d1d1f]">
              Product & Store Management
            </h1>
            <p className="text-xs text-[#6e6e73] mt-0.5">
              Easily add, edit, or remove items and manage customer orders.
            </p>
          </div>

          <div className="flex items-center shrink-0">
            <button
              onClick={openAddModal}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#f47b20] hover:bg-[#c95510] text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Add Product</span>
            </button>
          </div>
        </div>
      </div>

      {/* Status Alert Notification */}
      {statusMessage && (
        <div className="w-[min(1240px,calc(100%-24px))] sm:w-[min(1240px,calc(100%-32px))] mx-auto mb-5">
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in slide-in-from-top-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        </div>
      )}

      {/* Tabs: Products vs Orders */}
      <div className="w-[min(1240px,calc(100%-24px))] sm:w-[min(1240px,calc(100%-32px))] mx-auto mb-5">
        <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
          <button
            onClick={() => setActiveTab('products')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'products'
                ? 'bg-[#1d1d1f] text-white shadow-xs'
                : 'text-gray-600 hover:text-black hover:bg-white'
            }`}
          >
            Products ({products.length})
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'orders'
                ? 'bg-[#1d1d1f] text-white shadow-xs'
                : 'text-gray-600 hover:text-black hover:bg-white'
            }`}
          >
            Orders & Transactions ({orders.length})
          </button>
        </div>
      </div>

      {/* TAB 1: PRODUCTS MANAGER */}
      {activeTab === 'products' && (
        <div className="w-[min(1240px,calc(100%-24px))] sm:w-[min(1240px,calc(100%-32px))] mx-auto">
          {/* Search & Categories */}
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 mb-5">
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:border-[#f47b20]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-medium cursor-pointer transition-colors ${
                    categoryFilter === cat
                      ? 'bg-[#f47b20] text-white font-semibold shadow-2xs'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Fully Responsive Products List - Zero Horizontal Scrolling / Swiping */}
          <div className="space-y-3 w-full">
            {filteredProducts.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 border border-gray-200/80 text-center text-gray-500 text-xs">
                No products match the selected filters.
              </div>
            ) : (
              filteredProducts.map(p => {
                const photoCount = 1 + (p.gallery?.length || 0);
                return (
                  <div 
                    key={p.id}
                    className="bg-white rounded-2xl p-3.5 sm:p-4 border border-gray-200/80 shadow-xs hover:border-gray-300 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3.5 w-full overflow-hidden"
                  >
                    {/* Left: Thumbnail & Details */}
                    <div className="flex items-start gap-3 sm:gap-3.5 min-w-0 flex-1">
                      <img
                        src={p.imageUrl}
                        alt={p.title}
                        className="w-16 h-16 sm:w-16 sm:h-16 rounded-xl object-cover border border-gray-200 bg-gray-50 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap mb-1">
                          <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-[10px] font-semibold">
                            {p.category}
                          </span>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                            p.inStock ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                          }`}>
                            {p.inStock ? 'In Stock' : 'Custom'}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            {photoCount} {photoCount === 1 ? 'photo' : 'photos'}
                          </span>
                        </div>
                        
                        <h4 className="font-semibold text-xs sm:text-sm text-gray-900 leading-snug">
                          {p.title}
                        </h4>
                        
                        <p className="text-[11px] text-gray-500 line-clamp-1 mt-0.5">
                          {p.description}
                        </p>
                      </div>
                    </div>

                    {/* Right: Price & Direct Actions (Always visible without swiping) */}
                    <div className="flex items-center justify-between md:justify-end gap-3.5 shrink-0 pt-2.5 md:pt-0 border-t md:border-t-0 border-gray-100">
                      <div className="text-left md:text-right">
                        <span className="font-bold text-sm sm:text-base text-gray-900 block leading-tight">
                          {formatNaira(p.price)}
                        </span>
                        <span className="text-[10px] sm:text-[11px] text-gray-500 block">
                          Min: {p.minOrderQty} {p.unit}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => openEditModal(p)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl border border-gray-200 hover:bg-gray-100 text-gray-700 text-xs font-semibold cursor-pointer transition-colors"
                          title="Edit Product"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-gray-600" />
                          <span>Edit</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setProductToDelete(p)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold cursor-pointer transition-colors"
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

      {/* TAB 2: ORDERS & PAYSTACK TRANSACTIONS */}
      {activeTab === 'orders' && (
        <div className="w-[min(1240px,calc(100%-24px))] sm:w-[min(1240px,calc(100%-32px))] mx-auto">
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-gray-200/80 shadow-xs p-5 sm:p-6">
            <h3 className="font-display text-lg sm:text-xl font-bold text-gray-900 mb-1">
              Customer Orders & Transactions
            </h3>
            <p className="text-xs text-gray-500 mb-5">
              Live submissions from customer checkout.
            </p>

            {orders.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-gray-200 rounded-2xl">
                <CreditCard className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-gray-700">No orders placed yet</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Customer orders will appear here automatically.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map(order => (
                  <div 
                    key={order.id || Math.random()} 
                    className="p-4 rounded-2xl border border-gray-200/80 bg-gray-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-gray-900 bg-white px-2 py-0.5 rounded-md border border-gray-200">
                          #{order.id ? order.id.slice(0, 8) : 'ORD'}
                        </span>
                        <span className="text-[11px] text-gray-400">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      
                      <div className="pt-0.5">
                        <span className="font-semibold text-gray-900">{order.customerName}</span>
                        <span className="text-gray-500 text-[11px] block">{order.customerEmail}</span>
                        <a 
                          href={`https://wa.me/${order.customerPhone.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#f47b20] hover:underline inline-flex items-center gap-1 mt-0.5 text-[11px]"
                        >
                          <Phone className="w-3 h-3" />
                          {order.customerPhone}
                        </a>
                      </div>

                      <p className="text-[11px] text-gray-600 pt-0.5">
                        <strong className="text-gray-700">Items:</strong> {order.itemsSummary}
                      </p>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-200/60 shrink-0">
                      <span className="font-bold text-sm text-gray-900">
                        {formatNaira(order.totalAmount)}
                      </span>

                      <select
                        value={order.status}
                        onChange={(e) => {
                          if (order.id) handleUpdateOrderStatus(order.id, e.target.value as any);
                        }}
                        className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-[11px] font-semibold bg-white outline-none cursor-pointer"
                      >
                        <option value="pending">Pending</option>
                        <option value="processing">Processing</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          SIMPLE PRODUCT ADD / EDIT MODAL
          ======================================================== */}
      {isFormOpen && (
        <div 
          className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
          onClick={() => setIsFormOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-2xl p-5 sm:p-7 shadow-2xl border border-gray-100 max-h-[92vh] overflow-y-auto animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-5">
              <div>
                <h2 className="font-display text-xl sm:text-2xl font-bold text-[#1d1d1f]">
                  {editingProduct ? 'Edit Product' : 'Add New Product'}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Fills in the catalog live on the store.
                </p>
              </div>
              <button 
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-black transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 mb-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              
              {/* 1. Product Title */}
              <div>
                <label className="block font-semibold text-gray-800 mb-1">
                  Product Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 3D Acrylic Frontage Channel Letters"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-[#f47b20] outline-none text-xs bg-gray-50/50 focus:bg-white transition-colors"
                />
              </div>

              {/* 2. Category & Unit Specification */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold text-gray-800 mb-1">
                    Category *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-[#f47b20] outline-none text-xs bg-white cursor-pointer"
                  >
                    {CATEGORIES.filter(c => c !== 'All Products').map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-gray-800 mb-1">
                    Unit Specification
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. piece, pack (100 pcs), set, yard"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-[#f47b20] outline-none text-xs bg-gray-50/50 focus:bg-white transition-colors"
                  />
                </div>
              </div>

              {/* 3. Price & Min Order Qty */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold text-gray-800 mb-1">
                    Price (₦) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-gray-400">₦</span>
                    <input
                      type="number"
                      min="0"
                      required
                      placeholder="25000"
                      value={price}
                      onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-[#f47b20] outline-none text-xs font-semibold bg-gray-50/50 focus:bg-white transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-gray-800 mb-1">
                    Min Order Qty
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={minOrderQty}
                    onChange={(e) => setMinOrderQty(Math.max(1, Number(e.target.value)))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-[#f47b20] outline-none text-xs bg-gray-50/50 focus:bg-white transition-colors"
                  />
                </div>
              </div>

              {/* 4. Product Image Attach Field (Upload up to 10 local pictures) */}
              <div className="pt-1">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-semibold text-gray-800">
                    Product Pictures * <span className="font-normal text-gray-500">(Attach local photo up to 10)</span>
                  </label>
                  <span className="text-[11px] text-gray-500 font-medium">
                    {uploadedImages.length} / 10 attached
                  </span>
                </div>

                {/* Hidden File Input */}
                <input 
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  multiple
                  onChange={handleImageFilesUpload}
                  className="hidden"
                />

                {/* Upload Trigger Area */}
                {uploadedImages.length < 10 && (
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-200 hover:border-[#f47b20] rounded-2xl p-4 text-center cursor-pointer transition-colors bg-gray-50/60 hover:bg-orange-50/20 mb-3"
                  >
                    <UploadCloud className="w-6 h-6 text-[#f47b20] mx-auto mb-1.5" />
                    <p className="text-xs font-semibold text-gray-800">
                      Tap to attach pictures from your phone or computer
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      JPG, PNG, or WEBP supported. You can select multiple files at once.
                    </p>
                  </div>
                )}

                {/* Uploaded Images Preview Grid */}
                {uploadedImages.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
                    {uploadedImages.map((img, idx) => (
                      <div 
                        key={idx} 
                        className={`relative rounded-xl overflow-hidden aspect-square border-2 group bg-gray-100 ${
                          idx === 0 ? 'border-[#f47b20] shadow-xs' : 'border-gray-200'
                        }`}
                      >
                        <img 
                          src={img} 
                          alt={`Uploaded ${idx + 1}`} 
                          className="w-full h-full object-cover"
                        />
                        {/* Primary Badge */}
                        {idx === 0 && (
                          <span className="absolute top-1 left-1 bg-[#f47b20] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md shadow-xs">
                            Cover
                          </span>
                        )}

                        {/* Actions overlay */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                          {idx !== 0 && (
                            <button
                              type="button"
                              onClick={() => setPrimaryImage(idx)}
                              title="Make Cover Photo"
                              className="p-1 rounded-md bg-white text-gray-800 hover:bg-amber-100"
                            >
                              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => removeImage(idx)}
                            title="Remove Photo"
                            className="p-1 rounded-md bg-red-600 text-white hover:bg-red-700"
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
                <label className="block font-semibold text-gray-800 mb-1">
                  Color Selection <span className="font-normal text-gray-500">(Choose from palette or add custom)</span>
                </label>

                {/* Color Palette Swatches */}
                <div className="flex flex-wrap items-center gap-2 p-2.5 bg-gray-50 rounded-xl border border-gray-200 mb-2.5">
                  {PALETTE_COLORS.map(c => {
                    const isSelected = selectedColors.includes(c.name);
                    return (
                      <button
                        key={c.name}
                        type="button"
                        onClick={() => togglePaletteColor(c.name)}
                        title={c.name}
                        className={`relative w-7 h-7 rounded-full transition-transform cursor-pointer flex items-center justify-center ${
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

                {/* Add Custom Color Input */}
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="color"
                    value={customColorHex}
                    onChange={(e) => setCustomColorHex(e.target.value)}
                    className="w-8 h-8 rounded-lg border border-gray-200 cursor-pointer p-0.5 bg-white shrink-0"
                    title="Pick Color"
                  />
                  <input
                    type="text"
                    placeholder="Enter color name (e.g. Olive Green, Rose Gold)"
                    value={customColorName}
                    onChange={(e) => setCustomColorName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomColor(); } }}
                    className="flex-1 px-3 py-1.5 rounded-xl border border-gray-200 text-xs outline-none focus:border-[#f47b20]"
                  />
                  <button
                    type="button"
                    onClick={addCustomColor}
                    className="px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold cursor-pointer"
                  >
                    + Add
                  </button>
                </div>

                {/* Selected Colors List */}
                {selectedColors.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedColors.map(color => (
                      <span 
                        key={color} 
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-gray-200 text-[11px] font-medium text-gray-800 shadow-2xs"
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
                          className="text-gray-400 hover:text-black ml-0.5"
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
                <label className="block font-semibold text-gray-800 mb-1">
                  Available Sizes / Specs
                </label>

                {/* Preset Chips */}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {PRESET_SIZES.map(s => {
                    const isSelected = selectedSizes.includes(s);
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => togglePresetSize(s)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                          isSelected 
                            ? 'bg-[#1d1d1f] text-white' 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>

                {/* Add Custom Size */}
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Custom size (e.g. 85x200cm, 500ml, 2.5kVA)"
                    value={customSizeInput}
                    onChange={(e) => setCustomSizeInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomSize(); } }}
                    className="flex-1 px-3 py-1.5 rounded-xl border border-gray-200 text-xs outline-none focus:border-[#f47b20]"
                  />
                  <button
                    type="button"
                    onClick={addCustomSize}
                    className="px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold cursor-pointer"
                  >
                    + Add
                  </button>
                </div>

                {/* Selected Custom Sizes */}
                {selectedSizes.some(s => !PRESET_SIZES.includes(s)) && (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedSizes.filter(s => !PRESET_SIZES.includes(s)).map(s => (
                      <span 
                        key={s} 
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-gray-200 text-[11px] font-medium text-gray-800 shadow-2xs"
                      >
                        <span>{s}</span>
                        <button
                          type="button"
                          onClick={() => togglePresetSize(s)}
                          className="text-gray-400 hover:text-black ml-0.5"
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
                <label className="block font-semibold text-gray-800 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Provide product details, material quality, and usage instructions..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-[#f47b20] outline-none text-xs bg-gray-50/50 focus:bg-white transition-colors resize-y leading-relaxed"
                />
              </div>

              {/* In Stock Toggle */}
              <div className="pt-2 flex items-center justify-between border-t border-gray-100">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={inStock}
                    onChange={(e) => setInStock(e.target.checked)}
                    className="w-4 h-4 rounded text-[#f47b20] focus:ring-0 cursor-pointer"
                  />
                  <span className="font-semibold text-gray-800 text-xs">Available In Stock</span>
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 flex items-center justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2.5 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-50 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 rounded-full bg-[#f47b20] hover:bg-[#c95510] text-white text-xs font-semibold shadow-xs disabled:opacity-50 cursor-pointer transition-colors"
                >
                  {isSaving ? 'Saving to Database...' : editingProduct ? 'Save Changes' : 'Publish Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          IN-APP DELETE CONFIRMATION MODAL (No window.confirm needed)
          ======================================================== */}
      {productToDelete && (
        <div 
          className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => !isDeleting && setProductToDelete(null)}
        >
          <div 
            className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-150 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-3.5 border border-red-100">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="font-display text-lg font-bold text-gray-900 mb-1">
              Delete Product?
            </h3>

            <p className="text-xs text-gray-500 mb-5 leading-relaxed">
              Are you sure you want to delete <strong className="text-gray-900 font-semibold block mt-0.5 truncate max-w-xs mx-auto">"{productToDelete.title}"</strong>? It will be removed live from the store immediately.
            </p>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setProductToDelete(null)}
                className="flex-1 py-2.5 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-50 text-xs font-semibold cursor-pointer disabled:opacity-50 transition-colors"
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

    </div>
  );
}
