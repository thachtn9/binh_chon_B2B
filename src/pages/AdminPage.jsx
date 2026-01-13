import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { getAllVoteSessions, getVoterRankingReport, getAllUsersForAdmin, updateUserAdminStatus, formatCurrency, formatDate, findCorrectPredictions, getNomineesForWinnerSelection } from '../lib/supabase'
import { categories } from '../config/votingConfig'
import { useNavigate } from 'react-router-dom'

export default function AdminPage() {
    const { user, voteUser, loading } = useAuth()
    const navigate = useNavigate()
    const [activeTab, setActiveTab] = useState('votes') // 'votes', 'users', 'admins', or 'results'
    const [votesData, setVotesData] = useState([])
    const [usersData, setUsersData] = useState([])
    const [adminsData, setAdminsData] = useState([])
    const [isLoadingData, setIsLoadingData] = useState(true)
    const [updatingUserId, setUpdatingUserId] = useState(null)

    // Results tab states
    const [allNominees, setAllNominees] = useState([])
    const [selectedWinners, setSelectedWinners] = useState({}) // { category_id: nominee_id }
    const [predictionResults, setPredictionResults] = useState([])
    const [isSearching, setIsSearching] = useState(false)

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
            const [sessions, users, allUsers, nominees] = await Promise.all([
                getAllVoteSessions(),
                getVoterRankingReport(),
                getAllUsersForAdmin(),
                getNomineesForWinnerSelection()
            ])
            setVotesData(sessions)
            setUsersData(users)
            setAdminsData(allUsers)
            setAllNominees(nominees)
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

    // Handle winner selection for a category
    const handleWinnerSelect = (categoryId, nomineeId) => {
        setSelectedWinners(prev => ({
            ...prev,
            [categoryId]: nomineeId
        }))
    }

    // Find correct predictions
    const handleFindPredictions = async () => {
        if (Object.keys(selectedWinners).length === 0) {
            alert('Vui lòng chọn ít nhất một người được vinh danh!')
            return
        }

        setIsSearching(true)
        try {
            const results = await findCorrectPredictions(selectedWinners)
            setPredictionResults(results)
        } catch (error) {
            console.error('Error finding predictions:', error)
            alert('Có lỗi xảy ra: ' + error.message)
        } finally {
            setIsSearching(false)
        }
    }

    // Get nominees for a specific category/role
    const getNomineesForCategory = (category, subCategory = null) => {
        const roleFilter = subCategory ? [subCategory.role] : category.role_filter
        return allNominees.filter(n => roleFilter.includes(n.role))
    }

    // Get all selection categories (including sub-categories)
    const getAllSelectionCategories = () => {
        const selections = []
        categories.forEach(cat => {
            if (cat.sub_categories) {
                cat.sub_categories.forEach(sub => {
                    selections.push({
                        id: sub.id,
                        name: `${cat.name} - ${sub.name}`,
                        icon: cat.icon,
                        role_filter: [sub.role],
                        parent: cat
                    })
                })
            } else {
                selections.push({
                    id: cat.id,
                    name: cat.name,
                    icon: cat.icon,
                    role_filter: cat.role_filter,
                    parent: null
                })
            }
        })
        return selections
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
            <div className="admin-tabs" style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
                <button
                    className={`btn ${activeTab === 'votes' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setActiveTab('votes')}
                >
                    🗳️ Phiên Dự đoán ({votesData.length})
                </button>
                <button
                    className={`btn ${activeTab === 'users' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setActiveTab('users')}
                >
                    👥 Thống kê ({usersData.length})
                </button>
                <button
                    className={`btn ${activeTab === 'admins' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setActiveTab('admins')}
                >
                    🔐 Phân quyền
                </button>
                <button
                    className={`btn ${activeTab === 'results' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setActiveTab('results')}
                >
                    🏆 Tìm Người Đoán Đúng
                </button>
                <button
                    className="btn btn-secondary"
                    onClick={fetchData}
                    title="Làm mới dữ liệu"
                >
                    🔄
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

                    {activeTab === 'results' && (
                        <div className="card">
                            <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                🏆 Tìm Người Dự Đoán Chính Xác
                            </h3>
                            <p style={{ color: '#888', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                                Chọn người được vinh danh cho mỗi hạng mục, sau đó nhấn "Tìm kiếm" để xem ai đã dự đoán đúng.
                            </p>

                            {/* Winner Selection Grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                                {getAllSelectionCategories().map(category => (
                                    <div key={category.id} style={{
                                        padding: '1rem',
                                        background: 'rgba(255,255,255,0.03)',
                                        borderRadius: '12px',
                                        border: selectedWinners[category.id] ? '2px solid var(--gold)' : '1px solid rgba(255,255,255,0.1)'
                                    }}>
                                        <div style={{ marginBottom: '0.5rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <span>{category.icon}</span>
                                            <span>{category.name}</span>
                                            {selectedWinners[category.id] && <span style={{ color: 'var(--gold)' }}>✓</span>}
                                        </div>
                                        <select
                                            value={selectedWinners[category.id] || ''}
                                            onChange={(e) => handleWinnerSelect(category.id, e.target.value)}
                                            style={{
                                                width: '100%',
                                                padding: '0.5rem',
                                                borderRadius: '8px',
                                                background: 'rgba(0,0,0,0.3)',
                                                border: '1px solid rgba(255,255,255,0.15)',
                                                color: 'white',
                                                fontSize: '0.9rem'
                                            }}
                                        >
                                            <option value="">-- Chọn người được vinh danh --</option>
                                            {allNominees
                                                .filter(n => category.role_filter.includes(n.role))
                                                .map(nominee => (
                                                    <option key={nominee.id} value={nominee.id}>
                                                        {nominee.full_name || nominee.user_name} ({nominee.role})
                                                    </option>
                                                ))
                                            }
                                        </select>
                                    </div>
                                ))}
                            </div>

                            {/* Search Button */}
                            <div style={{ marginBottom: '2rem' }}>
                                <button
                                    className="btn btn-primary"
                                    onClick={handleFindPredictions}
                                    disabled={isSearching || Object.keys(selectedWinners).length === 0}
                                    style={{ marginRight: '1rem' }}
                                >
                                    {isSearching ? '⏳ Đang tìm...' : `🔍 Tìm kiếm (${Object.keys(selectedWinners).length} hạng mục)`}
                                </button>
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => {
                                        setSelectedWinners({})
                                        setPredictionResults([])
                                    }}
                                >
                                    🗑️ Xóa tất cả
                                </button>
                            </div>

                            {/* Results Table */}
                            {predictionResults.length > 0 && (
                                <div>
                                    <h4 style={{ marginBottom: '1rem', color: 'var(--gold)' }}>
                                        📊 Kết quả: {predictionResults.length} lượt dự đoán
                                    </h4>
                                    <div style={{ overflowX: 'auto' }}>
                                        <table className="admin-table">
                                            <thead>
                                                <tr>
                                                    <th>Hạng</th>
                                                    <th>Người dự đoán</th>
                                                    <th>Số hạng mục đúng</th>
                                                    <th>Hạng mục đoán đúng</th>
                                                    <th>Thời gian dự đoán</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {predictionResults.map((result, index) => (
                                                    <tr key={result.session_id} style={{
                                                        background: index < 3 ? 'rgba(251, 191, 36, 0.1)' : 'transparent'
                                                    }}>
                                                        <td>
                                                            <div style={{
                                                                width: 28, height: 28,
                                                                borderRadius: '50%',
                                                                background: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : '#666',
                                                                color: index < 3 ? '#000' : '#fff',
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                fontWeight: 'bold', fontSize: '0.85rem'
                                                            }}>
                                                                {index + 1}
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <div style={{ fontWeight: 'bold' }}>{result.voter_name}</div>
                                                            <div style={{ fontSize: '0.8em', color: '#888' }}>{result.voter_email}</div>
                                                        </td>
                                                        <td>
                                                            <span style={{
                                                                fontWeight: 'bold',
                                                                fontSize: '1.2rem',
                                                                color: result.correct_count > 0 ? 'var(--gold)' : '#888'
                                                            }}>
                                                                {result.correct_count}
                                                            </span>
                                                            <span style={{ color: '#888', fontSize: '0.85rem' }}>
                                                                /{Object.keys(selectedWinners).length}
                                                            </span>
                                                            <span style={{ marginLeft: '0.5rem', fontSize: '0.8rem', color: result.correct_count > 0 ? '#10b981' : '#888' }}>
                                                                ({result.accuracy_percent}%)
                                                            </span>
                                                        </td>
                                                        <td>
                                                            {result.correct_categories.length > 0 ? (
                                                                <div style={{ fontSize: '0.85rem' }}>
                                                                    {result.correct_categories.join(', ')}
                                                                </div>
                                                            ) : (
                                                                <span style={{ color: '#888', fontStyle: 'italic' }}>Không có</span>
                                                            )}
                                                        </td>
                                                        <td style={{ fontSize: '0.85rem', color: '#aaa' }}>
                                                            {formatDate(result.created_at)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
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

