import { useVote } from "../context/VoteContext";

export default function VoteSummary() {
  const { totalCompletedCount, TOTAL_CATEGORIES } = useVote();

  // Không hiển thị nếu chưa có dự đoán nào
  if (totalCompletedCount === 0) {
    return null;
  }

  return (
    <div className="vote-summary">
      <div className="vote-summary-info">
        <span className="vote-summary-count">
          ✅ {totalCompletedCount}/{TOTAL_CATEGORIES} hạng mục đã dự đoán
        </span>
      </div>
    </div>
  );
}
