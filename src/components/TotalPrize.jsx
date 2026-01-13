import { useVote } from '../context/VoteContext'
import { formatCurrency } from '../lib/supabase'

export default function TotalPrize() {
    const { totalPrizeWithDonate } = useVote()

    return (
        <div className="total-prize">
            <span className="total-prize-label">Tổng Giá Trị Giải Thưởng</span>
            <span className="total-prize-value">{formatCurrency(totalPrizeWithDonate)}</span>
        </div>
    )
}
