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
      
      {/* Standalone Simple Shop Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-200/80 px-4 sm:px-6 py-2.5 shadow-xs">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          
          {/* Back to main website & brand */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={onNavigateHome}
              className="inline-flex items-center gap-1.5 px-3 py-1.2 rounded-full border border-gray-200 hover:bg-gray-100 text-xs font-semibold text-gray-700 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Main Website</span>
            </button>

            <div className="flex items-center gap-1.5 pl-1">
              <span className="w-2 h-2 rounded-full bg-[#f47b20] animate-pulse" />
              <strong className="font-display text-sm font-bold text-[#1d1d1f]">
                ENJ Store
              </strong>
            </div>
          </div>

          {/* Search bar & Cart */}
          <div className="flex items-center gap-2.5">
            <div className="relative hidden sm:block w-48 md:w-64">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search items…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.2 text-xs bg-gray-50 border border-gray-200 rounded-full outline-none focus:border-[#f47b20] focus:bg-white transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Paystack Powered Cart Button */}
            <button
              onClick={openCart}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#1d1d1f] hover:bg-[#3a3a3c] text-white text-xs font-semibold transition-all shadow-xs cursor-pointer"
            >
              <ShoppingCart className="w-3.5 h-3.5 text-[#f47b20]" />
              <span>Cart</span>
              {totalCartCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-[#f47b20] text-white text-[10px] font-bold">
                  {totalCartCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Search */}
        <div className="sm:hidden mt-2 max-w-5xl mx-auto">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search items…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-full outline-none focus:border-[#f47b20]"
            />
          </div>
        </div>
      </header>

      {/* Store Title & Paystack Assurance */}
      <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 pt-6 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-gray-200 pb-4">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#1d1d1f]">
              Digital Prints & Supplies
            </h1>
            <p className="text-xs text-[#6e6e73] mt-0.5">
              Click any item to view photos, choose colors or sizes, and checkout via Paystack.
            </p>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/70 text-emerald-800 text-[11px] font-medium self-start sm:self-auto">
            <CreditCard className="w-3 h-3 text-emerald-600" />
            <span>Paystack Secure Checkout</span>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-4 pb-1 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-[#1d1d1f] text-white font-semibold shadow-xs'
                  : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Simple Product Grid */}
      <div className="max-w-5xl mx-auto w-full px-4 sm:px-6">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-200 my-4">
            <Package className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-xs font-semibold text-gray-700">No products match your filter</p>
            <button
              onClick={() => { setSelectedCategory('All'); setSearchQuery(''); }}
              className="mt-2 px-3 py-1 rounded-full bg-gray-100 text-xs font-medium text-gray-800 hover:bg-gray-200"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredProducts.map((product) => {
              const isAdded = addedProductId === product.id;
              const hasVariants = Boolean(
                (product.availableColors && product.availableColors.length > 0) || 
                (product.availableSizes && product.availableSizes.length > 0)
              );

              return (
                <div
                  key={product.id}
                  onClick={() => handleOpenProductDetail(product)}
                  className="group bg-white rounded-2xl border border-gray-200/90 overflow-hidden shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between cursor-pointer"
                >
                  {/* Image with quick view hint */}
                  <div className="relative h-44 bg-gray-100 overflow-hidden">
                    <img
                      src={product.imageUrl}
                      alt={product.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-white text-[10px] font-medium">
                      {product.category}
                    </span>

                    {/* Has Options / Photos badge */}
                    {product.gallery && product.gallery.length > 1 && (
                      <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-white/90 backdrop-blur-xs text-[10px] font-semibold text-gray-800 shadow-xs">
                        +{product.gallery.length} photos
                      </span>
                    )}

                    <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white text-[#1d1d1f] text-xs font-semibold shadow-md">
                        <Eye className="w-3 h-3 text-[#f47b20]" />
                        <span>View Details</span>
                      </span>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-3.5 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-semibold text-xs sm:text-sm text-[#1d1d1f] line-clamp-2 leading-snug group-hover:text-[#f47b20] transition-colors mb-1">
                        {product.title}
                      </h3>
                      <p className="text-[11px] text-[#6e6e73] line-clamp-2 leading-relaxed mb-2.5">
                        {product.description}
                      </p>

                      {/* Variant Preview Badges */}
                      {hasVariants && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {product.availableColors && product.availableColors.length > 0 && (
                            <span className="text-[10px] text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">
                              {product.availableColors.length} colors
                            </span>
                          )}
                          {product.availableSizes && product.availableSizes.length > 0 && (
                            <span className="text-[10px] text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">
                              {product.availableSizes.length} sizes
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="pt-2.5 border-t border-gray-100 flex items-center justify-between gap-2 mt-auto">
                      <div>
                        <span className="font-display text-sm sm:text-base font-bold text-[#1d1d1f] block leading-tight">
                          {formatNaira(product.price)}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          Min: {product.minOrderQty} {product.unit}
                        </span>
                      </div>

                      <button
                        onClick={(e) => handleQuickAdd(product, e)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          isAdded
                            ? 'bg-emerald-600 text-white'
                            : 'bg-[#f47b20] hover:bg-[#c95510] text-white active:scale-95 shadow-xs'
                        }`}
                        title={hasVariants ? "Choose options" : "Add to Cart"}
                      >
                        {isAdded ? (
                          <>
                            <Check className="w-3 h-3" />
                            <span>Added</span>
                          </>
                        ) : hasVariants ? (
                          <>
                            <span>Select</span>
                            <ChevronRight className="w-3 h-3" />
                          </>
                        ) : (
                          <>
                            <Plus className="w-3 h-3 stroke-[2.5]" />
                            <span>Add</span>
                          </>
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

      {/* Trust Footer Note */}
      <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 mt-12 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
        <span>Payments processed safely via Paystack. Direct delivery within Maiduguri & nationwide.</span>
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

                {/* Right: Product Details, Color, Size & Actions */}
                <div className="flex flex-col justify-between space-y-4">
                  <div>
                    <h2 className="font-display text-lg sm:text-xl font-bold text-[#1d1d1f] leading-snug mb-1.5">
                      {selectedProduct.title}
                    </h2>

                    {/* Price Block */}
                    <div className="flex items-baseline gap-2 mb-3">
                      <span className="font-display text-2xl font-bold text-[#1d1d1f]">
                        {formatNaira(selectedProduct.price)}
                      </span>
                      {selectedProduct.compareAtPrice && selectedProduct.compareAtPrice > selectedProduct.price && (
                        <span className="text-xs text-gray-400 line-through">
                          {formatNaira(selectedProduct.compareAtPrice)}
                        </span>
                      )}
                      <span className="text-[11px] text-gray-500">/ {selectedProduct.unit}</span>
                    </div>

                    {/* Full Description */}
                    <p className="text-xs text-gray-600 leading-relaxed mb-4">
                      {selectedProduct.description}
                    </p>

                    {/* CHOICE OF COLOR */}
                    {selectedProduct.availableColors && selectedProduct.availableColors.length > 0 && (
                      <div className="mb-4">
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="font-semibold text-gray-700">Choice of Color:</span>
                          <span className="font-bold text-[#f47b20]">{selectedColor}</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedProduct.availableColors.map((color) => {
                            const isSelected = selectedColor === color;
                            return (
                              <button
                                key={color}
                                type="button"
                                onClick={() => setSelectedColor(color)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer flex items-center gap-1.5 ${
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

                    {/* CHOICE OF SIZE / DIMENSIONS */}
                    {selectedProduct.availableSizes && selectedProduct.availableSizes.length > 0 && (
                      <div className="mb-4">
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="font-semibold text-gray-700">Choice of Size / Spec:</span>
                          <span className="font-bold text-[#f47b20]">{selectedSize}</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedProduct.availableSizes.map((size) => {
                            const isSelected = selectedSize === size;
                            return (
                              <button
                                key={size}
                                type="button"
                                onClick={() => setSelectedSize(size)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer flex items-center gap-1.5 ${
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

                    {/* Quantity Selector */}
                    <div className="flex items-center justify-between text-xs pt-2 border-t border-gray-100">
                      <div>
                        <span className="font-semibold text-gray-700 block">Quantity</span>
                        <span className="text-[10px] text-gray-400">Min. order: {selectedProduct.minOrderQty} {selectedProduct.unit}</span>
                      </div>
                      <div className="flex items-center border border-gray-200 rounded-lg bg-white">
                        <button
                          type="button"
                          onClick={() => setModalQuantity(q => Math.max(selectedProduct.minOrderQty || 1, q - 1))}
                          className="px-2.5 py-1 text-gray-600 hover:text-black cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2 text-xs font-bold text-gray-900">
                          {modalQuantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => setModalQuantity(q => q + 1)}
                          className="px-2.5 py-1 text-gray-600 hover:text-black cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Actions: Add to Cart & WhatsApp */}
                  <div className="pt-3 border-t border-gray-100 space-y-2">
                    <div className="flex items-center justify-between text-xs font-medium text-gray-500 mb-1">
                      <span>Total Price:</span>
                      <span className="font-display text-base font-bold text-[#1d1d1f]">
                        {formatNaira(selectedProduct.price * modalQuantity)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleModalAddToCart}
                      className={`w-full py-2.5 rounded-full text-xs font-semibold shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
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
                          <ShoppingCart className="w-3.5 h-3.5" />
                          <span>Add to Cart ({formatNaira(selectedProduct.price * modalQuantity)})</span>
                        </>
                      )}
                    </button>

                    <a
                      href={`https://wa.me/2348133535756?text=${encodeURIComponent(
                        `Hello ENJ Digital Concept! I am interested in: ${selectedProduct.title}\nQuantity: ${modalQuantity} ${selectedProduct.unit}${selectedColor ? `\nColor: ${selectedColor}` : ''}${selectedSize ? `\nSize/Spec: ${selectedSize}` : ''}\nPrice: ${formatNaira(selectedProduct.price * modalQuantity)}`
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
