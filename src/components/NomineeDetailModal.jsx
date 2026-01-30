import { useState, useEffect, useRef } from "react";

// Role badge colors
const roleBadgeColors = {
  PM: { bg: "#3b82f6", label: "Project Manager" },
  BA: { bg: "#8b5cf6", label: "Business Analyst" },
  DEV: { bg: "#10b981", label: "Developer" },
  PROJECT: { bg: "#f59e0b", label: "Dự án" },
};

export default function NomineeDetailModal({
  isOpen,
  onClose,
  nominee,
  comments = [],
  onAddComment,
  user,
}) {
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const commentsEndRef = useRef(null);
  const inputRef = useRef(null);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setNewComment("");
      setIsAnonymous(false);
      // Focus input when modal opens
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

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
      setIsAnonymous(false);
    } catch (error) {
      console.error("Error submitting comment:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !nominee) return null;

  const roleInfo = roleBadgeColors[nominee.role] || {
    bg: "#6b7280",
    label: nominee.role,
  };

  return (
    <div className="nominee-detail-modal-overlay" onClick={onClose}>
      <div
        className="nominee-detail-modal nominee-detail-modal-split"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button className="nominee-detail-modal-close" onClick={onClose}>
          ✕
        </button>

        {/* Left Side - Comments Section */}
        <div className="nominee-detail-left">
          <div className="nominee-detail-comments">
            <div className="nominee-detail-comments-header">
              <span>💬 Bình luận ({comments.length})</span>
            </div>

            {/* Comments List */}
            <div className="nominee-detail-comments-list">
              {comments.length === 0 ? (
                <div className="nominee-detail-no-comments">
                  <div className="no-comments-icon">💬</div>
                  <p>Chưa có bình luận nào</p>
                  <p className="no-comments-hint">
                    Hãy là người đầu tiên gửi bình luận! 🎉
                  </p>
                </div>
              ) : (
                <>
                  {comments.map((comment) => (
                    <div key={comment.id} className="nominee-detail-comment-item">
                      <img
                        src={
                          comment.is_anonymous
                            ? `https://ui-avatars.com/api/?name=A&size=40&background=6b7280&color=fff`
                            : comment.commenter_avatar ||
                              `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                comment.commenter_name || "User"
                              )}&size=40&background=6366f1&color=fff`
                        }
                        alt={
                          comment.is_anonymous ? "Ẩn danh" : comment.commenter_name
                        }
                        className="nominee-detail-comment-avatar"
                      />
                      <div className="nominee-detail-comment-content">
                        <div className="nominee-detail-comment-header">
                          <span
                            className={`nominee-detail-comment-author ${
                              comment.is_anonymous ? "anonymous" : ""
                            }`}
                          >
                            {comment.is_anonymous
                              ? "🎭 Ẩn danh"
                              : comment.commenter_name || "Ẩn danh"}
                          </span>
                          <span className="nominee-detail-comment-time">
                            {formatTime(comment.created_at)}
                          </span>
                        </div>
                        <p className="nominee-detail-comment-text">
                          {comment.content}
                        </p>
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
                <form
                  onSubmit={handleSubmitComment}
                  className="nominee-detail-comment-form"
                >
                  <img
                    src={
                      isAnonymous
                        ? `https://ui-avatars.com/api/?name=A&size=40&background=6b7280&color=fff`
                        : user.user_metadata?.avatar_url ||
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(
                            user.user_metadata?.full_name || user.email
                          )}&size=40&background=6366f1&color=fff`
                    }
                    alt="Your avatar"
                    className="nominee-detail-form-avatar"
                  />
                  <div className="nominee-detail-input-wrapper">
                    <input
                      ref={inputRef}
                      type="text"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Viết bình luận của bạn..."
                      className="nominee-detail-comment-input"
                      disabled={isSubmitting}
                    />
                    <button
                      type="submit"
                      className="nominee-detail-comment-btn"
                      disabled={!newComment.trim() || isSubmitting}
                    >
                      {isSubmitting ? (
                        <span className="btn-loading">⏳</span>
                      ) : (
                        "Gửi"
                      )}
                    </button>
                  </div>
                </form>
                <label className="nominee-detail-anonymous-checkbox">
                  <input
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                  />
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
              <img
                src={
                  nominee.url_avatar ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    nominee.full_name || nominee.user_name
                  )}&size=200&background=6366f1&color=fff`
                }
                alt={nominee.full_name || nominee.user_name}
                className="nominee-detail-avatar"
              />
              <span
                className="nominee-detail-role-badge"
                style={{ backgroundColor: roleInfo.bg }}
              >
                {roleInfo.label}
              </span>
            </div>

            <div className="nominee-detail-info">
              <h2 className="nominee-detail-name">
                {nominee.full_name || nominee.user_name}
              </h2>
              <p className="nominee-detail-username">@{nominee.user_name}</p>
              {nominee.description && (
                <p className="nominee-detail-description">{nominee.description}</p>
              )}
            </div>

            <div className="nominee-detail-stats">
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
