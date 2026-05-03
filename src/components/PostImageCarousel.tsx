import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface PostImageCarouselProps {
  images: string[];
  className?: string;
  onImageClick?: (index: number) => void;
}

const isVideoUrl = (url: string) =>
  /\.(mp4|webm|mov|avi|mkv|ogg)(\?.*)?$/i.test(url);

export const PostImageCarousel = ({ images, className, onImageClick }: PostImageCarouselProps) => {
  const [index, setIndex] = useState(0);
  const [aspectRatio, setAspectRatio] = useState<number>(1);
  const [aspectResolved, setAspectResolved] = useState(false);
  const [loaded, setLoaded] = useState(false);

  if (!images || images.length === 0) return null;

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    setLoaded(true);
    if (aspectResolved) return;
    const { naturalWidth, naturalHeight } = e.currentTarget;
    if (!naturalWidth || !naturalHeight) return;
    const ratio = naturalHeight / naturalWidth;
    setAspectRatio(Math.min(1.25, Math.max(1, ratio)));
    setAspectResolved(true);
  };

  const goTo = (direction: "prev" | "next") => {
    setIndex((prev) =>
      direction === "next"
        ? prev === images.length - 1 ? 0 : prev + 1
        : prev === 0 ? images.length - 1 : prev - 1
    );
  };

  const single = images.length === 1;

  return (
    <div
      className={cn("relative w-full overflow-hidden bg-muted", className)}
      style={{ paddingTop: `${aspectRatio * 100}%` }}
    >
      {/* Skeleton shimmer while first image loads */}
      {!loaded && (
        <div className="absolute inset-0">
          <Skeleton className="w-full h-full rounded-none" />
        </div>
      )}
      {/* Sliding strip — absolutely fills the padding-top container */}
      <div
        className="absolute inset-0 flex transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {images.map((src, idx) => (
          <div
            key={`${src}-${idx}`}
            className="relative w-full h-full flex-shrink-0 overflow-hidden"
            onClick={() => !isVideoUrl(src) && onImageClick?.(idx)}
            style={{ cursor: !isVideoUrl(src) && onImageClick ? "zoom-in" : "default" }}
          >
            {isVideoUrl(src) ? (
              <video
                src={src}
                controls
                playsInline
                className="w-full h-full object-contain bg-black select-none"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <img
                src={src}
                alt={`Post image ${idx + 1}`}
                onLoad={idx === index ? handleImageLoad : undefined}
                className="w-full h-full object-cover select-none"
                loading={idx === index ? "eager" : "lazy"}
                decoding="async"
                draggable={false}
              />
            )}
          </div>
        ))}
      </div>

      {/* Prev / Next — only when multi-image */}
      {!single && (
        <>
          <button
            type="button"
            onClick={() => goTo("prev")}
            className="absolute left-3 top-1/2 z-10 -translate-y-1/2 flex items-center justify-center rounded-full bg-black/40 p-1.5 text-white backdrop-blur-sm hover:bg-black/65 transition-colors"
            aria-label="Previous image"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => goTo("next")}
            className="absolute right-3 top-1/2 z-10 -translate-y-1/2 flex items-center justify-center rounded-full bg-black/40 p-1.5 text-white backdrop-blur-sm hover:bg-black/65 transition-colors"
            aria-label="Next image"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </>
      )}

      {/* Image counter pill (top-right) for multi-image */}
      {!single && (
        <div className="absolute top-3 right-3 z-10 rounded-full bg-black/50 px-2.5 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
          {index + 1} / {images.length}
        </div>
      )}

      {/* Dot strip */}
      {!single && (
        <div className="absolute bottom-3 left-0 right-0 z-10 flex items-center justify-center gap-1.5">
          {images.map((_, dotIdx) => (
            <span
              key={dotIdx}
              className={cn(
                "h-1.5 rounded-full bg-white/50 transition-all duration-300",
                dotIdx === index ? "w-5 bg-white" : "w-1.5"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
};
