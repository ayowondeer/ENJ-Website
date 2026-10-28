import { collection, doc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';

export interface TestimonialItem {
  id: string;
  quote: string;
  author: string;
  role: string;
  highlight?: boolean;
}

export const DEFAULT_TESTIMONIALS: TestimonialItem[] = [
  {
    id: 'test-1',
    quote: 'The clarity of the brochures exceeded all our expectations.',
    author: 'Amina Bello',
    role: 'Marketing Lead, Apex Logistics',
    highlight: false
  },
  {
    id: 'test-2',
    quote: 'The quality of our large-format banners completely exceeded expectations. Our go-to-print partner.',
    author: 'Engr. Emmanuel I. Moses',
    role: 'CEO — ENJ Digital Concept',
    highlight: true
  },
  {
    id: 'test-3',
    quote: "The fastest turnaround on business cards we've ever seen, with absolute color accuracy.",
    author: 'Chukwudi Okafor',
    role: 'Founder, BrandCraft Studio',
    highlight: false
  },
  {
    id: 'test-4',
    quote: 'Sharp details, consistent colors, and fast turnaround. A truly reliable partner.',
    author: 'Babajide Adeleke',
    role: 'Operations Director, Prime Solutions',
    highlight: false
  }
];

const LOCAL_STORAGE_KEY = 'enj_testimonials_data_v1';
const TESTIMONIALS_CHANGED_EVENT = 'enj_testimonials_changed';

export function getLocalTestimonials(): TestimonialItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Could not read testimonials from localStorage', e);
  }
  return DEFAULT_TESTIMONIALS;
}

export function saveLocalTestimonials(list: TestimonialItem[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent(TESTIMONIALS_CHANGED_EVENT, { detail: list }));
  } catch (e) {
    console.warn('Could not save testimonials to localStorage', e);
  }
}

export async function fetchLiveTestimonials(): Promise<TestimonialItem[]> {
  try {
    const snap = await getDocs(collection(db, 'testimonials'));
    if (!snap.empty) {
      const items: TestimonialItem[] = snap.docs.map(d => ({
        id: d.id,
        ...(d.data() as Omit<TestimonialItem, 'id'>)
      }));
      saveLocalTestimonials(items);
      return items;
    }
  } catch (e) {
    console.warn('Firestore testimonials fetch notice:', e);
  }
  return getLocalTestimonials();
}

export async function syncTestimonialToStorage(item: TestimonialItem): Promise<void> {
  const current = getLocalTestimonials();
  const index = current.findIndex(t => t.id === item.id);
  const updated = index >= 0
    ? current.map(t => t.id === item.id ? item : t)
    : [...current, item];
  
  saveLocalTestimonials(updated);

  try {
    await setDoc(doc(db, 'testimonials', item.id), item);
  } catch (e) {
    console.warn('Firestore testimonial save notice:', e);
  }
}

export async function removeTestimonialFromStorage(id: string): Promise<void> {
  const current = getLocalTestimonials();
  const updated = current.filter(t => t.id !== id);
  saveLocalTestimonials(updated);

  try {
    await deleteDoc(doc(db, 'testimonials', id));
  } catch (e) {
    console.warn('Firestore testimonial delete notice:', e);
  }
}

export async function resetTestimonialsToDefault(): Promise<TestimonialItem[]> {
  saveLocalTestimonials(DEFAULT_TESTIMONIALS);
  try {
    for (const item of DEFAULT_TESTIMONIALS) {
      await setDoc(doc(db, 'testimonials', item.id), item);
    }
  } catch (e) {
    console.warn('Firestore reset notice:', e);
  }
  return DEFAULT_TESTIMONIALS;
}
