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
  INITIAL_PRODUCTS 
} from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';

interface ShopViewProps {
  cart: CartItem[];
  addToCart: (product: ProductItem, qty?: number, color?: string, size?: string) => void;
  openCart: () => void;
  onNavigateHome: () => void;
}

const CATEGORIES = [
  'All',
  'Digital Printing',
  'Signage & Displays',
  'Solar & Renewable Energy',
  'Apparel & Merchandise',
  'Corporate Supplies'
];

export const formatNaira = (amount: number) => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0
  }).format(amount);
};

export default function ShopView({ cart, addToCart, openCart, onNavigateHome }: ShopViewProps) {
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
          const loaded: ProductItem[] = snapshot.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<ProductItem, 'id'>)
          }));
          setProducts(loaded);
        } else {
          setProducts(INITIAL_PRODUCTS.map((p, idx) => ({ id: `default-${idx}`, ...p })));
        }
      },
      (error) => {
        console.warn('Firestore products notice:', error);
        setProducts(INITIAL_PRODUCTS.map((p, idx) => ({ id: `default-${idx}`, ...p })));
      }
    );

    return () => unsub();
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat = selectedCategory === 'All' || p.category === selectedCategory;
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

  // Add from Modal with selected color and size
  const handleModalAddToCart = () => {
    if (!selectedProduct) return;
    addToCart(selectedProduct, modalQuantity, selectedColor || undefined, selectedSize || undefined);
    setIsAddedInModal(true);
    setTimeout(() => {
      setIsAddedInModal(false);
      setSelectedProduct(null);
      openCart();
    }, 450);
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
                  className="group bg-white rounded-2xl border border-gray-200/80 overflow-hidden shadow-xs hover:shadow-xl transition-shadow duration-300 flex flex-col justify-between cursor-pointer"
                >
                  {/* Image */}
                  <div className="relative aspect-4/3 bg-gray-100 overflow-hidden">
                    <img
                      src={product.imageUrl}
                      alt={product.title}
                      className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
                      loading="lazy"
                    />
                    {product.compareAtPrice && product.compareAtPrice > product.price && (
                      <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-[#f47b20] text-white text-[9px] font-bold">
                        Sale
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-3 flex-1 flex flex-col justify-between">
                    <div>
                      <p className="text-[10px] text-gray-400 mb-0.5 uppercase tracking-wider font-medium">
                        {product.category}
                      </p>
                      <h3 className="font-semibold text-xs sm:text-[13px] text-[#1d1d1f] line-clamp-2 leading-snug mb-1">
                        {product.title}
                      </h3>
                    </div>

                    <div className="pt-2 flex items-center justify-between gap-2 mt-auto">
                      <span className="font-display text-xs sm:text-sm font-bold text-[#1d1d1f]">
                        {formatNaira(product.price)}
                      </span>

                      <button
                        type="button"
                        onClick={(e) => handleQuickAdd(product, e)}
                        className={`p-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                          isAdded
                            ? 'bg-emerald-600 text-white'
                            : 'bg-gray-100 hover:bg-[#f47b20] hover:text-white text-gray-700'
                        }`}
                        title="Add to Cart"
                      >
                        {isAdded ? (
                          <Check className="w-3.5 h-3.5" />
                        ) : (
                          <Plus className="w-3.5 h-3.5" />
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

      {/* Minimal Footer */}
      <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 mt-10 text-center text-[11px] text-gray-400">
        <span>ENJ Digital Concept Store • Instant Orders & Delivery</span>
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
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between shrink-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#f47b20] bg-orange-50 px-2.5 py-0.5 rounded-full border border-orange-200">
                {selectedProduct.category}
              </span>
              <button 
                onClick={() => setSelectedProduct(null)}
                className="p-1 rounded-full text-gray-400 hover:text-black hover:bg-gray-100 transition-colors"
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
                      <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md bg-[#f47b20] text-white text-[10px] font-bold shadow-xs">
                        Special Price
                      </span>
                    )}
                  </div>

                  {/* Multiple Pictures Thumbnails */}
                  {productImages.length > 1 && (
                    <div>
                      <span className="block text-[10px] font-semibold text-gray-400 mb-1.5">
                        More Pictures ({productImages.length}):
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
                      
                      <div className="flex items-center gap-2.5 mt-1.5 flex-wrap">
                        <span className="font-display text-2xl font-bold text-[#1d1d1f]">
                          {formatNaira(selectedProduct.price)}
                        </span>
                        <span className="text-xs text-gray-500 font-medium">
                          / {selectedProduct.unit}
                        </span>
                        {selectedProduct.compareAtPrice && selectedProduct.compareAtPrice > selectedProduct.price && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-semibold border border-emerald-200/80">
                            Save {formatNaira(selectedProduct.compareAtPrice - selectedProduct.price)}
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

                    {/* 3. Choice of Color (if provided) */}
                    {selectedProduct.availableColors && selectedProduct.availableColors.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-gray-700">Choose Color:</span>
                          <span className="font-bold text-[#f47b20] text-[11px]">{selectedColor}</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedProduct.availableColors.map((color) => {
                            const isSelected = selectedColor === color;
                            return (
                              <button
                                key={color}
                                type="button"
                                onClick={() => setSelectedColor(color)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer flex items-center gap-1.5 ${
                                  isSelected
                                    ? 'bg-[#1d1d1f] text-white border-[#1d1d1f] shadow-xs'
                                    : 'bg-white hover:bg-gray-100 text-gray-700 border-gray-200'
                                }`}
                              >
                                {isSelected && <Check className="w-3 h-3 text-[#f47b20]" />}
                                <span>{color}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* 4. Choice of Size / Specification (if provided) */}
                    {selectedProduct.availableSizes && selectedProduct.availableSizes.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-gray-700">Choose Size / Spec:</span>
                          <span className="font-bold text-[#f47b20] text-[11px]">{selectedSize}</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedProduct.availableSizes.map((size) => {
                            const isSelected = selectedSize === size;
                            return (
                              <button
                                key={size}
                                type="button"
                                onClick={() => setSelectedSize(size)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer flex items-center gap-1.5 ${
                                  isSelected
                                    ? 'bg-[#1d1d1f] text-white border-[#1d1d1f] shadow-xs'
                                    : 'bg-white hover:bg-gray-100 text-gray-700 border-gray-200'
                                }`}
                              >
                                {isSelected && <Check className="w-3 h-3 text-[#f47b20]" />}
                                <span>{size}</span>
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
