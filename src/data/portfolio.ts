import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot
} from 'firebase/firestore';
import {
  db,
  fitImagesToFirestoreBudget,
  handleFirestoreError,
  OperationType,
  stripUndefinedDeep
} from '../firebase';
import jdpiBlueImg from '../assets/images/jdpi_blue_shirt_1795012541809.webp';
import jdpiBlackPressImg from '../assets/images/jdpi_black_press_1795012542853.webp';
import jdpiPressDetailImg from '../assets/images/jdpi_press_detail_clean_1795012558850.webp';

const JDPI_BLUE_IMG = jdpiBlueImg;
const JDPI_BLACK_PRESS_IMG = jdpiBlackPressImg;
const JDPI_PRESS_DETAIL_IMG = jdpiPressDetailImg;

let portfolioImagesPreloaded = false;
export function preloadPortfolioImages(): void {
  if (portfolioImagesPreloaded || typeof window === 'undefined') return;
  portfolioImagesPreloaded = true;
  [JDPI_BLUE_IMG, JDPI_BLACK_PRESS_IMG, JDPI_PRESS_DETAIL_IMG].forEach((src) => {
    const img = new Image();
    img.decoding = 'async';
    img.src = src;
    if (typeof img.decode === 'function') {
      img.decode().catch(() => {});
    }
  });
}

export interface PortfolioItem {
  id: string;
  title: string;
  category: string;
  client: string;
  year: string;
  description: string;
  services: string[];
  impact?: string;
  imageUrl: string;
  gallery?: string[];
  featured?: boolean;
  order?: number;
  createdAt?: string;
  updatedAt?: string;
}

export const PORTFOLIO_CATEGORIES = [
  'All Projects',
  'Branding & 3D Signage',
  'Digital & Large Format Printing',
  'Solar & Renewable Energy',
  'Corporate Apparel & Monogram',
  'Procurement & General Supplies'
] as const;

export const DEFAULT_PORTFOLIO: PortfolioItem[] = [
  {
    id: 'port-jdpi-imd',
    title: 'International Men’s Day Custom Apparel for JDPI',
    category: 'Corporate Apparel & Monogram',
    client: 'JDPI',
    year: '2025',
    description:
      'Custom T-shirt design placement and precision heat-transfer printing produced for JDPI to commemorate International Men’s Day (19th November — "The Future Is Everyone"). Printed across royal blue and jet-black cotton shirts with crisp chest typography, symbolic necktie artwork, and clean sleeve branding.',
    services: [
      'Custom Shirt Design & Layout',
      'Precision Heat-Transfer Printing',
      'Sleeve Logo Branding',
      'Multi-Colorway Cotton Apparel'
    ],
    impact:
      'Vibrant, wash-resistant branded T-shirts delivered across royal blue and black garment editions for JDPI.',
    imageUrl: JDPI_BLUE_IMG,
    gallery: [
      JDPI_BLUE_IMG,
      JDPI_BLACK_PRESS_IMG,
      JDPI_PRESS_DETAIL_IMG
    ],
    featured: true,
    order: 1
  }
];

const LOCAL_STORAGE_KEY = 'enj_portfolio_data_v4';
const LEGACY_LOCAL_STORAGE_KEYS = ['enj_portfolio_data_v1', 'enj_portfolio_data_v2', 'enj_portfolio_data_v3'];
const MIGRATION_MARKER_ID = 'portfolio_jdpi_reset_v3';
export const PORTFOLIO_CHANGED_EVENT = 'enj_portfolio_changed';

let memoryPortfolioCache: PortfolioItem[] | null = null;

function normalizeImageUrl(url: string): string {
  if (!url) return url;
  if (url.includes('jdpi_blue_shirt') || url.includes('jdpi-blue-shirt')) return JDPI_BLUE_IMG;
  if (url.includes('jdpi_black_press') || url.includes('jdpi-black-press')) return JDPI_BLACK_PRESS_IMG;
  if (url.includes('jdpi_press_detail') || url.includes('jdpi-press-detail')) return JDPI_PRESS_DETAIL_IMG;
  return url;
}

function normalizePortfolioItem(item: PortfolioItem): PortfolioItem {
  return {
    ...item,
    imageUrl: normalizeImageUrl(item.imageUrl),
    gallery: Array.isArray(item.gallery) ? item.gallery.map(normalizeImageUrl) : item.gallery
  };
}

export function getLocalPortfolio(): PortfolioItem[] {
  if (memoryPortfolioCache !== null) {
    return memoryPortfolioCache;
  }
  try {
    for (const oldKey of LEGACY_LOCAL_STORAGE_KEYS) {
      if (localStorage.getItem(oldKey)) {
        localStorage.removeItem(oldKey);
      }
    }
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const normalized = parsed.map(normalizePortfolioItem);
        memoryPortfolioCache = normalized;
        return normalized;
      }
    }
  } catch (e) {
    console.warn('Could not read portfolio from localStorage', e);
  }
  return DEFAULT_PORTFOLIO;
}

export function saveLocalPortfolio(list: PortfolioItem[]): void {
  const normalized = list.map(normalizePortfolioItem);
  memoryPortfolioCache = normalized;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(normalized));
  } catch (e) {
    // Base64 galleries can exceed 5MB localStorage quota; memory cache & Firestore keep source of truth
    console.warn('Could not save portfolio to localStorage', e);
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(PORTFOLIO_CHANGED_EVENT, { detail: normalized }));
  }
}

async function seedDefaultPortfolioIfEmpty(): Promise<PortfolioItem[]> {
  const markerRef = doc(db, 'system', MIGRATION_MARKER_ID);
  try {
    const markerSnap = await getDoc(markerRef);
    if (markerSnap.exists()) {
      return [];
    }
    const now = new Date().toISOString();
    const jdpiItem: PortfolioItem = stripUndefinedDeep({
      ...DEFAULT_PORTFOLIO[0],
      updatedAt: now,
      createdAt: now
    });
    await setDoc(doc(db, 'portfolio', jdpiItem.id), jdpiItem);
    await setDoc(markerRef, { migrated: true, updatedAt: now });
    return [jdpiItem];
  } catch (e) {
    console.warn('Portfolio initial seed notice:', e);
    return getLocalPortfolio();
  }
}

function mapPortfolioDocs(
  docs: Array<{ id: string; data: () => Record<string, unknown> }>
): PortfolioItem[] {
  const items: PortfolioItem[] = docs.map((d) =>
    normalizePortfolioItem({
      id: d.id,
      ...(d.data() as Omit<PortfolioItem, 'id'>)
    })
  );
  items.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  return items;
}

export async function fetchLivePortfolio(): Promise<PortfolioItem[]> {
  try {
    const snap = await getDocs(collection(db, 'portfolio'));
    if (!snap.empty) {
      const items = mapPortfolioDocs(snap.docs);
      saveLocalPortfolio(items);
      return items;
    }
    const seeded = await seedDefaultPortfolioIfEmpty();
    saveLocalPortfolio(seeded);
    return seeded;
  } catch (e) {
    console.warn('Firestore portfolio fetch notice:', e);
    return getLocalPortfolio();
  }
}

export function subscribePortfolio(
  onUpdate: (items: PortfolioItem[]) => void
): () => void {
  let active = true;

  const unsubscribe = onSnapshot(
    collection(db, 'portfolio'),
    async (snap) => {
      if (!active) return;
      if (!snap.empty) {
        const items = mapPortfolioDocs(snap.docs);
        saveLocalPortfolio(items);
        onUpdate(items);
        return;
      }
      const seeded = await seedDefaultPortfolioIfEmpty();
      if (!active) return;
      saveLocalPortfolio(seeded);
      onUpdate(seeded);
    },
    (err) => {
      console.warn('Firestore portfolio live listener notice:', err);
    }
  );

  return () => {
    active = false;
    unsubscribe();
  };
}

export async function syncPortfolioItemToStorage(item: PortfolioItem): Promise<void> {
  const now = new Date().toISOString();
  const rawGallery = Array.from(
    new Set([item.imageUrl, ...(Array.isArray(item.gallery) ? item.gallery : [])].filter(Boolean))
  );

  const baseMetadata = stripUndefinedDeep({
    id: item.id,
    title: item.title,
    category: item.category,
    client: item.client,
    year: item.year,
    description: item.description,
    services: Array.isArray(item.services) ? item.services : [],
    impact: item.impact?.trim() ? item.impact.trim() : undefined,
    featured: Boolean(item.featured),
    order: item.order,
    updatedAt: now,
    createdAt: item.createdAt || now
  });

  const fittedImages = await fitImagesToFirestoreBudget(rawGallery, baseMetadata);
  const itemWithTimestamp: PortfolioItem = stripUndefinedDeep({
    ...baseMetadata,
    imageUrl: fittedImages[0] || item.imageUrl,
    gallery: fittedImages.length > 0 ? fittedImages : [item.imageUrl]
  });

  try {
    await setDoc(doc(db, 'portfolio', item.id), itemWithTimestamp);
    await setDoc(
      doc(db, 'system', MIGRATION_MARKER_ID),
      { migrated: true, updatedAt: now },
      { merge: true }
    ).catch(() => {});
  } catch (e) {
    handleFirestoreError(e, OperationType.WRITE, `portfolio/${item.id}`);
  }

  const current = getLocalPortfolio();
  const index = current.findIndex((p) => p.id === item.id);
  const updated =
    index >= 0
      ? current.map((p) => (p.id === item.id ? itemWithTimestamp : p))
      : [...current, itemWithTimestamp];

  saveLocalPortfolio(updated);
}

export async function removePortfolioItemFromStorage(id: string): Promise<void> {
  try {
    await setDoc(
      doc(db, 'system', MIGRATION_MARKER_ID),
      { migrated: true, updatedAt: new Date().toISOString() },
      { merge: true }
    ).catch(() => {});
    await deleteDoc(doc(db, 'portfolio', id));
  } catch (e) {
    handleFirestoreError(e, OperationType.DELETE, `portfolio/${id}`);
  }

  const current = getLocalPortfolio();
  const updated = current.filter((p) => p.id !== id);
  saveLocalPortfolio(updated);
}

export async function resetPortfolioToDefault(): Promise<PortfolioItem[]> {
  try {
    const snap = await getDocs(collection(db, 'portfolio'));
    for (const existingDoc of snap.docs) {
      if (existingDoc.id !== DEFAULT_PORTFOLIO[0].id) {
        await deleteDoc(doc(db, 'portfolio', existingDoc.id));
      }
    }
    for (const item of DEFAULT_PORTFOLIO) {
      await setDoc(doc(db, 'portfolio', item.id), stripUndefinedDeep(item));
    }
    await setDoc(doc(db, 'system', MIGRATION_MARKER_ID), {
      migrated: true,
      updatedAt: new Date().toISOString()
    });
  } catch (e) {
    handleFirestoreError(e, OperationType.WRITE, 'portfolio');
  }
  saveLocalPortfolio(DEFAULT_PORTFOLIO);
  return DEFAULT_PORTFOLIO;
}
