-- =============================================
-- ISCGP Awards 2025 - Database Schema
-- Copy and run this SQL in your Supabase SQL Editor
-- =============================================
-- 
-- LƯU Ý: Categories được lưu cứng trong file config
-- Database lưu: users (nominees), votes, vote_sessions, và settings
-- 
-- QUYỀN BÌNH CHỌN: Chỉ user có trong bảng users (PM, BA, DEV) mới được vote
-- User role = PROJECT là dự án, không được vote
-- =============================================

-- 1. USERS TABLE (Nominees)
-- Thông tin ứng viên - chỉ những người trong bảng này mới có quyền bình chọn
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_name VARCHAR(100) NOT NULL,
  full_name VARCHAR(200),
  email VARCHAR(255) UNIQUE NOT NULL,
  -- Role: PM, BA, DEV = cá nhân (có quyền vote); PROJECT = dự án (không vote)
  role VARCHAR(20) NOT NULL CHECK (role IN ('PM', 'BA', 'DEV', 'PROJECT')),
  is_admin BOOLEAN DEFAULT FALSE,
  url_avatar TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. VOTE_SESSIONS TABLE
-- Phiên bình chọn (gom nhóm các vote trong 1 lần submit)
CREATE TABLE IF NOT EXISTS vote_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  voter_id UUID REFERENCES users(id) ON DELETE SET NULL,
  voter_email VARCHAR(255) NOT NULL,
  voter_name VARCHAR(100),
  total_categories INT NOT NULL,
  total_amount INT NOT NULL, -- VND
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. VOTES TABLE
-- Chi tiết từng phiếu bầu
-- category_id là string ID từ file config (không phải UUID)
CREATE TABLE IF NOT EXISTS votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES vote_sessions(id) ON DELETE CASCADE,
  voter_id UUID REFERENCES users(id) ON DELETE SET NULL,
  voter_email VARCHAR(255) NOT NULL,
  
  -- Category ID từ file config (string)
  category_id VARCHAR(50) NOT NULL,
  category_name VARCHAR(100),
  
  -- Nominee từ bảng users
  nominee_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Số người dự đoán giống (user dự đoán sẽ có bao nhiêu người chọn giống mình)
  predicted_count INT DEFAULT 0,
  
  amount INT DEFAULT 10000,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. COMMENTS TABLE
-- Bình luận cho các đề cử (nominees)
CREATE TABLE IF NOT EXISTS comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  -- Người được comment (nominee)
  nominee_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  -- Người comment
  commenter_id UUID REFERENCES users(id) ON DELETE SET NULL,
  commenter_email VARCHAR(255) NOT NULL,
  commenter_name VARCHAR(100),
  commenter_avatar TEXT,
  -- Nội dung comment
  content TEXT NOT NULL,
  -- Comment ẩn danh (không hiển thị tên người comment)
  is_anonymous BOOLEAN DEFAULT FALSE,
  -- Trạng thái (để có thể ẩn/xóa comment không phù hợp)
  is_visible BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. SETTINGS TABLE
-- Cấu hình bình chọn (chỉ có 1 row duy nhất với key = 'voting_config')
CREATE TABLE IF NOT EXISTS settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key VARCHAR(50) UNIQUE NOT NULL,
  
  -- Thời gian bình chọn
  voting_start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  voting_end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Số tiền mỗi lần dự đoán (VND)
  vote_cost INT NOT NULL DEFAULT 10000,
  
  -- Thông tin sự kiện
  event_name VARCHAR(200) DEFAULT 'ISCGP Awards 2025',
  event_description TEXT,
  
  -- Trạng thái (có thể dùng để tạm dừng bình chọn)
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_votes_voter_email ON votes(voter_email);
CREATE INDEX IF NOT EXISTS idx_votes_category_id ON votes(category_id);
CREATE INDEX IF NOT EXISTS idx_votes_nominee_id ON votes(nominee_id);
CREATE INDEX IF NOT EXISTS idx_votes_session_id ON votes(session_id);
CREATE INDEX IF NOT EXISTS idx_votes_voter_id ON votes(voter_id);
CREATE INDEX IF NOT EXISTS idx_vote_sessions_voter_id ON vote_sessions(voter_id);
CREATE INDEX IF NOT EXISTS idx_vote_sessions_voter_email ON vote_sessions(voter_email);
CREATE INDEX IF NOT EXISTS idx_comments_nominee_id ON comments(nominee_id);
CREATE INDEX IF NOT EXISTS idx_comments_commenter_email ON comments(commenter_email);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at);

-- =============================================
-- VIEWS
-- =============================================

-- View: Thống kê votes cho mỗi nominee theo category
CREATE OR REPLACE VIEW nominee_vote_stats AS
SELECT 
  u.id as nominee_id,
  u.user_name as nominee_name,
  u.full_name as nominee_full_name,
  u.role as nominee_role,
  u.url_avatar as nominee_avatar,
  v.category_id,
  v.category_name,
  COUNT(v.id) as total_votes,
  COALESCE(SUM(v.amount), 0) as total_amount
FROM users u
LEFT JOIN votes v ON v.nominee_id = u.id
WHERE u.role IN ('PM', 'BA', 'DEV', 'PROJECT')
GROUP BY u.id, u.user_name, u.full_name, u.role, u.url_avatar, v.category_id, v.category_name;

-- View: Tổng giá trị giải thưởng
CREATE OR REPLACE VIEW total_prize_view AS
SELECT 
  COALESCE(SUM(amount), 0) as total_prize_value,
  COUNT(*) as total_votes,
  COUNT(DISTINCT session_id) as total_sessions
FROM votes;

-- View: Leaderboard theo category
CREATE OR REPLACE VIEW category_leaderboard AS
SELECT 
  v.category_id,
  v.category_name,
  u.id as nominee_id,
  u.user_name as nominee_name,
  u.full_name as nominee_full_name,
  u.url_avatar as nominee_avatar,
  u.role as nominee_role,
  COUNT(v.id) as vote_count,
  COALESCE(SUM(v.amount), 0) as total_amount,
  RANK() OVER (PARTITION BY v.category_id ORDER BY COUNT(v.id) DESC) as rank
FROM votes v
JOIN users u ON v.nominee_id = u.id
GROUP BY v.category_id, v.category_name, u.id, u.user_name, u.full_name, u.url_avatar, u.role
ORDER BY v.category_id, rank;

-- View: Thống kê theo voter
CREATE OR REPLACE VIEW voter_stats AS
SELECT 
  v.voter_id,
  v.voter_email,
  v.voter_name,
  u.full_name as voter_full_name,
  COUNT(DISTINCT v.session_id) as total_sessions,
  COUNT(*) as total_votes,
  COALESCE(SUM(v.amount), 0) as total_spent
FROM votes v
LEFT JOIN users u ON v.voter_id = u.id
GROUP BY v.voter_id, v.voter_email, v.voter_name, u.full_name;

-- View: Danh sách tất cả các lượt vote (Report)
CREATE OR REPLACE VIEW all_votes_report AS
SELECT 
  v.id as vote_id,
  v.session_id,
  v.created_at as vote_time,
  -- Thông tin người vote
  v.voter_id,
  v.voter_email,
  v.voter_name,
  voter.full_name as voter_full_name,
  voter.role as voter_role,
  -- Thông tin category
  v.category_id,
  v.category_name,
  -- Thông tin nominee được vote
  v.nominee_id,
  nominee.user_name as nominee_name,
  nominee.full_name as nominee_full_name,
  nominee.role as nominee_role,
  nominee.url_avatar as nominee_avatar,
  -- Số tiền
  v.amount
FROM votes v
LEFT JOIN users voter ON v.voter_id = voter.id
LEFT JOIN users nominee ON v.nominee_id = nominee.id
ORDER BY v.created_at DESC;

-- View: Thống kê lượt vote theo userName, sắp xếp vote nhiều lên trên
CREATE OR REPLACE VIEW voter_ranking_report AS
SELECT 
  v.voter_id,
  v.voter_email,
  v.voter_name,
  u.full_name as voter_full_name,
  u.role as voter_role,
  u.url_avatar as voter_avatar,
  COUNT(DISTINCT v.session_id) as total_sessions,
  COUNT(*) as total_votes,
  COUNT(DISTINCT v.category_id) as categories_voted,
  COALESCE(SUM(v.amount), 0) as total_spent,
  MIN(v.created_at) as first_vote_time,
  MAX(v.created_at) as last_vote_time
FROM votes v
LEFT JOIN users u ON v.voter_id = u.id
GROUP BY v.voter_id, v.voter_email, v.voter_name, u.full_name, u.role, u.url_avatar
ORDER BY total_votes DESC, total_spent DESC;

-- =============================================
-- FUNCTIONS
-- =============================================

-- Function: Cập nhật updated_at tự động
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_settings_updated_at ON settings;
CREATE TRIGGER update_settings_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- INSERT DEFAULT SETTINGS
-- =============================================
INSERT INTO settings (key, voting_start_time, voting_end_time, vote_cost, event_name, event_description, is_active) 
VALUES (
  'voting_config',
  '2025-01-15 00:00:00+07',
  '2025-01-31 23:59:59+07',
  10000,
  'ISCGP Awards 2025',
  'Giải thưởng vinh danh những cá nhân và dự án xuất sắc năm 2025',
  TRUE
)
ON CONFLICT (key) DO NOTHING;

-- =============================================
-- INSERT USERS - Sử dụng file insert_users.sql riêng
-- =============================================
-- Xem file insert_users.sql để thêm dữ liệu users thật
-- Đừng dùng dữ liệu mẫu trong production

-- =============================================
-- ROW LEVEL SECURITY (Optional - for production)
-- =============================================
-- Uncomment these if you want to enable RLS

-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE vote_sessions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- -- Everyone can read users (nominees)
-- CREATE POLICY "Users are viewable by everyone" ON users FOR SELECT USING (true);

-- -- Everyone can read settings
-- CREATE POLICY "Settings are viewable by everyone" ON settings FOR SELECT USING (true);

-- -- Only admins can update settings
-- CREATE POLICY "Only admins can update settings" ON settings FOR UPDATE 
--   USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true));

-- -- Only users in the users table with role PM/BA/DEV can insert votes
-- CREATE POLICY "Only registered members can vote" ON votes 
--   FOR INSERT WITH CHECK (
--     EXISTS (SELECT 1 FROM users WHERE email = auth.jwt() ->> 'email' AND role IN ('PM', 'BA', 'DEV'))
--   );

-- -- Users can view their own votes or admins can view all
-- CREATE POLICY "Users can view votes" ON votes 
--   FOR SELECT USING (voter_email = auth.jwt() ->> 'email' OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true));

-- -- Only users in the users table with role PM/BA/DEV can insert vote sessions
-- CREATE POLICY "Only registered members can create vote sessions" ON vote_sessions 
--   FOR INSERT WITH CHECK (
--     EXISTS (SELECT 1 FROM users WHERE email = auth.jwt() ->> 'email' AND role IN ('PM', 'BA', 'DEV'))
--   );

-- -- Users can view their own vote sessions
-- CREATE POLICY "Users can view vote_sessions" ON vote_sessions 
--   FOR SELECT USING (voter_email = auth.jwt() ->> 'email' OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true));
