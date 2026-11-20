import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  ChevronRight,
  ChevronDown,
  ArrowUpDown,
  LayoutGrid,
  Maximize2
} from 'lucide-react';
import { 
  db, 
  ProductItem, 
  CartItem, 
  INITIAL_PRODUCTS,
  isProductDeleted
} from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import LiquidGlassLightbox from './LiquidGlassLightbox';

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

function matchesCategory(p: ProductItem, category: string): boolean {
  if (category === 'All') return true;
  if (category === 'Marketing & Business Materials') {
    return (
      p.category === 'Marketing & Business Materials' ||
      p.category === 'Digital Printing' ||
      p.category === 'Signage & Displays' ||
      Boolean(p.category?.toLowerCase().includes('marketing')) ||
      Boolean(p.category?.toLowerCase().includes('print'))
    );
  }
  if (category === 'Office supplies') {
    return (
      p.category === 'Office supplies' ||
      p.category === 'Office Supplies' ||
      p.category === 'Corporate Supplies' ||
      Boolean(p.category?.toLowerCase().includes('office'))
    );
  }
  if (category === 'Electronics & Gadgets') {
    return (
      p.category === 'Electronics & Gadgets' ||
      Boolean(p.category?.toLowerCase().includes('gadget')) ||
      Boolean(p.category?.toLowerCase().includes('electronic'))
    );
  }
  if (category === 'Solar & Renewable') {
    return (
      p.category === 'Solar & Renewable' ||
      p.category === 'Solar & Renewable Energy' ||
      Boolean(p.category?.toLowerCase().includes('solar')) ||
      Boolean(p.category?.toLowerCase().includes('renewable')) ||
      Boolean(p.category?.toLowerCase().includes('inverter'))
    );
  }
  if (category === 'Fashion & Apparel') {
    return (
      p.category === 'Fashion & Apparel' ||
      p.category === 'Apparel & Merchandise' ||
      Boolean(p.category?.toLowerCase().includes('apparel')) ||
      Boolean(p.category?.toLowerCase().includes('fashion'))
    );
  }
  if (category === 'New Arrival') {
    return (
      p.category === 'New Arrival' ||
      p.category === 'New Arrivals' ||
      p.featured === true
    );
  }
  if (category === 'Deals') {
    return (
      p.category === 'Deals' ||
      p.category === 'deals' ||
      Boolean(p.compareAtPrice && p.compareAtPrice > p.price)
    );
  }
  return p.category?.toLowerCase() === category.toLowerCase();
}

type SortOption =
  | 'featured'
  | 'price-asc'
  | 'price-desc'
  | 'newest';

const SORT_OPTIONS: { value: SortOption; label: string; shortLabel: string }[] = [
  { value: 'featured', label: 'Featured Order', shortLabel: 'Featured' },
  { value: 'price-asc', label: 'Price: Low to High', shortLabel: 'Price: Low → High' },
  { value: 'price-desc', label: 'Price: High to Low', shortLabel: 'Price: High → Low' },
  { value: 'newest', label: 'Newest Arrivals', shortLabel: 'Newest' }
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

export default function ShopView({ 
  cart, 
  addToCart, 
  openCart, 
  onNavigateHome, 
  onNavigateAdmin
}: ShopViewProps) {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const categoryMenuRef = useRef<HTMLDivElement | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('featured');
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const sortMenuRef = useRef<HTMLDivElement | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [addedProductId, setAddedProductId] = useState<string | null>(null);

  // Product Detail Modal State
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);
  const [activeImage, setActiveImage] = useState<string>('');
  const [isImagePreviewOpen, setIsImagePreviewOpen] = useState<boolean>(false);
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
          localStorage.setItem('enj_catalog_initialized_v1', 'true');
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
        setProducts((prev) => {
          if (prev.length > 0) return prev;
          if (localStorage.getItem('enj_catalog_initialized_v1') === 'true') {
            return [];
          }
          return INITIAL_PRODUCTS
            .map((p, idx) => ({ id: `prod-seed-${idx + 1}`, ...p }))
            .filter((p) => !isProductDeleted(p.id, p.title));
        });
      }
    );

    return () => unsub();
  }, []);

  // Apple HIG Modal Accessibility: Background scroll-locking & Escape key dismiss
  useEffect(() => {
    if (!selectedProduct) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isImagePreviewOpen) {
        setSelectedProduct(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedProduct, isImagePreviewOpen]);

  // Close category or sort menu on outside click or Escape key
  useEffect(() => {
    if (!isCategoryMenuOpen && !isSortMenuOpen) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (categoryMenuRef.current && !categoryMenuRef.current.contains(target)) {
        setIsCategoryMenuOpen(false);
      }
      if (sortMenuRef.current && !sortMenuRef.current.contains(target)) {
        setIsSortMenuOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsCategoryMenuOpen(false);
        setIsSortMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown, { passive: true });
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isCategoryMenuOpen, isSortMenuOpen]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat = matchesCategory(p, selectedCategory);
      const matchQuery = searchQuery === '' || 
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        p.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchQuery;
    }).sort((a, b) => {
      if (sortBy === 'price-asc') {
        if (a.price !== b.price) return a.price - b.price;
      } else if (sortBy === 'price-desc') {
        if (a.price !== b.price) return b.price - a.price;
      } else if (sortBy === 'newest') {
        const timeA = a.createdAt ? Date.parse(a.createdAt) || 0 : 0;
        const timeB = b.createdAt ? Date.parse(b.createdAt) || 0 : 0;
        if (timeA !== timeB) return timeB - timeA;
      }

      const posA = a.position !== undefined ? a.position : 99999;
      const posB = b.position !== undefined ? b.position : 99999;
      if (posA !== posB) return posA - posB;
      return a.title.localeCompare(b.title);
    });
  }, [products, selectedCategory, searchQuery, sortBy]);

  const activeSortOption = SORT_OPTIONS.find(opt => opt.value === sortBy) || SORT_OPTIONS[0];

  // Open detail modal when clicking a product
  const handleOpenProductDetail = (product: ProductItem) => {
    setSelectedProduct(product);
    setActiveImage(product.imageUrl);
    setIsImagePreviewOpen(false);
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
    <div className="min-h-screen apple-liquid-glass-mesh text-[#1d1d1f] flex flex-col pb-20 animate-fluid-page relative isolate overflow-x-clip">
      {/* Ambient Apple Liquid Glass Refraction mesh */}
      <div className="fixed inset-0 pointer-events-none -z-10 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(244,123,32,0.10),rgba(255,255,255,0))]" />
      <div className="fixed inset-0 pointer-events-none -z-10 bg-[radial-gradient(ellipse_60%_50%_at_85%_85%,rgba(124,156,200,0.08),rgba(255,255,255,0))]" />
      
      {/* Floating Shop Navigation Header matching the website navbar */}
      <header className="fixed top-3 sm:top-5 inset-x-0 mx-auto z-50 w-[min(780px,calc(100%-20px))] sm:w-[min(780px,calc(100%-32px))] pointer-events-auto">
        <nav
          className={`glass-pill rounded-full px-2.5 sm:px-4 py-1.5 flex items-center justify-between transition-all duration-350 ease-liquid-spring ${
            isSearchExpanded ? 'gap-1.5 sm:gap-4' : 'gap-2 sm:gap-4'
          }`}
        >
          {/* 1. Main Website (collapses smoothly on mobile when search is expanded) */}
          <button
            type="button"
            onClick={onNavigateHome}
            tabIndex={isSearchExpanded ? -1 : 0}
            className={`inline-flex items-center gap-1.5 rounded-full hover:bg-black/5 active:bg-black/10 text-[#1d1d1f] hover:text-[#f47b20] text-xs font-semibold transition-all duration-350 ease-liquid-spring cursor-pointer shrink-0 touch-action-btn whitespace-nowrap ${
              isSearchExpanded
                ? 'max-w-0 opacity-0 px-0 py-2 -mr-1.5 pointer-events-none scale-90 overflow-hidden sm:max-w-[180px] sm:opacity-100 sm:px-3 sm:py-1.5 sm:mr-0 sm:pointer-events-auto sm:scale-100 sm:overflow-visible'
                : 'max-w-[180px] opacity-100 px-2.5 sm:px-3 py-2 sm:py-1.5 scale-100'
            }`}
            title="Return to Main Website"
          >
            <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
            <span className="text-[11px] sm:text-xs">Main Website</span>
          </button>

          {/* 2. Search Panel (expands to fill the floating bar on mobile click/focus) */}
          <div
            onClick={() => {
              setIsSearchExpanded(true);
              searchInputRef.current?.focus();
            }}
            className={`relative flex-1 min-w-0 transition-all duration-350 ease-liquid-spring ${
              isSearchExpanded ? 'max-w-full sm:max-w-sm' : 'max-w-xs sm:max-w-sm'
            }`}
          >
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search products…"
              value={searchQuery}
              onFocus={() => setIsSearchExpanded(true)}
              onBlur={() => {
                window.setTimeout(() => {
                  if (document.activeElement !== searchInputRef.current) {
                    setIsSearchExpanded(false);
                  }
                }, 120);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape' || e.key === 'Enter') {
                  e.currentTarget.blur();
                  setIsSearchExpanded(false);
                }
              }}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-8 py-2 sm:py-1.5 text-xs bg-black/5 hover:bg-black/8 focus:bg-white border border-transparent focus:border-black/10 rounded-full outline-none transition-all placeholder:text-gray-400 text-[#1d1d1f]"
            />
            {searchQuery && (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => {
                  e.stopPropagation();
                  setSearchQuery('');
                  searchInputRef.current?.focus();
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black p-1 cursor-pointer touch-action-btn"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* 3. Right Action: Cart Icon (collapses on mobile while searching) + Mobile Done Pill */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={openCart}
              tabIndex={isSearchExpanded ? -1 : 0}
              className={`relative rounded-full bg-[#1d1d1f] hover:bg-[#3a3a3c] text-white transition-all duration-350 ease-liquid-spring shadow-xs cursor-pointer shrink-0 flex items-center justify-center touch-action-btn ${
                isSearchExpanded
                  ? 'w-0 h-0 opacity-0 scale-75 pointer-events-none overflow-hidden sm:overflow-visible sm:w-8 sm:h-8 sm:opacity-100 sm:scale-100 sm:pointer-events-auto'
                  : 'w-9 h-9 sm:w-8 sm:h-8 opacity-100 scale-100'
              }`}
              aria-label="View shopping cart"
              title="View shopping cart"
            >
              <ShoppingCart className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-white" />
              {totalCartCount > 0 && (
                <span className="absolute -top-1 -right-1 px-1.2 py-0.2 min-w-4 h-4 rounded-full bg-[#f47b20] text-white text-[9px] font-bold flex items-center justify-center shadow-xs">
                  {totalCartCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setIsSearchExpanded(false);
                searchInputRef.current?.blur();
              }}
              className={`sm:hidden inline-flex items-center justify-center rounded-full bg-[#1d1d1f] text-white text-xs font-semibold transition-all duration-350 ease-liquid-spring cursor-pointer touch-action-btn whitespace-nowrap ${
                isSearchExpanded
                  ? 'max-w-[80px] h-9 px-3.5 opacity-100 scale-100'
                  : 'max-w-0 w-0 h-0 px-0 opacity-0 scale-75 pointer-events-none overflow-hidden'
              }`}
              aria-label="Done searching"
            >
              Done
            </button>
          </div>
        </nav>
      </header>

      {/* Top Controls Bar: Centered Liquid Glass Category & Sort Button Holders */}
      <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 pt-18 sm:pt-20 pb-3.5 relative z-30">
        <div className="flex items-center justify-center gap-2 sm:gap-2.5 flex-wrap">
          {/* Category Button Holder & Dropdown */}
          <div className="relative min-w-0" ref={categoryMenuRef}>
            <button
              type="button"
              onClick={() => {
                setIsCategoryMenuOpen(prev => !prev);
                setIsSortMenuOpen(false);
              }}
              aria-haspopup="listbox"
              aria-expanded={isCategoryMenuOpen}
              aria-label="Filter by category"
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 sm:py-1.5 rounded-full text-xs font-semibold transition-all duration-300 ease-liquid-spring cursor-pointer touch-action-btn max-w-[205px] sm:max-w-[280px] ${
                selectedCategory !== 'All'
                  ? 'bg-[#1d1d1f] text-white shadow-xs'
                  : isCategoryMenuOpen
                    ? 'bg-white text-[#1d1d1f] shadow-sm border border-black/10'
                    : 'apple-liquid-glass-pill hover:bg-white text-[#1d1d1f]'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">
                {selectedCategory === 'All' ? 'Categories' : selectedCategory}
              </span>
              <ChevronDown
                className={`w-3 h-3 shrink-0 transition-transform duration-300 ease-liquid-spring ${
                  isCategoryMenuOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Liquid Glass Category Dropdown */}
            <div
              role="listbox"
              aria-label="Product categories"
              aria-hidden={!isCategoryMenuOpen}
              className={`absolute left-0 top-full mt-2 w-56 sm:w-60 origin-top-left apple-liquid-glass p-1.5 rounded-[14px] sm:rounded-[18px] z-40 overflow-hidden transition-all duration-300 ease-liquid-spring ${
                isCategoryMenuOpen
                  ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
                  : 'opacity-0 scale-95 -translate-y-1.5 pointer-events-none'
              }`}
            >
              <div className="specular-highlight opacity-75" />
              <div className="space-y-0.5 max-h-[60vh] overflow-y-auto overscroll-contain relative z-10">
                {CATEGORIES.map((cat) => {
                  const isSelected = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      tabIndex={isCategoryMenuOpen ? 0 : -1}
                      onClick={() => {
                        setSelectedCategory(cat);
                        setIsCategoryMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-[12px] text-xs text-left transition-colors cursor-pointer touch-action-btn ${
                        isSelected
                          ? 'bg-[#1d1d1f] text-white font-semibold'
                          : 'text-[#1d1d1f] font-medium hover:bg-black/[0.04] active:bg-black/[0.08]'
                      }`}
                    >
                      <span className="truncate">{cat === 'All' ? 'All Products' : cat}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 shrink-0 text-white" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sort Button Holder & Dropdown */}
          <div className="relative shrink-0" ref={sortMenuRef}>
              <button
                type="button"
                onClick={() => {
                  setIsSortMenuOpen(prev => !prev);
                  setIsCategoryMenuOpen(false);
                }}
                aria-haspopup="listbox"
                aria-expanded={isSortMenuOpen}
                aria-label="Sort products"
                className={`inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-2 sm:py-1.5 rounded-full text-xs font-semibold transition-all duration-300 ease-liquid-spring cursor-pointer touch-action-btn whitespace-nowrap ${
                  sortBy !== 'featured'
                    ? 'bg-[#1d1d1f] text-white shadow-xs'
                    : isSortMenuOpen
                      ? 'bg-white text-[#1d1d1f] shadow-sm border border-black/10'
                      : 'apple-liquid-glass-pill hover:bg-white text-[#1d1d1f]'
                }`}
              >
                <ArrowUpDown className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {sortBy === 'featured' ? 'Sort' : activeSortOption.shortLabel}
                </span>
                <ChevronDown
                  className={`w-3 h-3 shrink-0 transition-transform duration-300 ease-liquid-spring ${
                    isSortMenuOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Liquid Glass Sort Dropdown */}
              <div
                role="listbox"
                aria-label="Sort options"
                aria-hidden={!isSortMenuOpen}
                className={`absolute right-0 top-full mt-2 w-48 origin-top-right apple-liquid-glass p-1.5 rounded-[14px] sm:rounded-[18px] z-40 overflow-hidden transition-all duration-300 ease-liquid-spring ${
                  isSortMenuOpen
                    ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
                    : 'opacity-0 scale-95 -translate-y-1.5 pointer-events-none'
                }`}
              >
                <div className="specular-highlight opacity-75" />
                <div className="space-y-0.5 relative z-10">
                  {SORT_OPTIONS.map((option) => {
                    const isSelected = sortBy === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        tabIndex={isSortMenuOpen ? 0 : -1}
                        onClick={() => {
                          setSortBy(option.value);
                          setIsSortMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-[12px] text-xs text-left transition-colors cursor-pointer touch-action-btn ${
                          isSelected
                            ? 'bg-[#1d1d1f] text-white font-semibold'
                            : 'text-[#1d1d1f] font-medium hover:bg-black/[0.04] active:bg-black/[0.08]'
                        }`}
                      >
                        <span>{option.label}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 shrink-0 text-white" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
        </div>
      </div>

      {/* Simple, Streamlined Product Grid with Apple Liquid Glass & Concentric Geometry */}
      <div className="max-w-5xl mx-auto w-full px-4 sm:px-6">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-16 apple-liquid-glass rounded-[24px] sm:rounded-[32px] my-4 relative overflow-hidden">
            <div className="specular-highlight opacity-50" />
            <Package className="w-8 h-8 text-gray-300 mx-auto mb-2 relative z-10" />
            <p className="text-xs font-semibold text-gray-700 relative z-10">No products found</p>
            <button
              onClick={() => { setSelectedCategory('All'); setSearchQuery(''); setSortBy('featured'); }}
              className="mt-3 px-4 py-1.5 rounded-full bg-[#1d1d1f] text-white text-xs font-medium cursor-pointer relative z-10 touch-action-btn shadow-xs"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-4">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                onClick={() => handleOpenProductDetail(product)}
                className="group apple-liquid-glass-interactive rounded-[20px] sm:rounded-[24px] p-2.5 sm:p-3 overflow-hidden hover:shadow-xl transition-all duration-300 ease-liquid-spring flex flex-col justify-between cursor-pointer touch-action-card relative"
              >
                <div className="specular-highlight opacity-75" />

                {/* Concentric Image */}
                <div className="relative aspect-4/3 rounded-[12px] sm:rounded-[16px] bg-gray-50 overflow-hidden shadow-2xs z-10 mb-2 sm:mb-2.5">
                  <img
                    src={product.imageUrl}
                    alt={product.title}
                    className="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-105"
                    loading="lazy"
                  />
                  {product.compareAtPrice && product.compareAtPrice > product.price && (
                    <span className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 px-2 sm:px-2.5 py-0.5 rounded-full bg-[#f47b20] text-white text-[9px] font-bold shadow-xs">
                      Deal
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 flex flex-col justify-between relative z-10 px-0.5 sm:px-1">
                  <div>
                    <p className="text-[9.5px] sm:text-[10px] text-[#515154] mb-0.5 uppercase tracking-wider font-semibold truncate">
                      {product.category}
                    </p>
                    <h3 className="font-semibold text-[12px] sm:text-[13px] text-[#1d1d1f] line-clamp-2 leading-snug mb-1 group-hover:text-[#c95510] transition-colors">
                      {product.title}
                    </h3>
                  </div>

                  <div className="pt-2 flex items-end sm:items-center justify-between gap-1.5 mt-auto border-t border-black/5">
                    <div className="min-w-0">
                      <span className="font-display text-xs sm:text-sm font-bold text-[#1d1d1f] block tabular-nums leading-tight truncate">
                        {formatNaira(product.price)}
                      </span>
                      <span className="text-[10px] text-[#515154] block truncate">
                        Min: {product.minOrderQty || 1} {product.unit}
                      </span>
                    </div>

                    <span className="text-[11px] font-semibold text-[#c95510] group-hover:text-[#1d1d1f] transition-colors flex items-center gap-0.5 shrink-0">
                      <span>View</span>
                      <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </div>
              </div>
            ))}
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
      {selectedProduct && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[9999] apple-modal-backdrop animate-liquid-backdrop flex items-center justify-center p-2.5 sm:p-4 overscroll-none touch-none w-screen h-[100dvh]"
          onClick={() => setSelectedProduct(null)}
        >
          <div 
            className="relative apple-modal-glass animate-liquid-expand rounded-[24px] sm:rounded-[32px] w-full max-w-2xl overflow-hidden max-h-[calc(100dvh-24px)] sm:max-h-[calc(100dvh-48px)] flex flex-col touch-auto my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pointer-events-none absolute -top-20 -right-16 w-56 h-56 rounded-full bg-[#f47b20]/16 blur-3xl z-0" />
            <div className="pointer-events-none absolute -bottom-24 -left-16 w-60 h-60 rounded-full bg-sky-300/20 blur-3xl z-0" />
            <div className="specular-highlight opacity-85 z-20" />

            {/* Pinned Floating Circular Close Button */}
            <button 
              type="button"
              onClick={() => setSelectedProduct(null)}
              className="absolute top-3 right-3 sm:top-3.5 sm:right-3.5 z-40 w-9 h-9 rounded-full apple-floating-glass overflow-hidden text-[#1d1d1f] flex items-center justify-center transition-all cursor-pointer active:scale-95 touch-action-btn"
              aria-label="Close product modal"
              title="Close"
            >
              <span className="specular-highlight opacity-70" />
              <X className="w-4 h-4 relative z-10" />
            </button>

            {/* Modal Body: Scrollable & Properly Padded */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 overscroll-contain relative z-10">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 items-start">
                
                {/* Left: Images & Gallery switcher */}
                <div className="space-y-2.5">
                  <button
                    type="button"
                    onClick={() => setIsImagePreviewOpen(true)}
                    className="group relative w-full h-48 sm:h-56 rounded-[14px] sm:rounded-[18px] overflow-hidden bg-gray-50 border border-white/65 shadow-sm cursor-zoom-in block text-left active:scale-[0.985] transition-transform duration-300 ease-liquid-spring"
                    aria-label={`Preview ${selectedProduct.title} image`}
                    title="Click to preview & zoom image"
                  >
                    <img 
                      src={activeImage || selectedProduct.imageUrl} 
                      alt={selectedProduct.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                    {selectedProduct.compareAtPrice && selectedProduct.compareAtPrice > selectedProduct.price && (
                      <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full bg-[#f47b20] text-white text-[10px] font-bold shadow-xs">
                        Special Price
                      </span>
                    )}
                    <span className="absolute bottom-2.5 right-2.5 w-8 h-8 rounded-full apple-floating-glass flex items-center justify-center opacity-85 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300 ease-liquid-spring">
                      <Maximize2 className="w-3.5 h-3.5 text-[#1d1d1f]" />
                    </span>
                  </button>

                  {/* Multiple Pictures Thumbnails */}
                  {productImages.length > 1 && (
                    <div>
                      <span className="block text-[10px] font-semibold text-[#515154] mb-1.5 uppercase tracking-wider">
                        Product Gallery ({productImages.length}):
                      </span>
                      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                        {productImages.map((img, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setActiveImage(img)}
                            className={`w-14 h-14 rounded-[10px] sm:rounded-[12px] overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${
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
                    <div className="pr-10 sm:pr-11">
                      <p className="text-[10px] font-bold tracking-widest uppercase text-[#c95510] mb-1">
                        {selectedProduct.category} · {selectedProduct.inStock ? 'Ready Stock' : 'Custom Production'}
                      </p>
                      <h2 className="font-display text-lg sm:text-xl font-bold text-[#1d1d1f] leading-snug">
                        {selectedProduct.title}
                      </h2>
                      
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="font-display text-2xl font-bold text-[#1d1d1f] tabular-nums">
                          {formatNaira(selectedProduct.price)}
                        </span>
                        <span className="text-xs text-[#424245] font-medium">
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
                    <div className="p-3.5 sm:p-4 rounded-[14px] sm:rounded-[18px] bg-white/88 backdrop-blur-md border border-black/[0.06] text-xs text-[#1d1d1f] space-y-2.5 shadow-2xs">
                      <p className="leading-relaxed text-[#3a3a3c]">
                        {selectedProduct.description}
                      </p>
                      
                      {/* Simple Key Details Grid */}
                      <div className="pt-2 border-t border-gray-200/70 grid grid-cols-2 gap-2 text-[11px]">
                        <div className="flex items-center gap-1.5 text-[#3a3a3c]">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>Quality Guaranteed</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[#3a3a3c]">
                          <Package className="w-3.5 h-3.5 text-[#c95510] shrink-0" />
                          <span>Min: {selectedProduct.minOrderQty} {selectedProduct.unit}</span>
                        </div>
                      </div>
                    </div>

                    {/* 3. Choice of Color (Circle Color Indicators - Generous finger tap targets) */}
                    {selectedProduct.availableColors && selectedProduct.availableColors.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-gray-700">Color:</span>
                          <span className="font-bold text-[#1d1d1f] text-[11px]">{selectedColor}</span>
                        </div>
                        <div className="flex items-center gap-3 flex-wrap pt-0.5">
                          {selectedProduct.availableColors.map((color) => {
                            const isSelected = selectedColor === color;
                            const style = getColorStyle(color);
                            return (
                              <button
                                key={color}
                                type="button"
                                onClick={() => setSelectedColor(color)}
                                title={color}
                                className={`w-10 h-10 sm:w-9 sm:h-9 rounded-full transition-all cursor-pointer relative flex items-center justify-center touch-action-btn ${
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
                                  <Check className={`w-4 h-4 ${style.isLight ? 'text-black' : 'text-white'}`} strokeWidth={3} />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* 4. Choice of Size / Specification (Fully rounded pills) */}
                    {selectedProduct.availableSizes && selectedProduct.availableSizes.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-gray-700">Size / Spec:</span>
                          <span className="font-bold text-[#1d1d1f] text-[11px]">{selectedSize}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {selectedProduct.availableSizes.map((size) => {
                            const isSelected = selectedSize === size;
                            const label = formatSizeLabel(size);
                            return (
                              <button
                                key={size}
                                type="button"
                                onClick={() => setSelectedSize(size)}
                                className={`transition-all cursor-pointer font-bold rounded-full text-xs sm:text-sm px-4 py-2 min-h-[40px] flex items-center justify-center touch-action-btn border active:scale-95 ${
                                  isSelected
                                    ? 'bg-[#1d1d1f] text-white border-[#1d1d1f] shadow-xs'
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

                    {/* 5. Quantity Stepper - Capsule Pill */}
                    <div className="flex items-center justify-between text-xs p-3.5 sm:p-4 rounded-[14px] sm:rounded-[18px] bg-white/88 backdrop-blur-md border border-black/[0.06] shadow-2xs">
                      <div>
                        <span className="font-semibold text-[#1d1d1f] block text-xs">Quantity</span>
                        <span className="text-[10.5px] text-[#515154]">Order amount in {selectedProduct.unit}</span>
                      </div>
                      <div className="flex items-center border border-gray-200 rounded-full bg-white shadow-2xs overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setModalQuantity(q => Math.max(selectedProduct.minOrderQty || 1, q - 1))}
                          className="w-10 h-10 sm:w-9 sm:h-9 flex items-center justify-center text-gray-600 hover:text-black touch-action-btn cursor-pointer bg-gray-50/60 hover:bg-gray-100"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-10 text-center text-xs sm:text-sm font-bold text-gray-900 tabular-nums">
                          {modalQuantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => setModalQuantity(q => q + 1)}
                          className="w-10 h-10 sm:w-9 sm:h-9 flex items-center justify-center text-gray-600 hover:text-black touch-action-btn cursor-pointer bg-gray-50/60 hover:bg-gray-100"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 6. Order Actions (Finger-friendly full-width buttons min 48px height) */}
                  <div className="pt-2 border-t border-gray-100 space-y-2.5">
                    <div className="flex items-center justify-between text-xs mb-1 px-1">
                      <span className="text-[#424245] font-medium">Total:</span>
                      <span className="font-display text-lg sm:text-xl font-bold text-[#1d1d1f] tabular-nums">
                        {formatNaira(selectedProduct.price * modalQuantity)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleModalAddToCart}
                      className={`w-full min-h-[48px] py-3.5 sm:py-3 rounded-full text-xs sm:text-sm font-semibold shadow-xs transition-transform touch-action-btn flex items-center justify-center gap-2 cursor-pointer ${
                        isAddedInModal
                          ? 'bg-emerald-600 text-white'
                          : 'bg-[#f47b20] hover:bg-[#c95510] text-white active:scale-95'
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
                      className="w-full min-h-[44px] py-3 sm:py-2.5 rounded-full border border-emerald-500 text-emerald-700 hover:bg-emerald-50 text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition-transform touch-action-btn"
                    >
                      <Phone className="w-4 h-4 text-emerald-600" />
                      <span>Instant Order on WhatsApp</span>
                    </a>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ========================================================
          FULL-SCREEN PRODUCT IMAGE LIGHTBOX PREVIEW & ZOOM
         ======================================================== */}
      {selectedProduct && isImagePreviewOpen && productImages.length > 0 && (() => {
        const currentIdx = Math.max(0, productImages.indexOf(activeImage || selectedProduct.imageUrl));
        return (
          <LiquidGlassLightbox
            images={productImages}
            currentImageIndex={currentIdx}
            onSelectImageIndex={(idx) => setActiveImage(productImages[idx] || selectedProduct.imageUrl)}
            title={selectedProduct.title}
            subtitle={`${formatNaira(selectedProduct.price)} / ${selectedProduct.unit}`}
            description={selectedProduct.description}
            onPrev={() => {
              const prevIdx = (currentIdx - 1 + productImages.length) % productImages.length;
              setActiveImage(productImages[prevIdx] || selectedProduct.imageUrl);
            }}
            onNext={() => {
              const nextIdx = (currentIdx + 1) % productImages.length;
              setActiveImage(productImages[nextIdx] || selectedProduct.imageUrl);
            }}
            onClose={() => setIsImagePreviewOpen(false)}
          />
        );
      })()}

    </div>
  );
}
