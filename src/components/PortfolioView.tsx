import React, { useState, useEffect, useCallback } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Briefcase
} from 'lucide-react';
import { 
  PortfolioItem, 
  PORTFOLIO_CATEGORIES, 
  getLocalPortfolio, 
  fetchLivePortfolio, 
  PORTFOLIO_CHANGED_EVENT 
} from '../data/portfolio';

interface PortfolioViewProps {
  onNavigateShop: () => void;
  onNavigateContact: () => void;
}

export default function PortfolioView({ onNavigateShop, onNavigateContact }: PortfolioViewProps) {
  const [items, setItems] = useState<PortfolioItem[]>(() => getLocalPortfolio());
  const [selectedCategory, setSelectedCategory] = useState<string>('All Projects');
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

  // Filter items based on selected category
  const filteredItems = items.filter(item => {
    if (selectedCategory === 'All Projects') return true;
    return item.category === selectedCategory;
  });

  const selectedProject = selectedProjectIndex !== null && filteredItems[selectedProjectIndex] 
    ? filteredItems[selectedProjectIndex] 
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
  };

  const handleCloseModal = () => {
    setSelectedProjectIndex(null);
    setCurrentImageIndex(0);
  };

  // Navigate to previous picture or previous project
  const handlePrevPicture = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (selectedProjectIndex === null) return;

    if (currentImageIndex > 0) {
      // Step back within the current project's photos
      setCurrentImageIndex(prev => prev - 1);
    } else {
      // Jump to previous project in the filtered list
      const prevProjIdx = (selectedProjectIndex - 1 + filteredItems.length) % filteredItems.length;
      setSelectedProjectIndex(prevProjIdx);
      const prevProj = filteredItems[prevProjIdx];
      const prevImages = [prevProj.imageUrl, ...(prevProj.gallery || []).filter(img => img !== prevProj.imageUrl)];
      setCurrentImageIndex(Math.max(0, prevImages.length - 1));
    }
  }, [currentImageIndex, selectedProjectIndex, filteredItems]);

  // Navigate to next picture or next project
  const handleNextPicture = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (selectedProjectIndex === null) return;

    if (currentImageIndex < currentProjectImages.length - 1) {
      // Step forward within current project's photos
      setCurrentImageIndex(prev => prev + 1);
    } else {
      // Advance to next project in the filtered list
      const nextProjIdx = (selectedProjectIndex + 1) % filteredItems.length;
      setSelectedProjectIndex(nextProjIdx);
      setCurrentImageIndex(0);
    }
  }, [currentImageIndex, currentProjectImages.length, selectedProjectIndex, filteredItems]);

  // Lock background scroll when modal is open to avoid background scroll
  useEffect(() => {
    if (selectedProjectIndex === null) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCloseModal();
      } else if (e.key === 'ArrowLeft') {
        handlePrevPicture();
      } else if (e.key === 'ArrowRight') {
        handleNextPicture();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedProjectIndex, handlePrevPicture, handleNextPicture]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 animate-in fade-in duration-300 pt-2 pb-16">
      
      {/* 1. CLEAN HEADER */}
      <div className="grid grid-cols-1 md:grid-cols-2 items-end gap-6 mb-7">
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

      {/* 2. CATEGORY FILTER PILLS (Fully Rounded Liquid Glass Pills) */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-2 mb-8 -mx-4 px-4 sm:mx-0 sm:px-0">
        {PORTFOLIO_CATEGORIES.map((category) => {
          const count = category === 'All Projects' 
            ? items.length 
            : items.filter(p => p.category === category).length;
          const isSelected = selectedCategory === category;

          return (
            <button
              key={category}
              type="button"
              onClick={() => setSelectedCategory(category)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer touch-action-btn ${
                isSelected
                  ? 'bg-[#1d1d1f] text-white shadow-xs scale-[1.02]'
                  : 'apple-liquid-glass-pill hover:bg-white text-[#515154] hover:text-[#1d1d1f]'
              }`}
            >
              <span>{category}</span>
              <span className={`ml-1.5 text-[10px] font-mono ${
                isSelected ? 'text-white/75' : 'text-[#86868b]'
              }`}>
                ({count})
              </span>
            </button>
          );
        })}
      </div>

      {/* 3. ULTRA-CLEAN PORTFOLIO CARDS GRID (Just a Card with the Cover Page) */}
      {filteredItems.length === 0 ? (
        <div className="p-12 text-center rounded-[28px] apple-liquid-glass border border-white/90 shadow-xs mb-10 overflow-hidden relative">
          <div className="specular-highlight opacity-50" />
          <Briefcase className="w-8 h-8 mx-auto text-gray-300 mb-2.5 relative z-10" />
          <h3 className="text-sm font-semibold text-gray-900 relative z-10">No projects found in this category</h3>
          <p className="text-xs text-gray-500 mt-1 relative z-10">
            Switch back to 'All Projects' to see all completed works.
          </p>
          <button
            onClick={() => setSelectedCategory('All Projects')}
            className="mt-4 px-5 py-2 rounded-full bg-[#1d1d1f] text-white text-xs font-medium cursor-pointer relative z-10 touch-action-btn"
          >
            Reset Filter
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-12">
          {filteredItems.map((project, index) => (
            <article
              key={project.id}
              onClick={() => handleOpenProject(index)}
              className="group relative rounded-[28px] p-3 apple-liquid-glass-interactive border border-white/90 shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.95),0_10px_28px_-4px_rgba(0,0,0,0.05)] overflow-hidden cursor-pointer touch-action-card transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 flex flex-col"
            >
              {/* Glass specular top highlight */}
              <div className="specular-highlight opacity-80" />

              {/* Just the Cover Page Card: Concentric Rounded Radius (28px - 12px padding = 16px inner) */}
              <div className="relative w-full aspect-4/3 rounded-[16px] overflow-hidden bg-gray-100 shadow-2xs">
                <img 
                  src={project.imageUrl} 
                  alt={project.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />

                {/* Subtle dark gradient overlay on hover for luxury depth */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3.5 text-white">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#f47b20] mb-0.5">
                    {project.category}
                  </span>
                  <h3 className="font-display text-sm font-semibold leading-tight line-clamp-2">
                    {project.title}
                  </h3>
                </div>

                {/* Client badge top-left (fully rounded) */}
                <span className="absolute top-2.5 left-2.5 px-3 py-1 rounded-full bg-white/90 backdrop-blur-md text-[10px] font-semibold text-[#1d1d1f] shadow-xs border border-white/80">
                  {project.client}
                </span>

                {/* Photo count indicator if multiple images available */}
                {project.gallery && project.gallery.length > 1 && (
                  <span className="absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[10px] font-mono text-white border border-white/20">
                    +{project.gallery.length} photos
                  </span>
                )}
              </div>

              {/* Minimal Project Title beneath the cover card */}
              <div className="pt-3 px-1 flex items-center justify-between gap-2">
                <h3 className="font-display text-xs sm:text-sm font-semibold text-[#1d1d1f] truncate group-hover:text-[#c95510] transition-colors">
                  {project.title}
                </h3>
                <span className="text-[10px] font-mono text-gray-400 shrink-0">
                  {project.year}
                </span>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* 4. EXPANSIVE BIG PICTURE LIGHTBOX MODAL (Fits to initial screen with zero background scroll) */}
      {selectedProject && (
        <div 
          className="fixed inset-0 z-50 flex flex-col items-center justify-between p-3 sm:p-5 bg-black/92 backdrop-blur-3xl animate-in fade-in duration-200 select-none overflow-hidden h-[100dvh] max-h-[100dvh] overscroll-none"
          onClick={handleCloseModal}
        >
          {/* Top Bar: Picture count pill & Fully Rounded Close button */}
          <div className="w-full max-w-5xl flex items-center justify-between shrink-0 z-20 pt-1 pb-1.5">
            <div className="flex items-center gap-2">
              <span className="apple-liquid-glass-pill px-4 py-1.5 rounded-full text-xs font-medium text-white/90 border border-white/20 backdrop-blur-xl">
                Photo {currentImageIndex + 1} of {currentProjectImages.length}
              </span>
              <span className="hidden sm:inline-block px-3 py-1.5 rounded-full bg-white/10 text-[11px] font-mono text-white/70 border border-white/10">
                Project {selectedProjectIndex! + 1} of {filteredItems.length}
              </span>
            </div>

            <button
              type="button"
              onClick={handleCloseModal}
              className="w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 active:scale-95 text-white flex items-center justify-center backdrop-blur-2xl border border-white/25 transition-all cursor-pointer shadow-lg touch-action-btn"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Center Stage: The Picture So Big with Arrow Navigation (Fills available screen space) */}
          <div 
            className="relative w-full max-w-5xl flex-1 min-h-0 flex items-center justify-center my-auto py-1 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* The Big Picture */}
            <div className="relative rounded-[20px] sm:rounded-[28px] overflow-hidden shadow-2xl border border-white/15 bg-black/40 flex items-center justify-center max-h-full max-w-full h-full">
              <img 
                src={activeBigImageUrl} 
                alt={selectedProject.title}
                className="w-auto h-auto max-h-full max-w-full object-contain animate-in fade-in duration-200"
              />
            </div>

            {/* Previous Picture Arrow Button (<) */}
            <button
              type="button"
              onClick={handlePrevPicture}
              className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-black/60 hover:bg-black/85 active:scale-90 text-white backdrop-blur-2xl border border-white/25 flex items-center justify-center transition-all cursor-pointer shadow-2xl touch-action-btn group z-20"
              aria-label="Previous picture"
            >
              <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 group-hover:-translate-x-0.5 transition-transform" />
            </button>

            {/* Next Picture Arrow Button (>) */}
            <button
              type="button"
              onClick={handleNextPicture}
              className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-black/60 hover:bg-black/85 active:scale-90 text-white backdrop-blur-2xl border border-white/25 flex items-center justify-center transition-all cursor-pointer shadow-2xl touch-action-btn group z-20"
              aria-label="Next picture"
            >
              <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          {/* Bottom Info: The name of the Project beneath, and little description */}
          <div 
            className="w-full max-w-3xl text-center px-4 pt-1.5 pb-2 shrink-0 z-20"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Project Name */}
            <h2 className="font-display text-base sm:text-xl font-semibold text-white tracking-tight leading-snug drop-shadow-sm mb-1">
              {selectedProject.title}
            </h2>

            {/* Little Description */}
            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed max-w-2xl mx-auto font-light drop-shadow-xs mb-2 line-clamp-2">
              {selectedProject.description}
            </p>

            {/* Client, Category & Year Badges (fully rounded) */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="px-3 py-0.5 rounded-full bg-white/10 text-white text-[11px] font-medium border border-white/15 backdrop-blur-md">
                Client: {selectedProject.client}
              </span>
              <span className="px-3 py-0.5 rounded-full bg-[#f47b20]/25 text-[#f47b20] text-[11px] font-semibold border border-[#f47b20]/40 backdrop-blur-md">
                {selectedProject.category}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-white/5 text-gray-400 text-[11px] font-mono border border-white/10">
                {selectedProject.year}
              </span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
