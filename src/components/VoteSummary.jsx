import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useVote } from "../context/VoteContext";
import { useAuth } from "../context/AuthContext";
import SuccessModal from "./SuccessModal";

export default function VoteSummary() {
  const { selectedCount, submitVotes, clearAllSelections, TOTAL_CATEGORIES } = useVote();
  const { user, voteUser, canVote } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  // Lưu giá trị trước khi submit (vì selections bị reset sau khi submit)
  const [submittedData, setSubmittedData] = useState({ count: 0 });

  if (selectedCount === 0 && !showSuccessModal) {
    return null;
  }

  const handleSubmit = async () => {
    if (!user) {
      setError("Vui lòng đăng nhập để dự đoán");
      return;
    }

    if (selectedCount === 0) {
      setError("Vui lòng chọn ít nhất một hạng mục");
      return;
    }

    // Lưu giá trị trước khi submit
    const dataToSave = {
      count: selectedCount,
    };

    setIsSubmitting(true);
    setError(null);

    try {
      await submitVotes(user, voteUser, canVote);

      // Phát âm thanh khi xác nhận thành công
      const audio = new Audio("/sound/check.mp3");
      audio.volume = 0.4;
      audio.play().catch((err) => console.log("Audio play failed:", err));

      setSubmittedData(dataToSave);
      setShowSuccessModal(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClear = () => {
    clearAllSelections();
  };

  return (
    <>
      {selectedCount > 0 && (
        <div className="vote-summary">
          <div className="vote-summary-info">
            <span className="vote-summary-count">
              🗳️ {selectedCount}/{TOTAL_CATEGORIES} hạng mục đã chọn
            </span>
          </div>

          {error && <span style={{ color: "var(--secondary)", fontSize: "0.875rem", maxWidth: "300px" }}>⚠️ {error}</span>}

          <button onClick={handleClear} className="btn btn-secondary btn-sm">
            Xóa tất cả
          </button>

          <button onClick={handleSubmit} className={`btn ${selectedCount > 0 ? "btn-gold" : "btn-secondary"}`} disabled={isSubmitting || selectedCount === 0} title={selectedCount === 0 ? "Vui lòng chọn ít nhất 1 hạng mục" : `Xác nhận dự đoán ${selectedCount} hạng mục`}>
            {isSubmitting ? "Đang xử lý..." : selectedCount > 0 ? `✓ Xác nhận (${selectedCount} hạng mục)` : "Chọn hạng mục"}
          </button>
        </div>
      )}

      <SuccessModal isOpen={showSuccessModal} onClose={() => setShowSuccessModal(false)} categoryCount={submittedData.count} />
    </>
  );
}
