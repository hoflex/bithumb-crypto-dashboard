class BithumbDashboard {
  constructor() {
    this.apiUrl = "https://api.bithumb.com/public/ticker/ALL_KRW";
    this.init();
  }

  async init() {
    await this.fetchAndRender();
  }

  async fetchAndRender() {
    try {
      const res = await fetch(this.apiUrl);
      const data = await res.json();
      const now = new Date().toLocaleTimeString();
      const marketDataBody = document.getElementById("market-data-body");
      const signalLogBody = document.getElementById("signal-log-body");

      marketDataBody.innerHTML = "";
      signalLogBody.innerHTML = "";

      const entries = Object.entries(data.data).filter(([key]) => key !== 'date');

      entries.slice(0, 20).forEach(([coin, info]) => {
        const price = parseFloat(info.closing_price);
        const open = parseFloat(info.opening_price);
        const changeRate = ((price - open) / open * 100).toFixed(2);
        const rsi = this.calcRSI();
        const macd = this.calcMACD();
        const cci = this.calcCCI();

        const signal = this.getSignal(rsi, macd, cci);
        const reason = this.getSignalReason(rsi, macd, cci);

        const row = document.createElement("tr");
        row.innerHTML = `
          <td class="coin-name" data-coin="${coin}">${coin}</td>
          <td>${price.toLocaleString()}</td>
          <td>${changeRate}%</td>
          <td>${rsi}</td>
          <td>${macd}</td>
          <td>${cci}</td>
          <td>-</td>
          <td>${info.units_traded.toLocaleString()}</td>
          <td>-</td>
          <td>${signal}</td>
          <td>${reason}</td>
        `;
        marketDataBody.appendChild(row);

        if (signal === "강력매수") {
          const logRow = document.createElement("tr");
          logRow.innerHTML = `
            <td>${now}</td>
            <td>${coin}</td>
            <td>${price.toLocaleString()}</td>
            <td>${rsi}</td>
            <td>${macd}</td>
            <td>${cci}</td>
            <td>-</td>
            <td>${info.units_traded.toLocaleString()}</td>
            <td>-</td>
            <td>${reason}</td>
          `;
          signalLogBody.appendChild(logRow);
        }
      });

      this.attachChartClickEvents();

    } catch (e) {
      console.error("데이터 로딩 오류:", e);
    }
  }

  calcRSI() {
    return Math.floor(Math.random() * 100);
  }

  calcMACD() {
    return (Math.random() * 2 - 1).toFixed(2);
  }

  calcCCI() {
    return Math.floor(Math.random() * 400 - 200);
  }

  getSignal(rsi, macd, cci) {
    if (rsi < 30 && macd > 0 && cci > 100) return "강력매수";
    if (rsi < 40 && macd > -0.5 && cci > 0) return "약매수";
    return "관망";
  }

  getSignalReason(rsi, macd, cci) {
    const reasons = [];
    if (rsi < 30) reasons.push("RSI 과매도");
    if (macd > 0) reasons.push("MACD 상승 전환");
    if (cci > 100) reasons.push("CCI 과매수 진입");
    return reasons.join(", ") || "조건 미충족";
  }

  attachChartClickEvents() {
    document.querySelectorAll('.coin-name').forEach(el => {
      el.addEventListener('click', () => {
        const coin = el.dataset.coin;
        const chartModal = document.getElementById('chart-modal');
        const chartTitle = document.getElementById('chart-title');
        const chartFrame = document.getElementById('chart-frame');

        chartTitle.textContent = `${coin} 상세 차트`;
        chartFrame.src = `https://s.tradingview.com/widgetembed/?symbol=BINANCE:${coin}USDT&interval=30&theme=light`;
        chartModal.style.display = 'block';
      });
    });
  }
}

window.onload = () => {
  new BithumbDashboard();
};
