import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { likeNominee } from "../lib/supabase";

// Các placeholder gợi mở cho comment input
const getCommentPlaceholders = (name) => [
  `Hãy gửi đôi lời đến ${name} nhé! 💬`,
  `Chia sẻ điều bạn ấn tượng về ${name}...`,
  `${name} có gì khiến bạn ngưỡng mộ?`,
  `Gửi lời động viên đến ${name} nào! ✨`,
  `Bạn muốn nói gì với ${name}?`,
  `Kể về kỷ niệm của bạn với ${name}...`,
  `${name} đã truyền cảm hứng cho bạn thế nào?`,
  `Điều gì làm ${name} trở nên đặc biệt?`,
  `Hãy để lại lời nhắn cho ${name}! 🌟`,
  `Chia sẻ cảm nhận của bạn về ${name}...`,
];

// Debounce hook for like button - flushes pending likes on unmount
function useDebounce(callback, delay) {
  const timeoutRef = useRef(null);
  const pendingCountRef = useRef(0);
  const callbackRef = useRef(callback);

  // Keep callback ref updated to avoid stale closures
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Flush function - immediately execute pending callback
  const flush = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (pendingCountRef.current > 0) {
      const count = pendingCountRef.current;
      pendingCountRef.current = 0;
      callbackRef.current(count);
    }
  }, []);

  const debouncedCallback = useCallback(() => {
    pendingCountRef.current += 1;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      flush();
    }, delay);
  }, [delay, flush]);

  // Flush on unmount to save pending likes before cleanup
  useEffect(() => {
    return () => {
      flush();
    };
  }, [flush]);

  return [debouncedCallback, pendingCountRef, flush];
}

// Role badge colors
const roleBadgeColors = {
  PM: { bg: "#3b82f6", label: "Project Manager" },
  BA: { bg: "#8b5cf6", label: "Business Analyst" },
  DEV: { bg: "#10b981", label: "Developer" },
  TP: { bg: "#ec4899", label: "Trường phòng" },
  PROJECT: { bg: "#f59e0b", label: "Dự án" },
};

export default function NomineeDetailModal({ isOpen, onClose, nominee, comments = [], onAddComment, onLikeChange, user, defaultAnonymous = false, isLoading = false }) {
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [likeCount, setLikeCount] = useState(0);
  const [isLiking, setIsLiking] = useState(false);
  const [likeAnimation, setLikeAnimation] = useState(false);
  const [flyingHearts, setFlyingHearts] = useState([]);
  const commentsEndRef = useRef(null);
  const inputRef = useRef(null);
  const heartIdRef = useRef(0);

  // Random placeholder gợi mở - chọn ngẫu nhiên mỗi lần mở modal
  const commentPlaceholder = useMemo(() => {
    if (!nominee) return "Viết bình luận của bạn...";
    const firstName = (nominee.full_name || nominee.user_name || "").split(" ").pop();
    const placeholders = getCommentPlaceholders(firstName);
    return placeholders[Math.floor(Math.random() * placeholders.length)];
  }, [nominee, isOpen]);

  // Initialize like count from nominee data
  useEffect(() => {
    if (nominee) {
      setLikeCount(nominee.like_count || 0);
    }
  }, [nominee]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setNewComment("");
      setIsAnonymous(true);
      // Focus input when modal opens
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, defaultAnonymous]);

  // Scroll to bottom of comments when new comment is added
  useEffect(() => {
    if (commentsEndRef.current) {
      commentsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [comments.length]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEsc);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;

    setIsSubmitting(true);
    try {
      await onAddComment(nominee.id, newComment.trim(), isAnonymous);
      setNewComment("");
      setIsAnonymous(true);
    } catch (error) {
      console.error("Error submitting comment:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Debounced like action - accumulates clicks and sends to DB after 500ms of no clicking
  const submitLikes = useCallback(
    async (clickCount) => {
      if (!nominee?.id || clickCount <= 0) return;

      setIsLiking(true);
      try {
        // Single API call with total accumulated count
        await likeNominee(nominee.id, clickCount);
      } catch (error) {
        console.error("Error liking nominee:", error);
      } finally {
        setIsLiking(false);
      }
    },
    [nominee?.id]
  );

  const [debouncedLike] = useDebounce(submitLikes, 300);

  // Throttle ref for flying hearts animation
  const lastHeartAnimationRef = useRef(0);
  const maxFlyingHeartsRef = useRef(30); // Limit total flying hearts

  // Create flying hearts effect - throttled to reduce lag
  const createFlyingHearts = useCallback(() => {
    const now = Date.now();
    // Throttle: only create new hearts every 80ms
    if (now - lastHeartAnimationRef.current < 80) return;
    lastHeartAnimationRef.current = now;

    // Don't create more hearts if we already have too many
    if (flyingHearts.length >= maxFlyingHeartsRef.current) return;

    const heartEmojis = ["❤️", "💕", "💖", "💗", "💓", "💞"];
    const newHearts = [];
    const numHearts = 4 + Math.floor(Math.random() * 3); // 4-6 hearts

    for (let i = 0; i < numHearts; i++) {
      heartIdRef.current += 1;
      newHearts.push({
        id: heartIdRef.current,
        emoji: heartEmojis[Math.floor(Math.random() * heartEmojis.length)],
        left: 30 + Math.random() * 40,
        animationDuration: 0.8 + Math.random() * 0.4, // Faster: 0.8-1.2s
        delay: 0,
        size: 1.2 + Math.random() * 0.4,
      });
    }

    setFlyingHearts((prev) => {
      const combined = [...prev, ...newHearts];
      // Keep only the most recent hearts if too many
      return combined.slice(-maxFlyingHeartsRef.current);
    });

    // Remove hearts after animation - use Set for O(1) lookup
    const newHeartIds = new Set(newHearts.map((h) => h.id));
    setTimeout(() => {
      setFlyingHearts((prev) => prev.filter((h) => !newHeartIds.has(h.id)));
    }, 1500);
  }, [flyingHearts.length]);

  // Animation state ref to avoid multiple timeouts
  const likeAnimationTimeoutRef = useRef(null);

  // Handle like action with debounce
  const handleLike = useCallback(() => {
    // Immediately update UI
    setLikeCount((prev) => prev + 1);

    // Debounce animation state to reduce re-renders
    setLikeAnimation(true);
    if (likeAnimationTimeoutRef.current) {
      clearTimeout(likeAnimationTimeoutRef.current);
    }
    likeAnimationTimeoutRef.current = setTimeout(() => setLikeAnimation(false), 300);

    // Create flying hearts effect (throttled internally)
    createFlyingHearts();

    // Notify parent to update nominee's like count
    if (onLikeChange && nominee?.id) {
      onLikeChange(nominee.id);
    }

    // Debounce the API call
    debouncedLike();
  }, [createFlyingHearts, onLikeChange, nominee?.id, debouncedLike]);

  if (!isOpen || !nominee) return null;

  const roleInfo = roleBadgeColors[nominee.role] || {
    bg: "#6b7280",
    label: nominee.role,
  };

  // Sort comments: oldest first (newest at bottom)
  const sortedComments = [...comments].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  return (
    <div className="nominee-detail-modal-overlay" onClick={onClose}>
      <div className="nominee-detail-modal nominee-detail-modal-split" onClick={(e) => e.stopPropagation()}>
        {/* Close button */}
        <button className="nominee-detail-modal-close" onClick={onClose}>
          ✕
        </button>

        {/* Left Side - Comments Section */}
        <div className="nominee-detail-left">
          <div className="nominee-detail-comments">
            <div className="nominee-detail-comments-header">
              <span>💬 Chia sẻ ({comments.length})</span>
            </div>

            {/* Comments List - sorted oldest first (newest at bottom) */}
            <div className="nominee-detail-comments-list">
              {sortedComments.length === 0 ? (
                <div className="nominee-detail-no-comments">
                  <div className="no-comments-icon">💬</div>
                  <p>Chưa có chia sẻ nào</p>
                  <p className="no-comments-hint">Hãy là người đầu tiên gửi chia sẻ! 🎉</p>
                </div>
              ) : (
                <>
                  {sortedComments.map((comment) => (
                    <div key={comment.id} className="nominee-detail-comment-item">
                      <img
                        src={comment.is_anonymous ? `https://ui-avatars.com/api/?name=A&size=40&background=6b7280&color=fff` : comment.commenter_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.commenter_name || "User")}&size=40&background=6366f1&color=fff`}
                        alt={comment.is_anonymous ? "Ẩn danh" : comment.commenter_name}
                        className="nominee-detail-comment-avatar"
                      />
                      <div className="nominee-detail-comment-content">
                        <div className="nominee-detail-comment-header">
                          <span className={`nominee-detail-comment-author ${comment.is_anonymous ? "anonymous" : ""}`}>{comment.is_anonymous ? "🎭 Ẩn danh" : comment.commenter_name || "Ẩn danh"}</span>
                          <span className="nominee-detail-comment-time">{formatTime(comment.created_at)}</span>
                        </div>
                        <p className="nominee-detail-comment-text">{comment.content}</p>
                      </div>
                    </div>
                  ))}
                  <div ref={commentsEndRef} />
                </>
              )}
            </div>

            {/* Comment Input */}
            {user ? (
              <div className="nominee-detail-comment-form-wrapper">
                <form onSubmit={handleSubmitComment} className="nominee-detail-comment-form">
                  <img src={isAnonymous ? `https://ui-avatars.com/api/?name=A&size=40&background=6b7280&color=fff` : user.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.user_metadata?.full_name || user.email)}&size=40&background=6366f1&color=fff`} alt="Your avatar" className="nominee-detail-form-avatar" />
                  <div className="nominee-detail-input-wrapper">
                    <input ref={inputRef} type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder={commentPlaceholder} className="nominee-detail-comment-input" disabled={isSubmitting} />
                    <button type="submit" className="nominee-detail-comment-btn" disabled={!newComment.trim() || isSubmitting}>
                      {isSubmitting ? <span className="btn-loading">⏳</span> : "Gửi"}
                    </button>
                  </div>
                </form>
                <label className="nominee-detail-anonymous-checkbox">
                  <input type="checkbox" checked={isAnonymous} onChange={(e) => setIsAnonymous(e.target.checked)} />
                  <span>🎭 Gửi ẩn danh</span>
                </label>
              </div>
            ) : (
              <div className="nominee-detail-login-prompt">
                <span>🔐 Đăng nhập để gửi bình luận</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Side - Nominee Info */}
        <div className="nominee-detail-right">
          <div className="nominee-detail-header">
            <div className="nominee-detail-avatar-wrapper">
              <img src={nominee.url_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(nominee.full_name || nominee.user_name)}&size=200&background=6366f1&color=fff`} alt={nominee.full_name || nominee.user_name} className="nominee-detail-avatar" />
              <span className="nominee-detail-role-badge" style={{ backgroundColor: roleInfo.bg }}>
                {roleInfo.label}
              </span>
            </div>

            <div className="nominee-detail-info">
              <h2 className="nominee-detail-name">{nominee.full_name || nominee.user_name}</h2>
              <p className="nominee-detail-username">@{nominee.user_name}</p>
              {nominee.description && <p className="nominee-detail-description">{nominee.description}</p>}
            </div>

            {/* Like button and stats */}
            <div className="nominee-detail-stats">
              <div className="like-btn-wrapper">
                <button className={`nominee-detail-like-btn ${likeAnimation ? "like-animate" : ""}`} onClick={handleLike} disabled={isLiking} title="Thích profile này">
                  <span className="like-icon">❤️</span>
                  <span className="like-count">{likeCount}</span>
                </button>
                {/* Flying hearts animation */}
                <div className="flying-hearts-container">
                  {flyingHearts.map((heart) => (
                    <span
                      key={heart.id}
                      className="flying-heart"
                      style={{
                        left: `${heart.left}%`,
                        animationDuration: `${heart.animationDuration}s`,
                        animationDelay: `${heart.delay}s`,
                        fontSize: `${heart.size}rem`,
                      }}
                    >
                      {heart.emoji}
                    </span>
                  ))}
                </div>
              </div>
              <div className="nominee-detail-stat">
                <span className="stat-value">{comments.length}</span>
                <span className="stat-label">Bình luận</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper function to format time
function formatTime(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Vừa xong";
  if (diffMins < 60) return `${diffMins} phút trước`;
  if (diffHours < 24) return `${diffHours} giờ trước`;
  if (diffDays < 7) return `${diffDays} ngày trước`;

  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
