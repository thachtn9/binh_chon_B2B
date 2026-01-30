import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

export default function SuccessModal({ isOpen, onClose, categoryCount = 0 }) {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else {
      const timer = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isVisible && !isOpen) return null;

  return (
    <div className={`modal-overlay ${isOpen ? "open" : ""}`}>
      <div className={`modal-content ${isOpen ? "open" : ""}`}>
        <div className="modal-icon">🎉</div>
        <h2 className="modal-title">Dự đoán thành công!</h2>
        <p className="modal-message">
          Bạn đã dự đoán <span className="highlight">{categoryCount} hạng mục</span>.
        </p>
        <p className="modal-tip">
          💡 <strong>Tip:</strong> Bạn có thể thay đổi dự đoán bất kỳ lúc nào trước khi kết thúc!
        </p>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>
            Tiếp tục dự đoán
          </button>
          <button className="btn btn-primary" onClick={() => navigate("/history")}>
            Xem lịch sử
          </button>
        </div>
      </div>

      <style>{`
                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.8);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 9999;
                    opacity: 0;
                    transition: opacity 0.3s ease;
                    backdrop-filter: blur(4px);
                }
                .modal-overlay.open {
                    opacity: 1;
                }

                .modal-content {
                    background: #1a1a1a;
                    border: 1px solid rgba(255, 215, 0, 0.3);
                    border-radius: 1rem;
                    padding: 2rem;
                    max-width: 400px;
                    width: 90%;
                    text-align: center;
                    transform: scale(0.9);
                    transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    box-shadow: 0 0 50px rgba(255, 215, 0, 0.1);
                }
                .modal-content.open {
                    transform: scale(1);
                }

                .modal-icon {
                    font-size: 4rem;
                    margin-bottom: 1rem;
                    animation: bounce 1s infinite alternate;
                }

                .modal-title {
                    color: #fff;
                    margin-bottom: 0.5rem;
                    font-size: 1.5rem;
                    font-weight: bold;
                }

                .modal-message {
                    color: #aaa;
                    margin-bottom: 2rem;
                    line-height: 1.5;
                }

                .highlight {
                    color: #FCD34D;
                    font-weight: bold;
                    font-size: 1.1em;
                }

                .modal-tip {
                    background: rgba(255, 215, 0, 0.1);
                    border: 1px solid rgba(255, 215, 0, 0.2);
                    border-radius: 0.5rem;
                    padding: 0.75rem 1rem;
                    color: #aaa;
                    font-size: 0.875rem;
                    margin-bottom: 1.5rem;
                    line-height: 1.4;
                }

                .modal-actions {
                    display: flex;
                    gap: 1rem;
                    justify-content: center;
                }

                @keyframes bounce {
                    from { transform: translateY(0); }
                    to { transform: translateY(-10px); }
                }
            `}</style>
    </div>
  );
}
