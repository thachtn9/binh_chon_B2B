import { createClient } from "@supabase/supabase-js";
import { categories, sampleNominees, defaultSettings, formatCurrency, formatDate, getCategoryById, isVotingOpen, getVotingStatusMessage } from "../config/votingConfig";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Only create Supabase client if credentials are configured
// Otherwise, app runs in demo mode with localStorage
export const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

// Demo mode flag
export const isDemoMode = !supabase;

// =============================================
// RE-EXPORT from config for backward compatibility
// =============================================
export { categories, sampleNominees, defaultSettings, formatCurrency, formatDate, getCategoryById, isVotingOpen, getVotingStatusMessage };

// =============================================
// NOMINEES API - Lấy ứng viên từ database
// =============================================

// Cache nominees để không phải fetch liên tục
let nomineesCache = null;

/**
 * Lấy danh sách tất cả nominees từ database
 * Fallback về sampleNominees nếu không có database
 */
export async function fetchNominees() {
  if (!supabase) {
    return sampleNominees;
  }

  // Return cache if available
  if (nomineesCache) {
    return nomineesCache;
  }

  try {
    const { data, error } = await supabase.from("users").select("*").in("role", ["PM", "BA", "DEV", "PROJECT"]).order("role").order("user_name");

    if (error) {
      console.error("Error fetching nominees:", error);
      return sampleNominees;
    }

    nomineesCache = data || sampleNominees;
    return nomineesCache;
  } catch (err) {
    console.error("Error fetching nominees:", err);
    return sampleNominees;
  }
}

/**
 * Lấy nominees theo role
 */
export async function fetchNomineesByRole(role) {
  const allNominees = await fetchNominees();
  return allNominees.filter((n) => n.role === role);
}

/**
 * Lấy nominees cho một category (từ database hoặc cache)
 */
export async function fetchNomineesForCategory(category, subCategoryId = null) {
  const allNominees = await fetchNominees();

  // Nếu có sub-category, filter theo role của sub-category
  if (subCategoryId && category.sub_categories) {
    const subCat = category.sub_categories.find((s) => s.id === subCategoryId);
    if (subCat) {
      return allNominees.filter((n) => n.role === subCat.role);
    }
  }

  // Filter theo role_filter của category
  if (category.role_filter.includes("PROJECT")) {
    return allNominees.filter((n) => n.role === "PROJECT");
  }
  return allNominees.filter((n) => category.role_filter.includes(n.role));
}

/**
 * Lấy nominee theo ID
 */
export async function fetchNomineeById(nomineeId) {
  const allNominees = await fetchNominees();
  return allNominees.find((n) => n.id === nomineeId);
}

/**
 * Clear nominees cache (gọi khi cần refresh data)
 */
export function clearNomineesCache() {
  nomineesCache = null;
}

// =============================================
// Synchronous helpers (sử dụng sampleNominees cho demo mode)
// =============================================

/**
 * Lấy nominees cho category (sync version - chỉ dùng cho demo mode)
 */
export function getNomineesForCategory(category, subCategoryId = null, nominees = sampleNominees) {
  // Nếu có sub-category, filter theo role của sub-category
  if (subCategoryId && category.sub_categories) {
    const subCat = category.sub_categories.find((s) => s.id === subCategoryId);
    if (subCat) {
      return nominees.filter((n) => n.role === subCat.role);
    }
  }

  // Filter theo role_filter của category
  if (category.role_filter.includes("PROJECT")) {
    return nominees.filter((n) => n.role === "PROJECT");
  }
  return nominees.filter((n) => category.role_filter.includes(n.role));
}

/**
 * Lấy nominee theo ID (sync version)
 */
export function getNomineeById(nomineeId, nominees = sampleNominees) {
  return nominees.find((n) => n.id === nomineeId);
}

// =============================================
// USER PERMISSION API
// =============================================

/**
 * Kiểm tra xem user có quyền bình chọn không
 * Chỉ user có trong bảng users với role PM, BA, DEV mới được vote
 *
 * @param {string} email - Email của user cần kiểm tra
 * @returns {Object} - { canVote: boolean, user: Object|null, message: string }
 */
export async function checkVotePermission(email) {
  console.log("Checking vote permission for email:", email);

  if (!email) {
    return {
      canVote: false,
      user: null,
      message: "Vui lòng đăng nhập để bình chọn",
    };
  }

  // Demo mode - always allow
  if (!supabase) {
    const demoUser = sampleNominees.find((n) => n.email === email && ["PM", "BA", "DEV"].includes(n.role));
    if (demoUser) {
      return {
        canVote: true,
        user: demoUser,
        message: "Demo mode: Có quyền bình chọn",
      };
    }
    // In demo mode, still allow voting for demo purposes
    return {
      canVote: true,
      user: { id: "demo", email, role: "DEV", user_name: "Demo User" },
      message: "Demo mode: Cho phép bình chọn",
    };
  }

  try {
    const { data: user, error } = await supabase.from("users").select("*").eq("email", email).single();

    console.log("Supabase query result:", { user, error });

    if (error || !user) {
      console.log("No user found or error:", error?.message);
      return {
        canVote: false,
        user: null,
        message: "Bạn không có trong danh sách nhân viên. Vui lòng liên hệ Admin để được thêm vào hệ thống.",
      };
    }

    // User có trong bảng users -> có quyền bình chọn
    return {
      canVote: true,
      user: user,
      message: "Bạn có quyền dự đoán",
    };
  } catch (err) {
    console.error("Error checking vote permission:", err);
    return {
      canVote: false,
      user: null,
      message: "Lỗi kiểm tra quyền. Vui lòng thử lại sau.",
    };
  }
}

/**
 * Lấy thông tin user từ bảng users theo email
 */
export async function getUserByEmail(email) {
  if (!supabase || !email) {
    return null;
  }

  try {
    const { data, error } = await supabase.from("users").select("*").eq("email", email).single();

    if (error) {
      return null;
    }

    return data;
  } catch (err) {
    console.error("Error getting user:", err);
    return null;
  }
}

// =============================================
// SETTINGS API
// =============================================

/**
 * Lấy settings từ database
 * Nếu không có Supabase hoặc lỗi, trả về defaultSettings
 */
export async function getSettings() {
  if (!supabase) {
    return defaultSettings;
  }

  try {
    const { data, error } = await supabase.from("settings").select("*").eq("key", "voting_config").single();

    if (error || !data) {
      console.warn("Could not fetch settings, using defaults:", error?.message);
      return defaultSettings;
    }

    return {
      voting_start_time: data.voting_start_time,
      voting_end_time: data.voting_end_time,
      vote_cost: data.vote_cost,
      donate_amount: data.donate_amount || 0,
      event_name: data.event_name,
      event_description: data.event_description,
      is_active: data.is_active,
    };
  } catch (err) {
    console.error("Error fetching settings:", err);
    return defaultSettings;
  }
}

/**
 * Cập nhật settings (chỉ admin)
 */
export async function updateSettings(settings) {
  if (!supabase) {
    throw new Error("Demo mode: Cannot update settings");
  }

  const { data, error } = await supabase
    .from("settings")
    .update({
      voting_start_time: settings.voting_start_time,
      voting_end_time: settings.voting_end_time,
      vote_cost: settings.vote_cost,
      event_name: settings.event_name,
      event_description: settings.event_description,
      is_active: settings.is_active,
    })
    .eq("key", "voting_config")
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update settings: ${error.message}`);
  }

  return data;
}

// =============================================
// VOTES API
// =============================================

/**
 * Submit votes to database
 */
export async function submitVotesToDB(voterId, voterEmail, voterName, votes, totalAmount) {
  if (!supabase) {
    throw new Error("Demo mode: Votes saved to localStorage only");
  }

  // Create vote session
  const { data: session, error: sessionError } = await supabase
    .from("vote_sessions")
    .insert({
      voter_id: voterId,
      voter_email: voterEmail,
      voter_name: voterName,
      total_categories: votes.length,
      total_amount: totalAmount,
    })
    .select()
    .single();

  if (sessionError) {
    throw new Error(`Failed to create vote session: ${sessionError.message}`);
  }

  // Insert individual votes
  const voteRecords = votes.map((vote) => ({
    session_id: session.id,
    voter_id: voterId,
    voter_email: voterEmail,
    category_id: vote.category_id,
    category_name: vote.category_name,
    nominee_id: vote.nominee_id, // UUID from users table
    amount: vote.amount, // Mỗi hạng mục có chi phí vote_cost
  }));

  const { error: votesError } = await supabase.from("votes").insert(voteRecords);

  if (votesError) {
    throw new Error(`Failed to save votes: ${votesError.message}`);
  }

  return session;
}

/**
 * Get user's vote history
 */
export async function getUserVoteHistory(voterId) {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("vote_sessions")
    .select(
      `
      *,
      votes (
        *,
        nominee:nominee_id (
          id,
          user_name,
          url_avatar,
          role
        )
      )
    `
    )
    .eq("voter_id", voterId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching vote history:", error);
    return [];
  }

  return data || [];
}

/**
 * Get nominee vote stats (for leaderboard)
 */
export async function getNomineeVoteStats() {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase.from("nominee_vote_stats").select("*");

  if (error) {
    console.error("Error fetching vote stats:", error);
    return [];
  }

  return data || [];
}

/**
 * Get total prize pool
 */
export async function getTotalPrize() {
  if (!supabase) {
    return { total_prize_value: 0, total_votes: 0, total_sessions: 0 };
  }

  const { data, error } = await supabase.from("total_prize_view").select("*").single();

  if (error) {
    console.error("Error fetching total prize:", error);
    return { total_prize_value: 0, total_votes: 0, total_sessions: 0 };
  }

  return data;
}

/**
 * Get category leaderboard
 */
export async function getCategoryLeaderboard(categoryId = null) {
  if (!supabase) {
    return [];
  }

  let query = supabase.from("category_leaderboard").select("*");

  if (categoryId) {
    query = query.eq("category_id", categoryId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching leaderboard:", error);
    return [];
  }

  return data || [];
}

// =============================================
// ADMIN REPORT API
// =============================================

/**
 * Get all votes report
 */
export async function getAllVotesReport() {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase.from("all_votes_report").select("*").order("vote_time", { ascending: false });

  if (error) {
    console.error("Error fetching all votes report:", error);
    return [];
  }

  return data || [];
}

/**
 * Get all vote sessions (Admin Report)
 */
export async function getAllVoteSessions() {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("vote_sessions")
    .select(
      `
      *,
      votes (
        *,
        nominee:nominee_id (
          id,
          user_name,
          url_avatar,
          role
        )
      )
    `
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching vote sessions:", error);
    return [];
  }

  return data || [];
}

/**
 * Get voter ranking report
 */
export async function getVoterRankingReport() {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase.from("voter_ranking_report").select("*").order("total_votes", { ascending: false });

  if (error) {
    console.error("Error fetching voter ranking report:", error);
    return [];
  }

  return data || [];
}

// =============================================
// ADMIN MANAGEMENT API
// =============================================

/**
 * Get all users for admin management
 */
export async function getAllUsersForAdmin() {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase.from("users").select("id, user_name, full_name, email, role, is_admin, url_avatar, created_at").order("role").order("user_name");

  if (error) {
    console.error("Error fetching users for admin:", error);
    return [];
  }

  return data || [];
}

/**
 * Update user admin status
 * @param {string} userId - UUID of the user
 * @param {boolean} isAdmin - New admin status
 */
export async function updateUserAdminStatus(userId, isAdmin) {
  if (!supabase) {
    throw new Error("Demo mode: Cannot update admin status");
  }

  const { data, error } = await supabase.from("users").update({ is_admin: isAdmin }).eq("id", userId).select().single();

  if (error) {
    throw new Error(`Failed to update admin status: ${error.message}`);
  }

  return data;
}

// =============================================
// PREDICTION RESULTS API
// =============================================

/**
 * Find users who predicted correctly based on selected winners
 * @param {Object} winners - Object mapping category_id to winner nominee_id
 * @returns {Array} - Array of users with their correct prediction counts
 */
export async function findCorrectPredictions(winners) {
  if (!supabase) {
    return [];
  }

  try {
    // Get all votes with session and voter info
    const { data: allVotes, error } = await supabase
      .from("votes")
      .select(
        `
        id,
        session_id,
        voter_id,
        voter_email,
        category_id,
        category_name,
        nominee_id,
        vote_sessions (
          id,
          voter_name,
          voter_email,
          total_amount,
          created_at
        )
      `
      )
      .order("session_id");

    if (error) {
      console.error("Error fetching votes:", error);
      return [];
    }

    // Group votes by session
    const sessionMap = new Map();

    allVotes.forEach((vote) => {
      const sessionId = vote.session_id;
      if (!sessionMap.has(sessionId)) {
        sessionMap.set(sessionId, {
          session_id: sessionId,
          voter_id: vote.voter_id,
          voter_name: vote.vote_sessions?.voter_name || "Unknown",
          voter_email: vote.voter_email || vote.vote_sessions?.voter_email,
          total_amount: vote.vote_sessions?.total_amount || 0,
          created_at: vote.vote_sessions?.created_at,
          votes: [],
          correct_count: 0,
          total_categories: 0,
        });
      }

      const session = sessionMap.get(sessionId);
      session.votes.push({
        category_id: vote.category_id,
        category_name: vote.category_name,
        nominee_id: vote.nominee_id,
      });
    });

    // Calculate correct predictions for each session
    const results = [];
    const totalWinnerCategories = Object.keys(winners).length;

    sessionMap.forEach((session) => {
      let correctCount = 0;
      const correctCategories = [];

      session.votes.forEach((vote) => {
        if (winners[vote.category_id] && winners[vote.category_id] === vote.nominee_id) {
          correctCount++;
          correctCategories.push(vote.category_name);
        }
      });

      session.correct_count = correctCount;
      session.total_categories = session.votes.length;
      session.correct_categories = correctCategories;
      session.accuracy_percent = totalWinnerCategories > 0 ? Math.round((correctCount / totalWinnerCategories) * 100) : 0;

      results.push(session);
    });

    // Sort by correct count (descending), then by created_at (ascending for earlier predictions)
    results.sort((a, b) => {
      if (b.correct_count !== a.correct_count) {
        return b.correct_count - a.correct_count;
      }
      return new Date(a.created_at) - new Date(b.created_at);
    });

    return results;
  } catch (err) {
    console.error("Error finding correct predictions:", err);
    return [];
  }
}

/**
 * Get all nominees grouped by role for winner selection
 */
export async function getNomineesForWinnerSelection() {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase.from("users").select("id, user_name, full_name, role, url_avatar").in("role", ["PM", "BA", "DEV", "PROJECT"]).order("role").order("user_name");

  if (error) {
    console.error("Error fetching nominees for selection:", error);
    return [];
  }

  return data || [];
}

/**
 * Get nominee statistics grouped by category
 * Returns vote counts for each nominee in each category
 */
export async function getNomineeStatistics() {
  if (!supabase) {
    return [];
  }

  try {
    // Get all votes with nominee info
    const { data: votes, error } = await supabase.from("votes").select(`
        id,
        category_id,
        category_name,
        nominee_id,
        nominee:nominee_id (
          id,
          user_name,
          full_name,
          role,
          url_avatar
        )
      `);

    if (error) {
      console.error("Error fetching votes for statistics:", error);
      return [];
    }

    // Group by category, then by nominee
    const categoryMap = new Map();

    votes.forEach((vote) => {
      const catId = vote.category_id;
      const catName = vote.category_name;
      const nomineeId = vote.nominee_id;

      if (!categoryMap.has(catId)) {
        categoryMap.set(catId, {
          category_id: catId,
          category_name: catName,
          nominees: new Map(),
          total_votes: 0,
        });
      }

      const category = categoryMap.get(catId);
      category.total_votes++;

      if (!category.nominees.has(nomineeId)) {
        category.nominees.set(nomineeId, {
          nominee_id: nomineeId,
          nominee: vote.nominee,
          vote_count: 0,
        });
      }

      category.nominees.get(nomineeId).vote_count++;
    });

    // Convert to array and sort
    const results = [];
    categoryMap.forEach((category) => {
      const nomineesArray = Array.from(category.nominees.values()).sort((a, b) => b.vote_count - a.vote_count);

      results.push({
        category_id: category.category_id,
        category_name: category.category_name,
        total_votes: category.total_votes,
        nominees: nomineesArray,
      });
    });

    // Sort categories by config order
    results.sort((a, b) => {
      const catA = categories.find((c) => c.id === a.category_id || c.sub_categories?.some((s) => s.id === a.category_id));
      const catB = categories.find((c) => c.id === b.category_id || c.sub_categories?.some((s) => s.id === b.category_id));
      const orderA = catA?.sort_order || 999;
      const orderB = catB?.sort_order || 999;
      return orderA - orderB;
    });

    return results;
  } catch (err) {
    console.error("Error getting nominee statistics:", err);
    return [];
  }
}
