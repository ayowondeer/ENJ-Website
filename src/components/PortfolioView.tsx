import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
  ChevronLeft, 
  ChevronRight, 
  ArrowLeft,
  Briefcase,
  ChevronDown
} from 'lucide-react';
import { 
  PortfolioItem, 
  getLocalPortfolio, 
  fetchLivePortfolio, 
  PORTFOLIO_CHANGED_EVENT 
} from '../data/portfolio';

interface PortfolioViewProps {
  onNavigateShop: () => void;
  onNavigateContact: () => void;
}

export default function PortfolioView({ onNavigateShop: _onNavigateShop, onNavigateContact: _onNavigateContact }: PortfolioViewProps) {
  const [items, setItems] = useState<PortfolioItem[]>(() => getLocalPortfolio());
  const [selectedProjectIndex, setSelectedProjectIndex] = useState<number | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);
  const [isPhotoMenuOpen, setIsPhotoMenuOpen] = useState<boolean>(false);
  const [isProjectMenuOpen, setIsProjectMenuOpen] = useState<boolean>(false);

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

  const activeBigImageUrl = currentProjectImages[currentImageIndex] || selectedProject?.imageUrl || '';

  const handleOpenProject = (index: number) => {
    setSelectedProjectIndex(index);
    setCurrentImageIndex(0);
    setIsPhotoMenuOpen(false);
    setIsProjectMenuOpen(false);
  };

  const handleCloseModal = () => {
    setIsPhotoMenuOpen(false);
    setIsProjectMenuOpen(false);
    setSelectedProjectIndex(null);
    setCurrentImageIndex(0);
  };

  // Navigate to previous picture or previous project
  const handlePrevPicture = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsPhotoMenuOpen(false);
    setIsProjectMenuOpen(false);
    if (selectedProjectIndex === null) return;

    if (currentImageIndex > 0) {
      // Step back within current project's photos
      setCurrentImageIndex(prev => prev - 1);
    } else {
      // Jump to previous project
      const prevProjIdx = (selectedProjectIndex - 1 + items.length) % items.length;
      setSelectedProjectIndex(prevProjIdx);
      const prevProj = items[prevProjIdx];
      const prevImages = [prevProj.imageUrl, ...(prevProj.gallery || []).filter(img => img !== prevProj.imageUrl)];
      setCurrentImageIndex(Math.max(0, prevImages.length - 1));
    }
  }, [currentImageIndex, selectedProjectIndex, items]);

  // Navigate to next picture or next project
  const handleNextPicture = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsPhotoMenuOpen(false);
    setIsProjectMenuOpen(false);
    if (selectedProjectIndex === null) return;

    if (currentImageIndex < currentProjectImages.length - 1) {
      // Step forward within current project's photos
      setCurrentImageIndex(prev => prev + 1);
    } else {
      // Advance to next project
      const nextProjIdx = (selectedProjectIndex + 1) % items.length;
      setSelectedProjectIndex(nextProjIdx);
      setCurrentImageIndex(0);
    }
  }, [currentImageIndex, currentProjectImages.length, selectedProjectIndex, items]);

  // Lock background scroll completely when modal is open
  useEffect(() => {
    if (selectedProjectIndex === null) return;
    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    const originalTouchAction = document.body.style.touchAction;

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (isPhotoMenuOpen || isProjectMenuOpen) {
          setIsPhotoMenuOpen(false);
          setIsProjectMenuOpen(false);
        } else {
          handleCloseModal();
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setIsPhotoMenuOpen(false);
        setIsProjectMenuOpen(false);
        handlePrevPicture();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setIsPhotoMenuOpen(false);
        setIsProjectMenuOpen(false);
        handleNextPicture();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
      document.body.style.touchAction = originalTouchAction;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedProjectIndex, handlePrevPicture, handleNextPicture]);

  // Touch swipe support on mobile devices
  const touchStartX = React.useRef<number | null>(null);
  const touchStartY = React.useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const deltaX = touchEndX - touchStartX.current;
    const deltaY = touchEndY - touchStartY.current;

    // Minimum swipe threshold of 35px and verify horizontal trajectory
    if (Math.abs(deltaX) > 35 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
      if (deltaX < 0) {
        // Swiped left -> Next picture
        handleNextPicture();
      } else {
        // Swiped right -> Previous picture
        handlePrevPicture();
      }
    }

    touchStartX.current = null;
    touchStartY.current = null;
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 animate-in fade-in duration-300 pt-2 pb-16">
      
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

      {/* 2. MOSAIC PICTURE GRID (Matching user reference layout: Row 1 [2 cols + 1 col], Row 2 [1 + 1 + 1], Row 3 [1 + 2 cols]) */}
      {items.length === 0 ? (
        <div className="p-12 text-center rounded-[28px] apple-liquid-glass border border-white/90 shadow-xs mb-10 overflow-hidden relative">
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
              // Row 1, Left: Wide (2 cols)
              mosaicSpanClass = 'col-span-2 h-44 sm:h-64 md:h-80';
            } else if (patternIndex === 1) {
              // Row 1, Right: Normal (1 col)
              mosaicSpanClass = 'col-span-1 h-44 sm:h-64 md:h-80';
            } else if (patternIndex === 2 || patternIndex === 3 || patternIndex === 4) {
              // Row 2: 3 equal columns (1 + 1 + 1)
              mosaicSpanClass = 'col-span-1 h-36 sm:h-52 md:h-64';
            } else if (patternIndex === 5) {
              // Row 3, Left: Normal (1 col)
              mosaicSpanClass = 'col-span-1 h-44 sm:h-64 md:h-80';
            } else if (patternIndex === 6) {
              // Row 3, Right: Wide (2 cols)
              mosaicSpanClass = 'col-span-2 h-44 sm:h-64 md:h-80';
            }

            return (
              <div
                key={project.id}
                onClick={() => handleOpenProject(index)}
                className={`group relative rounded-[18px] sm:rounded-[24px] overflow-hidden cursor-pointer touch-action-card transition-all duration-300 hover:shadow-2xl hover:scale-[1.015] active:scale-[0.985] bg-gray-100 border border-white/90 shadow-xs ${mosaicSpanClass}`}
              >
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

      {/* 3. FULL-SCREEN PICTURE LIGHTBOX OVERLAY WITH TOUCH SWIPE & 3-COLUMN TOP BAR */}
      {selectedProject && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[9999] w-screen h-[100dvh] overflow-hidden select-none overscroll-none touch-none bg-black"
          onClick={() => {
            if (isPhotoMenuOpen || isProjectMenuOpen) {
              setIsPhotoMenuOpen(false);
              setIsProjectMenuOpen(false);
              return;
            }
            handleCloseModal();
          }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Ambient blurred backdrop of the current photo for seamless edge-to-edge glow */}
          <img 
            src={activeBigImageUrl} 
            alt="" 
            aria-hidden="true" 
            className="absolute inset-0 w-full h-full object-cover blur-3xl scale-110 opacity-70 pointer-events-none select-none transition-all duration-300"
          />
          <div className="absolute inset-0 bg-black/40 pointer-events-none" />

          {/* Main Picture Fitting the Screen (Fit without cropping) */}
          <div 
            className="absolute inset-0 w-full h-full flex items-center justify-center p-2 sm:p-4 overflow-hidden"
            onClick={(e) => {
              e.stopPropagation();
              if (isPhotoMenuOpen || isProjectMenuOpen) {
                setIsPhotoMenuOpen(false);
                setIsProjectMenuOpen(false);
              }
            }}
          >
            <img 
              key={activeBigImageUrl}
              src={activeBigImageUrl} 
              alt={selectedProject.title}
              className="w-full h-full object-contain select-none transition-all duration-300 animate-in fade-in"
            />
          </div>

          {/* Floating Top Bar: 3-column layout (Left: Back Button, Middle: Photo count expander, Right: Project count expander) */}
          <div 
            className="absolute top-0 inset-x-0 z-40 grid grid-cols-3 items-center px-3 sm:px-6 md:px-8 pointer-events-none"
            style={{
              paddingTop: 'max(1rem, env(safe-area-inset-top, 20px))',
              paddingBottom: '0.75rem'
            }}
          >
            {/* Left: Circle back button to return to portfolio layout */}
            <div className="flex items-center justify-start pointer-events-auto">
              <button
                type="button"
                onClick={handleCloseModal}
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full apple-floating-glass flex items-center justify-center text-gray-900 active:scale-90 transition-all cursor-pointer touch-action-btn relative overflow-hidden group shrink-0 shadow-xs"
                aria-label="Back to portfolio"
                title="Back to portfolio"
              >
                <div className="specular-highlight opacity-40" />
                <ArrowLeft className="w-5 h-5 sm:w-5.5 sm:h-5.5 text-gray-900 group-hover:-translate-x-0.5 transition-transform" />
              </button>
            </div>

            {/* Middle: Photo count pill with tap-to-expand number selector */}
            <div className="relative flex items-center justify-center pointer-events-auto">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPhotoMenuOpen(prev => !prev);
                  setIsProjectMenuOpen(false);
                }}
                className={`apple-floating-glass px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-[11px] sm:text-xs font-semibold text-gray-900 tracking-wide relative overflow-hidden shadow-xs whitespace-nowrap cursor-pointer touch-action-btn transition-all flex items-center gap-1.5 ${
                  isPhotoMenuOpen ? 'ring-2 ring-black/25 scale-[1.03]' : 'hover:scale-[1.02]'
                }`}
                title="Select photo number"
                aria-expanded={isPhotoMenuOpen}
              >
                <div className="specular-highlight opacity-40" />
                <span className="relative z-10">Photo {currentImageIndex + 1} of {currentProjectImages.length}</span>
                <ChevronDown className={`w-3 h-3 text-gray-700 transition-transform duration-200 relative z-10 ${isPhotoMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Photo Selector Popover (Expands on that position) */}
              {isPhotoMenuOpen && (
                <div 
                  className="absolute top-full mt-2 left-1/2 -translate-x-1/2 apple-floating-glass p-2.5 rounded-[22px] shadow-2xl border border-white/95 flex flex-col items-center gap-2 min-w-[150px] max-w-[280px] animate-ios-slide-up z-50 overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="specular-highlight opacity-40" />
                  <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider text-center relative z-10">
                    Select Photo
                  </span>
                  <div className="flex flex-wrap items-center justify-center gap-1.5 relative z-10">
                    {currentProjectImages.map((_, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentImageIndex(idx);
                          setIsPhotoMenuOpen(false);
                        }}
                        className={`w-8 h-8 rounded-full text-xs font-semibold transition-all cursor-pointer touch-action-btn flex items-center justify-center ${
                          currentImageIndex === idx
                            ? 'bg-black text-white shadow-xs font-bold scale-110'
                            : 'bg-black/5 hover:bg-black/15 text-gray-900'
                        }`}
                      >
                        {idx + 1}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right: Project Counter pill (NO word 'Project', just numbers) with tap-to-expand number selector */}
            <div className="relative flex items-center justify-end pointer-events-auto">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsProjectMenuOpen(prev => !prev);
                  setIsPhotoMenuOpen(false);
                }}
                className={`apple-floating-glass px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-full text-[11px] sm:text-xs font-mono font-medium text-gray-900 relative overflow-hidden shadow-xs whitespace-nowrap cursor-pointer touch-action-btn transition-all flex items-center gap-1.5 ${
                  isProjectMenuOpen ? 'ring-2 ring-black/25 scale-[1.03]' : 'hover:scale-[1.02]'
                }`}
                title="Select project number"
                aria-expanded={isProjectMenuOpen}
              >
                <div className="specular-highlight opacity-40" />
                <span className="relative z-10">{selectedProjectIndex! + 1} of {items.length}</span>
                <ChevronDown className={`w-3 h-3 text-gray-700 transition-transform duration-200 relative z-10 ${isProjectMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Project Selector Popover (Expands on that position) */}
              {isProjectMenuOpen && (
                <div 
                  className="absolute top-full mt-2 right-0 apple-floating-glass p-2.5 rounded-[22px] shadow-2xl border border-white/95 flex flex-col gap-2 min-w-[190px] max-w-[280px] animate-ios-slide-up z-50 overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="specular-highlight opacity-40" />
                  <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider text-center relative z-10">
                    Jump to Number
                  </span>
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5 max-h-[220px] overflow-y-auto relative z-10 p-0.5">
                    {items.map((proj, idx) => (
                      <button
                        key={proj.id || idx}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenProject(idx);
                          setIsProjectMenuOpen(false);
                        }}
                        title={proj.title}
                        className={`h-8 rounded-xl text-xs font-semibold transition-all cursor-pointer touch-action-btn flex items-center justify-center ${
                          selectedProjectIndex === idx
                            ? 'bg-black text-white shadow-xs font-bold scale-110'
                            : 'bg-black/5 hover:bg-black/15 text-gray-900'
                        }`}
                      >
                        {idx + 1}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Left Arrow Button (Prev) - Hidden on mobile, visible on desktop (desktop navigation) */}
          <button
            type="button"
            onClick={handlePrevPicture}
            className="hidden md:flex absolute left-4 lg:left-8 top-1/2 -translate-y-1/2 w-12 h-12 lg:w-14 lg:h-14 rounded-full apple-floating-glass text-gray-900 items-center justify-center active:scale-90 transition-all cursor-pointer touch-action-btn z-40 overflow-hidden group shadow-xs"
            aria-label="Previous picture"
            title="Previous picture (Left Arrow key)"
          >
            <div className="specular-highlight opacity-40" />
            <ChevronLeft className="w-6 h-6 lg:w-7 lg:h-7 text-gray-900 group-hover:-translate-x-0.5 transition-transform" />
          </button>

          {/* Right Arrow Button (Next) - Hidden on mobile, visible on desktop (desktop navigation) */}
          <button
            type="button"
            onClick={handleNextPicture}
            className="hidden md:flex absolute right-4 lg:right-8 top-1/2 -translate-y-1/2 w-12 h-12 lg:w-14 lg:h-14 rounded-full apple-floating-glass text-gray-900 items-center justify-center active:scale-90 transition-all cursor-pointer touch-action-btn z-40 overflow-hidden group shadow-xs"
            aria-label="Next picture"
            title="Next picture (Right Arrow key)"
          >
            <div className="specular-highlight opacity-40" />
            <ChevronRight className="w-6 h-6 lg:w-7 lg:h-7 text-gray-900 group-hover:translate-x-0.5 transition-transform" />
          </button>

          {/* Bottom Floating Capsule: Project Title with black text for high visibility */}
          <div 
            className="absolute bottom-5 sm:bottom-7 inset-x-0 z-40 flex justify-center px-4 pointer-events-none"
            style={{
              paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 12px))'
            }}
          >
            <div 
              className="pointer-events-auto inline-flex items-center justify-center px-5 py-2 sm:py-2.5 rounded-full apple-floating-glass max-w-[min(90vw,600px)] text-center relative overflow-hidden shadow-xs"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="specular-highlight opacity-40" />
              <span className="font-display text-xs sm:text-sm font-semibold tracking-tight text-gray-900 truncate relative z-10">
                {selectedProject.title}
              </span>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
