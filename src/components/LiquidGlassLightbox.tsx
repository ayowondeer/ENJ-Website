import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  RotateCcw
} from 'lucide-react';

interface SafariGestureEvent extends Event {
  scale: number;
  clientX?: number;
  clientY?: number;
}

interface ZoomTransform {
  scale: number;
  x: number;
  y: number;
}

export interface LiquidGlassLightboxProps {
  images: string[];
  currentImageIndex: number;
  onSelectImageIndex: (index: number) => void;
  title: string;
  description?: string;
  subtitle?: string;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
  projectCount?: number;
  currentProjectIndex?: number;
  projectTitles?: string[];
  onSelectProjectIndex?: (index: number) => void;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 4.5;
const DOUBLE_TAP_ZOOM = 2.4;

export default function LiquidGlassLightbox({
  images,
  currentImageIndex,
  onSelectImageIndex,
  title,
  description,
  subtitle,
  onPrev,
  onNext,
  onClose,
  projectCount,
  currentProjectIndex,
  projectTitles,
  onSelectProjectIndex
}: LiquidGlassLightboxProps) {
  const [isPhotoMenuOpen, setIsPhotoMenuOpen] = useState(false);
  const [isProjectMenuOpen, setIsProjectMenuOpen] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  const [zoom, setZoom] = useState<ZoomTransform>({ scale: 1, x: 0, y: 0 });
  const [isGestureActive, setIsGestureActive] = useState(false);

  const zoomRef = useRef<ZoomTransform>({ scale: 1, x: 0, y: 0 });
  const stageRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const isMouseDraggingRef = useRef(false);
  const mouseDragMovedRef = useRef(false);
  const mouseDragStartRef = useRef({ x: 0, y: 0, offsetX: 0, offsetY: 0 });

  const activeImageUrl = images[currentImageIndex] || images[0] || '';
  const hasMultiplePhotos = images.length > 1;
  const hasProjects = Boolean(projectCount && projectCount > 0 && currentProjectIndex !== undefined && onSelectProjectIndex);
  const canNavigate = hasMultiplePhotos || (projectCount !== undefined && projectCount > 1);

  const updateZoom = useCallback((next: ZoomTransform) => {
    zoomRef.current = next;
    setZoom(next);
  }, []);

  const resetZoom = useCallback(() => {
    setIsGestureActive(false);
    updateZoom({ scale: 1, x: 0, y: 0 });
  }, [updateZoom]);

  const clampPan = useCallback((x: number, y: number, scale: number): { x: number; y: number } => {
    if (scale <= 1.005 || !stageRef.current || !imgRef.current) {
      return { x: 0, y: 0 };
    }
    const stageRect = stageRef.current.getBoundingClientRect();
    const baseW = imgRef.current.offsetWidth || stageRect.width * 0.85;
    const baseH = imgRef.current.offsetHeight || stageRect.height * 0.85;
    const maxX = Math.max(0, (baseW * scale - stageRect.width) / 2);
    const maxY = Math.max(0, (baseH * scale - stageRect.height) / 2);
    return {
      x: Math.max(-maxX, Math.min(maxX, x)),
      y: Math.max(-maxY, Math.min(maxY, y))
    };
  }, []);

  const zoomAtPoint = useCallback((targetScale: number, clientX: number, clientY: number) => {
    const clampedScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, targetScale));
    if (clampedScale <= 1.02) {
      updateZoom({ scale: 1, x: 0, y: 0 });
      return;
    }

    const stage = stageRef.current;
    if (!stage) {
      updateZoom({ scale: clampedScale, x: 0, y: 0 });
      return;
    }

    const rect = stage.getBoundingClientRect();
    const px = clientX - (rect.left + rect.width / 2);
    const py = clientY - (rect.top + rect.height / 2);
    const cur = zoomRef.current;
    const ratio = clampedScale / cur.scale;
    const nextX = px - ratio * (px - cur.x);
    const nextY = py - ratio * (py - cur.y);
    const clamped = clampPan(nextX, nextY, clampedScale);
    updateZoom({ scale: clampedScale, x: clamped.x, y: clamped.y });
  }, [clampPan, updateZoom]);

  const handlePrevWrapped = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!canNavigate) return;
    setIsPhotoMenuOpen(false);
    setIsProjectMenuOpen(false);
    resetZoom();
    onPrev();
  }, [canNavigate, onPrev, resetZoom]);

  const handleNextWrapped = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!canNavigate) return;
    setIsPhotoMenuOpen(false);
    setIsProjectMenuOpen(false);
    resetZoom();
    onNext();
  }, [canNavigate, onNext, resetZoom]);

  const handlePrevRef = useRef(handlePrevWrapped);
  const handleNextRef = useRef(handleNextWrapped);
  handlePrevRef.current = handlePrevWrapped;
  handleNextRef.current = handleNextWrapped;

  // Reset zoom and preload adjacent images whenever active image changes
  useEffect(() => {
    resetZoom();
    if (images.length <= 1) return;
    const neighbors = [
      images[(currentImageIndex + 1) % images.length],
      images[(currentImageIndex - 1 + images.length) % images.length]
    ];
    neighbors.forEach((src) => {
      if (!src) return;
      const pre = new Image();
      pre.decoding = 'async';
      pre.src = src;
    });
  }, [activeImageUrl, currentImageIndex, images, resetZoom]);

  // Lock background scroll & handle keyboard controls
  useEffect(() => {
    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    const originalTouchAction = document.body.style.touchAction;

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        if (isPhotoMenuOpen || isProjectMenuOpen || isDescriptionExpanded) {
          setIsPhotoMenuOpen(false);
          setIsProjectMenuOpen(false);
          setIsDescriptionExpanded(false);
        } else if (zoomRef.current.scale > 1.02) {
          resetZoom();
        } else {
          onClose();
        }
      } else if (e.key === 'ArrowLeft' && canNavigate) {
        e.preventDefault();
        handlePrevWrapped();
      } else if (e.key === 'ArrowRight' && canNavigate) {
        e.preventDefault();
        handleNextWrapped();
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        const rect = stageRef.current?.getBoundingClientRect();
        if (rect) {
          zoomAtPoint(zoomRef.current.scale * 1.3, rect.left + rect.width / 2, rect.top + rect.height / 2);
        }
      } else if (e.key === '-') {
        e.preventDefault();
        const rect = stageRef.current?.getBoundingClientRect();
        if (rect) {
          zoomAtPoint(zoomRef.current.scale / 1.3, rect.left + rect.width / 2, rect.top + rect.height / 2);
        }
      } else if (e.key === '0') {
        e.preventDefault();
        resetZoom();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
      document.body.style.touchAction = originalTouchAction;
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [
    isPhotoMenuOpen,
    isProjectMenuOpen,
    isDescriptionExpanded,
    canNavigate,
    handlePrevWrapped,
    handleNextWrapped,
    zoomAtPoint,
    resetZoom,
    onClose
  ]);

  // Non-passive trackpad wheel/pinch, Safari gesture, and mobile pinch-to-zoom listeners
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    let wheelIdleTimer: number | null = null;
    let lastSafariGestureTime = 0;
    let safariStartScale = 1;
    let safariStartX = 0;
    let safariStartY = 0;

    let touchMode: 'none' | 'swipe' | 'pan' | 'pinch' = 'none';
    let touchStartX = 0;
    let touchStartY = 0;
    let panStartX = 0;
    let panStartY = 0;
    let pinchStartDist = 1;
    let pinchStartScale = 1;
    let pinchStartMidX = 0;
    let pinchStartMidY = 0;
    let pinchStartOffsetX = 0;
    let pinchStartOffsetY = 0;
    let lastTapTime = 0;
    let lastTapX = 0;
    let lastTapY = 0;

    const getStageCenter = () => {
      const rect = stage.getBoundingClientRect();
      return {
        cx: rect.left + rect.width / 2,
        cy: rect.top + rect.height / 2
      };
    };

    const initPinch = (t1: Touch, t2: Touch) => {
      touchMode = 'pinch';
      setIsGestureActive(true);
      const { cx, cy } = getStageCenter();
      pinchStartDist = Math.max(1, Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY));
      pinchStartScale = zoomRef.current.scale;
      pinchStartMidX = (t1.clientX + t2.clientX) / 2 - cx;
      pinchStartMidY = (t1.clientY + t2.clientY) / 2 - cy;
      pinchStartOffsetX = zoomRef.current.x;
      pinchStartOffsetY = zoomRef.current.y;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();

      // Desktop trackpad pinch-to-zoom or Ctrl/Cmd+Wheel
      if (e.ctrlKey || e.metaKey) {
        if (Date.now() - lastSafariGestureTime < 80) return;
        setIsGestureActive(true);
        const clampedDelta = Math.max(-40, Math.min(40, e.deltaY));
        const factor = Math.exp(-clampedDelta * 0.012);
        zoomAtPoint(zoomRef.current.scale * factor, e.clientX, e.clientY);

        if (wheelIdleTimer !== null) window.clearTimeout(wheelIdleTimer);
        wheelIdleTimer = window.setTimeout(() => {
          setIsGestureActive(false);
          if (zoomRef.current.scale < 1.03) {
            updateZoom({ scale: 1, x: 0, y: 0 });
          }
        }, 120);
        return;
      }

      // Trackpad two-finger scroll pan when zoomed in
      if (zoomRef.current.scale > 1.02) {
        setIsGestureActive(true);
        const cur = zoomRef.current;
        const clamped = clampPan(cur.x - e.deltaX, cur.y - e.deltaY, cur.scale);
        updateZoom({ scale: cur.scale, x: clamped.x, y: clamped.y });

        if (wheelIdleTimer !== null) window.clearTimeout(wheelIdleTimer);
        wheelIdleTimer = window.setTimeout(() => {
          setIsGestureActive(false);
        }, 100);
      }
    };

    const onGestureStart = (e: Event) => {
      e.preventDefault();
      lastSafariGestureTime = Date.now();
      setIsGestureActive(true);
      safariStartScale = zoomRef.current.scale;
      safariStartX = zoomRef.current.x;
      safariStartY = zoomRef.current.y;
    };

    const onGestureChange = (e: Event) => {
      e.preventDefault();
      lastSafariGestureTime = Date.now();
      const ge = e as SafariGestureEvent;
      const nextScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, safariStartScale * (ge.scale || 1)));
      if (nextScale <= 1.02) {
        updateZoom({ scale: 1, x: 0, y: 0 });
        return;
      }
      const { cx, cy } = getStageCenter();
      const px = (ge.clientX ?? cx) - cx;
      const py = (ge.clientY ?? cy) - cy;
      const ratio = nextScale / safariStartScale;
      const rawX = px - ratio * (px - safariStartX);
      const rawY = py - ratio * (py - safariStartY);
      const clamped = clampPan(rawX, rawY, nextScale);
      updateZoom({ scale: nextScale, x: clamped.x, y: clamped.y });
    };

    const onGestureEnd = (e: Event) => {
      e.preventDefault();
      lastSafariGestureTime = Date.now();
      setIsGestureActive(false);
      if (zoomRef.current.scale < 1.04) {
        updateZoom({ scale: 1, x: 0, y: 0 });
      }
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        initPinch(e.touches[0], e.touches[1]);
      } else if (e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        if (zoomRef.current.scale > 1.02) {
          touchMode = 'pan';
          panStartX = zoomRef.current.x;
          panStartY = zoomRef.current.y;
          setIsGestureActive(true);
        } else {
          touchMode = 'swipe';
        }
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        if (touchMode !== 'pinch') {
          initPinch(e.touches[0], e.touches[1]);
          return;
        }
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const { cx, cy } = getStageCenter();
        const dist = Math.max(1, Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY));
        const midX = (t1.clientX + t2.clientX) / 2 - cx;
        const midY = (t1.clientY + t2.clientY) / 2 - cy;

        const nextScale = Math.max(0.9, Math.min(MAX_ZOOM, pinchStartScale * (dist / pinchStartDist)));
        const effectiveScale = Math.max(1, nextScale);
        const ratio = nextScale / pinchStartScale;
        const rawX = midX - ratio * (pinchStartMidX - pinchStartOffsetX);
        const rawY = midY - ratio * (pinchStartMidY - pinchStartOffsetY);
        const clamped = nextScale <= 1 ? { x: 0, y: 0 } : clampPan(rawX, rawY, effectiveScale);
        updateZoom({ scale: nextScale, x: clamped.x, y: clamped.y });
      } else if (e.touches.length === 1 && touchMode === 'pan') {
        e.preventDefault();
        const dx = e.touches[0].clientX - touchStartX;
        const dy = e.touches[0].clientY - touchStartY;
        const clamped = clampPan(panStartX + dx, panStartY + dy, zoomRef.current.scale);
        updateZoom({ scale: zoomRef.current.scale, x: clamped.x, y: clamped.y });
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length === 1 && touchMode === 'pinch') {
        const curScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoomRef.current.scale));
        if (curScale > 1.04) {
          touchMode = 'pan';
          touchStartX = e.touches[0].clientX;
          touchStartY = e.touches[0].clientY;
          const clamped = clampPan(zoomRef.current.x, zoomRef.current.y, curScale);
          updateZoom({ scale: curScale, x: clamped.x, y: clamped.y });
          panStartX = clamped.x;
          panStartY = clamped.y;
        } else {
          touchMode = 'none';
          setIsGestureActive(false);
          updateZoom({ scale: 1, x: 0, y: 0 });
        }
        return;
      }

      if (e.touches.length === 0) {
        setIsGestureActive(false);
        const cur = zoomRef.current;

        if (cur.scale < 1.04) {
          updateZoom({ scale: 1, x: 0, y: 0 });
        } else {
          const clamped = clampPan(cur.x, cur.y, Math.min(MAX_ZOOM, cur.scale));
          updateZoom({ scale: Math.min(MAX_ZOOM, cur.scale), x: clamped.x, y: clamped.y });
        }

        if (touchMode === 'swipe' && cur.scale <= 1.04 && e.changedTouches.length > 0) {
          const endX = e.changedTouches[0].clientX;
          const endY = e.changedTouches[0].clientY;
          const deltaX = endX - touchStartX;
          const deltaY = endY - touchStartY;

          if (Math.abs(deltaX) > 35 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
            if (deltaX < 0) {
              handleNextRef.current();
            } else {
              handlePrevRef.current();
            }
          } else if (Math.abs(deltaX) < 14 && Math.abs(deltaY) < 14) {
            const now = Date.now();
            const tapDist = Math.hypot(endX - lastTapX, endY - lastTapY);
            if (now - lastTapTime < 280 && tapDist < 32) {
              zoomAtPoint(DOUBLE_TAP_ZOOM, endX, endY);
              lastTapTime = 0;
            } else {
              lastTapTime = now;
              lastTapX = endX;
              lastTapY = endY;
            }
          }
        } else if (touchMode === 'pan' && e.changedTouches.length > 0) {
          const endX = e.changedTouches[0].clientX;
          const endY = e.changedTouches[0].clientY;
          const deltaX = endX - touchStartX;
          const deltaY = endY - touchStartY;
          if (Math.abs(deltaX) < 14 && Math.abs(deltaY) < 14) {
            const now = Date.now();
            const tapDist = Math.hypot(endX - lastTapX, endY - lastTapY);
            if (now - lastTapTime < 280 && tapDist < 32) {
              updateZoom({ scale: 1, x: 0, y: 0 });
              lastTapTime = 0;
            } else {
              lastTapTime = now;
              lastTapX = endX;
              lastTapY = endY;
            }
          }
        }

        touchMode = 'none';
      }
    };

    stage.addEventListener('wheel', onWheel, { passive: false });
    stage.addEventListener('gesturestart', onGestureStart, { passive: false });
    stage.addEventListener('gesturechange', onGestureChange, { passive: false });
    stage.addEventListener('gestureend', onGestureEnd, { passive: false });
    stage.addEventListener('touchstart', onTouchStart, { passive: false });
    stage.addEventListener('touchmove', onTouchMove, { passive: false });
    stage.addEventListener('touchend', onTouchEnd);
    stage.addEventListener('touchcancel', onTouchEnd);

    return () => {
      if (wheelIdleTimer !== null) window.clearTimeout(wheelIdleTimer);
      stage.removeEventListener('wheel', onWheel);
      stage.removeEventListener('gesturestart', onGestureStart);
      stage.removeEventListener('gesturechange', onGestureChange);
      stage.removeEventListener('gestureend', onGestureEnd);
      stage.removeEventListener('touchstart', onTouchStart);
      stage.removeEventListener('touchmove', onTouchMove);
      stage.removeEventListener('touchend', onTouchEnd);
      stage.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [clampPan, updateZoom, zoomAtPoint]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 || zoomRef.current.scale <= 1.02) return;
    e.preventDefault();
    isMouseDraggingRef.current = true;
    mouseDragMovedRef.current = false;
    mouseDragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      offsetX: zoomRef.current.x,
      offsetY: zoomRef.current.y
    };
    setIsGestureActive(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isMouseDraggingRef.current) return;
    const dx = e.clientX - mouseDragStartRef.current.x;
    const dy = e.clientY - mouseDragStartRef.current.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      mouseDragMovedRef.current = true;
    }
    const clamped = clampPan(
      mouseDragStartRef.current.offsetX + dx,
      mouseDragStartRef.current.offsetY + dy,
      zoomRef.current.scale
    );
    updateZoom({ scale: zoomRef.current.scale, x: clamped.x, y: clamped.y });
  };

  const handleMouseUp = () => {
    if (!isMouseDraggingRef.current) return;
    isMouseDraggingRef.current = false;
    setIsGestureActive(false);
    window.setTimeout(() => {
      mouseDragMovedRef.current = false;
    }, 40);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (zoomRef.current.scale > 1.05) {
      resetZoom();
    } else {
      zoomAtPoint(DOUBLE_TAP_ZOOM, e.clientX, e.clientY);
    }
  };

  const isZoomed = zoom.scale > 1.02;

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] w-screen h-[100dvh] overflow-hidden select-none overscroll-none touch-none bg-neutral-950 animate-liquid-backdrop"
      onClick={(e) => {
        e.stopPropagation();
        if (mouseDragMovedRef.current) return;
        if (isPhotoMenuOpen || isProjectMenuOpen || isDescriptionExpanded) {
          setIsPhotoMenuOpen(false);
          setIsProjectMenuOpen(false);
          setIsDescriptionExpanded(false);
          return;
        }
        if (!isZoomed) {
          onClose();
        }
      }}
    >
      {/* Subtle Ambient Photo Backdrop */}
      <img
        src={activeImageUrl}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover blur-3xl scale-105 opacity-25 pointer-events-none select-none transition-opacity duration-500"
      />
      <div className="absolute inset-0 bg-black/45 pointer-events-none" />

      {/* Main Interactive Zoom/Pan Viewport Stage */}
      <div
        ref={stageRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        onClick={(e) => {
          e.stopPropagation();
          if (mouseDragMovedRef.current) return;
          if (isPhotoMenuOpen || isProjectMenuOpen || isDescriptionExpanded) {
            setIsPhotoMenuOpen(false);
            setIsProjectMenuOpen(false);
            setIsDescriptionExpanded(false);
          }
        }}
        className={`absolute inset-0 w-full h-full flex items-center justify-center overflow-hidden touch-none ${
          isZoomed
            ? (isGestureActive ? 'cursor-grabbing' : 'cursor-grab')
            : 'cursor-zoom-in'
        }`}
      >
        <div
          key={activeImageUrl}
          className="animate-liquid-expand flex items-center justify-center"
        >
          <div
            style={{
              transform: `translate3d(${zoom.x}px, ${zoom.y}px, 0) scale(${zoom.scale})`,
              transition: isGestureActive ? 'none' : 'transform 0.28s cubic-bezier(0.22, 1.15, 0.36, 1)',
              willChange: 'transform'
            }}
            className="flex items-center justify-center origin-center"
          >
            <img
              ref={imgRef}
              src={activeImageUrl}
              alt={title}
              draggable={false}
              className="max-w-[calc(100vw-2rem)] sm:max-w-[calc(100vw-5rem)] md:max-w-[calc(100vw-8rem)] max-h-[calc(100dvh-10rem)] w-auto h-auto object-contain select-none rounded-[14px] sm:rounded-[18px] shadow-[0_24px_64px_rgba(0,0,0,0.45)]"
            />
          </div>
        </div>
      </div>

      {/* Minimal Top Bar: 3-column layout (Left: Back, Middle: Photo X of Y, Right: Optional X of Y) */}
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
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="w-10 h-10 rounded-full apple-floating-glass flex items-center justify-center active:scale-90 transition-all duration-300 ease-liquid-spring cursor-pointer touch-action-btn group shrink-0 relative overflow-hidden"
            aria-label="Close preview"
            title="Close preview"
          >
            <div className="specular-highlight opacity-70" />
            <ArrowLeft className="w-4.5 h-4.5 text-[#1d1d1f] group-hover:-translate-x-0.5 transition-transform duration-200 relative z-10" />
          </button>
        </div>

        {/* Middle: Liquid Glass Photo Count Pill with Spring Morph Expansion */}
        <div className="relative flex items-center justify-center pointer-events-auto">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (!hasMultiplePhotos) return;
              setIsPhotoMenuOpen(prev => !prev);
              setIsProjectMenuOpen(false);
              setIsDescriptionExpanded(false);
            }}
            className={`apple-floating-glass px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap touch-action-btn flex items-center gap-1.5 relative overflow-hidden ${
              hasMultiplePhotos ? 'cursor-pointer active:scale-92' : 'cursor-default'
            } ${isPhotoMenuOpen ? 'scale-[1.05] shadow-[0_20px_44px_rgba(0,0,0,0.38)]' : ''}`}
            title={hasMultiplePhotos ? 'Select photo number' : 'Photo count'}
            aria-expanded={hasMultiplePhotos ? isPhotoMenuOpen : undefined}
          >
            <div className="specular-highlight opacity-70" />
            <span className="tabular-nums relative z-10">Photo {currentImageIndex + 1} of {images.length}</span>
            {hasMultiplePhotos && (
              <ChevronDown className={`w-3 h-3 text-[#1d1d1f]/70 transition-transform duration-300 ease-liquid-spring relative z-10 ${isPhotoMenuOpen ? 'rotate-180' : ''}`} />
            )}
          </button>

          {/* Liquid Glass Spring-Expanding Photo Selector */}
          {hasMultiplePhotos && (
            <div
              aria-hidden={!isPhotoMenuOpen}
              className={`absolute top-full mt-2.5 left-1/2 -translate-x-1/2 origin-top apple-floating-glass p-2.5 rounded-[18px] sm:rounded-[20px] flex flex-wrap items-center justify-center gap-1.5 min-w-[132px] max-w-[252px] z-50 overflow-hidden transition-all duration-300 ease-liquid-spring ${
                isPhotoMenuOpen
                  ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
                  : 'opacity-0 scale-[0.88] -translate-y-2 pointer-events-none'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="specular-highlight opacity-65" />
              {images.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  tabIndex={isPhotoMenuOpen ? 0 : -1}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectImageIndex(idx);
                    setIsPhotoMenuOpen(false);
                  }}
                  style={{
                    transitionDelay: isPhotoMenuOpen ? `${Math.min(idx * 24, 140)}ms` : '0ms'
                  }}
                  className={`relative z-10 w-8.5 h-8.5 rounded-full text-xs font-semibold tabular-nums transition-all duration-300 ease-liquid-spring cursor-pointer touch-action-btn flex items-center justify-center active:scale-90 ${
                    isPhotoMenuOpen ? 'scale-100 opacity-100' : 'scale-75 opacity-0'
                  } ${
                    currentImageIndex === idx
                      ? 'bg-[#1d1d1f] text-white shadow-sm scale-105'
                      : 'bg-white/45 hover:bg-white/80 text-[#1d1d1f] border-[0.5px] border-white/40'
                  }`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Liquid Glass Project Counter Pill (when browsing multiple portfolio projects) */}
        <div className="relative flex items-center justify-end pointer-events-auto">
          {hasProjects && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsProjectMenuOpen(prev => !prev);
                  setIsPhotoMenuOpen(false);
                  setIsDescriptionExpanded(false);
                }}
                className={`apple-floating-glass px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap cursor-pointer touch-action-btn flex items-center gap-1.5 relative overflow-hidden active:scale-92 ${
                  isProjectMenuOpen ? 'scale-[1.05] shadow-[0_20px_44px_rgba(0,0,0,0.38)]' : ''
                }`}
                title="Select project number"
                aria-expanded={isProjectMenuOpen}
              >
                <div className="specular-highlight opacity-70" />
                <span className="tabular-nums relative z-10">{currentProjectIndex! + 1} of {projectCount}</span>
                <ChevronDown className={`w-3 h-3 text-[#1d1d1f]/70 transition-transform duration-300 ease-liquid-spring relative z-10 ${isProjectMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              <div
                aria-hidden={!isProjectMenuOpen}
                className={`absolute top-full mt-2.5 right-0 origin-top-right apple-floating-glass p-2.5 rounded-[18px] sm:rounded-[20px] grid grid-cols-4 sm:grid-cols-5 gap-1.5 min-w-[172px] max-w-[252px] max-h-[210px] overflow-y-auto z-50 transition-all duration-300 ease-liquid-spring ${
                  isProjectMenuOpen
                    ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
                    : 'opacity-0 scale-[0.88] -translate-y-2 pointer-events-none'
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="specular-highlight opacity-65" />
                {Array.from({ length: projectCount! }).map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    tabIndex={isProjectMenuOpen ? 0 : -1}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectProjectIndex!(idx);
                      setIsProjectMenuOpen(false);
                    }}
                    title={projectTitles?.[idx] || `Item ${idx + 1}`}
                    style={{
                      transitionDelay: isProjectMenuOpen ? `${Math.min(idx * 18, 160)}ms` : '0ms'
                    }}
                    className={`relative z-10 h-8.5 rounded-[13px] text-xs font-semibold tabular-nums transition-all duration-300 ease-liquid-spring cursor-pointer touch-action-btn flex items-center justify-center active:scale-90 ${
                      isProjectMenuOpen ? 'scale-100 opacity-100' : 'scale-75 opacity-0'
                    } ${
                      currentProjectIndex === idx
                        ? 'bg-[#1d1d1f] text-white shadow-sm scale-105'
                        : 'bg-white/45 hover:bg-white/80 text-[#1d1d1f] border-[0.5px] border-white/40'
                    }`}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Left Proximity Hover Zone + Prev Button - Desktop Only */}
      {canNavigate && !isZoomed && (
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
            onClick={handlePrevWrapped}
            className="w-10 h-10 lg:w-11 lg:h-11 rounded-full apple-floating-glass flex items-center justify-center opacity-0 -translate-x-1 group-hover/prev:opacity-100 group-hover/prev:translate-x-0 focus-visible:opacity-100 focus-visible:translate-x-0 active:scale-90 transition-all duration-300 ease-liquid-spring cursor-pointer touch-action-btn group relative overflow-hidden"
            aria-label="Previous picture"
            title="Previous picture"
          >
            <div className="specular-highlight opacity-70" />
            <ChevronLeft className="w-5 h-5 text-[#1d1d1f] group-hover:-translate-x-0.5 transition-transform relative z-10" />
          </button>
        </div>
      )}

      {/* Right Proximity Hover Zone + Next Button - Desktop Only */}
      {canNavigate && !isZoomed && (
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
            onClick={handleNextWrapped}
            className="w-10 h-10 lg:w-11 lg:h-11 rounded-full apple-floating-glass flex items-center justify-center opacity-0 translate-x-1 group-hover/next:opacity-100 group-hover/next:translate-x-0 focus-visible:opacity-100 focus-visible:translate-x-0 active:scale-90 transition-all duration-300 ease-liquid-spring cursor-pointer touch-action-btn group relative overflow-hidden"
            aria-label="Next picture"
            title="Next picture"
          >
            <div className="specular-highlight opacity-70" />
            <ChevronRight className="w-5 h-5 text-[#1d1d1f] group-hover:translate-x-0.5 transition-transform relative z-10" />
          </button>
        </div>
      )}

      {/* Bottom Unified Morphing Liquid Glass Capsule + Optional Zoom Reset Pill */}
      <div
        className="absolute bottom-5 sm:bottom-7 inset-x-0 z-40 flex flex-col items-center gap-2.5 px-4 pointer-events-none"
        style={{
          paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 12px))'
        }}
      >
        {isZoomed && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              resetZoom();
            }}
            className="pointer-events-auto apple-floating-glass px-3.5 py-1.5 rounded-full text-[11px] font-semibold flex items-center gap-1.5 relative overflow-hidden cursor-pointer active:scale-92 animate-fluid-sheet"
            title="Reset zoom to 1x"
          >
            <div className="specular-highlight opacity-70" />
            <RotateCcw className="w-3 h-3 text-[#1d1d1f] relative z-10" />
            <span className="tabular-nums relative z-10">{zoom.scale.toFixed(1)}× · Reset</span>
          </button>
        )}

        <div
          onClick={(e) => {
            e.stopPropagation();
            if (!isDescriptionExpanded) {
              setIsDescriptionExpanded(true);
              setIsPhotoMenuOpen(false);
              setIsProjectMenuOpen(false);
            }
          }}
          className={`pointer-events-auto apple-floating-glass relative overflow-hidden origin-bottom transition-all duration-350 ease-liquid-spring ${
            isDescriptionExpanded
              ? 'w-[min(90vw,460px)] p-4 sm:p-5 rounded-[20px] sm:rounded-[24px] shadow-[0_24px_56px_rgba(0,0,0,0.42)]'
              : 'w-auto max-w-[min(88vw,380px)] px-4 sm:px-5 py-2 rounded-full cursor-pointer active:scale-[0.96] hover:scale-[1.02]'
          }`}
        >
          <div className="specular-highlight opacity-65" />

          {/* Morphing Header Row */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsDescriptionExpanded(prev => !prev);
              setIsPhotoMenuOpen(false);
              setIsProjectMenuOpen(false);
            }}
            className={`w-full flex items-center justify-between gap-2.5 text-left relative z-10 cursor-pointer ${
              isDescriptionExpanded ? 'items-start' : 'justify-center'
            }`}
            title={isDescriptionExpanded ? 'Click to collapse' : 'Click to view details'}
            aria-expanded={isDescriptionExpanded}
          >
            <span className={`font-display text-xs sm:text-sm tracking-tight text-[#1d1d1f] transition-all duration-300 ${
              isDescriptionExpanded ? 'font-semibold leading-snug' : 'font-medium truncate'
            }`}>
              {title}
            </span>

            <span className={`rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ease-liquid-spring ${
              isDescriptionExpanded
                ? 'w-6 h-6 bg-black/8 hover:bg-black/15 text-[#1d1d1f]'
                : 'w-4 h-4 text-[#1d1d1f]/70'
            }`}>
              <ChevronUp className={`w-3.5 h-3.5 transition-transform duration-350 ease-liquid-spring ${
                isDescriptionExpanded ? 'rotate-180' : ''
              }`} />
            </span>
          </button>

          {/* Fluid Height Grid Expansion for Description */}
          <div
            className={`grid transition-all duration-400 ease-liquid-spring relative z-10 ${
              isDescriptionExpanded
                ? 'grid-rows-[1fr] opacity-100 mt-2.5 pt-2.5 border-t border-black/10'
                : 'grid-rows-[0fr] opacity-0 mt-0 pt-0 border-t border-transparent'
            }`}
          >
            <div className="overflow-hidden min-h-0">
              {subtitle && (
                <p className="text-xs font-bold text-[#1d1d1f] mb-1.5 tabular-nums">
                  {subtitle}
                </p>
              )}
              <div className="text-xs sm:text-[13px] text-[#1d1d1f]/85 leading-relaxed max-h-[30vh] overflow-y-auto pr-1 touch-momentum">
                {description ? (
                  <p className="whitespace-pre-line">{description}</p>
                ) : (
                  <p className="text-[#1d1d1f]/60 italic">No description available.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
