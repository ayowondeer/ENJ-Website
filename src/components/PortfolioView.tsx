import React, { useState, useEffect, useCallback } from 'react';
import { Briefcase } from 'lucide-react';
import { 
  PortfolioItem, 
  getLocalPortfolio, 
  fetchLivePortfolio, 
  PORTFOLIO_CHANGED_EVENT 
} from '../data/portfolio';
import LiquidGlassLightbox from './LiquidGlassLightbox';

interface PortfolioViewProps {
  onNavigateShop: () => void;
  onNavigateContact: () => void;
}

export default function PortfolioView({ onNavigateShop: _onNavigateShop, onNavigateContact: _onNavigateContact }: PortfolioViewProps) {
  const [items, setItems] = useState<PortfolioItem[]>(() => getLocalPortfolio());
  const [selectedProjectIndex, setSelectedProjectIndex] = useState<number | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);

  // Sync portfolio from Firestore and listen to local updates
  useEffect(() => {
    let isMounted = true;
    fetchLivePortfolio().then(liveList => {
      if (isMounted && liveList.length > 0) {
        setItems(liveList);
      }
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

  const handleOpenProject = (index: number) => {
    setSelectedProjectIndex(index);
    setCurrentImageIndex(0);
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

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 animate-fluid-page pt-2 pb-16 relative isolate">
      {/* Ambient Apple Liquid Glass Refraction Mesh */}
      <div className="fixed inset-0 pointer-events-none -z-10 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(244,123,32,0.08),rgba(255,255,255,0))]" />
      <div className="fixed inset-0 pointer-events-none -z-10 bg-[radial-gradient(ellipse_60%_50%_at_85%_85%,rgba(124,156,200,0.08),rgba(255,255,255,0))]" />
      
      {/* 1. CLEAN HEADER (Categories removed completely) */}
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
            A showcase of architectural branding, commercial print installations, solar energy deployments, and custom apparel executed for clients across Nigeria.
          </p>
        </div>
      </div>

      {/* 2. MOSAIC PICTURE GRID */}
      {items.length === 0 ? (
        <div className="p-12 text-center rounded-[28px] apple-liquid-glass mb-10 overflow-hidden relative">
          <div className="specular-highlight opacity-50" />
          <Briefcase className="w-8 h-8 mx-auto text-gray-300 mb-2.5 relative z-10" />
          <h3 className="text-sm font-semibold text-gray-900 relative z-10">No projects to display</h3>
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
                onClick={() => handleOpenProject(index)}
                className={`group relative rounded-[18px] sm:rounded-[24px] overflow-hidden cursor-pointer touch-action-card transition-all duration-300 hover:shadow-2xl hover:scale-[1.015] active:scale-[0.985] bg-gray-100 border-[0.5px] border-white/60 shadow-[inset_0_0.5px_0.5px_rgba(255,255,255,0.75),0_8px_24px_-4px_rgba(0,0,0,0.06)] ${mosaicSpanClass}`}
              >
                <div className="specular-highlight opacity-40 z-10" />
                <img 
                  src={project.imageUrl} 
                  alt={project.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
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


