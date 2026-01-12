import NomineeCard from './NomineeCard'
import { getNomineesForCategory } from '../lib/supabase'
import { useVote } from '../context/VoteContext'

export default function CategoryCard({ category }) {
    const { selections } = useVote()
    const nominees = getNomineesForCategory(category)
    const selectedNominee = selections[category.id]

    return (
        <div className="category-card">
            <div className="category-header">
                <div className="category-icon">{category.icon}</div>
                <h3 className="category-name">{category.name}</h3>
                <p className="category-description">{category.description}</p>
                <span className="category-badge">
                    {category.type === 'individual' ? 'Cá nhân' : 'Dự án'}
                </span>
                {selectedNominee && (
                    <span className="category-badge" style={{ marginLeft: '0.5rem', background: 'var(--gold)', color: 'var(--bg-darkest)' }}>
                        ✓ Đã chọn
                    </span>
                )}
            </div>
            <div className="category-nominees">
                {nominees.length > 0 ? (
                    nominees.map(nominee => (
                        <NomineeCard
                            key={nominee.id}
                            nominee={nominee}
                            categoryId={category.id}
                        />
                    ))
                ) : (
                    <div className="empty-state">
                        <p>Chưa có ứng viên nào</p>
                    </div>
                )}
            </div>
        </div>
    )
}
