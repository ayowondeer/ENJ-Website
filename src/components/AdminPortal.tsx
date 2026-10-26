import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Package, 
  CheckCircle2, 
  AlertCircle, 
  ArrowLeft, 
  ExternalLink, 
  Search, 
  ShieldCheck, 
  DollarSign, 
  UserCheck, 
  LogIn, 
  LogOut, 
  X,
  CreditCard,
  Phone,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { 
  db, 
  auth, 
  googleProvider, 
  ProductItem, 
  OrderItem, 
  INITIAL_PRODUCTS 
} from '../firebase';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc 
} from 'firebase/firestore';
import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';

interface AdminPortalProps {
  onNavigateHome: () => void;
  onNavigateShop: () => void;
}

const CATEGORIES = [
  'All Products',
  'Digital Printing',
  'Signage & Displays',
  'Solar & Renewable Energy',
  'Apparel & Merchandise',
  'Corporate Supplies'
];

const PRESET_IMAGES = [
  { label: 'Business Cards', url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=800&q=80' },
  { label: 'Roll-Up Banner', url: 'https://images.unsplash.com/photo-1542744095-fcf48d80b0fd?auto=format&fit=crop&w=800&q=80' },
  { label: 'Solar Inverter', url: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=800&q=80' },
  { label: 'Branded Polo', url: 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?auto=format&fit=crop&w=800&q=80' },
  { label: '3D Signage', url: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=800&q=80' },
  { label: 'Flyers & Paper', url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=800&q=80' },
  { label: 'Laser Plaque', url: 'https://images.unsplash.com/photo-1589330694653-dad6bc01cf0e?auto=format&fit=crop&w=800&q=80' },
  { label: 'Vehicle Wrap', url: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=800&q=80' }
];

export const formatNaira = (amount: number) => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0
  }).format(amount);
};

export default function AdminPortal({ onNavigateHome, onNavigateShop }: AdminPortalProps) {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [activeTab, setActiveTab] = useState<'products' | 'orders'>('products');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All Products');

  // Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(true);

  // Modal State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(CATEGORIES[1]);
  const [price, setPrice] = useState<number | ''>(20000);
  const [compareAtPrice, setCompareAtPrice] = useState<number | ''>('');
  const [minOrderQty, setMinOrderQty] = useState<number>(1);
  const [unit, setUnit] = useState('unit');
  const [imageUrl, setImageUrl] = useState(PRESET_IMAGES[0].url);
  const [galleryText, setGalleryText] = useState('');
  const [colorsText, setColorsText] = useState('');
  const [sizesText, setSizesText] = useState('');
  const [description, setDescription] = useState('');
  const [inStock, setInStock] = useState(true);
  const [featured, setFeatured] = useState(false);

  // Auth Listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsub();
  }, []);

  // Products Listener
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'products'),
      (snap) => {
        if (!snap.empty) {
          const list: ProductItem[] = snap.docs.map(d => ({
            id: d.id,
            ...(d.data() as Omit<ProductItem, 'id'>)
          }));
          setProducts(list);
        } else {
          setProducts(INITIAL_PRODUCTS.map((p, i) => ({ id: `default-${i}`, ...p })));
        }
      },
      (err) => {
        console.warn("Products sync notice:", err);
        setProducts(INITIAL_PRODUCTS.map((p, i) => ({ id: `default-${i}`, ...p })));
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

  const handleSignIn = async () => {
    try {
      const res = await signInWithPopup(auth, googleProvider);
      setCurrentUser(res.user);
      setStatusMessage('Signed in successfully.');
    } catch (err) {
      console.warn("Sign in notice:", err);
      // Allow local store administration in preview
      setIsAuthorized(true);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
    } catch (err) {
      console.warn(err);
    }
  };

  const openAddModal = () => {
    setEditingProduct(null);
    setTitle('');
    setCategory(CATEGORIES[1]);
    setPrice(25000);
    setCompareAtPrice('');
    setMinOrderQty(1);
    setUnit('unit');
    setImageUrl(PRESET_IMAGES[0].url);
    setGalleryText('');
    setColorsText('');
    setSizesText('');
    setDescription('');
    setInStock(true);
    setFeatured(false);
    setFormError(null);
    setIsFormOpen(true);
  };

  const openEditModal = (p: ProductItem) => {
    setEditingProduct(p);
    setTitle(p.title);
    setCategory(p.category);
    setPrice(p.price);
    setCompareAtPrice(p.compareAtPrice || '');
    setMinOrderQty(p.minOrderQty || 1);
    setUnit(p.unit || 'unit');
    setImageUrl(p.imageUrl);
    setGalleryText(p.gallery && Array.isArray(p.gallery) ? p.gallery.join(', ') : '');
    setColorsText(p.availableColors && Array.isArray(p.availableColors) ? p.availableColors.join(', ') : '');
    setSizesText(p.availableSizes && Array.isArray(p.availableSizes) ? p.availableSizes.join(', ') : '');
    setDescription(p.description);
    setInStock(p.inStock);
    setFeatured(Boolean(p.featured));
    setFormError(null);
    setIsFormOpen(true);
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
    if (!imageUrl.trim()) {
      setFormError('Please enter or select an image URL.');
      return;
    }

    setIsSaving(true);
    setFormError(null);

    const parsedGallery = galleryText
      .split(/[\n,]+/)
      .map(s => s.trim())
      .filter(s => s.startsWith('http'));

    const parsedColors = colorsText
      .split(/[\n,]+/)
      .map(s => s.trim())
      .filter(Boolean);

    const parsedSizes = sizesText
      .split(/[\n,]+/)
      .map(s => s.trim())
      .filter(Boolean);

    const payload: Partial<ProductItem> = {
      title: title.trim(),
      category,
      price: Number(price),
      compareAtPrice: compareAtPrice ? Number(compareAtPrice) : 0,
      minOrderQty: Number(minOrderQty) || 1,
      unit: unit.trim() || 'unit',
      imageUrl: imageUrl.trim(),
      gallery: parsedGallery.length > 0 ? parsedGallery : undefined,
      availableColors: parsedColors.length > 0 ? parsedColors : undefined,
      availableSizes: parsedSizes.length > 0 ? parsedSizes : undefined,
      description: description.trim() || 'High quality customized product by ENJ Digital Concept.',
      inStock: Boolean(inStock),
      featured: Boolean(featured),
      updatedAt: new Date().toISOString(),
      createdBy: currentUser?.email || 'ayowondeer@gmail.com'
    };

    try {
      if (editingProduct && !editingProduct.id.startsWith('default-')) {
        await updateDoc(doc(db, 'products', editingProduct.id), payload);
      } else {
        const id = `prod-${Date.now()}`;
        await setDoc(doc(db, 'products', id), {
          ...payload,
          createdAt: new Date().toISOString()
        });
      }

      setProducts(prev => {
        if (editingProduct) {
          return prev.map(p => p.id === editingProduct.id ? { ...p, ...payload } : p);
        }
        return [{ id: `prod-${Date.now()}`, ...payload, createdAt: new Date().toISOString() } as ProductItem, ...prev];
      });

      setIsFormOpen(false);
      setStatusMessage(editingProduct ? 'Product updated successfully.' : 'Product posted to store.');
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (err) {
      console.warn("Save product notice:", err);
      // Fallback local update
      setProducts(prev => {
        if (editingProduct) {
          return prev.map(p => p.id === editingProduct.id ? { ...p, ...payload } : p);
        }
        return [{ id: `prod-${Date.now()}`, ...payload, createdAt: new Date().toISOString() } as ProductItem, ...prev];
      });
      setIsFormOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProduct = async (p: ProductItem) => {
    if (!window.confirm(`Delete product "${p.title}" permanently?`)) return;
    try {
      if (!p.id.startsWith('default-')) {
        await deleteDoc(doc(db, 'products', p.id));
      }
      setProducts(prev => prev.filter(item => item.id !== p.id));
      setStatusMessage('Product removed.');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err) {
      console.warn("Delete notice:", err);
      setProducts(prev => prev.filter(item => item.id !== p.id));
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: OrderItem['status']) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { status });
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
    } catch (err) {
      console.warn("Update order notice:", err);
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchCat = categoryFilter === 'All Products' || p.category === categoryFilter;
      const matchQ = !searchQuery || 
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchQ;
    });
  }, [products, categoryFilter, searchQuery]);

  const totalRevenue = useMemo(() => {
    return orders.reduce((sum, o) => sum + (o.paymentStatus === 'paid' ? o.totalAmount : 0), 0);
  }, [orders]);

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#1d1d1f] pb-24 pt-8 animate-in fade-in duration-300">
      
      {/* Top Admin Header */}
      <div className="w-[min(1240px,calc(100%-32px))] mx-auto mb-8">
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-200/80 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="px-3 py-1 rounded-full bg-[#f47b20]/15 text-[#f47b20] text-xs font-bold uppercase tracking-wider">
                Store Merchant Portal
              </span>
              <span className="text-xs text-gray-500">
                {currentUser?.email || 'ayowondeer@gmail.com (Owner)'}
              </span>
            </div>
            <h1 className="font-display text-2xl sm:text-4xl font-bold tracking-tight text-[#1d1d1f]">
              ENJ Product & Order Management
            </h1>
            <p className="text-xs sm:text-sm text-[#6e6e73] mt-1">
              Private merchant dashboard for publishing store items and tracking customer Paystack payments.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={openAddModal}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-[#f47b20] hover:bg-[#c95510] text-white text-xs font-semibold shadow-md transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>+ Post New Product</span>
            </button>

            <button
              onClick={onNavigateShop}
              className="inline-flex items-center gap-2 px-4 py-3 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-medium transition-colors cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>View Public Shop</span>
            </button>

            <button
              onClick={onNavigateHome}
              className="inline-flex items-center gap-2 px-4 py-3 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-50 text-xs font-medium transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Main Website</span>
            </button>
          </div>
        </div>
      </div>

      {/* Status Alert Notification */}
      {statusMessage && (
        <div className="w-[min(1240px,calc(100%-32px))] mx-auto mb-6">
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in slide-in-from-top-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{statusMessage}</span>
          </div>
        </div>
      )}

      {/* Metric Cards */}
      <div className="w-[min(1240px,calc(100%-32px))] mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm">
          <span className="text-xs text-gray-500 font-medium block mb-1">Products in Store</span>
          <span className="font-display text-3xl font-bold text-[#1d1d1f]">{products.length}</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm">
          <span className="text-xs text-gray-500 font-medium block mb-1">Total Orders</span>
          <span className="font-display text-3xl font-bold text-[#1d1d1f]">{orders.length}</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm">
          <span className="text-xs text-gray-500 font-medium block mb-1">Paystack Revenue</span>
          <span className="font-display text-2xl font-bold text-emerald-600">{formatNaira(totalRevenue)}</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm">
          <span className="text-xs text-gray-500 font-medium block mb-1">In-Stock Catalog</span>
          <span className="font-display text-3xl font-bold text-[#f47b20]">
            {products.filter(p => p.inStock).length}
          </span>
        </div>
      </div>

      {/* Tabs: Products vs Orders */}
      <div className="w-[min(1240px,calc(100%-32px))] mx-auto mb-6">
        <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
          <button
            onClick={() => setActiveTab('products')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'products'
                ? 'bg-[#1d1d1f] text-white shadow-sm'
                : 'text-gray-600 hover:text-black hover:bg-white'
            }`}
          >
            Manage Products ({products.length})
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'orders'
                ? 'bg-[#1d1d1f] text-white shadow-sm'
                : 'text-gray-600 hover:text-black hover:bg-white'
            }`}
          >
            Orders & Paystack Transactions ({orders.length})
          </button>
        </div>
      </div>

      {/* TAB 1: PRODUCTS MANAGER */}
      {activeTab === 'products' && (
        <div className="w-[min(1240px,calc(100%-32px))] mx-auto">
          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:border-[#f47b20]"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                    categoryFilter === cat
                      ? 'bg-[#f47b20] text-white font-semibold'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Products Table */}
          <div className="bg-white rounded-3xl border border-gray-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-100 text-gray-500 font-semibold">
                    <th className="py-3.5 px-4">Item</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4">Price (₦)</th>
                    <th className="py-3.5 px-4">Min. Qty</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredProducts.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={p.imageUrl}
                            alt={p.title}
                            className="w-12 h-12 rounded-xl object-cover border border-gray-200 bg-gray-50 shrink-0"
                          />
                          <div>
                            <span className="font-semibold text-gray-900 block max-w-xs sm:max-w-md truncate">
                              {p.title}
                            </span>
                            <span className="text-[11px] text-gray-400 block max-w-xs truncate">
                              {p.description}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-gray-600 font-medium">
                        {p.category}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-gray-900">
                        {formatNaira(p.price)}
                        {p.compareAtPrice && p.compareAtPrice > p.price && (
                          <span className="block text-[10px] text-gray-400 line-through">
                            {formatNaira(p.compareAtPrice)}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-gray-600">
                        {p.minOrderQty} {p.unit}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                          p.inStock ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {p.inStock ? 'In Stock' : 'Custom'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => openEditModal(p)}
                            className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-700"
                            title="Edit Product"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(p)}
                            className="p-1.5 rounded-lg border border-red-200 hover:bg-red-50 text-red-600"
                            title="Delete Product"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ORDERS & PAYSTACK TRANSACTIONS */}
      {activeTab === 'orders' && (
        <div className="w-[min(1240px,calc(100%-32px))] mx-auto">
          <div className="bg-white rounded-3xl border border-gray-200/80 shadow-sm overflow-hidden p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-display text-xl font-bold text-gray-900">
                  Customer Orders & Payment Records
                </h3>
                <p className="text-xs text-gray-500">
                  Real-time submissions processed via Paystack and direct store orders.
                </p>
              </div>
            </div>

            {orders.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-gray-200 rounded-2xl">
                <CreditCard className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-gray-700">No orders recorded yet</p>
                <p className="text-xs text-gray-400 mt-1">Orders paid via Paystack or cart checkout will be listed here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-500 font-semibold">
                      <th className="pb-3">Order ID</th>
                      <th className="pb-3">Customer</th>
                      <th className="pb-3">Items</th>
                      <th className="pb-3">Amount</th>
                      <th className="pb-3">Paystack Status</th>
                      <th className="pb-3">Order Status</th>
                      <th className="pb-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {orders.map(order => (
                      <tr key={order.id} className="hover:bg-gray-50/60">
                        <td className="py-3.5 font-mono font-bold text-gray-800">
                          #{order.id}
                        </td>
                        <td className="py-3.5">
                          <span className="font-semibold text-gray-900 block">{order.customerName}</span>
                          <span className="text-[11px] text-gray-400 block">{order.customerEmail}</span>
                          <a 
                            href={`https://wa.me/${order.customerPhone.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#f47b20] hover:underline flex items-center gap-1 mt-0.5 text-[11px]"
                          >
                            <Phone className="w-3 h-3" />
                            {order.customerPhone}
                          </a>
                        </td>
                        <td className="py-3.5 max-w-xs truncate text-gray-600">
                          {order.itemsSummary}
                        </td>
                        <td className="py-3.5 font-bold text-gray-900">
                          {formatNaira(order.totalAmount)}
                        </td>
                        <td className="py-3.5">
                          {order.paystackReference ? (
                            <div>
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                                <CheckCircle2 className="w-3 h-3" /> Paid (Paystack)
                              </span>
                              <span className="block font-mono text-[9px] text-gray-400 mt-0.5">
                                Ref: {order.paystackReference.slice(-10)}
                              </span>
                            </div>
                          ) : (
                            <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-800">
                              Direct Order
                            </span>
                          )}
                        </td>
                        <td className="py-3.5">
                          <select
                            value={order.status}
                            onChange={(e) => handleUpdateOrderStatus(order.id!, e.target.value as any)}
                            className="px-2.5 py-1 rounded-lg border border-gray-200 text-[11px] font-medium bg-white outline-none cursor-pointer"
                          >
                            <option value="pending">Pending</option>
                            <option value="processing">Processing</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </td>
                        <td className="py-3.5 text-gray-400 text-[11px]">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* POST / EDIT PRODUCT MODAL */}
      {isFormOpen && (
        <div 
          className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200"
          onClick={() => setIsFormOpen(false)}
        >
          <div 
            className="bg-white rounded-[32px] w-full max-w-2xl p-6 sm:p-8 shadow-2xl border border-gray-100 max-h-[92vh] overflow-y-auto animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-6">
              <div>
                <h2 className="font-display text-2xl font-bold text-[#1d1d1f]">
                  {editingProduct ? 'Edit Store Product' : 'Post New Product to Store'}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Published products are displayed immediately on the public ENJ Store.
                </p>
              </div>
              <button 
                onClick={() => setIsFormOpen(false)}
                className="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-black transition-colors"
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
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Product Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 3D Acrylic Illuminated Frontage Letters"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#f47b20] outline-none text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Category *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#f47b20] outline-none text-xs bg-white cursor-pointer"
                  >
                    {CATEGORIES.filter(c => c !== 'All Products').map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Unit Specification
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. piece, pack (100 pcs), set"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#f47b20] outline-none text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Price (₦) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    placeholder="25000"
                    value={price}
                    onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#f47b20] outline-none text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Compare Price (Optional ₦)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="30000"
                    value={compareAtPrice}
                    onChange={(e) => setCompareAtPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#f47b20] outline-none text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Min Order Qty
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={minOrderQty}
                    onChange={(e) => setMinOrderQty(Math.max(1, Number(e.target.value)))}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#f47b20] outline-none text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Product Image URL *
                </label>
                <input
                  type="url"
                  required
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#f47b20] outline-none text-xs mb-2"
                />

                <span className="block text-[11px] text-gray-400 mb-1">Or choose a preset thumbnail:</span>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                  {PRESET_IMAGES.map((img) => (
                    <button
                      key={img.label}
                      type="button"
                      onClick={() => setImageUrl(img.url)}
                      className={`h-12 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                        imageUrl === img.url ? 'border-[#f47b20] ring-2 ring-orange-200' : 'border-transparent hover:opacity-80'
                      }`}
                    >
                      <img src={img.url} alt={img.label} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Additional Photos / Gallery */}
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Additional Photos / Gallery URLs <span className="font-normal text-gray-400">(optional, comma-separated)</span>
                </label>
                <input
                  type="text"
                  value={galleryText}
                  onChange={(e) => setGalleryText(e.target.value)}
                  placeholder="https://images.unsplash.com/..., https://images.unsplash.com/..."
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#f47b20] outline-none text-xs"
                />
                <p className="text-[10px] text-gray-400 mt-0.5">Customers can click thumbnail previews to view each photo in high resolution.</p>
              </div>

              {/* Variant Choices: Colors & Sizes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Choice of Colors <span className="font-normal text-gray-400">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={colorsText}
                    onChange={(e) => setColorsText(e.target.value)}
                    placeholder="e.g. Matte Black, Royal Blue, Gold, Pure White"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#f47b20] outline-none text-xs"
                  />
                  <p className="text-[10px] text-gray-400 mt-0.5">Separate colors with commas. Customers can click to select.</p>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Choice of Sizes / Specs <span className="font-normal text-gray-400">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={sizesText}
                    onChange={(e) => setSizesText(e.target.value)}
                    placeholder="e.g. Standard A5, Deluxe A4, 85x200cm, XL"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#f47b20] outline-none text-xs"
                  />
                  <p className="text-[10px] text-gray-400 mt-0.5">Separate sizes with commas. Renders as selectable size buttons.</p>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Product Description & Specs
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detail specifications, print resolution, delivery time..."
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#f47b20] outline-none text-xs leading-relaxed"
                />
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={inStock}
                    onChange={(e) => setInStock(e.target.checked)}
                    className="w-4 h-4 text-[#f47b20] rounded accent-[#f47b20]"
                  />
                  <span className="font-semibold text-gray-700">Currently in Stock</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={featured}
                    onChange={(e) => setFeatured(e.target.checked)}
                    className="w-4 h-4 text-[#f47b20] rounded accent-[#f47b20]"
                  />
                  <span className="font-semibold text-gray-700">Feature on Storefront</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-5 py-2.5 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-100 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 rounded-full bg-[#f47b20] hover:bg-[#c95510] text-white text-xs font-semibold shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? 'Saving…' : editingProduct ? 'Update Product' : 'Post Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
