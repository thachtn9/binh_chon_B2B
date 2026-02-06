import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import slideshowConfig from "../config/slideshowConfig";
import { fetchSlideshowImages } from "../lib/supabase";

const DEFAULT_DURATION = 3; // seconds
const EXTRA_INTRO_LINES = ["CHÀO CÁC BẠN !", "NGÀY HÔM NAY CỦA CÁC BẠN NHƯ THẾ NÀO !", "CÒN ĐÂY LÀ !", "NGÀY HÔM NAY !", "CỦA CHÚNG TA !"];
const EXTRA_TYPING_DURATION = 2.5; // seconds
const EXTRA_HOLD_DURATION = 0.7; // seconds
const EXTRA_FADE_DURATION = 0.4; // seconds
const EXTRA_LINE_TOTAL = EXTRA_TYPING_DURATION + EXTRA_HOLD_DURATION + EXTRA_FADE_DURATION;
const EXTRA_INTRO_TOTAL_DURATION = (EXTRA_INTRO_LINES.length - 1) * EXTRA_LINE_TOTAL + EXTRA_TYPING_DURATION + EXTRA_HOLD_DURATION + EXTRA_FADE_DURATION;
const FAREWELL_LINES = [
  { text: "XIN CẢM ƠN TẤT CẢ CHÚNG TA !", typing: 2.5, hold: 3, fade: 0.4 },
  { text: "CHÀO TẠM BIỆT . . .", typing: 4.5, hold: 5, fade: 0.4 },
  { text: "VÀ !", typing: 1.2, hold: 2, fade: 0.3 },
  { text: "HẸN GẶP LẠI !!! ", typing: 2.5, hold: 5, fade: 0.4 },
];
const FAREWELL_TOTAL_DURATION = FAREWELL_LINES.reduce((total, line) => total + (line.typing + line.hold + line.fade), 0);
const CLOSING_TEXT = "THANK YOU!";
const CLOSING_TOTAL_DURATION = EXTRA_TYPING_DURATION + EXTRA_HOLD_DURATION + EXTRA_FADE_DURATION;

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
function FullScreenImageSlide({ slide, isExtra = false }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className={`slideshow-fullscreen-image ${isExtra ? "slideshow-extra-zoom" : ""}`}>
      {!loaded && (
        <div className="slideshow-image-loading">
          <div className="slideshow-spinner" />
        </div>
      )}
      <img src={slide.imageUrl} alt={slide.alt || ""} className={`slideshow-fullscreen-img ${loaded ? "loaded" : ""}`} onLoad={() => setLoaded(true)} draggable={false} />
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
      <img src={imageUrl} alt={nominee.full_name || nominee.user_name} className={`slideshow-fullscreen-img ${loaded ? "loaded" : ""}`} onLoad={() => setLoaded(true)} draggable={false} />
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
                    src={comment.is_anonymous ? `https://ui-avatars.com/api/?name=A&size=48&background=6b7280&color=fff` : comment.commenter_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.commenter_name || "User")}&size=48&background=6366f1&color=fff`}
                    alt={comment.is_anonymous ? "Ẩn danh" : comment.commenter_name}
                    className="slideshow-comment-avatar-full"
                  />
                  <div className="slideshow-comment-content-full">
                    <span className={`slideshow-comment-author-full ${comment.is_anonymous ? "anonymous" : ""}`}>{comment.is_anonymous ? "🎭 Ẩn danh" : comment.commenter_name || "Ẩn danh"}</span>
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
            <img src={nominee.url_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(nominee.full_name || nominee.user_name)}&size=300&background=6366f1&color=fff`} alt={nominee.full_name || nominee.user_name} className="slideshow-avatar-full" />
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

// Sub-component: Black intro slide before extra images
function ExtraIntroSlide() {
  return (
    <div className="slideshow-extra-intro">
      <div className="slideshow-extra-intro-inner">
        {EXTRA_INTRO_LINES.map((text, index) => (
          <div
            key={text}
            className="slideshow-extra-line"
            style={{
              "--delay": `${index * EXTRA_LINE_TOTAL}s`,
              "--typing": `${EXTRA_TYPING_DURATION}s`,
              "--hold": `${EXTRA_HOLD_DURATION}s`,
              "--fade": `${EXTRA_FADE_DURATION}s`,
              "--chars": text.length,
            }}
          >
            <span className="slideshow-extra-text">{text}</span>
            <span className="slideshow-extra-caret" aria-hidden="true" />
          </div>
        ))}
      </div>
    </div>
  );
}

// Sub-component: Farewell black slide with multi-line typing text
function FarewellSlide() {
  let runningDelay = 0;

  return (
    <div className="slideshow-extra-intro slideshow-farewell">
      <div className="slideshow-extra-intro-inner">
        {FAREWELL_LINES.map((line) => {
          const delay = runningDelay;
          const total = line.typing + line.hold + line.fade;
          runningDelay += total;
          return (
            <div
              key={line.text}
              className="slideshow-extra-line"
              style={{
                "--delay": `${delay}s`,
                "--typing": `${line.typing}s`,
                "--hold": `${line.hold}s`,
                "--fade": `${line.fade}s`,
                "--chars": line.text.length,
              }}
            >
              <span className="slideshow-extra-text">{line.text}</span>
              <span className="slideshow-extra-caret" aria-hidden="true" />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Sub-component: Closing slide using opening-1 image with typing text
function ClosingSlide({ imageUrl, alt }) {
  return (
    <div className="slideshow-closing-slide">
      <img src={imageUrl} alt={alt || ""} className="slideshow-fullscreen-img loaded" draggable={false} />
      <div className="slideshow-closing-overlay">
        <div
          className="slideshow-extra-line slideshow-closing-line"
          style={{
            "--delay": `0s`,
            "--typing": `${EXTRA_TYPING_DURATION}s`,
            "--hold": `${EXTRA_HOLD_DURATION}s`,
            "--fade": `${EXTRA_FADE_DURATION}s`,
            "--chars": CLOSING_TEXT.length,
          }}
        >
          <span className="slideshow-extra-text">{CLOSING_TEXT}</span>
          <span className="slideshow-extra-caret" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}

export default function ProfileSlideshow({ nominees, comments, extraImages = [], onClose }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [slideDirection, setSlideDirection] = useState("next");
  const [transitionType, setTransitionType] = useState("slide"); // "slide" hoặc "fade"
  const [isAnimating, setIsAnimating] = useState(false);
  const [extraQueue, setExtraQueue] = useState(() => extraImages);
  const audioRef = useRef(null);
  const [duration, setDuration] = useState(() => {
    const saved = localStorage.getItem("slideshow_duration");
    const parsed = saved ? Number(saved) : DEFAULT_DURATION;
    // Sanity check: ensure valid number between 2 and 60
    return !isNaN(parsed) && parsed >= 2 && parsed <= 60 ? parsed : DEFAULT_DURATION;
  });
  const progressRef = useRef(null);
  const intervalRef = useRef(null);
  const startTimeRef = useRef(null);
  const isAnimatingRef = useRef(false); // Ref để tránh stale closure
  const currentIndexRef = useRef(0); // Ref để track currentIndex cho callbacks
  const slidesLengthRef = useRef(0); // Ref để track slides.length cho callbacks

  // Initialize startTimeRef on mount
  useEffect(() => {
    if (startTimeRef.current === null) {
      startTimeRef.current = Date.now();
    }
  }, []);

  // Keep extra images queue in sync with props (only append new ones to preserve order)
  useEffect(() => {
    if (!extraImages || extraImages.length === 0) return;
    setExtraQueue((prev) => {
      const existing = new Set(prev.map((img) => img.id));
      const merged = [...prev];
      extraImages.forEach((img) => {
        if (!existing.has(img.id)) {
          merged.push(img);
          existing.add(img.id);
        }
      });
      return merged;
    });
  }, [extraImages]);

  // Poll DB every 5s to append newly uploaded extra images to the queue
  useEffect(() => {
    let isActive = true;

    const poll = async () => {
      try {
        const data = await fetchSlideshowImages();
        if (!isActive || !data || data.length === 0) return;
        setExtraQueue((prev) => {
          const existing = new Set(prev.map((img) => img.id));
          const newOnes = data.filter((img) => !existing.has(img.id));
          if (newOnes.length === 0) return prev;
          return [...prev, ...newOnes];
        });
      } catch (err) {
        console.error("Error polling slideshow images:", err);
      }
    };

    poll();
    const id = setInterval(poll, 5000);
    return () => {
      isActive = false;
      clearInterval(id);
    };
  }, []);

  // Build unified slides array
  const slides = useMemo(() => {
    const result = [];

    const openingSlides = slideshowConfig.openingSlides.filter((s) => s.url && s.url.trim() !== "");
    const opening1 = openingSlides.find((s) => s.id === "opening-1") || openingSlides[0];

    // 1. Opening slides (skip those with empty url)
    openingSlides.forEach((slide) => {
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
    // Sort by captured_at (oldest first), fallback to created_at
    const sortedExtraQueue = [...extraQueue].sort((a, b) => {
      const dateA = a.captured_at || a.created_at || "";
      const dateB = b.captured_at || b.created_at || "";
      return new Date(dateA).getTime() - new Date(dateB).getTime();
    });

    if (sortedExtraQueue.length > 0) {
      result.push({
        type: "extra-intro",
        id: "extra-intro",
      });
    }

    sortedExtraQueue.forEach((img) => {
      if (img.image_url && img.image_url.trim() !== "") {
        result.push({
          type: "extra",
          id: `extra-${img.id}`,
          imageUrl: img.image_url,
          alt: "",
          capturedAt: img.captured_at, // Giữ lại để có thể hiển thị nếu cần
        });
      }
    });

    if (sortedExtraQueue.length > 0 && opening1) {
      result.push({
        type: "farewell",
        id: "farewell",
      });
      result.push({
        type: "closing",
        id: "closing",
        imageUrl: opening1.url,
        alt: opening1.alt,
      });
    }

    return result;
  }, [nominees, comments, extraQueue]);

  const extraStartIndex = useMemo(() => slides.findIndex((s) => s.type === "extra-intro" || s.type === "extra"), [slides]);

  // Cập nhật refs ngay khi slides thay đổi
  useEffect(() => {
    slidesLengthRef.current = slides.length;
  }, [slides.length]);

  // Preload images ahead
  useImagePreloader(slides, currentIndex, slideshowConfig.preloadAhead);

  const currentSlide = slides[currentIndex];

  const isFullScreenSlide = currentSlide && (currentSlide.type === "opening" || currentSlide.type === "extra" || currentSlide.type === "extra-intro" || currentSlide.type === "farewell" || currentSlide.type === "closing" || currentSlide.type === "profile" || currentSlide.type === "comments");

  // Calculate effective duration (base + bonus for comments)
  // Logic: +2s per comment, max +10s
  const effectiveDuration = useMemo(() => {
    if (currentSlide?.type === "extra-intro") {
      return Math.max(duration, EXTRA_INTRO_TOTAL_DURATION);
    }
    if (currentSlide?.type === "farewell") {
      return Math.max(duration, FAREWELL_TOTAL_DURATION);
    }
    if (currentSlide?.type === "closing") {
      return Math.max(duration, CLOSING_TOTAL_DURATION);
    }
    let bonus = 0;
    if (currentSlide?.type === "comments" && currentSlide.comments?.length > 0) {
      bonus = Math.min(currentSlide.comments.length * 1.5, 6);
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
      case "extra-intro":
        return "Ảnh bổ sung";
      case "farewell":
        return "Lời tạm biệt";
      case "closing":
        return "Kết thúc";
      default:
        return `${currentIndex + 1} / ${slides.length}`;
    }
  }, [currentSlide, currentIndex, slides]);

  const goToSlide = useCallback(
    (index, direction) => {
      if (isAnimatingRef.current) return;

      // Kiểm tra xem có phải đang chuyển từ profile sang comments của cùng nominee không
      // VÀ đang đi tiến (next), không áp dụng khi đi lùi (prev)
      const currentSlide = slides[currentIndexRef.current];
      const nextSlide = slides[index];
      const isProfileToComments = direction === "next" && currentSlide?.type === "profile" && nextSlide?.type === "comments" && currentSlide?.nominee?.id === nextSlide?.nominee?.id;

      // Đặt loại transition
      setTransitionType(isProfileToComments ? "fade" : "slide");

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
    [slides] // Thêm slides vào dependency
  );

  // Cập nhật currentIndexRef đồng bộ
  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  const goNext = useCallback(() => {
    const nextIndex = currentIndexRef.current + 1;
    if (nextIndex >= slidesLengthRef.current) {
      // End of slideshow
      if (slides[currentIndexRef.current]?.type === "closing") {
        return;
      }
      onClose();
      return;
    }
    goToSlide(nextIndex, "next");
  }, [goToSlide, onClose, slides]);

  const goPrev = useCallback(() => {
    if (currentIndexRef.current <= 0) return;
    goToSlide(currentIndexRef.current - 1, "prev");
  }, [goToSlide]);

  const togglePause = useCallback(() => {
    setIsPaused((prev) => !prev);
    startTimeRef.current = Date.now();
  }, []);

  const goToExtra = useCallback(() => {
    if (extraStartIndex < 0) return;
    if (extraStartIndex === currentIndexRef.current) return;
    const direction = extraStartIndex > currentIndexRef.current ? "next" : "prev";
    goToSlide(extraStartIndex, direction);
  }, [extraStartIndex, goToSlide]);

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

  // Auto-play background music (loop)
  useEffect(() => {
    if (!audioRef.current) return;
    const audio = audioRef.current;

    const tryPlay = async () => {
      try {
        await audio.play();
      } catch (err) {
        // Autoplay may be blocked until user interaction
        console.warn("Background audio autoplay blocked:", err);
      }
    };

    tryPlay();

    return () => {
      audio.pause();
      audio.currentTime = 0;
    };
  }, []);

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
        return <FullScreenImageSlide key={currentSlide.id} slide={currentSlide} />;
      case "extra":
        return <FullScreenImageSlide key={currentSlide.id} slide={currentSlide} isExtra />;
      case "extra-intro":
        return <ExtraIntroSlide />;
      case "farewell":
        return <FarewellSlide />;
      case "closing":
        return <ClosingSlide imageUrl={currentSlide.imageUrl} alt={currentSlide.alt} />;
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
        <audio ref={audioRef} src="/sound/bgSlideShow.mp3" autoPlay loop />
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
        <div className={`slideshow-slide ${isFullScreenSlide ? "slideshow-slide-fullscreen" : ""} ${isAnimating ? (transitionType === "fade" ? `slide-fade-out` : `slide-out-${slideDirection}`) : transitionType === "fade" ? "slide-fade-in" : "slide-in"}`}>{renderSlideContent()}</div>

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

        {extraStartIndex >= 0 && (
          <button className="slideshow-extra-btn slideshow-extra-btn-floating" onClick={goToExtra} title="Đến phần ảnh bổ sung">
            Extra
          </button>
        )}
      </div>
    </div>
  );
}
