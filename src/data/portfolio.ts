import { collection, doc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';

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
    id: 'port-1',
    title: 'University Faculty Complex 3D Backlit Architectural Facade Signage',
    category: 'Branding & 3D Signage',
    client: 'University of Maiduguri (UNIMAID)',
    year: '2025',
    description: 'Fabrication and high-altitude installation of weather-resistant 3D cast acrylic channel lettering with internal Samsung LED lighting modules for the university administrative wing. Built to withstand extreme harmattan winds and prolonged solar exposure.',
    services: ['3D Acrylic Lettering', 'Samsung LED Backlighting', 'Structural Facade Mounting', 'Harmattan Weatherproofing'],
    impact: 'Over 40 meters of high-visibility frontage illuminated with 99.8% energy-efficient LED modules.',
    imageUrl: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80'
    ],
    featured: true,
    order: 1
  },
  {
    id: 'port-2',
    title: '15KVA / 48V Commercial Hybrid Solar & Lithium Storage Deployment',
    category: 'Solar & Renewable Energy',
    client: 'Sahel Medical & Diagnostic Centre, Borno',
    year: '2025',
    description: 'Turnkey design, supply, and integration of a heavy-duty hybrid pure sine-wave inverter system paired with 16kW Tier-1 monocrystalline panels and dual 100Ah lithium iron phosphate (LiFePO4) battery racks to maintain 24/7 cold-chain vaccine storage and diagnostic laboratory uptime.',
    services: ['Solar Engineering & Sizing', 'Hybrid MPPT Inverters', 'Tier-1 Mono Panels', 'LiFePO4 Storage Banks'],
    impact: 'Reduced facility diesel reliance by 84% while guaranteeing zero interruption for critical refrigeration.',
    imageUrl: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1508873696983-2df5293cb32f?auto=format&fit=crop&w=1200&q=80'
    ],
    featured: true,
    order: 2
  },
  {
    id: 'port-3',
    title: 'State Development Summit Complete Event Branding & Accreditation Badging',
    category: 'Digital & Large Format Printing',
    client: 'Borno State Ministry of Reconstruction & Commerce',
    year: '2024',
    description: 'Comprehensive branding suite delivered within a tight 72-hour turnaround: 80ft stage backdrop flex prints, 24 heavy-base roll-up exhibition stands, customized RFID conference tags with holographic security foil, and 500 gold-embossed executive presentation folders.',
    services: ['Grand Format Eco-Solvent Printing', 'Heavy-Base Rollup Banners', 'Security Accreditation Badges', 'Gold Foil Folders'],
    impact: 'Delivered 1,200 attendee accreditation packs with zero defects 24 hours prior to commencement.',
    imageUrl: 'https://images.unsplash.com/photo-1542744095-fcf48d80b0fd?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1542744095-fcf48d80b0fd?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=1200&q=80'
    ],
    featured: true,
    order: 3
  },
  {
    id: 'port-4',
    title: 'Corporate Monogrammed Apparel & Safety Gear for 850 Logistics Personnel',
    category: 'Corporate Apparel & Monogram',
    client: 'Savannah Agribusiness & Transit Fleet',
    year: '2024',
    description: 'Production and distribution of 2,500 combed cotton pique polo shirts with precision computerized monogramming on front chest and sleeves, alongside high-visibility Class-3 reflective industrial safety vests and embroidered field caps.',
    services: ['Computerized Multi-Head Monogramming', 'Heavy Pique Cotton Polos', 'Class-3 Hi-Vis Safety Vests', 'Custom Structured Caps'],
    impact: 'Supplied 2,500 apparel units color-matched to brand Pantone with reinforced anti-shrink stitching.',
    imageUrl: 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1581655353564-df123a1eb820?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99?auto=format&fit=crop&w=1200&q=80'
    ],
    featured: false,
    order: 4
  },
  {
    id: 'port-5',
    title: 'Fleet Vehicle Wrapping & Mobile Asset Identification',
    category: 'Branding & 3D Signage',
    client: 'Apex Microfinance Bank Maiduguri Branch',
    year: '2024',
    description: 'Full exterior cast vinyl graphic wrap application across a fleet of 12 mobile banking vans and operational support SUVs. Features scratch-resistant UV overlaminate and bubble-free air release technology for severe dust and sun exposure.',
    services: ['Cast Vinyl Vehicle Wrapping', 'UV Protective Overlaminate', 'Contour Cut Vinyl Lettering', 'Fleet Standard Compliance'],
    impact: 'Uniform corporate mobile presence across 6 regional local government areas.',
    imageUrl: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=1200&q=80'
    ],
    featured: false,
    order: 5
  },
  {
    id: 'port-6',
    title: 'Executive Institutional Procurement: Crystal Awards, ICT & Office Furniture',
    category: 'Procurement & General Supplies',
    client: 'Lake Chad Research & Agricultural Institute',
    year: '2024',
    description: 'Bespoke procurement contract supplying laser-engraved optical crystal and mahogany merit plaques, ergonomic mesh executive seating, conference boardroom audio-visual tech, and 12-month supply of heavy 80gsm premium copy paper.',
    services: ['Laser-Etched Optical Crystal Plaques', 'Ergonomic Executive Seating', 'ICT Hardware & Audio-Visuals', 'Bulk Consumables Fulfillment'],
    impact: 'Fulfilled 100% of contract schedule 8 calendar days ahead of deadline with zero shipment transit damages.',
    imageUrl: 'https://images.unsplash.com/photo-1589330694653-dad6bc01cf0e?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1589330694653-dad6bc01cf0e?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=1200&q=80'
    ],
    featured: false,
    order: 6
  }
];

const LOCAL_STORAGE_KEY = 'enj_portfolio_data_v1';
export const PORTFOLIO_CHANGED_EVENT = 'enj_portfolio_changed';

export function getLocalPortfolio(): PortfolioItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Could not read portfolio from localStorage', e);
  }
  return DEFAULT_PORTFOLIO;
}

export function saveLocalPortfolio(list: PortfolioItem[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent(PORTFOLIO_CHANGED_EVENT, { detail: list }));
  } catch (e) {
    console.warn('Could not save portfolio to localStorage', e);
  }
}

export async function fetchLivePortfolio(): Promise<PortfolioItem[]> {
  try {
    const snap = await getDocs(collection(db, 'portfolio'));
    if (!snap.empty) {
      const items: PortfolioItem[] = snap.docs.map(d => ({
        id: d.id,
        ...(d.data() as Omit<PortfolioItem, 'id'>)
      }));
      // Sort by order or createdAt
      items.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
      saveLocalPortfolio(items);
      return items;
    } else {
      // If Firestore collection is empty, seed initial portfolio items so they are instantly visible
      for (const item of DEFAULT_PORTFOLIO) {
        try {
          await setDoc(doc(db, 'portfolio', item.id), item);
        } catch (err) {
          console.warn('Failed to auto-seed portfolio item:', err);
        }
      }
    }
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
  saveLocalPortfolio(DEFAULT_PORTFOLIO);
  try {
    for (const item of DEFAULT_PORTFOLIO) {
      await setDoc(doc(db, 'portfolio', item.id), item);
    }
  } catch (e) {
    console.warn('Firestore portfolio reset notice:', e);
  }
  return DEFAULT_PORTFOLIO;
}
