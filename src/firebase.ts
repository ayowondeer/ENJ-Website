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
    category: "Digital Printing",
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
    category: "Signage & Displays",
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
    category: "Solar & Renewable Energy",
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
    category: "Apparel & Merchandise",
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
    category: "Signage & Displays",
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
    category: "Digital Printing",
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
    category: "Corporate Supplies",
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
    title: "Heavy-Duty Vinyl Vehicle Fleet Branding (Per Vehicle)",
    category: "Signage & Displays",
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

// Helper to seed store if empty
export async function seedProductsIfEmpty(): Promise<ProductItem[]> {
  const productsCol = collection(db, 'products');
  try {
    const snapshot = await getDocs(productsCol);
    if (!snapshot.empty) {
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProductItem));
    }
  } catch (err) {
    console.warn("Could not query Firestore products (using defaults):", err);
    return INITIAL_PRODUCTS.map((p, idx) => ({ id: `default-${idx}`, ...p }));
  }

  // If empty and user can write (or we provide initial client-side fallback)
  return INITIAL_PRODUCTS.map((p, idx) => ({ id: `seed-${idx}`, ...p }));
}
