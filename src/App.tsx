import { useState, useMemo, useEffect } from 'react'
import { calculateBaccaratEV } from './logic'
import type { DeckCounts, Payouts } from './logic'

const CARD_LABELS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
const INITIAL_DECK_COUNT = 32

export default function App() {
  const [showSettings, setShowSettings] = useState(false)
  const [capital, setCapital] = useState(() => {
    const saved = localStorage.getItem('baccarat-capital')
    return saved ? parseInt(saved) : 10000000
  })
  const [commission, setCommission] = useState(() => {
    const saved = localStorage.getItem('baccarat-commission')
    return saved ? parseFloat(saved) : 2.0
  })
  const [isInputFocused, setIsInputFocused] = useState(false)
  const [counts, setCounts] = useState<DeckCounts>(() => {
    const initial: DeckCounts = {}
    for (let i = 1; i <= 13; i++) {
      initial[i] = INITIAL_DECK_COUNT
    }
    return initial
  })
  const [history, setHistory] = useState<string[]>([])

  const results = useMemo(() => {
    const payouts: Payouts = {
      banker: 0.95,
      player: 1.0,
      tie: 8.0,
      playerPair: 11.0,
      bankerPair: 11.0,
      super6: 12.0
    }
    return calculateBaccaratEV(counts, payouts, commission)
  }, [counts, commission])

  const recommendations = useMemo(() => {
    const bets = [results.banker, results.player, results.tie, results.bankerPair, results.playerPair, results.super6]
    
    return bets.map(bet => {
      // 公式：本金 * EV / 赔率
      let amount = 0
      if (bet.ev > 0 && bet.payout > 0) {
        amount = Math.floor(capital * bet.ev / bet.payout)
      }
      
      return {
        type: bet.label,
        label: bet.label,
        probability: bet.probability,
        ev: bet.ev,
        amount: amount,
        payout: bet.payout
      }
    }).sort((a, b) => b.amount - a.amount)
  }, [results, capital])

  const handleNumber = (value: number) => {
    if (counts[value] <= 0) return
    const realHistory = history.filter(h => h !== '|')
    const side = realHistory.length % 2 === 0 ? 'Banker' : 'Player'
    setHistory(prev => [`${side}${CARD_LABELS[value - 1]}`, ...prev])
    setCounts(prev => ({
      ...prev,
      [value]: Math.max(0, prev[value] - 1)
    }))
  }

  const handleSeparator = () => {
    setHistory(prev => ['|', ...prev])
  }

  const handleClear = () => {
    setHistory([])
    setCounts(() => {
      const initial: DeckCounts = {}
      for (let i = 1; i <= 13; i++) {
        initial[i] = INITIAL_DECK_COUNT
      }
      return initial
    })
  }

  const handleBack = () => {
    if (history.length === 0) return
    const first = history[0]
    if (first === '|') {
      setHistory(prev => prev.slice(1))
      return
    }
    const label = first.replace('Banker', '').replace('Player', '')
    const value = CARD_LABELS.indexOf(label) + 1
    setCounts(prev => ({
      ...prev,
      [value]: Math.min(INITIAL_DECK_COUNT, prev[value] + 1)
    }))
    setHistory(prev => prev.slice(1))
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isInputFocused) return
      
      const numMap: Record<string, number> = {
        '1': 1, '2': 2, '3': 3, '4': 4, '5': 5,
        '6': 6, '7': 7, '8': 8, '9': 9
      }
      
      if (numMap.hasOwnProperty(e.key)) {
        e.preventDefault()
        const val = numMap[e.key]
        if (counts[val] > 0) handleNumber(val)
      }
      
      if (e.key === '0') {
        e.preventDefault()
        if (counts[10] > 0) handleNumber(10)
      }
      
      if (e.key === 'a' || e.key === 'A') {
        e.preventDefault()
        if (counts[1] > 0) handleNumber(1)
      }
      
      if (e.key === 't' || e.key === 'T') {
        e.preventDefault()
        if (counts[10] > 0) handleNumber(10)
      }
      
      const faceMap: Record<string, number> = {
        'j': 11, 'J': 11, 'q': 12, 'Q': 12, 'k': 13, 'K': 13
      }
      if (faceMap.hasOwnProperty(e.key)) {
        e.preventDefault()
        const val = faceMap[e.key]
        if (counts[val] > 0) handleNumber(val)
      }
      
      if (e.key === ' ') {
        e.preventDefault()
        handleSeparator()
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [history, counts])

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: '100vw',
      height: '100dvh',
      background: '#0a0a0a',
      color: '#fff',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 12px',
        flexShrink: 0
      }}>
        <button
          onClick={() => setShowSettings(!showSettings)}
          style={{
            background: '#333',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 14px',
            color: '#fff',
            fontSize: '16px',
            cursor: 'pointer'
          }}
        >
          ⚙️
        </button>
        <span style={{ color: '#22c55e', fontWeight: 'bold', fontSize: '14px' }}>
          {Object.values(counts).reduce((a, b) => a + b, 0)} cards
        </span>
        <button
          onClick={handleSeparator}
          style={{
            background: '#3b82f6',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 14px',
            color: '#fff',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          |
        </button>
      </div>

      {showSettings && (
        <div style={{
          background: '#1a1a1a',
          borderRadius: '8px',
          padding: '8px',
          margin: '0 12px 8px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '6px',
          flexShrink: 0
        }}>
          <div>
            <label style={{ display: 'block', color: '#888', fontSize: '11px', marginBottom: '4px' }}>Capital (萬)</label>
            <input
              type="number"
              value={capital / 10000}
              onChange={(e) => {
                const val = parseInt(e.target.value) || 0
                const newCapital = val * 10000
                setCapital(newCapital)
                localStorage.setItem('baccarat-capital', newCapital.toString())
              }}
              onFocus={() => setIsInputFocused(true)}
              onBlur={() => setIsInputFocused(false)}
              style={{
                width: '100%',
                background: '#333',
                border: 'none',
                borderRadius: '6px',
                padding: '8px',
                color: '#fff',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', color: '#888', fontSize: '11px', marginBottom: '4px' }}>Rebate %</label>
            <input
              type="number"
              step="0.1"
              value={commission}
              onChange={(e) => {
                const val = parseFloat(e.target.value) || 0
                setCommission(val)
                localStorage.setItem('baccarat-commission', val.toString())
              }}
              onFocus={() => setIsInputFocused(true)}
              onBlur={() => setIsInputFocused(false)}
              style={{
                width: '100%',
                background: '#333',
                border: 'none',
                borderRadius: '6px',
                padding: '8px',
                color: '#fff',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', color: '#888', fontSize: '11px', marginBottom: '4px' }}>Action</label>
            <button
              onClick={handleClear}
              style={{
                width: '100%',
                background: '#ef4444',
                border: 'none',
                borderRadius: '6px',
                padding: '8px',
                color: '#fff',
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              Clear
            </button>
          </div>
        </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '6px',
        padding: '0 12px 8px',
        flexShrink: 0
      }}>
        {recommendations.map(bet => (
          <div
            key={bet.type}
            style={{
              background: bet.ev > 0 
                ? (bet.amount > 0 ? 'rgba(34,197,94,0.3)' : 'rgba(34,197,94,0.1)') 
                : 'rgba(100,100,100,0.2)',
              border: `2px solid ${bet.ev > 0 
                ? (bet.amount > 0 ? '#22c55e' : '#166534') 
                : '#444'}`,
              borderRadius: '8px',
              padding: '6px 4px',
              textAlign: 'center'
            }}
          >
            <div style={{ 
              fontSize: '13px', 
              fontWeight: 'bold',
              color: bet.ev > 0 ? '#22c55e' : '#888'
            }}>
              {bet.label}
            </div>
            <div style={{
              fontSize: '14px', 
              fontWeight: '700',
              marginTop: '2px',
              color: bet.amount > 0 ? '#22c55e' : '#666'
            }}>
              {bet.amount > 0 ? bet.amount.toLocaleString() : (bet.ev > 0 ? '0' : '-')}
            </div>
            <div style={{ fontSize: '10px', color: '#888', marginTop: '1px' }}>
              {bet.probability < 0.01 ? '-' : `${(bet.probability * 100).toFixed(1)}%`}
            </div>
            <div style={{ 
              fontSize: '9px', 
              color: bet.ev > 0 ? '#22c55e' : '#888',
              marginTop: '1px'
            }}>
              EV:{bet.ev > 0 ? '+' : ''}{(bet.ev * 100).toFixed(2)}%
            </div>
          </div>
        ))}
      </div>

      <div style={{
        background: '#1a1a1a',
        borderRadius: '8px',
        padding: '8px',
        margin: '0 12px 8px',
        overflowX: 'auto',
        overflowY: 'hidden',
        flexShrink: 0,
        maxWidth: 'calc(100vw - 24px)'
      }}>
        <div style={{
          display: 'flex',
          gap: '4px',
          whiteSpace: 'nowrap'
        }}>
          {history.map((card, i) => (
            <div key={i} style={{
              background: card === '|' ? '#fbbf24' : '#555',
              borderRadius: '4px',
              padding: '4px 8px',
              fontSize: '12px',
              fontWeight: '700',
              color: card === '|' ? '#000' : '#fff',
              flexShrink: 0
            }}>
              {card === '|' ? '|' : CARD_LABELS.indexOf(card.replace('Banker', '').replace('Player', '')) + 1}
            </div>
          ))}
          {history.length === 0 && <span style={{ color: '#555', fontSize: '12px' }}>No cards</span>}
        </div>
      </div>

      <div style={{
        background: '#1a1a1a',
        borderRadius: '8px',
        padding: '6px',
        margin: '0 12px 8px',
        display: 'grid',
        gridTemplateColumns: 'repeat(13, 1fr)',
        gap: '2px',
        flexShrink: 0
      }}>
        {Object.entries(counts).map(([rank, count]) => (
          <div key={rank} style={{
            background: '#333',
            borderRadius: '4px',
            padding: '3px 0',
            textAlign: 'center',
            opacity: count === 0 ? 0.3 : 1
          }}>
            <div style={{ fontSize: '9px', color: '#888' }}>{CARD_LABELS[parseInt(rank) - 1]}</div>
            <div style={{ 
              fontSize: '10px', 
              fontWeight: '700', 
              color: count < 8 ? '#ef4444' : '#22c55e' 
            }}>
              {count}
            </div>
          </div>
        ))}
      </div>

      <div style={{
        background: '#0a0a0a',
        padding: '8px 12px',
        flexShrink: 0,
        marginTop: 'auto'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '6px'
        }}>
          {[7, 8, 9].map(num => (
            <button
              key={num}
              onClick={() => handleNumber(num)}
              disabled={counts[num] <= 0}
              style={{
                background: counts[num] <= 0 ? '#222' : '#333',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 4px',
                fontSize: '18px',
                fontWeight: '600',
                color: counts[num] <= 0 ? '#666' : '#fff',
                cursor: counts[num] <= 0 ? 'not-allowed' : 'pointer'
              }}
            >
              {CARD_LABELS[num - 1]}
            </button>
          ))}
          <button
            onClick={() => handleNumber(11)}
            disabled={counts[11] <= 0}
            style={{
              background: counts[11] <= 0 ? '#222' : '#333',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 4px',
              fontSize: '16px',
              color: counts[11] <= 0 ? '#666' : '#fff',
              cursor: counts[11] <= 0 ? 'not-allowed' : 'pointer'
            }}
          >
            J
          </button>

          {[4, 5, 6].map(num => (
            <button
              key={num}
              onClick={() => handleNumber(num)}
              disabled={counts[num] <= 0}
              style={{
                background: counts[num] <= 0 ? '#222' : '#333',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 4px',
                fontSize: '18px',
                fontWeight: '600',
                color: counts[num] <= 0 ? '#666' : '#fff',
                cursor: counts[num] <= 0 ? 'not-allowed' : 'pointer'
              }}
            >
              {CARD_LABELS[num - 1]}
            </button>
          ))}
          <button
            onClick={() => handleNumber(12)}
            disabled={counts[12] <= 0}
            style={{
              background: counts[12] <= 0 ? '#222' : '#333',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 4px',
              fontSize: '16px',
              color: counts[12] <= 0 ? '#666' : '#fff',
              cursor: counts[12] <= 0 ? 'not-allowed' : 'pointer'
            }}
          >
            Q
          </button>

          {[1, 2, 3].map(num => (
            <button
              key={num}
              onClick={() => handleNumber(num)}
              disabled={counts[num] <= 0}
              style={{
                background: counts[num] <= 0 ? '#222' : '#333',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 4px',
                fontSize: '18px',
                fontWeight: '600',
                color: counts[num] <= 0 ? '#666' : '#fff',
                cursor: counts[num] <= 0 ? 'not-allowed' : 'pointer'
              }}
            >
              {CARD_LABELS[num - 1]}
            </button>
          ))}
          <button
            onClick={() => handleNumber(13)}
            disabled={counts[13] <= 0}
            style={{
              background: counts[13] <= 0 ? '#222' : '#333',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 4px',
              fontSize: '16px',
              color: counts[13] <= 0 ? '#666' : '#fff',
              cursor: counts[13] <= 0 ? 'not-allowed' : 'pointer'
            }}
          >
            K
          </button>

          <button
            onClick={() => handleNumber(10)}
            disabled={counts[10] <= 0}
            style={{
              background: counts[10] <= 0 ? '#222' : '#333',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 4px',
              fontSize: '16px',
              color: counts[10] <= 0 ? '#666' : '#fff',
              cursor: counts[10] <= 0 ? 'not-allowed' : 'pointer',
              gridColumn: 'span 2'
            }}
          >
            10
          </button>

          <button
            onClick={handleBack}
            style={{
              background: '#f59e0b',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 4px',
              fontSize: '14px',
              color: '#000',
              cursor: 'pointer'
            }}
          >
            ⌫
          </button>
        </div>
      </div>
    </div>
  )
}