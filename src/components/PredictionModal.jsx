import { useState, useEffect, useRef } from "react";

// Inner component để xử lý state riêng
function PredictionModalContent({ 
  onClose, 
  nominee, 
  categoryName,
  onConfirm,
  initialCount = 0 
}) {
  const [predictedCount, setPredictedCount] = useState(initialCount);
  const inputRef = useRef(null);

  // Focus vào input khi mount
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
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

  const handleConfirm = () => {
    onConfirm(predictedCount);
    onClose();
  };

  const handleInputChange = (e) => {
    const value = parseInt(e.target.value) || 0;
    setPredictedCount(Math.max(0, Math.min(999, value)));
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleConfirm();
    }
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
    const colors = [
      "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
      "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
      "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
      "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
    ];
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
          <h3>Dự đoán số người chọn giống bạn</h3>
        </div>

        <div className="prediction-modal-category">
          {categoryName}
        </div>

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
              display: hasValidAvatar ? "none" : "flex"
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
          <label className="prediction-modal-label">
            👥 Bạn nghĩ có bao nhiêu người sẽ chọn giống bạn?
          </label>
          <div className="prediction-modal-input-wrapper">
            <button 
              className="prediction-count-btn"
              onClick={() => setPredictedCount(Math.max(0, predictedCount - 1))}
            >
              −
            </button>
            <input
              ref={inputRef}
              type="number"
              min="0"
              max="999"
              value={predictedCount}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              className="prediction-modal-input"
              placeholder="0"
            />
            <button 
              className="prediction-count-btn"
              onClick={() => setPredictedCount(Math.min(999, predictedCount + 1))}
            >
              +
            </button>
          </div>
          <p className="prediction-modal-hint">
            Nhập số người bạn dự đoán sẽ chọn cùng đề cử này
          </p>
        </div>

        {/* Actions */}
        <div className="prediction-modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>
            Hủy
          </button>
          <button className="btn btn-gold" onClick={handleConfirm}>
            ✓ Xác nhận
          </button>
        </div>
      </div>
    </div>
  );
}

// Wrapper component - dùng key để reset state khi nominee thay đổi
export default function PredictionModal({ isOpen, nominee, ...props }) {
  if (!isOpen || !nominee) return null;
  
  // Sử dụng key để reset component khi nominee thay đổi
  return (
    <PredictionModalContent 
      key={nominee.id} 
      nominee={nominee} 
      {...props} 
    />
  );
}
