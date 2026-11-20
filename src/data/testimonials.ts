import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, stripUndefinedDeep } from '../firebase';

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
  },
  {
    id: 'test-5',
    quote: 'Our branded product packaging and roll-up banners arrived in pristine condition. Highly professional service!',
    author: 'Hajiya Fatima Kyari',
    role: 'Managing Director, Sahel Agro Ventures',
    highlight: true
  },
  {
    id: 'test-6',
    quote: 'From delegate badges to event backdrops, ENJ delivered flawlessly on an extremely tight 48-hour schedule.',
    author: 'Dr. Olumide Bakare',
    role: 'Conference Chair, West Africa Tech Summit',
    highlight: false
  },
  {
    id: 'test-7',
    quote: 'The custom embroidered corporate shirts and foil print letterheads set a new standard for our executive identity.',
    author: 'Ngozi Eze',
    role: 'Creative Director, Kene Studios',
    highlight: false
  },
  {
    id: 'test-8',
    quote: 'Unmatched durability on industrial outdoor vinyl banners and site safety signage. Always dependable.',
    author: 'Mustapha Aliyu',
    role: 'Procurement Lead, Northern Energy Systems',
    highlight: false
  }
];

const LOCAL_STORAGE_KEY = 'enj_testimonials_data_v2';
const TESTIMONIALS_INIT_MARKER_ID = 'testimonials_init_v1';
export const TESTIMONIALS_CHANGED_EVENT = 'enj_testimonials_changed';

let memoryTestimonialsCache: TestimonialItem[] | null = null;

export function getLocalTestimonials(): TestimonialItem[] {
  if (memoryTestimonialsCache !== null) {
    return memoryTestimonialsCache;
  }
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY) || localStorage.getItem('enj_testimonials_data_v1');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        if (parsed.length === 4 && parsed[0]?.author === 'Amina Bello' && parsed[1]?.author?.includes('Moses')) {
          memoryTestimonialsCache = DEFAULT_TESTIMONIALS;
          try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(DEFAULT_TESTIMONIALS));
          } catch {}
          return DEFAULT_TESTIMONIALS;
        }
        memoryTestimonialsCache = parsed;
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Could not read testimonials from localStorage', e);
  }
  return DEFAULT_TESTIMONIALS;
}

export function saveLocalTestimonials(list: TestimonialItem[]): void {
  memoryTestimonialsCache = list;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn('Could not save testimonials to localStorage', e);
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(TESTIMONIALS_CHANGED_EVENT, { detail: list }));
  }
}

function normalizeTestimonialsFromDocs(
  docs: Array<{ id: string; data: () => Record<string, unknown> }>
): TestimonialItem[] {
  return docs.map((d) => {
    const raw = d.data() || {};
    return {
      id: d.id,
      quote: String(raw.quote || ''),
      author: String(raw.author || ''),
      role: String(raw.role || 'Verified Client'),
      highlight: Boolean(raw.highlight),
    };
  });
}

async function ensureTestimonialsSeededIfUninit(): Promise<TestimonialItem[]> {
  const markerRef = doc(db, 'system', TESTIMONIALS_INIT_MARKER_ID);
  try {
    const markerSnap = await getDoc(markerRef);
    if (markerSnap.exists()) {
      return [];
    }
    for (const item of DEFAULT_TESTIMONIALS) {
      await setDoc(doc(db, 'testimonials', item.id), stripUndefinedDeep(item));
    }
    await setDoc(markerRef, { initialized: true, updatedAt: new Date().toISOString() });
    return DEFAULT_TESTIMONIALS;
  } catch (e) {
    console.warn('Testimonials init seed notice:', e);
    return getLocalTestimonials();
  }
}

export async function fetchLiveTestimonials(): Promise<TestimonialItem[]> {
  try {
    const snap = await getDocs(collection(db, 'testimonials'));
    if (!snap.empty) {
      const items = normalizeTestimonialsFromDocs(snap.docs);
      saveLocalTestimonials(items);
      return items;
    }
    const seeded = await ensureTestimonialsSeededIfUninit();
    saveLocalTestimonials(seeded);
    return seeded;
  } catch (e) {
    console.warn('Firestore testimonials fetch notice:', e);
    return getLocalTestimonials();
  }
}

export function subscribeTestimonials(
  onUpdate: (items: TestimonialItem[]) => void
): () => void {
  let active = true;

  const unsubscribe = onSnapshot(
    collection(db, 'testimonials'),
    async (snap) => {
      if (!active) return;
      if (!snap.empty) {
        const items = normalizeTestimonialsFromDocs(snap.docs);
        saveLocalTestimonials(items);
        onUpdate(items);
        return;
      }
      const seeded = await ensureTestimonialsSeededIfUninit();
      if (!active) return;
      saveLocalTestimonials(seeded);
      onUpdate(seeded);
    },
    (err) => {
      console.warn('Firestore testimonials live listener notice:', err);
    }
  );

  return () => {
    active = false;
    unsubscribe();
  };
}

export async function syncTestimonialToStorage(item: TestimonialItem): Promise<void> {
  const cleanItem = stripUndefinedDeep({
    id: item.id,
    quote: item.quote.trim(),
    author: item.author.trim(),
    role: item.role.trim() || 'Verified Client',
    highlight: Boolean(item.highlight),
  });

  try {
    await setDoc(doc(db, 'testimonials', cleanItem.id), cleanItem);
    await setDoc(
      doc(db, 'system', TESTIMONIALS_INIT_MARKER_ID),
      { initialized: true, updatedAt: new Date().toISOString() },
      { merge: true }
    ).catch(() => {});
  } catch (e) {
    handleFirestoreError(e, OperationType.WRITE, `testimonials/${cleanItem.id}`);
  }

  const current = getLocalTestimonials();
  const index = current.findIndex((t) => t.id === cleanItem.id);
  const updated =
    index >= 0
      ? current.map((t) => (t.id === cleanItem.id ? cleanItem : t))
      : [...current, cleanItem];

  saveLocalTestimonials(updated);
}

export async function removeTestimonialFromStorage(id: string): Promise<void> {
  try {
    await setDoc(
      doc(db, 'system', TESTIMONIALS_INIT_MARKER_ID),
      { initialized: true, updatedAt: new Date().toISOString() },
      { merge: true }
    ).catch(() => {});
    await deleteDoc(doc(db, 'testimonials', id));
  } catch (e) {
    handleFirestoreError(e, OperationType.DELETE, `testimonials/${id}`);
  }

  const current = getLocalTestimonials();
  const updated = current.filter((t) => t.id !== id);
  saveLocalTestimonials(updated);
}

export async function resetTestimonialsToDefault(): Promise<TestimonialItem[]> {
  try {
    const snap = await getDocs(collection(db, 'testimonials'));
    const defaultIds = new Set(DEFAULT_TESTIMONIALS.map((d) => d.id));
    for (const existingDoc of snap.docs) {
      if (!defaultIds.has(existingDoc.id)) {
        await deleteDoc(doc(db, 'testimonials', existingDoc.id));
      }
    }
    for (const item of DEFAULT_TESTIMONIALS) {
      await setDoc(doc(db, 'testimonials', item.id), stripUndefinedDeep(item));
    }
    await setDoc(doc(db, 'system', TESTIMONIALS_INIT_MARKER_ID), {
      initialized: true,
      updatedAt: new Date().toISOString()
    });
  } catch (e) {
    handleFirestoreError(e, OperationType.WRITE, 'testimonials');
  }
  saveLocalTestimonials(DEFAULT_TESTIMONIALS);
  return DEFAULT_TESTIMONIALS;
}
