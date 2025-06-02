// ✅ WebSocket 기반 실시간 데이터 반영 + 실시간 차트 + 설정창 닫기 기능 + 강력매수 필터링 & 1시간마다 주요코인 업데이트
class BithumDashboard {
  constructor() {
    this.apiBase = 'https://api.bithumb.com/public';
    this.marketData = new Map();
    this.selectedCoin = null;
    this.chart = null;
    this.socket = null;
    this.priceHistory = {}; // 실시간 차트용 데이터 저장
    this.strongBuyCoins = new Set();
    this.lastStrongBuyUpdate = 0;
    this.connectWebSocket();
    this.setupUIEvents();
    this.scheduleStrongBuyUpdate();
  }

  setupUIEvents() {
    const closeSettings = document.getElementById('close-settings');
    const settingsModal = document.getElementById('settings-modal');
    const settingsBtn = document.getElementById('settings-btn');

    if (closeSettings && settingsModal) {
      closeSettings.onclick = () => {
        settingsModal.classList.add('hidden');
        settingsModal.style.display = 'none';
      };
    }

    window.addEventListener('click', (e) => {
      if (e.target === settingsModal) {
        settingsModal.classList.add('hidden');
        settingsModal.style.display = 'none';
      }
    });

    if (settingsBtn && settingsModal) {
      settingsBtn.onclick = () => {
        settingsModal.classList.remove('hidden');
        settingsModal.style.display = 'flex';
      };
    }
  }

  scheduleStrongBuyUpdate() {
    this.fetchStrongBuyCoins();
    setInterval(() => this.fetchStrongBuyCoins(), 60 * 60 * 1000); // 1시간마다
  }

  async fetchStrongBuyCoins() {
    try {
      const res = await fetch(`${this.apiBase}/ticker/ALL_KRW`);
      const json = await res.json();
      const data = json.data;
      delete data.date;

      this.strongBuyCoins.clear();
      for (const [coin, info] of Object.entries(data)) {
        const chgRate = parseFloat(info.fluctate_rate_24H);
        if (chgRate > 5) { // ✅ 강력 매수 조건: 24시간 변동률 > 5%
          this.strongBuyCoins.add(coin);
        }
      }
    } catch (err) {
      console.error('StrongBuy fetch error:', err);
    }
  }

  async connectWebSocket() {
    const response = await fetch(`${this.apiBase}/ticker/ALL_KRW`);
    const json = await response.json();
    const coins = Object.keys(json.data).filter(key => key !== 'date');

    this.socket = new WebSocket('wss://pubwss.bithumb.com/pub/ws');

    this.socket.addEventListener('open', () => {
      this.socket.send(JSON.stringify({
        type: 'ticker',
        symbols: coins.map(c => `${c}_KRW`),
        tickTypes: ['24H']
      }));
    });

    this.socket.addEventListener('message', (event) => {
      const data = JSON.parse(event.data);
      if (data && data.content) {
        const coin = data.content.symbol.split('_')[0];
        if (!this.strongBuyCoins.has(coin)) return; // 강력매수 종목만 처리

        const price = Number(data.content.closePrice);
        const change24h = Number(data.content.chgRate);

        const timestamp = new Date();
        if (!this.priceHistory[coin]) this.priceHistory[coin] = [];
        this.priceHistory[coin].push({ time: timestamp, price });
        if (this.priceHistory[coin].length > 50) this.priceHistory[coin].shift();

        this.marketData.set(coin, {
          symbol: coin,
          price,
          change24h,
          rsi: 50,
          macd: { macd: 0 },
          cci: 0,
          signal: 'STRONG_BUY',
        });

        const processedData = Array.from(this.marketData.values());
        this.renderMarketTable(processedData);

        if (this.selectedCoin === coin) {
          this.updateChart(coin);
        }
      }
    });
  }

  renderMarketTable(data) {
    const tbody = document.getElementById('market-data-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    data.forEach(coin => {
      const row = document.createElement('tr');
      row.dataset.symbol = coin.symbol;
      row.innerHTML = `
        <td class="fw-bold">${coin.symbol}</td>
        <td>₩${Math.round(coin.price).toLocaleString()}</td>
        <td class="${coin.change24h >= 0 ? 'change-positive' : 'change-negative'}">
          ${coin.change24h.toFixed(2)}%
        </td>
        <td>${coin.rsi.toFixed(1)}</td>
        <td>${coin.macd.macd.toFixed(3)}</td>
        <td>${coin.cci.toFixed(1)}</td>
        <td><span class="signal signal-strong-buy">강력 매수</span></td>
        <td><button class="btn btn--sm action-button btn--primary">매수</button></td>
      `;
      row.addEventListener('click', () => {
        this.selectedCoin = coin.symbol;
        this.updateChart(coin.symbol);
      });
      tbody.appendChild(row);
    });
  }

  updateChart(symbol) {
    const ctx = document.getElementById('price-chart');
    if (!ctx) return;
    const chartContext = ctx.getContext('2d');
    const dataPoints = this.priceHistory[symbol] || [];

    const labels = dataPoints.map(p => p.time.toLocaleTimeString());
    const prices = dataPoints.map(p => p.price);

    if (this.chart) {
      this.chart.data.labels = labels;
      this.chart.data.datasets[0].data = prices;
      this.chart.update();
    } else {
      this.chart = new Chart(chartContext, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: `${symbol} 가격`,
            data: prices,
            borderColor: '#1FB8CD',
            backgroundColor: 'rgba(31, 184, 205, 0.1)',
            tension: 0.2,
            pointRadius: 2,
            pointHoverRadius: 4,
            fill: true
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: {
            intersect: false,
            mode: 'index'
          },
          scales: {
            x: {
              title: { display: true, text: '시간' }
            },
            y: {
              title: { display: true, text: '가격 (KRW)' },
              ticks: {
                callback: (value) => `₩${Math.round(value).toLocaleString()}`
              }
            }
          },
          plugins: {
            legend: { display: true },
            tooltip: {
              callbacks: {
                label: (ctx) => `₩${Math.round(ctx.parsed.y).toLocaleString()}`
              }
            }
          }
        }
      });
    }

    const chartTitle = document.getElementById('chart-title');
    if (chartTitle) chartTitle.textContent = `${symbol} 차트`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.dashboard = new BithumDashboard();
});
