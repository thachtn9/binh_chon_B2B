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
        id: 'star-performer',
        name: 'Star Performer',
        description: 'Nhân viên Xuất sắc - Dành cho PM, BA, DEV có hiệu suất và chất lượng công việc vượt trội',
        icon: '🌟',
        type: 'individual',
        role_filter: ['PM', 'BA', 'DEV'],
        sort_order: 1,
        // Sub-categories for Star Performer - phải chọn 3 người (1 PM, 1 BA, 1 DEV)
        sub_categories: [
            { id: 'star-performer-pm', name: 'PM', label: 'Project Manager', role: 'PM' },
            { id: 'star-performer-ba', name: 'BA', label: 'Business Analyst', role: 'BA' },
            { id: 'star-performer-dev', name: 'DEV', label: 'Developer', role: 'DEV' }
        ]
    },
    {
        id: 'unsung-hero',
        name: 'The Unsung Hero',
        description: 'Người hùng Thầm lặng - Dành cho nhân tố cống hiến âm thầm, tận tụy hỗ trợ team và tập thể phòng',
        icon: '🛡️',
        type: 'individual',
        role_filter: ['PM', 'BA', 'DEV'],
        sort_order: 2
    },
    {
        id: 'innovator',
        name: 'The Innovator',
        description: 'Tiên phong Đổi mới - Dành cho người có sáng kiến công nghệ/ứng dụng AI hiệu quả và truyền cảm hứng',
        icon: '🚀',
        type: 'individual',
        role_filter: ['PM', 'BA', 'DEV'],
        sort_order: 3
    },
    {
        id: 'peoples-choice',
        name: "People's Choice",
        description: 'Nhân viên được yêu thích - Dành cho người mang lại năng lượng tích cực nhất',
        icon: '❤️',
        type: 'individual',
        role_filter: ['PM', 'BA', 'DEV'],
        sort_order: 4
    },
    {
        id: 'dream-team',
        name: 'The Dream Team',
        description: 'Dự án Xuất sắc - Hiệu quả cao, chất lượng tốt, khách hàng hài lòng',
        icon: '💎',
        type: 'project',
        role_filter: ['PROJECT'],
        sort_order: 5
    },
    {
        id: 'challenger',
        name: 'The Challenger',
        description: 'Dự án Thách thức - Vượt khó ngoạn mục, kiên cường trước áp lực',
        icon: '🔥',
        type: 'project',
        role_filter: ['PROJECT'],
        sort_order: 6
    }
]

// =============================================
// DEFAULT SETTINGS - Giá trị mặc định cho settings
// (Sẽ được ghi đè bởi dữ liệu từ database nếu có)
// =============================================
export const defaultSettings = {
    // Thời gian mở bình chọn (ISO string)
    voting_start_time: '2025-01-15T00:00:00+07:00',

    // Thời gian đóng bình chọn (ISO string)
    voting_end_time: '2025-01-31T23:59:59+07:00',

    // Số tiền mỗi lần dự đoán (VND)
    vote_cost: 10000,

    // Số tiền donate thêm vào giải thưởng (VND)
    donate_amount: 0,

    // Tên sự kiện
    event_name: 'ISCGP Awards 2025',

    // Mô tả sự kiện
    event_description: 'Giải thưởng vinh danh những cá nhân và dự án xuất sắc năm 2025',

    // Trạng thái hoạt động
    is_active: true
}

// =============================================
// SAMPLE NOMINEES - Mảng rỗng (dữ liệu lấy từ database)
// Chỉ dùng để fallback khi không có kết nối database
// =============================================
export const sampleNominees = []

// =============================================
// HELPER FUNCTIONS
// =============================================

/**
 * Lấy thông tin category theo ID
 */
export function getCategoryById(categoryId) {
    for (const cat of categories) {
        if (cat.id === categoryId) {
            return { category: cat, subCategory: null }
        }
        if (cat.sub_categories) {
            const sub = cat.sub_categories.find(s => s.id === categoryId)
            if (sub) {
                return { category: cat, subCategory: sub }
            }
        }
    }
    return null
}

/**
 * Tính tổng số selections cần thiết (bao gồm sub-categories)
 */
export function getTotalRequiredSelections() {
    let count = 0
    categories.forEach(cat => {
        if (cat.sub_categories) {
            count += cat.sub_categories.length
        } else {
            count += 1
        }
    })
    return count
}

/**
 * Lấy danh sách tất cả selection IDs (categories + sub-categories)
 */
export function getAllSelectionIds() {
    const ids = []
    categories.forEach(cat => {
        if (cat.sub_categories) {
            cat.sub_categories.forEach(sub => ids.push(sub.id))
        } else {
            ids.push(cat.id)
        }
    })
    return ids
}

/**
 * Format tiền tệ VND
 */
export function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        minimumFractionDigits: 0
    }).format(amount)
}

/**
 * Format ngày giờ tiếng Việt
 */
export function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })
}

/**
 * Kiểm tra xem thời gian bình chọn có đang mở không
 */
export function isVotingOpen(settings = defaultSettings) {
    const now = new Date()
    const startTime = new Date(settings.voting_start_time)
    const endTime = new Date(settings.voting_end_time)
    return now >= startTime && now <= endTime && settings.is_active !== false
}

/**
 * Lấy thông điệp trạng thái bình chọn
 */
export function getVotingStatusMessage(settings = defaultSettings) {
    const now = new Date()
    const startTime = new Date(settings.voting_start_time)
    const endTime = new Date(settings.voting_end_time)

    if (!settings.is_active) {
        return {
            status: 'paused',
            message: 'Bình chọn đang tạm dừng'
        }
    }

    if (now < startTime) {
        return {
            status: 'not_started',
            message: `Bình chọn sẽ bắt đầu vào ${formatDate(settings.voting_start_time)}`
        }
    }

    if (now > endTime) {
        return {
            status: 'ended',
            message: `Bình chọn đã kết thúc vào ${formatDate(settings.voting_end_time)}`
        }
    }

    return {
        status: 'open',
        message: `Bình chọn sẽ kết thúc vào ${formatDate(settings.voting_end_time)}`
    }
}
