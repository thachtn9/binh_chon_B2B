import { useState, useEffect, useCallback, useRef } from "react";

const DEFAULT_DURATION = 5; // seconds

const roleBadgeColors = {
  PM: { bg: "#3b82f6", label: "Project Manager" },
  BA: { bg: "#8b5cf6", label: "Business Analyst" },
  DEV: { bg: "#10b981", label: "Developer" },
  TP: { bg: "#ec4899", label: "Trường phòng" },
  PROJECT: { bg: "#f59e0b", label: "Dự án" },
};

export default function ProfileSlideshow({ nominees, comments, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [slideDirection, setSlideDirection] = useState("next");
  const [isAnimating, setIsAnimating] = useState(false);
  const [duration, setDuration] = useState(() => {
    const saved = localStorage.getItem("slideshow_duration");
    return saved ? Number(saved) : DEFAULT_DURATION;
  });
  const progressRef = useRef(null);
  const intervalRef = useRef(null);
  const startTimeRef = useRef(Date.now());

  const nominee = nominees[currentIndex];
  const nomineeComments = comments[nominee?.id] || [];
  const roleInfo = roleBadgeColors[nominee?.role] || { bg: "#6b7280", label: nominee?.role };

  const goToSlide = useCallback((index, direction) => {
    if (isAnimating) return;
    setIsAnimating(true);
    setSlideDirection(direction);
    setTimeout(() => {
      setCurrentIndex(index);
      setIsAnimating(false);
      startTimeRef.current = Date.now();
    }, 300);
  }, [isAnimating]);

  const goNext = useCallback(() => {
    const nextIndex = (currentIndex + 1) % nominees.length;
    goToSlide(nextIndex, "next");
  }, [currentIndex, nominees.length, goToSlide]);

  const goPrev = useCallback(() => {
    const prevIndex = (currentIndex - 1 + nominees.length) % nominees.length;
    goToSlide(prevIndex, "prev");
  }, [currentIndex, nominees.length, goToSlide]);

  const togglePause = useCallback(() => {
    setIsPaused((prev) => !prev);
    startTimeRef.current = Date.now();
  }, []);

  // Save duration to localStorage
  useEffect(() => {
    localStorage.setItem("slideshow_duration", duration);
  }, [duration]);

  // Auto-play
  useEffect(() => {
    if (isPaused || isAnimating) {
      clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      goNext();
    }, duration * 1000);

    return () => clearInterval(intervalRef.current);
  }, [isPaused, isAnimating, goNext, duration]);

  // Progress bar animation
  useEffect(() => {
    if (!progressRef.current) return;

    if (isPaused || isAnimating) {
      progressRef.current.style.animationPlayState = "paused";
      return;
    }

    // Reset and restart animation
    const el = progressRef.current;
    el.style.animation = "none";
    // Force reflow
    void el.offsetHeight;
    el.style.animation = `slideshow-progress ${duration * 1000}ms linear`;
    el.style.animationPlayState = "running";
  }, [currentIndex, isPaused, isAnimating, duration]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      switch (e.key) {
        case "Escape":
          onClose();
          break;
        case "ArrowRight":
          goNext();
          break;
        case "ArrowLeft":
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

  if (!nominee) return null;

  return (
    <div className="slideshow-overlay" onClick={onClose}>
      <div className="slideshow-container" onClick={(e) => e.stopPropagation()}>
        {/* Close button */}
        <button className="slideshow-close-btn" onClick={onClose} title="Đóng (ESC)">
          ✕
        </button>

        {/* Progress bar */}
        <div className="slideshow-progress-bar">
          <div className="slideshow-progress-fill" ref={progressRef} />
        </div>

        {/* Counter */}
        <div className="slideshow-counter">
          {currentIndex + 1} / {nominees.length}
        </div>

        {/* Navigation arrows */}
        <button className="slideshow-nav-btn slideshow-prev" onClick={goPrev} title="Trước (←)">
          ◀
        </button>
        <button className="slideshow-nav-btn slideshow-next" onClick={goNext} title="Sau (→)">
          ▶
        </button>

        {/* Slide content - split layout */}
        <div className={`slideshow-slide ${isAnimating ? `slide-out-${slideDirection}` : "slide-in"}`}>
          {/* Left - Profile info */}
          <div className="slideshow-left">
            <div className="slideshow-avatar-wrapper">
              <img
                src={nominee.url_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(nominee.full_name || nominee.user_name)}&size=300&background=6366f1&color=fff`}
                alt={nominee.full_name || nominee.user_name}
                className="slideshow-avatar"
              />
              <span className="slideshow-role-badge" style={{ backgroundColor: roleInfo.bg }}>
                {roleInfo.label}
              </span>
            </div>

            <div className="slideshow-info">
              <h2 className="slideshow-name">{nominee.full_name || nominee.user_name}</h2>
              <p className="slideshow-username">@{nominee.user_name}</p>
              {nominee.description && <p className="slideshow-description">{nominee.description}</p>}

              <div className="slideshow-stats">
                <div className="slideshow-stat">
                  <span className="slideshow-stat-icon">❤️</span>
                  <span className="slideshow-stat-value">{nominee.like_count || 0}</span>
                </div>
                <div className="slideshow-stat">
                  <span className="slideshow-stat-icon">💬</span>
                  <span className="slideshow-stat-value">{nomineeComments.length}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right - Comments */}
          <div className="slideshow-right">
            <div className="slideshow-comments-header">💬 Chia sẻ ({nomineeComments.length})</div>
            {nomineeComments.length > 0 ? (
              <div className="slideshow-comments-list">
                {[...nomineeComments]
                  .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                  .slice(0, 5)
                  .map((comment) => (
                    <div key={comment.id} className="slideshow-comment-item">
                      <img
                        src={
                          comment.is_anonymous
                            ? `https://ui-avatars.com/api/?name=A&size=32&background=6b7280&color=fff`
                            : comment.commenter_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.commenter_name || "User")}&size=32&background=6366f1&color=fff`
                        }
                        alt={comment.is_anonymous ? "Ẩn danh" : comment.commenter_name}
                        className="slideshow-comment-avatar"
                      />
                      <div className="slideshow-comment-content">
                        <span className={`slideshow-comment-author ${comment.is_anonymous ? "anonymous" : ""}`}>
                          {comment.is_anonymous ? "Ẩn danh" : comment.commenter_name || "Ẩn danh"}
                        </span>
                        <p className="slideshow-comment-text">{comment.content}</p>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="slideshow-no-comments">Chưa có chia sẻ nào</div>
            )}
          </div>
        </div>

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
