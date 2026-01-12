import { useVote } from '../context/VoteContext'
import { useAuth } from '../context/AuthContext'

export default function NomineeCard({ nominee, categoryId, showVotes = false }) {
    const { selections, selectNominee } = useVote()
    const { canVote, user } = useAuth()
    const isSelected = selections[categoryId] === nominee.id

    // Chỉ cho phép click nếu đã đăng nhập và có quyền bình chọn
    const canClickToVote = user && canVote

    const handleClick = () => {
        if (!canClickToVote) return
        selectNominee(categoryId, nominee.id)
    }

    // Lấy chữ cái cuối cùng của tên (VD: "Nguyễn Văn Bình" -> "B")
    const getInitial = (name) => {
        if (!name) return '?'
        const parts = name.trim().split(' ')
        const lastName = parts[parts.length - 1] // Lấy từ cuối cùng
        return lastName.charAt(0).toUpperCase()
    }

    // Kiểm tra xem có avatar hợp lệ không
    const hasValidAvatar = nominee.url_avatar &&
        nominee.url_avatar.trim() !== '' &&
        !nominee.url_avatar.includes('undefined')

    // Hiển thị tên (ưu tiên full_name, sau đó user_name)
    const displayName = nominee.full_name || nominee.user_name || 'Unknown'

    // Initial cho avatar placeholder
    const initial = getInitial(displayName)

    // Màu ngẫu nhiên cho avatar placeholder dựa trên tên
    const getAvatarColor = (name) => {
        const colors = [
            'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
            'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
            'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
            'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
            'linear-gradient(135deg, #667eea 0%, #f093fb 100%)',
        ]
        const index = name ? name.charCodeAt(0) % colors.length : 0
        return colors[index]
    }

    return (
        <div
            className={`nominee-card ${isSelected ? 'selected' : ''} ${!canClickToVote ? 'disabled' : ''}`}
            onClick={handleClick}
            style={{
                cursor: canClickToVote ? 'pointer' : 'not-allowed',
                opacity: canClickToVote ? 1 : 0.6
            }}
        >
            {hasValidAvatar ? (
                <img
                    src={nominee.url_avatar}
                    alt={displayName}
                    className="nominee-avatar"
                    onError={(e) => {
                        // Nếu load ảnh lỗi, ẩn img và hiện placeholder
                        e.target.style.display = 'none'
                        e.target.nextSibling.style.display = 'flex'
                    }}
                />
            ) : null}
            <div
                className="nominee-avatar-placeholder"
                style={{
                    background: getAvatarColor(displayName),
                    display: hasValidAvatar ? 'none' : 'flex'
                }}
            >
                {initial}
            </div>
            <div className="nominee-info">
                <div className="nominee-name">{displayName}</div>
                <div className="nominee-role">{nominee.user_name} - {nominee.role}</div>
                {nominee.description && (
                    <div className="nominee-description">
                        {nominee.description}
                    </div>
                )}
            </div>
            {showVotes && (
                <div className="nominee-votes">
                    <div className="nominee-vote-count">{nominee.vote_count || 0}</div>
                    <div className="nominee-vote-label">votes</div>
                </div>
            )}
            <div className="check-icon">
                {isSelected && '✓'}
            </div>
        </div>
    )
}
