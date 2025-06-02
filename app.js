// app.js (최신 정리본)

class BithumbDashboard {
  constructor() {
    this.apiUrl = "http://localhost:5000/api/ticker"; // 로컬 서버 URL
    this.marketBody = document.getElementById("market-data-body");
    this.signalLogBody = document.getElementById("signal-log-body");
    this.init();
  }

  async init() {
    try {
      await this.fetchAndRender();
      setInterval(() => this.fetchAndRender(), 15 * 60 * 1000); // 15분마다 자동 갱신
    } catch (err) {
      console.error("초기화 오류:", err);
    }
  }

  async fetchAndRender() {
    try {
      const response = await fetch(this.apiUrl);
      const data = await response.json();
      const coins = data.data;

      // 주요코인 20개만 추출
      const mainCoins = Object.entries(coins)
        .filter(([key]) => key !== 'date')
        .slice(0, 20);

      this.marketBody.innerHTML = "";
      this.signalLogBody.innerHTML = "";

      mainCoins.forEach(([coin, info]) => {
        const price = parseFloat(info.closing_price);
        const fluctateRate = parseFloat(info.fluctate_rate_24H);

        // 지표 예시 (임의 값)
        const rsi = (Math.random() * 100).toFixed(2);
        const macd = (Math.random() * 2 - 1).toFixed(2);
        const cci = (Math.random() * 200 - 100).toFixed(2);
        const onchain = (Math.random() * 100).toFixed(2);
        const volume = parseFloat(info.units_traded_24H).toFixed(2);

        const fairPrice = (price * 0.97).toFixed(0); // 적정가 예시

        // 시그널 판별
        let signal = "관망";
        let reason = "";
        if (rsi < 30 && macd > 0 && cci > 50 && fluctateRate > 1) {
          signal = "강력매수";
          reason = "RSI 저점 + MACD 상승 + CCI 양호 + 상승률 양호";
        } else if (rsi < 40) {
          signal = "약매수";
          reason = "RSI 저점 진입";
        }

        // 테이블에 표시
        const row = `
          <tr>
            <td>${coin}</td>
            <td>${price.toLocaleString()}</td>
            <td>${fluctateRate.toFixed(2)}%</td>
            <td>${rsi}</td>
            <td>${macd}</td>
            <td>${cci}</td>
            <td>${onchain}</td>
            <td>${volume}</td>
            <td>${fairPrice}</td>
            <td>${signal}</td>
            <td>${reason}</td>
          </tr>
        `;
        this.marketBody.insertAdjacentHTML("beforeend", row);

        if (signal === "강력매수") {
          const logRow = `
            <tr>
              <td>${new Date().toLocaleTimeString()}</td>
              <td>${coin}</td>
              <td>${price.toLocaleString()}</td>
              <td>${rsi}</td>
              <td>${macd}</td>
              <td>${cci}</td>
              <td>${onchain}</td>
              <td>${volume}</td>
              <td>${fairPrice}</td>
              <td>${reason}</td>
            </tr>
          `;
          this.signalLogBody.insertAdjacentHTML("beforeend", logRow);
        }
      });

    } catch (err) {
      console.error("데이터 로딩 오류:", err);
    }
  }
}

// 실행
window.addEventListener("DOMContentLoaded", () => new BithumbDashboard());
