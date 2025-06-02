// app.js (v3.2 with chart modal)
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
    this.setupChartModal();
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
        <td><a href="#" class="chart-link" data-symbol="${coin.symbol}">${coin.symbol}</a></td>
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
    const modal = document.getElementById("chart-modal");
    const iframe = document.getElementById("chart-frame");
    iframe.src = `https://www.tradingview.com/chart/?symbol=BITHUMB:${symbol}KRW`;
    modal.style.display = "block";
  }

  setupChartModal() {
    const modal = document.createElement("div");
    modal.id = "chart-modal";
    modal.style.cssText = `position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); display:none; justify-content:center; align-items:center; z-index:9999;`;
    modal.innerHTML = `
      <div style="position:relative; width:90%; height:90%; background:#fff;">
        <button style="position:absolute;top:10px;right:10px;z-index:1000;" onclick="document.getElementById('chart-modal').style.display='none'">닫기</button>
        <iframe id="chart-frame" style="width:100%; height:100%; border:none;"></iframe>
      </div>
    `;
    document.body.appendChild(modal);
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
