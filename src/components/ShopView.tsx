import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  ShoppingCart, 
  ArrowLeft, 
  Sparkles, 
  Plus, 
  Minus,
  Check, 
  X,
  CreditCard,
  ShieldCheck,
  Package,
  Phone,
  Eye,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';
import { 
  db, 
  ProductItem, 
  CartItem, 
  INITIAL_PRODUCTS,
  isProductDeleted
} from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';

interface ShopViewProps {
  cart: CartItem[];
  addToCart: (product: ProductItem, qty?: number, color?: string, size?: string) => void;
  openCart: () => void;
  onNavigateHome: () => void;
  onNavigateAdmin?: () => void;
}

const CATEGORIES = [
  'All',
  'Marketing & Business Materials',
  'Office supplies',
  'Electronics & Gadgets',
  'Solar & Renewable',
  'Fashion & Apparel',
  'New Arrival',
  'Deals'
];

export const formatNaira = (amount: number) => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0
  }).format(amount);
};

// Maps color names to rich circles (no text labels on buttons)
export const getColorStyle = (name: string): { background: string; isLight: boolean; border?: string } => {
  const lower = name.toLowerCase();
  if (lower.includes('black') || lower.includes('obsidian') || lower.includes('dark')) {
    return { background: '#18181b', isLight: false };
  }
  if (lower.includes('white') || lower.includes('polar') || lower.includes('ivory')) {
    return { background: '#ffffff', isLight: true, border: '#e5e7eb' };
  }
  if (lower.includes('navy') || lower.includes('deep blue')) {
    return { background: '#1e3a8a', isLight: false };
  }
  if (lower.includes('royal blue') || lower.includes('blue') || lower.includes('cyan')) {
    return { background: '#2563eb', isLight: false };
  }
  if (lower.includes('gold') || lower.includes('yellow') || lower.includes('amber')) {
    return { background: 'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)', isLight: false };
  }
  if (lower.includes('green') || lower.includes('emerald')) {
    return { background: '#059669', isLight: false };
  }
  if (lower.includes('orange')) {
    return { background: '#f47b20', isLight: false };
  }
  if (lower.includes('red') || lower.includes('crimson')) {
    return { background: '#dc2626', isLight: false };
  }
  if (lower.includes('wood') || lower.includes('mahogany') || lower.includes('brown')) {
    return { background: '#78350f', isLight: false };
  }
  if (lower.includes('warm') || lower.includes('3000k')) {
    return { background: '#fef08a', isLight: true, border: '#fde047' };
  }
  if (lower.includes('cool') || lower.includes('6500k')) {
    return { background: '#e0f2fe', isLight: true, border: '#7dd3fc' };
  }
  return { background: '#4b5563', isLight: false };
};

// Formats size for clean display: X, XL, 2XL, L, M, and clean numbers/specs
export const formatSizeLabel = (rawSize: string): string => {
  const trimmed = rawSize.trim();
  const lower = trimmed.toLowerCase();
  if (lower === 'small' || lower === 's') return 'S';
  if (lower === 'medium' || lower === 'm') return 'M';
  if (lower === 'large' || lower === 'l') return 'L';
  if (lower === 'extra large' || lower === 'xl') return 'XL';
  if (lower === '2x large' || lower === 'xxl' || lower === '2xl') return '2XL';
  if (lower === '3x large' || lower === 'xxxl' || lower === '3xl') return '3XL';
  if (lower === 'extra small' || lower === 'xs') return 'XS';

  // Simplify descriptions with parentheses
  if (trimmed.includes('(')) {
    const main = trimmed.split('(')[0].trim();
    const inside = trimmed.match(/\((.*?)\)/)?.[1] || '';
    if (main.toLowerCase().startsWith('standard') || main.toLowerCase().startsWith('large')) {
      return inside.replace(/\s*x\s*/gi, '×');
    }
    return main.replace(/\s*x\s*/gi, '×');
  }
  return trimmed.replace(/\s*x\s*/gi, '×');
};

export default function ShopView({ cart, addToCart, openCart, onNavigateHome, onNavigateAdmin }: ShopViewProps) {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [addedProductId, setAddedProductId] = useState<string | null>(null);

  // Product Detail Modal State
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);
  const [activeImage, setActiveImage] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [modalQuantity, setModalQuantity] = useState<number>(1);
  const [isAddedInModal, setIsAddedInModal] = useState<boolean>(false);

  const totalCartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  // Real-time Firestore Products Listener
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'products'),
      (snapshot) => {
        if (!snapshot.empty) {
          const loaded: ProductItem[] = snapshot.docs
            .map((d) => ({
              id: d.id,
              ...(d.data() as Omit<ProductItem, 'id'>)
            }))
            .filter((p) => !(p as any).isDeleted && !(p as any).deleted && !isProductDeleted(p.id, p.title));
          setProducts(loaded);
        } else {
          if (localStorage.getItem('enj_catalog_initialized_v1') === 'true') {
            setProducts([]);
          } else {
            setProducts(
              INITIAL_PRODUCTS
                .map((p, idx) => ({ id: `prod-seed-${idx + 1}`, ...p }))
                .filter((p) => !isProductDeleted(p.id, p.title))
            );
          }
        }
      },
      (error) => {
        console.warn('Firestore products notice:', error);
        if (localStorage.getItem('enj_catalog_initialized_v1') === 'true') {
          setProducts([]);
        } else {
          setProducts(
            INITIAL_PRODUCTS
              .map((p, idx) => ({ id: `prod-seed-${idx + 1}`, ...p }))
              .filter((p) => !isProductDeleted(p.id, p.title))
          );
        }
      }
    );

    return () => unsub();
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      let matchCat = false;
      if (selectedCategory === 'All') {
        matchCat = true;
      } else if (selectedCategory === 'Marketing & Business Materials') {
        matchCat = p.category === 'Marketing & Business Materials' ||
          p.category === 'Digital Printing' ||
          p.category === 'Signage & Displays' ||
          p.category?.toLowerCase().includes('marketing') ||
          p.category?.toLowerCase().includes('print');
      } else if (selectedCategory === 'Office supplies') {
        matchCat = p.category === 'Office supplies' ||
          p.category === 'Office Supplies' ||
          p.category === 'Corporate Supplies' ||
          p.category?.toLowerCase().includes('office');
      } else if (selectedCategory === 'Electronics & Gadgets') {
        matchCat = p.category === 'Electronics & Gadgets' ||
          p.category?.toLowerCase().includes('gadget') ||
          p.category?.toLowerCase().includes('electronic');
      } else if (selectedCategory === 'Solar & Renewable') {
        matchCat = p.category === 'Solar & Renewable' ||
          p.category === 'Solar & Renewable Energy' ||
          p.category?.toLowerCase().includes('solar') ||
          p.category?.toLowerCase().includes('renewable') ||
          p.category?.toLowerCase().includes('inverter');
      } else if (selectedCategory === 'Fashion & Apparel') {
        matchCat = p.category === 'Fashion & Apparel' ||
          p.category === 'Apparel & Merchandise' ||
          p.category?.toLowerCase().includes('apparel') ||
          p.category?.toLowerCase().includes('fashion');
      } else if (selectedCategory === 'New Arrival') {
        matchCat = p.category === 'New Arrival' ||
          p.category === 'New Arrivals' ||
          p.featured === true;
      } else if (selectedCategory === 'Deals') {
        matchCat = p.category === 'Deals' ||
          p.category === 'deals' ||
          Boolean(p.compareAtPrice && p.compareAtPrice > p.price);
      } else {
        matchCat = p.category?.toLowerCase() === selectedCategory.toLowerCase();
      }

      const matchQuery = searchQuery === '' || 
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        p.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchQuery;
    });
  }, [products, selectedCategory, searchQuery]);

  // Open detail modal when clicking a product
  const handleOpenProductDetail = (product: ProductItem) => {
    setSelectedProduct(product);
    setActiveImage(product.imageUrl);
    setSelectedColor(product.availableColors && product.availableColors.length > 0 ? product.availableColors[0] : '');
    setSelectedSize(product.availableSizes && product.availableSizes.length > 0 ? product.availableSizes[0] : '');
    setModalQuantity(product.minOrderQty || 1);
    setIsAddedInModal(false);
  };

  // Quick Add from Grid
  const handleQuickAdd = (product: ProductItem, e: React.MouseEvent) => {
    e.stopPropagation();
    // If product has multiple sizes or colors, open modal so user can choose option
    if ((product.availableColors && product.availableColors.length > 0) || (product.availableSizes && product.availableSizes.length > 0)) {
      handleOpenProductDetail(product);
      return;
    }

    addToCart(product, product.minOrderQty || 1);
    setAddedProductId(product.id);
    setTimeout(() => setAddedProductId(null), 1400);
  };

  // Add from Modal with selected color and size (do not pop cart drawer, only update cart count)
  const handleModalAddToCart = () => {
    if (!selectedProduct) return;
    addToCart(selectedProduct, modalQuantity, selectedColor || undefined, selectedSize || undefined);
    setIsAddedInModal(true);
    setTimeout(() => {
      setIsAddedInModal(false);
      setSelectedProduct(null);
    }, 600);
  };

  // Build gallery image list (combining main imageUrl and gallery array)
  const productImages = useMemo(() => {
    if (!selectedProduct) return [];
    const list = [selectedProduct.imageUrl];
    if (selectedProduct.gallery && Array.isArray(selectedProduct.gallery)) {
      selectedProduct.gallery.forEach(img => {
        if (img && !list.includes(img)) list.push(img);
      });
    }
    return list;
  }, [selectedProduct]);

  return (
    <div className="min-h-screen bg-[#fafafa] text-[#1d1d1f] flex flex-col pb-20 animate-in fade-in duration-200">
      
      {/* Floating Shop Navigation Header matching the website navbar */}
      <header className="fixed top-3 sm:top-5 left-1/2 -translate-x-1/2 z-50 w-[min(780px,calc(100%-32px))] pointer-events-auto">
        <nav className="glass-pill rounded-full px-2.5 sm:px-4 py-1.5 flex items-center justify-between gap-2 sm:gap-4 shadow-[0_16px_36px_-6px_rgba(0,0,0,0.14),0_3px_12px_rgba(0,0,0,0.06)] border border-white/85">
          {/* 1. Main Website */}
          <button
            onClick={onNavigateHome}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-black/5 text-[#1d1d1f] hover:text-[#f47b20] text-xs font-semibold transition-colors cursor-pointer shrink-0"
            title="Return to Main Website"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="text-[11px] sm:text-xs">Main Website</span>
          </button>

          {/* 2. Search Panel */}
          <div className="relative flex-1 max-w-xs sm:max-w-sm">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search products…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-7 py-1 text-xs bg-black/5 hover:bg-black/8 focus:bg-white border border-transparent focus:border-gray-200 rounded-full outline-none transition-all placeholder:text-gray-400 text-[#1d1d1f]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black p-0.5 cursor-pointer"
                title="Clear search"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* 3. Cart Icon */}
          <button
            onClick={openCart}
            className="relative p-2 rounded-full bg-[#1d1d1f] hover:bg-[#3a3a3c] text-white transition-all shadow-xs cursor-pointer shrink-0 flex items-center justify-center hover:scale-105 active:scale-95"
            aria-label="View shopping cart"
            title="View shopping cart"
          >
            <ShoppingCart className="w-3.5 h-3.5 text-white" />
            {totalCartCount > 0 && (
              <span className="absolute -top-1 -right-1 px-1.2 py-0.2 min-w-4 h-4 rounded-full bg-[#f47b20] text-white text-[9px] font-bold flex items-center justify-center shadow-xs">
                {totalCartCount}
              </span>
            )}
          </button>
        </nav>
      </header>

      {/* Clean Category Filter Pills (direct access without unnecessary banner) */}
      <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 pt-18 sm:pt-20 pb-3">
        <div className="flex items-center justify-between gap-3 overflow-x-auto pb-1 scrollbar-none">
          <div className="flex items-center gap-1.5 shrink-0">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-[#1d1d1f] text-white font-semibold shadow-xs'
                    : 'bg-white hover:bg-gray-100 text-gray-600 border border-gray-200/90'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <span className="text-[11px] text-gray-400 hidden md:inline shrink-0">
            {filteredProducts.length} {filteredProducts.length === 1 ? 'item' : 'items'}
          </span>
        </div>
      </div>

      {/* Simple, Streamlined Product Grid */}
      <div className="max-w-5xl mx-auto w-full px-4 sm:px-6">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-200 my-4">
            <Package className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-xs font-semibold text-gray-700">No products found</p>
            <button
              onClick={() => { setSelectedCategory('All'); setSearchQuery(''); }}
              className="mt-2 px-3 py-1 rounded-full bg-gray-100 text-xs font-medium text-gray-800 hover:bg-gray-200 cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
            {filteredProducts.map((product) => {
              const isAdded = addedProductId === product.id;

              return (
                <div
                  key={product.id}
                  onClick={() => handleOpenProductDetail(product)}
                  className="group bg-white rounded-2xl border border-gray-200/80 overflow-hidden shadow-xs hover:shadow-lg transition-all duration-200 flex flex-col justify-between cursor-pointer hover:border-gray-300"
                >
                  {/* Image */}
                  <div className="relative aspect-4/3 bg-gray-50 overflow-hidden">
                    <img
                      src={product.imageUrl}
                      alt={product.title}
                      className="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-105"
                      loading="lazy"
                    />
                    {product.compareAtPrice && product.compareAtPrice > product.price && (
                      <span className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-[#f47b20] text-white text-[9px] font-bold shadow-xs">
                        Deal
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-3.5 flex-1 flex flex-col justify-between">
                    <div>
                      <p className="text-[10px] text-gray-400 mb-0.5 uppercase tracking-wider font-semibold">
                        {product.category}
                      </p>
                      <h3 className="font-semibold text-xs sm:text-[13px] text-[#1d1d1f] line-clamp-2 leading-snug mb-1">
                        {product.title}
                      </h3>
                    </div>

                    <div className="pt-2 flex items-center justify-between gap-2 mt-auto border-t border-gray-100">
                      <div>
                        <span className="font-display text-xs sm:text-sm font-bold text-[#1d1d1f] block tabular-nums leading-tight">
                          {formatNaira(product.price)}
                        </span>
                        <span className="text-[10px] text-gray-400 block">
                          Min: {product.minOrderQty || 1} {product.unit}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => handleQuickAdd(product, e)}
                        className={`w-8 h-8 rounded-xl text-xs font-semibold transition-all flex items-center justify-center cursor-pointer shrink-0 ${
                          isAdded
                            ? 'bg-emerald-600 text-white scale-105'
                            : 'bg-gray-100 hover:bg-[#f47b20] hover:text-white text-gray-700 active:scale-95'
                        }`}
                        title="Add to Cart"
                        aria-label={`Add ${product.title} to cart`}
                      >
                        {isAdded ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Plus className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Shop Footer */}
      <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 mt-12 pt-6 border-t border-gray-200/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
        <span className="text-[11px] text-gray-400">ENJ Digital Concept Store • Instant Orders & Delivery</span>
        <span className="text-[11px] text-gray-400">Maiduguri, Borno State</span>
      </div>

      {/* ========================================================
          DETAILED PRODUCT MODAL: MULTIPLE PICTURES, SPECS, COLORS & SIZES
         ======================================================== */}
      {selectedProduct && (
        <div 
          className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
          onClick={() => setSelectedProduct(null)}
        >
          <div 
            className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="font-semibold text-[#f47b20] uppercase tracking-wider text-[11px]">
                  {selectedProduct.category}
                </span>
                <span aria-hidden="true" className="text-gray-300">·</span>
                <span>{selectedProduct.inStock ? 'Ready Stock' : 'Custom Production'}</span>
              </div>
              <button 
                onClick={() => setSelectedProduct(null)}
                className="p-1.5 rounded-full text-gray-400 hover:text-black hover:bg-gray-100 transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body: Scrollable */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
                
                {/* Left: Images & Gallery switcher */}
                <div className="space-y-3">
                  <div className="relative h-60 sm:h-68 rounded-2xl overflow-hidden bg-gray-50 border border-gray-200">
                    <img 
                      src={activeImage || selectedProduct.imageUrl} 
                      alt={selectedProduct.title}
                      className="w-full h-full object-cover transition-all duration-300"
                    />
                    {selectedProduct.compareAtPrice && selectedProduct.compareAtPrice > selectedProduct.price && (
                      <span className="absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-md bg-[#f47b20] text-white text-[10px] font-bold shadow-xs">
                        Special Price
                      </span>
                    )}
                  </div>

                  {/* Multiple Pictures Thumbnails */}
                  {productImages.length > 1 && (
                    <div>
                      <span className="block text-[10px] font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
                        Product Gallery ({productImages.length}):
                      </span>
                      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                        {productImages.map((img, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setActiveImage(img)}
                            className={`w-14 h-14 rounded-xl overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${
                              activeImage === img 
                                ? 'border-[#f47b20] ring-2 ring-orange-200 scale-102' 
                                : 'border-gray-200 opacity-70 hover:opacity-100'
                            }`}
                          >
                            <img src={img} alt={`View ${idx + 1}`} className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right: Product Details, Options, & Actions */}
                <div className="flex flex-col justify-between space-y-4">
                  <div className="space-y-3.5">
                    
                    {/* 1. Title & Price */}
                    <div>
                      <h2 className="font-display text-lg sm:text-xl font-bold text-[#1d1d1f] leading-snug">
                        {selectedProduct.title}
                      </h2>
                      
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="font-display text-2xl font-bold text-[#1d1d1f] tabular-nums">
                          {formatNaira(selectedProduct.price)}
                        </span>
                        <span className="text-xs text-gray-500 font-medium">
                          / {selectedProduct.unit}
                        </span>
                        {selectedProduct.compareAtPrice && selectedProduct.compareAtPrice > selectedProduct.price && (
                          <span className="text-xs font-semibold text-emerald-700 ml-1">
                            (Save {formatNaira(selectedProduct.compareAtPrice - selectedProduct.price)})
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 2. Simple & Understandable Description Box */}
                    <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100/90 text-xs text-gray-700 space-y-2.5">
                      <p className="leading-relaxed text-gray-600">
                        {selectedProduct.description}
                      </p>
                      
                      {/* Simple Key Details Grid */}
                      <div className="pt-2 border-t border-gray-200/60 grid grid-cols-2 gap-2 text-[11px]">
                        <div className="flex items-center gap-1.5 text-gray-600">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>Quality Guaranteed</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-600">
                          <Package className="w-3.5 h-3.5 text-[#f47b20] shrink-0" />
                          <span>Min: {selectedProduct.minOrderQty} {selectedProduct.unit}</span>
                        </div>
                      </div>
                    </div>

                    {/* 3. Choice of Color (Circle Color Indicators - No Text on buttons) */}
                    {selectedProduct.availableColors && selectedProduct.availableColors.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-gray-700">Color:</span>
                          <span className="font-bold text-[#1d1d1f] text-[11px]">{selectedColor}</span>
                        </div>
                        <div className="flex items-center gap-2.5 flex-wrap pt-0.5">
                          {selectedProduct.availableColors.map((color) => {
                            const isSelected = selectedColor === color;
                            const style = getColorStyle(color);
                            return (
                              <button
                                key={color}
                                type="button"
                                onClick={() => setSelectedColor(color)}
                                title={color}
                                className={`w-7 h-7 rounded-full transition-all cursor-pointer relative flex items-center justify-center ${
                                  isSelected 
                                    ? 'ring-2 ring-offset-2 ring-[#1d1d1f] scale-110 shadow-sm' 
                                    : 'hover:scale-105 opacity-85 hover:opacity-100 shadow-2xs'
                                }`}
                                style={{
                                  background: style.background,
                                  border: style.border ? `1px solid ${style.border}` : '1px solid rgba(0,0,0,0.12)'
                                }}
                                aria-label={color}
                              >
                                {isSelected && (
                                  <Check className={`w-3.5 h-3.5 ${style.isLight ? 'text-black' : 'text-white'}`} strokeWidth={3} />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* 4. Choice of Size / Specification (Normal X, XL, 2XL, L, M, and numbers for others) */}
                    {selectedProduct.availableSizes && selectedProduct.availableSizes.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-gray-700">Size / Spec:</span>
                          <span className="font-bold text-[#1d1d1f] text-[11px]">{selectedSize}</span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {selectedProduct.availableSizes.map((size) => {
                            const isSelected = selectedSize === size;
                            const label = formatSizeLabel(size);
                            const isAlphaSize = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'].includes(label);
                            return (
                              <button
                                key={size}
                                type="button"
                                onClick={() => setSelectedSize(size)}
                                className={`transition-all cursor-pointer font-bold rounded-lg text-xs flex items-center justify-center ${
                                  isAlphaSize 
                                    ? 'w-9 h-9 border' 
                                    : 'px-3 py-1.5 border font-semibold'
                                } ${
                                  isSelected
                                    ? 'bg-[#1d1d1f] text-white border-[#1d1d1f] shadow-xs scale-102'
                                    : 'bg-white hover:bg-gray-100 text-gray-700 border-gray-200'
                                }`}
                                title={size}
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* 5. Quantity Stepper */}
                    <div className="flex items-center justify-between text-xs p-3 rounded-xl bg-gray-50 border border-gray-100">
                      <div>
                        <span className="font-semibold text-gray-800 block">Quantity</span>
                        <span className="text-[10px] text-gray-400">Order amount in {selectedProduct.unit}</span>
                      </div>
                      <div className="flex items-center border border-gray-200 rounded-lg bg-white shadow-2xs">
                        <button
                          type="button"
                          onClick={() => setModalQuantity(q => Math.max(selectedProduct.minOrderQty || 1, q - 1))}
                          className="px-2.5 py-1.5 text-gray-600 hover:text-black cursor-pointer"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-3 text-xs font-bold text-gray-900">
                          {modalQuantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => setModalQuantity(q => q + 1)}
                          className="px-2.5 py-1.5 text-gray-600 hover:text-black cursor-pointer"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 6. Order Actions */}
                  <div className="pt-2 border-t border-gray-100 space-y-2">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-gray-500 font-medium">Total:</span>
                      <span className="font-display text-lg font-bold text-[#1d1d1f]">
                        {formatNaira(selectedProduct.price * modalQuantity)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleModalAddToCart}
                      className={`w-full py-2.5 rounded-full text-xs font-semibold shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        isAddedInModal
                          ? 'bg-emerald-600 text-white'
                          : 'bg-[#f47b20] hover:bg-[#c95510] text-white active:scale-98'
                      }`}
                    >
                      {isAddedInModal ? (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Added to Cart!</span>
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="w-4 h-4" />
                          <span>Add to Cart ({formatNaira(selectedProduct.price * modalQuantity)})</span>
                        </>
                      )}
                    </button>

                    <a
                      href={`https://wa.me/2348133535756?text=${encodeURIComponent(
                        `Hello ENJ Digital Concept! I am interested in: ${selectedProduct.title}\nQuantity: ${modalQuantity} ${selectedProduct.unit}${selectedColor ? `\nColor: ${selectedColor}` : ''}${selectedSize ? `\nSize/Spec: ${selectedSize}` : ''}\nTotal: ${formatNaira(selectedProduct.price * modalQuantity)}`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2 rounded-full border border-emerald-500 text-emerald-700 hover:bg-emerald-50 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Instant Order on WhatsApp</span>
                    </a>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
