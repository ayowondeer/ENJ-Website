import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
  ChevronLeft, 
  ChevronRight, 
  ArrowLeft,
  Briefcase,
  ChevronDown,
  ChevronUp
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
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState<boolean>(false);

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
    setIsDescriptionExpanded(false);
  };

  const handleCloseModal = () => {
    setIsPhotoMenuOpen(false);
    setIsProjectMenuOpen(false);
    setIsDescriptionExpanded(false);
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
        if (isPhotoMenuOpen || isProjectMenuOpen || isDescriptionExpanded) {
          setIsPhotoMenuOpen(false);
          setIsProjectMenuOpen(false);
          setIsDescriptionExpanded(false);
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
                className={`group relative rounded-[18px] sm:rounded-[24px] overflow-hidden cursor-pointer touch-action-card transition-all duration-300 hover:shadow-2xl hover:scale-[1.015] active:scale-[0.985] bg-gray-100 border border-white/90 shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.85),0_8px_24px_-4px_rgba(0,0,0,0.06)] ${mosaicSpanClass}`}
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

      {/* 3. CLEAN & MINIMAL FULL-SCREEN PICTURE LIGHTBOX OVERLAY */}
      {selectedProject && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[9999] w-screen h-[100dvh] overflow-hidden select-none overscroll-none touch-none bg-neutral-950 animate-fluid-page"
          onClick={() => {
            if (isPhotoMenuOpen || isProjectMenuOpen || isDescriptionExpanded) {
              setIsPhotoMenuOpen(false);
              setIsProjectMenuOpen(false);
              setIsDescriptionExpanded(false);
              return;
            }
            handleCloseModal();
          }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Subtle Ambient Photo Backdrop */}
          <img 
            src={activeBigImageUrl} 
            alt="" 
            aria-hidden="true" 
            className="absolute inset-0 w-full h-full object-cover blur-3xl scale-105 opacity-25 pointer-events-none select-none transition-opacity duration-300"
          />
          <div className="absolute inset-0 bg-black/45 pointer-events-none" />

          {/* Main Picture Fitting Cleanly Inside Viewport */}
          <div 
            className="absolute inset-0 w-full h-full flex items-center justify-center p-4 sm:p-10 md:p-16 pt-20 pb-20 overflow-hidden"
            onClick={(e) => {
              e.stopPropagation();
              if (isPhotoMenuOpen || isProjectMenuOpen || isDescriptionExpanded) {
                setIsPhotoMenuOpen(false);
                setIsProjectMenuOpen(false);
                setIsDescriptionExpanded(false);
              }
            }}
          >
            <img 
              key={activeBigImageUrl}
              src={activeBigImageUrl} 
              alt={selectedProject.title}
              className="max-w-full max-h-full w-auto h-auto object-contain select-none animate-fluid-sheet rounded-lg"
            />
          </div>

          {/* Minimal Top Bar: 3-column layout (Left: Back, Middle: Photo X of Y, Right: X of Y) */}
          <div 
            className="absolute top-0 inset-x-0 z-40 grid grid-cols-3 items-center px-4 sm:px-8 pointer-events-none"
            style={{
              paddingTop: 'max(1rem, env(safe-area-inset-top, 18px))',
              paddingBottom: '0.75rem'
            }}
          >
            {/* Left: Minimal Circle Back Button */}
            <div className="flex items-center justify-start pointer-events-auto">
              <button
                type="button"
                onClick={handleCloseModal}
                className="w-10 h-10 rounded-full apple-floating-glass flex items-center justify-center active:scale-90 transition-all cursor-pointer touch-action-btn group shrink-0"
                aria-label="Back to portfolio"
                title="Back to portfolio"
              >
                <ArrowLeft className="w-4.5 h-4.5 text-[#1d1d1f] group-hover:-translate-x-0.5 transition-transform" />
              </button>
            </div>

            {/* Middle: Minimal Photo Count Pill with Expandable Number Selector */}
            <div className="relative flex items-center justify-center pointer-events-auto">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPhotoMenuOpen(prev => !prev);
                  setIsProjectMenuOpen(false);
                  setIsDescriptionExpanded(false);
                }}
                className={`apple-floating-glass px-3.5 py-2 rounded-full text-xs font-medium whitespace-nowrap cursor-pointer touch-action-btn transition-all flex items-center gap-1.5 ${
                  isPhotoMenuOpen ? 'ring-2 ring-white/60' : ''
                }`}
                title="Select photo number"
                aria-expanded={isPhotoMenuOpen}
              >
                <span className="tabular-nums">Photo {currentImageIndex + 1} of {currentProjectImages.length}</span>
                <ChevronDown className={`w-3 h-3 text-neutral-500 transition-transform duration-200 ${isPhotoMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Minimal Photo Number Selector */}
              {isPhotoMenuOpen && (
                <div 
                  className="absolute top-full mt-2 left-1/2 -translate-x-1/2 apple-floating-glass p-2 rounded-[20px] flex flex-wrap items-center justify-center gap-1.5 min-w-[120px] max-w-[240px] animate-fluid-sheet z-50"
                  onClick={(e) => e.stopPropagation()}
                >
                  {currentProjectImages.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentImageIndex(idx);
                        setIsPhotoMenuOpen(false);
                      }}
                      className={`w-8 h-8 rounded-full text-xs font-medium tabular-nums transition-all cursor-pointer touch-action-btn flex items-center justify-center ${
                        currentImageIndex === idx
                          ? 'bg-[#1d1d1f] text-white font-semibold shadow-xs'
                          : 'bg-black/5 hover:bg-black/10 text-[#1d1d1f]'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Minimal Number Counter (No word 'Project') with Expandable Number Selector */}
            <div className="relative flex items-center justify-end pointer-events-auto">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsProjectMenuOpen(prev => !prev);
                  setIsPhotoMenuOpen(false);
                  setIsDescriptionExpanded(false);
                }}
                className={`apple-floating-glass px-3.5 py-2 rounded-full text-xs font-medium whitespace-nowrap cursor-pointer touch-action-btn transition-all flex items-center gap-1.5 ${
                  isProjectMenuOpen ? 'ring-2 ring-white/60' : ''
                }`}
                title="Select project number"
                aria-expanded={isProjectMenuOpen}
              >
                <span className="tabular-nums">{selectedProjectIndex! + 1} of {items.length}</span>
                <ChevronDown className={`w-3 h-3 text-neutral-500 transition-transform duration-200 ${isProjectMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Minimal Project Number Selector */}
              {isProjectMenuOpen && (
                <div 
                  className="absolute top-full mt-2 right-0 apple-floating-glass p-2 rounded-[20px] grid grid-cols-4 sm:grid-cols-5 gap-1.5 min-w-[160px] max-w-[240px] max-h-[200px] overflow-y-auto animate-fluid-sheet z-50"
                  onClick={(e) => e.stopPropagation()}
                >
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
                      className={`h-8 rounded-xl text-xs font-medium tabular-nums transition-all cursor-pointer touch-action-btn flex items-center justify-center ${
                        selectedProjectIndex === idx
                          ? 'bg-[#1d1d1f] text-white font-semibold shadow-xs'
                          : 'bg-black/5 hover:bg-black/10 text-[#1d1d1f]'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Left Proximity Hover Zone + Prev Button - Desktop Only */}
          <div
            className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 w-36 lg:w-48 h-64 items-center justify-start pl-5 lg:pl-8 z-40 group/prev"
            onClick={(e) => {
              e.stopPropagation();
              if (isPhotoMenuOpen || isProjectMenuOpen || isDescriptionExpanded) {
                setIsPhotoMenuOpen(false);
                setIsProjectMenuOpen(false);
                setIsDescriptionExpanded(false);
              }
            }}
          >
            <button
              type="button"
              onClick={handlePrevPicture}
              className="w-10 h-10 lg:w-11 lg:h-11 rounded-full apple-floating-glass flex items-center justify-center opacity-0 -translate-x-1 group-hover/prev:opacity-100 group-hover/prev:translate-x-0 focus-visible:opacity-100 focus-visible:translate-x-0 active:scale-90 transition-all duration-200 cursor-pointer touch-action-btn group"
              aria-label="Previous picture"
              title="Previous picture"
            >
              <ChevronLeft className="w-5 h-5 text-[#1d1d1f] group-hover:-translate-x-0.5 transition-transform" />
            </button>
          </div>

          {/* Right Proximity Hover Zone + Next Button - Desktop Only */}
          <div
            className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 w-36 lg:w-48 h-64 items-center justify-end pr-5 lg:pr-8 z-40 group/next"
            onClick={(e) => {
              e.stopPropagation();
              if (isPhotoMenuOpen || isProjectMenuOpen || isDescriptionExpanded) {
                setIsPhotoMenuOpen(false);
                setIsProjectMenuOpen(false);
                setIsDescriptionExpanded(false);
              }
            }}
          >
            <button
              type="button"
              onClick={handleNextPicture}
              className="w-10 h-10 lg:w-11 lg:h-11 rounded-full apple-floating-glass flex items-center justify-center opacity-0 translate-x-1 group-hover/next:opacity-100 group-hover/next:translate-x-0 focus-visible:opacity-100 focus-visible:translate-x-0 active:scale-90 transition-all duration-200 cursor-pointer touch-action-btn group"
              aria-label="Next picture"
              title="Next picture"
            >
              <ChevronRight className="w-5 h-5 text-[#1d1d1f] group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          {/* Bottom Minimal Capsule: Click Title to Expand Clean Description */}
          <div 
            className="absolute bottom-5 sm:bottom-7 inset-x-0 z-40 flex justify-center px-4 pointer-events-none"
            style={{
              paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 12px))'
            }}
          >
            {!isDescriptionExpanded ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsDescriptionExpanded(true);
                  setIsPhotoMenuOpen(false);
                  setIsProjectMenuOpen(false);
                }}
                className="pointer-events-auto inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2 rounded-full apple-floating-glass max-w-[min(88vw,520px)] text-center active:scale-[0.98] transition-all cursor-pointer touch-action-btn group"
                title="Click to view description"
                aria-expanded={false}
              >
                <span className="font-display text-xs sm:text-sm font-medium tracking-tight text-[#1d1d1f] truncate">
                  {selectedProject.title}
                </span>
                <ChevronUp className="w-3.5 h-3.5 text-neutral-500 shrink-0 group-hover:-translate-y-0.5 transition-transform" />
              </button>
            ) : (
              <div 
                className="pointer-events-auto apple-floating-glass relative overflow-hidden w-full max-w-[min(90vw,460px)] p-4 sm:p-5 rounded-[24px] animate-fluid-sheet flex flex-col gap-2.5"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="specular-highlight opacity-50" />
                {/* Clean Header: Title & Collapse Button */}
                <div 
                  className="flex items-start justify-between gap-3 cursor-pointer relative z-10"
                  onClick={() => setIsDescriptionExpanded(false)}
                  title="Click to collapse"
                >
                  <h3 className="font-display text-xs sm:text-sm font-semibold text-[#1d1d1f] tracking-tight leading-snug">
                    {selectedProject.title}
                  </h3>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsDescriptionExpanded(false);
                    }}
                    className="w-6 h-6 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center text-neutral-600 transition-colors shrink-0 cursor-pointer active:scale-90"
                    aria-label="Collapse description"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Minimal Description Body */}
                <div className="text-xs sm:text-[13px] text-neutral-700 leading-relaxed max-h-[30vh] overflow-y-auto pr-1 touch-momentum border-t border-black/8 pt-2.5 relative z-10">
                  {selectedProject.description ? (
                    <p className="whitespace-pre-line">{selectedProject.description}</p>
                  ) : (
                    <p className="text-neutral-500 italic">No description available.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
