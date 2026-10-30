import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged,
  User 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc,
  getDocFromServer,
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  onSnapshot 
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firestore with custom database ID from config
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Initialize Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection test on initialization
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Firebase client offline warning:", error.message);
    }
  }
}
testConnection();

export interface ProductItem {
  id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  compareAtPrice?: number;
  minOrderQty: number;
  unit: string;
  imageUrl: string;
  gallery?: string[];
  availableColors?: string[];
  availableSizes?: string[];
  inStock: boolean;
  featured?: boolean;
  position?: number;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
}

export interface CartItem {
  product: ProductItem;
  quantity: number;
  selectedColor?: string;
  selectedSize?: string;
}

export interface OrderItem {
  id?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress?: string;
  notes?: string;
  itemsSummary: string;
  totalAmount: number;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  paymentStatus?: 'paid' | 'pending' | 'failed';
  paymentMethod?: string;
  paystackReference?: string;
  createdAt: string;
}

// Seed default initial products for ENJ Digital Concept if database is empty
export const INITIAL_PRODUCTS: Omit<ProductItem, 'id'>[] = [
  {
    title: "Luxury Matte Laminated Business Cards (Pack of 100)",
    category: "Marketing & Business Materials",
    description: "Premium 350gsm art card with dual-sided velvet matte lamination and optional spot UV gloss accents. Ideal for executives, founders, and corporate teams.",
    price: 18500,
    compareAtPrice: 22000,
    minOrderQty: 1,
    unit: "pack (100 cards)",
    imageUrl: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=800&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80"
    ],
    availableColors: ["Velvet Matte Black", "Crisp Polar White", "Gold Foil Accented"],
    availableSizes: ["Standard (3.5 x 2 in)", "Square (2.5 x 2.5 in)"],
    inStock: true,
    featured: true
  },
  {
    title: "Heavy-Duty Roll-Up Banner Stand (Big Base 85x200cm)",
    category: "Marketing & Business Materials",
    description: "High-resolution full-color eco-solvent digital print on anti-curl banner media, mounted in an anodized aluminum wide-base mechanism with carrying bag.",
    price: 38000,
    compareAtPrice: 45000,
    minOrderQty: 1,
    unit: "complete unit",
    imageUrl: "https://images.unsplash.com/photo-1542744095-fcf48d80b0fd?auto=format&fit=crop&w=800&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1542744095-fcf48d80b0fd?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=800&q=80"
    ],
    availableSizes: ["85 x 200 cm (Standard)", "100 x 200 cm (Wide)", "120 x 200 cm (Extra Wide)"],
    inStock: true,
    featured: true
  },
  {
    title: "5KVA / 48V Pure Sine Wave Hybrid Solar Inverter System",
    category: "Solar & Renewable",
    description: "Commercial & residential grade hybrid inverter with integrated MPPT solar charge controller. Designed for Maiduguri and North-East climatic conditions.",
    price: 685000,
    compareAtPrice: 750000,
    minOrderQty: 1,
    unit: "set",
    imageUrl: "https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=800&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1508873696983-2df5293cb32f?auto=format&fit=crop&w=800&q=80"
    ],
    availableSizes: ["3.5 KVA / 24V System", "5 KVA / 48V System", "10 KVA / 48V Commercial"],
    inStock: true,
    featured: true
  },
  {
    title: "Corporate Branded Monogrammed Polo Shirts",
    category: "Fashion & Apparel",
    description: "High-density combed cotton pique knit polo with precision multi-color embroidery of your company logo on chest and sleeve. Color-fast and durable.",
    price: 12500,
    compareAtPrice: 15000,
    minOrderQty: 10,
    unit: "piece",
    imageUrl: "https://images.unsplash.com/photo-1581655353564-df123a1eb820?auto=format&fit=crop&w=800&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1581655353564-df123a1eb820?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?auto=format&fit=crop&w=800&q=80"
    ],
    availableColors: ["Navy Blue", "Classic Black", "Pure White", "Emerald Green", "ENJ Orange"],
    availableSizes: ["S", "M", "L", "XL", "2XL", "3XL"],
    inStock: true,
    featured: false
  },
  {
    title: "3D Acrylic LED Backlit Frontage Channel Lettering",
    category: "Marketing & Business Materials",
    description: "Dimensional fabricated acrylic letters with weatherproof Samsung LED module internal illumination. Built for retail banks, hospitals, and corporate facades.",
    price: 145000,
    compareAtPrice: 175000,
    minOrderQty: 1,
    unit: "custom sign",
    imageUrl: "https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=800&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=800&q=80"
    ],
    availableColors: ["Warm White LED (3000K)", "Cool Daylight LED (6500K)", "Amber Orange Glow"],
    availableSizes: ["Standard 12 - 18 inch letters", "Large 24 - 36 inch facade letters"],
    inStock: true,
    featured: true
  },
  {
    title: "Full Color A5 Marketing Flyers (Gloss Art 150gsm)",
    category: "Marketing & Business Materials",
    description: "Crisp, vibrant commercial color offset & digital flyer printing. Double sided or single sided with sharp details and rich saturation.",
    price: 32000,
    compareAtPrice: 38000,
    minOrderQty: 1,
    unit: "pack of 500 pcs",
    imageUrl: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=800&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=800&q=80"
    ],
    availableSizes: ["A5 (148 x 210 mm)", "A6 Handbill (105 x 148 mm)", "DL Envelope Insert"],
    inStock: true,
    featured: false
  },
  {
    title: "Laser-Engraved Wooden & Crystal Executive Award Plaques",
    category: "Office supplies",
    description: "Bespoke recognition awards crafted with polished optical crystal and seasoned mahogany base, personalized with laser engraving and metallic foil inlays.",
    price: 28500,
    compareAtPrice: 35000,
    minOrderQty: 1,
    unit: "plaque",
    imageUrl: "https://images.unsplash.com/photo-1589330694653-dad6bc01cf0e?auto=format&fit=crop&w=800&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1589330694653-dad6bc01cf0e?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=800&q=80"
    ],
    availableColors: ["Polished Mahogany Wood", "Obsidian Black Base", "Gold Inlay Border"],
    availableSizes: ["7 x 9 inches", "8 x 10 inches", "9 x 12 inches"],
    inStock: true,
    featured: false
  },
  {
    title: "Smart High-Speed Wireless POS & Thermal Barcode Printer",
    category: "Electronics & Gadgets",
    description: "Multi-interface Bluetooth and Wi-Fi direct thermal receipt and barcode printer. Compatible with Android, iOS, Windows, and retail inventory systems.",
    price: 48000,
    compareAtPrice: 55000,
    minOrderQty: 1,
    unit: "unit",
    imageUrl: "https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&w=800&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=800&q=80"
    ],
    availableColors: ["Matte Black", "Office Ivory"],
    availableSizes: ["58mm Thermal Model", "80mm Auto-Cutter Model"],
    inStock: true,
    featured: true
  },
  {
    title: "Heavy-Duty Vinyl Vehicle Fleet Branding (Per Vehicle)",
    category: "Marketing & Business Materials",
    description: "Outdoor cast vehicle wrap vinyl with UV protective overlaminate. Installed by certified technicians for trucks, delivery vans, and company sedans.",
    price: 195000,
    compareAtPrice: 230000,
    minOrderQty: 1,
    unit: "per vehicle",
    imageUrl: "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=800&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1542744095-fcf48d80b0fd?auto=format&fit=crop&w=800&q=80"
    ],
    availableSizes: ["Sedan / Saloon Car", "Delivery Van (Hiace/Box)", "Heavy Truck / Trailer"],
    inStock: true,
    featured: true
  }
];

// Persistent tracker for deleted products to ensure they never reappear on refresh
const LOCAL_DELETED_KEY = 'enj_deleted_product_records_v1';
const LOCAL_INIT_KEY = 'enj_catalog_initialized_v1';

export interface DeletedRecord {
  id: string;
  title: string;
}

export function getDeletedRecords(): DeletedRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_DELETED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function isProductDeleted(id: string, title?: string): boolean {
  const records = getDeletedRecords();
  const cleanTitle = title?.trim().toLowerCase();
  return records.some(r => r.id === id || (cleanTitle && r.title.toLowerCase() === cleanTitle));
}

export function markProductAsDeletedLocally(id: string, title: string) {
  try {
    const records = getDeletedRecords();
    const cleanTitle = title.trim().toLowerCase();
    if (!records.some(r => r.id === id || r.title.toLowerCase() === cleanTitle)) {
      records.push({ id, title: cleanTitle });
      localStorage.setItem(LOCAL_DELETED_KEY, JSON.stringify(records));
    }
  } catch (err) {
    console.warn("Could not save to localStorage:", err);
  }
}

// Complete delete function: marks persistent local state, Firestore deleted records, and deletes doc
export async function deleteProductPermanently(target: ProductItem): Promise<void> {
  // 1. Instantly record locally so refresh never restores it
  markProductAsDeletedLocally(target.id, target.title);

  // 2. Record in Firestore deleted collection for cross-device persistence
  try {
    await setDoc(doc(db, 'deleted_products', target.id), {
      id: target.id,
      title: target.title,
      deletedAt: new Date().toISOString()
    });
  } catch (e) {
    console.warn("Deleted doc backup notice:", e);
  }

  // 3. Delete document from Firestore
  try {
    await deleteDoc(doc(db, 'products', target.id));
  } catch (e) {
    console.warn("Direct delete notice:", e);
  }
}

// Helper to permanently delete an order from Firestore and localStorage
export async function deleteOrderPermanently(orderId: string): Promise<void> {
  try {
    const key = 'enj_deleted_orders_v1';
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    if (!existing.includes(orderId)) {
      existing.push(orderId);
      localStorage.setItem(key, JSON.stringify(existing));
    }
  } catch (e) {
    console.warn("Local deleted order mark notice:", e);
  }

  try {
    await deleteDoc(doc(db, 'orders', orderId));
  } catch (e) {
    console.warn("Direct order delete notice:", e);
  }
}

export function isOrderDeleted(orderId: string): boolean {
  try {
    const key = 'enj_deleted_orders_v1';
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    return existing.includes(orderId);
  } catch {
    return false;
  }
}

// Helper to seed store on first startup with stable IDs. Never re-seeds if initialized or deleted.
export async function seedProductsIfEmpty(): Promise<ProductItem[]> {
  const isAlreadyInitialized = localStorage.getItem(LOCAL_INIT_KEY) === 'true';
  const initDocRef = doc(db, 'system', 'catalog_init');

  try {
    // Check Firestore system initialization record
    const snapshot = await getDocs(collection(db, 'products'));
    
    if (!snapshot.empty) {
      localStorage.setItem(LOCAL_INIT_KEY, 'true');
      return snapshot.docs
        .map(d => ({ id: d.id, ...(d.data() as Omit<ProductItem, 'id'>) }))
        .filter(p => !isProductDeleted(p.id, p.title));
    }

    // If already marked as initialized (e.g. merchant deleted all products), do not re-seed!
    if (isAlreadyInitialized) {
      return [];
    }

    // Seed into Firestore using deterministic IDs so they are consistent across sessions
    const seededList: ProductItem[] = [];
    for (let idx = 0; idx < INITIAL_PRODUCTS.length; idx++) {
      const p = INITIAL_PRODUCTS[idx];
      const prodId = `prod-seed-${idx + 1}`;

      // Skip any product that was previously deleted
      if (isProductDeleted(prodId, p.title)) continue;

      const payload = {
        ...p,
        position: p.position ?? (idx + 1),
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'products', prodId), payload);
      seededList.push({ id: prodId, ...payload });
    }

    localStorage.setItem(LOCAL_INIT_KEY, 'true');
    try {
      await setDoc(initDocRef, { initialized: true, timestamp: new Date().toISOString() });
    } catch (e) {
      console.warn("System init marker notice:", e);
    }

    return seededList;
  } catch (err) {
    console.warn("Could not query or seed Firestore products:", err);
    if (isAlreadyInitialized) return [];
    return INITIAL_PRODUCTS
      .map((p, idx) => ({ id: `prod-seed-${idx + 1}`, ...p }))
      .filter(p => !isProductDeleted(p.id, p.title));
  }
}

// Automatically ensure Firestore has store catalog on start
seedProductsIfEmpty();
