// app.js (v3.6 - 테이블 헤더 클릭 정렬 기능 추가 + 미니차트 실시간 반영)
class BithumbDashboard {
  constructor() {
    this.apiBase = "https://api.bithumb.com/public/ticker/ALL_KRW";
    this.refreshInterval = 15 * 60 * 1000; // 15분
    this.maxCoins = 20;
    this.priceHistory = {}; // 각 코인의 가격 히스토리 저장용
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

  async fetchAndRender() {
    try {
      const res = await fetch(this.apiBase);
      const json = await res.json();
      const data = json.data;
      const now = new Date().toLocaleTimeString();

      this.coins = Object.entries(data)
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

          // 가격 히스토리 저장
          if (!this.priceHistory[symbol]) {
            this.priceHistory[symbol] = [];
          }
          this.priceHistory[symbol].push(price);
          if (this.priceHistory[symbol].length > 20) {
            this.priceHistory[symbol].shift();
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
            time: now
          };
        });

      this.renderTable(this.coins);
      this.renderSignalLog(this.coins.filter(c => c.signal === "강력매수"));
    } catch (err) {
      console.error("데이터 로딩 오류:", err);
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
      </tr>`;
      logBody.insertAdjacentHTML("beforeend", row);
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new BithumbDashboard();
});
