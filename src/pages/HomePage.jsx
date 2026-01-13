import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import TotalPrize from "../components/TotalPrize";
import CountdownTimer from "../components/CountdownTimer";
import { categories } from "../lib/supabase";

export default function HomePage() {
  const { user, signInWithGoogle } = useAuth();

  const individualCategories = categories.filter((c) => c.type === "individual");
  const projectCategories = categories.filter((c) => c.type === "project");

  return (
    <main>
      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          <h1 className="hero-title">ISCGP Awards 2025</h1>
          <p className="hero-subtitle">Vinh danh những cá nhân và dự án xuất sắc nhất năm 2025. Hãy cùng dự đoán những người xứng đáng!</p>

          <TotalPrize />

          <div style={{ display: "flex", gap: "1rem", justifyContent: "center", marginTop: "2rem" }}>
            {user ? (
              <Link to="/vote" className="btn btn-gold btn-lg">
                🗳️ Bắt đầu dự đoán
              </Link>
            ) : (
              <button onClick={signInWithGoogle} className="btn btn-gold btn-lg">
                🔐 Đăng nhập với Google
              </button>
            )}
            <button onClick={() => document.getElementById("categories-section").scrollIntoView({ behavior: "smooth" })} className="btn btn-secondary btn-lg">
              Xem các hạng mục
            </button>
          </div>

          <CountdownTimer />
        </div>
      </section>

      {/* Categories Overview */}
      <section id="categories-section" className="categories-section">
        <div className="container">
          {/* Individual Categories */}
          <div className="section-title">
            <h2>👤 Hạng mục Cá nhân</h2>
          </div>
          <div className="categories-grid" style={{ marginBottom: "3rem" }}>
            {individualCategories.map((category) => (
              <div key={category.id} className="glass-card" style={{ textAlign: "center" }}>
                <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>{category.icon}</div>
                <h3 style={{ marginBottom: "0.5rem" }}>{category.name}</h3>
                <p style={{ fontSize: "0.875rem" }}>{category.description}</p>
              </div>
            ))}
          </div>

          {/* Project Categories */}
          <div className="section-title">
            <h2>📁 Hạng mục Dự án</h2>
          </div>
          <div className="categories-grid">
            {projectCategories.map((category) => (
              <div key={category.id} className="glass-card" style={{ textAlign: "center" }}>
                <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>{category.icon}</div>
                <h3 style={{ marginBottom: "0.5rem" }}>{category.name}</h3>
                <p style={{ fontSize: "0.875rem" }}>{category.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section style={{ padding: "3rem 0", borderTop: "1px solid var(--glass-border)" }}>
        <div className="container">
          <div className="section-title">
            <h2>📋 Cách thức dự đoán</h2>
          </div>
          <div className="categories-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))" }}>
            <div className="glass-card" style={{ textAlign: "center" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>1️⃣</div>
              <h4>Đăng nhập</h4>
              <p style={{ fontSize: "0.875rem" }}>Đăng nhập bằng tài khoản Google của bạn</p>
            </div>
            <div className="glass-card" style={{ textAlign: "center" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>2️⃣</div>
              <h4>Chọn ứng viên</h4>
              <p style={{ fontSize: "0.875rem" }}>Chọn 1 ứng viên cho mỗi hạng mục bạn muốn dự đoán</p>
            </div>
            <div className="glass-card" style={{ textAlign: "center" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>3️⃣</div>
              <h4>Xác nhận</h4>
              <p style={{ fontSize: "0.875rem" }}>Mỗi hạng mục dự đoán = 10.000 VND</p>
            </div>
            <div className="glass-card" style={{ textAlign: "center" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>4️⃣</div>
              <h4>Theo dõi</h4>
              <p style={{ fontSize: "0.875rem" }}>Xem lịch sử dự đoán và tổng số tiền đã đóng góp</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
