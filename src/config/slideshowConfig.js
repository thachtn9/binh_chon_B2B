/**
 * Slideshow Configuration
 *
 * openingSlides: Ảnh hiển thị full-screen ở đầu slideshow
 *
 * Cập nhật URL cho từng slide theo thứ tự mong muốn.
 * Slide có url rỗng ("") sẽ bị bỏ qua.
 */
const slideshowConfig = {
  // Số ảnh preload trước (tối ưu hiệu năng)
  preloadAhead: 10,

  // Ảnh mở đầu - hiển thị full-screen trước khi vào danh sách nominees
  openingSlides: [
    {
      id: "opening-1",
      url: "https://i.postimg.cc/7PcLcgjT/1.png",
      alt: "ISCGP Awards 2025 - Welcome",
    },
    {
      id: "opening-2",
      url: "https://i.postimg.cc/C1hZhS48/2.png",
      alt: "ISCGP Awards 2025 - Introduction",
    },
    {
      id: "opening-3",
      url: "https://i.postimg.cc/MZ4G4ygM/3.png",
      alt: "ISCGP Awards 2025 - Categories",
    },
    {
      id: "opening-4",
      url: "https://i.postimg.cc/RC808c2J/4.png",
      alt: "ISCGP Awards 2025 - Rules",
    },
    {
      id: "opening-5",
      url: "https://i.postimg.cc/rybpbS7W/5.png",
      alt: "ISCGP Awards 2025 - Let's Begin",
    },
  ],
};

export default slideshowConfig;
