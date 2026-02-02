import { useState, useEffect, useRef } from "react";
import { getCategoryWinners, saveCategoryWinner, deleteCategoryWinner, uploadImageToImgBB, formatDate } from "../lib/supabase";
import { categories } from "../config/votingConfig";
import "./HonoreeManager.css";

// Full HD dimensions
const MAX_WIDTH = 1920;
const MAX_HEIGHT = 1080;
const JPEG_QUALITY = 0.94;

/**
 * Nén ảnh về Full HD (1920x1080 hoặc 1080x1920 tùy orientation)
 * @param {File} file - File ảnh gốc
 * @returns {Promise<File>} - File ảnh đã nén
 */
async function compressImageToFullHD(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    img.onload = () => {
      let { width, height } = img;

      // Determine if image is landscape or portrait
      const isLandscape = width >= height;

      // Calculate new dimensions while maintaining aspect ratio
      if (isLandscape) {
        // Landscape: max width = 1920
        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }
        // Also check height doesn't exceed 1080
        if (height > MAX_HEIGHT) {
          width = Math.round((width * MAX_HEIGHT) / height);
          height = MAX_HEIGHT;
        }
      } else {
        // Portrait: max height = 1920, max width = 1080
        if (height > MAX_WIDTH) {
          width = Math.round((width * MAX_WIDTH) / height);
          height = MAX_WIDTH;
        }
        if (width > MAX_HEIGHT) {
          height = Math.round((height * MAX_HEIGHT) / width);
          width = MAX_HEIGHT;
        }
      }

      // Set canvas dimensions
      canvas.width = width;
      canvas.height = height;

      // Draw image on canvas with smoothing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            // Create new file with same name but compressed
            const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), { type: "image/jpeg" });
            console.log(`Image compressed: ${(file.size / 1024 / 1024).toFixed(2)}MB -> ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB (${width}x${height})`);
            resolve(compressedFile);
          } else {
            reject(new Error("Failed to compress image"));
          }
        },
        "image/jpeg",
        JPEG_QUALITY
      );
    };

    img.onerror = () => {
      reject(new Error("Failed to load image"));
    };

    // Read file as data URL
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target.result;
    };
    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };
    reader.readAsDataURL(file);
  });
}

/**
 * HonoreeManager Component
 * Quản lý người được vinh danh ở mỗi hạng mục
 * - Chọn người được vinh danh
 * - Upload ảnh nhận thưởng (tự động nén về Full HD)
 * - Lưu vào database
 */
export default function HonoreeManager({ allNominees, currentUser }) {
  const [winners, setWinners] = useState({}); // { category_id: winner_data }
  const [editingCategory, setEditingCategory] = useState(null);
  const [selectedNominee, setSelectedNominee] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [imgbbApiKey, setImgbbApiKey] = useState(localStorage.getItem("imgbb_api_key") || "261c6045a97e96ea5289f5f2446971ab");
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const fileInputRef = useRef(null);

  // Get all selection categories (including sub-categories)
  const getAllSelectionCategories = () => {
    const selections = [];
    categories.forEach((cat) => {
      if (cat.sub_categories) {
        cat.sub_categories.forEach((sub) => {
          selections.push({
            id: sub.id,
            name: `${cat.name} - ${sub.label}`,
            icon: cat.icon,
            role_filter: [sub.role],
            parent: cat,
          });
        });
      } else {
        selections.push({
          id: cat.id,
          name: cat.name,
          icon: cat.icon,
          role_filter: cat.role_filter,
        });
      }
    });
    return selections;
  };

  // Load saved winners on mount
  useEffect(() => {
    loadWinners();
  }, []);

  const loadWinners = async () => {
    setIsLoading(true);
    try {
      const data = await getCategoryWinners();
      const winnersMap = {};
      data.forEach((w) => {
        winnersMap[w.category_id] = w;
      });
      setWinners(winnersMap);
    } catch (error) {
      console.error("Error loading winners:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Open edit modal for a category
  const handleEditCategory = (categoryId) => {
    const existingWinner = winners[categoryId];
    setEditingCategory(categoryId);
    setSelectedNominee(existingWinner?.winner_id || null);
    setPhotoPreview(existingWinner?.award_photo_url || null);
    setNotes(existingWinner?.notes || "");
    setPhotoFile(null);
  };

  // Close edit modal
  const handleCloseModal = () => {
    setEditingCategory(null);
    setSelectedNominee(null);
    setPhotoFile(null);
    setPhotoPreview(null);
    setNotes("");
  };

  // Handle photo selection - compress to Full HD
  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
    if (!file.type.startsWith("image/")) {
      alert("Vui lòng chọn file ảnh!");
      return;
    }

    // Allow larger files since we'll compress them (max 50MB for raw iPhone photos)
    if (file.size > 50 * 1024 * 1024) {
      alert("Ảnh quá lớn! Vui lòng chọn ảnh nhỏ hơn 50MB.");
      return;
    }

    setIsCompressing(true);
    try {
      // Compress image to Full HD
      const compressedFile = await compressImageToFullHD(file);
      setPhotoFile(compressedFile);

      // Create preview from compressed file
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(compressedFile);
    } catch (error) {
      console.error("Error compressing image:", error);
      alert("Lỗi nén ảnh: " + error.message);
    } finally {
      setIsCompressing(false);
    }
  };

  // Save winner
  const handleSaveWinner = async () => {
    if (!selectedNominee) {
      alert("Vui lòng chọn người được vinh danh!");
      return;
    }

    if (!editingCategory) return;

    setIsSaving(true);
    try {
      let photoUrl = winners[editingCategory]?.award_photo_url || null;

      // Upload new photo if selected
      if (photoFile) {
        if (!imgbbApiKey) {
          alert("Cần API key ImgBB để upload ảnh. Vui lòng nhập API key hoặc lấy miễn phí tại https://api.imgbb.com/");
          setShowApiKeyInput(true);
          setIsSaving(false);
          return;
        }

        setIsUploading(true);
        try {
          photoUrl = await uploadImageToImgBB(photoFile, imgbbApiKey);
        } catch (uploadError) {
          alert("Lỗi upload ảnh: " + uploadError.message);
          setIsSaving(false);
          setIsUploading(false);
          return;
        }
        setIsUploading(false);
      }

      // Get category name
      const category = getAllSelectionCategories().find((c) => c.id === editingCategory);

      // Save to database
      const result = await saveCategoryWinner(
        {
          category_id: editingCategory,
          category_name: category?.name || editingCategory,
          winner_id: selectedNominee,
          award_photo_url: photoUrl,
          notes: notes,
        },
        currentUser?.id
      );

      // Update local state
      setWinners((prev) => ({
        ...prev,
        [editingCategory]: result,
      }));

      handleCloseModal();
      alert("Lưu thành công!");
    } catch (error) {
      console.error("Error saving winner:", error);
      alert("Có lỗi xảy ra: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete winner
  const handleDeleteWinner = async (categoryId) => {
    if (!confirm("Bạn có chắc muốn xóa người được vinh danh này?")) return;

    try {
      await deleteCategoryWinner(categoryId);
      setWinners((prev) => {
        const newWinners = { ...prev };
        delete newWinners[categoryId];
        return newWinners;
      });
      alert("Đã xóa!");
    } catch (error) {
      console.error("Error deleting winner:", error);
      alert("Có lỗi xảy ra: " + error.message);
    }
  };

  // Save ImgBB API key
  const handleSaveApiKey = () => {
    localStorage.setItem("imgbb_api_key", imgbbApiKey);
    setShowApiKeyInput(false);
    alert("Đã lưu API key!");
  };

  // Get nominee info
  const getNomineeInfo = (nomineeId) => {
    return allNominees?.find((n) => n.id === nomineeId);
  };

  // Get category info
  const getCategoryInfo = (categoryId) => {
    return getAllSelectionCategories().find((c) => c.id === categoryId);
  };

  if (isLoading) {
    return (
      <div className="honoree-loading">
        <div className="spinner"></div>
        <p>Đang tải dữ liệu...</p>
      </div>
    );
  }

  const selectionCategories = getAllSelectionCategories();
  const savedCount = Object.keys(winners).length;
  const totalCategories = selectionCategories.length;

  return (
    <div className="honoree-manager">
      {/* Header */}
      <div className="honoree-header">
        <h3>
          <span className="icon">🏆</span>
          Vinh Danh Người Chiến Thắng
        </h3>
        <p className="subtitle">Chọn người được vinh danh cho mỗi hạng mục và upload ảnh nhận thưởng</p>
        <div className="progress-info">
          <span className="progress-text">
            Đã xác định: <strong>{savedCount}</strong> / {totalCategories} hạng mục
          </span>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${(savedCount / totalCategories) * 100}%` }} />
          </div>
        </div>
      </div>

      {/* API Key Setting */}
      <div className="api-key-section">
        <button className="btn btn-sm btn-secondary" onClick={() => setShowApiKeyInput(!showApiKeyInput)}>
          ⚙️ Cài đặt ImgBB API Key
        </button>
        {showApiKeyInput && (
          <div className="api-key-input-wrapper">
            <input type="text" placeholder="Nhập ImgBB API key..." value={imgbbApiKey} onChange={(e) => setImgbbApiKey(e.target.value)} className="api-key-input" />
            <button className="btn btn-sm btn-primary" onClick={handleSaveApiKey}>
              Lưu
            </button>
            <a href="https://api.imgbb.com/" target="_blank" rel="noopener noreferrer" className="api-link">
              Lấy API key miễn phí
            </a>
          </div>
        )}
      </div>

      {/* Categories Grid */}
      <div className="honoree-grid">
        {selectionCategories.map((category) => {
          const winner = winners[category.id];
          const nomineeInfo = winner ? getNomineeInfo(winner.winner_id) : null;

          return (
            <div key={category.id} className={`honoree-card ${winner ? "has-winner" : ""}`}>
              <div className="card-header">
                <span className="category-icon">{category.icon}</span>
                <span className="category-name">{category.name}</span>
                {winner && <span className="check-mark">✓</span>}
              </div>

              {winner ? (
                <div className="winner-content">
                  {/* Winner Photo */}
                  {winner.award_photo_url && (
                    <div className="winner-photo">
                      <img src={winner.award_photo_url} alt="Ảnh nhận thưởng" onClick={() => window.open(winner.award_photo_url, "_blank")} />
                    </div>
                  )}

                  {/* Winner Info */}
                  <div className="winner-info">
                    <div className="winner-avatar">{nomineeInfo?.url_avatar ? <img src={nomineeInfo.url_avatar} alt="" /> : <div className="avatar-placeholder">{nomineeInfo?.full_name?.[0] || nomineeInfo?.user_name?.[0] || "?"}</div>}</div>
                    <div className="winner-details">
                      <div className="winner-name">{nomineeInfo?.full_name || nomineeInfo?.user_name || "N/A"}</div>
                      <div className="winner-role">{nomineeInfo?.role}</div>
                    </div>
                  </div>

                  {/* Notes */}
                  {winner.notes && <div className="winner-notes">{winner.notes}</div>}

                  {/* Confirmed info */}
                  {winner.confirmed_at && <div className="confirmed-info">Xác nhận: {formatDate(winner.confirmed_at)}</div>}

                  {/* Actions */}
                  <div className="card-actions">
                    <button className="btn btn-sm btn-secondary" onClick={() => handleEditCategory(category.id)}>
                      ✏️ Sửa
                    </button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDeleteWinner(category.id)}>
                      🗑️ Xóa
                    </button>
                  </div>
                </div>
              ) : (
                <div className="no-winner">
                  <div className="no-winner-icon">❓</div>
                  <p>Chưa xác định người được vinh danh</p>
                  <button className="btn btn-primary" onClick={() => handleEditCategory(category.id)}>
                    + Chọn người vinh danh
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Edit Modal */}
      {editingCategory && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content honoree-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {getCategoryInfo(editingCategory)?.icon} {getCategoryInfo(editingCategory)?.name}
              </h3>
              <button className="close-btn" onClick={handleCloseModal}>
                ✕
              </button>
            </div>

            <div className="modal-body">
              {/* Nominee Selection */}
              <div className="form-group">
                <label>Chọn người được vinh danh *</label>
                <select value={selectedNominee || ""} onChange={(e) => setSelectedNominee(e.target.value)} className="form-select">
                  <option value="">-- Chọn người được vinh danh --</option>
                  {allNominees
                    ?.filter((n) => getCategoryInfo(editingCategory)?.role_filter.includes(n.role))
                    .map((nominee) => (
                      <option key={nominee.id} value={nominee.id}>
                        {nominee.full_name || nominee.user_name} ({nominee.role})
                      </option>
                    ))}
                </select>
              </div>

              {/* Photo Upload */}
              <div className="form-group">
                <label>Ảnh nhận thưởng</label>
                <div className="photo-upload-section">
                  {photoPreview && (
                    <div className="photo-preview">
                      <img src={photoPreview} alt="Preview" />
                      <button
                        className="remove-photo-btn"
                        onClick={() => {
                          setPhotoFile(null);
                          setPhotoPreview(null);
                          if (fileInputRef.current) {
                            fileInputRef.current.value = "";
                          }
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  )}
                  <div className="upload-controls">
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: "none" }} disabled={isCompressing} />
                    <button className="btn btn-secondary upload-btn" onClick={() => fileInputRef.current?.click()} disabled={isCompressing}>
                      {isCompressing ? "⏳ Đang nén..." : `📷 ${photoPreview ? "Đổi ảnh" : "Chọn ảnh"}`}
                    </button>
                    <span className="upload-hint">{isCompressing ? "Đang nén ảnh về Full HD..." : "Tự động nén về Full HD (1920x1080)"}</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="form-group">
                <label>Ghi chú</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Nhập ghi chú (tùy chọn)..." rows={3} className="form-textarea" />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={handleCloseModal} disabled={isCompressing}>
                Hủy
              </button>
              <button className="btn btn-primary" onClick={handleSaveWinner} disabled={isSaving || isCompressing || !selectedNominee}>
                {isCompressing ? "⏳ Đang nén ảnh..." : isSaving ? (isUploading ? "⏳ Đang upload ảnh..." : "⏳ Đang lưu...") : "💾 Lưu"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
