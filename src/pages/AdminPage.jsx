import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { getAllVoteSessions, getVoterRankingReport, getAllUsersForAdmin, updateUserAdminStatus, formatCurrency, formatDate } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

export default function AdminPage() {
    const { user, voteUser, loading } = useAuth()
    const navigate = useNavigate()
    const [activeTab, setActiveTab] = useState('votes') // 'votes', 'users', or 'admins'
    const [votesData, setVotesData] = useState([])
    const [usersData, setUsersData] = useState([])
    const [adminsData, setAdminsData] = useState([])
    const [isLoadingData, setIsLoadingData] = useState(true)
    const [updatingUserId, setUpdatingUserId] = useState(null)

    useEffect(() => {
        // Redirect if not admin
        if (!loading) {
            if (!user || !voteUser?.is_admin) {
                // navigate('/')
            } else {
                fetchData()
            }
        }
    }, [user, voteUser, loading, navigate])

    const fetchData = async () => {
        setIsLoadingData(true)
        try {
            const [sessions, users, allUsers] = await Promise.all([
                getAllVoteSessions(),
                getVoterRankingReport(),
                getAllUsersForAdmin()
            ])
            setVotesData(sessions)
            setUsersData(users)
            setAdminsData(allUsers)
        } catch (error) {
            console.error('Error fetching admin data:', error)
        } finally {
            setIsLoadingData(false)
        }
    }

    const handleToggleAdmin = async (userId, currentStatus, userName) => {
        const action = currentStatus ? 'xóa quyền admin của' : 'cấp quyền admin cho'
        if (!window.confirm(`Bạn có chắc muốn ${action} "${userName}"?`)) {
            return
        }

        setUpdatingUserId(userId)
        try {
            await updateUserAdminStatus(userId, !currentStatus)
            // Refresh data
            const updatedUsers = await getAllUsersForAdmin()
            setAdminsData(updatedUsers)
        } catch (error) {
            console.error('Error updating admin status:', error)
            alert('Có lỗi xảy ra khi cập nhật quyền admin: ' + error.message)
        } finally {
            setUpdatingUserId(null)
        }
    }

    if (loading) return <div className="container" style={{ paddingTop: '2rem' }}>Loading...</div>

    if (!user || !voteUser?.is_admin) {
        return (
            <div className="container" style={{ paddingTop: '4rem', textAlign: 'center' }}>
                <h1>⛔ Access Denied</h1>
                <p>Bạn không có quyền truy cập trang này.</p>
                <button
                    className="btn btn-primary"
                    style={{ marginTop: '1rem' }}
                    onClick={() => navigate('/')}
                >
                    Về Trang Chủ
                </button>
            </div>
        )
    }

    return (
        <div className="container" style={{ paddingBottom: '4rem' }}>
            <div className="section-header" style={{ marginTop: '2rem', marginBottom: '2rem' }}>
                <h1 className="section-title">Admin Dashboard</h1>
                <p className="section-subtitle">Quản lý và thống kê dự đoán</p>
            </div>

            {/* Tabs */}
            <div className="admin-tabs" style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                <button
                    className={`btn ${activeTab === 'votes' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setActiveTab('votes')}
                >
                    🗳️ Các Phiên Dự đoán ({votesData.length})
                </button>
                <button
                    className={`btn ${activeTab === 'users' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setActiveTab('users')}
                >
                    👥 Thống kê User ({usersData.length})
                </button>
                <button
                    className={`btn ${activeTab === 'admins' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setActiveTab('admins')}
                >
                    🔐 Phân quyền Admin ({adminsData.filter(u => u.is_admin).length}/{adminsData.length})
                </button>
                <button
                    className="btn btn-secondary"
                    onClick={fetchData}
                    title="Làm mới dữ liệu"
                >
                    🔄 Refresh
                </button>
            </div>

            {isLoadingData ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>Đang tải dữ liệu...</div>
            ) : (
                <div className="admin-content">
                    {activeTab === 'votes' && (
                        <div className="card">
                            <div style={{ overflowX: 'auto' }}>
                                <table className="admin-table">
                                    <thead>
                                        <tr>
                                            <th>Thời gian</th>
                                            <th>Người dự đoán</th>
                                            <th>Chi tiết phiếu dự đoán</th>
                                            <th>Tổng tiền</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {votesData.map((session) => (
                                            <tr key={session.id}>
                                                <td style={{ whiteSpace: 'nowrap' }}>
                                                    {formatDate(session.created_at)}
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <span style={{ fontWeight: 'bold' }}>{session.voter_name || 'Anonymous'}</span>
                                                    </div>
                                                    <div style={{ fontSize: '0.8em', color: '#666' }}>{session.voter_email}</div>
                                                </td>
                                                <td>
                                                    <div style={{ marginBottom: '0.25rem', fontSize: '0.9em' }}>
                                                        {session.total_categories} hạng mục
                                                    </div>
                                                    <div className="nominee-list">
                                                        {session.votes?.map((vote) => (
                                                            <div key={vote.id} className="nominee-item">
                                                                <div className="mini-nominee">
                                                                    {vote.nominee?.url_avatar ? (
                                                                        <img src={vote.nominee.url_avatar} alt={vote.nominee.user_name} />
                                                                    ) : (
                                                                        <div className="mini-avatar-placeholder">{vote.nominee?.user_name?.[0]}</div>
                                                                    )}
                                                                </div>
                                                                <div className="custom-tooltip">
                                                                    <div className="tooltip-cat">{vote.category_name}</div>
                                                                    <div className="tooltip-name">{vote.nominee?.user_name}</div>
                                                                    <div className="tooltip-role">{vote.nominee?.role}</div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td style={{ color: '#FCD34D', fontWeight: 'bold' }}>
                                                    {formatCurrency(session.total_amount)}
                                                </td>
                                            </tr>
                                        ))}
                                        {votesData.length === 0 && (
                                            <tr>
                                                <td colSpan="4" style={{ textAlign: 'center', padding: '2rem' }}>Chưa có dữ liệu phiên dự đoán</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'users' && (
                        <div className="card">
                            <div style={{ overflowX: 'auto' }}>
                                <table className="admin-table">
                                    <thead>
                                        <tr>
                                            <th>Hạng</th>
                                            <th>Người dùng</th>
                                            <th>Thống kê Vote</th>
                                            <th>Chi tiết</th>
                                            <th>Tổng chi</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {usersData.map((user, index) => (
                                            <tr key={user.voter_id || index}>
                                                <td>
                                                    <div style={{
                                                        width: 24, height: 24,
                                                        borderRadius: '50%',
                                                        background: index < 3 ? '#FCD34D' : '#eee',
                                                        color: index < 3 ? '#000' : '#666',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        fontWeight: 'bold'
                                                    }}>
                                                        {index + 1}
                                                    </div>
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                        <img
                                                            src={user.voter_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.voter_email}`}
                                                            alt=""
                                                            style={{ width: 32, height: 32, borderRadius: '50%' }}
                                                        />
                                                        <div>
                                                            <div style={{ fontWeight: 'bold' }}>{user.voter_full_name || user.voter_name}</div>
                                                            <div style={{ fontSize: '0.8em', color: '#666' }}>{user.voter_email}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div>Tổng phiếu: <b>{user.total_votes}</b></div>
                                                    <div style={{ fontSize: '0.8em', color: '#666' }}>{user.total_sessions} lượt dự đoán</div>
                                                </td>
                                                <td>
                                                    <div style={{ fontSize: '0.9em' }}>
                                                        Đã dự đoán: <b>{user.categories_voted}</b> hạng mục
                                                    </div>
                                                    <div style={{ fontSize: '0.8em', color: '#666' }}>
                                                        Lần cuối: {formatDate(user.last_vote_time)}
                                                    </div>
                                                </td>
                                                <td style={{ color: '#FCD34D', fontWeight: 'bold', fontSize: '1.1em' }}>
                                                    {formatCurrency(user.total_spent)}
                                                </td>
                                            </tr>
                                        ))}
                                        {usersData.length === 0 && (
                                            <tr>
                                                <td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>Chưa có dữ liệu user</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'admins' && (
                        <div className="card">
                            <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'rgba(252, 211, 77, 0.1)', borderRadius: '8px', border: '1px solid rgba(252, 211, 77, 0.3)' }}>
                                <p style={{ margin: 0, fontSize: '0.9rem' }}>
                                    ⚠️ <strong>Lưu ý:</strong> Chỉ có Admin mới có thể truy cập trang này và thay đổi quyền admin của user khác.
                                </p>
                            </div>
                            <div style={{ overflowX: 'auto' }}>
                                <table className="admin-table">
                                    <thead>
                                        <tr>
                                            <th style={{ width: '50px' }}>STT</th>
                                            <th>User</th>
                                            <th>Email</th>
                                            <th>Role</th>
                                            <th style={{ textAlign: 'center' }}>Quyền Admin</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {adminsData.map((adminUser, index) => (
                                            <tr key={adminUser.id}>
                                                <td style={{ textAlign: 'center' }}>{index + 1}</td>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                        {adminUser.url_avatar ? (
                                                            <img
                                                                src={adminUser.url_avatar}
                                                                alt=""
                                                                style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }}
                                                            />
                                                        ) : (
                                                            <div style={{
                                                                width: 36, height: 36, borderRadius: '50%',
                                                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                color: 'white', fontWeight: 'bold', fontSize: '0.9rem'
                                                            }}>
                                                                {adminUser.user_name?.[0]?.toUpperCase() || '?'}
                                                            </div>
                                                        )}
                                                        <div>
                                                            <div style={{ fontWeight: 'bold' }}>{adminUser.full_name || adminUser.user_name}</div>
                                                            <div style={{ fontSize: '0.8em', color: '#888' }}>@{adminUser.user_name}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span style={{ fontSize: '0.9em', color: '#aaa' }}>{adminUser.email}</span>
                                                </td>
                                                <td>
                                                    <span className={`role-badge role-${adminUser.role?.toLowerCase()}`}>
                                                        {adminUser.role}
                                                    </span>
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <label className="admin-toggle">
                                                        <input
                                                            type="checkbox"
                                                            checked={adminUser.is_admin || false}
                                                            onChange={() => handleToggleAdmin(adminUser.id, adminUser.is_admin, adminUser.full_name || adminUser.user_name)}
                                                            disabled={updatingUserId === adminUser.id || adminUser.id === voteUser?.id}
                                                        />
                                                        <span className="toggle-slider"></span>
                                                    </label>
                                                    {adminUser.id === voteUser?.id && (
                                                        <span style={{ fontSize: '0.75em', color: '#888', display: 'block', marginTop: '4px' }}>
                                                            (You)
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                        {adminsData.length === 0 && (
                                            <tr>
                                                <td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>Chưa có dữ liệu user</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <style>{`
                .admin-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 0.95rem;
                }
                .admin-table th {
                    text-align: left;
                    padding: 1rem;
                    background: rgba(255, 255, 255, 0.05);
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                    color: #aaa;
                    font-weight: 500;
                }
                .admin-table td {
                    padding: 1rem;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                    vertical-align: middle;
                }
                .admin-table tr:last-child td {
                    border-bottom: none;
                }
                .admin-table tr:hover td {
                    background: rgba(255, 255, 255, 0.02);
                }
                .badge {
                    background: rgba(255, 255, 255, 0.1);
                    padding: 0.1rem 0.4rem;
                    border-radius: 4px;
                }
                .nominee-list {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 0.5rem;
                }
                .mini-nominee {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    overflow: hidden;
                    border: 2px solid rgba(255, 255, 255, 0.1);
                    padding: 0;
                    margin: 0;
                }
                .mini-nominee img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                .mini-avatar-placeholder {
                    width: 100%;
                    height: 100%;
                    background: #666;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 0.8em;
                    font-weight: bold;
                }
                .nominee-item {
                    position: relative;
                    cursor: pointer;
                }
                .custom-tooltip {
                    visibility: hidden;
                    position: absolute;
                    bottom: 110%;
                    left: 50%;
                    transform: translateX(-50%);
                    background: rgba(0, 0, 0, 0.95);
                    border: 1px solid rgba(255, 255, 255, 0.15);
                    color: white;
                    padding: 0.5rem 0.75rem;
                    border-radius: 6px;
                    z-index: 1000;
                    min-width: 140px;
                    text-align: center;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.5);
                    opacity: 0;
                    transition: opacity 0.2s, visibility 0.2s;
                    pointer-events: none;
                }
                .nominee-item:hover .custom-tooltip {
                    visibility: visible;
                    opacity: 1;
                }
                .nominee-item:hover .mini-nominee {
                    border-color: #FCD34D;
                    transform: scale(1.1);
                    transition: all 0.2s;
                }
                .tooltip-cat {
                    font-size: 0.65em;
                    text-transform: uppercase;
                    color: #aaa;
                    margin-bottom: 2px;
                    letter-spacing: 0.5px;
                }
                .tooltip-name {
                    font-weight: bold;
                    color: #FCD34D;
                    font-size: 0.9em;
                    margin-bottom: 1px;
                }
                .tooltip-role {
                    font-size: 0.7em;
                    background: rgba(255, 255, 255, 0.1);
                    display: inline-block;
                    padding: 0 4px;
                    border-radius: 3px;
                    margin-top: 2px;
                }
                .custom-tooltip::after {
                    content: '';
                    position: absolute;
                    top: 100%;
                    left: 50%;
                    margin-left: -5px;
                    border-width: 5px;
                    border-style: solid;
                    border-color: rgba(0, 0, 0, 0.95) transparent transparent transparent;
                }
                
                /* Admin Toggle Switch */
                .admin-toggle {
                    position: relative;
                    display: inline-block;
                    width: 50px;
                    height: 26px;
                }
                .admin-toggle input {
                    opacity: 0;
                    width: 0;
                    height: 0;
                }
                .toggle-slider {
                    position: absolute;
                    cursor: pointer;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: #444;
                    transition: 0.3s;
                    border-radius: 26px;
                }
                .toggle-slider:before {
                    position: absolute;
                    content: "";
                    height: 20px;
                    width: 20px;
                    left: 3px;
                    bottom: 3px;
                    background-color: white;
                    transition: 0.3s;
                    border-radius: 50%;
                }
                .admin-toggle input:checked + .toggle-slider {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                }
                .admin-toggle input:checked + .toggle-slider:before {
                    transform: translateX(24px);
                }
                .admin-toggle input:disabled + .toggle-slider {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
                
                /* Role Badges */
                .role-badge {
                    display: inline-block;
                    padding: 0.25rem 0.5rem;
                    border-radius: 4px;
                    font-size: 0.8em;
                    font-weight: 600;
                    text-transform: uppercase;
                }
                .role-pm {
                    background: rgba(59, 130, 246, 0.2);
                    color: #60a5fa;
                    border: 1px solid rgba(59, 130, 246, 0.3);
                }
                .role-ba {
                    background: rgba(16, 185, 129, 0.2);
                    color: #34d399;
                    border: 1px solid rgba(16, 185, 129, 0.3);
                }
                .role-dev {
                    background: rgba(249, 115, 22, 0.2);
                    color: #fb923c;
                    border: 1px solid rgba(249, 115, 22, 0.3);
                }
                .role-project {
                    background: rgba(168, 85, 247, 0.2);
                    color: #c084fc;
                    border: 1px solid rgba(168, 85, 247, 0.3);
                }
            `}</style>
        </div>
    )
}

