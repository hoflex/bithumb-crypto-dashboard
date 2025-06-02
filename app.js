// app.js (v4.1 - 오류 방지 및 API 응답 유효성 검사 추가)
class BithumbDashboard {
  constructor() {
    this.apiBase = "https://corsproxy.io/?https://api.bithumb.com/public/ticker/ALL_KRW";
    this.refreshInterval = 15 * 60 * 1000;
    this.maxCoins = 20;
    this.priceHistory = {};
    this.currentSortKey = "fluctate";
    this.sortDescending = true;
    this.coins = [];
    this.init();
  }

  async init() {
    this.bindSortEvents();
    await this.fetchAndRender();
    setInterval(() => this.fetchAndRender(), this.refreshInterval);
  }

  bindSortEvents() {
    document.querySelectorAll("#market-data thead th").forEach(th => {
      th.style.cursor = "pointer";
      th.addEventListener("click", () => {
        const keyMap = {
          "코인": "symbol",
          "현재가": "price",
          "변동률": "fluctate",
          "RSI": "rsi",
          "MACD": "macd",
          "CCI": "cci",
          "온체인": "onchain",
          "거래량": "volume",
          "적정가": "fairPrice",
          "시그널": "signal"
        };
        const header = th.textContent.trim();
        const sortKey = keyMap[header];
        if (sortKey) {
          if (this.currentSortKey === sortKey) {
            this.sortDescending = !this.sortDescending;
          } else {
            this.currentSortKey = sortKey;
            this.sortDescending = true;
          }
          this.renderTable(this.coins);
        }
      });
    });
  }

  calculateIndicators(data) {
    const close = data;
    const len = close.length;
    if (len < 14) return { rsi: 0, macd: 0, cci: 0 };

    let gains = 0, losses = 0;
    for (let i = len - 14; i < len - 1; i++) {
      const diff = close[i + 1] - close[i];
      if (diff > 0) gains += diff;
      else losses -= diff;
    }
    const avgGain = gains / 14;
    const avgLoss = losses / 14;
    const rs = avgGain / (avgLoss || 1);
    const rsi = 100 - (100 / (1 + rs));

    const ema12 = close.slice(-12).reduce((a, b) => a + b, 0) / 12;
    const ema26 = close.slice(-26).reduce((a, b) => a + b, 0) / 26;
    const macd = ema12 - ema26;

    const typical = close;
    const ma = typical.reduce((a, b) => a + b, 0) / typical.length;
    const meanDev = typical.reduce((a, b) => a + Math.abs(b - ma), 0) / typical.length;
    const cci = (typical[typical.length - 1] - ma) / (0.015 * (meanDev || 1));

    return {
      rsi: Math.round(rsi),
      macd: Math.round(macd * 100),
      cci: Math.round(cci)
    };
  }

  async fetchAndRender() {
    try {
      const res = await fetch(this.apiBase);
      const json = await res.json();

      if (!json || !json.data || typeof json.data !== 'object') {
        throw new Error("API 응답이 비어있거나 유효하지 않습니다.");
      }

      const data = json.data;
      const now = new Date().toLocaleTimeString();

      this.coins = Object.entries(data)
        .filter(([key, val]) => key !== 'date' && val && !isNaN(parseFloat(val.fluctate_rate_24H)))
        .map(([symbol, val]) => {
          const fluctate = parseFloat(val.fluctate_rate_24H);
          const price = parseFloat(val.closing_price);
          const volume = parseFloat(val.units_traded_24H);
          const onchain = Math.random() * 100;
          const fairPrice = price * 0.96;

          if (!this.priceHistory[symbol]) this.priceHistory[symbol] = [];
          this.priceHistory[symbol].push(price);
          if (this.priceHistory[symbol].length > 26) this.priceHistory[symbol].shift();

          const { rsi, macd, cci } = this.calculateIndicators(this.priceHistory[symbol]);

          let signal = "관망";
          let reason = "-";

          if (rsi > 70 && macd > 50 && cci > 100 && fluctate > 2) {
            signal = "강력매수";
            reason = `RSI(${rsi})>70, MACD(${macd})>50, CCI(${cci})>100, 변동률(${fluctate}%)>2`;
          } else if (rsi > 60 && macd > 0 && cci > 50 && fluctate > 1) {
            signal = "약매수";
            reason = `RSI(${rsi})>60, MACD(${macd})>0, CCI(${cci})>50, 변동률(${fluctate}%)>1`;
          }

          return {
            symbol,
            price,
            fluctate,
            rsi,
            macd,
            cci,
            onchain: parseFloat(onchain.toFixed(2)),
            volume: parseFloat(volume.toFixed(2)),
            fairPrice: parseFloat(fairPrice.toFixed(2)),
            signal,
            reason,
            time: now
          };
        });

      this.renderTable(this.coins);
      this.renderSignalLog(this.coins.filter(c => c.signal === "강력매수"));
    } catch (err) {
      console.error("데이터 로딩 오류:", err);
      alert("📛 데이터 불러오기 실패: API 연결에 문제가 있습니다.");
    }
  }

  renderTable(coins) {
    const tbody = document.getElementById("market-data-body");
    tbody.innerHTML = "";

    const sorted = [...coins].sort((a, b) => {
      const aVal = a[this.currentSortKey];
      const bVal = b[this.currentSortKey];
      if (typeof aVal === "string") {
        return this.sortDescending ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal);
      }
      return this.sortDescending ? bVal - aVal : aVal - bVal;
    }).slice(0, this.maxCoins);

    sorted.forEach(coin => {
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
        <td>${coin.signal === "강력매수" ? `<span title="${coin.reason}">ⓘ</span>` : ""}</td>
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
    const url = `https://www.tradingview.com/symbols/${symbol}KRW/`;
    window.open(url, '_blank');
  }

  renderMiniChart(symbol) {
    const canvas = document.getElementById(`mini-chart-${symbol}`);
    if (!canvas || !this.priceHistory[symbol]) return;
    const ctx = canvas.getContext("2d");
    const data = this.priceHistory[symbol];

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    const scaleY = 30 / Math.max(...data);
    data.forEach((val, i) => {
      const x = i * (canvas.width / (data.length - 1));
      const y = canvas.height - val * scaleY;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
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
        <td>${coin.reason}</td>
      </tr>`;
      logBody.insertAdjacentHTML("beforeend", row);
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new BithumbDashboard();
});
