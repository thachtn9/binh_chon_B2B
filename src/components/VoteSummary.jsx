import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useVote } from '../context/VoteContext'
import { useAuth } from '../context/AuthContext'
import { formatCurrency } from '../lib/supabase'
import SuccessModal from './SuccessModal'

export default function VoteSummary() {
    const {
        selectedCount,
        submitVotes,
        clearAllSelections,
        VOTE_COST,
        TOTAL_CATEGORIES,
        totalSelectedAmount,
        totalSelectedAmountFormatted
    } = useVote()
    const { user, voteUser, canVote } = useAuth()
    const navigate = useNavigate()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState(null)
    const [showSuccessModal, setShowSuccessModal] = useState(false)
    // Lưu giá trị trước khi submit (vì selections bị reset sau khi submit)
    const [submittedData, setSubmittedData] = useState({ count: 0, amount: '' })

    if (selectedCount === 0 && !showSuccessModal) {
        return null
    }

    const handleSubmit = async () => {
        if (!user) {
            setError('Vui lòng đăng nhập để dự đoán')
            return
        }

        if (selectedCount === 0) {
            setError('Vui lòng chọn ít nhất một hạng mục')
            return
        }

        // Lưu giá trị trước khi submit
        const dataToSave = {
            count: selectedCount,
            amount: totalSelectedAmountFormatted
        }

        setIsSubmitting(true)
        setError(null)

        try {
            await submitVotes(user, voteUser, canVote)
            setSubmittedData(dataToSave)
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
                        </span>
                        <span className="vote-summary-amount">
                            {totalSelectedAmountFormatted}
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.25rem' }}>
                                ({selectedCount} × {formatCurrency(VOTE_COST)})
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
                        className={`btn ${selectedCount > 0 ? 'btn-gold' : 'btn-secondary'}`}
                        disabled={isSubmitting || selectedCount === 0}
                        title={selectedCount === 0 ? 'Vui lòng chọn ít nhất 1 hạng mục' : `Xác nhận dự đoán ${selectedCount} hạng mục`}
                    >
                        {isSubmitting ? 'Đang xử lý...' : selectedCount > 0 ? `✓ Xác nhận (${totalSelectedAmountFormatted})` : 'Chọn hạng mục'}
                    </button>
                </div>
            )}

            <SuccessModal
                isOpen={showSuccessModal}
                onClose={() => setShowSuccessModal(false)}
                amount={submittedData.amount}
                categoryCount={submittedData.count}
            />
        </>
    )
}
