import { useState, useEffect } from "react";
import { useVote } from "../context/VoteContext";

export default function CountdownTimer() {
  const { settings, settingsLoading, isVotingOpen, votingStatus } = useVote();
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    if (settingsLoading || !settings.voting_end_time) return;

    const calculateTimeLeft = () => {
      const endTime = new Date(settings.voting_end_time).getTime();
      const now = new Date().getTime();
      const difference = endTime - now;

      if (difference <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0 };
      }

      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((difference % (1000 * 60)) / 1000),
      };
    };

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    // Set initial value immediately
    setTimeLeft(calculateTimeLeft());

    return () => clearInterval(timer);
  }, [settings.voting_end_time, settingsLoading]);

  if (settingsLoading) {
    return null;
  }

  // Nếu chưa bắt đầu
  if (votingStatus.status === "not_started") {
    return (
      <div className="countdown-container countdown-not-started">
        <div className="countdown-label">Dự đoán sẽ bắt đầu sau</div>
        <CountdownDisplay targetTime={settings.voting_start_time} />
      </div>
    );
  }

  // Nếu đã kết thúc hoặc tạm dừng
  if (votingStatus.status === "ended" || votingStatus.status === "paused") {
    return (
      <div className="countdown-container countdown-ended">
        <div className="countdown-label">{votingStatus.status === "ended" ? "Dự đoán đã kết thúc" : "Dự đoán đang tạm dừng"}</div>
        <div className="countdown-message">{votingStatus.message}</div>
      </div>
    );
  }

  // Đang mở
  return (
    <div className="countdown-container countdown-active">
      <div className="countdown-label">Thời gian còn lại để dự đoán</div>
      <div className="countdown-timer">
        <div className="countdown-item">
          <span className="countdown-value">{String(timeLeft.days).padStart(2, "0")}</span>
          <span className="countdown-unit">Ngày</span>
        </div>
        <div className="countdown-separator">:</div>
        <div className="countdown-item">
          <span className="countdown-value">{String(timeLeft.hours).padStart(2, "0")}</span>
          <span className="countdown-unit">Giờ</span>
        </div>
        <div className="countdown-separator">:</div>
        <div className="countdown-item">
          <span className="countdown-value">{String(timeLeft.minutes).padStart(2, "0")}</span>
          <span className="countdown-unit">Phút</span>
        </div>
        <div className="countdown-separator">:</div>
        <div className="countdown-item">
          <span className="countdown-value">{String(timeLeft.seconds).padStart(2, "0")}</span>
          <span className="countdown-unit">Giây</span>
        </div>
      </div>
    </div>
  );
}

// Component phụ cho countdown khi chưa bắt đầu
function CountdownDisplay({ targetTime }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const target = new Date(targetTime).getTime();
      const now = new Date().getTime();
      const difference = target - now;

      if (difference <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0 };
      }

      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((difference % (1000 * 60)) / 1000),
      };
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [targetTime]);

  return (
    <div className="countdown-timer">
      <div className="countdown-item">
        <span className="countdown-value">{String(timeLeft.days).padStart(2, "0")}</span>
        <span className="countdown-unit">Ngày</span>
      </div>
      <div className="countdown-separator">:</div>
      <div className="countdown-item">
        <span className="countdown-value">{String(timeLeft.hours).padStart(2, "0")}</span>
        <span className="countdown-unit">Giờ</span>
      </div>
      <div className="countdown-separator">:</div>
      <div className="countdown-item">
        <span className="countdown-value">{String(timeLeft.minutes).padStart(2, "0")}</span>
        <span className="countdown-unit">Phút</span>
      </div>
      <div className="countdown-separator">:</div>
      <div className="countdown-item">
        <span className="countdown-value">{String(timeLeft.seconds).padStart(2, "0")}</span>
        <span className="countdown-unit">Giây</span>
      </div>
    </div>
  );
}
