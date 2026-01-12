import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useVote } from '../context/VoteContext'
import NomineeCard from '../components/NomineeCard'
import VoteSummary from '../components/VoteSummary'
import { categories, fetchNomineesForCategory, formatCurrency } from '../lib/supabase'

export default function VotePage() {
    const { user, signInWithGoogle, canVote, permissionMessage, permissionLoading } = useAuth()
    const { selectedCount, TOTAL_CATEGORIES, VOTE_COST, selections } = useVote()
    const [activeCategory, setActiveCategory] = useState(categories[0])
    const [activeSubCategory, setActiveSubCategory] = useState(
        categories[0].sub_categories ? categories[0].sub_categories[0].id : null
    )
    const [searchTerm, setSearchTerm] = useState('')
    const [animationKey, setAnimationKey] = useState(0)
    const [isAnimating, setIsAnimating] = useState(true)

    // State for nominees loaded from database
    const [nominees, setNominees] = useState([])
    const [nomineesLoading, setNomineesLoading] = useState(true)

    // Fetch nominees when category/sub-category changes
    useEffect(() => {
        async function loadNominees() {
            setNomineesLoading(true)
            try {
                const data = await fetchNomineesForCategory(activeCategory, activeSubCategory)
                setNominees(data)
            } catch (error) {
                console.error('Error loading nominees:', error)
                setNominees([])
            } finally {
                setNomineesLoading(false)
            }
        }
        loadNominees()
    }, [activeCategory, activeSubCategory])

    // Filter nominees by search term
    const filteredNominees = nominees.filter(nominee =>
        nominee.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        nominee.description?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    // Trigger animation when category or sub-category changes
    const handleCategoryChange = (category) => {
        if (category.id !== activeCategory.id) {
            setIsAnimating(true)
            setAnimationKey(prev => prev + 1)
            setActiveCategory(category)
            setActiveSubCategory(category.sub_categories ? category.sub_categories[0].id : null)
            setSearchTerm('')

            setTimeout(() => {
                setIsAnimating(false)
            }, 800)
        }
    }

    const handleSubCategoryChange = (subCatId) => {
        if (subCatId !== activeSubCategory) {
            setIsAnimating(true)
            setAnimationKey(prev => prev + 1)
            setActiveSubCategory(subCatId)
            setSearchTerm('')

            setTimeout(() => {
                setIsAnimating(false)
            }, 800)
        }
    }

    // Initial animation on mount
    useEffect(() => {
        const timer = setTimeout(() => {
            setIsAnimating(false)
        }, 800)
        return () => clearTimeout(timer)
    }, [])

    // Check if category is fully completed (including all sub-categories)
    const isCategoryCompleted = (category) => {
        if (category.sub_categories) {
            return category.sub_categories.every(sub => selections[sub.id])
        }
        return selections[category.id]
    }

    // Get completion count for category with sub-categories
    const getSubCategoryCompletionCount = (category) => {
        if (!category.sub_categories) return 0
        return category.sub_categories.filter(sub => selections[sub.id]).length
    }

    return (
        <main className="vote-page">
            {/* Header */}
            <section className="vote-header">
                <div className="container">
                    <h1 className="vote-title">🗳️ Dự Đoán ISCGP Awards 2025</h1>
                    <p className="vote-subtitle">
                        Chọn ứng viên cho <strong>tất cả {TOTAL_CATEGORIES} hạng mục</strong> •
                        Mỗi lần dự đoán = <strong style={{ color: 'var(--gold)' }}>{formatCurrency(VOTE_COST)}</strong>
                    </p>

                    {/* Progress Bar */}
                    <div className="vote-progress">
                        <div className="vote-progress-bar">
                            <div
                                className="vote-progress-fill"
                                style={{ width: `${(selectedCount / TOTAL_CATEGORIES) * 100}%` }}
                            />
                        </div>
                        <span className="vote-progress-text">
                            {selectedCount}/{TOTAL_CATEGORIES} hạng mục đã chọn
                        </span>
                    </div>
                </div>
            </section>

            {/* Thông báo khi chưa đăng nhập */}
            {!user && (
                <div className="container" style={{ marginBottom: '1rem' }}>
                    <div className="login-prompt">
                        <span>⚠️ Bạn cần đăng nhập để bình chọn</span>
                        <button onClick={signInWithGoogle} className="btn btn-primary btn-sm">
                            Đăng nhập với Google
                        </button>
                    </div>
                </div>
            )}

            {/* Thông báo đang kiểm tra quyền */}
            {user && permissionLoading && (
                <div className="container" style={{ marginBottom: '1rem' }}>
                    <div className="login-prompt" style={{ background: 'rgba(255, 193, 7, 0.1)', borderColor: 'rgba(255, 193, 7, 0.3)' }}>
                        <span>⏳ Đang kiểm tra quyền bình chọn...</span>
                    </div>
                </div>
            )}

            {/* Thông báo khi không có quyền bình chọn */}
            {user && !permissionLoading && !canVote && (
                <div className="container" style={{ marginBottom: '1rem' }}>
                    <div className="login-prompt" style={{ background: 'rgba(220, 53, 69, 0.1)', borderColor: 'rgba(220, 53, 69, 0.3)' }}>
                        <span style={{ color: '#dc3545' }}>🚫 {permissionMessage || 'Bạn không có quyền bình chọn. Vui lòng liên hệ Admin.'}</span>
                    </div>
                </div>
            )}

            {/* Main Layout: Left categories, Right nominees */}
            <div className="vote-layout container">
                {/* Left Sidebar - Categories */}
                <aside className="vote-sidebar">
                    <h3 className="sidebar-title">Hạng mục</h3>
                    <div className="category-list">
                        {categories.map(category => {
                            const isCompleted = isCategoryCompleted(category)
                            const isActive = activeCategory.id === category.id
                            const subCompletionCount = getSubCategoryCompletionCount(category)
                            const hasSubCategories = category.sub_categories && category.sub_categories.length > 0

                            return (
                                <button
                                    key={category.id}
                                    className={`category-tab ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                                    onClick={() => handleCategoryChange(category)}
                                >
                                    <span className="category-tab-icon">{category.icon}</span>
                                    <div className="category-tab-info">
                                        <span className="category-tab-name">{category.name}</span>
                                        <span className="category-tab-type">
                                            {category.type === 'individual' ? 'Cá nhân' : 'Dự án'}
                                            {hasSubCategories && (
                                                <span style={{ marginLeft: '6px', color: 'var(--gold)' }}>
                                                    ({subCompletionCount}/{category.sub_categories.length})
                                                </span>
                                            )}
                                        </span>
                                    </div>
                                    {isCompleted && (
                                        <span className="category-tab-check">✓</span>
                                    )}
                                </button>
                            )
                        })}
                    </div>
                </aside>

                {/* Right Content - Nominees */}
                <section className="vote-content">
                    {/* Category Header */}
                    <div className="content-header">
                        <div className="content-header-info">
                            <span className="content-category-icon">{activeCategory.icon}</span>
                            <div>
                                <h2 className="content-category-name">{activeCategory.name}</h2>
                                <p className="content-category-desc">{activeCategory.description}</p>
                            </div>
                        </div>
                        <span className="content-nominee-count">
                            {filteredNominees.length} ứng viên
                        </span>
                    </div>

                    {/* Sub-category tabs for Star Performer */}
                    {activeCategory.sub_categories && (
                        <div className="sub-category-tabs">
                            {activeCategory.sub_categories.map(subCat => {
                                const isSubActive = activeSubCategory === subCat.id
                                const isSubCompleted = selections[subCat.id]

                                return (
                                    <button
                                        key={subCat.id}
                                        className={`sub-tab ${isSubActive ? 'active' : ''} ${isSubCompleted ? 'completed' : ''}`}
                                        onClick={() => handleSubCategoryChange(subCat.id)}
                                    >
                                        <span className="sub-tab-name">{subCat.name}</span>
                                        <span className="sub-tab-label">{subCat.label}</span>
                                        {isSubCompleted && <span className="sub-tab-check">✓</span>}
                                    </button>
                                )
                            })}
                        </div>
                    )}

                    {/* Search */}
                    <div className="nominee-search">
                        <input
                            type="text"
                            placeholder="🔍 Tìm kiếm ứng viên..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="search-input"
                        />
                        {searchTerm && (
                            <button
                                className="search-clear"
                                onClick={() => setSearchTerm('')}
                            >
                                ✕
                            </button>
                        )}
                    </div>

                    {/* Nominees Grid with staggered animation */}
                    <div className="nominees-grid" key={animationKey}>
                        {nomineesLoading ? (
                            <div className="empty-state">
                                <div className="empty-state-icon" style={{ fontSize: '2rem' }}>⏳</div>
                                <p>Đang tải danh sách ứng viên...</p>
                            </div>
                        ) : filteredNominees.length > 0 ? (
                            filteredNominees.map((nominee, index) => (
                                <div
                                    key={nominee.id}
                                    className={`nominee-animate ${isAnimating ? 'animate-in' : ''}`}
                                    style={{
                                        animationDelay: isAnimating ? `${index * 50}ms` : '0ms'
                                    }}
                                >
                                    <NomineeCard
                                        nominee={nominee}
                                        categoryId={activeSubCategory || activeCategory.id}
                                    />
                                </div>
                            ))
                        ) : (
                            <div className="empty-state">
                                <div className="empty-state-icon">🔍</div>
                                <p>{searchTerm ? `Không tìm thấy ứng viên "${searchTerm}"` : 'Không có ứng viên nào trong hạng mục này'}</p>
                                {searchTerm && (
                                    <button
                                        className="btn btn-secondary btn-sm"
                                        onClick={() => setSearchTerm('')}
                                    >
                                        Xóa tìm kiếm
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </section>
            </div>

            {/* Vote Summary - floating bottom bar */}
            <VoteSummary />

            {/* Spacer for fixed bottom bar */}
            <div style={{ height: '100px' }} />
        </main>
    )
}
