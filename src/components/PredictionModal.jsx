import { useState, useEffect, useRef } from "react";

// Inner component để xử lý state riêng
function PredictionModalContent({
  onClose,
  nominee,
  categoryName,
  onConfirm,
  existingSelection = null, // Thêm prop để biết đã chọn trước đó chưa
}) {
  const inputRef = useRef(null);
  const [showReplaceWarning, setShowReplaceWarning] = useState(!!existingSelection);
  const [predictedCount, setPredictedCount] = useState(existingSelection?.predictedCount || 1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Focus vào input khi mount
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Đóng modal khi nhấn Escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const handleConfirm = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onConfirm(predictedCount);
      onClose();
    } catch (error) {
      console.error("Error confirming prediction:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleConfirm();
    }
  };

  const handleInputChange = (e) => {
    const value = parseInt(e.target.value) || 1;
    setPredictedCount(Math.min(999, Math.max(1, value)));
  };

  // Lấy chữ cái đầu của tên
  const getInitial = (name) => {
    if (!name) return "?";
    const parts = name.trim().split(" ");
    const lastName = parts[parts.length - 1];
    return lastName.charAt(0).toUpperCase();
  };

  const displayName = nominee.full_name || nominee.user_name || "Unknown";
  const hasValidAvatar = nominee.url_avatar && nominee.url_avatar.trim() !== "" && !nominee.url_avatar.includes("undefined");

  // Màu avatar
  const getAvatarColor = (name) => {
    const colors = ["linear-gradient(135deg, #667eea 0%, #764ba2 100%)", "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)", "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)", "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)", "linear-gradient(135deg, #fa709a 0%, #fee140 100%)"];
    const index = name ? name.charCodeAt(0) % colors.length : 0;
    return colors[index];
  };

  return (
    <div className="prediction-modal-overlay" onClick={onClose}>
      <div className="prediction-modal" onClick={(e) => e.stopPropagation()}>
        <button className="prediction-modal-close" onClick={onClose}>
          ✕
        </button>

        <div className="prediction-modal-header">
          <span className="prediction-modal-icon">🎯</span>
          <h3>Xác nhận dự đoán</h3>
        </div>

        <div className="prediction-modal-category">{categoryName}</div>

        {/* Warning if replacing existing selection */}
        {showReplaceWarning && existingSelection && (
          <div className="prediction-modal-warning">
            <span className="warning-icon">⚠️</span>
            <div className="warning-content">
              <strong>Bạn đã chọn: {existingSelection.nomineeName}</strong>
              <p>Dự đoán mới sẽ thay thế lựa chọn trước đó trong hạng mục này.</p>
            </div>
          </div>
        )}

        {/* Nominee Info */}
        <div className="prediction-modal-nominee">
          {hasValidAvatar ? (
            <img
              src={nominee.url_avatar}
              alt={displayName}
              className="prediction-modal-avatar"
              onError={(e) => {
                e.target.style.display = "none";
                e.target.nextSibling.style.display = "flex";
              }}
            />
          ) : null}
          <div
            className="prediction-modal-avatar-placeholder"
            style={{
              background: getAvatarColor(displayName),
              display: hasValidAvatar ? "none" : "flex",
            }}
          >
            {getInitial(displayName)}
          </div>
          <div className="prediction-modal-nominee-info">
            <div className="prediction-modal-nominee-name">{displayName}</div>
            <div className="prediction-modal-nominee-role">{nominee.role}</div>
          </div>
          <span className="prediction-modal-check">✓</span>
        </div>

        {/* Prediction Input */}
        <div className="prediction-modal-input-section">
          <label className="prediction-modal-label">👥 Bạn nghĩ có bao nhiêu người sẽ chọn giống bạn?</label>
          <div className="prediction-modal-input-wrapper">
            <button className="prediction-count-btn" onClick={() => setPredictedCount(Math.max(1, predictedCount - 1))}>
              −
            </button>
            <input ref={inputRef} type="number" min="1" max="999" value={predictedCount} onChange={handleInputChange} onKeyDown={handleKeyDown} className="prediction-modal-input" placeholder="1" />
            <button className="prediction-count-btn" onClick={() => setPredictedCount(Math.min(999, predictedCount + 1))}>
              +
            </button>
          </div>
        </div>

        {/* Simple confirmation message */}
        <div className="prediction-modal-message">
          <p className="prediction-modal-hint">Mỗi hạng mục chỉ được chọn 1 người. Bạn có thể thay đổi bất kỳ lúc nào trước khi kết thúc dự đoán.</p>
        </div>
        {/* Actions */}
        <div className="prediction-modal-actions">
          <button className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
            Hủy
          </button>
          <button ref={inputRef} className="btn btn-gold" onClick={handleConfirm} onKeyDown={handleKeyDown} disabled={isSubmitting}>
            {isSubmitting ? "Đang xử lý..." : existingSelection ? "✓ Thay đổi lựa chọn" : "✓ Xác nhận"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Wrapper component - dùng key để reset state khi nominee thay đổi
export default function PredictionModal({ isOpen, nominee, existingSelection, ...props }) {
  if (!isOpen || !nominee) return null;

  // Sử dụng key để reset component khi nominee thay đổi
  return <PredictionModalContent key={nominee.id} nominee={nominee} existingSelection={existingSelection} {...props} />;
}
