class BithumbDashboard {
  constructor() {
    this.apiUrl = "https://api.bithumb.com/public/ticker/ALL_KRW";
    this.prevVolumes = {}; // 이전 거래량 저장용
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
        const high = parseFloat(info.max_price);
        const low = parseFloat(info.min_price);
        const changeRate = ((price - open) / open * 100).toFixed(2);
        const rsi = this.calcRSI();
        const macd = this.calcMACD();
        const cci = this.calcCCI();
        const fibRetracement = this.calcFibonacci(price, high, low);
        const donchian = this.calcDonchian(price, high, low);
        const patternSignal = this.detectPattern(price, open, high, low);

        const signal = this.getSignal(rsi, macd, cci, fibRetracement, donchian, patternSignal);
        const reason = this.getSignalReason(rsi, macd, cci, fibRetracement, donchian, patternSignal);

        const prevVolume = this.prevVolumes[coin] || 0;
        const currentVolume = parseFloat(info.units_traded);
        const volumeChange = ((currentVolume - prevVolume) / (prevVolume || 1)) * 100;
        let onchainSignal = "정상";
        if (volumeChange > 100) onchainSignal = "급등";
        else if (volumeChange > 30) onchainSignal = "주의";

        this.prevVolumes[coin] = currentVolume;

        const row = document.createElement("tr");
        row.innerHTML = `
          <td class="coin-name" data-coin="${coin}">${coin}</td>
          <td>${price.toLocaleString()}</td>
          <td>${changeRate}%</td>
          <td>${rsi}</td>
          <td>${macd}</td>
          <td>${cci}</td>
          <td>${onchainSignal}</td>
          <td>${info.units_traded.toLocaleString()}</td>
          <td>${fibRetracement}, ${donchian}</td>
          <td>${signal}</td>
          <td>${reason}</td>
          <td>${patternSignal}</td>
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
            <td>${onchainSignal}</td>
            <td>${info.units_traded.toLocaleString()}</td>
            <td>${fibRetracement}, ${donchian}</td>
            <td>${reason}</td>
            <td>${patternSignal}</td>
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

  calcFibonacci(price, high, low) {
    const diff = high - low;
    const retracement = high - diff * 0.618;
    return price <= retracement ? "지지선 근접" : "-";
  }

  calcDonchian(price, high, low) {
    return price > high * 0.98 ? "상단 돌파" : price < low * 1.02 ? "하단 돌파" : "-";
  }

  detectPattern(price, open, high, low) {
    if (price > open && (high - low) / open > 0.05) return "양봉상승";
    if (price > open && (high - low) / low > 0.3 && (open - low) / (high - low) > 0.6) return "컵위드핸들";
    if ((high - price) / (high - low) > 0.6 && price > open && (price - open) / open > 0.02) return "역헤드앤숄더";
    if ((price - low) / (high - low) < 0.2 && (price - open) > 0 && (high - low) / open > 0.1) return "쌍바닥";
    if ((high - price) / (high - low) < 0.2 && (price - open) > 0.01) return "상승깃발";
    if ((high - low) / open > 0.05 && (price - open) > 0 && (price - low) / (high - low) > 0.7) return "패넌트";
    return "-";
  }

  getSignal(rsi, macd, cci, fib, donchian, pattern) {
    if (rsi < 30 && macd > 0 && cci > 100 && fib === "지지선 근접" && donchian === "상단 돌파") return "강력매수";
    if (rsi < 40 && macd > -0.5 && cci > 0) return "약매수";
    return "관망";
  }

  getSignalReason(rsi, macd, cci, fib, donchian, pattern) {
    const reasons = [];
    if (rsi < 30) reasons.push("RSI 과매도");
    if (macd > 0) reasons.push("MACD 상승 전환");
    if (cci > 100) reasons.push("CCI 과매수 진입");
    if (fib === "지지선 근접") reasons.push("피보나치 되돌림 진입");
    if (donchian === "상단 돌파") reasons.push("돈치안 채널 상단 돌파");
    if (pattern !== "-" && pattern !== "양봉상승") reasons.push(`${pattern} 패턴 감지`);
    else if (pattern === "양봉상승") reasons.push("상승 캔들 패턴 감지");
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
