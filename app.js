// app.js

class BithumbDashboard {
  constructor() {
    this.API_URL = "https://bithumb-api.onrender.com/api/ticker"; // 예시 API 주소
    this.init();
  }

  async init() {
    try {
      const data = await this.fetchAndRender();
      this.attachCoinClickListeners(data);
    } catch (error) {
      console.error("데이터 로딩 오류:", error);
    }
  }

  async fetchAndRender() {
    const response = await fetch(this.API_URL);
    const json = await response.json();
    const data = json.data;
    if (!data) throw new Error("데이터 없음");

    const tableBody = document.getElementById("market-data-body");
    tableBody.innerHTML = "";

    const signalLogBody = document.getElementById("signal-log-body");
    signalLogBody.innerHTML = "";

    const now = new Date().toLocaleTimeString();

    const resultData = Object.entries(data).slice(0, 20); // 상위 20개만 표시

    resultData.forEach(([coin, info]) => {
      const price = parseFloat(info.closing_price);
      const changeRate = parseFloat(info.fluctate_rate_24H);
      const volume = parseFloat(info.acc_trade_value_24H);

      // 가상의 보조 지표 계산
      const rsi = (Math.random() * 100).toFixed(2);
      const macd = (Math.random() * 2 - 1).toFixed(2);
      const cci = (Math.random() * 200 - 100).toFixed(2);
      const fairPrice = (price * (1 + Math.random() * 0.05 - 0.025)).toFixed(0);

      let signal = "관망";
      let reason = "-";
      if (rsi < 30 && macd > 0 && cci > 100) {
        signal = "강력매수";
        reason = "RSI < 30, MACD > 0, CCI > 100";
      } else if (rsi < 40) {
        signal = "약매수";
        reason = "RSI < 40";
      }

      // 표 렌더링
      const row = document.createElement("tr");
      row.innerHTML = `
        <td class="coin-name" data-coin="${coin}">${coin}</td>
        <td>${price.toLocaleString()}</td>
        <td>${changeRate.toFixed(2)}%</td>
        <td>${rsi}</td>
        <td>${macd}</td>
        <td>${cci}</td>
        <td>OK</td>
        <td>${volume.toLocaleString()}</td>
        <td>${parseInt(fairPrice).toLocaleString()}</td>
        <td>${signal}</td>
        <td>${reason}</td>
      `;
      tableBody.appendChild(row);

      if (signal === "강력매수") {
        const logRow = document.createElement("tr");
        logRow.innerHTML = `
          <td>${now}</td>
          <td>${coin}</td>
          <td>${price.toLocaleString()}</td>
          <td>${rsi}</td>
          <td>${macd}</td>
          <td>${cci}</td>
          <td>OK</td>
          <td>${volume.toLocaleString()}</td>
          <td>${parseInt(fairPrice).toLocaleString()}</td>
          <td>${reason}</td>
        `;
        signalLogBody.appendChild(logRow);
      }
    });

    return resultData;
  }

  attachCoinClickListeners(data) {
    document.querySelectorAll(".coin-name").forEach(td => {
      td.addEventListener("click", () => {
        const coin = td.dataset.coin;
        const frame = document.getElementById("chart-frame");
        const modal = document.getElementById("chart-modal");
        const title = document.getElementById("chart-title");

        // 예시로 TradingView 차트 사용 (변경 가능)
        frame.src = `https://s.tradingview.com/widgetembed/?symbol=${coin}KRW&interval=15&symboledit=1&toolbarbg=F1F3F6&theme=light`;
        title.textContent = `${coin} 상세 차트`;
        modal.style.display = "block";
      });
    });
  }
}

// 실행
new BithumbDashboard();
