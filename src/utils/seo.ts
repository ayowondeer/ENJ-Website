/**
 * Dynamic SEO and OpenGraph metadata manager for ENJ Digital Concept.
 * Configures specific page titles, meta descriptions, OpenGraph tags,
 * Twitter cards, canonical links, and Schema.org JSON-LD structured data.
 */

export type PageType = 'home' | 'portfolio' | 'shop' | 'company' | 'contact' | 'admin';

export interface PageSEOConfig {
  title: string;
  description: string;
  keywords: string;
  ogType: 'website' | 'article' | 'product';
  canonicalHash: string;
  robots: string;
  structuredData: Record<string, unknown>;
}

export const PAGE_SEO_MAP: Record<PageType, PageSEOConfig> = {
  home: {
    title: 'ENJ Digital Concept — High-Quality Prints & General Supply',
    description: 'Premier digital printing, architectural 3D signage, corporate branding, solar renewable energy installations, and general procurement supplies in Maiduguri, Borno State, Nigeria.',
    keywords: 'printing press Maiduguri, digital printing Nigeria, 3D channel letters, vehicle branding, solar installations Borno, corporate monogramming, office supply procurement',
    ogType: 'website',
    canonicalHash: '',
    robots: 'index, follow',
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      name: 'ENJ Digital Concept',
      description: 'High-quality print, signage, general supplies, renewable energy, and digital printing solutions in Maiduguri, Nigeria.',
      url: typeof window !== 'undefined' ? window.location.origin : '',
      telephone: '+234 803 266 0148',
      email: 'enjdigitalconcept@gmail.com',
      address: {
        '@type': 'PostalAddress',
        streetAddress: 'Commercial Layout, Maiduguri',
        addressLocality: 'Maiduguri',
        addressRegion: 'Borno State',
        addressCountry: 'NG'
      },
      priceRange: '₦₦',
      openingHours: 'Mo,Tu,We,Th,Fr,Sa 08:00-18:00',
      areaServed: 'Nigeria'
    }
  },
  portfolio: {
    title: 'Portfolio & Projects — ENJ Digital Concept',
    description: 'Explore our portfolio of completed projects: 3D illuminated architectural signage, commercial solar installations, grand format flex backdrops, vehicle wraps, and custom apparel.',
    keywords: 'ENJ portfolio, print samples Nigeria, architectural signage portfolio, commercial solar projects, custom branded apparel showcase, flex banner installations, Maiduguri print projects',
    ogType: 'website',
    canonicalHash: '#portfolio',
    robots: 'index, follow',
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'Portfolio & Projects — ENJ Digital Concept',
      description: 'A showcase of architectural branding, commercial print installations, solar energy deployments, and custom apparel executed across Nigeria.',
      publisher: {
        '@type': 'Organization',
        name: 'ENJ Digital Concept'
      }
    }
  },
  shop: {
    title: 'Store & Products — ENJ Digital Concept',
    description: 'Order custom branded polo shirts, large-format flex banners, corporate brochures, acrylic crystal awards, and safety gear online with secure Paystack checkout and fast delivery in Nigeria.',
    keywords: 'online print shop Nigeria, buy custom shirts Maiduguri, print banners online, order award plaques Nigeria, Paystack print checkout, ENJ merchandise',
    ogType: 'website',
    canonicalHash: '#shop',
    robots: 'index, follow',
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'Store',
      name: 'ENJ Digital Concept Store',
      description: 'Online store for custom corporate apparel, large-format prints, marketing stationery, and recognition awards with instant Paystack checkout.',
      currenciesAccepted: 'NGN',
      paymentAccepted: 'Card, Bank Transfer, USSD, Paystack'
    }
  },
  company: {
    title: 'About Us & Company Profile — ENJ Digital Concept',
    description: 'Learn about ENJ Digital Concept, our industrial printing equipment, corporate leadership, core values, quality assurance standards, and multi-sector supply footprint in Nigeria.',
    keywords: 'about ENJ Digital Concept, printing company Borno, corporate print contractor, company profile ENJ, print press machinery Nigeria, sustainable energy Maiduguri',
    ogType: 'website',
    canonicalHash: '#company',
    robots: 'index, follow',
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'AboutPage',
      name: 'About ENJ Digital Concept',
      description: 'Corporate history, technical capacity, and procurement solutions of ENJ Digital Concept.',
      mainEntity: {
        '@type': 'Organization',
        name: 'ENJ Digital Concept',
        foundingLocation: 'Maiduguri, Borno State, Nigeria',
        description: 'Multi-sector industrial printing, architectural branding, and procurement services provider.'
      }
    }
  },
  contact: {
    title: 'Contact Us & Request a Quote — ENJ Digital Concept',
    description: 'Contact ENJ Digital Concept for immediate quotes on custom printing, 3D signage, solar energy systems, or bulk procurement. Chat on WhatsApp or visit our Maiduguri office.',
    keywords: 'contact ENJ Digital Concept, printing quote Maiduguri, customer care ENJ, print press phone number Borno, request quote signage, WhatsApp print order',
    ogType: 'website',
    canonicalHash: '#contact',
    robots: 'index, follow',
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'ContactPage',
      name: 'Contact ENJ Digital Concept',
      description: 'Direct contact details, quotation request form, phone numbers, and location map for ENJ Digital Concept in Maiduguri, Nigeria.',
      mainEntity: {
        '@type': 'Organization',
        name: 'ENJ Digital Concept',
        telephone: '+234 803 266 0148',
        email: 'enjdigitalconcept@gmail.com'
      }
    }
  },
  admin: {
    title: 'Merchant Admin Portal — ENJ Store Manager',
    description: 'Secure administration portal for managing inventory, orders, products, and portfolio items for ENJ Digital Concept.',
    keywords: 'admin, store manager, inventory',
    ogType: 'website',
    canonicalHash: '#admin',
    robots: 'noindex, nofollow',
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'ENJ Store Manager',
      applicationCategory: 'BusinessApplication'
    }
  }
};

/**
 * Updates DOM head elements (document.title, meta tags, OpenGraph, Twitter, canonical, JSON-LD)
 * for the currently active page.
 */
export function applySEOForPage(page: PageType): void {
  if (typeof document === 'undefined') return;

  const config = PAGE_SEO_MAP[page] || PAGE_SEO_MAP.home;

  // 1. Page Title
  document.title = config.title;

  // Helper to query or create meta tags
  const setMeta = (attrName: 'name' | 'property', attrValue: string, content: string) => {
    let el = document.querySelector<HTMLMetaElement>(`meta[${attrName}="${attrValue}"]`);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attrName, attrValue);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  };

  // 2. Standard Search Engine Meta
  setMeta('name', 'description', config.description);
  setMeta('name', 'keywords', config.keywords);
  setMeta('name', 'robots', config.robots);

  // 3. OpenGraph Social Cards
  setMeta('property', 'og:title', config.title);
  setMeta('property', 'og:description', config.description);
  setMeta('property', 'og:type', config.ogType);
  setMeta('property', 'og:site_name', 'ENJ Digital Concept');

  const origin = window.location.origin;
  const currentUrl = `${origin}${window.location.pathname}${config.canonicalHash}`;
  setMeta('property', 'og:url', currentUrl);

  // 4. Twitter Cards
  setMeta('name', 'twitter:card', 'summary_large_image');
  setMeta('name', 'twitter:title', config.title);
  setMeta('name', 'twitter:description', config.description);

  // 5. Canonical Link
  let canonicalEl = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!canonicalEl) {
    canonicalEl = document.createElement('link');
    canonicalEl.setAttribute('rel', 'canonical');
    document.head.appendChild(canonicalEl);
  }
  canonicalEl.setAttribute('href', currentUrl);

  // 6. Schema.org JSON-LD Structured Data
  let scriptEl = document.getElementById('enj-schema-ld-json') as HTMLScriptElement | null;
  if (!scriptEl) {
    scriptEl = document.createElement('script');
    scriptEl.id = 'enj-schema-ld-json';
    scriptEl.type = 'application/ld+json';
    document.head.appendChild(scriptEl);
  }
  scriptEl.textContent = JSON.stringify(config.structuredData, null, 2);
}
