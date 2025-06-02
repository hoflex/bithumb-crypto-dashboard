// app.js (v3.4 - 외부 차트 새창 + 미니 차트 내장 렌더링 추가)
class BithumbDashboard {
  constructor() {
    this.apiBase = "https://api.bithumb.com/public/ticker/ALL_KRW";
    this.refreshInterval = 15 * 60 * 1000; // 15분
    this.maxCoins = 20;
    this.init();
  }

  async init() {
    await this.fetchAndRender();
    setInterval(() => this.fetchAndRender(), this.refreshInterval);
  }

  async fetchAndRender() {
    try {
      const res = await fetch(this.apiBase);
      const json = await res.json();
      const data = json.data;
      const now = new Date().toLocaleTimeString();

      const processedCoins = Object.entries(data)
        .filter(([key, val]) => key !== 'date' && !isNaN(parseFloat(val.fluctate_rate_24H)))
        .map(([symbol, val]) => {
          const fluctate = parseFloat(val.fluctate_rate_24H);
          const price = parseFloat(val.closing_price);
          const volume = parseFloat(val.units_traded_24H);
          const onchain = Math.random() * 100;
          const rsi = Math.floor(50 + Math.random() * 50);
          const macd = Math.floor(50 + Math.random() * 50);
          const cci = Math.floor(50 + Math.random() * 50);
          const fairPrice = price * 0.96;

          let signal = "관망";
          if (rsi > 70 && macd > 70 && cci > 70 && fluctate > 2) {
            signal = "강력매수";
          } else if (rsi > 60 && macd > 60 && cci > 60 && fluctate > 1) {
            signal = "약매수";
          }

          return {
            symbol,
            price,
            fluctate,
            rsi,
            macd,
            cci,
            onchain: onchain.toFixed(2),
            volume: volume.toFixed(2),
            fairPrice: fairPrice.toFixed(2),
            signal,
            time: now
          };
        })
        .sort((a, b) => b.fluctate - a.fluctate)
        .slice(0, this.maxCoins);

      this.renderTable(processedCoins);
      this.renderSignalLog(processedCoins.filter(c => c.signal === "강력매수"));
    } catch (err) {
      console.error("데이터 로딩 오류:", err);
    }
  }

  renderTable(coins) {
    const tbody = document.getElementById("market-data-body");
    tbody.innerHTML = "";
    coins.forEach(coin => {
      const row = `<tr>
        <td>
          <a href="#" class="chart-link" data-symbol="${coin.symbol}">${coin.symbol}</a>
          <canvas id="mini-chart-${coin.symbol}" width="100" height="30"></canvas>
        </td>
        <td>${coin.price.toLocaleString()}</td>
        <td>${coin.fluctate}%</td>
        <td>${coin.rsi}</td>
        <td>${coin.macd}</td>
        <td>${coin.cci}</td>
        <td>${coin.onchain}</td>
        <td>${coin.volume}</td>
        <td>${coin.fairPrice}</td>
        <td>${coin.signal}</td>
        <td><button>매수</button></td>
      </tr>`;
      tbody.insertAdjacentHTML("beforeend", row);
      this.renderMiniChart(coin.symbol);
    });
    this.bindChartLinks();
  }

  bindChartLinks() {
    document.querySelectorAll(".chart-link").forEach(link => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const symbol = e.target.dataset.symbol;
        this.showChart(symbol);
      });
    });
  }

  showChart(symbol) {
    const url = `https://www.tradingview.com/symbols/${symbol}KRW/`; // faster than Bithumb page
    window.open(url, '_blank');
  }

  renderMiniChart(symbol) {
    // Generate mock mini chart data
    const canvas = document.getElementById(`mini-chart-${symbol}`);
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const data = Array.from({ length: 20 }, () => 100 + Math.random() * 10);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    ctx.moveTo(0, 30 - data[0] / 5);
    data.forEach((val, i) => {
      ctx.lineTo(i * 5, 30 - val / 5);
    });
    ctx.strokeStyle = "#00bcd4";
    ctx.stroke();
  }

  renderSignalLog(coins) {
    const logBody = document.getElementById("signal-log-body");
    logBody.innerHTML = "";
    coins.forEach(coin => {
      const row = `<tr>
        <td>${coin.time}</td>
        <td>${coin.symbol}</td>
        <td>${coin.price.toLocaleString()}</td>
        <td>${coin.rsi}</td>
        <td>${coin.macd}</td>
        <td>${coin.cci}</td>
        <td>${coin.onchain}</td>
        <td>${coin.volume}</td>
        <td>${coin.fairPrice}</td>
      </tr>`;
      logBody.insertAdjacentHTML("beforeend", row);
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new BithumbDashboard();
});
