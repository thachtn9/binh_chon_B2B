import { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { useAuth } from "../context/AuthContext";
import { getAllVoteSessions, getVoterRankingReport, getAllUsersForAdmin, updateUserAdminStatus, updateUserProfile, formatCurrency, formatDate, findCorrectPredictionsByCategory, getNomineesForWinnerSelection, getNomineeStatistics, getSettings, updateSettings, fetchFPTChatParticipants, bulkUpdateUserAvatars } from "../lib/supabase";
import { categories } from "../config/votingConfig";
import { useNavigate } from "react-router-dom";

export default function AdminPage() {
  const { user, voteUser, loading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("votes"); // 'votes', 'users', 'admins', 'nominees', 'settings', or 'results'
  const [votesData, setVotesData] = useState([]);
  const [usersData, setUsersData] = useState([]);
  const [adminsData, setAdminsData] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState(null);

  // Nominee statistics tab states
  const [nomineeStats, setNomineeStats] = useState([]);

  // Settings tab states
  const [settings, setSettings] = useState(null);
  const [editedSettings, setEditedSettings] = useState(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Results tab states
  const [allNominees, setAllNominees] = useState([]);
  const [selectedWinners, setSelectedWinners] = useState({}); // { category_id: nominee_id }
  const [predictionResults, setPredictionResults] = useState({}); // { category_id: { category_name, voters: [...] } }
  const [topPredictors, setTopPredictors] = useState([]); // Overall top predictors
  const [isSearching, setIsSearching] = useState(false);

  // Edit user modal states
  const [editingUser, setEditingUser] = useState(null);
  const [editUserForm, setEditUserForm] = useState({
    full_name: "",
    user_name: "",
    url_avatar: "",
    description: ""
  });
  const [isSavingUser, setIsSavingUser] = useState(false);

  // Avatar bulk update modal states
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [avatarToken, setAvatarToken] = useState("");
  const [isUpdatingAvatars, setIsUpdatingAvatars] = useState(false);
  const [avatarUpdateResult, setAvatarUpdateResult] = useState(null);
  const [avatarProgress, setAvatarProgress] = useState({ current: 0, total: 0, currentUser: "", phase: "" });

  useEffect(() => {
    // Redirect if not admin
    if (!loading) {
      if (!user || !voteUser?.is_admin) {
        // navigate('/')
      } else {
        fetchData();
      }
    }
  }, [user, voteUser, loading, navigate]);

  const fetchData = async () => {
    setIsLoadingData(true);
    try {
      const [sessions, users, allUsers, nominees, stats, settingsData] = await Promise.all([getAllVoteSessions(), getVoterRankingReport(), getAllUsersForAdmin(), getNomineesForWinnerSelection(), getNomineeStatistics(), getSettings()]);
      setVotesData(sessions);
      setUsersData(users);
      setAdminsData(allUsers);
      setAllNominees(nominees);
      setNomineeStats(stats);
      setSettings(settingsData);
      setEditedSettings(settingsData);
    } catch (error) {
      console.error("Error fetching admin data:", error);
    } finally {
      setIsLoadingData(false);
    }
  };

  // Open edit user modal
  const handleOpenEditUser = (user) => {
    setEditingUser(user);
    setEditUserForm({
      full_name: user.full_name || "",
      user_name: user.user_name || "",
      url_avatar: user.url_avatar || "",
      description: user.description || ""
    });
  };

  // Close edit user modal
  const handleCloseEditUser = () => {
    setEditingUser(null);
    setEditUserForm({
      full_name: "",
      user_name: "",
      url_avatar: "",
      description: ""
    });
  };

  // Save user profile
  const handleSaveUserProfile = async () => {
    if (!editingUser) return;

    setIsSavingUser(true);
    try {
      await updateUserProfile(editingUser.id, editUserForm);
      // Refresh data
      const updatedUsers = await getAllUsersForAdmin();
      setAdminsData(updatedUsers);
      handleCloseEditUser();
      alert("Cập nhật thông tin user thành công!");
    } catch (error) {
      console.error("Error updating user profile:", error);
      alert("Có lỗi xảy ra khi cập nhật: " + error.message);
    } finally {
      setIsSavingUser(false);
    }
  };

  // Handle bulk update avatars from FPT Chat
  const handleBulkUpdateAvatars = async () => {
    if (!avatarToken.trim()) {
      alert("Vui lòng nhập FPT Chat Token!");
      return;
    }

    setIsUpdatingAvatars(true);
    setAvatarUpdateResult(null);
    setAvatarProgress({ current: 0, total: 0, currentUser: "", phase: "fetching" });

    try {
      // Fetch participants from FPT Chat API
      setAvatarProgress(prev => ({ ...prev, phase: "fetching", currentUser: "Đang lấy dữ liệu từ FPT Chat..." }));
      const participants = await fetchFPTChatParticipants(avatarToken);
      const withAvatar = participants.filter(p => p.avatarUrl && p.username);

      if (withAvatar.length === 0) {
        setAvatarUpdateResult({
          success: false,
          message: "Không tìm thấy participants có avatar từ FPT Chat API"
        });
        return;
      }

      // Bulk update avatars with progress callback
      setAvatarProgress({ current: 0, total: withAvatar.length, currentUser: "", phase: "updating" });

      const result = await bulkUpdateUserAvatars(participants, (progress) => {
        setAvatarProgress(prev => ({
          ...prev,
          current: progress.current,
          total: progress.total,
          currentUser: progress.currentUser
        }));
      });

      setAvatarProgress(prev => ({ ...prev, phase: "done" }));
      setAvatarUpdateResult({
        success: true,
        totalParticipants: participants.length,
        withAvatar: withAvatar.length,
        ...result
      });

      // Refresh admin data
      const updatedUsers = await getAllUsersForAdmin();
      setAdminsData(updatedUsers);

    } catch (error) {
      console.error("Error bulk updating avatars:", error);
      setAvatarUpdateResult({
        success: false,
        message: error.message
      });
    } finally {
      setIsUpdatingAvatars(false);
    }
  };

  // Close avatar modal
  const handleCloseAvatarModal = () => {
    setShowAvatarModal(false);
    setAvatarToken("");
    setAvatarUpdateResult(null);
  };

  const handleToggleAdmin = async (userId, currentStatus, userName) => {
    const action = currentStatus ? "xóa quyền admin của" : "cấp quyền admin cho";
    if (!window.confirm(`Bạn có chắc muốn ${action} "${userName}"?`)) {
      return;
    }

    setUpdatingUserId(userId);
    try {
      await updateUserAdminStatus(userId, !currentStatus);
      // Refresh data
      const updatedUsers = await getAllUsersForAdmin();
      setAdminsData(updatedUsers);
    } catch (error) {
      console.error("Error updating admin status:", error);
      alert("Có lỗi xảy ra khi cập nhật quyền admin: " + error.message);
    } finally {
      setUpdatingUserId(null);
    }
  };

  // Handle settings field change
  const handleSettingChange = (field, value) => {
    setEditedSettings((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Save settings
  const handleSaveSettings = async () => {
    if (!editedSettings) return;

    setIsSavingSettings(true);
    try {
      await updateSettings(editedSettings);
      setSettings(editedSettings);
      alert("Cập nhật cài đặt thành công!");
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("Có lỗi xảy ra khi lưu cài đặt: " + error.message);
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Reset settings to original
  const handleResetSettings = () => {
    setEditedSettings(settings);
  };

  // Check if settings have been modified
  const isSettingsModified = () => {
    if (!settings || !editedSettings) return false;
    return JSON.stringify(settings) !== JSON.stringify(editedSettings);
  };

  // Handle winner selection for a category
  const handleWinnerSelect = (categoryId, nomineeId) => {
    setSelectedWinners((prev) => ({
      ...prev,
      [categoryId]: nomineeId,
    }));
  };

  // Export to Excel
  const handleExportExcel = () => {
    // 1. Prepare Users Data
    const usersSheetData = usersData.map((user, index) => ({
      STT: index + 1,
      "Họ tên": user.voter_full_name || user.voter_name,
      Email: user.voter_email,
      "Tổng phiếu": user.total_votes,
      "Số lượt dự đoán": user.total_sessions,
      "Số hạng mục đã vote": user.categories_voted,
      "Thời gian vote cuối": user.last_vote_time ? new Date(user.last_vote_time).toLocaleString("vi-VN") : "",
      "Tổng chi (VND)": user.total_spent,
    }));

    // 2. Prepare Votes (Sessions) Data
    const votesSheetData = votesData.map((session, index) => {
      // Format votes details
      const votesDetail = session.votes?.map((v) => `${v.category_name}: ${v.nominee?.user_name} (${v.nominee?.role})`).join(";\n");

      return {
        STT: index + 1,
        "Thời gian": session.created_at ? new Date(session.created_at).toLocaleString("vi-VN") : "",
        "Người dự đoán": session.voter_name || "Anonymous",
        Email: session.voter_email,
        "Số hạng mục": session.total_categories,
        "Tổng tiền (VND)": session.total_amount,
        "Chi tiết dự đoán": votesDetail,
      };
    });

    // Create workbook and sheets
    const workbook = XLSX.utils.book_new();

    const usersWorksheet = XLSX.utils.json_to_sheet(usersSheetData);
    XLSX.utils.book_append_sheet(workbook, usersWorksheet, "Thống kê Người dùng");

    const votesWorksheet = XLSX.utils.json_to_sheet(votesSheetData);

    // Set column width
    const usersCols = [
      { wch: 5 }, // STT
      { wch: 20 }, // Mark
      { wch: 30 }, // Email
      { wch: 10 }, // Tong phieu
      { wch: 15 }, // So luot
      { wch: 20 }, // So hang muc
      { wch: 20 }, // Thoi gian
      { wch: 15 }, // Tong chi
    ];
    usersWorksheet["!cols"] = usersCols;

    const votesCols = [
      { wch: 5 }, // STT
      { wch: 20 }, // Thoi gian
      { wch: 20 }, // Nguoi du doan
      { wch: 30 }, // Email
      { wch: 15 }, // So hang muc
      { wch: 15 }, // Tong tien
      { wch: 80 }, // Chi tiet
    ];
    votesWorksheet["!cols"] = votesCols;

    XLSX.utils.book_append_sheet(workbook, votesWorksheet, "Chi tiết Phiên dự đoán");

    // Generate filename with timestamp
    const dateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `thong_ke_binh_chon_${dateStr}.xlsx`);
  };

  // Find correct predictions
  const handleFindPredictions = async () => {
    if (Object.keys(selectedWinners).length === 0) {
      alert("Vui lòng chọn ít nhất một người được vinh danh!");
      return;
    }

    setIsSearching(true);
    try {
      const results = await findCorrectPredictionsByCategory(selectedWinners);
      setPredictionResults(results);

      // Calculate top predictors overall
      calculateTopPredictors(results);
    } catch (error) {
      console.error("Error finding predictions:", error);
      alert("Có lỗi xảy ra: " + error.message);
    } finally {
      setIsSearching(false);
    }
  };

  // Calculate top predictors from category results
  // Ưu tiên: số hạng mục đúng > tổng độ chênh lệch nhỏ nhất > thời gian dự đoán sớm nhất
  const calculateTopPredictors = (categoryResults) => {
    const voterMap = new Map();

    // Aggregate data from all categories
    Object.values(categoryResults).forEach((catResult) => {
      catResult.voters.forEach((voter) => {
        const key = voter.voter_email || voter.voter_id;
        if (!voterMap.has(key)) {
          voterMap.set(key, {
            voter_id: voter.voter_id,
            voter_email: voter.voter_email,
            voter_name: voter.voter_name,
            voter_avatar: voter.voter_avatar,
            total_correct_categories: 0,
            total_prediction_diff: 0, // Tổng độ chênh lệch (càng nhỏ càng tốt)
            earliest_prediction_time: voter.first_prediction_time,
            categories_details: [],
          });
        }

        const voterData = voterMap.get(key);
        voterData.total_correct_categories += 1;
        voterData.total_prediction_diff += voter.prediction_diff || 0;
        
        // Cập nhật thời gian dự đoán sớm nhất
        if (voter.first_prediction_time < voterData.earliest_prediction_time) {
          voterData.earliest_prediction_time = voter.first_prediction_time;
        }
        
        voterData.categories_details.push({
          category_id: catResult.category_id,
          category_name: catResult.category_name,
          predicted_count: voter.predicted_count,
          actual_count: catResult.actual_correct_count,
          prediction_diff: voter.prediction_diff,
        });
      });
    });

    // Convert to array and sort
    const topList = Array.from(voterMap.values()).sort((a, b) => {
      // 1. Ưu tiên số hạng mục đúng nhiều hơn (descending)
      if (b.total_correct_categories !== a.total_correct_categories) {
        return b.total_correct_categories - a.total_correct_categories;
      }
      // 2. Nếu bằng nhau, ưu tiên tổng độ chênh lệch nhỏ hơn (ascending)
      if (a.total_prediction_diff !== b.total_prediction_diff) {
        return a.total_prediction_diff - b.total_prediction_diff;
      }
      // 3. Nếu vẫn bằng nhau, ưu tiên người dự đoán sớm hơn
      return new Date(a.earliest_prediction_time) - new Date(b.earliest_prediction_time);
    });

    setTopPredictors(topList);
  };

  // Get winner name for display
  const getWinnerName = (nomineeId) => {
    const nominee = allNominees.find((n) => n.id === nomineeId);
    return nominee ? nominee.full_name || nominee.user_name : "Chưa chọn";
  };

  // Get category display name with icon from config
  const getCategoryDisplayName = (categoryId) => {
    // First, check if it's a sub-category
    for (const cat of categories) {
      if (cat.sub_categories) {
        const subCat = cat.sub_categories.find((sub) => sub.id === categoryId);
        if (subCat) {
          return `${cat.icon} ${cat.name} - ${subCat.name}`;
        }
      }
    }
    // Check if it's a main category
    const category = categories.find((cat) => cat.id === categoryId);
    if (category) {
      return `${category.icon} ${category.name}`;
    }
    return categoryId; // Fallback to ID if not found
  };

  // Get nominees for a specific category/role
  // const getNomineesForCategory = (category, subCategory = null) => {
  //   const roleFilter = subCategory ? [subCategory.role] : category.role_filter;
  //   return allNominees.filter((n) => roleFilter.includes(n.role));
  // };

  // Get all selection categories (including sub-categories)
  const getAllSelectionCategories = () => {
    const selections = [];
    categories.forEach((cat) => {
      if (cat.sub_categories) {
        cat.sub_categories.forEach((sub) => {
          selections.push({
            id: sub.id,
            name: `${cat.name} - ${sub.name}`,
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
          parent: null,
        });
      }
    });
    return selections;
  };

  if (loading)
    return (
      <div className="container" style={{ paddingTop: "2rem" }}>
        Loading...
      </div>
    );

  if (!user || !voteUser?.is_admin) {
    return (
      <div className="container" style={{ paddingTop: "4rem", textAlign: "center" }}>
        <h1>⛔ Access Denied</h1>
        <p>Bạn không có quyền truy cập trang này.</p>
        <button className="btn btn-primary" style={{ marginTop: "1rem" }} onClick={() => navigate("/")}>
          Về Trang Chủ
        </button>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingBottom: "4rem" }}>
      <div className="section-header" style={{ marginTop: "2rem", marginBottom: "2rem" }}>
        <h1 className="section-title">Admin Dashboard</h1>
        <p className="section-subtitle">Quản lý và thống kê dự đoán</p>
      </div>

      {/* Tabs */}
      <div className="admin-tabs" style={{ display: "flex", gap: "1rem", marginBottom: "2rem", flexWrap: "wrap" }}>
        <button className={`btn ${activeTab === "votes" ? "btn-primary" : "btn-secondary"}`} onClick={() => setActiveTab("votes")}>
          🗳️ Phiên Dự đoán ({votesData.length})
        </button>
        <button className={`btn ${activeTab === "users" ? "btn-primary" : "btn-secondary"}`} onClick={() => setActiveTab("users")}>
          👥 Thống kê ({usersData.length})
        </button>
        <button className={`btn ${activeTab === "nominees" ? "btn-primary" : "btn-secondary"}`} onClick={() => setActiveTab("nominees")}>
          📊 Đề cử ({nomineeStats.length})
        </button>
        <button className={`btn ${activeTab === "admins" ? "btn-primary" : "btn-secondary"}`} onClick={() => setActiveTab("admins")}>
          🔐 Phân quyền
        </button>
        <button className={`btn ${activeTab === "settings" ? "btn-primary" : "btn-secondary"}`} onClick={() => setActiveTab("settings")}>
          ⚙️ Cài đặt
        </button>
        <button className={`btn ${activeTab === "results" ? "btn-primary" : "btn-secondary"}`} onClick={() => setActiveTab("results")}>
          🏆 Tìm Người Đoán Đúng
        </button>
        <button className={`btn ${activeTab === "avatars" ? "btn-primary" : "btn-secondary"}`} onClick={() => setShowAvatarModal(true)}>
          🖼️ Cập nhật Avatar
        </button>
        <button className="btn btn-secondary" onClick={handleExportExcel}>
          📤 Xuất Excel
        </button>
        <button className="btn btn-secondary " onClick={fetchData} title="Làm mới dữ liệu">
          🔄
        </button>
      </div>

      {isLoadingData ? (
        <div style={{ textAlign: "center", padding: "2rem" }}>Đang tải dữ liệu...</div>
      ) : (
        <div className="admin-content">
          {activeTab === "votes" && (
            <div className="card">
              <div style={{ overflowX: "auto" }}>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Thời gian</th>
                      <th>Người dự đoán</th>
                      <th>Chi tiết phiếu dự đoán</th>
                      <th>Tổng tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {votesData.map((session) => (
                      <tr key={session.id}>
                        <td style={{ whiteSpace: "nowrap" }}>{formatDate(session.created_at)}</td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <span style={{ fontWeight: "bold" }}>{session.voter_name || "Anonymous"}</span>
                          </div>
                          <div style={{ fontSize: "0.8em", color: "#666" }}>{session.voter_email}</div>
                        </td>
                        <td>
                          <div style={{ marginBottom: "0.25rem", fontSize: "0.9em" }}>{session.total_categories} hạng mục</div>
                          <div className="nominee-list">
                            {session.votes?.map((vote) => (
                              <div key={vote.id} className="nominee-item">
                                <div className="mini-nominee">{vote.nominee?.url_avatar ? <img src={vote.nominee.url_avatar} alt={vote.nominee.user_name} /> : <div className="mini-avatar-placeholder">{vote.nominee?.user_name?.[0]}</div>}</div>
                                <div className="custom-tooltip">
                                  <div className="tooltip-cat">{vote.category_name}</div>
                                  <div className="tooltip-name">{vote.nominee?.user_name}</div>
                                  <div className="tooltip-role">{vote.nominee?.role}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td style={{ color: "#FCD34D", fontWeight: "bold" }}>{formatCurrency(session.total_amount)}</td>
                      </tr>
                    ))}
                    {votesData.length === 0 && (
                      <tr>
                        <td colSpan="4" style={{ textAlign: "center", padding: "2rem" }}>
                          Chưa có dữ liệu phiên dự đoán
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "users" && (
            <div className="card">
              <div style={{ overflowX: "auto" }}>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Hạng</th>
                      <th>Người dùng</th>
                      <th>Thống kê Vote</th>
                      <th>Chi tiết</th>
                      <th>Tổng chi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersData.map((user, index) => (
                      <tr key={user.voter_id || index}>
                        <td>
                          <div
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: "50%",
                              background: index < 3 ? "#FCD34D" : "#eee",
                              color: index < 3 ? "#000" : "#666",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: "bold",
                            }}
                          >
                            {index + 1}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                            <img src={user.voter_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.voter_email}`} alt="" style={{ width: 32, height: 32, borderRadius: "50%" }} />
                            <div>
                              <div style={{ fontWeight: "bold" }}>{user.voter_full_name || user.voter_name}</div>
                              <div style={{ fontSize: "0.8em", color: "#666" }}>{user.voter_email}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div>
                            Tổng phiếu: <b>{user.total_votes}</b>
                          </div>
                          <div style={{ fontSize: "0.8em", color: "#666" }}>{user.total_sessions} lượt dự đoán</div>
                        </td>
                        <td>
                          <div style={{ fontSize: "0.9em" }}>
                            Đã dự đoán: <b>{user.categories_voted}</b> hạng mục
                          </div>
                          <div style={{ fontSize: "0.8em", color: "#666" }}>Lần cuối: {formatDate(user.last_vote_time)}</div>
                        </td>
                        <td style={{ color: "#FCD34D", fontWeight: "bold", fontSize: "1.1em" }}>{formatCurrency(user.total_spent)}</td>
                      </tr>
                    ))}
                    {usersData.length === 0 && (
                      <tr>
                        <td colSpan="5" style={{ textAlign: "center", padding: "2rem" }}>
                          Chưa có dữ liệu user
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "admins" && (
            <div className="card">
              <div style={{ marginBottom: "1rem", padding: "0.75rem", background: "rgba(252, 211, 77, 0.1)", borderRadius: "8px", border: "1px solid rgba(252, 211, 77, 0.3)" }}>
                <p style={{ margin: 0, fontSize: "0.9rem" }}>
                  ⚠️ <strong>Lưu ý:</strong> Chỉ có Admin mới có thể truy cập trang này và thay đổi quyền admin của user khác.
                </p>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th style={{ width: "50px" }}>STT</th>
                      <th>User</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th style={{ textAlign: "center" }}>Quyền Admin</th>
                      <th style={{ width: "60px", textAlign: "center" }}>Sửa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminsData.map((adminUser, index) => (
                      <tr key={adminUser.id}>
                        <td style={{ textAlign: "center" }}>{index + 1}</td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                            {adminUser.url_avatar ? (
                              <img src={adminUser.url_avatar} alt="" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }} />
                            ) : (
                              <div
                                style={{
                                  width: 36,
                                  height: 36,
                                  borderRadius: "50%",
                                  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  color: "white",
                                  fontWeight: "bold",
                                  fontSize: "0.9rem",
                                }}
                              >
                                {adminUser.user_name?.[0]?.toUpperCase() || "?"}
                              </div>
                            )}
                            <div>
                              <div style={{ fontWeight: "bold" }}>{adminUser.full_name || adminUser.user_name}</div>
                              <div style={{ fontSize: "0.8em", color: "#888" }}>@{adminUser.user_name}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span style={{ fontSize: "0.9em", color: "#aaa" }}>{adminUser.email}</span>
                        </td>
                        <td>
                          <span className={`role-badge role-${adminUser.role?.toLowerCase()}`}>{adminUser.role}</span>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <label className="admin-toggle">
                            <input type="checkbox" checked={adminUser.is_admin || false} onChange={() => handleToggleAdmin(adminUser.id, adminUser.is_admin, adminUser.full_name || adminUser.user_name)} disabled={updatingUserId === adminUser.id || adminUser.id === voteUser?.id} />
                            <span className="toggle-slider"></span>
                          </label>
                          {adminUser.id === voteUser?.id && <span style={{ fontSize: "0.75em", color: "#888", display: "block", marginTop: "4px" }}>(You)</span>}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <button
                            className="edit-user-btn"
                            onClick={() => handleOpenEditUser(adminUser)}
                            title="Chỉnh sửa thông tin user"
                          >
                            ✏️
                          </button>
                        </td>
                      </tr>
                    ))}
                    {adminsData.length === 0 && (
                      <tr>
                        <td colSpan="6" style={{ textAlign: "center", padding: "2rem" }}>
                          Chưa có dữ liệu user
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "nominees" && (
            <div className="card">
              <h3 style={{ marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>📊 Thống Kê Đề Cử Theo Hạng Mục</h3>
              <p style={{ color: "#888", marginBottom: "1.5rem", fontSize: "0.9rem" }}>Số lượng phiếu dự đoán mà mỗi ứng viên nhận được trong từng hạng mục.</p>

              {nomineeStats.length === 0 ? (
                <div style={{ textAlign: "center", padding: "2rem", color: "#888" }}>Chưa có dữ liệu thống kê</div>
              ) : (
                <div className="nominee-stats-grid">
                  {nomineeStats.map((category) => {
                    const maxVotes = category.nominees[0]?.vote_count || 1;
                    return (
                      <div key={category.category_id} className="category-stat-card">
                        <div className="category-stat-header">
                          <h4>{category.category_name}</h4>
                          <span className="total-votes-badge">{category.total_votes} phiếu</span>
                        </div>
                        <div className="nominees-ranking">
                          {category.nominees.map((item, index) => {
                            const percentage = Math.round((item.vote_count / category.total_votes) * 100);
                            const barWidth = (item.vote_count / maxVotes) * 100;
                            return (
                              <div key={item.nominee_id} className="nominee-stat-row">
                                <div className="nominee-rank">{index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `#${index + 1}`}</div>
                                <div className="nominee-info-stat">
                                  {item.nominee?.url_avatar ? <img src={item.nominee.url_avatar} alt="" className="nominee-avatar-small" /> : <div className="nominee-avatar-placeholder-small">{item.nominee?.user_name?.[0]?.toUpperCase() || "?"}</div>}
                                  <div className="nominee-details">
                                    <span className="nominee-name-stat">{item.nominee?.full_name || item.nominee?.user_name}</span>
                                    <span className="nominee-role-stat">{item.nominee?.role}</span>
                                  </div>
                                </div>
                                <div className="vote-bar-container">
                                  <div className="vote-bar" style={{ width: `${barWidth}%` }} />
                                </div>
                                <div className="vote-count-stat">
                                  <span className="count">{item.vote_count}</span>
                                  <span className="percent">({percentage}%)</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === "settings" && (
            <div className="card">
              <h3 style={{ marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>⚙️ Cài Đặt Hệ Thống</h3>
              <p style={{ color: "#888", marginBottom: "1.5rem", fontSize: "0.9rem" }}>Quản lý các thông số cơ bản của hệ thống bình chọn.</p>

              {editedSettings && (
                <div className="settings-form">
                  {/* Voting Time Range */}
                  <div className="time-settings-section">
                    <h4 style={{ marginBottom: "1rem", color: "#FCD34D", fontSize: "1rem" }}>⏰ Thời gian bình chọn</h4>

                    <div className="setting-group">
                      <label className="setting-label">🕐 Thời gian bắt đầu</label>
                      <input
                        type="datetime-local"
                        className="setting-input"
                        value={editedSettings.voting_start_time ? new Date(editedSettings.voting_start_time).toLocaleString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" }).slice(0, 16) : ""}
                        onChange={(e) => {
                          if (e.target.value) {
                            const localDate = new Date(e.target.value);
                            handleSettingChange("voting_start_time", localDate.toISOString());
                          }
                        }}
                      />
                      {editedSettings.voting_start_time && (
                        <span className="setting-hint">
                          📅{" "}
                          {new Date(editedSettings.voting_start_time).toLocaleString("vi-VN", {
                            timeZone: "Asia/Ho_Chi_Minh",
                            dateStyle: "full",
                            timeStyle: "short",
                          })}
                        </span>
                      )}
                    </div>

                    <div className="setting-group">
                      <label className="setting-label">🕐 Thời gian kết thúc</label>
                      <input
                        type="datetime-local"
                        className="setting-input"
                        value={editedSettings.voting_end_time ? new Date(editedSettings.voting_end_time).toLocaleString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" }).slice(0, 16) : ""}
                        onChange={(e) => {
                          if (e.target.value) {
                            const localDate = new Date(e.target.value);
                            handleSettingChange("voting_end_time", localDate.toISOString());
                          }
                        }}
                      />
                      {editedSettings.voting_end_time && (
                        <span className="setting-hint">
                          📅{" "}
                          {new Date(editedSettings.voting_end_time).toLocaleString("vi-VN", {
                            timeZone: "Asia/Ho_Chi_Minh",
                            dateStyle: "full",
                            timeStyle: "short",
                          })}
                        </span>
                      )}
                    </div>

                    {/* Time Status */}
                    {(() => {
                      const now = new Date();
                      const start = new Date(editedSettings.voting_start_time);
                      const end = new Date(editedSettings.voting_end_time);
                      let statusText = "";
                      let statusColor = "#888";

                      if (now < start) {
                        const daysUntil = Math.ceil((start - now) / (1000 * 60 * 60 * 24));
                        statusText = `⏳ Chưa bắt đầu (còn ${daysUntil} ngày)`;
                        statusColor = "#60a5fa";
                      } else if (now > end) {
                        statusText = "⛔ Đã kết thúc";
                        statusColor = "#ef4444";
                      } else {
                        const daysLeft = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
                        statusText = `✅ Đang diễn ra (còn ${daysLeft} ngày)`;
                        statusColor = "#10b981";
                      }

                      return (
                        <div className="time-status" style={{ color: statusColor }}>
                          {statusText}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Vote Cost */}
                  <div className="setting-row">
                    <div className="setting-group">
                      <label className="setting-label">💰 Phí mỗi lần dự đoán (VND)</label>
                      <input type="number" className="setting-input" value={editedSettings.vote_cost || 0} onChange={(e) => handleSettingChange("vote_cost", parseInt(e.target.value) || 0)} min={0} step={1000} />
                      <span className="setting-hint">Hiện tại: {formatCurrency(editedSettings.vote_cost || 0)}</span>
                    </div>
                    <div className="setting-group">
                      <label className="setting-label">🎁 Số tiền donate thêm (VND)</label>
                      <input type="number" className="setting-input" value={editedSettings.donate_amount || 0} onChange={(e) => handleSettingChange("donate_amount", parseInt(e.target.value) || 0)} min={0} step={1000} />
                      <span className="setting-hint">Hiện tại: {formatCurrency(editedSettings.donate_amount || 0)}</span>
                    </div>
                  </div>

                  {/* Active Status */}
                  <div className="setting-group">
                    <label className="setting-label">🔘 Trạng thái hoạt động</label>
                    <div className="setting-toggle-row">
                      <label className="admin-toggle">
                        <input type="checkbox" checked={editedSettings.is_active || false} onChange={(e) => handleSettingChange("is_active", e.target.checked)} />
                        <span className="toggle-slider"></span>
                      </label>
                      <span style={{ color: editedSettings.is_active ? "#10b981" : "#888" }}>{editedSettings.is_active ? "Đang mở bình chọn" : "Đã đóng bình chọn"}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="setting-actions">
                    <button className="btn btn-primary" onClick={handleSaveSettings} disabled={isSavingSettings || !isSettingsModified()}>
                      {isSavingSettings ? "⏳ Đang lưu..." : "💾 Lưu thay đổi"}
                    </button>
                    <button className="btn btn-secondary" onClick={handleResetSettings} disabled={isSavingSettings || !isSettingsModified()}>
                      ↩️ Hoàn tác
                    </button>
                  </div>

                  {isSettingsModified() && <div className="setting-modified-notice">⚠️ Bạn có thay đổi chưa được lưu</div>}
                </div>
              )}
            </div>
          )}

          {activeTab === "results" && (
            <div className="card">
              <h3 style={{ marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>🏆 Tìm Người Dự Đoán Chính Xác</h3>
              <p style={{ color: "#888", marginBottom: "1.5rem", fontSize: "0.9rem" }}>Chọn người được vinh danh cho mỗi hạng mục, sau đó nhấn "Tìm kiếm" để xem ai đã dự đoán đúng.</p>

              {/* Winner Selection Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
                {getAllSelectionCategories().map((category) => (
                  <div
                    key={category.id}
                    style={{
                      padding: "1rem",
                      background: "rgba(255,255,255,0.03)",
                      borderRadius: "12px",
                      border: selectedWinners[category.id] ? "2px solid var(--gold)" : "1px solid rgba(255,255,255,0.1)",
                    }}
                  >
                    <div style={{ marginBottom: "0.5rem", fontWeight: "600", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span>{category.icon}</span>
                      <span>{category.name}</span>
                      {selectedWinners[category.id] && <span style={{ color: "var(--gold)" }}>✓</span>}
                    </div>
                    <select
                      value={selectedWinners[category.id] || ""}
                      onChange={(e) => handleWinnerSelect(category.id, e.target.value)}
                      style={{
                        width: "100%",
                        padding: "0.5rem",
                        borderRadius: "8px",
                        background: "rgba(0,0,0,0.3)",
                        border: "1px solid rgba(255,255,255,0.15)",
                        color: "white",
                        fontSize: "0.9rem",
                      }}
                    >
                      <option value="">-- Chọn người được vinh danh --</option>
                      {allNominees
                        .filter((n) => category.role_filter.includes(n.role))
                        .map((nominee) => (
                          <option key={nominee.id} value={nominee.id}>
                            {nominee.full_name || nominee.user_name} ({nominee.role})
                          </option>
                        ))}
                    </select>
                  </div>
                ))}
              </div>

              {/* Search Button */}
              <div style={{ marginBottom: "2rem" }}>
                <button className="btn btn-primary" onClick={handleFindPredictions} disabled={isSearching || Object.keys(selectedWinners).length === 0} style={{ marginRight: "1rem" }}>
                  {isSearching ? "⏳ Đang tìm..." : `🔍 Tìm kiếm (${Object.keys(selectedWinners).length} hạng mục)`}
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setSelectedWinners({});
                    setPredictionResults({});
                    setTopPredictors([]);
                  }}
                >
                  🗑️ Xóa tất cả
                </button>
              </div>

              {/* Overall Top Predictors Ranking */}
              {topPredictors.length > 0 && (
                <div className="top-predictors-section">
                  <div className="top-predictors-header">
                    <h4 style={{ margin: 0, color: "var(--gold)", display: "flex", alignItems: "center", gap: "0.5rem" }}>🏆 Bảng Xếp Hạng Tổng Hợp - Người Dự Đoán Chính Xác Nhất</h4>
                    <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.9rem", color: "#aaa" }}>
                      Ưu tiên: Số hạng mục đúng → Dự đoán số người gần đúng nhất → Thời gian sớm nhất
                    </p>
                  </div>

                  <div className="top-predictors-podium">
                    {topPredictors.slice(0, 10).map((predictor, index) => {
                      const accuracy = Math.round((predictor.total_correct_categories / Object.keys(selectedWinners).length) * 100);
                      return (
                        <div
                          key={predictor.voter_email || predictor.voter_id}
                          className={`predictor-rank-card ${index < 3 ? "top-three" : ""}`}
                          style={{
                            order: index === 0 ? 2 : index === 1 ? 1 : index === 2 ? 3 : index + 1,
                          }}
                        >
                          <div
                            className="rank-number"
                            style={{
                              background: index === 0 ? "linear-gradient(135deg, #FFD700, #FFA500)" : index === 1 ? "linear-gradient(135deg, #C0C0C0, #A8A8A8)" : index === 2 ? "linear-gradient(135deg, #CD7F32, #B87333)" : "#555",
                              color: index < 3 ? "#000" : "#fff",
                            }}
                          >
                            {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `#${index + 1}`}
                          </div>

                          <div className="predictor-avatar-large">{predictor.voter_avatar ? <img src={predictor.voter_avatar} alt="" /> : <div className="avatar-placeholder-large">{predictor.voter_name?.[0]?.toUpperCase() || "?"}</div>}</div>

                          <div className="predictor-info-large">
                            <div className="predictor-name-large">{predictor.voter_name}</div>
                            <div className="predictor-email-small">{predictor.voter_email}</div>
                          </div>

                          <div className="predictor-stats-grid">
                            <div className="stat-box">
                              <div className="stat-value" style={{ color: "var(--gold)" }}>
                                {predictor.total_correct_categories}
                              </div>
                              <div className="stat-label">Hạng mục đúng</div>
                            </div>
                            <div className="stat-box">
                              <div className="stat-value" style={{ color: "#10b981" }}>
                                {accuracy}%
                              </div>
                              <div className="stat-label">Độ chính xác</div>
                            </div>
                            <div className="stat-box">
                              <div className="stat-value" style={{ color: predictor.total_prediction_diff === 0 ? "#10b981" : "#60a5fa" }}>
                                ±{predictor.total_prediction_diff}
                              </div>
                              <div className="stat-label">Tổng chênh lệch</div>
                            </div>
                          </div>

                          <div className="categories-won">
                            <div className="categories-won-label">Chi tiết các hạng mục đoán đúng:</div>
                            <div className="categories-won-list">
                              {predictor.categories_details.map((cat) => (
                                <span key={cat.category_id} className="category-badge-small" title={`Dự đoán: ${cat.predicted_count} | Thực tế: ${cat.actual_count} | Chênh lệch: ±${cat.prediction_diff}`}>
                                  {getCategoryDisplayName(cat.category_id)}
                                  <span className="prediction-detail">
                                    {cat.prediction_diff === 0 ? " 🎯" : ` (±${cat.prediction_diff})`}
                                  </span>
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Results by Category */}
              {Object.keys(predictionResults).length > 0 && (
                <div className="results-by-category">
                  <h4 style={{ marginBottom: "1.5rem", color: "var(--gold)", display: "flex", alignItems: "center", gap: "0.5rem" }}>📊 Kết quả theo từng hạng mục</h4>

                  <div className="category-results-grid">
                    {Object.values(predictionResults).map((categoryResult) => (
                      <div key={categoryResult.category_id} className="category-result-card">
                        <div className="category-result-header">
                          <h5>{getCategoryDisplayName(categoryResult.category_id)}</h5>
                          <div className="winner-info">
                            <span className="winner-label">🏆 Người được vinh danh:</span>
                            <span className="winner-name">{getWinnerName(categoryResult.winner_id)}</span>
                          </div>
                          <div className="category-stats">
                            <span className="stat-item">
                              <strong>{categoryResult.unique_voters}</strong> người đoán đúng
                            </span>
                            <span className="stat-divider">•</span>
                            <span className="stat-item">
                              Số thực tế: <strong style={{ color: "var(--gold)" }}>{categoryResult.actual_correct_count}</strong>
                            </span>
                          </div>
                        </div>

                        {categoryResult.voters.length > 0 ? (
                          <div className="voters-list">
                            <table className="admin-table compact">
                              <thead>
                                <tr>
                                  <th style={{ width: "50px" }}>Hạng</th>
                                  <th>Người dự đoán</th>
                                  <th style={{ width: "100px", textAlign: "center" }}>Dự đoán</th>
                                  <th style={{ width: "80px", textAlign: "center" }}>Chênh lệch</th>
                                  <th style={{ width: "140px" }}>Thời gian</th>
                                </tr>
                              </thead>
                              <tbody>
                                {categoryResult.voters.map((voter, index) => (
                                  <tr
                                    key={voter.voter_email || voter.voter_id}
                                    style={{
                                      background: index < 3 ? "rgba(251, 191, 36, 0.08)" : "transparent",
                                    }}
                                  >
                                    <td>
                                      <div
                                        className="rank-badge"
                                        style={{
                                          background: index === 0 ? "#FFD700" : index === 1 ? "#C0C0C0" : index === 2 ? "#CD7F32" : "#555",
                                          color: index < 3 ? "#000" : "#fff",
                                        }}
                                      >
                                        {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : index + 1}
                                      </div>
                                    </td>
                                    <td>
                                      <div className="voter-info">
                                        {voter.voter_avatar ? <img src={voter.voter_avatar} alt="" className="voter-avatar-small" /> : <div className="voter-avatar-placeholder">{voter.voter_name?.[0]?.toUpperCase() || "?"}</div>}
                                        <div>
                                          <div style={{ fontWeight: "600" }}>{voter.voter_name}</div>
                                          <div style={{ fontSize: "0.8em", color: "#888" }}>{voter.voter_email}</div>
                                        </div>
                                      </div>
                                    </td>
                                    <td style={{ textAlign: "center" }}>
                                      <span className="prediction-count-badge" title={`Dự đoán ${voter.predicted_count} người sẽ chọn giống`}>
                                        👥 {voter.predicted_count}
                                      </span>
                                    </td>
                                    <td style={{ textAlign: "center" }}>
                                      <span 
                                        className={`diff-badge ${voter.prediction_diff === 0 ? 'perfect' : voter.prediction_diff <= 2 ? 'close' : ''}`}
                                        title={`Chênh lệch ${voter.prediction_diff} so với thực tế (${categoryResult.actual_correct_count})`}
                                      >
                                        {voter.prediction_diff === 0 ? '🎯 Chính xác!' : `±${voter.prediction_diff}`}
                                      </span>
                                    </td>
                                    <td style={{ fontSize: "0.85rem", color: "#aaa" }}>{formatDate(voter.first_prediction_time)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="no-voters">
                            <span>😢 Không có ai dự đoán đúng hạng mục này</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="modal-overlay" onClick={handleCloseEditUser}>
          <div className="modal-content edit-user-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>✏️ Chỉnh sửa thông tin User</h3>
              <button className="modal-close-btn" onClick={handleCloseEditUser}>×</button>
            </div>

            <div className="modal-body">
              <div className="edit-user-preview">
                {editUserForm.url_avatar ? (
                  <img src={editUserForm.url_avatar} alt="Avatar preview" className="avatar-preview" />
                ) : (
                  <div className="avatar-preview-placeholder">
                    {editUserForm.full_name?.[0]?.toUpperCase() || editUserForm.user_name?.[0]?.toUpperCase() || "?"}
                  </div>
                )}
                <div className="preview-info">
                  <div className="preview-name">{editUserForm.full_name || editUserForm.user_name || "Chưa có tên"}</div>
                  <div className="preview-username">@{editUserForm.user_name || "username"}</div>
                </div>
              </div>

              <div className="edit-form-group">
                <label className="edit-form-label">Tên hiển thị (Full Name)</label>
                <input
                  type="text"
                  className="edit-form-input"
                  value={editUserForm.full_name}
                  onChange={(e) => setEditUserForm(prev => ({ ...prev, full_name: e.target.value }))}
                  placeholder="Nhập tên hiển thị"
                />
              </div>

              <div className="edit-form-group">
                <label className="edit-form-label">Username</label>
                <input
                  type="text"
                  className="edit-form-input"
                  value={editUserForm.user_name}
                  onChange={(e) => setEditUserForm(prev => ({ ...prev, user_name: e.target.value }))}
                  placeholder="Nhập username"
                />
              </div>

              <div className="edit-form-group">
                <label className="edit-form-label">URL Avatar</label>
                <input
                  type="text"
                  className="edit-form-input"
                  value={editUserForm.url_avatar}
                  onChange={(e) => setEditUserForm(prev => ({ ...prev, url_avatar: e.target.value }))}
                  placeholder="https://example.com/avatar.jpg"
                />
              </div>

              <div className="edit-form-group">
                <label className="edit-form-label">Mô tả (Description)</label>
                <textarea
                  className="edit-form-input edit-form-textarea"
                  value={editUserForm.description}
                  onChange={(e) => setEditUserForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Nhập mô tả về user"
                  rows={3}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={handleCloseEditUser} disabled={isSavingUser}>
                Hủy
              </button>
              <button className="btn btn-primary" onClick={handleSaveUserProfile} disabled={isSavingUser}>
                {isSavingUser ? "⏳ Đang lưu..." : "💾 Lưu thay đổi"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Avatar Bulk Update Modal */}
      {showAvatarModal && (
        <div className="modal-overlay" onClick={handleCloseAvatarModal}>
          <div className="modal-content avatar-update-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🖼️ Cập nhật Avatar hàng loạt</h3>
              <button className="modal-close-btn" onClick={handleCloseAvatarModal}>×</button>
            </div>

            <div className="modal-body">
              <p style={{ color: "#888", marginBottom: "1rem", fontSize: "0.9rem" }}>
                Nhập FPT Chat Token để lấy avatar từ FPT Chat và cập nhật cho users có username trùng khớp.
              </p>

              <div className="edit-form-group">
                <label className="edit-form-label">FPT Chat Token</label>
                <input
                  type="text"
                  className="edit-form-input"
                  value={avatarToken}
                  onChange={(e) => setAvatarToken(e.target.value)}
                  placeholder="Nhập Bearer Token từ FPT Chat"
                  disabled={isUpdatingAvatars}
                />
              </div>

              {/* Progress Display */}
              {isUpdatingAvatars && (
                <div className="avatar-progress">
                  <div className="progress-header">
                    {avatarProgress.phase === "fetching" ? "🔄 Đang lấy dữ liệu..." : "⏳ Đang cập nhật avatar..."}
                  </div>
                  {avatarProgress.phase === "updating" && avatarProgress.total > 0 && (
                    <>
                      <div className="progress-bar-container">
                        <div
                          className="progress-bar-fill"
                          style={{ width: `${(avatarProgress.current / avatarProgress.total) * 100}%` }}
                        />
                      </div>
                      <div className="progress-info">
                        <span className="progress-count">{avatarProgress.current} / {avatarProgress.total}</span>
                        <span className="progress-user">@{avatarProgress.currentUser}</span>
                      </div>
                    </>
                  )}
                  {avatarProgress.phase === "fetching" && (
                    <div className="progress-info">
                      <span className="progress-user">{avatarProgress.currentUser}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Update Result */}
              {avatarUpdateResult && (
                <div className={`avatar-update-result ${avatarUpdateResult.success ? 'success' : 'error'}`}>
                  {avatarUpdateResult.success ? (
                    <>
                      <div className="result-header">✅ Cập nhật thành công!</div>
                      <div className="result-stats">
                        <div className="stat-item">
                          <span className="stat-label">Tổng participants từ FPT Chat:</span>
                          <span className="stat-value">{avatarUpdateResult.totalParticipants}</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-label">Có avatar:</span>
                          <span className="stat-value">{avatarUpdateResult.withAvatar}</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-label">Username trùng khớp:</span>
                          <span className="stat-value">{avatarUpdateResult.matched}</span>
                        </div>
                        <div className="stat-item highlight">
                          <span className="stat-label">Đã cập nhật:</span>
                          <span className="stat-value">{avatarUpdateResult.updated}</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-label">Bỏ qua (không đổi):</span>
                          <span className="stat-value">{avatarUpdateResult.skipped}</span>
                        </div>
                      </div>
                      {avatarUpdateResult.errors?.length > 0 && (
                        <div className="result-errors">
                          <div className="error-header">⚠️ Lỗi ({avatarUpdateResult.errors.length}):</div>
                          {avatarUpdateResult.errors.slice(0, 5).map((err, i) => (
                            <div key={i} className="error-item">{err.username}: {err.error}</div>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="result-error">
                      <div className="error-header">❌ Lỗi</div>
                      <div className="error-message">{avatarUpdateResult.message}</div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={handleCloseAvatarModal} disabled={isUpdatingAvatars}>
                Đóng
              </button>
              <button className="btn btn-primary" onClick={handleBulkUpdateAvatars} disabled={isUpdatingAvatars || !avatarToken.trim()}>
                {isUpdatingAvatars ? "⏳ Đang cập nhật..." : "🔄 Cập nhật Avatar"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
                .admin-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 0.95rem;
                }
                .admin-table th {
                    text-align: left;
                    padding: 1rem;
                    background: rgba(255, 255, 255, 0.05);
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                    color: #aaa;
                    font-weight: 500;
                }
                .admin-table td {
                    padding: 1rem;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                    vertical-align: middle;
                }
                .admin-table tr:last-child td {
                    border-bottom: none;
                }
                .admin-table tr:hover td {
                    background: rgba(255, 255, 255, 0.02);
                }
                .badge {
                    background: rgba(255, 255, 255, 0.1);
                    padding: 0.1rem 0.4rem;
                    border-radius: 4px;
                }
                .nominee-list {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 0.5rem;
                }
                .mini-nominee {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    overflow: hidden;
                    border: 2px solid rgba(255, 255, 255, 0.1);
                    padding: 0;
                    margin: 0;
                }
                .mini-nominee img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                .mini-avatar-placeholder {
                    width: 100%;
                    height: 100%;
                    background: #666;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 0.8em;
                    font-weight: bold;
                }
                .nominee-item {
                    position: relative;
                    cursor: pointer;
                }
                .custom-tooltip {
                    visibility: hidden;
                    position: absolute;
                    bottom: 110%;
                    left: 50%;
                    transform: translateX(-50%);
                    background: rgba(0, 0, 0, 0.95);
                    border: 1px solid rgba(255, 255, 255, 0.15);
                    color: white;
                    padding: 0.5rem 0.75rem;
                    border-radius: 6px;
                    z-index: 1000;
                    min-width: 140px;
                    text-align: center;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.5);
                    opacity: 0;
                    transition: opacity 0.2s, visibility 0.2s;
                    pointer-events: none;
                }
                .nominee-item:hover .custom-tooltip {
                    visibility: visible;
                    opacity: 1;
                }
                .nominee-item:hover .mini-nominee {
                    border-color: #FCD34D;
                    transform: scale(1.1);
                    transition: all 0.2s;
                }
                .tooltip-cat {
                    font-size: 0.65em;
                    text-transform: uppercase;
                    color: #aaa;
                    margin-bottom: 2px;
                    letter-spacing: 0.5px;
                }
                .tooltip-name {
                    font-weight: bold;
                    color: #FCD34D;
                    font-size: 0.9em;
                    margin-bottom: 1px;
                }
                .tooltip-role {
                    font-size: 0.7em;
                    background: rgba(255, 255, 255, 0.1);
                    display: inline-block;
                    padding: 0 4px;
                    border-radius: 3px;
                    margin-top: 2px;
                }
                .custom-tooltip::after {
                    content: '';
                    position: absolute;
                    top: 100%;
                    left: 50%;
                    margin-left: -5px;
                    border-width: 5px;
                    border-style: solid;
                    border-color: rgba(0, 0, 0, 0.95) transparent transparent transparent;
                }
                
                /* Admin Toggle Switch */
                .admin-toggle {
                    position: relative;
                    display: inline-block;
                    width: 50px;
                    height: 26px;
                }
                .admin-toggle input {
                    opacity: 0;
                    width: 0;
                    height: 0;
                }
                .toggle-slider {
                    position: absolute;
                    cursor: pointer;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: #444;
                    transition: 0.3s;
                    border-radius: 26px;
                }
                .toggle-slider:before {
                    position: absolute;
                    content: "";
                    height: 20px;
                    width: 20px;
                    left: 3px;
                    bottom: 3px;
                    background-color: white;
                    transition: 0.3s;
                    border-radius: 50%;
                }
                .admin-toggle input:checked + .toggle-slider {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                }
                .admin-toggle input:checked + .toggle-slider:before {
                    transform: translateX(24px);
                }
                .admin-toggle input:disabled + .toggle-slider {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
                
                /* Role Badges */
                .role-badge {
                    display: inline-block;
                    padding: 0.25rem 0.5rem;
                    border-radius: 4px;
                    font-size: 0.8em;
                    font-weight: 600;
                    text-transform: uppercase;
                }
                .role-pm {
                    background: rgba(59, 130, 246, 0.2);
                    color: #60a5fa;
                    border: 1px solid rgba(59, 130, 246, 0.3);
                }
                .role-ba {
                    background: rgba(16, 185, 129, 0.2);
                    color: #34d399;
                    border: 1px solid rgba(16, 185, 129, 0.3);
                }
                .role-dev {
                    background: rgba(249, 115, 22, 0.2);
                    color: #fb923c;
                    border: 1px solid rgba(249, 115, 22, 0.3);
                }
                .role-project {
                    background: rgba(168, 85, 247, 0.2);
                    color: #c084fc;
                    border: 1px solid rgba(168, 85, 247, 0.3);
                }

                /* Edit User Button */
                .edit-user-btn {
                    background: rgba(99, 102, 241, 0.15);
                    border: 1px solid rgba(99, 102, 241, 0.3);
                    border-radius: 8px;
                    padding: 0.4rem 0.6rem;
                    cursor: pointer;
                    transition: all 0.2s;
                    font-size: 1rem;
                }
                .edit-user-btn:hover {
                    background: rgba(99, 102, 241, 0.3);
                    border-color: rgba(99, 102, 241, 0.5);
                    transform: scale(1.05);
                }

                /* Edit User Modal */
                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.75);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                    backdrop-filter: blur(4px);
                }
                .modal-content {
                    background: #1a1a2e;
                    border-radius: 16px;
                    max-width: 500px;
                    width: 90%;
                    max-height: 90vh;
                    overflow-y: auto;
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                }
                .modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1.25rem 1.5rem;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                }
                .modal-header h3 {
                    margin: 0;
                    font-size: 1.25rem;
                    color: #fff;
                }
                .modal-close-btn {
                    background: none;
                    border: none;
                    color: #888;
                    font-size: 1.5rem;
                    cursor: pointer;
                    padding: 0;
                    line-height: 1;
                    transition: color 0.2s;
                }
                .modal-close-btn:hover {
                    color: #fff;
                }
                .modal-body {
                    padding: 1.5rem;
                }
                .modal-footer {
                    display: flex;
                    justify-content: flex-end;
                    gap: 1rem;
                    padding: 1.25rem 1.5rem;
                    border-top: 1px solid rgba(255, 255, 255, 0.1);
                }

                /* Edit User Preview */
                .edit-user-preview {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    padding: 1rem;
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 12px;
                    margin-bottom: 1.5rem;
                }
                .avatar-preview {
                    width: 64px;
                    height: 64px;
                    border-radius: 50%;
                    object-fit: cover;
                    border: 3px solid var(--gold);
                }
                .avatar-preview-placeholder {
                    width: 64px;
                    height: 64px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-weight: bold;
                    font-size: 1.5rem;
                    border: 3px solid var(--gold);
                }
                .preview-info {
                    flex: 1;
                }
                .preview-name {
                    font-weight: 600;
                    font-size: 1.1rem;
                    color: #fff;
                }
                .preview-username {
                    color: #888;
                    font-size: 0.9rem;
                }

                /* Edit Form */
                .edit-form-group {
                    margin-bottom: 1rem;
                }
                .edit-form-label {
                    display: block;
                    margin-bottom: 0.5rem;
                    font-weight: 500;
                    color: #ddd;
                    font-size: 0.9rem;
                }
                .edit-form-input {
                    width: 100%;
                    padding: 0.75rem 1rem;
                    border-radius: 8px;
                    background: rgba(0, 0, 0, 0.3);
                    border: 1px solid rgba(255, 255, 255, 0.15);
                    color: white;
                    font-size: 0.95rem;
                    transition: border-color 0.2s, box-shadow 0.2s;
                    box-sizing: border-box;
                }
                .edit-form-input:focus {
                    outline: none;
                    border-color: var(--gold);
                    box-shadow: 0 0 0 2px rgba(252, 211, 77, 0.2);
                }
                .edit-form-input::placeholder {
                    color: #666;
                }
                .edit-form-textarea {
                    resize: vertical;
                    min-height: 80px;
                }

                /* Avatar Update Modal */
                .avatar-update-modal {
                    max-width: 550px;
                }
                .avatar-progress {
                    margin-top: 1.5rem;
                    padding: 1rem;
                    background: rgba(99, 102, 241, 0.1);
                    border: 1px solid rgba(99, 102, 241, 0.3);
                    border-radius: 8px;
                }
                .progress-header {
                    font-weight: 600;
                    color: #818cf8;
                    margin-bottom: 0.75rem;
                }
                .progress-bar-container {
                    height: 8px;
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 4px;
                    overflow: hidden;
                    margin-bottom: 0.5rem;
                }
                .progress-bar-fill {
                    height: 100%;
                    background: linear-gradient(90deg, #6366f1, #8b5cf6);
                    border-radius: 4px;
                    transition: width 0.3s ease;
                }
                .progress-info {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    font-size: 0.85rem;
                }
                .progress-count {
                    color: #fff;
                    font-weight: 500;
                }
                .progress-user {
                    color: #a5b4fc;
                    font-family: monospace;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                    max-width: 200px;
                }
                .avatar-update-result {
                    margin-top: 1.5rem;
                    padding: 1rem;
                    border-radius: 8px;
                    font-size: 0.9rem;
                }
                .avatar-update-result.success {
                    background: rgba(16, 185, 129, 0.1);
                    border: 1px solid rgba(16, 185, 129, 0.3);
                }
                .avatar-update-result.error {
                    background: rgba(239, 68, 68, 0.1);
                    border: 1px solid rgba(239, 68, 68, 0.3);
                }
                .result-header {
                    font-weight: 600;
                    font-size: 1rem;
                    margin-bottom: 0.75rem;
                    color: #10b981;
                }
                .avatar-update-result.error .result-header,
                .avatar-update-result.error .error-header {
                    color: #ef4444;
                }
                .result-stats {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }
                .stat-item {
                    display: flex;
                    justify-content: space-between;
                    padding: 0.25rem 0;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                }
                .stat-item:last-child {
                    border-bottom: none;
                }
                .stat-item.highlight {
                    background: rgba(252, 211, 77, 0.1);
                    padding: 0.5rem;
                    border-radius: 4px;
                    margin: 0.25rem 0;
                }
                .stat-item.highlight .stat-value {
                    color: #FCD34D;
                    font-weight: 600;
                }
                .stat-label {
                    color: #888;
                }
                .stat-value {
                    font-weight: 500;
                    color: #fff;
                }
                .result-errors {
                    margin-top: 1rem;
                    padding-top: 1rem;
                    border-top: 1px solid rgba(255, 255, 255, 0.1);
                }
                .error-header {
                    font-weight: 500;
                    color: #f59e0b;
                    margin-bottom: 0.5rem;
                }
                .error-item {
                    font-size: 0.85rem;
                    color: #888;
                    padding: 0.25rem 0;
                }
                .error-message {
                    color: #ef4444;
                }

                /* Nominee Statistics Styles */
                .nominee-stats-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
                    gap: 1.5rem;
                }
                .category-stat-card {
                    background: rgba(255, 255, 255, 0.03);
                    border-radius: 12px;
                    padding: 1.25rem;
                    border: 1px solid rgba(255, 255, 255, 0.08);
                }
                .category-stat-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 1rem;
                    padding-bottom: 0.75rem;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                }
                .category-stat-header h4 {
                    margin: 0;
                    font-size: 1rem;
                    color: #FCD34D;
                }
                .total-votes-badge {
                    background: rgba(252, 211, 77, 0.15);
                    color: #FCD34D;
                    padding: 0.25rem 0.6rem;
                    border-radius: 20px;
                    font-size: 0.8rem;
                    font-weight: 600;
                }
                .nominees-ranking {
                    display: flex;
                    flex-direction: column;
                    gap: 0.6rem;
                }
                .nominee-stat-row {
                    display: grid;
                    grid-template-columns: 36px 1fr 120px 70px;
                    align-items: center;
                    gap: 0.75rem;
                    padding: 0.5rem;
                    border-radius: 8px;
                    transition: background 0.2s;
                }
                .nominee-stat-row:hover {
                    background: rgba(255, 255, 255, 0.05);
                }
                .nominee-rank {
                    font-size: 1.1rem;
                    text-align: center;
                    min-width: 36px;
                }
                .nominee-info-stat {
                    display: flex;
                    align-items: center;
                    gap: 0.6rem;
                    min-width: 0;
                }
                .nominee-avatar-small {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    object-fit: cover;
                    flex-shrink: 0;
                }
                .nominee-avatar-placeholder-small {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-weight: bold;
                    font-size: 0.85rem;
                    flex-shrink: 0;
                }
                .nominee-details {
                    display: flex;
                    flex-direction: column;
                    min-width: 0;
                }
                .nominee-name-stat {
                    font-weight: 600;
                    font-size: 0.9rem;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .nominee-role-stat {
                    font-size: 0.75rem;
                    color: #888;
                }
                .vote-bar-container {
                    height: 8px;
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 4px;
                    overflow: hidden;
                }
                .vote-bar {
                    height: 100%;
                    background: linear-gradient(90deg, #FCD34D 0%, #F59E0B 100%);
                    border-radius: 4px;
                    transition: width 0.3s ease;
                }
                .vote-count-stat {
                    text-align: right;
                    white-space: nowrap;
                }
                .vote-count-stat .count {
                    font-weight: 700;
                    color: #FCD34D;
                    font-size: 0.95rem;
                }
                .vote-count-stat .percent {
                    font-size: 0.75rem;
                    color: #888;
                    margin-left: 2px;
                }

                @media (max-width: 768px) {
                    .nominee-stats-grid {
                        grid-template-columns: 1fr;
                    }
                    .nominee-stat-row {
                        grid-template-columns: 30px 1fr 80px 55px;
                        gap: 0.5rem;
                        padding: 0.4rem;
                    }
                    .nominee-avatar-small,
                    .nominee-avatar-placeholder-small {
                        width: 28px;
                        height: 28px;
                    }
                    .nominee-name-stat {
                        font-size: 0.85rem;
                    }
                }

                /* Settings Form Styles */
                .settings-form {
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                    max-width: 800px;
                }
                .time-settings-section {
                    padding: 1.5rem;
                    background: rgba(252, 211, 77, 0.05);
                    border: 1px solid rgba(252, 211, 77, 0.2);
                    border-radius: 12px;
                }
                .time-status {
                    margin-top: 1rem;
                    padding: 0.75rem 1rem;
                    background: rgba(0, 0, 0, 0.3);
                    border-radius: 8px;
                    font-weight: 600;
                    font-size: 0.95rem;
                    text-align: center;
                }
                .setting-group {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                    flex: 1;
                }
                .setting-row {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 1.5rem;
                }
                @media (max-width: 768px) {
                    .setting-row {
                        grid-template-columns: 1fr;
                    }
                }
                .setting-label {
                    font-weight: 600;
                    font-size: 0.9rem;
                    color: #ddd;
                }
                .setting-input {
                    padding: 0.75rem 1rem;
                    border-radius: 8px;
                    background: rgba(0, 0, 0, 0.3);
                    border: 1px solid rgba(255, 255, 255, 0.15);
                    color: white;
                    font-size: 0.95rem;
                    transition: border-color 0.2s, box-shadow 0.2s;
                }
                .setting-input:focus {
                    outline: none;
                    border-color: var(--gold);
                    box-shadow: 0 0 0 2px rgba(252, 211, 77, 0.2);
                }
                .setting-input::placeholder {
                    color: #666;
                }
                .setting-textarea {
                    resize: vertical;
                    min-height: 80px;
                }
                .setting-hint {
                    font-size: 0.8rem;
                    color: #888;
                }
                .setting-toggle-row {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }
                .setting-actions {
                    display: flex;
                    gap: 1rem;
                    margin-top: 1rem;
                    padding-top: 1.5rem;
                    border-top: 1px solid rgba(255, 255, 255, 0.1);
                }
                .setting-modified-notice {
                    margin-top: 1rem;
                    padding: 0.75rem 1rem;
                    background: rgba(251, 191, 36, 0.1);
                    border: 1px solid rgba(251, 191, 36, 0.3);
                    border-radius: 8px;
                    color: #FCD34D;
                    font-size: 0.9rem;
                }

                /* Results by Category Styles */
                .results-by-category {
                    margin-top: 1rem;
                }
                .category-results-grid {
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                }
                .category-result-card {
                    background: rgba(255, 255, 255, 0.03);
                    border-radius: 12px;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    overflow: hidden;
                }
                .category-result-header {
                    padding: 1rem 1.25rem;
                    background: rgba(252, 211, 77, 0.05);
                    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                }
                .category-result-header h5 {
                    margin: 0 0 0.75rem 0;
                    font-size: 1.1rem;
                    color: #FCD34D;
                }
                .winner-info {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    margin-bottom: 0.5rem;
                    font-size: 0.9rem;
                }
                .winner-label {
                    color: #888;
                }
                .winner-name {
                    font-weight: 600;
                    color: #fff;
                }
                .category-stats {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    font-size: 0.85rem;
                    color: #aaa;
                }
                .category-stats strong {
                    color: #FCD34D;
                }
                .stat-divider {
                    color: #555;
                }
                .voters-list {
                    padding: 0.5rem;
                }
                .admin-table.compact th,
                .admin-table.compact td {
                    padding: 0.6rem 0.75rem;
                }
                .rank-badge {
                    width: 28px;
                    height: 28px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                    font-size: 0.85rem;
                }
                .voter-info {
                    display: flex;
                    align-items: center;
                    gap: 0.6rem;
                }
                .voter-avatar-small {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    object-fit: cover;
                }
                .voter-avatar-placeholder {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-weight: bold;
                    font-size: 0.85rem;
                }
                .prediction-count-badge {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.25rem;
                    min-width: 28px;
                    padding: 0.25rem 0.5rem;
                    background: rgba(99, 102, 241, 0.15);
                    color: #818cf8;
                    border-radius: 20px;
                    font-weight: 600;
                    font-size: 0.85rem;
                }
                .diff-badge {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    min-width: 50px;
                    padding: 0.25rem 0.5rem;
                    background: rgba(255, 255, 255, 0.1);
                    color: #aaa;
                    border-radius: 20px;
                    font-weight: 600;
                    font-size: 0.8rem;
                }
                .diff-badge.perfect {
                    background: rgba(16, 185, 129, 0.2);
                    color: #10b981;
                }
                .diff-badge.close {
                    background: rgba(251, 191, 36, 0.15);
                    color: #fbbf24;
                }
                .prediction-detail {
                    font-size: 0.8em;
                    opacity: 0.8;
                }
                .no-voters {
                    padding: 2rem;
                    text-align: center;
                    color: #888;
                    font-style: italic;
                }

                /* Top Predictors Overall Ranking Styles */
                .top-predictors-section {
                    margin-bottom: 3rem;
                    padding: 1.5rem;
                    background: linear-gradient(135deg, rgba(252, 211, 77, 0.1) 0%, rgba(251, 191, 36, 0.05) 100%);
                    border-radius: 16px;
                    border: 2px solid rgba(252, 211, 77, 0.3);
                }
                .top-predictors-header {
                    margin-bottom: 1.5rem;
                    text-align: center;
                }
                .top-predictors-podium {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
                    gap: 1.5rem;
                    margin-top: 1.5rem;
                }
                .predictor-rank-card {
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 12px;
                    padding: 1.5rem;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    transition: all 0.3s ease;
                    position: relative;
                }
                .predictor-rank-card.top-three {
                    border: 2px solid var(--gold);
                    background: rgba(252, 211, 77, 0.08);
                }
                .predictor-rank-card:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
                    border-color: var(--gold);
                }
                .rank-number {
                    position: absolute;
                    top: -12px;
                    right: 1rem;
                    width: 48px;
                    height: 48px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                    font-size: 1.2rem;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                    border: 3px solid #1a1a1a;
                }
                .predictor-avatar-large {
                    width: 80px;
                    height: 80px;
                    margin: 0 auto 1rem;
                    border-radius: 50%;
                    overflow: hidden;
                    border: 3px solid var(--gold);
                    box-shadow: 0 4px 12px rgba(252, 211, 77, 0.3);
                }
                .predictor-avatar-large img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                .avatar-placeholder-large {
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-weight: bold;
                    font-size: 2rem;
                }
                .predictor-info-large {
                    text-align: center;
                    margin-bottom: 1rem;
                }
                .predictor-name-large {
                    font-size: 1.1rem;
                    font-weight: 700;
                    color: #fff;
                    margin-bottom: 0.25rem;
                }
                .predictor-email-small {
                    font-size: 0.8rem;
                    color: #888;
                }
                .predictor-stats-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 0.75rem;
                    margin-bottom: 1rem;
                    padding: 1rem 0;
                    border-top: 1px solid rgba(255, 255, 255, 0.1);
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                }
                .stat-box {
                    text-align: center;
                }
                .stat-value {
                    font-size: 1.5rem;
                    font-weight: 700;
                    margin-bottom: 0.25rem;
                }
                .stat-label {
                    font-size: 0.7rem;
                    color: #888;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .categories-won {
                    margin-top: 1rem;
                }
                .categories-won-label {
                    font-size: 0.75rem;
                    color: #aaa;
                    margin-bottom: 0.5rem;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .categories-won-list {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 0.4rem;
                }
                .category-badge-small {
                    display: inline-block;
                    padding: 0.25rem 0.5rem;
                    background: rgba(252, 211, 77, 0.15);
                    color: #FCD34D;
                    border-radius: 6px;
                    font-size: 0.75rem;
                    font-weight: 500;
                    border: 1px solid rgba(252, 211, 77, 0.3);
                }

                @media (max-width: 768px) {
                    .category-result-header {
                        padding: 0.75rem 1rem;
                    }
                    .winner-info {
                        flex-wrap: wrap;
                    }
                    .category-stats {
                        flex-wrap: wrap;
                        gap: 0.5rem;
                    }
                    .top-predictors-podium {
                        grid-template-columns: 1fr;
                    }
                    .predictor-stats-grid {
                        grid-template-columns: repeat(3, 1fr);
                        gap: 0.5rem;
                    }
                    .stat-value {
                        font-size: 1.2rem;
                    }
                    .stat-label {
                        font-size: 0.65rem;
                    }
                }
            `}</style>
    </div>
  );
}
