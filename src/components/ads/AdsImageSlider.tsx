// src/components/ads/AdsImageSlider.tsx
import { FC, useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { motivationalAds } from "./motivationalAds";

interface AdsImageSliderProps {
  isExpanded: boolean;
  onToggle: () => void;
}

export const AdsImageSlider: FC<AdsImageSliderProps> = ({
  isExpanded,
  onToggle,
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  // Auto-advance slides to a random slide (not the current one)
  useEffect(() => {
    if (!isExpanded) return;

    const interval = setInterval(() => {
      let next;
      do {
        next = Math.floor(Math.random() * motivationalAds.length);
      } while (next === currentSlide && motivationalAds.length > 1);
      setCurrentSlide(next);
    }, 6000);

    return () => clearInterval(interval);
  }, [isExpanded, currentSlide]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % motivationalAds.length);
  };

  const prevSlide = () => {
    setCurrentSlide(
      (prev) => (prev - 1 + motivationalAds.length) % motivationalAds.length,
    );
  };

  return (
    <div className="relative overflow-hidden bg-white border border-gray-200 dark:bg-gray-800 rounded-xl dark:border-gray-700">
      {/* Floating Ads Pill - Left side */}
      <div className="absolute top-2 left-2 z-10 px-2 py-1 brand-gradient text-[10px] font-medium rounded-full shadow-lg border border-transparent text-(--brand-navbar-text)">
        Ads
      </div>

      {/* Toggle Button - Right side (identical styling) */}
      <button
        type="button"
        onClick={onToggle}
        className="absolute z-10 px-3 py-1 text-xs font-medium transition-colors brand-gradient border border-transparent rounded-full shadow-lg top-2 right-2 hover:brightness-95 text-(--brand-navbar-text)"
        aria-expanded={isExpanded}
        aria-label={isExpanded ? "Minimize ads" : "Expand ads"}
      >
        {isExpanded ? (
          <ChevronUp className="w-3 h-3" />
        ) : (
          <ChevronDown className="w-3 h-3" />
        )}
      </button>

      {/* Height animates; keep both states mounted so the transition is visible */}
      <div
        className={`relative group overflow-hidden transition-[height] duration-300 ease-in-out ${
          isExpanded ? "h-64" : "h-12"
        }`}
      >
        <div
          className={`absolute inset-0 z-1 flex items-center justify-center cursor-pointer transition-opacity duration-300 ${
            isExpanded
              ? "opacity-0 pointer-events-none"
              : "opacity-100"
          }`}
          onClick={onToggle}
        >
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Click to view ads
          </div>
        </div>

        <div
          className={`relative h-full transition-opacity duration-300 ${
            isExpanded
              ? "opacity-100"
              : "opacity-0 pointer-events-none"
          }`}
        >
          <div className="relative h-full overflow-hidden">
            {motivationalAds.map((ad, index) => (
              <div
                key={ad.id}
                className={`absolute inset-0 transition-opacity duration-500 ${
                  index === currentSlide ? "opacity-100" : "opacity-0"
                }`}
              >
                <div className="relative h-full brand-gradient">
                  <div className="absolute inset-0 bg-black/10 dark:bg-black/20" />

                  <div className="absolute inset-0 flex flex-col justify-center p-6 text-white">
                    <h4 className="mb-2 text-lg font-semibold text-white!">
                      {ad.title}
                    </h4>
                    <p className="mb-4 text-sm text-white opacity-90">
                      {ad.description}
                    </p>
                    <button
                      type="button"
                      className="px-4 py-2 text-sm font-medium text-white transition-colors rounded-lg bg-white/20 hover:bg-white/30"
                    >
                      {ad.cta}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              prevSlide();
            }}
            className="absolute p-2 text-white transition-all duration-200 transform -translate-y-1/2 rounded-full opacity-0 left-2 top-1/2 bg-black/50 hover:bg-black/70 group-hover:opacity-100"
            aria-label="Previous ad"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              nextSlide();
            }}
            className="absolute p-2 text-white transition-all duration-200 transform -translate-y-1/2 rounded-full opacity-0 right-2 top-1/2 bg-black/50 hover:bg-black/70 group-hover:opacity-100"
            aria-label="Next ad"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdsImageSlider;
