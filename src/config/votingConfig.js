/**
 * ISCGP Awards 2025 - Voting Configuration
 *
 * File này chứa dữ liệu CỐ ĐỊNH cho ứng dụng bình chọn:
 * - Danh sách các hạng mục (categories)
 * - Giá trị mặc định cho settings
 * - Các helper functions
 *
 * LƯU Ý: Danh sách ứng viên (nominees) được lấy từ database (bảng users)
 */

// =============================================
// CATEGORIES - Các hạng mục bình chọn
// =============================================
export const categories = [
  {
    id: "star-performer",
    name: "Star Performer",
    description: "Vinh danh PM, BA, DEV có hiệu suất và chất lượng công việc vượt trội. Dẫn dắt dự án về đích đúng kế hoạch với chất lượng cam kết.",
    icon: "🌟",
    type: "individual",
    role_filter: ["PM", "BA", "DEV"],
    sort_order: 1,
    // Sub-categories for Star Performer - phải chọn 4 người (1 PM, 1 BA, 2 DEV)
    sub_categories: [
      { id: "star-performer-pm", name: "PM", label: "Project Manager of the Year", role: "PM", description: "Vinh danh PM – thuyền trưởng bản lĩnh, giữ vững kiểm soát trước áp lực, dẫn dắt dự án về đích đúng kế hoạch." },
      { id: "star-performer-ba", name: "BA", label: "Business Analyst of the Year", role: "BA", description: "Vinh danh BA – 'bộ não' của dự án, chuyển hóa yêu cầu mơ hồ thành giải pháp rõ ràng và khả thi." },
      { id: "star-performer-dev", name: "DEV (1)", votingName: "DEV", label: "Software Developer of the Year", role: "DEV", description: "Vinh danh Developer tạo ra những dòng code sạch, tối ưu, dễ bảo trì." },
      { id: "star-performer-dev-2", name: "DEV (2)", label: "Software Developer of the Year", role: "DEV", description: "Vinh danh Developer tạo ra những dòng code sạch, tối ưu, dễ bảo trì.", honorOnly: true },
    ],
  },
  {
    id: "tech-leader",
    name: "Technical Leader of the Year",
    description: "Vinh danh Technical Leader – người định hướng công nghệ, đưa ra quyết định kỹ thuật đúng đắn và dẫn dắt đội ngũ giải quyết bài toán phức tạp. Luôn giữ chuẩn chất lượng và kết nối hiệu quả giữa kỹ thuật với mục tiêu.",
    icon: "⚙️",
    type: "individual",
    role_filter: ["DEV"],
    sort_order: 2,
  },
  {
    id: "unsung-hero",
    name: "Silent Contribution Excellence",
    description: "Vinh danh người âm thầm đứng sau thành công, sẵn sàng gánh vác 'việc không tên' để tập thể vận hành trơn tru. Là nguồn năng lượng tích cực, điềm tĩnh và ấm áp, góp phần kết nối đội ngũ.",
    icon: "🛡️",
    type: "individual",
    role_filter: ["PM", "BA", "DEV"],
    sort_order: 3,
  },
  {
    id: "innovator",
    name: "Innovation & AI Excellence",
    description: "Vinh danh người tiên phong ứng dụng AI và công cụ hiện đại để nâng cao hiệu suất làm việc. Không ngừng phá vỡ lối mòn, sẵn sàng chia sẻ và lan tỏa tri thức trong hành trình chuyển đổi số.",
    icon: "🚀",
    type: "individual",
    role_filter: ["PM", "BA", "DEV"],
    sort_order: 4,
  },
  {
    id: "peoples-choice",
    name: "ISCGP People's Choice",
    description: "Vinh danh 'trạm sạc năng lượng' của phòng – người luôn lan tỏa sự vui vẻ, chân thành và tinh thần kết nối. Góp phần tạo nên một tập thể gắn kết và đầy cảm hứng.",
    icon: "❤️",
    type: "individual",
    role_filter: ["PM", "BA", "DEV"],
    sort_order: 5,
  },
  {
    id: "dream-team",
    name: "The Project of the Year",
    description: "Vinh danh dự án kiểu mẫu – nơi PM-BA-DEV phối hợp hoàn hảo, về đích đúng hạn với tỷ lệ lỗi thấp, nhận feedback tốt từ khách hàng. Một team 'Happy', mọi thành viên hiểu rõ vai trò và hỗ trợ nhau nhịp nhàng.",
    icon: "💎",
    type: "project",
    role_filter: ["PROJECT"],
    sort_order: 6,
  },
  {
    id: "challenger",
    name: "The Project Challenge of the Year",
    description: "Vinh danh 'Biệt đội lính thủy đánh bộ' – dám đương đầu với thử thách khắc nghiệt, công nghệ mới, deadline cháy. Lội ngược dòng đưa dự án về trạng thái ổn định với tinh thần thép và đoàn kết.",
    icon: "🔥",
    type: "project",
    role_filter: ["PROJECT"],
    sort_order: 7,
  },

];

// =============================================
// DEFAULT SETTINGS - Giá trị mặc định cho settings
// (Sẽ được ghi đè bởi dữ liệu từ database nếu có)
// =============================================
export const defaultSettings = {
  // Thời gian mở bình chọn (ISO string)
  voting_start_time: "2025-01-15T00:00:00+07:00",

  // Thời gian đóng bình chọn (ISO string)
  voting_end_time: "2025-01-31T23:59:59+07:00",

  // Tên sự kiện
  event_name: "ISCGP Awards 2025",

  // Mô tả sự kiện
  event_description: "Giải thưởng vinh danh những cá nhân và dự án xuất sắc năm 2025",

  // Trạng thái hoạt động
  is_active: true,

  // Hiển thị Top 3 Thánh Dự Đoán trên trang kết quả
  show_top_predictors: false,
};

// =============================================
// SAMPLE NOMINEES - Mảng rỗng (dữ liệu lấy từ database)
// Chỉ dùng để fallback khi không có kết nối database
// =============================================
export const sampleNominees = [];

// =============================================
// HELPER FUNCTIONS
// =============================================

/**
 * Lấy thông tin category theo ID
 */
export function getCategoryById(categoryId) {
  for (const cat of categories) {
    if (cat.id === categoryId) {
      return { category: cat, subCategory: null };
    }
    if (cat.sub_categories) {
      const sub = cat.sub_categories.find((s) => s.id === categoryId);
      if (sub) {
        return { category: cat, subCategory: sub };
      }
    }
  }
  return null;
}

/**
 * Tính tổng số selections cần thiết cho VOTING (không tính honorOnly)
 * Sub-categories có honorOnly: true chỉ dùng cho vinh danh, không cần dự đoán
 */
export function getTotalRequiredSelections() {
  let count = 0;
  categories.forEach((cat) => {
    if (cat.sub_categories) {
      // Chỉ đếm sub-categories không phải honorOnly
      count += cat.sub_categories.filter((sub) => !sub.honorOnly).length;
    } else {
      count += 1;
    }
  });
  return count;
}

/**
 * Lấy danh sách tất cả selection IDs cho VOTING (không tính honorOnly)
 * Sub-categories có honorOnly: true chỉ dùng cho vinh danh
 */
export function getAllSelectionIds() {
  const ids = [];
  categories.forEach((cat) => {
    if (cat.sub_categories) {
      // Chỉ lấy sub-categories không phải honorOnly
      cat.sub_categories.filter((sub) => !sub.honorOnly).forEach((sub) => ids.push(sub.id));
    } else {
      ids.push(cat.id);
    }
  });
  return ids;
}

/**
 * Format tiền tệ VND
 */
export function formatCurrency(amount) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    minimumFractionDigits: 0,
  }).format(amount * 1000);
}

/**
 * Format ngày giờ tiếng Việt
 */
export function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString("vi-VN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Kiểm tra xem thời gian bình chọn có đang mở không
 */
export function isVotingOpen(settings = defaultSettings) {
  const now = new Date();
  const startTime = new Date(settings.voting_start_time);
  const endTime = new Date(settings.voting_end_time);
  return now >= startTime && now <= endTime && settings.is_active !== false;
}

/**
 * Lấy thông điệp trạng thái bình chọn
 */
export function getVotingStatusMessage(settings = defaultSettings) {
  const now = new Date();
  const startTime = new Date(settings.voting_start_time);
  const endTime = new Date(settings.voting_end_time);

  if (!settings.is_active) {
    return {
      status: "paused",
      message: "Dự đoán đang tạm dừng",
    };
  }

  if (now < startTime) {
    return {
      status: "not_started",
      message: `Dự đoán sẽ bắt đầu vào ${formatDate(settings.voting_start_time)}`,
    };
  }

  if (now > endTime) {
    return {
      status: "ended",
      message: `Dự đoán đã kết thúc vào ${formatDate(settings.voting_end_time)}`,
    };
  }

  return {
    status: "open",
    message: `Dự đoán sẽ kết thúc vào ${formatDate(settings.voting_end_time)}`,
  };
}
