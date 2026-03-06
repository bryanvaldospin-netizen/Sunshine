'use client';

import React, { useEffect, useRef, memo } from 'react';

function TradingViewTicker() {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Ensure the script is not added multiple times
    if (container.current && !container.current.querySelector('script')) {
      const script = document.createElement('script');
      script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js';
      script.type = 'text/javascript';
      script.async = true;
      script.innerHTML = JSON.stringify({
        "symbols": [
          { "proName": "NASDAQ:AAPL", "title": "Apple" },
          { "proName": "NASDAQ:NVDA", "title": "Nvidia" },
          { "proName": "NYSE:KO", "title": "Coca-Cola" },
          { "proName": "NASDAQ:PEP", "title": "PepsiCo" },
          { "proName": "NASDAQ:AMZN", "title": "Amazon" },
          { "proName": "BITSTAMP:BTCUSD", "title": "Bitcoin" }
        ],
        "showSymbolLogo": true,
        "colorTheme": "dark",
        "isTransparent": false,
        "displayMode": "adaptive",
        "locale": "en"
      });
      container.current.appendChild(script);
    }
  }, []);

  return (
    <div className="tradingview-widget-container" ref={container} style={{ height: "72px" }}>
      <div className="tradingview-widget-container__widget" style={{ height: "100%" }}></div>
    </div>
  );
}

export default memo(TradingViewTicker);
