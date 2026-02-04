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
    const { data, error } = await supabase.from("users").select("*").in("role", ["PM", "BA", "DEV", "TP", "PROJECT"]).order("role").order("user_name");

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
      show_top_predictors: data.show_top_predictors || false,
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
      donate_amount: settings.donate_amount,
      event_name: settings.event_name,
      event_description: settings.event_description,
      is_active: settings.is_active,
      show_top_predictors: settings.show_top_predictors,
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
    predicted_count: vote.predicted_count || 0, // Số người dự đoán giống
    amount: vote.amount, // Mỗi hạng mục có chi phí vote_cost
  }));

  const { error: votesError } = await supabase.from("votes").insert(voteRecords);

  if (votesError) {
    throw new Error(`Failed to save votes: ${votesError.message}`);
  }

  return session;
}

/**
 * Submit a single vote directly to DB
 * @param {string} voterId - UUID of the voter
 * @param {string} voterEmail - Email of the voter
 * @param {string} voterName - Name of the voter
 * @param {Object} vote - Vote data { category_id, category_name, nominee_id, predicted_count }
 * @returns {Object} - The created vote record
 */
export async function submitSingleVoteToDB(voterId, voterEmail, voterName, vote) {
  if (!supabase) {
    throw new Error("Demo mode: Votes saved to localStorage only");
  }

  // Find or create a vote session for this user (use existing open session or create new one)
  let session;

  // Try to find an existing session from today
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data: existingSession, error: findError } = await supabase.from("vote_sessions").select("*").eq("voter_id", voterId).gte("created_at", today.toISOString()).order("created_at", { ascending: false }).limit(1).maybeSingle();

  if (existingSession) {
    session = existingSession;
    // Update session's total_categories
    const { error: updateError } = await supabase
      .from("vote_sessions")
      .update({ total_categories: session.total_categories + 1 })
      .eq("id", session.id);

    if (updateError) {
      console.error("Failed to update session:", updateError);
    }
  } else {
    // Create new session
    const { data: newSession, error: sessionError } = await supabase
      .from("vote_sessions")
      .insert({
        voter_id: voterId,
        voter_email: voterEmail,
        voter_name: voterName,
        total_categories: 1,
        total_amount: 0,
      })
      .select()
      .single();

    if (sessionError) {
      throw new Error(`Failed to create vote session: ${sessionError.message}`);
    }
    session = newSession;
  }

  // Insert the vote
  const { data: voteRecord, error: voteError } = await supabase
    .from("votes")
    .insert({
      session_id: session.id,
      voter_id: voterId,
      voter_email: voterEmail,
      category_id: vote.category_id,
      category_name: vote.category_name,
      nominee_id: vote.nominee_id,
      predicted_count: vote.predicted_count || 0,
      amount: 0,
    })
    .select()
    .single();

  if (voteError) {
    throw new Error(`Failed to save vote: ${voteError.message}`);
  }

  return { session, vote: voteRecord };
}

/**
 * Delete existing vote for a specific category
 * Used when user wants to re-vote for a category
 * @param {string} voterId - UUID of the voter
 * @param {string} categoryId - ID of the category
 * @returns {boolean} - True if deleted successfully
 */
export async function deleteVoteForCategory(voterId, categoryId) {
  if (!supabase) {
    // Demo mode - remove from localStorage
    return true;
  }

  try {
    // Find the vote to delete
    const { data: existingVote, error: findError } = await supabase.from("votes").select("id, session_id").eq("voter_id", voterId).eq("category_id", categoryId).order("created_at", { ascending: false }).limit(1).single();

    if (findError || !existingVote) {
      console.log("No existing vote found for category:", categoryId);
      return true; // No vote to delete
    }

    // Delete the vote
    const { error: deleteError } = await supabase.from("votes").delete().eq("id", existingVote.id);

    if (deleteError) {
      console.error("Error deleting vote:", deleteError);
      throw new Error(`Failed to delete vote: ${deleteError.message}`);
    }

    // Check if the session has any remaining votes
    const { data: remainingVotes, error: countError } = await supabase.from("votes").select("id").eq("session_id", existingVote.session_id);

    if (!countError && remainingVotes && remainingVotes.length === 0) {
      // If no remaining votes, delete the session too
      await supabase.from("vote_sessions").delete().eq("id", existingVote.session_id);
    } else if (remainingVotes) {
      // Update session's total_categories count
      await supabase.from("vote_sessions").update({ total_categories: remainingVotes.length }).eq("id", existingVote.session_id);
    }

    console.log("Successfully deleted vote for category:", categoryId);
    return true;
  } catch (err) {
    console.error("Error deleting vote for category:", err);
    throw err;
  }
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
        id,
        category_id,
        category_name,
        nominee_id,
        predicted_count,
        amount,
        created_at,
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

  const { data, error } = await supabase.from("users").select("id, user_name, full_name, email, role, is_admin, url_avatar, url_profile, description, created_at").order("role").order("user_name");

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

/**
 * Update user profile
 * @param {string} userId - UUID of the user
 * @param {Object} profileData - Profile data to update (full_name, user_name, url_avatar, description)
 */
export async function updateUserProfile(userId, profileData) {
  if (!supabase) {
    throw new Error("Demo mode: Cannot update user profile");
  }

  const { full_name, user_name, url_avatar, url_profile, description } = profileData;

  const { data, error } = await supabase
    .from("users")
    .update({
      full_name,
      user_name,
      url_avatar,
      url_profile,
      description,
    })
    .eq("id", userId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update user profile: ${error.message}`);
  }

  return data;
}

// =============================================
// PREDICTION RESULTS API
// =============================================

/**
 * Find users who predicted correctly based on selected winners
 * Logic: Group by voter (person), count unique correct categories,
 * tiebreak by earliest prediction time (first vote created_at)
 * @param {Object} winners - Object mapping category_id to winner nominee_id
 * @returns {Array} - Array of users with their correct prediction counts
 */
export async function findCorrectPredictions(winners) {
  if (!supabase) {
    return [];
  }

  try {
    // Get all votes with voter info
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
        created_at,
        vote_sessions (
          id,
          voter_name,
          voter_email,
          total_amount,
          created_at
        ),
        users:voter_id (
          id,
          user_name,
          full_name,
          url_avatar
        )
      `
      )
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching votes:", error);
      return [];
    }

    // Group votes by voter (person), not by session
    const voterMap = new Map();

    allVotes.forEach((vote) => {
      const voterId = vote.voter_id;
      if (!voterMap.has(voterId)) {
        voterMap.set(voterId, {
          voter_id: voterId,
          session_id: vote.session_id,
          voter_name: vote.vote_sessions?.voter_name || vote.users?.full_name || "Unknown",
          voter_full_name: vote.users?.full_name || "",
          voter_username: vote.users?.user_name || "",
          voter_avatar: vote.users?.url_avatar,
          voter_email: vote.voter_email || vote.vote_sessions?.voter_email,
          total_amount: vote.vote_sessions?.total_amount || 0,
          earliest_vote_at: vote.created_at,
          votes: new Map(), // category_id -> latest vote (to handle re-votes)
          correct_count: 0,
          total_categories: 0,
        });
      }

      const voter = voterMap.get(voterId);

      // Track earliest vote time for this voter
      if (vote.created_at < voter.earliest_vote_at) {
        voter.earliest_vote_at = vote.created_at;
      }

      // Keep the latest vote per category (in case of re-votes)
      const existing = voter.votes.get(vote.category_id);
      if (!existing || vote.created_at > existing.created_at) {
        voter.votes.set(vote.category_id, {
          category_id: vote.category_id,
          category_name: vote.category_name,
          nominee_id: vote.nominee_id,
          created_at: vote.created_at,
        });
      }
    });

    // Build reverse mapping: voting category -> list of honorOnly categories
    // e.g. "star-performer-dev" -> ["star-performer-dev-2"]
    const votingToHonorOnlyMap = {};
    categories.forEach((cat) => {
      if (!cat.sub_categories) return;
      const honorOnlySubs = cat.sub_categories.filter((sub) => sub.honorOnly);
      const votingSubs = cat.sub_categories.filter((sub) => !sub.honorOnly);
      honorOnlySubs.forEach((honorSub) => {
        const votingSub = votingSubs.find((vs) => vs.role === honorSub.role);
        if (votingSub) {
          if (!votingToHonorOnlyMap[votingSub.id]) {
            votingToHonorOnlyMap[votingSub.id] = [];
          }
          votingToHonorOnlyMap[votingSub.id].push(honorSub.id);
        }
      });
    });

    // Calculate correct predictions for each voter
    const results = [];
    const totalWinnerCategories = Object.keys(winners).length;

    voterMap.forEach((voter) => {
      let correctCount = 0;
      const correctCategories = [];

      voter.votes.forEach((vote) => {
        // Check direct match
        if (winners[vote.category_id] && winners[vote.category_id] === vote.nominee_id) {
          correctCount++;
          correctCategories.push(vote.category_name);
        }
        // Check if this vote also matches any honorOnly category winners
        // e.g. DEV vote matching DEV(2) winner
        const honorOnlyIds = votingToHonorOnlyMap[vote.category_id];
        if (honorOnlyIds) {
          honorOnlyIds.forEach((honorId) => {
            if (winners[honorId] && winners[honorId] === vote.nominee_id) {
              correctCount++;
              correctCategories.push(vote.category_name + " (2)");
            }
          });
        }
      });

      voter.correct_count = correctCount;
      voter.total_categories = voter.votes.size;
      voter.correct_categories = correctCategories;
      voter.accuracy_percent = totalWinnerCategories > 0 ? Math.round((correctCount / totalWinnerCategories) * 100) : 0;
      // For backward compatibility with ResultsPage display
      voter.created_at = voter.earliest_vote_at;

      results.push(voter);
    });

    // Sort by correct count (descending), then by earliest vote time (ascending)
    results.sort((a, b) => {
      if (b.correct_count !== a.correct_count) {
        return b.correct_count - a.correct_count;
      }
      return new Date(a.earliest_vote_at) - new Date(b.earliest_vote_at);
    });

    return results;
  } catch (err) {
    console.error("Error finding correct predictions:", err);
    return [];
  }
}

/**
 * Find correct predictions grouped by category
 * Returns results for each category with users who predicted correctly
 * Priority: users with predicted_count closest to actual count of voters who chose the same nominee
 */
export async function findCorrectPredictionsByCategory(winners) {
  if (!supabase) {
    return {};
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
        predicted_count,
        created_at,
        vote_sessions (
          id,
          voter_name,
          voter_email
        ),
        users:voter_id (
          id,
          user_name,
          full_name,
          url_avatar
        )
      `
      )
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching votes:", error);
      return {};
    }

    // Build mapping: honorOnly category -> voting category
    // e.g. "star-performer-dev-2" -> "star-performer-dev"
    const honorOnlyToVotingMap = {};
    categories.forEach((cat) => {
      if (!cat.sub_categories) return;
      const honorOnlySubs = cat.sub_categories.filter((sub) => sub.honorOnly);
      const votingSubs = cat.sub_categories.filter((sub) => !sub.honorOnly);
      honorOnlySubs.forEach((honorSub) => {
        // Map to the voting sub-category with the same role
        const votingSub = votingSubs.find((vs) => vs.role === honorSub.role);
        if (votingSub) {
          honorOnlyToVotingMap[honorSub.id] = votingSub.id;
        }
      });
    });

    // Group results by category
    const resultsByCategory = {};

    // Process each selected winner category
    Object.entries(winners).forEach(([categoryId, winnerId]) => {
      if (!winnerId) return;

      // For honorOnly categories, look up votes from the corresponding voting category
      const voteCategoryId = honorOnlyToVotingMap[categoryId] || categoryId;

      // Find all votes for this category that predicted the winner correctly
      const correctVotes = allVotes.filter((vote) => vote.category_id === voteCategoryId && vote.nominee_id === winnerId);

      // Số người thực tế đã chọn đúng nominee này (unique voters)
      const uniqueVoterEmails = new Set(correctVotes.map((v) => v.voter_email || v.voter_id));
      const actualCorrectCount = uniqueVoterEmails.size;

      // Group by voter (email) - lấy dự đoán sau cùng của mỗi người cho đề cử này
      const voterMap = new Map();

      correctVotes.forEach((vote) => {
        const voterKey = vote.voter_email || vote.voter_id;
        if (!voterMap.has(voterKey)) {
          voterMap.set(voterKey, {
            voter_id: vote.voter_id,
            voter_email: vote.voter_email,
            voter_name: vote.vote_sessions?.voter_name || vote.users?.full_name || vote.users?.user_name || "Unknown",
            voter_full_name: vote.users?.full_name || "",
            voter_username: vote.users?.user_name || "",
            voter_avatar: vote.users?.url_avatar,
            predicted_count: vote.predicted_count || 0,
            last_prediction_time: vote.created_at, // Lấy time từ bảng votes
            // Độ chênh lệch giữa dự đoán và thực tế
            prediction_diff: Math.abs((vote.predicted_count || 0) - actualCorrectCount),
          });
        } else {
          // Nếu đã có, kiểm tra xem dự đoán này có sau hơn không và cập nhật predicted_count
          const existing = voterMap.get(voterKey);
          if (vote.created_at > existing.last_prediction_time) {
            existing.last_prediction_time = vote.created_at;
            existing.predicted_count = vote.predicted_count || 0;
            existing.prediction_diff = Math.abs((vote.predicted_count || 0) - actualCorrectCount);
          }
        }
      });

      // Convert to array and sort:
      // 1. Ưu tiên người có predicted_count gần đúng nhất (prediction_diff nhỏ nhất)
      // 2. Nếu bằng nhau, ưu tiên người dự đoán sớm hơn (dựa trên thời gian dự đoán cuối cùng)
      const votersArray = Array.from(voterMap.values()).sort((a, b) => {
        // First: by prediction difference (ascending - smaller is better)
        if (a.prediction_diff !== b.prediction_diff) {
          return a.prediction_diff - b.prediction_diff;
        }
        // Then: by last prediction time (ascending - earlier is better)
        return new Date(a.last_prediction_time) - new Date(b.last_prediction_time);
      });

      // Get category name from first vote or use categoryId
      const categoryName = correctVotes[0]?.category_name || categoryId;

      resultsByCategory[categoryId] = {
        category_id: categoryId,
        category_name: categoryName,
        winner_id: winnerId,
        actual_correct_count: actualCorrectCount, // Số người thực tế chọn đúng
        total_correct_predictions: correctVotes.length,
        unique_voters: votersArray.length,
        voters: votersArray,
      };
    });

    return resultsByCategory;
  } catch (err) {
    console.error("Error finding correct predictions by category:", err);
    return {};
  }
}

/**
 * Get all nominees grouped by role for winner selection
 */
export async function getNomineesForWinnerSelection() {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase.from("users").select("id, user_name, full_name, role, url_avatar").in("role", ["PM", "BA", "DEV", "TP", "PROJECT"]).order("role").order("user_name");

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

// =============================================
// COMMENTS API - Bình luận cho đề cử
// =============================================

// Cache comments theo nominee
let commentsCache = {};

/**
 * Lấy danh sách comments cho một nominee
 */
export async function fetchCommentsForNominee(nomineeId) {
  if (!supabase) {
    // Demo mode - return from localStorage
    const stored = localStorage.getItem(`comments_${nomineeId}`);
    return stored ? JSON.parse(stored) : [];
  }

  // Return cache if available
  if (commentsCache[nomineeId]) {
    return commentsCache[nomineeId];
  }

  try {
    // Use comments_public view to hide anonymous commenter info
    const { data, error } = await supabase.from("comments_public").select("*").eq("nominee_id", nomineeId).eq("is_visible", true).order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching comments:", error);
      return [];
    }

    commentsCache[nomineeId] = data || [];
    return commentsCache[nomineeId];
  } catch (err) {
    console.error("Error fetching comments:", err);
    return [];
  }
}

/**
 * Lấy tất cả comments cho nhiều nominees cùng lúc
 */
export async function fetchAllComments() {
  if (!supabase) {
    // Demo mode
    return [];
  }

  try {
    // Use comments_public view to hide anonymous commenter info
    const { data, error } = await supabase.from("comments_public").select("*").eq("is_visible", true).order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching all comments:", error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error("Error fetching all comments:", err);
    return [];
  }
}

/**
 * Lấy tất cả comments cho Admin (bao gồm thông tin nominee và commenter đầy đủ)
 */
export async function fetchAllCommentsForAdmin() {
  if (!supabase) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from("comments")
      .select(`
        id,
        content,
        commenter_email,
        commenter_name,
        is_anonymous,
        is_visible,
        created_at,
        nominee:nominee_id (
          id,
          user_name,
          full_name,
          email,
          role
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching all comments for admin:", error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error("Error fetching all comments for admin:", err);
    return [];
  }
}

/**
 * Thêm comment mới
 * @param {boolean} isAnonymous - Nếu true, comment sẽ được hiển thị ẩn danh
 */
export async function addComment(nomineeId, commenterEmail, commenterName, commenterAvatar, content, isAnonymous = false) {
  if (!supabase) {
    // Demo mode - save to localStorage
    const stored = localStorage.getItem(`comments_${nomineeId}`);
    const comments = stored ? JSON.parse(stored) : [];
    const newComment = {
      id: `demo_${Date.now()}`,
      nominee_id: nomineeId,
      commenter_email: commenterEmail,
      commenter_name: commenterName,
      commenter_avatar: commenterAvatar,
      content: content,
      is_anonymous: isAnonymous,
      is_visible: true,
      created_at: new Date().toISOString(),
    };
    comments.unshift(newComment);
    localStorage.setItem(`comments_${nomineeId}`, JSON.stringify(comments));
    return newComment;
  }

  try {
    // Tìm commenter_id từ email (nếu có trong bảng users)
    let commenterId = null;
    const { data: user } = await supabase.from("users").select("id").eq("email", commenterEmail).single();

    if (user) {
      commenterId = user.id;
    }

    const { data, error } = await supabase
      .from("comments")
      .insert({
        nominee_id: nomineeId,
        commenter_id: commenterId,
        commenter_email: commenterEmail,
        commenter_name: commenterName,
        commenter_avatar: commenterAvatar,
        content: content,
        is_anonymous: isAnonymous,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to add comment: ${error.message}`);
    }

    // Clear cache for this nominee
    delete commentsCache[nomineeId];

    return data;
  } catch (err) {
    console.error("Error adding comment:", err);
    throw err;
  }
}

/**
 * Xóa comment (chỉ owner hoặc admin)
 */
export async function deleteComment(commentId, commenterEmail) {
  if (!supabase) {
    // Demo mode
    return true;
  }

  try {
    const { error } = await supabase.from("comments").delete().eq("id", commentId).eq("commenter_email", commenterEmail);

    if (error) {
      throw new Error(`Failed to delete comment: ${error.message}`);
    }

    // Clear all cache
    commentsCache = {};

    return true;
  } catch (err) {
    console.error("Error deleting comment:", err);
    throw err;
  }
}

/**
 * Clear comments cache
 */
export function clearCommentsCache() {
  commentsCache = {};
}

/**
 * Like a nominee profile
 * Can like multiple times - just increments counter
 * @param {string} nomineeId - UUID of the nominee to like
 * @returns {number} - New like count
 */
export async function likeNominee(nomineeId, count = 1) {
  if (!supabase) {
    // Demo mode - save to localStorage
    const key = `like_count_${nomineeId}`;
    const current = parseInt(localStorage.getItem(key) || "0");
    const newCount = current + count;
    localStorage.setItem(key, newCount.toString());
    return newCount;
  }

  try {
    // Call the database function to increment like_count
    const { data, error } = await supabase.rpc("increment_like_count", {
      user_id: nomineeId,
      increment_by: count,
    });

    if (error) {
      // If function doesn't exist, try direct update with count
      const { data: currentUser } = await supabase.from("users").select("like_count").eq("id", nomineeId).single();

      const newCount = (currentUser?.like_count || 0) + count;
      const { data: userData, error: updateError } = await supabase.from("users").update({ like_count: newCount }).eq("id", nomineeId).select("like_count").single();

      if (updateError) {
        console.error("Error updating like count:", updateError);
        throw updateError;
      }

      clearNomineesCache();
      return userData?.like_count || newCount;
    }

    // Clear nominees cache to get fresh data
    clearNomineesCache();
    return data;
  } catch (err) {
    console.error("Error liking nominee:", err);
    throw err;
  }
}

/**
 * Get like count for a nominee (for demo mode)
 */
export function getLikeCount(nomineeId) {
  if (!supabase) {
    return parseInt(localStorage.getItem(`like_count_${nomineeId}`) || "0");
  }
  return 0; // In production, use the like_count from nominee data
}

/**
 * Fetch fresh nominee data by ID (bypasses cache)
 */
export async function fetchNomineeByIdFresh(nomineeId) {
  if (!supabase) {
    return sampleNominees.find((n) => n.id === nomineeId) || null;
  }

  try {
    const { data, error } = await supabase.from("users").select("*").eq("id", nomineeId).single();

    if (error) {
      console.error("Error fetching nominee:", error);
      return null;
    }

    return data;
  } catch (err) {
    console.error("Error fetching nominee:", err);
    return null;
  }
}

/**
 * Fetch comments with commenter profile info (avatar from users table)
 */
export async function fetchCommentsWithProfile(nomineeId) {
  if (!supabase) {
    const stored = localStorage.getItem(`comments_${nomineeId}`);
    return stored ? JSON.parse(stored) : [];
  }

  try {
    // Use comments_public view to automatically hide anonymous commenter info at DB level
    // User info is already joined in the view, no need for nested select
    const { data, error } = await supabase.from("comments_public").select("*").eq("nominee_id", nomineeId).eq("is_visible", true).order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching comments with profile:", error);
      return [];
    }

    // Transform data to use consistent field names
    return (data || []).map((comment) => ({
      ...comment,
      commenter_avatar: comment.commenter_url_avatar || comment.commenter_avatar,
      commenter: comment.commenter_id
        ? {
            id: comment.commenter_id,
            user_name: comment.commenter_user_name,
            full_name: comment.commenter_full_name,
            url_avatar: comment.commenter_url_avatar,
            role: comment.commenter_role,
          }
        : null,
    }));
  } catch (err) {
    console.error("Error fetching comments with profile:", err);
    return [];
  }
}

/**
 * Fetch YEB sponsorship total from Google Sheets
 * Uses Google Sheets API v4 with API key
 */
export async function fetchYEBSponsorship() {
  try {
    // Google Sheets configuration
    const sheetId = "17p0Wg81ZQ4mFvmArnAugY_q1U8w6dOG-Pt__pYeUC38";
    const range = "YEP2025!J62";
    const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;

    console.log("Fetching YEB data with API key:", apiKey ? "Yes" : "No");

    if (apiKey) {
      // Use Google Sheets API v4 with API key
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?key=${apiKey}`;
      console.log("Fetching from URL:", url);

      const response = await fetch(url);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Google Sheets API error:", response.status, errorText);
        // Fall back to alternative method
        return await fetchYEBFromPublicSheet(sheetId);
      }

      const data = await response.json();
      console.log("Google Sheets API response:", data);

      const value = data.values?.[0]?.[0];

      if (!value) {
        console.log("No value found in response");
        return null;
      }

      // Parse the value (remove commas and convert to number)
      const cleanValue = String(value)
        .replace(/[,₫đ\s]/g, "")
        .trim();
      const numValue = parseFloat(cleanValue);
      console.log("Parsed value:", numValue);
      return isNaN(numValue) ? null : numValue;
    }

    // No API key, try alternative methods
    return await fetchYEBFromPublicSheet(sheetId);
  } catch (err) {
    console.error("Error fetching YEB sponsorship:", err);
    return null;
  }
}

/**
 * Fallback method: Fetch from public Google Sheets using visualization API
 */
async function fetchYEBFromPublicSheet(sheetId) {
  try {
    // Method 1: Try Google Visualization API (requires sheet to be published)
    const vizUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=YEP2025&range=J62`;
    console.log("Trying visualization API:", vizUrl);

    const response = await fetch(vizUrl);

    if (!response.ok) {
      console.error("Visualization API failed:", response.status);
      return null;
    }

    const text = await response.text();
    console.log("Raw CSV response:", text);

    // Parse CSV - remove quotes, newlines and parse number
    const cleanValue = text.replace(/["\n\r,₫đ\s]/g, "").trim();
    const numValue = parseFloat(cleanValue);
    console.log("Parsed CSV value:", numValue);

    return isNaN(numValue) ? null : numValue;
  } catch (err) {
    console.error("Error fetching from public sheet:", err);
    return null;
  }
}

// =============================================
// AVATAR BULK UPDATE API - Cập nhật avatar hàng loạt
// =============================================

/**
 * Fetch participants from FPT Chat API
 * @param {string} token - FPT Chat Bearer token
 * @returns {Array} - Array of participants with username and avatarUrl
 */
export async function fetchFPTChatParticipants(token) {
  try {
    const groupId = "686c956d28f4793125708f8d";
    const response = await fetch(`https://api-chat.fpt.com/group-management/group/${groupId}/participant?limit=500&page=1`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error("Lỗi khi gọi FPT Chat API:", error);
    throw error;
  }
}

/**
 * Bulk update user avatars based on FPT Chat participants
 * @param {Array} participants - Array of FPT Chat participants with username and avatarUrl
 * @param {Function} onProgress - Optional callback for progress updates
 * @returns {Object} - { updated: number, matched: number, errors: Array }
 */
export async function bulkUpdateUserAvatars(participants, onProgress) {
  if (!supabase) {
    throw new Error("Demo mode: Cannot update avatars");
  }

  const results = {
    updated: 0,
    matched: 0,
    skipped: 0,
    errors: [],
    details: [],
  };

  // Filter participants that have both avatarUrl and username
  const validParticipants = participants.filter((p) => p.avatarUrl && p.username);
  const total = validParticipants.length;

  for (let i = 0; i < validParticipants.length; i++) {
    const participant = validParticipants[i];

    // Report progress
    if (onProgress) {
      onProgress({
        current: i + 1,
        total: total,
        currentUser: participant.username,
      });
    }

    try {
      // Find user by username (user_name field in database)
      const { data: existingUser, error: findError } = await supabase.from("users").select("id, user_name, url_avatar").eq("user_name", participant.username).single();

      if (findError || !existingUser) {
        // Try to match by email prefix or other fields
        continue;
      }

      results.matched++;

      // Only update if avatar is different
      if (existingUser.url_avatar !== participant.avatarUrl) {
        const { error: updateError } = await supabase.from("users").update({ url_avatar: participant.avatarUrl }).eq("id", existingUser.id);

        if (updateError) {
          results.errors.push({
            username: participant.username,
            error: updateError.message,
          });
        } else {
          results.updated++;
          results.details.push({
            username: participant.username,
            oldAvatar: existingUser.url_avatar,
            newAvatar: participant.avatarUrl,
          });
        }
      } else {
        results.skipped++;
      }
    } catch (err) {
      results.errors.push({
        username: participant.username,
        error: err.message,
      });
    }
  }

  // Clear nominees cache to refresh data
  clearNomineesCache();

  return results;
}

// =============================================
// CATEGORY WINNERS (HONOREES) API
// Quản lý người được vinh danh ở mỗi hạng mục
// =============================================

/**
 * Upload ảnh lên ImgBB (free image hosting)
 * @param {File} imageFile - File ảnh cần upload
 * @param {string} apiKey - ImgBB API key (get from https://api.imgbb.com/)
 * @returns {string} - URL của ảnh đã upload
 */
export async function uploadImageToImgBB(imageFile, apiKey) {
  if (!apiKey) {
    throw new Error("Cần API key ImgBB để upload ảnh. Đăng ký miễn phí tại https://api.imgbb.com/");
  }

  try {
    const formData = new FormData();
    formData.append("image", imageFile);

    const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error?.message || "Upload thất bại");
    }

    return data.data.url;
  } catch (err) {
    console.error("Error uploading image to ImgBB:", err);
    throw err;
  }
}

/**
 * Lấy danh sách tất cả người được vinh danh
 * @returns {Array} - Danh sách winners với thông tin nominee
 */
export async function getCategoryWinners() {
  if (!supabase) {
    // Demo mode - return from localStorage
    const stored = localStorage.getItem("category_winners");
    return stored ? JSON.parse(stored) : [];
  }

  try {
    const { data, error } = await supabase
      .from("category_winners")
      .select(`
        *,
        winner:winner_id (
          id,
          user_name,
          full_name,
          role,
          url_avatar,
          email,
          description
        ),
        confirmed_by_user:confirmed_by (
          id,
          user_name,
          full_name
        )
      `)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching category winners:", error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error("Error fetching category winners:", err);
    return [];
  }
}

/**
 * Lấy winner cho một category cụ thể
 * @param {string} categoryId - ID của hạng mục
 */
export async function getCategoryWinner(categoryId) {
  if (!supabase) {
    const stored = localStorage.getItem("category_winners");
    const winners = stored ? JSON.parse(stored) : [];
    return winners.find((w) => w.category_id === categoryId) || null;
  }

  try {
    const { data, error } = await supabase
      .from("category_winners")
      .select(`
        *,
        winner:winner_id (
          id,
          user_name,
          full_name,
          role,
          url_avatar,
          email
        )
      `)
      .eq("category_id", categoryId)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows returned
      console.error("Error fetching category winner:", error);
      return null;
    }

    return data;
  } catch (err) {
    console.error("Error fetching category winner:", err);
    return null;
  }
}

/**
 * Lưu/Cập nhật người được vinh danh cho một hạng mục
 * @param {Object} winnerData - { category_id, category_name, winner_id, award_photo_url, notes }
 * @param {string} confirmedByUserId - ID của admin xác nhận
 */
export async function saveCategoryWinner(winnerData, confirmedByUserId) {
  const { category_id, category_name, winner_id, award_photo_url, notes, actual_vote_count } = winnerData;

  if (!supabase) {
    // Demo mode - save to localStorage
    const stored = localStorage.getItem("category_winners");
    const winners = stored ? JSON.parse(stored) : [];

    const existingIndex = winners.findIndex((w) => w.category_id === category_id);
    const newWinner = {
      id: existingIndex >= 0 ? winners[existingIndex].id : `demo_${Date.now()}`,
      category_id,
      category_name,
      winner_id,
      award_photo_url,
      actual_vote_count: actual_vote_count || 0,
      notes,
      confirmed_by: confirmedByUserId,
      confirmed_at: new Date().toISOString(),
      created_at: existingIndex >= 0 ? winners[existingIndex].created_at : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      winners[existingIndex] = newWinner;
    } else {
      winners.push(newWinner);
    }

    localStorage.setItem("category_winners", JSON.stringify(winners));
    return newWinner;
  }

  try {
    // Check if winner already exists for this category
    const { data: existing } = await supabase
      .from("category_winners")
      .select("id")
      .eq("category_id", category_id)
      .single();

    const winnerRecord = {
      category_id,
      category_name,
      winner_id,
      award_photo_url,
      actual_vote_count: actual_vote_count || 0,
      notes,
      confirmed_by: confirmedByUserId,
      confirmed_at: new Date().toISOString(),
    };

    let result;
    if (existing) {
      // Update existing record
      const { data, error } = await supabase
        .from("category_winners")
        .update(winnerRecord)
        .eq("id", existing.id)
        .select(`
          *,
          winner:winner_id (
            id,
            user_name,
            full_name,
            role,
            url_avatar
          )
        `)
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Insert new record
      const { data, error } = await supabase
        .from("category_winners")
        .insert(winnerRecord)
        .select(`
          *,
          winner:winner_id (
            id,
            user_name,
            full_name,
            role,
            url_avatar
          )
        `)
        .single();

      if (error) throw error;
      result = data;
    }

    return result;
  } catch (err) {
    console.error("Error saving category winner:", err);
    throw err;
  }
}

/**
 * Xóa người được vinh danh của một hạng mục
 * @param {string} categoryId - ID của hạng mục
 */
export async function deleteCategoryWinner(categoryId) {
  if (!supabase) {
    const stored = localStorage.getItem("category_winners");
    const winners = stored ? JSON.parse(stored) : [];
    const filtered = winners.filter((w) => w.category_id !== categoryId);
    localStorage.setItem("category_winners", JSON.stringify(filtered));
    return true;
  }

  try {
    const { error } = await supabase
      .from("category_winners")
      .delete()
      .eq("category_id", categoryId);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error("Error deleting category winner:", err);
    throw err;
  }
}

// =============================================
// SLIDESHOW IMAGES API
// Quản lý ảnh bổ sung cho slideshow
// =============================================

/**
 * Lấy danh sách ảnh slideshow theo thứ tự created_at (thêm trước hiển thị trước)
 * @returns {Array} - Danh sách ảnh
 */
export async function fetchSlideshowImages() {
  if (!supabase) {
    const stored = localStorage.getItem("slideshow_images");
    return stored ? JSON.parse(stored) : [];
  }

  try {
    const { data, error } = await supabase
      .from("slideshow_images")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching slideshow images:", error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error("Error fetching slideshow images:", err);
    return [];
  }
}

/**
 * Thêm ảnh mới vào slideshow
 * @param {string} imageUrl - URL ảnh (từ ImgBB)
 * @param {string} createdBy - ID user tạo
 * @returns {Object} - Record vừa tạo
 */
export async function addSlideshowImage(imageUrl, createdBy) {
  if (!supabase) {
    const stored = localStorage.getItem("slideshow_images");
    const images = stored ? JSON.parse(stored) : [];
    const newImage = {
      id: `demo_${Date.now()}`,
      image_url: imageUrl,
      created_by: createdBy,
      created_at: new Date().toISOString(),
    };
    images.push(newImage);
    localStorage.setItem("slideshow_images", JSON.stringify(images));
    return newImage;
  }

  try {
    const { data, error } = await supabase
      .from("slideshow_images")
      .insert({
        image_url: imageUrl,
        created_by: createdBy,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error("Error adding slideshow image:", err);
    throw err;
  }
}

/**
 * Xóa ảnh khỏi slideshow
 * @param {string} id - ID ảnh cần xóa
 */
export async function deleteSlideshowImage(id) {
  if (!supabase) {
    const stored = localStorage.getItem("slideshow_images");
    const images = stored ? JSON.parse(stored) : [];
    const filtered = images.filter((img) => img.id !== id);
    localStorage.setItem("slideshow_images", JSON.stringify(filtered));
    return true;
  }

  try {
    const { error } = await supabase
      .from("slideshow_images")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error("Error deleting slideshow image:", err);
    throw err;
  }
}

/**
 * Lấy thống kê votes cho từng nominee trong một category
 * Dùng để hiển thị khi chọn winner
 */
export async function getVoteStatsForCategory(categoryId) {
  if (!supabase) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from("votes")
      .select(`
        nominee_id,
        nominee:nominee_id (
          id,
          user_name,
          full_name,
          role,
          url_avatar
        )
      `)
      .eq("category_id", categoryId);

    if (error) {
      console.error("Error fetching vote stats:", error);
      return [];
    }

    // Count votes per nominee
    const countMap = new Map();
    data.forEach((vote) => {
      const id = vote.nominee_id;
      if (!countMap.has(id)) {
        countMap.set(id, {
          nominee_id: id,
          nominee: vote.nominee,
          vote_count: 0,
        });
      }
      countMap.get(id).vote_count++;
    });

    // Convert to array and sort by vote count
    return Array.from(countMap.values()).sort((a, b) => b.vote_count - a.vote_count);
  } catch (err) {
    console.error("Error getting vote stats for category:", err);
    return [];
  }
}
