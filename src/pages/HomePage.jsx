import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { fetchNominees, addComment, fetchAllComments } from "../lib/supabase";
import NomineeDetailModal from "../components/NomineeDetailModal";

// Role badge colors
const roleBadgeColors = {
  PM: { bg: "#3b82f6", label: "Project Manager" },
  BA: { bg: "#8b5cf6", label: "Business Analyst" },
  DEV: { bg: "#10b981", label: "Developer" },
  PROJECT: { bg: "#f59e0b", label: "Dự án" },
};

// NomineeCard Component - Card với 3 bình luận, click để mở modal
function NomineeCard({ nominee, comments, onClick }) {
  const roleInfo = roleBadgeColors[nominee.role] || { bg: "#6b7280", label: nominee.role };
  const previewComments = comments.slice(0, 3); // Lấy 3 bình luận đầu tiên

  return (
    <div 
      className="nominee-card-v2 nominee-card-clickable" 
      id={`nominee-${nominee.id}`}
      onClick={() => onClick(nominee)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick(nominee)}
    >
      {/* Avatar & Info */}
      <div className="nominee-card-header">
        <div className="nominee-card-avatar-wrapper">
          <img
            src={nominee.url_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(nominee.full_name || nominee.user_name)}&size=200&background=6366f1&color=fff`}
            alt={nominee.full_name || nominee.user_name}
            className="nominee-card-avatar"
          />
          <span
            className="nominee-card-role-badge"
            style={{ backgroundColor: roleInfo.bg }}
          >
            {roleInfo.label}
          </span>
        </div>

        <div className="nominee-card-info">
          <h3 className="nominee-card-name">{nominee.full_name || nominee.user_name}</h3>
          <p className="nominee-card-username">@{nominee.user_name}</p>
        </div>
      </div>

      {/* Preview Comments - 3 bình luận đầu */}
      <div className="nominee-card-comments-preview">
        <div className="comments-header-compact">
          <span>💬 Bình luận ({comments.length})</span>
        </div>
        
        <div className="comments-list-compact">
          {previewComments.length === 0 ? (
            <div className="no-comments-compact">
              <p>Chưa có bình luận nào</p>
            </div>
          ) : (
            previewComments.map((comment) => (
              <div key={comment.id} className="comment-item-compact">
                <img
                  src={comment.is_anonymous 
                    ? `https://ui-avatars.com/api/?name=A&size=32&background=6b7280&color=fff`
                    : (comment.commenter_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.commenter_name || "User")}&size=32&background=6366f1&color=fff`)}
                  alt={comment.is_anonymous ? "Ẩn danh" : comment.commenter_name}
                  className="comment-avatar-compact"
                />
                <div className="comment-content-compact">
                  <span className={`comment-author-compact ${comment.is_anonymous ? 'anonymous' : ''}`}>
                    {comment.is_anonymous ? "🎭 Ẩn danh" : (comment.commenter_name || "Ẩn danh")}
                  </span>
                  <p className="comment-text-compact">{comment.content}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Footer with click hint */}
      <div className="nominee-card-footer">
        <div className="nominee-card-click-hint">
          Nhấn để xem chi tiết & bình luận →
        </div>
      </div>
    </div>
  );
}

// Navigation Dots Component - Scrollable, hiển thị 7 người
function NavigationDots({ nominees, activeIndex, onNavigate }) {
  const dotsRef = useRef(null);
  const MAX_VISIBLE = 7;

  // Scroll to keep active item visible
  useEffect(() => {
    if (dotsRef.current && nominees.length > MAX_VISIBLE) {
      const activeButton = dotsRef.current.querySelector('.nav-dot-v2.active');
      if (activeButton) {
        activeButton.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [activeIndex, nominees.length]);

  return (
    <div className="navigation-dots-v2">
      <div className="nav-dots-container" ref={dotsRef}>
        {nominees.map((nominee, index) => (
          <button
            key={nominee.id}
            className={`nav-dot-v2 ${index === activeIndex ? "active" : ""}`}
            onClick={() => onNavigate(index)}
            title={nominee.full_name || nominee.user_name}
          >
            <img
              src={nominee.url_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(nominee.full_name || nominee.user_name)}&size=60&background=6366f1&color=fff`}
              alt={nominee.full_name || nominee.user_name}
              className="nav-dot-avatar-v2"
            />
          </button>
        ))}
      </div>
      {nominees.length > MAX_VISIBLE && (
        <div className="nav-dots-hint">Cuộn để xem thêm</div>
      )}
    </div>
  );
}

export default function HomePage() {
  const { user, signInWithGoogle } = useAuth();
  const [nominees, setNominees] = useState([]);
  const [comments, setComments] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef(null);
  
  // Modal state
  const [selectedNominee, setSelectedNominee] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch nominees and comments
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        // Fetch nominees (only individuals, not projects)
        const allNominees = await fetchNominees();
        const individualNominees = allNominees.filter((n) => n.role !== "PROJECT");
        setNominees(individualNominees);

        // Fetch all comments
        const allComments = await fetchAllComments();
        
        // Group comments by nominee_id
        const groupedComments = {};
        individualNominees.forEach((n) => {
          groupedComments[n.id] = allComments.filter((c) => c.nominee_id === n.id);
        });
        setComments(groupedComments);
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // Navigate to specific nominee
  const navigateToNominee = (index) => {
    const element = document.getElementById(`nominee-${nominees[index]?.id}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      setActiveIndex(index);
    }
  };

  // Handle add comment
  const handleAddComment = async (nomineeId, content, isAnonymous = false) => {
    if (!user) return;

    const newComment = await addComment(
      nomineeId,
      user.email,
      user.user_metadata?.full_name || user.email,
      user.user_metadata?.avatar_url,
      content,
      isAnonymous
    );

    // Update local state
    setComments((prev) => ({
      ...prev,
      [nomineeId]: [newComment, ...(prev[nomineeId] || [])],
    }));
  };

  // Handle open modal
  const handleOpenModal = (nominee) => {
    setSelectedNominee(nominee);
    setIsModalOpen(true);
  };

  // Handle close modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedNominee(null);
  };

  if (loading) {
    return (
      <main className="landing-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Đang tải danh sách đề cử...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="landing-page-v2" ref={containerRef}>
      {/* Hero Section */}
      <section className="landing-hero-v2">
        <div className="landing-hero-content-v2">
          <h1 className="landing-hero-title-v2">
            🏆 ISCGP Awards 2025
          </h1>
          <p className="landing-hero-subtitle-v2">
            Vinh danh những cá nhân xuất sắc nhất năm 2025
          </p>
          
          <div className="landing-hero-actions-v2">
            {user ? (
              <Link to="/vote" className="btn btn-gold btn-lg">
                🗳️ Bắt đầu dự đoán
              </Link>
            ) : (
              <button onClick={signInWithGoogle} className="btn btn-gold btn-lg">
                🔐 Đăng nhập với Google
              </button>
            )}
          </div>

          <div className="scroll-indicator-v2" onClick={() => navigateToNominee(0)}>
            <span>Xem đề cử</span>
            <div className="scroll-arrow-v2">↓</div>
          </div>
        </div>
      </section>

      {/* Nominees Grid - 3 per row */}
      {nominees.length > 0 && (
        <>
          {/* Navigation Dots */}
          <NavigationDots
            nominees={nominees}
            activeIndex={activeIndex}
            onNavigate={navigateToNominee}
          />

          <section className="nominees-section-v2">
            <div className="container">
              <h2 className="nominees-section-title">👤 Danh sách đề cử ({nominees.length} người)</h2>
              <div className="nominees-grid-v2">
                {nominees.map((nominee) => (
                  <NomineeCard
                    key={nominee.id}
                    nominee={nominee}
                    comments={comments[nominee.id] || []}
                    onClick={handleOpenModal}
                  />
                ))}
              </div>
            </div>
          </section>
        </>
      )}

      {nominees.length === 0 && !loading && (
        <section className="no-nominees-section">
          <div className="container">
            <h2>Chưa có đề cử nào</h2>
            <p>Danh sách đề cử sẽ được cập nhật sớm.</p>
          </div>
        </section>
      )}

      {/* Footer CTA */}
      <section className="landing-footer-cta">
        <div className="container">
          <h2>Sẵn sàng tham gia dự đoán?</h2>
          <p>Dự đoán người chiến thắng và có cơ hội nhận thưởng!</p>
          {user ? (
            <Link to="/vote" className="btn btn-gold btn-lg">
              🗳️ Dự đoán ngay
            </Link>
          ) : (
            <button onClick={signInWithGoogle} className="btn btn-gold btn-lg">
              🔐 Đăng nhập để tham gia
            </button>
          )}
        </div>
      </section>

      {/* Nominee Detail Modal */}
      <NomineeDetailModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        nominee={selectedNominee}
        comments={selectedNominee ? (comments[selectedNominee.id] || []) : []}
        onAddComment={handleAddComment}
        user={user}
      />
    </main>
  );
}
