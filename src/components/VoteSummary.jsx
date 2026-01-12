import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useVote } from '../context/VoteContext'
import { useAuth } from '../context/AuthContext'
import { formatCurrency } from '../lib/supabase'
import SuccessModal from './SuccessModal'

export default function VoteSummary() {
    const {
        selectedCount,
        isAllSelected,
        remainingCount,
        remainingItems,
        submitVotes,
        clearAllSelections,
        VOTE_COST,
        TOTAL_CATEGORIES
    } = useVote()
    const { user, voteUser, canVote } = useAuth()
    const navigate = useNavigate()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState(null)
    const [showSuccessModal, setShowSuccessModal] = useState(false)

    if (selectedCount === 0 && !showSuccessModal) {
        return null
    }

    const handleSubmit = async () => {
        if (!user) {
            setError('Vui lòng đăng nhập để dự đoán')
            return
        }

        if (!isAllSelected) {
            const names = remainingItems.slice(0, 3).map(c => c.name).join(', ')
            const more = remainingItems.length > 3 ? ` và ${remainingItems.length - 3} hạng mục khác` : ''
            setError(`Còn ${remainingCount} hạng mục: ${names}${more}`)
            return
        }

        setIsSubmitting(true)
        setError(null)

        try {
            await submitVotes(user, voteUser, canVote)
            setShowSuccessModal(true)
            // Remove immediate navigation
        } catch (err) {
            setError(err.message)
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleClear = () => {
        clearAllSelections()
    }

    return (
        <>
            {selectedCount > 0 && (
                <div className="vote-summary">
                    <div className="vote-summary-info">
                        <span className="vote-summary-count">
                            {selectedCount}/{TOTAL_CATEGORIES} hạng mục
                            {!isAllSelected && (
                                <span style={{ color: 'var(--secondary)', marginLeft: '0.5rem' }}>
                                    (còn {remainingCount})
                                </span>
                            )}
                        </span>
                        <span className="vote-summary-amount">
                            {formatCurrency(VOTE_COST)}
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.25rem' }}>
                                /lần dự đoán
                            </span>
                        </span>
                    </div>

                    {error && (
                        <span style={{ color: 'var(--secondary)', fontSize: '0.875rem', maxWidth: '300px' }}>
                            ⚠️ {error}
                        </span>
                    )}

                    <button
                        onClick={handleClear}
                        className="btn btn-secondary btn-sm"
                    >
                        Xóa tất cả
                    </button>

                    <button
                        onClick={handleSubmit}
                        className={`btn ${isAllSelected ? 'btn-gold' : 'btn-secondary'}`}
                        disabled={isSubmitting || !isAllSelected}
                        title={!isAllSelected ? `Còn ${remainingCount} hạng mục chưa chọn` : 'Xác nhận dự đoán'}
                    >
                        {isSubmitting ? 'Đang xử lý...' : isAllSelected ? '✓ Xác nhận dự đoán' : `Còn ${remainingCount} hạng mục`}
                    </button>
                </div>
            )}

            <SuccessModal
                isOpen={showSuccessModal}
                onClose={() => setShowSuccessModal(false)}
                amount={formatCurrency(VOTE_COST)}
            />
        </>
    )
}
