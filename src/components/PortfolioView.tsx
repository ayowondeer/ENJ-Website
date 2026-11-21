import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Briefcase } from 'lucide-react';
import { 
  PortfolioItem, 
  getLocalPortfolio, 
  fetchLivePortfolio, 
  subscribePortfolio,
  preloadPortfolioImages,
  PORTFOLIO_CHANGED_EVENT 
} from '../data/portfolio';
import LiquidGlassLightbox from './LiquidGlassLightbox';

interface PortfolioViewProps {
  onNavigateShop: () => void;
  onNavigateContact: () => void;
}

interface ProgressiveImageProps {
  src: string;
  alt: string;
  idxHint?: number;
  priority?: boolean;
  lazy?: boolean;
  onFallback: (e: React.SyntheticEvent<HTMLImageElement>, idxHint?: number) => void;
}

function ProgressivePortfolioImage({
  src,
  alt,
  idxHint,
  priority = false,
  lazy = false,
  onFallback
}: ProgressiveImageProps) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) {
      setLoaded(true);
    } else {
      setLoaded(false);
    }
  }, [src]);

  return (
    <>
      {!loaded && (
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-br from-neutral-200/80 via-neutral-100/90 to-neutral-200/80 animate-pulse"
        />
      )}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        referrerPolicy="no-referrer"
        loading={lazy ? 'lazy' : 'eager'}
        decoding="async"
        fetchPriority={priority ? 'high' : 'auto'}
        onLoad={() => setLoaded(true)}
        onError={(e) => {
          onFallback(e, idxHint);
          setLoaded(true);
        }}
        className={`w-full h-full object-cover group-hover:scale-105 transition-all duration-300 ${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </>
  );
}

export default function PortfolioView({ onNavigateShop: _onNavigateShop, onNavigateContact: _onNavigateContact }: PortfolioViewProps) {
  const [items, setItems] = useState<PortfolioItem[]>(() => getLocalPortfolio());
  const [selectedProjectIndex, setSelectedProjectIndex] = useState<number | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);

  // Sync portfolio from Firestore (live + initial fetch) and listen to local updates
  useEffect(() => {
    preloadPortfolioImages();
    let isMounted = true;
    fetchLivePortfolio().then(liveList => {
      if (isMounted) {
        setItems(prev => {
          if (JSON.stringify(prev) === JSON.stringify(liveList)) return prev;
          return liveList;
        });
      }
    });

    const unsubLive = subscribePortfolio((liveList) => {
      if (!isMounted) return;
      setItems(prev => {
        if (JSON.stringify(prev) === JSON.stringify(liveList)) return prev;
        return liveList;
      });
    });

    const handleStorageChange = (e: Event) => {
      const customEvent = e as CustomEvent<PortfolioItem[]>;
      if (customEvent.detail) {
        setItems(customEvent.detail);
      } else {
        setItems(getLocalPortfolio());
      }
    };

    window.addEventListener(PORTFOLIO_CHANGED_EVENT, handleStorageChange);
    return () => {
      isMounted = false;
      unsubLive();
      window.removeEventListener(PORTFOLIO_CHANGED_EVENT, handleStorageChange);
    };
  }, []);

  const selectedProject = selectedProjectIndex !== null && items[selectedProjectIndex] 
    ? items[selectedProjectIndex] 
    : null;

  // Compile list of unique images for the current active project
  const currentProjectImages = React.useMemo(() => {
    if (!selectedProject) return [];
    const list = [selectedProject.imageUrl];
    if (Array.isArray(selectedProject.gallery)) {
      selectedProject.gallery.forEach(img => {
        if (img && !list.includes(img)) list.push(img);
      });
    }
    return list;
  }, [selectedProject]);

  const handleOpenProject = (index: number, initialImageIndex: number = 0) => {
    setSelectedProjectIndex(index);
    setCurrentImageIndex(initialImageIndex);
  };

  const handleCloseModal = () => {
    setSelectedProjectIndex(null);
    setCurrentImageIndex(0);
  };

  // Navigate to previous picture or previous project
  const handlePrevPicture = useCallback(() => {
    if (selectedProjectIndex === null) return;

    if (currentImageIndex > 0) {
      setCurrentImageIndex(prev => prev - 1);
    } else {
      const prevProjIdx = (selectedProjectIndex - 1 + items.length) % items.length;
      setSelectedProjectIndex(prevProjIdx);
      const prevProj = items[prevProjIdx];
      const prevImages = [prevProj.imageUrl, ...(prevProj.gallery || []).filter(img => img !== prevProj.imageUrl)];
      setCurrentImageIndex(Math.max(0, prevImages.length - 1));
    }
  }, [currentImageIndex, selectedProjectIndex, items]);

  // Navigate to next picture or next project
  const handleNextPicture = useCallback(() => {
    if (selectedProjectIndex === null) return;

    if (currentImageIndex < currentProjectImages.length - 1) {
      setCurrentImageIndex(prev => prev + 1);
    } else {
      const nextProjIdx = (selectedProjectIndex + 1) % items.length;
      setSelectedProjectIndex(nextProjIdx);
      setCurrentImageIndex(0);
    }
  }, [currentImageIndex, currentProjectImages.length, selectedProjectIndex, items]);

  // Showcase gallery for single-project view
  const singleProjectGallery = React.useMemo(() => {
    if (items.length !== 1) return [];
    const p = items[0];
    const list = [p.imageUrl];
    if (Array.isArray(p.gallery)) {
      p.gallery.forEach(img => {
        if (img && !list.includes(img)) list.push(img);
      });
    }
    return list;
  }, [items]);

  const handleImageFallback = useCallback((e: React.SyntheticEvent<HTMLImageElement>, idxHint?: number) => {
    const img = e.currentTarget;
    if (img.dataset.fallbackApplied) return;
    img.dataset.fallbackApplied = '1';
    const src = img.getAttribute('src') || '';
    if (src.includes('eyn-orange-front') || src.includes('eyn_orange_shirt_front')) {
      img.src = '/portfolio/eyn-orange-front.jpg';
    } else if (src.includes('eyn-white-front') || src.includes('eyn_white_shirt_front')) {
      img.src = '/portfolio/eyn-white-front.jpg';
    } else if (src.includes('eyn-white-back') || src.includes('eyn_white_shirt_back')) {
      img.src = '/portfolio/eyn-white-back.jpg';
    } else if (src.includes('eyn-folded-stack') || src.includes('eyn_folded_batch_stack')) {
      img.src = '/portfolio/eyn-folded-stack.jpg';
    } else if (src.includes('eyn-heat-press') || src.includes('eyn_heat_press_transfer')) {
      img.src = '/portfolio/eyn-heat-press.jpg';
    } else if (src.includes('black_press') || src.includes('black-press') || idxHint === 1) {
      img.src = '/jdpi-black-press.jpg';
    } else if (src.includes('press_detail') || src.includes('press-detail') || idxHint === 2) {
      img.src = '/jdpi-press-detail.jpg';
    } else {
      img.src = '/jdpi-blue-shirt.jpg';
    }
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 animate-fluid-page pt-2 pb-16 relative isolate">
      {/* Ambient Apple Liquid Glass Refraction Mesh */}
      <div className="fixed inset-0 pointer-events-none -z-10 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(244,123,32,0.08),rgba(255,255,255,0))]" />
      <div className="fixed inset-0 pointer-events-none -z-10 bg-[radial-gradient(ellipse_60%_50%_at_85%_85%,rgba(124,156,200,0.08),rgba(255,255,255,0))]" />
      
      {/* 1. CLEAN HEADER */}
      <div className="grid grid-cols-1 md:grid-cols-2 items-end gap-6 mb-8">
        <div>
          <p className="text-[10px] font-bold tracking-widest text-[#6e6e73] uppercase mb-1.5">
            Portfolio & Projects
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-medium tracking-tight text-[#1d1d1f] leading-tight">
            Our Work.
          </h1>
        </div>
        <div>
          <p className="text-[#6e6e73] text-xs sm:text-sm leading-relaxed">
            Custom apparel printing, brand identity, and commercial production crafted with precision.
          </p>
        </div>
      </div>

      {/* 2. MOSAIC PICTURE GRID */}
      {items.length === 0 ? (
        <div className="p-12 text-center rounded-[24px] sm:rounded-[32px] apple-liquid-glass mb-10 overflow-hidden relative">
          <div className="specular-highlight opacity-50" />
          <Briefcase className="w-8 h-8 mx-auto text-gray-300 mb-2.5 relative z-10" />
          <h3 className="text-sm font-semibold text-gray-900 relative z-10">No projects to display</h3>
        </div>
      ) : items.length === 1 ? (
        <div className="mb-16 space-y-5">
          {singleProjectGallery.length >= 3 ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3.5 md:gap-4">
              <div
                onClick={() => handleOpenProject(0, 0)}
                className="group relative sm:col-span-2 h-64 sm:h-[360px] md:h-[420px] rounded-[20px] sm:rounded-[24px] overflow-hidden cursor-pointer touch-action-card transition-all duration-300 ease-liquid-spring hover:shadow-2xl hover:scale-[1.012] active:scale-[0.985] bg-gray-100 border-[0.5px] border-white/60 shadow-[inset_0_0.5px_0.5px_rgba(255,255,255,0.75),0_8px_24px_-4px_rgba(0,0,0,0.06)]"
              >
                <div className="specular-highlight opacity-65 z-10" />
                <ProgressivePortfolioImage
                  src={singleProjectGallery[0]}
                  alt={`${items[0].title} — Primary view`}
                  idxHint={0}
                  priority
                  onFallback={handleImageFallback}
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-1 gap-2.5 sm:gap-3.5 md:gap-4">
                {singleProjectGallery.slice(1, 3).map((imgUrl, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleOpenProject(0, idx + 1)}
                    className="group relative h-36 sm:h-[173px] md:h-[202px] rounded-[20px] sm:rounded-[24px] overflow-hidden cursor-pointer touch-action-card transition-all duration-300 ease-liquid-spring hover:shadow-2xl hover:scale-[1.015] active:scale-[0.985] bg-gray-100 border-[0.5px] border-white/60 shadow-[inset_0_0.5px_0.5px_rgba(255,255,255,0.75),0_8px_24px_-4px_rgba(0,0,0,0.06)]"
                  >
                    <div className="specular-highlight opacity-65 z-10" />
                    <ProgressivePortfolioImage
                      src={imgUrl}
                      alt={`${items[0].title} — View ${idx + 2}`}
                      idxHint={idx + 1}
                      priority
                      onFallback={handleImageFallback}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {singleProjectGallery.map((imgUrl, idx) => (
                <div
                  key={idx}
                  onClick={() => handleOpenProject(0, idx)}
                  className={`group relative rounded-[20px] sm:rounded-[24px] overflow-hidden cursor-pointer touch-action-card transition-all duration-300 ease-liquid-spring hover:shadow-2xl hover:scale-[1.012] active:scale-[0.985] bg-gray-100 border-[0.5px] border-white/60 shadow-[inset_0_0.5px_0.5px_rgba(255,255,255,0.75),0_8px_24px_-4px_rgba(0,0,0,0.06)] ${
                    singleProjectGallery.length === 1 ? 'sm:col-span-2 h-64 sm:h-[380px]' : 'h-56 sm:h-72'
                  }`}
                >
                  <div className="specular-highlight opacity-65 z-10" />
                  <ProgressivePortfolioImage
                    src={imgUrl}
                    alt={items[0].title}
                    idxHint={idx}
                    priority
                    onFallback={handleImageFallback}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5 md:gap-4 mb-16">
          {items.map((project, index) => {
            const patternIndex = index % 7;
            let mosaicSpanClass = 'col-span-1 h-36 sm:h-52 md:h-64';

            if (patternIndex === 0) {
              mosaicSpanClass = 'col-span-2 h-44 sm:h-64 md:h-80';
            } else if (patternIndex === 1) {
              mosaicSpanClass = 'col-span-1 h-44 sm:h-64 md:h-80';
            } else if (patternIndex === 2 || patternIndex === 3 || patternIndex === 4) {
              mosaicSpanClass = 'col-span-1 h-36 sm:h-52 md:h-64';
            } else if (patternIndex === 5) {
              mosaicSpanClass = 'col-span-1 h-44 sm:h-64 md:h-80';
            } else if (patternIndex === 6) {
              mosaicSpanClass = 'col-span-2 h-44 sm:h-64 md:h-80';
            }

            return (
              <div
                key={project.id}
                onClick={() => handleOpenProject(index, 0)}
                className={`group relative rounded-[20px] sm:rounded-[24px] overflow-hidden cursor-pointer touch-action-card transition-all duration-300 ease-liquid-spring hover:shadow-2xl hover:scale-[1.015] active:scale-[0.985] bg-gray-100 border-[0.5px] border-white/60 shadow-[inset_0_0.5px_0.5px_rgba(255,255,255,0.75),0_8px_24px_-4px_rgba(0,0,0,0.06)] ${mosaicSpanClass}`}
              >
                <div className="specular-highlight opacity-65 z-10" />
                <ProgressivePortfolioImage
                  src={project.imageUrl}
                  alt={project.title}
                  priority={index < 3}
                  lazy={index >= 3}
                  onFallback={handleImageFallback}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* 3. APPLE LIQUID GLASS FULL-SCREEN PICTURE LIGHTBOX OVERLAY */}
      {selectedProject && selectedProjectIndex !== null && (
        <LiquidGlassLightbox
          images={currentProjectImages}
          currentImageIndex={currentImageIndex}
          onSelectImageIndex={setCurrentImageIndex}
          title={selectedProject.title}
          description={selectedProject.description}
          onPrev={handlePrevPicture}
          onNext={handleNextPicture}
          onClose={handleCloseModal}
          projectCount={items.length}
          currentProjectIndex={selectedProjectIndex}
          projectTitles={items.map(p => p.title)}
          onSelectProjectIndex={handleOpenProject}
        />
      )}
    </div>
  );
}


