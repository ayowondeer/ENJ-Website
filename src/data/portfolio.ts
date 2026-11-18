import { collection, doc, getDoc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';

const JDPI_BLUE_IMG = '/portfolio/jdpi-blue-shirt.jpg';
const JDPI_BLACK_PRESS_IMG = '/portfolio/jdpi-black-press.jpg';
const JDPI_PRESS_DETAIL_IMG = '/portfolio/jdpi-press-detail.jpg';

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

const LOCAL_STORAGE_KEY = 'enj_portfolio_data_v3';
const LEGACY_LOCAL_STORAGE_KEYS = ['enj_portfolio_data_v1', 'enj_portfolio_data_v2'];
const MIGRATION_MARKER_ID = 'portfolio_jdpi_reset_v2';
export const PORTFOLIO_CHANGED_EVENT = 'enj_portfolio_changed';

function normalizeImageUrl(url: string): string {
  if (!url) return url;
  if (url.includes('jdpi_blue_shirt')) return JDPI_BLUE_IMG;
  if (url.includes('jdpi_black_press')) return JDPI_BLACK_PRESS_IMG;
  if (url.includes('jdpi_press_detail')) return JDPI_PRESS_DETAIL_IMG;
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
        return parsed.map(normalizePortfolioItem);
      }
    }
  } catch (e) {
    console.warn('Could not read portfolio from localStorage', e);
  }
  return DEFAULT_PORTFOLIO;
}

export function saveLocalPortfolio(list: PortfolioItem[]): void {
  try {
    const normalized = list.map(normalizePortfolioItem);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(normalized));
    window.dispatchEvent(new CustomEvent(PORTFOLIO_CHANGED_EVENT, { detail: normalized }));
  } catch (e) {
    console.warn('Could not save portfolio to localStorage', e);
  }
}

export async function fetchLivePortfolio(): Promise<PortfolioItem[]> {
  try {
    const markerRef = doc(db, 'system', MIGRATION_MARKER_ID);
    const markerSnap = await getDoc(markerRef);
    const snap = await getDocs(collection(db, 'portfolio'));

    if (!markerSnap.exists()) {
      // Cleanup & sync stable /portfolio/*.jpg paths for both dev and hosted deployments
      for (const existingDoc of snap.docs) {
        if (existingDoc.id !== DEFAULT_PORTFOLIO[0].id) {
          try {
            await deleteDoc(doc(db, 'portfolio', existingDoc.id));
          } catch (delErr) {
            console.warn('Could not remove legacy portfolio item:', existingDoc.id, delErr);
          }
        }
      }

      const jdpiItem: PortfolioItem = {
        ...DEFAULT_PORTFOLIO[0],
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'portfolio', jdpiItem.id), jdpiItem);
      await setDoc(markerRef, { migrated: true, updatedAt: new Date().toISOString() });
      saveLocalPortfolio([jdpiItem]);
      return [jdpiItem];
    }

    if (!snap.empty) {
      const items: PortfolioItem[] = snap.docs.map(d =>
        normalizePortfolioItem({
          id: d.id,
          ...(d.data() as Omit<PortfolioItem, 'id'>)
        })
      );
      items.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
      saveLocalPortfolio(items);
      return items;
    }

    saveLocalPortfolio([]);
    return [];
  } catch (e) {
    console.warn('Firestore portfolio fetch notice:', e);
  }
  return getLocalPortfolio();
}

export async function syncPortfolioItemToStorage(item: PortfolioItem): Promise<void> {
  const current = getLocalPortfolio();
  const index = current.findIndex(p => p.id === item.id);
  const now = new Date().toISOString();
  const itemWithTimestamp: PortfolioItem = {
    ...item,
    updatedAt: now,
    createdAt: item.createdAt || now
  };

  const updated = index >= 0
    ? current.map(p => p.id === item.id ? itemWithTimestamp : p)
    : [...current, itemWithTimestamp];

  saveLocalPortfolio(updated);

  try {
    await setDoc(doc(db, 'portfolio', item.id), itemWithTimestamp);
  } catch (e) {
    console.warn('Firestore portfolio sync notice:', e);
  }
}

export async function removePortfolioItemFromStorage(id: string): Promise<void> {
  const current = getLocalPortfolio();
  const updated = current.filter(p => p.id !== id);
  saveLocalPortfolio(updated);

  try {
    await deleteDoc(doc(db, 'portfolio', id));
  } catch (e) {
    console.warn('Firestore portfolio delete notice:', e);
  }
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
      await setDoc(doc(db, 'portfolio', item.id), item);
    }
  } catch (e) {
    console.warn('Firestore portfolio reset notice:', e);
  }
  saveLocalPortfolio(DEFAULT_PORTFOLIO);
  return DEFAULT_PORTFOLIO;
}
