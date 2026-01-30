import { useEffect, useState, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { useVote } from "../context/VoteContext";
import { formatDate } from "../lib/supabase";
import { Link } from "react-router-dom";

export default function HistoryPage() {
  const { user, signInWithGoogle, voteUser } = useAuth();
  const { voteHistory, loadUserHistory, TOTAL_CATEGORIES } = useVote();
  const [historyLoading, setHistoryLoading] = useState(false);

  // Auto-load user history from database when page loads
  useEffect(() => {
    async function loadHistory() {
      if (voteUser?.id) {
        setHistoryLoading(true);
        await loadUserHistory(voteUser.id);
        setHistoryLoading(false);
      }
    }
    loadHistory();
  }, [voteUser?.id, loadUserHistory]);

  // Transform voteHistory to get unique votes per category (latest vote for each category)
  const categoryVotes = useMemo(() => {
    const votesMap = new Map();

    // Go through all sessions and votes, keep the latest vote for each category
    voteHistory.forEach((session) => {
      session.votes?.forEach((vote) => {
        const existingVote = votesMap.get(vote.category_id);
        const voteTime = new Date(session.created_at);

        if (!existingVote || new Date(existingVote.voted_at) < voteTime) {
          votesMap.set(vote.category_id, {
            ...vote,
            voted_at: session.created_at,
          });
        }
      });
    });

    // Convert to array and sort by voted_at (newest first)
    return Array.from(votesMap.values()).sort((a, b) => new Date(b.voted_at) - new Date(a.voted_at));
  }, [voteHistory]);

  if (!user) {
    return (
      <main className="login-container">
        <div className="login-card glass-card">
          <div className="login-icon">🔐</div>
          <h2 className="login-title">Đăng nhập để xem lịch sử</h2>
          <p className="login-subtitle">Bạn cần đăng nhập để xem lịch sử dự đoán của mình</p>
          <button onClick={signInWithGoogle} className="google-btn">
            <span>🔐</span>
            Đăng nhập với Google
          </button>
        </div>
      </main>
    );
  }

  return (
    <main>
      <section className="hero" style={{ paddingBottom: "1rem" }}>
        <div className="container">
          <h1 className="hero-title" style={{ fontSize: "2.5rem" }}>
            📜 Lịch Sử Dự Đoán
          </h1>
          <p className="hero-subtitle">Theo dõi các hạng mục bạn đã dự đoán</p>
        </div>
      </section>

      <section className="history-section">
        <div className="container">
          {/* User Stats */}
          <div className="history-stats">
            <div className="stat-card">
              <div className="stat-value">
                {categoryVotes.length}/{TOTAL_CATEGORIES}
              </div>
              <div className="stat-label">Hạng mục đã dự đoán</div>
            </div>
          </div>

          {/* History List */}
          <h3 style={{ marginBottom: "1.5rem" }}>Chi tiết dự đoán theo hạng mục</h3>

          {historyLoading ? (
            <div className="empty-state glass-card">
              <div className="empty-state-icon">⏳</div>
              <h3>Đang tải lịch sử...</h3>
            </div>
          ) : categoryVotes.length === 0 ? (
            <div className="empty-state glass-card">
              <div className="empty-state-icon">📭</div>
              <h3>Chưa có lịch sử dự đoán</h3>
              <p style={{ marginBottom: "1.5rem" }}>Bạn chưa thực hiện dự đoán nào. Hãy bắt đầu ngay!</p>
              <Link to="/vote" className="btn btn-gold">
                🗳️ Dự đoán ngay
              </Link>
            </div>
          ) : (
            <div className="history-list">
              {categoryVotes.map((vote) => (
                <div key={vote.category_id} className="history-item">
                  <div className="history-item-header">
                    <span className="history-category-title">
                      <span>{vote.category_icon}</span>
                      <span style={{ fontWeight: 600 }}>{vote.category_name}</span>
                    </span>
                    <span className="history-date">📅 {formatDate(vote.voted_at)}</span>
                  </div>
                  <div className="history-vote-detail">
                    <div className="history-nominee-info">
                      <img
                        src={vote.nominee_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(vote.nominee_name || "User")}&background=random&size=40`}
                        alt={vote.nominee_name}
                        className="history-nominee-avatar"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(vote.nominee_name || "User")}&background=random&size=40`;
                        }}
                      />
                      <span className="history-nominee-name">{vote.nominee_name}</span>
                    </div>
                    {vote.predicted_count > 0 && (
                      <span className="predicted-count-badge" title="Số người dự đoán giống bạn">
                        👥 Dự đoán: {vote.predicted_count} người
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Action */}
          <div style={{ textAlign: "center", marginTop: "2rem" }}>
            <Link to="/vote" className="btn btn-gold btn-lg">
              🗳️ {categoryVotes.length < TOTAL_CATEGORIES ? "Tiếp tục dự đoán" : "Thay đổi dự đoán"}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
