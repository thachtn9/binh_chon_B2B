import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Header() {
    const { user, userName, userEmail, userAvatar, signOut, signInWithGoogle, voteUser } = useAuth()
    const location = useLocation()

    const isActive = (path) => location.pathname === path

    return (
        <header className="header">
            <div className="container header-content">
                <Link to="/" className="logo">
                    <span className="logo-icon">🏆</span>
                    <span>ISCGP Awards 2025</span>
                </Link>

                <nav className="nav-links">
                    <Link
                        to="/"
                        className={`nav-link ${isActive('/') ? 'active' : ''}`}
                    >
                        Trang chủ
                    </Link>
                    <Link
                        to="/vote"
                        className={`nav-link ${isActive('/vote') ? 'active' : ''}`}
                    >
                        Dự đoán
                    </Link>
                    {user && (
                        <Link
                            to="/history"
                            className={`nav-link ${isActive('/history') ? 'active' : ''}`}
                        >
                            Lịch sử
                        </Link>
                    )}
                    {voteUser?.is_admin && (
                        <Link
                            to="/admin"
                            className={`nav-link ${isActive('/admin') ? 'active' : ''}`}
                        >
                            Admin
                        </Link>
                    )}
                </nav>

                <div className="user-section">
                    {user ? (
                        <>
                            <div className="user-info">
                                <img
                                    src={userAvatar}
                                    alt={userName}
                                    className="user-avatar"
                                />
                                <div>
                                    <div className="user-name">{userName}</div>
                                    <div className="user-email">{userEmail}</div>
                                </div>
                            </div>
                            <button onClick={signOut} className="btn btn-secondary btn-sm">
                                Đăng xuất
                            </button>
                        </>
                    ) : (
                        <>
                            <button onClick={signInWithGoogle} className="btn btn-primary btn-sm">
                                Đăng nhập Google
                            </button>

                        </>
                    )}
                </div>
            </div>
        </header >
    )
}
