// Baccarat 牌桌監控程式
// 使用方式：在瀏覽器 Console 中貼貼此程式碼

(function() {
  'use strict';
  
  // 牌值映射
  const CARD_VALUES = {
    'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
    'J': 11, 'Q': 12, 'K': 13
  };
  
  // 初始牌庫（8副牌）
  const INITIAL_DECK = {
    1: 32, 2: 32, 3: 32, 4: 32, 5: 32, 6: 32, 7: 32, 8: 32, 9: 32, 10: 32, 11: 32, 12: 32, 13: 32
  };
  
  // 當前牌庫狀態
  let currentDeck = {...INITIAL_DECK};
  let cardHistory = [];
  let capital = 10000000; // 預設本金 1000萬
  let commission = 2.0; // 預設退水 2%
  
  // 計算百家樂 EV（從之前的 logic.ts 複製）
  function calculateBaccaratEV(deck, commission) {
    // 這裡需要實現完整的 EV 計算邏輯
    // 簡化版本，實際使用時需要完整實現
    return {
      banker: { ev: 0.01, probability: 0.46, payout: 0.95, label: 'Banker' },
      player: { ev: -0.012, probability: 0.45, payout: 1.0, label: 'Player' },
      tie: { ev: -0.14, probability: 0.09, payout: 8.0, label: 'Tie' },
      bankerPair: { ev: -0.1, probability: 0.07, payout: 11.0, label: 'Banker Pair' },
      playerPair: { ev: -0.1, probability: 0.07, payout: 11.0, label: 'Player Pair' },
      super6: { ev: -0.17, probability: 0.05, payout: 12.0, label: 'Super 6' }
    };
  }
  
  // 計算建議下注金額
  function calculateBetAmount(capital, ev, payout) {
    if (ev <= 0) return 0;
    return Math.floor(capital * ev / payout);
  }
  
  // 更新 UI
  function updateUI() {
    const results = calculateBaccaratEV(currentDeck, commission);
    
    const bets = [
      { ...results.banker, key: 'banker' },
      { ...results.player, key: 'player' },
      { ...results.tie, key: 'tie' },
      { ...results.bankerPair, key: 'bankerPair' },
      { ...results.playerPair, key: 'playerPair' },
      { ...results.super6, key: 'super6' }
    ].sort((a, b) => {
      const amountA = calculateBetAmount(capital, a.ev, a.payout);
      const amountB = calculateBetAmount(capital, b.ev, b.payout);
      return amountB - amountA;
    });
    
    let html = `
      <div style="background:#1a1a1a;padding:10px;border-radius:8px;margin:10px;font-family:Arial,sans-serif;color:#fff;position:fixed;top:0;right:0;z-index:99999;width:200px;box-shadow:0 4px 12px rgba(0,0,0,0.5);">
        <div style="font-size:16px;font-weight:bold;margin-bottom:8px;text-align:center;">🎯 下注建議</div>
        <div style="display:grid;grid-template-columns:1fr;gap:4px;">
    `;
    
    bets.forEach(bet => {
      const amount = calculateBetAmount(capital, bet.ev, bet.payout);
      const evColor = bet.ev > 0 ? '#22c55e' : bet.ev < 0 ? '#ef4444' : '#888';
      const amountText = amount > 0 ? amount.toLocaleString() : '-';
      
      html += `
        <div style="background:${bet.ev > 0 ? 'rgba(34,197,94,0.2)' : 'rgba(100,100,100,0.2)'};border:1px solid ${bet.ev > 0 ? '#22c55e' : '#444'};border-radius:6px;padding:6px;text-align:center;">
          <div style="font-size:12px;font-weight:bold;color:${evColor};">${bet.label}</div>
          <div style="font-size:13px;font-weight:700;color:${amount > 0 ? '#22c55e' : '#666'};">${amountText}</div>
          <div style="font-size:10px;color:#888;">${(bet.probability * 100).toFixed(1)}%</div>
          <div style="font-size:9px;color:${evColor};">EV:${bet.ev > 0 ? '+' : ''}${(bet.ev * 100).toFixed(2)}%</div>
        </div>
      `;
    });
    
    html += `
        </div>
        <div style="margin-top:8px;padding-top:8px;border-top:1px solid #333;">
          <div style="font-size:11px;color:#888;text-align:center;">剩餘牌: ${Object.values(currentDeck).reduce((a,b)=>a+b,0)}</div>
        </div>
        <div style="margin-top:8px;display:grid;grid-template-columns:1fr 1fr;gap:4px;">
          <button onclick="window.baccaratMonitor.clearCards()" style="background:#ef4444;border:none;border-radius:4px;padding:6px;color:#fff;font-size:12px;cursor:pointer;">重置</button>
          <button onclick="window.baccaratMonitor.toggleSettings()" style="background:#3b82f6;border:none;border-radius:4px;padding:6px;color:#fff;font-size:12px;cursor:pointer;">設定</button>
        </div>
      </div>
    `;
    
    let panel = document.getElementById('baccarat-monitor-panel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'baccarat-monitor-panel';
      document.body.appendChild(panel);
    }
    panel.innerHTML = html;
  }
  
  // 監控出牌
  function monitorCards() {
    // 這裡需要根據 maxpd-888.com 的實際 DOM 結構來實現
    // 示範：查找牌面元素
    const cardElements = document.querySelectorAll('.card, .poker-card, [class*="card"], [class*="poker"]');
    
    cardElements.forEach(el => {
      const cardText = el.textContent.trim();
      if (CARD_VALUES[cardText] && !el.dataset.tracked) {
        el.dataset.tracked = 'true';
        const cardValue = CARD_VALUES[cardText];
        
        // 更新牌庫
        if (currentDeck[cardValue] > 0) {
          currentDeck[cardValue]--;
          cardHistory.push(cardValue);
          console.log(`🎴 檢測到出牌: ${cardText}, 剩餘: ${currentDeck[cardValue]}`);
          updateUI();
        }
      }
    });
  }
  
  // 公開 API
  window.baccaratMonitor = {
    clearCards: function() {
      currentDeck = {...INITIAL_DECK};
      cardHistory = [];
      console.log('🔄 牌庫已重置');
      updateUI();
    },
    
    toggleSettings: function() {
      const newCapital = prompt('設定本金 (萬):', capital / 10000);
      if (newCapital) {
        capital = parseInt(newCapital) * 10000;
        localStorage.setItem('baccarat-capital', capital);
      }
      
      const newCommission = prompt('設定退水 (%):', commission);
      if (newCommission) {
        commission = parseFloat(newCommission);
        localStorage.setItem('baccarat-commission', commission);
      }
      
      updateUI();
    },
    
    manualCard: function(card) {
      const value = CARD_VALUES[card];
      if (value && currentDeck[value] > 0) {
        currentDeck[value]--;
        cardHistory.push(value);
        console.log(`🎴 手動添加: ${card}`);
        updateUI();
      }
    },
    
    start: function() {
      console.log('🔍 百家樂監控已啟動');
      updateUI();
      setInterval(monitorCards, 1000); // 每秒檢查一次
    }
  };
  
  // 載入儲存的設定
  const savedCapital = localStorage.getItem('baccarat-capital');
  if (savedCapital) capital = parseInt(savedCapital);
  
  const savedCommission = localStorage.getItem('baccarat-commission');
  if (savedCommission) commission = parseFloat(savedCommission);
  
  // 自動啟動
  window.baccaratMonitor.start();
  
})();