import { useVote } from '../context/VoteContext'
import { formatCurrency } from '../lib/supabase'

export default function TotalPrize() {
    const { totalPrize, totalVotes } = useVote()

    return (
        <div className="total-prize">
            <span className="total-prize-label">Tổng Giá Trị Giải Thưởng</span>
            <span className="total-prize-value">{formatCurrency(totalPrize)}</span>
            <span className="total-prize-votes">{totalVotes.toLocaleString('vi-VN')} phiếu bầu</span>
        </div>
    )
}
