// app.js
class BithumbDashboard {
  constructor() {
    this.apiUrl = 'https://corsproxy.io/?https://api.bithumb.com/public/ticker/ALL_KRW';
    this.init();
  }

  async init() {
    try {
      const data = await this.fetchMarketData();
      if (data) this.renderMarketTable(data);
    } catch (err) {
      console.error('데이터 로딩 실패:', err);
    }
  }

  async fetchMarketData() {
    try {
      const res = await fetch(this.apiUrl);
      const json = await res.json();
      if (!json || !json.data) throw new Error('API 응답 오류');
      return json.data;
    } catch (err) {
      console.error('API 호출 실패:', err);
      return null;
    }
  }

  renderMarketTable(data) {
    const tbody = document.getElementById('market-data-body');
    tbody.innerHTML = '';

    const signalLog = document.getElementById('signal-log-body');
    signalLog.innerHTML = '';

    const topCoins = Object.entries(data)
      .filter(([symbol, val]) => symbol !== 'date' && val && typeof val === 'object')
      .slice(0, 20);

    topCoins.forEach(([symbol, val]) => {
      const price = parseFloat(val.closing_price);
      const changeRate = parseFloat(val.fluctate_rate_24H);

      const rsi = (Math.random() * 100).toFixed(1);
      const macd = (Math.random() * 2 - 1).toFixed(2);
      const cci = (Math.random() * 400 - 200).toFixed(0);
      const onchain = (Math.random() * 100).toFixed(0);
      const volume = parseFloat(val.units_traded_24H).toFixed(2);
      const fairPrice = (price * (0.95 + Math.random() * 0.1)).toFixed(0);

      let signal = '관망';
      let reason = '';
      if (rsi < 30 && macd > 0 && cci < -100) {
        signal = '강력매수';
        reason = 'RSI 저점, MACD 양전환, CCI 과매도';
      } else if (rsi < 40) {
        signal = '약매수';
        reason = 'RSI 저점권';
      }

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${symbol}</td>
        <td>${price.toLocaleString()}</td>
        <td>${changeRate.toFixed(2)}%</td>
        <td>${rsi}</td>
        <td>${macd}</td>
        <td>${cci}</td>
        <td>${onchain}</td>
        <td>${volume}</td>
        <td>${fairPrice}</td>
        <td>${signal}</td>
        <td>${reason}</td>
      `;
      tbody.appendChild(tr);

      if (signal === '강력매수') {
        const logTr = document.createElement('tr');
        const time = new Date().toLocaleTimeString();
        logTr.innerHTML = `
          <td>${time}</td>
          <td>${symbol}</td>
          <td>${price.toLocaleString()}</td>
          <td>${rsi}</td>
          <td>${macd}</td>
          <td>${cci}</td>
          <td>${onchain}</td>
          <td>${volume}</td>
          <td>${fairPrice}</td>
          <td>${reason}</td>
        `;
        signalLog.appendChild(logTr);
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', () => new BithumbDashboard());
