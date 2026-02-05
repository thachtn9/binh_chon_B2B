import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getCategoryWinners, findCorrectPredictionsByCategory, findCorrectPredictions, getAllUsersForAdmin, getSettings } from "../lib/supabase";
import { categories } from "../config/votingConfig";
import "./ResultsPage.css";

// Hardcoded category descriptions và subtitles
const CATEGORY_INFO = {
  "star-performer-pm": {
    subtitle: "The Captain of the Year",
    description: "Bản lĩnh làm chủ cuộc chơi\nChuyên gia gỡ rối\nNgười kết nối văn hóa",
  },
  "star-performer-ba": {
    subtitle: "The Mastermind Analyst",
    description: "Bậc thầy truyền tả\nTư duy giải pháp\nTài liệu Sạch & Chuẩn",
  },
  "star-performer-dev": {
    subtitle: "The Code Master",
    description: "Code Sạch & Chất\nKhắc tinh của Bug khó\nĐồng đội tin cậy",
  },
  "star-performer-dev-2": {
    subtitle: "The Code Master",
    description: "Code Sạch & Chất\nKhắc tinh của Bug khó\nĐồng đội tin cậy",
  },
  "tech-leader": {
    subtitle: "The Technical Guardian",
    description: "Định hướng công nghệ\nQuyết định kỹ thuật đúng đắn\nDẫn dắt & kết nối đội ngũ",
  },
  "unsung-hero": {
    subtitle: "The Unsung Hero",
    description: "Gánh vác việc không tên\nLuôn Say Yes khi đồng đội cần\nNăng lượng chữa lành",
  },
  innovator: {
    subtitle: "The Innovator & AI Pioneer",
    description: "Phá vỡ lối mòn\nBậc thầy AI/Automation\nLan tỏa tri thức",
  },
  "peoples-choice": {
    subtitle: "The People's Choice",
    description: "Trạm sạc năng lượng\nSự chân thành & Cởi mở\nNhịp cầu kết nối",
  },
  "dream-team": {
    subtitle: "The Dream Team",
    description: "Chất lượng vàng\nKhách hàng hài lòng tuyệt đối\nSức mạnh tập thể",
  },
  challenger: {
    subtitle: "The Project Challenger",
    description: "Nhiệm vụ bất khả thi\nLội ngược dòng\nTinh thần thép",
  },
};

// Helper để lấy tất cả category/sub-category theo thứ tự
function getAllCategoriesOrdered() {
  // Mapping tên ngắn gọn cho các hạng mục chính
  const shortNames = {
    "tech-leader": "Tech Lead",
    "unsung-hero": "Silent Hero",
    innovator: "AI Pioneer",
    "peoples-choice": "People's Choice",
    "dream-team": "Project",
    challenger: "Challenger",
  };

  const result = [];
  categories.forEach((cat) => {
    if (cat.sub_categories) {
      cat.sub_categories.forEach((sub) => {
        result.push({
          id: sub.id,
          name: `${sub.label}`,
          shortName: sub.name, // Dùng tên ngắn: PM, BA, DEV (1), DEV (2)
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
        shortName: shortNames[cat.id] || cat.name, // Dùng tên rút gọn
        description: cat.description,
        icon: cat.icon,
        parentId: null,
        role: null,
      });
    }
  });
  return result;
}

/**
 * Đảm bảo mỗi người chỉ nhận tối đa 1 giải "Thánh Dự" trên toàn bộ hạng mục.
 * Nếu người đứng đầu đã nhận giải ở hạng mục trước, chọn người tiếp theo hợp lệ.
 */
function assignUniquePredictors(categoryResults, orderedCategories) {
  const usedVoterIds = new Set();
  const processed = { ...categoryResults };

  orderedCategories.forEach((cat) => {
    const result = processed[cat.id];
    if (!result?.voters?.length) return;

    // Tìm người đầu tiên chưa nhận giải ở hạng mục khác
    const assignedIndex = result.voters.findIndex((v) => !usedVoterIds.has(v.voter_id || v.voter_email));

    if (assignedIndex >= 0) {
      const assignedVoter = result.voters[assignedIndex];
      usedVoterIds.add(assignedVoter.voter_id || assignedVoter.voter_email);

      // Đưa người được chọn lên vị trí đầu tiên
      if (assignedIndex > 0) {
        const reordered = [...result.voters];
        reordered.splice(assignedIndex, 1);
        reordered.unshift(assignedVoter);
        processed[cat.id] = { ...result, voters: reordered };
      }
    } else {
      // Tất cả đều đã nhận giải -> không có ai cho hạng mục này
      processed[cat.id] = { ...result, voters: [] };
    }
  });

  return processed;
}

// Canvas fireworks animation
function runFireworks(canvas) {
  const ctx = canvas.getContext("2d");
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;

  const particles = [];
  const colors = ["#fbbf24", "#f59e0b", "#ef4444", "#22c55e", "#3b82f6", "#a855f7", "#ec4899", "#fff"];

  function createBurst(x, y) {
    const color = colors[Math.floor(Math.random() * colors.length)];
    const count = 30 + Math.floor(Math.random() * 20);
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const speed = Math.random() * 4 + 2;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        alpha: 1,
        decay: Math.random() * 0.015 + 0.008,
        size: Math.random() * 3 + 1,
        color,
      });
    }
  }

  let animId;
  let lastBurst = 0;

  function animate(time) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (time - lastBurst > 600 + Math.random() * 800) {
      createBurst(Math.random() * canvas.width * 0.8 + canvas.width * 0.1, Math.random() * canvas.height * 0.5 + canvas.height * 0.1);
      lastBurst = time;
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.04;
      p.alpha -= p.decay;

      if (p.alpha <= 0) {
        particles.splice(i, 1);
        continue;
      }

      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
    animId = requestAnimationFrame(animate);
  }

  // Initial bursts
  createBurst(canvas.width * 0.3, canvas.height * 0.25);
  createBurst(canvas.width * 0.7, canvas.height * 0.2);
  createBurst(canvas.width * 0.5, canvas.height * 0.35);

  animId = requestAnimationFrame(animate);
  return () => cancelAnimationFrame(animId);
}

export default function ResultsPage() {
  const { voteUser } = useAuth();
  const [winners, setWinners] = useState([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [imagesPreloaded, setImagesPreloaded] = useState(false);
  const [predictorsMap, setPredictorsMap] = useState({});
  const [topPredictors, setTopPredictors] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [settings, setSettings] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [leavingPage, setLeavingPage] = useState(null); // page đang trượt ra
  const [direction, setDirection] = useState("next");
  const [isAnimating, setIsAnimating] = useState(false);
  const [preloadProgress, setPreloadProgress] = useState(0);

  // Tổng hợp loading state
  const loading = !dataLoaded || !imagesPreloaded;

  // Predictor reveal animation states
  const [revealedCategories, setRevealedCategories] = useState(new Set());
  const [rollingCategory, setRollingCategory] = useState(null);
  const [rollingPerson, setRollingPerson] = useState(null);

  // Modal state for predictor reveal
  const [showPredictorModal, setShowPredictorModal] = useState(false);
  const [modalCategoryId, setModalCategoryId] = useState(null);

  // Fireworks canvas ref
  const fireworksCanvasRef = useRef(null);

  // Preload winner award photos when data is loaded
  useEffect(() => {
    if (!dataLoaded || imagesPreloaded) return;

    // Nếu không có winners, không cần preload
    if (winners.length === 0) {
      setImagesPreloaded(true);
      return;
    }

    const imagesToPreload = [];

    // Chỉ preload award photos và avatar của winners
    winners.forEach((w) => {
      if (w.award_photo_url) {
        imagesToPreload.push(w.award_photo_url);
      }
      if (w.winner?.url_avatar) {
        imagesToPreload.push(w.winner.url_avatar);
      }
    });

    // Nếu không có ảnh nào cần preload
    if (imagesToPreload.length === 0) {
      setImagesPreloaded(true);
      return;
    }

    // Preload images with progress tracking
    const totalImages = imagesToPreload.length;
    let loadedCount = 0;

    const preloadPromises = imagesToPreload.map((src) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          loadedCount++;
          setPreloadProgress(Math.round((loadedCount / totalImages) * 100));
          resolve();
        };
        img.onerror = () => {
          loadedCount++;
          setPreloadProgress(Math.round((loadedCount / totalImages) * 100));
          resolve(); // Continue even if image fails
        };
        img.src = src;
      });
    });

    Promise.all(preloadPromises).then(() => {
      setImagesPreloaded(true);
      console.log(`Preloaded ${totalImages} winner images`);
    });
  }, [dataLoaded, winners, imagesPreloaded]);

  const allCategories = getAllCategoriesOrdered();

  // Categories with winners
  const categoriesWithWinners = allCategories.filter((cat) => winners.some((w) => w.category_id === cat.id));

  // Total pages: hero + categories + summary (THÁNH DỰ B2B)
  const totalPages = Math.max(categoriesWithWinners.length + 2, 2);

  const goToPage = useCallback(
    (pageIndex) => {
      if (isAnimating || pageIndex === currentPage || pageIndex < 0 || pageIndex >= totalPages) return;

      // Đóng modal khi chuyển tab
      if (showPredictorModal && !rollingCategory) {
        setShowPredictorModal(false);
        setModalCategoryId(null);
      }

      const dir = pageIndex > currentPage ? "next" : "prev";
      setDirection(dir);
      setLeavingPage(currentPage);
      setCurrentPage(pageIndex);
      setIsAnimating(true);
      setTimeout(() => {
        setLeavingPage(null);
        setIsAnimating(false);
      }, 450);
    },
    [currentPage, isAnimating, totalPages, showPredictorModal, rollingCategory]
  );

  const nextPage = useCallback(() => goToPage(currentPage + 1), [currentPage, goToPage]);
  const prevPage = useCallback(() => goToPage(currentPage - 1), [currentPage, goToPage]);

  // Ẩn header và footer khi ở trang results
  useEffect(() => {
    document.body.classList.add("results-active");
    return () => document.body.classList.remove("results-active");
  }, []);

  useEffect(() => {
    loadWinners();
  }, []);

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        nextPage();
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        prevPage();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nextPage, prevPage]);

  // Fireworks effect on summary page when champion exists
  useEffect(() => {
    const hasChampion = topPredictors.length > 0 && topPredictors[0]?.correct_count >= 6;
    const isOnSummaryPage = currentPage === totalPages - 1;

    if (!hasChampion || !isOnSummaryPage || !fireworksCanvasRef.current || !settings?.show_top_predictors) return;

    const cleanup = runFireworks(fireworksCanvasRef.current);
    return cleanup;
  }, [currentPage, totalPages, topPredictors, settings]);

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
      const [data, users, settingsData] = await Promise.all([getCategoryWinners(), getAllUsersForAdmin(), getSettings()]);
      setWinners(data || []);
      setAllUsers(users || []);
      setSettings(settingsData);

      if (data && data.length > 0) {
        const winnersObj = {};
        data.forEach((w) => {
          winnersObj[w.category_id] = w.winner_id;
        });

        // Load top predictors
        const topResults = await findCorrectPredictions(winnersObj);
        setTopPredictors(topResults || []);

        // Load all category predictors for summary page
        const categoryResults = await findCorrectPredictionsByCategory(winnersObj);
        // Đảm bảo mỗi người chỉ nhận tối đa 1 giải Thánh Dự
        const catsWithWins = allCategories.filter((cat) => winnersObj[cat.id]);
        const processedResults = assignUniquePredictors(categoryResults || {}, catsWithWins);
        setPredictorsMap(processedResults);
      }
    } catch (error) {
      console.error("Error loading winners:", error);
      setImagesPreloaded(true); // Nếu lỗi, không cần đợi preload
    } finally {
      setDataLoaded(true);
    }
  }

  function getWinnerForCategory(categoryId) {
    return winners.find((w) => w.category_id === categoryId);
  }

  // Lấy toàn bộ danh sách users (trừ role PROJECT) làm pool cho rolling animation
  function getAllVotersPool() {
    return allUsers
      .filter((u) => u.role !== "PROJECT")
      .map((u) => ({
        voter_name: u.user_name || u.full_name || "Unknown",
        voter_full_name: u.full_name || u.user_name || "",
        voter_username: u.user_name || "",
        voter_avatar: u.url_avatar,
      }));
  }

  // Slot-machine reveal animation
  function revealPredictor(categoryId) {
    if (rollingCategory) return; // đang chạy rồi thì không cho nhấn

    const predictor = predictorsMap[categoryId];
    if (!predictor || !predictor.voters || predictor.voters.length === 0) return;

    const winner = predictor.voters[0]; // người dự đoán chính xác nhất
    const pool = getAllVotersPool();

    // Cần ít nhất vài người để chạy random
    if (pool.length < 2) {
      // Không đủ người để random, hiện luôn
      setRevealedCategories((prev) => new Set([...prev, categoryId]));
      return;
    }

    // Mở modal và bắt đầu animation
    setModalCategoryId(categoryId);
    setShowPredictorModal(true);
    setRollingCategory(categoryId);

    // Số người chạy chậm cuối cùng trước winner (2-4 người)
    const slowTailCount = 2 + Math.floor(Math.random() * 3); // 2, 3 hoặc 4
    // Tổng: 15-20 người random nhanh + slowTailCount người chậm + 1 winner
    const fastCount = 15 + Math.floor(Math.random() * 6); // 15-20
    const totalSteps = fastCount + slowTailCount + 1; // +1 cho winner cuối

    // Tạo pool không chứa winner (winner chỉ xuất hiện ở bước cuối)
    const poolWithoutWinner = pool.filter((p) => p.voter_name !== winner.voter_name);

    // Shuffle helper
    function shuffle(arr) {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    }

    // Tạo sequence bằng cách lặp lại các vòng shuffle, không trùng liên tiếp
    const sequence = [];
    const stepsBeforeWinner = totalSteps - 1;
    let shuffled = [];
    let idx = 0;

    for (let i = 0; i < stepsBeforeWinner; i++) {
      // Hết vòng -> shuffle lại
      if (idx >= shuffled.length) {
        let newShuffle;
        do {
          newShuffle = shuffle(poolWithoutWinner);
        } while (
          // Đảm bảo người đầu vòng mới không trùng người cuối vòng cũ
          sequence.length > 0 &&
          newShuffle.length > 0 &&
          newShuffle[0].voter_name === sequence[sequence.length - 1].voter_name
        );
        shuffled = newShuffle;
        idx = 0;
      }
      sequence.push(shuffled[idx]);
      idx++;
    }

    // Bước cuối luôn là winner
    sequence.push(winner);

    let step = 0;
    setRollingPerson(sequence[0]);

    const runStep = () => {
      step++;
      if (step >= sequence.length) {
        // Kết thúc - hiện winner, giữ modal mở
        setRollingPerson(null);
        setRollingCategory(null);
        setRevealedCategories((prev) => new Set([...prev, categoryId]));
        return;
      }
      setRollingPerson(sequence[step]);

      // Tốc độ chậm dần theo giai đoạn
      const remaining = sequence.length - step; // số bước còn lại (kể cả winner)
      let delay;
      if (remaining > slowTailCount + 1) {
        // Giai đoạn nhanh: 15-20 người đầu
        delay = 90 + Math.random() * 300; // 150-250ms
      } else if (remaining > 1) {
        // Giai đoạn chậm: 2-4 người cuối trước winner (2-3s mỗi người)
        delay = 1000 + Math.random() * 500; // 2000-3000ms
      } else {
        // Bước cuối cùng -> winner
        delay = 2500; // 4s suspense trước khi hiện winner
      }

      setTimeout(runStep, delay);
    };

    setTimeout(runStep, 100);
  }

  // Loading state
  if (loading) {
    return (
      <div className="results-page">
        <div className="results-loading">
          <div className="loading-spinner"></div>
          <p>{!dataLoaded ? "Đang tải dữ liệu..." : `Đang tải hình ảnh... ${preloadProgress}%`}</p>
          {dataLoaded && (
            <div className="preload-progress-bar">
              <div className="preload-progress-fill" style={{ width: `${preloadProgress}%` }}></div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Coming soon state
  if (winners.length === 0) {
    return (
      <div className="results-page">
        <div className="results-coming-soon">
          <div className="coming-soon-icon">🏆</div>
          <h1>Sắp Công Bố</h1>
          <p>Kết quả vinh danh sắp được công bố.</p>
          <Link to="/" className="btn btn-gold">
            Về trang chủ
          </Link>
        </div>
      </div>
    );
  }

  // Render page content based on index
  function renderPage(pageIndex) {
    // Hero page
    if (pageIndex === 0) {
      return (
        <div className="flip-page-inner hero-page">
          <div className="results-hero-content">
            <div className="hero-trophy">🏆</div>
            <h1 className="hero-title">Vinh Danh B2B Awards 2025</h1>
            <p className="hero-subtitle">Những cá nhân và dự án xuất sắc nhất của năm</p>
            <button className="btn btn-gold scroll-cta" onClick={nextPage}>
              Xem kết quả
              <span className="scroll-arrow">→</span>
            </button>
          </div>
        </div>
      );
    }

    // Summary page (last page)
    if (pageIndex === totalPages - 1) {
      const hasChampion = topPredictors.length > 0 && topPredictors[0]?.correct_count >= 6;

      return (
        <div className="flip-page-inner summary-page">
          {/* Fireworks canvas overlay when champion exists */}
          {hasChampion && settings?.show_top_predictors && <canvas ref={fireworksCanvasRef} className="fireworks-canvas" />}

          <div className="summary-scroll-content">
            <div className="summary-header">
              <span className="summary-icon">🔮</span>
              <h2 className="summary-title">THÁNH DỰ B2B</h2>
            </div>

            {/* Top 3 Overall Predictors - controlled by settings */}
            {settings?.show_top_predictors && topPredictors.length > 0 && (
              <div className={`top-predictors-podium ${hasChampion ? "has-champion" : ""}`}>
                {hasChampion && <div className="champion-banner">Chúc mừng Thánh Dự B2B!</div>}
                <h3 className="podium-title">Top 3 Thánh Dự B2B</h3>
                <div className="podium">
                  {hasChampion ? (
                    // Champion exists: show all 3 normally
                    topPredictors.slice(0, 3).map((predictor, index) => (
                      <div key={predictor.session_id} className={`podium-item podium-${index + 1} ${index === 0 ? "champion-item" : ""}`}>
                        <div className="podium-medal">{index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"}</div>
                        <img src={predictor.voter_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(predictor.voter_name || "U")}&background=random&size=100`} alt={predictor.voter_name} className="podium-avatar" />
                        <div className="podium-name">{predictor.voter_full_name || predictor.voter_name}</div>
                        <div className="podium-stats">
                          <span className="podium-correct">{predictor.correct_count}</span>
                          <span className="podium-total">/{predictor.total_categories} đúng</span>
                        </div>
                        {predictor.earliest_vote_at && <div className="podium-time">{new Date(predictor.earliest_vote_at).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</div>}
                      </div>
                    ))
                  ) : (
                    // No champion: TOP 1 empty, show remaining as TOP 2, TOP 3
                    <>
                      <div className="podium-item podium-1 podium-empty">
                        <div className="podium-medal">🥇</div>
                        <div className="podium-empty-avatar">?</div>
                        <div className="podium-empty-text">Chưa có ai</div>
                        <div className="podium-empty-desc">Cần đúng từ 6 hạng mục trở lên</div>
                      </div>
                      {topPredictors.slice(0, 2).map((predictor, index) => (
                        <div key={predictor.session_id} className={`podium-item podium-${index + 2}`}>
                          <div className="podium-medal">{index === 0 ? "🥈" : "🥉"}</div>
                          <img src={predictor.voter_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(predictor.voter_name || "U")}&background=random&size=100`} alt={predictor.voter_name} className="podium-avatar" />
                          <div className="podium-name">{predictor.voter_full_name || predictor.voter_name}</div>
                          <div className="podium-stats">
                            <span className="podium-correct">{predictor.correct_count}</span>
                            <span className="podium-total">/{predictor.total_categories} đúng</span>
                          </div>
                          {predictor.earliest_vote_at && <div className="podium-time">{new Date(predictor.earliest_vote_at).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</div>}
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Per-category best predictors */}
            <div className="category-predictors-section">
              <h3 className="category-predictors-title">
                <span>🎯</span> Thánh Dự Theo Từng Hạng Mục
              </h3>
              <div className="category-predictors-grid">
                {categoriesWithWinners.map((category) => {
                  const predictor = predictorsMap[category.id];
                  const bestVoter = predictor?.voters?.[0];

                  return (
                    <div key={category.id} className="cat-predictor-card">
                      <div className="cat-predictor-header">
                        <span className="cat-predictor-icon">{category.icon}</span>
                        <span className="cat-predictor-name">{category.name}</span>
                      </div>
                      {bestVoter ? (
                        <div className="cat-predictor-best">
                          <div className="cat-predictor-voter">
                            <img src={bestVoter.voter_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(bestVoter.voter_name || "U")}&background=random&size=36`} alt="" className="cat-voter-avatar" />
                            <div className="cat-voter-info">
                              <div className="cat-voter-name">{bestVoter.voter_full_name || bestVoter.voter_name}</div>
                              <div className="cat-voter-stats">
                                Dự đoán: {bestVoter.predicted_count} phiếu
                                {bestVoter.prediction_diff === 0 ? <span className="exact-match"> ✓ Chính xác!</span> : <span className="diff"> (lệch {bestVoter.prediction_diff})</span>}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="cat-predictor-none">Không có ai dự đoán chính xác</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Category winner pages
    const catIndex = pageIndex - 1;
    const category = categoriesWithWinners[catIndex];
    const winner = getWinnerForCategory(category.id);
    const predictor = predictorsMap[category.id];

    return (
      <div className={`flip-page-inner winner-page section-${catIndex % 2 === 0 ? "even" : "odd"}`}>
        {/* Category Header */}
        <div className="category-header-compact">
          <div className="category-title-row">
            <span className="category-icon-small">{category.icon}</span>
            <h2 className="category-name-small">{category.name}</h2>
          </div>
          {category.description && <p className="category-description-small">{category.description}</p>}
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
              {CATEGORY_INFO[category.id]?.subtitle && <p className="winner-subtitle">{CATEGORY_INFO[category.id].subtitle}</p>}
              {CATEGORY_INFO[category.id]?.description && <p className="winner-profile-description">{CATEGORY_INFO[category.id].description}</p>}
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
            {winner.award_photo_url && (
              <div className="winner-award-photo-container">
                <img src={winner.award_photo_url} alt="Award moment" className="winner-award-photo" />
              </div>
            )}

            {/* Predictor Section - with reveal animation */}
            {predictor && predictor.voters && predictor.voters.length > 0 && (
              <>
                {/* Chưa reveal và không đang rolling -> hiện nút */}
                {!revealedCategories.has(category.id) && rollingCategory !== category.id && (
                  <button className="reveal-predictor-btn" onClick={() => revealPredictor(category.id)}>
                    <span className="reveal-btn-icon">🔮</span>
                    <span>Tìm Thánh Dự Đoán</span>
                    <span className="reveal-btn-sparkle">✨</span>
                  </button>
                )}

                {/* Đã reveal -> hiện kết quả */}
                {revealedCategories.has(category.id) && (
                  <div className="predictor-card predictor-revealed">
                    <div className="predictor-header">
                      <span className="predictor-icon">🎯</span>
                      <span>Người dự đoán chính xác nhất</span>
                    </div>
                    <div className="predictor-content">
                      <img src={predictor.voters[0].voter_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(predictor.voters[0].voter_name || "U")}&background=random&size=60`} alt={predictor.voters[0].voter_name} className="predictor-avatar" />
                      <div className="predictor-info">
                        <div className="predictor-name">{predictor.voters[0].voter_full_name}</div>
                        {predictor.voters[0].voter_username && <div className="predictor-username">@{predictor.voters[0].voter_username}</div>}
                        <div className="predictor-stats">
                          Dự đoán: {predictor.voters[0].predicted_count} phiếu
                          {predictor.voters[0].prediction_diff === 0 ? <span className="exact-match"> (Chính xác!)</span> : <span className="diff"> (Sai lệch: {predictor.voters[0].prediction_diff})</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {predictor && (!predictor.voters || predictor.voters.length === 0) && <div className="no-predictor">Chưa có ai dự đoán chính xác cho hạng mục này</div>}
          </div>
        </div>
      </div>
    );
  }

  // Close modal handler
  function closePredictorModal() {
    if (!rollingCategory) {
      // Chỉ đóng khi không đang chạy animation
      setShowPredictorModal(false);
      setModalCategoryId(null);
    }
  }

  // Get modal category info
  const modalCategory = modalCategoryId ? allCategories.find((c) => c.id === modalCategoryId) : null;
  const modalPredictor = modalCategoryId ? predictorsMap[modalCategoryId] : null;

  return (
    <div className="results-page flip-book">
      {/* Predictor Reveal Modal */}
      {showPredictorModal && modalCategory && (
        <div className="predictor-modal-overlay" onClick={closePredictorModal}>
          <div className="predictor-modal" onClick={(e) => e.stopPropagation()}>
            {/* Close button - chỉ hiện khi đã reveal xong */}
            {!rollingCategory && (
              <button className="predictor-modal-close" onClick={closePredictorModal}>
                ✕
              </button>
            )}
            <div className="predictor-modal-header">
              <span className="predictor-modal-icon">{modalCategory.icon}</span>
              <h3 className="predictor-modal-title">{modalCategory.name}</h3>
            </div>

            <div className="predictor-modal-content">
              {/* Đang rolling */}
              {rollingCategory === modalCategoryId && rollingPerson && (
                <div className="modal-rolling-state">
                  <div className="modal-rolling-label">
                    <span className="slot-icon">🎰</span>
                    <span>Đang tìm kiếm Thánh Dự...</span>
                  </div>
                  <div className="modal-rolling-person" key={rollingPerson.voter_name}>
                    <img src={rollingPerson.voter_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(rollingPerson.voter_name || "U")}&background=random&size=120`} alt="" className="modal-rolling-avatar" />
                    <div className="modal-rolling-name">{rollingPerson.voter_full_name || rollingPerson.voter_name}</div>
                    {rollingPerson.voter_username && <div className="modal-rolling-username">@{rollingPerson.voter_username}</div>}
                  </div>
                </div>
              )}

              {/* Đã reveal - hiện kết quả trong modal */}
              {revealedCategories.has(modalCategoryId) && modalPredictor?.voters?.[0] && (
                <div className="modal-revealed-state">
                  <div className="modal-revealed-label">
                    <span className="target-icon">🎯</span>
                    <span>Thánh Dự Đoán</span>
                  </div>
                  <div className="modal-revealed-person">
                    <img src={modalPredictor.voters[0].voter_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(modalPredictor.voters[0].voter_name || "U")}&background=random&size=120`} alt={modalPredictor.voters[0].voter_name} className="modal-revealed-avatar" />
                    <div className="modal-revealed-name">{modalPredictor.voters[0].voter_full_name}</div>
                    {modalPredictor.voters[0].voter_username && <div className="modal-revealed-username">@{modalPredictor.voters[0].voter_username}</div>}
                    <div className="modal-revealed-stats">
                      Dự đoán: {modalPredictor.voters[0].predicted_count} phiếu
                      {modalPredictor.voters[0].prediction_diff === 0 ? <span className="exact-match"> (Chính xác!)</span> : <span className="diff"> (Sai lệch: {modalPredictor.voters[0].prediction_diff})</span>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Quick Navigation Bar */}
      <div className="flip-nav-bar">
        <div className="flip-nav-items">
          <Link to="/" className="flip-nav-item nav-back" title="Về trang chủ">
            <span className="flip-nav-icon">🏠</span>
            <span className="flip-nav-label">Trang chủ</span>
          </Link>
          {categoriesWithWinners.map((cat, index) => (
            <button key={cat.id} className={`flip-nav-item ${currentPage === index + 1 ? "active" : ""}`} onClick={() => goToPage(index + 1)} title={cat.shortName}>
              <span className="flip-nav-icon">{cat.icon}</span>
              <span className="flip-nav-label">{cat.shortName}</span>
            </button>
          ))}
          <button className={`flip-nav-item nav-summary ${currentPage === totalPages - 1 ? "active" : ""}`} onClick={() => goToPage(totalPages - 1)} title="THÁNH DỰ B2B">
            <span className="flip-nav-icon">🔮</span>
            <span className="flip-nav-label">Thánh Dự</span>
          </button>
        </div>
      </div>

      {/* Page Container */}
      <div className="flip-container">
        {/* Trang cũ đang trượt ra */}
        {leavingPage !== null && (
          <div className={`flip-page slide-out-${direction}`} key={`leaving-${leavingPage}`}>
            {renderPage(leavingPage)}
          </div>
        )}
        {/* Trang mới trượt vào */}
        <div className={`flip-page ${isAnimating ? `slide-in-${direction}` : ""}`} key={`current-${currentPage}`}>
          {renderPage(currentPage)}
        </div>
      </div>
    </div>
  );
}
