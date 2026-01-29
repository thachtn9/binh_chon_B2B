import { useState, useEffect } from "react";
import { useVote } from "../context/VoteContext";
import { useAuth } from "../context/AuthContext";

export default function NomineeCard({ nominee, categoryId, categoryName, showVotes = false, onSelect }) {
  const { selections, isVotingOpen, getUserVoteCountForNominee } = useVote();
  const { canVote, user } = useAuth();
  
  // Get selection data for this category
  const selection = selections[categoryId];
  const isSelected = selection?.nomineeId === nominee.id;
  
  const [showParticles, setShowParticles] = useState(false);
  const [justSelected, setJustSelected] = useState(false);

  // Đếm số lần user đã vote cho nominee này trong category này
  const myVoteCount = getUserVoteCountForNominee(categoryId, nominee.id);

  // Kiểm tra xem nominee có phải là chính mình không
  const isCurrentUser = user?.email?.toLowerCase() === nominee.email?.toLowerCase();

  // Chỉ cho phép click nếu đã đăng nhập, có quyền bình chọn và voting đang mở
  const canClickToVote = user && canVote && isVotingOpen;

  // Track when selection changes to trigger animation
  useEffect(() => {
    if (isSelected) {
      setJustSelected(true);
      setShowParticles(true);
      const timer = setTimeout(() => {
        setJustSelected(false);
        setShowParticles(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isSelected]);

  const handleClick = () => {
    if (!canClickToVote) return;

    // Chỉ phát âm thanh khi chọn mới (chưa được chọn trước đó)
    if (!isSelected) {
      const audio = new Audio("/sound/check.mp3");
      audio.volume = 0.4; // Điều chỉnh âm lượng (0.0 - 1.0)
      audio.play().catch((err) => console.log("Audio play failed:", err));
    }

    // Gọi callback để mở modal
    if (onSelect) {
      onSelect(nominee, categoryId, categoryName);
    }
  };

  // Lấy chữ cái cuối cùng của tên (VD: "Nguyễn Văn Bình" -> "B")
  const getInitial = (name) => {
    if (!name) return "?";
    const parts = name.trim().split(" ");
    const lastName = parts[parts.length - 1]; // Lấy từ cuối cùng
    return lastName.charAt(0).toUpperCase();
  };

  // Kiểm tra xem có avatar hợp lệ không
  const hasValidAvatar = nominee.url_avatar && nominee.url_avatar.trim() !== "" && !nominee.url_avatar.includes("undefined");

  // Hiển thị tên (ưu tiên full_name, sau đó user_name)
  const displayName = nominee.full_name || nominee.user_name || "Unknown";

  // Initial cho avatar placeholder
  const initial = getInitial(displayName);

  // Màu ngẫu nhiên cho avatar placeholder dựa trên tên
  const getAvatarColor = (name) => {
    const colors = [
      "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
      "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
      "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
      "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
      "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)",
      "linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)",
      "linear-gradient(135deg, #667eea 0%, #f093fb 100%)",
    ];
    const index = name ? name.charCodeAt(0) % colors.length : 0;
    return colors[index];
  };

  // Generate random particles
  const particles = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    x: Math.random() * 100 - 50,
    y: Math.random() * 100 - 50,
    size: Math.random() * 8 + 4,
    color: ["#fbbf24", "#f59e0b", "#6366f1", "#8b5cf6", "#ec4899"][Math.floor(Math.random() * 5)],
    delay: Math.random() * 0.3,
  }));

  return (
    <div
      className={`nominee-card ${isSelected ? "selected" : ""} ${!canClickToVote ? "disabled" : ""} ${justSelected ? "just-selected" : ""} ${isCurrentUser ? "is-me" : ""}`}
      onClick={handleClick}
      style={{
        cursor: canClickToVote ? "pointer" : "not-allowed",
        opacity: canClickToVote ? 1 : 0.6,
      }}
    >
      {/* Particle effect on selection */}
      {showParticles && (
        <div className="selection-particles">
          {particles.map((p) => (
            <span
              key={p.id}
              className="particle"
              style={{
                "--x": `${p.x}px`,
                "--y": `${p.y}px`,
                "--size": `${p.size}px`,
                "--color": p.color,
                "--delay": `${p.delay}s`,
              }}
            />
          ))}
        </div>
      )}

      {hasValidAvatar ? (
        <img
          src={nominee.url_avatar}
          alt={displayName}
          className="nominee-avatar"
          onError={(e) => {
            // Nếu load ảnh lỗi, ẩn img và hiện placeholder
            e.target.style.display = "none";
            e.target.nextSibling.style.display = "flex";
          }}
        />
      ) : null}
      <div
        className="nominee-avatar-placeholder"
        style={{
          background: getAvatarColor(displayName),
          display: hasValidAvatar ? "none" : "flex",
        }}
      >
        {initial}
      </div>
      <div className="nominee-info">
        <div className="nominee-name">{displayName}</div>
        <div className="nominee-role">
          {nominee.user_name} - {nominee.role}
        </div>
        {nominee.description && <div className="nominee-description">{nominee.description}</div>}
      </div>
      {showVotes && (
        <div className="nominee-votes">
          <div className="nominee-vote-count">{nominee.vote_count || 0}</div>
          <div className="nominee-vote-label">votes</div>
        </div>
      )}
      
      {/* Show predicted count badge when selected */}
      {isSelected && selection?.predictedCount > 0 && (
        <div className="predicted-count-badge-card">
          👥 {selection.predictedCount}
        </div>
      )}
      
      <div className={`check-icon ${isSelected ? "is-selected" : ""} ${myVoteCount > 0 ? "has-vote-count" : ""}`} title={myVoteCount > 0 ? `Bạn đã dự đoán ${myVoteCount} lần cho đề cử này` : ""}>
        {isSelected ? (myVoteCount > 0 ? myVoteCount + 1 : "✓") : myVoteCount > 0 ? myVoteCount : ""}
      </div>
    </div>
  );
}
