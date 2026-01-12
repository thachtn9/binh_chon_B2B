import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useVote } from '../context/VoteContext'
import { formatCurrency, formatDate } from '../lib/supabase'
import { Link } from 'react-router-dom'

export default function HistoryPage() {
    const { user, userEmail, signInDemo, voteUser } = useAuth()
    const { getUserHistory, getUserTotalSpent, voteHistory, totalPrize, totalVotes, loadUserHistory } = useVote()
    const [historyLoading, setHistoryLoading] = useState(false)

    // Auto-load user history from database when page loads
    useEffect(() => {
        async function loadHistory() {
            if (voteUser?.id) {
                setHistoryLoading(true)
                await loadUserHistory(voteUser.id)
                setHistoryLoading(false)
            }
        }
        loadHistory()
    }, [voteUser?.id, loadUserHistory])

    // Use voteHistory directly - loadUserHistory already filters for current user
    const userHistory = voteHistory
    const userTotalSpent = userHistory.reduce((sum, session) => sum + (session.total_amount || 0), 0)
    const userTotalVotes = userHistory.reduce((sum, session) => sum + (session.total_categories || 0), 0)

    if (!user) {
        return (
            <main className="login-container">
                <div className="login-card glass-card">
                    <div className="login-icon">🔐</div>
                    <h2 className="login-title">Đăng nhập để xem lịch sử</h2>
                    <p className="login-subtitle">
                        Bạn cần đăng nhập để xem lịch sử dự đoán của mình
                    </p>
                    <button onClick={signInDemo} className="google-btn">
                        <span>🔑</span>
                        Đăng nhập Demo
                    </button>
                </div>
            </main>
        )
    }

    return (
        <main>
            <section className="hero" style={{ paddingBottom: '1rem' }}>
                <div className="container">
                    <h1 className="hero-title" style={{ fontSize: '2.5rem' }}>📜 Lịch Sử Dự Đoán</h1>
                    <p className="hero-subtitle">
                        Theo dõi tất cả các lượt dự đoán và đóng góp của bạn
                    </p>
                </div>
            </section>

            <section className="history-section">
                <div className="container">
                    {/* User Stats */}
                    <div className="history-stats">
                        <div className="stat-card">
                            <div className="stat-value">{userHistory.length}</div>
                            <div className="stat-label">Lượt dự đoán</div>
                        </div>
                        {/* <div className="stat-card">
                            <div className="stat-value">{userTotalVotes}</div>
                            <div className="stat-label">Phiếu bầu</div>
                        </div> */}
                        <div className="stat-card">
                            <div className="stat-value" style={{ color: 'var(--gold)' }}>
                                {formatCurrency(userTotalSpent)}
                            </div>
                            <div className="stat-label">Tổng đóng góp</div>
                        </div>
                        <div className="stat-card" style={{ borderColor: 'var(--gold)' }}>
                            <div className="stat-value" style={{ color: 'var(--gold)' }}>
                                {formatCurrency(totalPrize)}
                            </div>
                            <div className="stat-label">Tổng giải thưởng ({totalVotes} phiếu)</div>
                        </div>
                    </div>

                    {/* History List */}
                    <h3 style={{ marginBottom: '1.5rem' }}>Chi tiết bình chọn</h3>

                    {historyLoading ? (
                        <div className="empty-state glass-card">
                            <div className="empty-state-icon">⏳</div>
                            <h3>Đang tải lịch sử...</h3>
                        </div>
                    ) : userHistory.length === 0 ? (
                        <div className="empty-state glass-card">
                            <div className="empty-state-icon">📭</div>
                            <h3>Chưa có lịch sử dự đoán</h3>
                            <p style={{ marginBottom: '1.5rem' }}>
                                Bạn chưa thực hiện dự đoán nào. Hãy bắt đầu ngay!
                            </p>
                            <Link to="/vote" className="btn btn-gold">
                                🗳️ Dự đoán ngay
                            </Link>
                        </div>
                    ) : (
                        <div className="history-list">
                            {userHistory.map(session => (
                                <div key={session.id} className="history-item">
                                    <div className="history-item-header">
                                        <span className="history-date">
                                            📅 {formatDate(session.created_at)}
                                        </span>
                                        <span className="history-amount">
                                            {formatCurrency(session.total_amount)}
                                        </span>
                                    </div>
                                    <div className="history-votes">
                                        {session.votes.map((vote, index) => (
                                            <span key={index} className="history-vote-tag">
                                                <span>{vote.category_icon}</span>
                                                <span style={{ fontWeight: 500 }}>{vote.category_name}</span>
                                                <span style={{ color: 'var(--text-muted)' }}>→</span>
                                                <img
                                                    src={vote.nominee_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(vote.nominee_name || 'User')}&background=random&size=40`}
                                                    alt={vote.nominee_name}
                                                    style={{ width: '20px', height: '20px', borderRadius: '50%' }}
                                                    onError={(e) => {
                                                        e.target.onerror = null;
                                                        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(vote.nominee_name || 'User')}&background=random&size=40`;
                                                    }}
                                                />
                                                <span>{vote.nominee_name}</span>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Action */}
                    <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                        <Link to="/vote" className="btn btn-gold btn-lg">
                            🗳️ Dự đoán thêm
                        </Link>
                    </div>
                </div>
            </section>
        </main>
    )
}
