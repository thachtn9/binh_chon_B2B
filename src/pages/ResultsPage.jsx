import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getCategoryWinners, findCorrectPredictionsByCategory, findCorrectPredictions } from "../lib/supabase";
import { categories } from "../config/votingConfig";
import "./ResultsPage.css";

// Helper để lấy tất cả category/sub-category theo thứ tự
function getAllCategoriesOrdered() {
  const result = [];
  categories.forEach((cat) => {
    if (cat.sub_categories) {
      cat.sub_categories.forEach((sub) => {
        result.push({
          id: sub.id,
          name: `${cat.name} - ${sub.label}`,
          shortName: sub.label,
          description: cat.description,
          icon: cat.icon,
          parentId: cat.id,
          role: sub.role,
        });
      });
    } else {
      result.push({
        id: cat.id,
        name: cat.name,
        shortName: cat.name,
        description: cat.description,
        icon: cat.icon,
        parentId: null,
        role: null,
      });
    }
  });
  return result;
}

export default function ResultsPage() {
  const { voteUser } = useAuth();
  const [winners, setWinners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [predictorsMap, setPredictorsMap] = useState({});
  const [loadingPredictors, setLoadingPredictors] = useState({});
  const [topPredictors, setTopPredictors] = useState([]);
  const [activeSection, setActiveSection] = useState(0);
  const sectionsRef = useRef([]);

  const allCategories = getAllCategoriesOrdered();

  useEffect(() => {
    loadWinners();
  }, []);

  // Intersection Observer cho scroll spy
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = sectionsRef.current.indexOf(entry.target);
            if (index !== -1) {
              setActiveSection(index);
            }
          }
        });
      },
      { threshold: 0.5 }
    );

    sectionsRef.current.forEach((section) => {
      if (section) observer.observe(section);
    });

    return () => observer.disconnect();
  }, [winners]);

  // Check admin access
  if (!voteUser?.is_admin) {
    return (
      <div className="results-page">
        <div className="results-coming-soon">
          <div className="coming-soon-icon">🔒</div>
          <h1>Truy Cập Bị Hạn Chế</h1>
          <p>Trang này chỉ dành cho quản trị viên.</p>
          <Link to="/" className="btn btn-gold">
            Về trang chủ
          </Link>
        </div>
      </div>
    );
  }

  async function loadWinners() {
    try {
      const data = await getCategoryWinners();
      setWinners(data || []);

      // Load top predictors nếu có winners
      if (data && data.length > 0) {
        const winnersObj = {};
        data.forEach((w) => {
          winnersObj[w.category_id] = w.winner_id;
        });
        const topResults = await findCorrectPredictions(winnersObj);
        setTopPredictors(topResults?.slice(0, 5) || []);
      }
    } catch (error) {
      console.error("Error loading winners:", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadPredictorForCategory(categoryId) {
    if (predictorsMap[categoryId] || loadingPredictors[categoryId]) return;

    setLoadingPredictors((prev) => ({ ...prev, [categoryId]: true }));

    try {
      const winner = winners.find((w) => w.category_id === categoryId);
      if (!winner) return;

      const winnersObj = { [categoryId]: winner.winner_id };
      const results = await findCorrectPredictionsByCategory(winnersObj);

      setPredictorsMap((prev) => ({
        ...prev,
        [categoryId]: results?.[categoryId] || null,
      }));
    } catch (error) {
      console.error("Error loading predictor:", error);
    } finally {
      setLoadingPredictors((prev) => ({ ...prev, [categoryId]: false }));
    }
  }

  function scrollToSection(index) {
    sectionsRef.current[index]?.scrollIntoView({ behavior: "smooth" });
  }

  // Get winner for a specific category
  function getWinnerForCategory(categoryId) {
    return winners.find((w) => w.category_id === categoryId);
  }

  // Loading state
  if (loading) {
    return (
      <div className="results-page">
        <div className="results-loading">
          <div className="loading-spinner"></div>
          <p>Đang tải kết quả vinh danh...</p>
        </div>
      </div>
    );
  }

  // Coming soon state - no winners yet
  if (winners.length === 0) {
    return (
      <div className="results-page">
        <div className="results-coming-soon">
          <div className="coming-soon-icon">🏆</div>
          <h1>Sắp Công Bố</h1>
          <p>Kết quả vinh danh sẽ được công bố sau khi kết thúc thời gian bình chọn.</p>
          <Link to="/" className="btn btn-gold">
            Về trang chủ
          </Link>
        </div>
      </div>
    );
  }

  // Categories with winners
  const categoriesWithWinners = allCategories.filter((cat) => winners.some((w) => w.category_id === cat.id));

  return (
    <div className="results-page">
      {/* Navigation dots */}
      <div className="results-nav-dots">
        {categoriesWithWinners.map((cat, index) => (
          <button key={cat.id} className={`nav-dot ${activeSection === index ? "active" : ""}`} onClick={() => scrollToSection(index)} title={cat.shortName}>
            <span className="nav-dot-icon">{cat.icon}</span>
          </button>
        ))}
        <button className={`nav-dot ${activeSection === categoriesWithWinners.length ? "active" : ""}`} onClick={() => scrollToSection(categoriesWithWinners.length)} title="Tổng kết">
          <span className="nav-dot-icon">🏆</span>
        </button>
      </div>

      {/* Hero Section */}
      <section className="results-section results-hero" ref={(el) => (sectionsRef.current[0] = el)}>
        <div className="results-hero-content">
          <div className="hero-trophy">🏆</div>
          <h1 className="hero-title">Vinh Danh B2B Awards 2025</h1>
          <p className="hero-subtitle">Những cá nhân và dự án xuất sắc nhất của năm</p>
          <button className="btn btn-gold scroll-cta" onClick={() => scrollToSection(1)}>
            Xem kết quả
            <span className="scroll-arrow">↓</span>
          </button>
        </div>
      </section>

      {/* Winner Sections */}
      {categoriesWithWinners.map((category, index) => {
        const winner = getWinnerForCategory(category.id);
        const predictor = predictorsMap[category.id];
        const isLoadingPredictor = loadingPredictors[category.id];

        return (
          <section key={category.id} className={`results-section winner-section section-${index % 2 === 0 ? "even" : "odd"}`} ref={(el) => (sectionsRef.current[index + 1] = el)}>
            {/* Category Header */}
            <div className="category-header">
              <span className="category-icon">{category.icon}</span>
              <h2 className="category-name">{category.name}</h2>
              <p className="category-description">{category.description}</p>
            </div>

            {/* Winner Card - 2 Column Layout */}
            <div className="winner-showcase">
              {/* Left Column - Profile Info */}
              <div className="winner-profile-column">
                <div className="winner-avatar-container">
                  <img src="/vong_nguyet_que.svg" alt="Laurel wreath" className="laurel-wreath" />
                  <img src={winner.winner?.url_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(winner.winner?.full_name || "W")}&background=random&size=200`} alt={winner.winner?.full_name} className="winner-avatar" />
                </div>

                <div className="winner-info">
                  <h3 className="winner-name">{winner.winner?.full_name || winner.winner?.user_name}</h3>
                  {winner.winner?.role && <span className="winner-role-badge">{winner.winner.role}</span>}
                  {winner.notes && <p className="winner-description">{winner.notes}</p>}
                  {winner.actual_vote_count > 0 && (
                    <div className="winner-votes">
                      <span className="votes-icon">🗳️</span>
                      <span>{winner.actual_vote_count} phiếu bầu</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column - Award Photo & Predictor */}
              <div className="winner-action-column">
                {/* Award Photo */}
                {winner.award_photo_url && (
                  <div className="winner-award-photo-container">
                    <img src={winner.award_photo_url} alt="Award moment" className="winner-award-photo" />
                  </div>
                )}

                {/* Predictor Section */}
                <div className="predictor-section">
                  {!predictor && !isLoadingPredictor && (
                    <button className="predictor-reveal-btn" onClick={() => loadPredictorForCategory(category.id)}>
                      <span className="btn-icon">🔮</span>
                      Tìm người dự đoán chính xác nhất
                    </button>
                  )}

                  {isLoadingPredictor && (
                    <div className="predictor-loading">
                      <div className="loading-spinner small"></div>
                      <span>Đang tìm kiếm...</span>
                    </div>
                  )}

                  {predictor && predictor.voters && predictor.voters.length > 0 && (
                    <div className="predictor-card">
                      <div className="predictor-header">
                        <span className="predictor-icon">🎯</span>
                        <span>Người dự đoán chính xác nhất</span>
                      </div>
                      <div className="predictor-content">
                        <img src={predictor.voters[0].voter_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(predictor.voters[0].voter_name || "U")}&background=random&size=60`} alt={predictor.voters[0].voter_name} className="predictor-avatar" />
                        <div className="predictor-info">
                          <div className="predictor-name">{predictor.voters[0].voter_name}</div>
                          <div className="predictor-stats">
                            Dự đoán: {predictor.voters[0].predicted_count} phiếu
                            {predictor.voters[0].prediction_diff === 0 ? <span className="exact-match"> (Chính xác!)</span> : <span className="diff"> (Sai lệch: {predictor.voters[0].prediction_diff})</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {predictor && (!predictor.voters || predictor.voters.length === 0) && <div className="no-predictor">Chưa có ai dự đoán chính xác cho hạng mục này</div>}
                </div>
              </div>
            </div>

            {/* Scroll Indicator */}
            {index < categoriesWithWinners.length - 1 && (
              <div className="scroll-indicator" onClick={() => scrollToSection(index + 2)}>
                <span>Hạng mục tiếp theo</span>
                <span className="scroll-arrow">↓</span>
              </div>
            )}
          </section>
        );
      })}

      {/* Summary Section */}
      <section className="results-section results-summary" ref={(el) => (sectionsRef.current[categoriesWithWinners.length + 1] = el)}>
        <div className="summary-header">
          <span className="summary-icon">🏆</span>
          <h2 className="summary-title">Tổng Kết Vinh Danh</h2>
          <p className="summary-subtitle">Tất cả những người chiến thắng B2B Awards 2025</p>
        </div>

        {/* Winners Grid */}
        <div className="summary-winners-grid">
          {categoriesWithWinners.map((category) => {
            const winner = getWinnerForCategory(category.id);
            return (
              <div key={category.id} className="summary-winner-card">
                <div className="summary-card-category">
                  <span className="summary-card-icon">{category.icon}</span>
                  <span>{category.shortName}</span>
                </div>
                <img src={winner.winner?.url_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(winner.winner?.full_name || "W")}&background=random&size=80`} alt={winner.winner?.full_name} className="summary-card-avatar" />
                <div className="summary-card-name">{winner.winner?.full_name || winner.winner?.user_name}</div>
                {winner.winner?.role && <div className="summary-card-role">{winner.winner.role}</div>}
              </div>
            );
          })}
        </div>

        {/* Top Predictors */}
        {topPredictors.length > 0 && (
          <div className="top-predictors">
            <h3 className="predictors-title">
              <span className="predictors-icon">🎯</span>
              Top Người Dự Đoán Chính Xác Nhất
            </h3>
            <div className="predictors-list">
              {topPredictors.map((predictor, index) => (
                <div key={predictor.session_id} className="predictor-rank-card">
                  <div className={`rank-badge rank-${index + 1}`}>{index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `#${index + 1}`}</div>
                  <img src={predictor.voter_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(predictor.voter_name || "U")}&background=random&size=50`} alt={predictor.voter_name} className="rank-avatar" />
                  <div className="rank-info">
                    <div className="rank-name">{predictor.voter_name}</div>
                    <div className="rank-stats">
                      {predictor.correct_count}/{predictor.total_categories} đúng ({predictor.accuracy_percent}%)
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="summary-cta">
          <Link to="/" className="btn btn-gold">
            Về trang chủ
          </Link>
          <Link to="/vote" className="btn btn-secondary">
            Xem các ứng viên
          </Link>
        </div>
      </section>
    </div>
  );
}
