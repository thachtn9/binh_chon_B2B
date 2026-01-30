import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { fetchNominees, addComment, fetchAllComments, fetchNomineeByIdFresh, fetchCommentsWithProfile, fetchYEBSponsorship, formatCurrency } from "../lib/supabase";
import NomineeDetailModal from "../components/NomineeDetailModal";

// Hook để theo dõi visibility của element với Intersection Observer
function useIntersectionObserver(options = {}) {
  const [visibleItems, setVisibleItems] = useState(new Set());
  const observerRef = useRef(null);

  const observe = useCallback((element, id) => {
    if (!element || !observerRef.current) return;
    element.dataset.observeId = id;
    observerRef.current.observe(element);
  }, []);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const id = entry.target.dataset.observeId;
          if (entry.isIntersecting) {
            setVisibleItems((prev) => new Set([...prev, id]));
            // Unobserve sau khi đã visible để không trigger lại
            observerRef.current?.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: "50px 0px",
        ...options,
      }
    );

    return () => {
      observerRef.current?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { visibleItems, observe };
}

// Shuffle array (Fisher-Yates algorithm)
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

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
    <div className="nominee-card-v2 nominee-card-clickable" id={`nominee-${nominee.id}`} onClick={() => onClick(nominee)} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && onClick(nominee)}>
      {/* Avatar & Info */}
      <div className="nominee-card-header">
        <div className="nominee-card-avatar-wrapper">
          <img src={nominee.url_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(nominee.full_name || nominee.user_name)}&size=200&background=6366f1&color=fff`} alt={nominee.full_name || nominee.user_name} className="nominee-card-avatar" />
          <span className="nominee-card-role-badge" style={{ backgroundColor: roleInfo.bg }}>
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
          <span className="like-count-compact">❤️ {nominee.like_count || 0}</span>
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
                  src={comment.is_anonymous ? `https://ui-avatars.com/api/?name=A&size=32&background=6b7280&color=fff` : comment.commenter_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.commenter_name || "User")}&size=32&background=6366f1&color=fff`}
                  alt={comment.is_anonymous ? "Ẩn danh" : comment.commenter_name}
                  className="comment-avatar-compact"
                />
                <div className="comment-content-compact">
                  <span className={`comment-author-compact ${comment.is_anonymous ? "anonymous" : ""}`}>{comment.is_anonymous ? "🎭 Ẩn danh" : comment.commenter_name || "Ẩn danh"}</span>
                  <p className="comment-text-compact">{comment.content}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Footer with click hint */}
      <div className="nominee-card-footer">
        <div className="nominee-card-click-hint">Nhấn để xem chi tiết & bình luận →</div>
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
      const activeButton = dotsRef.current.querySelector(".nav-dot-v2.active");
      if (activeButton) {
        activeButton.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  }, [activeIndex, nominees.length]);

  return (
    <div className="navigation-dots-v2">
      <div className="nav-dots-container" ref={dotsRef}>
        {nominees.map((nominee, index) => (
          <button key={nominee.id} className={`nav-dot-v2 ${index === activeIndex ? "active" : ""}`} onClick={() => onNavigate(index)} title={nominee.full_name || nominee.user_name}>
            <img src={nominee.url_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(nominee.full_name || nominee.user_name)}&size=60&background=6366f1&color=fff`} alt={nominee.full_name || nominee.user_name} className="nav-dot-avatar-v2" />
            <span className="nav-dot-username">{nominee.user_name}</span>
          </button>
        ))}
      </div>
      {nominees.length > MAX_VISIBLE && <div className="nav-dots-hint">Cuộn để xem thêm</div>}
    </div>
  );
}

export default function HomePage() {
  const { user, signInWithGoogle } = useAuth();
  const location = useLocation();
  const [nominees, setNominees] = useState([]);
  const [comments, setComments] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef(null);

  // Modal state
  const [selectedNominee, setSelectedNominee] = useState(null);
  const [modalComments, setModalComments] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [defaultAnonymous, setDefaultAnonymous] = useState(false);
  const [isLoadingModal, setIsLoadingModal] = useState(false);

  // YEB sponsorship state
  const [yebTotal, setYebTotal] = useState(null);
  const [yebLoading, setYebLoading] = useState(true);

  // Lazy load intersection observer
  const { visibleItems, observe } = useIntersectionObserver();

  // Fetch YEB sponsorship data
  useEffect(() => {
    async function loadYEBData() {
      setYebLoading(true);
      try {
        const total = await fetchYEBSponsorship();
        setYebTotal(total);
      } catch (error) {
        console.error("Error loading YEB data:", error);
      } finally {
        setYebLoading(false);
      }
    }
    loadYEBData();
  }, []);

  // Handle URL hash to open specific profile
  useEffect(() => {
    if (loading || nominees.length === 0) return;

    const hash = location.hash;
    if (hash && hash.startsWith("#")) {
      const username = hash.substring(1); // Remove the # character
      if (username) {
        // Find nominee by username
        const nominee = nominees.find((n) => n.user_name?.toLowerCase() === username.toLowerCase());

        if (nominee) {
          // Scroll to the nominee card
          setTimeout(async () => {
            const element = document.getElementById(`nominee-${nominee.id}`);
            if (element) {
              element.scrollIntoView({ behavior: "smooth", block: "center" });
            }

            // Open modal with anonymous checkbox checked by default
            setDefaultAnonymous(true);
            setIsModalOpen(true);
            setIsLoadingModal(true);

            try {
              // Fetch fresh data
              const [freshNominee, freshComments] = await Promise.all([fetchNomineeByIdFresh(nominee.id), fetchCommentsWithProfile(nominee.id)]);

              setSelectedNominee(freshNominee || nominee);
              setModalComments(freshComments);
            } catch (error) {
              console.error("Error refreshing modal data:", error);
              setSelectedNominee(nominee);
              setModalComments(comments[nominee.id] || []);
            } finally {
              setIsLoadingModal(false);
            }
          }, 500);
        }
      }
    }
  }, [location.hash, loading, nominees]);

  // Fetch nominees and comments
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        // Fetch nominees (only individuals, not projects)
        const allNominees = await fetchNominees();
        const individualNominees = allNominees.filter((n) => n.role !== "PROJECT");
        const shuffledNominees = shuffleArray(individualNominees);
        setNominees(shuffledNominees);

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

    const newComment = await addComment(nomineeId, user.email, user.user_metadata?.full_name || user.email, user.user_metadata?.avatar_url, content, isAnonymous);

    // Update local state for card preview
    setComments((prev) => ({
      ...prev,
      [nomineeId]: [newComment, ...(prev[nomineeId] || [])],
    }));

    // Update modal comments
    setModalComments((prev) => [...prev, newComment]);
  };

  // Handle open modal - refresh data from database
  const handleOpenModal = async (nominee) => {
    setSelectedNominee(nominee);
    setDefaultAnonymous(false);
    setIsModalOpen(true);
    setIsLoadingModal(true);

    try {
      // Fetch fresh nominee data and comments with profile avatars
      const [freshNominee, freshComments] = await Promise.all([fetchNomineeByIdFresh(nominee.id), fetchCommentsWithProfile(nominee.id)]);

      if (freshNominee) {
        setSelectedNominee(freshNominee);
      }
      setModalComments(freshComments);
    } catch (error) {
      console.error("Error refreshing modal data:", error);
      // Fallback to cached comments
      setModalComments(comments[nominee.id] || []);
    } finally {
      setIsLoadingModal(false);
    }
  };

  // Handle close modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedNominee(null);
    setModalComments([]);
    setDefaultAnonymous(false);
    // Clear the hash from URL when closing modal
    if (location.hash) {
      window.history.replaceState(null, "", window.location.pathname);
    }
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
      {/* YEB Sponsorship Banner */}
      {yebTotal !== null && (
        <section className="yeb-sponsorship-banner">
          <div className="container">
            <div className="yeb-content">
              <img src="/than_tai.png" alt="Thần Tài" className="yeb-thantai-img" />
              <div className="yeb-info">
                <h3 className="yeb-title">🎊 YEB B2B 2025</h3>
                <p className="yeb-subtitle">Tổng tiền tài trợ cho YEB</p>
                <div className="yeb-amount">{yebLoading ? <span className="yeb-loading">Đang tải...</span> : <span className="yeb-value">{formatCurrency(yebTotal)}</span>}</div>
                <div className="yeb-donate-cta">
                  <a
                    href="https://docs.google.com/spreadsheets/d/17p0Wg81ZQ4mFvmArnAugY_q1U8w6dOG-Pt__pYeUC38/edit?gid=88569587"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="yeb-donate-btn"
                  >
                    <span>❤️</span> Tài trợ ngay
                  </a>
                </div>
              </div>
              <img src="/than_tai.png" alt="Thần Tài" className="yeb-thantai-img yeb-thantai-flip" />
            </div>
          </div>
        </section>
      )}

      {/* Hero Section */}
      <section className="landing-hero-v2">
        <div className="landing-hero-content-v2">
          {/* <h1 className="landing-hero-title-v2">🏆 ISCGP Awards 2025</h1> */}
          <p className="landing-hero-subtitle-v2">Vinh danh những cá nhân xuất sắc nhất năm 2025</p>
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
            <span>Xem Profile thành viên B2B</span>
            <div className="scroll-arrow-v2">↓</div>
          </div>
        </div>
      </section>

      {/* Nominees Grid - 3 per row */}
      {nominees.length > 0 && (
        <>
          {/* Navigation Dots */}
          <NavigationDots nominees={nominees} activeIndex={activeIndex} onNavigate={navigateToNominee} />

          <section className="nominees-section-v2">
            <div className="container">
              <h2 className="nominees-section-title">👤 Danh sách profile ({nominees.length} người)</h2>
              <div className="nominees-grid-v2">
                {nominees.map((nominee, index) => {
                  const cardId = `nominee-card-${nominee.id}`;
                  const isVisible = visibleItems.has(cardId);
                  // Delay index dựa trên vị trí trong row (3 cards per row)
                  const delayIndex = index % 9; // Reset delay sau mỗi 9 cards

                  return (
                    <div
                      key={nominee.id}
                      ref={(el) => observe(el, cardId)}
                      className={`nominee-card-wrapper ${isVisible ? "is-visible" : ""} delay-${delayIndex}`}
                    >
                      <NomineeCard nominee={nominee} comments={comments[nominee.id] || []} onClick={handleOpenModal} />
                    </div>
                  );
                })}
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
      <NomineeDetailModal isOpen={isModalOpen} onClose={handleCloseModal} nominee={selectedNominee} comments={modalComments} onAddComment={handleAddComment} user={user} defaultAnonymous={defaultAnonymous} isLoading={isLoadingModal} />
    </main>
  );
}
