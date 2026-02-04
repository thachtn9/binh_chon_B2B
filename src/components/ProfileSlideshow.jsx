import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import slideshowConfig from "../config/slideshowConfig";

const DEFAULT_DURATION = 5; // seconds

const roleBadgeColors = {
  PM: { bg: "#3b82f6", label: "Project Manager" },
  BA: { bg: "#8b5cf6", label: "Business Analyst" },
  DEV: { bg: "#10b981", label: "Developer" },
  TP: { bg: "#ec4899", label: "Trường phòng" },
  PROJECT: { bg: "#f59e0b", label: "Dự án" },
};

// Preload a single image and return a promise
function preloadImage(url) {
  return new Promise((resolve) => {
    if (!url) return resolve();
    const img = new Image();
    img.onload = resolve;
    img.onerror = resolve;
    img.src = url;
  });
}

// Hook: preload images ahead of current index
function useImagePreloader(slides, currentIndex, preloadAhead = 10) {
  const preloadedRef = useRef(new Set());

  useEffect(() => {
    for (let i = 0; i <= preloadAhead; i++) {
      const targetIndex = currentIndex + i;
      if (targetIndex >= slides.length) break;

      const slide = slides[targetIndex];
      const url = slide?.imageUrl;
      if (url && !preloadedRef.current.has(url)) {
        preloadedRef.current.add(url);
        preloadImage(url);
      }
    }
  }, [currentIndex, slides, preloadAhead]);
}

// Sub-component: Full-screen image slide (opening/extra)
function FullScreenImageSlide({ slide }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="slideshow-fullscreen-image">
      {!loaded && (
        <div className="slideshow-image-loading">
          <div className="slideshow-spinner" />
        </div>
      )}
      <img
        src={slide.imageUrl}
        alt={slide.alt || ""}
        className={`slideshow-fullscreen-img ${loaded ? "loaded" : ""}`}
        onLoad={() => setLoaded(true)}
        draggable={false}
      />
    </div>
  );
}

// Sub-component: Full-screen profile image with name overlay
function ProfileImageSlide({ slide }) {
  const { nominee, imageUrl } = slide;
  const [loaded, setLoaded] = useState(false);
  const roleInfo = roleBadgeColors[nominee?.role] || { bg: "#6b7280", label: nominee?.role };

  return (
    <div className="slideshow-fullscreen-image slideshow-profile-image-slide">
      {!loaded && (
        <div className="slideshow-image-loading">
          <div className="slideshow-spinner" />
        </div>
      )}
      <img
        src={imageUrl}
        alt={nominee.full_name || nominee.user_name}
        className={`slideshow-fullscreen-img ${loaded ? "loaded" : ""}`}
        onLoad={() => setLoaded(true)}
        draggable={false}
      />
      {/* Like count badge ở góc phải trên */}
      <div className="slideshow-profile-like-badge">
        <span className="slideshow-profile-like-icon">❤️</span>
        <span className="slideshow-profile-like-count">{nominee.like_count || 0}</span>
      </div>
      <div className="slideshow-profile-overlay">
        <span className="slideshow-profile-role-badge" style={{ backgroundColor: roleInfo.bg }}>
          {roleInfo.label}
        </span>
        <h2 className="slideshow-profile-name">{nominee.full_name || nominee.user_name}</h2>
        <p className="slideshow-profile-username">@{nominee.user_name}</p>
      </div>
    </div>
  );
}

// Sub-component: Full-screen comments slide with profile on right
function CommentsSlide({ slide }) {
  const { nominee, comments } = slide;
  const roleInfo = roleBadgeColors[nominee?.role] || { bg: "#6b7280", label: nominee?.role };

  return (
    <div className="slideshow-comments-fullscreen">
      {/* Left - Comments */}
      <div className="slideshow-comments-left">
        <div className="slideshow-comments-header-full">
          <span className="slideshow-comments-title">💬 Chia sẻ</span>
          <span className="slideshow-comments-count">{comments.length}</span>
        </div>
        {comments.length > 0 ? (
          <div className="slideshow-comments-list-full">
            {[...comments]
              .sort((a, b) => {
                const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
                const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
                return timeB - timeA;
              })
              .slice(0, 20)
              .map((comment) => (
                <div key={comment.id} className="slideshow-comment-item-full">
                  <img
                    src={
                      comment.is_anonymous
                        ? `https://ui-avatars.com/api/?name=A&size=48&background=6b7280&color=fff`
                        : comment.commenter_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.commenter_name || "User")}&size=48&background=6366f1&color=fff`
                    }
                    alt={comment.is_anonymous ? "Ẩn danh" : comment.commenter_name}
                    className="slideshow-comment-avatar-full"
                  />
                  <div className="slideshow-comment-content-full">
                    <span className={`slideshow-comment-author-full ${comment.is_anonymous ? "anonymous" : ""}`}>
                      {comment.is_anonymous ? "🎭 Ẩn danh" : comment.commenter_name || "Ẩn danh"}
                    </span>
                    <p className="slideshow-comment-text-full">{comment.content}</p>
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <div className="slideshow-no-comments-full">
            <span className="no-comments-icon">💭</span>
            <span>Chưa có chia sẻ nào</span>
          </div>
        )}
      </div>

      {/* Right - Profile info */}
      <div className="slideshow-profile-right">
        <div className="slideshow-profile-card">
          <div className="slideshow-avatar-wrapper-full">
            <img
              src={nominee.url_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(nominee.full_name || nominee.user_name)}&size=300&background=6366f1&color=fff`}
              alt={nominee.full_name || nominee.user_name}
              className="slideshow-avatar-full"
            />
            <span className="slideshow-role-badge-full" style={{ backgroundColor: roleInfo.bg }}>
              {roleInfo.label}
            </span>
          </div>

          <div className="slideshow-info-full">
            <h2 className="slideshow-name-full">{nominee.full_name || nominee.user_name}</h2>
            <p className="slideshow-username-full">@{nominee.user_name}</p>
            {nominee.description && <p className="slideshow-description-full">{nominee.description}</p>}

            <div className="slideshow-stats-full">
              <div className="slideshow-stat-full">
                <span className="slideshow-stat-icon-full">❤️</span>
                <span className="slideshow-stat-value-full">{nominee.like_count || 0}</span>
                <span className="slideshow-stat-label">lượt thích</span>
              </div>
              <div className="slideshow-stat-full">
                <span className="slideshow-stat-icon-full">💬</span>
                <span className="slideshow-stat-value-full">{comments.length}</span>
                <span className="slideshow-stat-label">chia sẻ</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProfileSlideshow({ nominees, comments, extraImages = [], onClose }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [slideDirection, setSlideDirection] = useState("next");
  const [isAnimating, setIsAnimating] = useState(false);
  const [duration, setDuration] = useState(() => {
    const saved = localStorage.getItem("slideshow_duration");
    const parsed = saved ? Number(saved) : DEFAULT_DURATION;
    // Sanity check: ensure valid number between 2 and 60
    return !isNaN(parsed) && parsed >= 2 && parsed <= 60 ? parsed : DEFAULT_DURATION;
  });
  const progressRef = useRef(null);
  const intervalRef = useRef(null);
  const startTimeRef = useRef(Date.now());
  const isAnimatingRef = useRef(false); // Ref để tránh stale closure
  const currentIndexRef = useRef(0); // Ref để track currentIndex cho callbacks
  const slidesLengthRef = useRef(0); // Ref để track slides.length cho callbacks

  // Build unified slides array
  const slides = useMemo(() => {
    const result = [];

    // 1. Opening slides (skip those with empty url)
    slideshowConfig.openingSlides
      .filter((s) => s.url && s.url.trim() !== "")
      .forEach((slide) => {
        result.push({
          type: "opening",
          id: slide.id,
          imageUrl: slide.url,
          alt: slide.alt,
        });
      });

    // 2. Nominee slides: profile image → comments for each
    nominees.forEach((nominee) => {
      // Profile image slide (only if url_profile exists)
      if (nominee.url_profile && nominee.url_profile.trim() !== "") {
        result.push({
          type: "profile",
          id: `profile-${nominee.id}`,
          nominee,
          imageUrl: nominee.url_profile,
        });
      }

      // Comments slide (split-layout, always shown)
      result.push({
        type: "comments",
        id: `comments-${nominee.id}`,
        nominee,
        comments: comments[nominee.id] || [],
      });
    });

    // 3. Extra images from database (after profiles)
    extraImages.forEach((img) => {
      if (img.image_url && img.image_url.trim() !== "") {
        result.push({
          type: "extra",
          id: `extra-${img.id}`,
          imageUrl: img.image_url,
          alt: "",
        });
      }
    });

    return result;
  }, [nominees, comments, extraImages]);

  // Cập nhật refs ngay khi slides thay đổi
  slidesLengthRef.current = slides.length;

  // Preload images ahead
  useImagePreloader(slides, currentIndex, slideshowConfig.preloadAhead);

  const currentSlide = slides[currentIndex];

  const isFullScreenSlide = currentSlide && (currentSlide.type === "opening" || currentSlide.type === "extra" || currentSlide.type === "profile" || currentSlide.type === "comments");

  // Calculate effective duration (base + bonus for comments)
  // Logic: +2s per comment, max +10s
  const effectiveDuration = useMemo(() => {
    let bonus = 0;
    if (currentSlide?.type === "comments" && currentSlide.comments?.length > 0) {
      bonus = Math.min(currentSlide.comments.length * 2, 10);
    }
    return duration + bonus;
  }, [duration, currentSlide]);

  // Counter display text
  const getCounterText = useCallback(() => {
    if (!currentSlide) return "";
    const openingCount = slideshowConfig.openingSlides.filter((s) => s.url && s.url.trim() !== "").length;

    switch (currentSlide.type) {
      case "opening": {
        const openingIndex = slides.filter((s, i) => s.type === "opening" && i <= currentIndex).length;
        return `Giới thiệu ${openingIndex}/${openingCount}`;
      }
      case "profile":
        return `${currentSlide.nominee.full_name || currentSlide.nominee.user_name} - Profile`;
      case "comments":
        return `${currentSlide.nominee.full_name || currentSlide.nominee.user_name} - Chia sẻ`;
      case "extra": {
        const extraSlides = slides.filter((s) => s.type === "extra");
        const extraIndex = extraSlides.findIndex((s) => s.id === currentSlide.id) + 1;
        return `Ảnh bổ sung ${extraIndex}/${extraSlides.length}`;
      }
      default:
        return `${currentIndex + 1} / ${slides.length}`;
    }
  }, [currentSlide, currentIndex, slides]);

  const goToSlide = useCallback(
    (index, direction) => {
      if (isAnimatingRef.current) return;
      isAnimatingRef.current = true;
      setIsAnimating(true);
      setSlideDirection(direction);
      setTimeout(() => {
        setCurrentIndex(index);
        isAnimatingRef.current = false;
        setIsAnimating(false);
        startTimeRef.current = Date.now();
      }, 300);
    },
    [] // Không có dependency vì sử dụng ref
  );

  // Cập nhật currentIndexRef đồng bộ
  currentIndexRef.current = currentIndex;

  const goNext = useCallback(() => {
    const nextIndex = currentIndexRef.current + 1;
    if (nextIndex >= slidesLengthRef.current) {
      // End of slideshow
      onClose();
      return;
    }
    goToSlide(nextIndex, "next");
  }, [goToSlide, onClose]);

  const goPrev = useCallback(() => {
    if (currentIndexRef.current <= 0) return;
    goToSlide(currentIndexRef.current - 1, "prev");
  }, [goToSlide]);

  const togglePause = useCallback(() => {
    setIsPaused((prev) => !prev);
    startTimeRef.current = Date.now();
  }, []);

  // Save duration to localStorage
  useEffect(() => {
    localStorage.setItem("slideshow_duration", duration);
  }, [duration]);

  // Auto-play
  // Keep a ref to goNext to avoid resetting interval when goNext identity changes (e.g. from onClose prop)
  const goNextRef = useRef(goNext);
  useEffect(() => {
    goNextRef.current = goNext;
  }, [goNext]);

  useEffect(() => {
    if (isPaused) {
      return;
    }

    const id = setInterval(() => {
      if (!isAnimatingRef.current) {
        goNextRef.current();
      }
    }, effectiveDuration * 1000);

    return () => clearInterval(id);
  }, [isPaused, effectiveDuration, currentIndex]);

  // Progress bar animation
  useEffect(() => {
    if (!progressRef.current) return;

    if (isPaused || isAnimating) {
      progressRef.current.style.animationPlayState = "paused";
      return;
    }

    const el = progressRef.current;
    el.style.animation = "none";
    void el.offsetHeight;
    el.style.animation = `slideshow-progress ${effectiveDuration * 1000}ms linear`;
    el.style.animationPlayState = "running";
  }, [currentIndex, isPaused, isAnimating, effectiveDuration]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      switch (e.key) {
        case "Escape":
          onClose();
          break;
        case "ArrowRight":
          e.preventDefault();
          goNext();
          break;
        case "ArrowLeft":
          e.preventDefault();
          goPrev();
          break;
        case " ":
          e.preventDefault();
          togglePause();
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose, goNext, goPrev, togglePause]);

  if (!currentSlide || slides.length === 0) return null;

  // Render slide content based on type
  const renderSlideContent = () => {
    switch (currentSlide.type) {
      case "opening":
      case "extra":
        return <FullScreenImageSlide slide={currentSlide} />;
      case "profile":
        return <ProfileImageSlide slide={currentSlide} />;
      case "comments":
        return <CommentsSlide slide={currentSlide} />;
      default:
        return null;
    }
  };

  return (
    <div className="slideshow-overlay" onClick={onClose}>
      <div className={`slideshow-container ${isFullScreenSlide ? "slideshow-container-fullscreen" : ""}`} onClick={(e) => e.stopPropagation()}>
        {/* Close button */}
        <button className="slideshow-close-btn" onClick={onClose} title="Đóng (ESC)">
          ✕
        </button>

        {/* Progress bar */}
        <div className="slideshow-progress-bar">
          <div className="slideshow-progress-fill" ref={progressRef} />
        </div>

        {/* Navigation arrows */}
        {currentIndex > 0 && (
          <button className="slideshow-nav-btn slideshow-prev" onClick={goPrev} title="Trước (←)">
            ◀
          </button>
        )}
        {currentIndex < slides.length - 1 && (
          <button className="slideshow-nav-btn slideshow-next" onClick={goNext} title="Sau (→)">
            ▶
          </button>
        )}

        {/* Slide content */}
        <div className={`slideshow-slide ${isFullScreenSlide ? "slideshow-slide-fullscreen" : ""} ${isAnimating ? `slide-out-${slideDirection}` : "slide-in"}`}>{renderSlideContent()}</div>

        {/* Controls */}
        <div className="slideshow-controls">
          <button className="slideshow-pause-btn" onClick={togglePause} title={isPaused ? "Tiếp tục (Space)" : "Tạm dừng (Space)"}>
            {isPaused ? "▶" : "⏸"}
          </button>
          <div className="slideshow-duration-control">
            <button className="slideshow-duration-btn" onClick={() => setDuration((d) => Math.max(2, d - 1))} title="Giảm thời gian">
              −
            </button>
            <span className="slideshow-duration-value">{duration}s</span>
            <button className="slideshow-duration-btn" onClick={() => setDuration((d) => Math.min(30, d + 1))} title="Tăng thời gian">
              +
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
