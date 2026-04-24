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
      <div className="absolute top-2 left-2 z-10 px-2 py-1 bg-purple-500 text-white text-[10px] font-medium rounded-full shadow-lg border">
        Ads
      </div>

      {/* Toggle Button - Right side (identical styling) */}
      <button
        onClick={onToggle}
        className="absolute z-10 px-3 py-1 text-xs font-medium text-white transition-colors bg-purple-500 border rounded-full shadow-lg top-2 right-2 hover:bg-purple-600"
      >
        {isExpanded ? (
          <ChevronUp className="w-3 h-3" />
        ) : (
          <ChevronDown className="w-3 h-3" />
        )}
      </button>

      {/* Ads Slider - Shows/hides based on isExpanded */}
      <div
        className={`relative group transition-all duration-300 ${
          isExpanded ? "h-64 opacity-100" : "h-12 opacity-100"
        }`}
      >
        {/* Collapsed State - Clickable area */}
        {!isExpanded && (
          <div
            className="flex items-center justify-center h-full cursor-pointer"
            onClick={onToggle}
          >
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Click to view ads
            </div>
          </div>
        )}

        {/* Expanded State - Full ads content */}
        {isExpanded && (
          <>
            {/* Main Slider */}
            <div className="relative h-full overflow-hidden">
              {motivationalAds.map((ad, index) => (
                <div
                  key={ad.id}
                  className={`absolute inset-0 transition-opacity duration-500 ${
                    index === currentSlide ? "opacity-100" : "opacity-0"
                  }`}
                >
                  <div className="relative h-full bg-linear-to-r from-purple-500 to-blue-600">
                    {/* Placeholder for ad image - replace with actual image */}
                    <div className="absolute inset-0 bg-linear-to-br from-purple-600/20 to-blue-600/20" />

                    {/* Ad Content */}
                    <div className="absolute inset-0 flex flex-col justify-center p-6 text-white">
                      <h4 className="mb-2 text-lg font-semibold text-white!">
                        {ad.title}
                      </h4>
                      <p className="mb-4 text-sm text-white opacity-90">
                        {ad.description}
                      </p>
                      <button className="px-4 py-2 text-sm font-medium text-white transition-colors rounded-lg bg-white/20 hover:bg-white/30">
                        {ad.cta}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Navigation Arrows - Only show on hover */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                prevSlide();
              }}
              className="absolute p-2 text-white transition-all duration-200 transform -translate-y-1/2 rounded-full opacity-0 left-2 top-1/2 bg-black/50 hover:bg-black/70 group-hover:opacity-100"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                nextSlide();
              }}
              className="absolute p-2 text-white transition-all duration-200 transform -translate-y-1/2 rounded-full opacity-0 right-2 top-1/2 bg-black/50 hover:bg-black/70 group-hover:opacity-100"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default AdsImageSlider;
