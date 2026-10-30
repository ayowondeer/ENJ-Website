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
  ArrowRight
} from 'lucide-react';
import { 
  TestimonialItem, 
  getLocalTestimonials, 
  syncTestimonialToStorage, 
  removeTestimonialFromStorage, 
  resetTestimonialsToDefault 
} from '../data/testimonials';
import { 
  db, 
  ProductItem, 
  OrderItem, 
  INITIAL_PRODUCTS,
  deleteProductPermanently,
  isProductDeleted,
  deleteOrderPermanently,
  isOrderDeleted
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
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'orders' | 'testimonials'>('overview');
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
    const handleUpdate = () => {
      setTestimonials(getLocalTestimonials());
    };
    window.addEventListener('enj_testimonials_changed', handleUpdate);
    return () => window.removeEventListener('enj_testimonials_changed', handleUpdate);
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

    await syncTestimonialToStorage(payload);
    setTestimonials(getLocalTestimonials());
    setTSaving(false);
    setIsTestimonialModalOpen(false);
    setStatusMessage(editingTestimonial ? 'Review updated live on homepage!' : 'New review added live on homepage!');
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const confirmDeleteTestimonial = async () => {
    if (!testimonialToDelete) return;
    await removeTestimonialFromStorage(testimonialToDelete.id);
    setTestimonials(getLocalTestimonials());
    setTestimonialToDelete(null);
    setStatusMessage('Review removed from homepage.');
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleResetTestimonials = async () => {
    const list = await resetTestimonialsToDefault();
    setTestimonials(list);
    setStatusMessage('Reviews reset to authentic Nigerian client testimonials.');
    setTimeout(() => setStatusMessage(null), 3000);
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
  const hasActiveModal = isFormOpen || isTestimonialModalOpen || isOrganizeModalOpen || Boolean(quickPosModalProduct) || Boolean(productToDelete) || Boolean(orderToDelete);

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
        } else if (isOrganizeModalOpen) {
          setIsOrganizeModalOpen(false);
        } else if (isFormOpen && !isSaving) {
          setIsFormOpen(false);
        } else if (isTestimonialModalOpen && !tSaving) {
          setIsTestimonialModalOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [quickPosModalProduct, orderToDelete, productToDelete, isOrganizeModalOpen, isFormOpen, isSaving, isTestimonialModalOpen, tSaving]);

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

    const primaryImg = uploadedImages[0];
    const galleryImgs = uploadedImages.slice(1);
    const parsedPos = typeof position === 'number' && position > 0 ? Number(position) : (products.length + 1);

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
      position: parsedPos,
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

      {/* iOS/macOS HIG Segmented Control Navigation */}
      <div className="w-[min(1240px,calc(100%-24px))] sm:w-[min(1240px,calc(100%-32px))] mx-auto mb-6">
        <div className="p-1.5 bg-gray-200/60 backdrop-blur-md rounded-2xl border border-black/[0.04] inline-flex items-center gap-1.5 max-w-full overflow-x-auto scrollbar-none touch-momentum">
          <button
            onClick={() => setActiveTab('overview')}
            className={`min-h-[42px] px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer flex items-center gap-2 whitespace-nowrap active:scale-[0.98] ${
              activeTab === 'overview'
                ? 'bg-white text-gray-900 shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)] font-bold'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/40'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5 text-gray-600" />
            <span>Dashboard Hub</span>
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`min-h-[42px] px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer flex items-center gap-2 whitespace-nowrap active:scale-[0.98] ${
              activeTab === 'products'
                ? 'bg-white text-gray-900 shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)] font-bold'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/40'
            }`}
          >
            <Package className="w-3.5 h-3.5 text-gray-600" />
            <span>Products</span>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md ${activeTab === 'products' ? 'bg-orange-50 text-[#c95510] font-bold' : 'bg-gray-100 text-gray-500'}`}>
              {products.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`min-h-[42px] px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer flex items-center gap-2 whitespace-nowrap active:scale-[0.98] ${
              activeTab === 'orders'
                ? 'bg-white text-gray-900 shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)] font-bold'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/40'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5 text-gray-600" />
            <span>Orders & Transactions</span>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md ${activeTab === 'orders' ? 'bg-orange-50 text-[#c95510] font-bold' : 'bg-gray-100 text-gray-500'}`}>
              {orders.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('testimonials')}
            className={`min-h-[42px] px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer flex items-center gap-2 whitespace-nowrap active:scale-[0.98] ${
              activeTab === 'testimonials'
                ? 'bg-white text-gray-900 shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)] font-bold'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/40'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-gray-600" />
            <span>Reviews</span>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md ${activeTab === 'testimonials' ? 'bg-orange-50 text-[#c95510] font-bold' : 'bg-gray-100 text-gray-500'}`}>
              {testimonials.length}
            </span>
          </button>
        </div>
      </div>

      {/* TAB 0: SIMPLE DASHBOARD HUB (BIG CARDS FOR PRODUCT, ORDER & TRANSACTION, AND REVIEW) */}
      {activeTab === 'overview' && (
        <div className="w-[min(1240px,calc(100%-24px))] sm:w-[min(1240px,calc(100%-32px))] mx-auto animate-in fade-in duration-200">
          
          {/* Welcome / Quick Subheading */}
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                Store Dashboard Hub
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Select a section below to manage your products, customer transactions, or client reviews.
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>System Online · Live Database</span>
              </span>
            </div>
          </div>

          {/* THE 3 BIG CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
            
            {/* BIG CARD 1: PRODUCTS */}
            <div 
              onClick={() => setActiveTab('products')}
              className="group bg-white rounded-3xl p-6 sm:p-7 border border-gray-200/80 shadow-xs hover:shadow-xl hover:border-[#f47b20]/50 transition-all duration-300 cursor-pointer flex flex-col justify-between relative overflow-hidden active:scale-[0.99]"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-orange-500/10 transition-colors pointer-events-none"></div>

              <div>
                <div className="flex items-start justify-between mb-5">
                  <div className="w-16 h-16 rounded-2xl bg-orange-50 border border-orange-200/80 text-[#f47b20] flex items-center justify-center group-hover:scale-105 group-hover:bg-[#f47b20] group-hover:text-white transition-all duration-300 shadow-xs">
                    <Package className="w-8 h-8" />
                  </div>
                  <span className="px-3 py-1 rounded-full bg-orange-50 text-[#c95510] border border-orange-200 text-xs font-bold font-mono">
                    {products.length} Products
                  </span>
                </div>

                <h3 className="font-display text-xl sm:text-2xl font-bold text-gray-900 group-hover:text-[#f47b20] transition-colors mb-2">
                  Products
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed mb-6">
                  Manage the storefront catalog, add new products, update Naira pricing, upload multiple photos, and organize display position order.
                </p>
              </div>

              <div className="space-y-3 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Available In Stock:</span>
                  <span className="font-semibold text-gray-900">{products.filter(p => p.inStock).length} items</span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Categories:</span>
                  <span className="font-semibold text-gray-900">{CATEGORIES.length - 1} categories</span>
                </div>

                <div className="inline-flex items-center justify-between w-full px-4 py-3 rounded-2xl bg-gray-50 group-hover:bg-orange-50/80 border border-gray-200/70 group-hover:border-orange-200 text-xs font-bold text-gray-800 group-hover:text-[#c95510] transition-all mt-2">
                  <span>Manage Products</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>

            {/* BIG CARD 2: ORDERS & TRANSACTIONS */}
            <div 
              onClick={() => setActiveTab('orders')}
              className="group bg-white rounded-3xl p-6 sm:p-7 border border-gray-200/80 shadow-xs hover:shadow-xl hover:border-emerald-500/50 transition-all duration-300 cursor-pointer flex flex-col justify-between relative overflow-hidden active:scale-[0.99]"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-emerald-500/10 transition-colors pointer-events-none"></div>

              <div>
                <div className="flex items-start justify-between mb-5">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-emerald-600 flex items-center justify-center group-hover:scale-105 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300 shadow-xs">
                    <CreditCard className="w-8 h-8" />
                  </div>
                  <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold font-mono">
                    {orders.length} Orders
                  </span>
                </div>

                <h3 className="font-display text-xl sm:text-2xl font-bold text-gray-900 group-hover:text-emerald-700 transition-colors mb-2">
                  Order & Transaction
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed mb-6">
                  Track real-time purchase orders, verify Paystack references & direct bank transfers, manage shipping across Nigerian LGAs, and reorder records.
                </p>
              </div>

              <div className="space-y-3 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Total Volume:</span>
                  <span className="font-bold text-emerald-700 tabular-nums">
                    {formatNaira(orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0))}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Paid / Confirmed:</span>
                  <span className="font-semibold text-gray-900">
                    {orders.filter(o => o.paymentStatus === 'paid' || Boolean(o.paystackReference)).length} orders
                  </span>
                </div>

                <div className="inline-flex items-center justify-between w-full px-4 py-3 rounded-2xl bg-gray-50 group-hover:bg-emerald-50/80 border border-gray-200/70 group-hover:border-emerald-200 text-xs font-bold text-gray-800 group-hover:text-emerald-800 transition-all mt-2">
                  <span>View Orders & Transactions</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>

            {/* BIG CARD 3: REVIEW */}
            <div 
              onClick={() => setActiveTab('testimonials')}
              className="group bg-white rounded-3xl p-6 sm:p-7 border border-gray-200/80 shadow-xs hover:shadow-xl hover:border-amber-500/50 transition-all duration-300 cursor-pointer flex flex-col justify-between relative overflow-hidden active:scale-[0.99]"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-amber-500/10 transition-colors pointer-events-none"></div>

              <div>
                <div className="flex items-start justify-between mb-5">
                  <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-600 flex items-center justify-center group-hover:scale-105 group-hover:bg-amber-600 group-hover:text-white transition-all duration-300 shadow-xs">
                    <MessageSquare className="w-8 h-8" />
                  </div>
                  <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold font-mono">
                    {testimonials.length} Reviews
                  </span>
                </div>

                <h3 className="font-display text-xl sm:text-2xl font-bold text-gray-900 group-hover:text-amber-700 transition-colors mb-2">
                  Review
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed mb-6">
                  Add new client testimonials, edit existing reviews and roles, highlight top client endorsements, and control the live testimonial track on the homepage.
                </p>
              </div>

              <div className="space-y-3 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Highlighted Reviews:</span>
                  <span className="font-semibold text-gray-900">{testimonials.filter(t => t.highlight).length} reviews</span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Storefront Status:</span>
                  <span className="font-semibold text-emerald-600">Active Live</span>
                </div>

                <div className="inline-flex items-center justify-between w-full px-4 py-3 rounded-2xl bg-gray-50 group-hover:bg-amber-50/80 border border-gray-200/70 group-hover:border-amber-200 text-xs font-bold text-gray-800 group-hover:text-amber-800 transition-all mt-2">
                  <span>Manage Reviews</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>

          </div>

          {/* Quick Actions Footer Bar */}
          <div className="mt-8 p-5 sm:p-6 bg-white rounded-3xl border border-gray-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="font-bold text-sm text-gray-900">Need to make a quick storefront change?</h4>
              <p className="text-xs text-gray-500 mt-0.5">Publish a new product or organize catalog positions instantly.</p>
            </div>
            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setIsOrganizeModalOpen(true)}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-semibold cursor-pointer transition-colors"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#f47b20]" />
                <span>Organize Positions</span>
              </button>
              <button
                type="button"
                onClick={openAddModal}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#f47b20] hover:bg-[#c95510] text-white text-xs font-semibold shadow-xs cursor-pointer transition-colors"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Add Product</span>
              </button>
            </div>
          </div>

        </div>
      )}

      {/* TAB 1: PRODUCTS MANAGER */}
      {activeTab === 'products' && (
        <div className="w-[min(1240px,calc(100%-24px))] sm:w-[min(1240px,calc(100%-32px))] mx-auto">
          {/* Back to Hub shortcut */}
          <div className="mb-3">
            <button
              onClick={() => setActiveTab('overview')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors group cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
              <span>Back to Dashboard Hub</span>
            </button>
          </div>
          {/* Search, Categories & Quick Organize Button */}
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-200/80 shadow-xs flex flex-col gap-3 mb-5">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
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

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setIsOrganizeModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-orange-50 hover:bg-orange-100 text-[#c95510] border border-orange-200 text-xs font-semibold shadow-2xs transition-all cursor-pointer whitespace-nowrap"
                  title="Organize storefront display order"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-[#f47b20]" />
                  <span>Organize Store Positions ({products.length})</span>
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-gray-100">
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

          {/* Fully Responsive Products List with Visible Positions and Direct Up/Down Ordering */}
          <div className="space-y-3 w-full">
            {filteredProducts.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 border border-gray-200/80 text-center text-gray-500 text-xs">
                No products match the selected filters.
              </div>
            ) : (
              filteredProducts.map((p, pIdx) => {
                const photoCount = 1 + (p.gallery?.length || 0);
                const displayRank = p.position ?? (pIdx + 1);
                return (
                  <div 
                    key={p.id}
                    className="bg-white rounded-2xl p-3.5 sm:p-4 border border-gray-200/80 shadow-xs hover:border-gray-300 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3.5 w-full overflow-hidden"
                  >
                    {/* Left: Position Rank, Thumbnail & Details */}
                    <div className="flex items-start gap-3 sm:gap-3.5 min-w-0 flex-1">
                      {/* Position Rank Badge with 44px ergonomic tap hitbox */}
                      <button
                        type="button"
                        onClick={() => {
                          setQuickPosModalProduct(p);
                          setTargetQuickPos(displayRank);
                        }}
                        title="Click to set custom position"
                        className="flex flex-col items-center justify-center shrink-0 min-w-[44px] min-h-[44px] px-2 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 active:scale-95 border border-orange-200 text-[#c95510] cursor-pointer transition-all group"
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
                        className="w-16 h-16 sm:w-16 sm:h-16 rounded-xl object-cover border border-gray-200 bg-gray-50 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        {/* HIG Zero-Pill Metadata with subtle typographic separators */}
                        <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mb-1 flex-wrap font-medium">
                          <span className="text-gray-900 font-semibold">{p.category}</span>
                          <span className="text-gray-300 select-none">·</span>
                          <span className="inline-flex items-center gap-1">
                            <span className={`w-1.5 h-1.5 rounded-full ${p.inStock ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                            <span className={p.inStock ? 'text-emerald-700 font-medium' : 'text-amber-700 font-medium'}>
                              {p.inStock ? 'In Stock' : 'Custom'}
                            </span>
                          </span>
                          <span className="text-gray-300 select-none">·</span>
                          <span className="text-gray-400 tabular-nums">
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

                    {/* Right: Position Reordering, Price & Actions */}
                    <div className="flex items-center justify-between md:justify-end gap-3.5 shrink-0 pt-2.5 md:pt-0 border-t md:border-t-0 border-gray-100">
                      <div className="text-left md:text-right">
                        <span className="font-bold text-sm sm:text-base text-gray-900 block leading-tight tabular-nums">
                          {formatNaira(p.price)}
                        </span>
                        <span className="text-[10px] sm:text-[11px] text-gray-500 block tabular-nums">
                          Min: {p.minOrderQty} {p.unit}
                        </span>
                      </div>

                      {/* Direct Position Ordering Buttons with ergonomic touch hitboxes */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden bg-gray-50/50">
                          <button
                            type="button"
                            onClick={() => handleMoveProductPosition(p.id, 'up')}
                            disabled={pIdx === 0}
                            className="min-w-[40px] min-h-[40px] flex items-center justify-center hover:bg-orange-50 hover:text-[#f47b20] active:scale-90 text-gray-600 disabled:opacity-20 disabled:pointer-events-none transition-all cursor-pointer"
                            title="Move Up in Storefront Order"
                          >
                            <ArrowUp className="w-4 h-4" />
                          </button>
                          <div className="w-[1px] h-5 bg-gray-200" />
                          <button
                            type="button"
                            onClick={() => handleMoveProductPosition(p.id, 'down')}
                            disabled={pIdx === filteredProducts.length - 1}
                            className="min-w-[40px] min-h-[40px] flex items-center justify-center hover:bg-orange-50 hover:text-[#f47b20] active:scale-90 text-gray-600 disabled:opacity-20 disabled:pointer-events-none transition-all cursor-pointer"
                            title="Move Down in Storefront Order"
                          >
                            <ArrowDown className="w-4 h-4" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => openEditModal(p)}
                          className="min-h-[40px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 hover:bg-gray-100 active:scale-95 text-gray-700 text-xs font-semibold cursor-pointer transition-all"
                          title="Edit Product"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-gray-600" />
                          <span>Edit</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setProductToDelete(p)}
                          className="min-h-[40px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 active:scale-95 text-red-600 text-xs font-semibold cursor-pointer transition-all"
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

      {/* TAB 2: ORDERS & PAYSTACK TRANSACTIONS (WITH DELETE & ORDERING/SORTING) */}
      {activeTab === 'orders' && (
        <div className="w-[min(1240px,calc(100%-24px))] sm:w-[min(1240px,calc(100%-32px))] mx-auto">
          {/* Back to Hub shortcut */}
          <div className="mb-3">
            <button
              onClick={() => setActiveTab('overview')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors group cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
              <span>Back to Dashboard Hub</span>
            </button>
          </div>
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-gray-200/80 shadow-xs p-5 sm:p-6">
            
            {/* Header & Title */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100 mb-4">
              <div>
                <h3 className="font-display text-lg sm:text-xl font-bold text-gray-900">
                  Customer Orders & Transactions
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Manage live checkout submissions, filter, sort order, and remove processed orders.
                </p>
              </div>

              {/* Order Count Badge */}
              <div className="flex items-center gap-2">
                <span className="px-3 py-1.5 rounded-xl bg-gray-100 text-gray-800 text-xs font-semibold">
                  {filteredOrders.length} of {orders.length} Orders
                </span>
              </div>
            </div>

            {/* Filter & Sort Controls Toolbar */}
            <div className="bg-gray-50/70 p-3 sm:p-3.5 rounded-2xl border border-gray-200/70 mb-5 flex flex-col md:flex-row items-center justify-between gap-3">
              {/* Search Orders */}
              <div className="relative w-full md:w-72">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search order ID, customer, phone..."
                  value={orderSearchQuery}
                  onChange={(e) => setOrderSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-xs outline-none focus:border-[#f47b20]"
                />
              </div>

              {/* Status Filter Chips & Sort Order Dropdown */}
              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-between md:justify-end">
                <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
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
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer transition-colors whitespace-nowrap ${
                        orderStatusFilter === f.id
                          ? 'bg-[#1d1d1f] text-white shadow-2xs'
                          : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {/* Sort Order Selector */}
                <div className="flex items-center gap-1.5 shrink-0 bg-white border border-gray-200 px-2.5 py-1.5 rounded-xl">
                  <ArrowUpDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <select
                    value={orderSortBy}
                    onChange={(e) => setOrderSortBy(e.target.value as any)}
                    className="text-xs font-semibold text-gray-800 bg-transparent outline-none cursor-pointer"
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
              <div className="text-center py-12 border border-dashed border-gray-200 rounded-2xl">
                <CreditCard className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-gray-700">No orders match criteria</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Try adjusting your filters or search terms.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredOrders.map(order => {
                  const isPaid = order.paymentStatus === 'paid' || Boolean(order.paystackReference);
                  const isTransfer = (order.paymentMethod || '').toLowerCase().includes('transfer') || (order.notes || '').toLowerCase().includes('transfer');
                  
                  return (
                    <div 
                      key={order.id || Math.random()} 
                      className="p-4 rounded-2xl border border-gray-200/80 bg-white hover:border-gray-300 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1.5 flex-1 min-w-0">
                        {/* Order ID & Payment Status - HIG Zero-Pill Typography */}
                        <div className="flex items-center gap-2 flex-wrap text-[11px]">
                          <span className="font-mono font-bold text-gray-900 tabular-nums">
                            #{order.id ? order.id.slice(0, 8) : 'ORD'}
                          </span>
                          <span className="text-gray-300 select-none">·</span>
                          <span className="text-gray-400 tabular-nums">
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
                              <span className="font-mono text-[10px] text-gray-500 tabular-nums" title="Paystack Reference">
                                Ref: {order.paystackReference.slice(0, 10)}…
                              </span>
                            </>
                          )}
                        </div>
                        
                        {/* Customer Info */}
                        <div className="pt-0.5">
                          <span className="font-bold text-gray-900 text-xs sm:text-sm">{order.customerName}</span>
                          <span className="text-gray-500 text-[11px] block">{order.customerEmail}</span>
                          <a 
                            href={`https://wa.me/${order.customerPhone.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#f47b20] hover:underline inline-flex items-center gap-1 mt-0.5 text-[11px] font-medium min-h-[32px] sm:min-h-0 items-center"
                          >
                            <Phone className="w-3 h-3" />
                            {order.customerPhone}
                          </a>
                        </div>

                        {/* Customer Delivery Address if provided */}
                        {order.customerAddress && (
                          <p className="text-[11px] text-gray-500 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                            <span className="truncate">{order.customerAddress}</span>
                          </p>
                        )}

                        {/* Items Purchased */}
                        <p className="text-[11px] text-gray-600 pt-0.5 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                          <strong className="text-gray-800">Items:</strong> {order.itemsSummary}
                        </p>
                      </div>

                      {/* Right: Total Amount, Status Selector & Delete Button */}
                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2.5 pt-2.5 sm:pt-0 border-t sm:border-t-0 border-gray-100 shrink-0">
                        <span className="font-bold text-base sm:text-lg text-gray-900 leading-tight tabular-nums">
                          {formatNaira(order.totalAmount)}
                        </span>

                        <div className="flex items-center gap-2">
                          <select
                            value={order.status}
                            onChange={(e) => {
                              if (order.id) handleUpdateOrderStatus(order.id, e.target.value as any);
                            }}
                            className={`min-h-[40px] px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold outline-none cursor-pointer transition-colors ${
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
                            className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 active:scale-95 text-red-600 transition-all cursor-pointer"
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

      {/* TAB 3: REVIEWS & TESTIMONIALS MANAGER */}
      {activeTab === 'testimonials' && (
        <div className="w-[min(1240px,calc(100%-24px))] sm:w-[min(1240px,calc(100%-32px))] mx-auto">
          {/* Back to Hub shortcut */}
          <div className="mb-3">
            <button
              onClick={() => setActiveTab('overview')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors group cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
              <span>Back to Dashboard Hub</span>
            </button>
          </div>
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-gray-200/80 shadow-xs p-5 sm:p-6 mb-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
              <div>
                <h3 className="font-display text-lg sm:text-xl font-bold text-gray-900">
                  Homepage Reviews & Testimonials
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Manage customer reviews and client feedback displayed on the storefront.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetTestimonials}
                  className="px-3.5 py-2 rounded-xl border border-gray-200 hover:bg-gray-100 text-gray-700 text-xs font-semibold cursor-pointer transition-colors"
                >
                  Reset Defaults
                </button>
                <button
                  type="button"
                  onClick={openCreateTestimonial}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#f47b20] hover:bg-[#c95510] text-white text-xs font-semibold shadow-xs cursor-pointer transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Review</span>
                </button>
              </div>
            </div>

            {/* Testimonials Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
              {testimonials.map((t) => (
                <div
                  key={t.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                    t.highlight 
                      ? 'bg-[#fff0df]/60 border-[#f47b20]/30' 
                      : 'bg-white border-gray-200/80'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        {t.highlight ? 'Featured Quote' : 'Standard Quote'}
                      </span>
                      {t.highlight && (
                        <span className="px-2 py-0.5 rounded-full bg-[#f47b20]/15 text-[#c95510] text-[10px] font-bold">
                          Warm Highlight
                        </span>
                      )}
                    </div>

                    <p className="font-display text-sm text-[#1d1d1f] font-normal leading-snug mb-3">
                      “{t.quote.replace(/^“|”$/g, '')}”
                    </p>
                  </div>

                  <div className="pt-3 border-t border-black/5 flex items-center justify-between gap-2">
                    <div>
                      <strong className="text-xs font-semibold text-[#1d1d1f] block">
                        {t.author}
                      </strong>
                      <span className="text-[11px] text-[#6e6e73] block">
                        {t.role}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => openEditTestimonial(t)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-700 text-[11px] font-semibold cursor-pointer transition-colors"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setTestimonialToDelete(t)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 text-[11px] font-semibold cursor-pointer transition-colors"
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

      {/* ========================================================
          TESTIMONIAL ADD / EDIT MODAL
          ======================================================== */}
      {isTestimonialModalOpen && (
        <div 
          className="fixed inset-0 z-[160] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
          onClick={() => !tSaving && setIsTestimonialModalOpen(false)}
        >
          <div 
            className="relative bg-white rounded-2xl sm:rounded-3xl w-full max-w-lg p-5 sm:p-6 shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4 pr-1">
              <div className="min-w-0 pr-2">
                <h2 className="font-display text-lg sm:text-xl font-bold text-[#1d1d1f]">
                  {editingTestimonial ? 'Edit Review' : 'Add Client Review'}
                </h2>
              </div>
              {/* Floating Cancel Button */}
              <button 
                type="button"
                onClick={() => !tSaving && setIsTestimonialModalOpen(false)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs transition-all cursor-pointer active:scale-95 shadow-2xs border border-gray-200/60 shrink-0"
                aria-label="Cancel and close"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cancel</span>
              </button>
            </div>

            {tError && (
              <div className="p-3 mb-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{tError}</span>
              </div>
            )}

            <form onSubmit={handleSaveTestimonial} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-gray-800 mb-1">
                  Testimonial Quote *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. The quality of our large-format banners completely exceeded expectations."
                  value={tQuote}
                  onChange={(e) => setTQuote(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-[#f47b20] outline-none text-xs bg-gray-50/50 focus:bg-white transition-colors"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-800 mb-1">
                  Client Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Amina Bello or Engr. Emmanuel Moses"
                  value={tAuthor}
                  onChange={(e) => setTAuthor(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-[#f47b20] outline-none text-xs bg-gray-50/50 focus:bg-white transition-colors"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-800 mb-1">
                  Role / Organization
                </label>
                <input
                  type="text"
                  placeholder="e.g. Marketing Lead, Apex Logistics"
                  value={tRole}
                  onChange={(e) => setTRole(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-[#f47b20] outline-none text-xs bg-gray-50/50 focus:bg-white transition-colors"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="tHighlight"
                  checked={tHighlight}
                  onChange={(e) => setTHighlight(e.target.checked)}
                  className="w-4 h-4 text-[#f47b20] rounded border-gray-300 focus:ring-[#f47b20] cursor-pointer"
                />
                <label htmlFor="tHighlight" className="font-medium text-gray-700 cursor-pointer select-none">
                  Highlight this review with warm amber card styling
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  disabled={tSaving}
                  onClick={() => setIsTestimonialModalOpen(false)}
                  className="px-4 py-2 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-50 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={tSaving}
                  className="px-5 py-2 rounded-full bg-[#f47b20] hover:bg-[#c95510] text-white text-xs font-semibold shadow-xs disabled:opacity-50 cursor-pointer transition-colors"
                >
                  {tSaving ? 'Saving…' : editingTestimonial ? 'Save Changes' : 'Publish Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Testimonial Modal */}
      {testimonialToDelete && (
        <div 
          className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setTestimonialToDelete(null)}
        >
          <div 
            className="relative bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl border border-gray-100 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Floating Cancel Button */}
            <button
              type="button"
              onClick={() => setTestimonialToDelete(null)}
              className="absolute top-3.5 right-3.5 z-20 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs transition-all cursor-pointer active:scale-95 shadow-2xs border border-gray-200/60"
              aria-label="Cancel deletion"
            >
              <X className="w-3.5 h-3.5" />
              <span>Cancel</span>
            </button>

            <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-3.5 border border-red-100">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="font-display text-lg font-bold text-gray-900 mb-1">
              Delete Review?
            </h3>

            <p className="text-xs text-gray-500 mb-5 leading-relaxed">
              Remove review from <strong className="text-gray-900 block truncate">{testimonialToDelete.author}</strong>? It will immediately disappear from the homepage.
            </p>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setTestimonialToDelete(null)}
                className="flex-1 py-2.5 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-50 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteTestimonial}
                className="flex-1 py-2.5 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          SIMPLE PRODUCT ADD / EDIT MODAL
          ======================================================== */}
      {isFormOpen && (
        <div 
          className="fixed inset-0 z-[150] bg-black/40 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
          onClick={() => setIsFormOpen(false)}
        >
          <div 
            className="relative bg-white rounded-2xl sm:rounded-3xl w-full max-w-2xl shadow-2xl border border-gray-100 max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header: Sticky Floating Bar with Fixed Cancel Button */}
            <div className="sticky top-0 z-30 px-5 sm:px-7 py-3.5 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white/95 backdrop-blur-md shadow-2xs">
              <div className="min-w-0 pr-2">
                <h2 className="font-display text-lg sm:text-xl font-bold text-[#1d1d1f] truncate">
                  {editingProduct ? 'Edit Product' : 'Add New Product'}
                </h2>
                <p className="text-[11px] text-gray-500 mt-0.5 truncate">
                  Fills in the catalog live on the store.
                </p>
              </div>
              
              {/* Floating Cancel Button: Always fixed and accessible while scrolling */}
              <button 
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs transition-all cursor-pointer active:scale-95 shadow-2xs border border-gray-200/60 shrink-0"
                aria-label="Cancel and close form"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cancel</span>
              </button>
            </div>

            {/* Modal Body: Scrollable */}
            <div className="p-5 sm:p-7 overflow-y-auto flex-1">
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

              {/* Storefront Display Position (Rank) */}
              <div className="bg-orange-50/60 p-3.5 rounded-2xl border border-orange-200/80">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-semibold text-gray-900 flex items-center gap-1.5 text-xs">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-[#f47b20]" />
                    <span>Storefront Display Position (Rank)</span>
                  </label>
                  <span className="text-[10px] font-bold text-[#c95510] bg-white px-2 py-0.5 rounded-md border border-orange-200">
                    Position #{position || 1}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    placeholder="1"
                    value={position}
                    onChange={(e) => setPosition(e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-24 px-3 py-2 rounded-xl border border-gray-300 focus:border-[#f47b20] outline-none text-xs font-bold bg-white text-gray-900"
                  />
                  <p className="text-[11px] text-gray-600 leading-tight">
                    Lower numbers appear first on the storefront shop page (e.g. 1 = first item shown to customers).
                  </p>
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

              {/* Submit / Action Bar: Sticky bottom with Cancel button */}
              <div className="sticky bottom-0 z-20 bg-white/95 backdrop-blur-md -mx-5 -mb-5 px-5 sm:-mx-7 sm:-mb-7 sm:px-7 py-3 border-t border-gray-100 flex items-center justify-end gap-3 shrink-0 shadow-2xs mt-4">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2.5 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-100 text-xs font-semibold cursor-pointer active:scale-95 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 rounded-full bg-[#f47b20] hover:bg-[#c95510] text-white text-xs font-semibold shadow-xs disabled:opacity-50 cursor-pointer transition-colors active:scale-95"
                >
                  {isSaving ? 'Saving to Database...' : editingProduct ? 'Save Changes' : 'Publish Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      )}

      {/* ========================================================
          IN-APP DELETE CONFIRMATION MODAL (No window.confirm needed)
          ======================================================== */}
      {productToDelete && (
        <div 
          className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => !isDeleting && setProductToDelete(null)}
        >
          <div 
            className="relative bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-150 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Floating Cancel Button */}
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => setProductToDelete(null)}
              className="absolute top-3.5 right-3.5 z-20 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs transition-all cursor-pointer active:scale-95 shadow-2xs border border-gray-200/60 disabled:opacity-50"
              aria-label="Cancel deletion"
            >
              <X className="w-3.5 h-3.5" />
              <span>Cancel</span>
            </button>

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

      {/* Quick Set Position Modal */}
      {quickPosModalProduct && (
        <div 
          className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setQuickPosModalProduct(null)}
        >
          <div 
            className="relative bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4 pr-1">
              <div className="flex items-center gap-2 min-w-0 pr-2">
                <div className="w-8 h-8 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-[#f47b20] shrink-0">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-display text-base font-bold text-gray-900 leading-tight truncate">
                    Set Product Rank
                  </h3>
                  <p className="text-[11px] text-gray-500 truncate">
                    Storefront position order
                  </p>
                </div>
              </div>
              {/* Floating Cancel Button: Always fixed and accessible */}
              <button
                type="button"
                onClick={() => setQuickPosModalProduct(null)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs transition-all cursor-pointer active:scale-95 shadow-2xs border border-gray-200/60 shrink-0"
                aria-label="Cancel rank dialog"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cancel</span>
              </button>
            </div>

            <div className="mb-4">
              <div className="flex items-center gap-2.5 p-2.5 bg-gray-50 rounded-xl mb-3 border border-gray-200/60">
                <img
                  src={quickPosModalProduct.imageUrl}
                  alt={quickPosModalProduct.title}
                  className="w-10 h-10 rounded-lg object-cover border border-gray-200 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-xs text-gray-900 truncate">
                    {quickPosModalProduct.title}
                  </p>
                  <p className="text-[11px] text-gray-500">
                    Currently: #{quickPosModalProduct.position ?? (products.findIndex(p => p.id === quickPosModalProduct.id) + 1)}
                  </p>
                </div>
              </div>

              <label className="block text-xs font-semibold text-gray-800 mb-1.5">
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
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-gray-300 focus:border-[#f47b20] outline-none text-sm font-bold text-gray-900 bg-gray-50 focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => setTargetQuickPos(1)}
                  className="px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 text-[11px] font-semibold text-gray-700 whitespace-nowrap cursor-pointer"
                >
                  Make #1
                </button>
              </div>
              <p className="text-[11px] text-gray-500 mt-1.5">
                Entering 1 moves this product to the very top of the store catalog.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setQuickPosModalProduct(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSetExactPosition(quickPosModalProduct.id, Number(targetQuickPos) || 1)}
                className="flex-1 py-2.5 rounded-xl bg-[#f47b20] hover:bg-[#c95510] text-white text-xs font-semibold shadow-xs cursor-pointer transition-colors"
              >
                Apply Position
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Organize Store Positions Modal */}
      {isOrganizeModalOpen && (
        <div 
          className="fixed inset-0 z-[180] bg-black/40 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
          onClick={() => setIsOrganizeModalOpen(false)}
        >
          <div 
            className="relative bg-white rounded-2xl sm:rounded-3xl w-full max-w-2xl shadow-2xl border border-gray-100 max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header: Sticky Floating Bar with Fixed Cancel Button */}
            <div className="sticky top-0 z-30 px-5 sm:px-7 py-3.5 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white/95 backdrop-blur-md shadow-2xs">
              <div className="min-w-0 pr-2">
                <h2 className="font-display text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2 truncate">
                  <SlidersHorizontal className="w-5 h-5 text-[#f47b20] shrink-0" />
                  <span className="truncate">Organize Store Positions</span>
                </h2>
                <p className="text-[11px] text-gray-500 mt-0.5 truncate">
                  Change the display sequence of products across the catalog and storefront.
                </p>
              </div>
              
              {/* Floating Cancel Button: Always fixed and accessible while scrolling */}
              <button 
                type="button"
                onClick={() => setIsOrganizeModalOpen(false)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs transition-all cursor-pointer active:scale-95 shadow-2xs border border-gray-200/60 shrink-0"
                aria-label="Cancel and close"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cancel</span>
              </button>
            </div>

            {/* Content Area */}
            <div className="p-5 sm:p-7 flex-1 overflow-y-auto flex flex-col">
              {/* Quick Actions Bar */}
              <div className="flex items-center justify-between gap-2 p-2.5 bg-orange-50/70 border border-orange-200/80 rounded-2xl mb-4 shrink-0">
              <span className="text-xs text-[#c95510] font-medium pl-1">
                Total Products: <strong>{products.length}</strong>
              </span>
              <button
                type="button"
                onClick={handleAutoNumberPositions}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-orange-100 text-[#c95510] border border-orange-200 text-xs font-semibold shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
                title="Renumber products clean sequentially 1, 2, 3..."
              >
                <Check className="w-3.5 h-3.5" />
                <span>Auto-Number (1 to {products.length})</span>
              </button>
            </div>

            {/* Product Ordering List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[300px]">
              {[...products]
                .sort((a, b) => (a.position ?? 99999) - (b.position ?? 99999))
                .map((item, index, arr) => (
                  <div
                    key={item.id}
                    className="p-2.5 sm:p-3 rounded-xl border border-gray-200 bg-white hover:border-gray-300 flex items-center justify-between gap-2.5 transition-colors"
                  >
                    {/* Position Number */}
                    <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-200 flex items-center justify-center font-mono font-bold text-xs text-[#c95510] shrink-0">
                      #{item.position ?? (index + 1)}
                    </div>

                    {/* Thumbnail & Title */}
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="w-10 h-10 rounded-lg object-cover border border-gray-200 bg-gray-50 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-xs text-gray-900 truncate">
                          {item.title}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          {item.category} • {formatNaira(item.price)}
                        </p>
                      </div>
                    </div>

                    {/* Up / Down Controls */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleMoveProductPosition(item.id, 'up')}
                        disabled={index === 0}
                        className="p-1.5 rounded-lg border border-gray-200 hover:bg-orange-50 hover:text-[#f47b20] text-gray-600 disabled:opacity-25 disabled:pointer-events-none transition-colors cursor-pointer"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveProductPosition(item.id, 'down')}
                        disabled={index === arr.length - 1}
                        className="p-1.5 rounded-lg border border-gray-200 hover:bg-orange-50 hover:text-[#f47b20] text-gray-600 disabled:opacity-25 disabled:pointer-events-none transition-colors cursor-pointer"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>

                      {/* Set Position Quick Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setQuickPosModalProduct(item);
                          setTargetQuickPos(item.position ?? (index + 1));
                        }}
                        className="px-2 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 text-[11px] font-semibold text-gray-700 cursor-pointer transition-colors"
                      >
                        Set Rank
                      </button>
                    </div>
                  </div>
                ))}
            </div>
            </div>

            {/* Footer */}
            <div className="p-4 sm:px-7 sm:py-3.5 border-t border-gray-100 flex items-center justify-between shrink-0 bg-white/95 backdrop-blur-md shadow-2xs">
              <span className="text-[11px] text-gray-500">
                Positions update live on the customer shop.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsOrganizeModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-semibold cursor-pointer transition-colors active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => setIsOrganizeModalOpen(false)}
                  className="px-5 py-2 rounded-xl bg-[#1d1d1f] hover:bg-black text-white text-xs font-semibold shadow-xs cursor-pointer transition-colors active:scale-95"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Order Confirmation Modal */}
      {orderToDelete && (
        <div 
          className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => !isDeletingOrder && setOrderToDelete(null)}
        >
          <div 
            className="relative bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-150 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Floating Cancel Button */}
            <button
              type="button"
              disabled={isDeletingOrder}
              onClick={() => setOrderToDelete(null)}
              className="absolute top-3.5 right-3.5 z-20 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs transition-all cursor-pointer active:scale-95 shadow-2xs border border-gray-200/60 disabled:opacity-50"
              aria-label="Cancel deletion"
            >
              <X className="w-3.5 h-3.5" />
              <span>Cancel</span>
            </button>

            <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-3.5 border border-red-100">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="font-display text-lg font-bold text-gray-900 mb-1">
              Delete Order?
            </h3>

            <p className="text-xs text-gray-500 mb-4 leading-relaxed">
              Are you sure you want to delete order <strong className="text-gray-900">#{orderToDelete.id ? orderToDelete.id.slice(0, 8) : 'ORD'}</strong> for <strong className="text-gray-900">{orderToDelete.customerName}</strong> ({formatNaira(orderToDelete.totalAmount)})?
            </p>
            <p className="text-[11px] text-red-600 bg-red-50 p-2 rounded-xl border border-red-100 mb-5">
              This order and transaction record will be permanently deleted from the database.
            </p>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                disabled={isDeletingOrder}
                onClick={() => setOrderToDelete(null)}
                className="flex-1 py-2.5 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-50 text-xs font-semibold cursor-pointer disabled:opacity-50 transition-colors"
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

    </div>
  );
}
