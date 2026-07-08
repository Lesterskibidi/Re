const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const PORT = Number(process.env.PORT || 8770);
const ROOT = __dirname;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".csv": "text/csv; charset=utf-8"
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (url.pathname === "/api/quote") {
      await handleQuote(url, res);
      return;
    }

    await serveStatic(url.pathname, res);
  } catch (error) {
    sendJson(res, 500, { error: error.message || "Server error" });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Portfolio app is running at http://127.0.0.1:${PORT}/stock-portfolio.html`);
});

async function handleQuote(url, res) {
  const symbol = String(url.searchParams.get("symbol") || "").trim().toUpperCase();
  if (!symbol) {
    sendJson(res, 400, { error: "Missing symbol" });
    return;
  }

  const type = String(url.searchParams.get("type") || "crypto").trim().toLowerCase();
  const quote = String(url.searchParams.get("quote") || "").trim().toUpperCase();
  const candidates = type === "stock" ? stockSymbolCandidates(symbol) : marketSymbolCandidates(symbol, quote);
  let lastError = type === "stock" ? "Khong tim thay ma co phieu" : "Khong tim thay cap giao dich tren Binance";

  for (const candidate of candidates) {
    try {
      const marketQuote = type === "stock" ? await fetchStooqQuote(candidate) : await fetchBinanceQuote(candidate);
      sendJson(res, 200, marketQuote);
      return;
    } catch (error) {
      lastError = error.message || lastError;
    }
  }

  sendJson(res, 404, { error: lastError });
}

async function fetchStooqQuote(symbol) {
  const endpoint = `https://stooq.com/q/l/?s=${encodeURIComponent(symbol.toLowerCase())}&f=sd2t2ohlcv&h&e=csv`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);

  try {
    const response = await fetch(endpoint, {
      signal: controller.signal,
      headers: {
        "accept": "text/csv",
        "user-agent": "Mozilla/5.0"
      }
    });

    if (!response.ok) {
      throw new Error(`Stooq tra loi ${response.status}`);
    }

    const text = await response.text();
    const rows = text.trim().split(/\r?\n/);
    if (rows.length < 2) {
      throw new Error("Stooq khong co du lieu");
    }

    const values = parseCsvLine(rows[1]);
    const close = Number(values[6]);
    if (!Number.isFinite(close) || close <= 0) {
      throw new Error("Stooq chua co gia moi");
    }

    return {
      symbol,
      marketSymbol: values[0]?.toUpperCase() || symbol,
      name: values[0]?.toUpperCase() || symbol,
      price: close,
      currency: detectStockCurrency(symbol),
      marketTime: Date.now(),
      source: "Stooq"
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchBinanceQuote(symbol) {
  const hosts = [
    "https://api.binance.com",
    "https://api1.binance.com",
    "https://api2.binance.com",
    "https://api3.binance.com",
    "https://api.binance.us"
  ];
  let lastError = "Khong ket noi duoc Binance";

  for (const host of hosts) {
    let timeout;
    try {
      const controller = new AbortController();
      timeout = setTimeout(() => controller.abort(), 4000);
      const endpoint = `${host}/api/v3/ticker/price?symbol=${encodeURIComponent(symbol)}`;
      const response = await fetch(endpoint, {
        signal: controller.signal,
        headers: {
          "accept": "application/json",
          "user-agent": "Mozilla/5.0"
        }
      });
      clearTimeout(timeout);

      if (!response.ok) {
        lastError = `Binance tra loi ${response.status}`;
        continue;
      }

      const data = await response.json();
      const price = Number(data?.price);

      if (!Number.isFinite(price) || price <= 0) {
        lastError = "Binance chua co gia moi";
        continue;
      }

      const marketSymbol = String(data.symbol || symbol).toUpperCase();
      return {
        symbol: marketSymbol,
        marketSymbol,
        name: marketSymbol,
        price,
        currency: detectQuoteAsset(marketSymbol),
        marketTime: Date.now(),
        source: host.includes("binance.us") ? "Binance.US Spot" : "Binance Spot"
      };
    } catch (error) {
      lastError = error.name === "AbortError" ? "Ket noi Binance qua thoi gian cho" : error.message || lastError;
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error(lastError);
}

function marketSymbolCandidates(symbol, preferredQuote) {
  const clean = symbol.replace(/[^A-Z0-9]/g, "").toUpperCase();
  if (!clean) return [];

  const quoteAssets = unique([
    preferredQuote,
    "USDT",
    "USDC",
    "FDUSD",
    "BUSD",
    "BTC",
    "ETH",
    "BNB",
    "EUR",
    "TRY"
  ].filter(Boolean));

  if (quoteAssets.some((quote) => clean.endsWith(quote) && clean.length > quote.length)) {
    return [clean];
  }

  return quoteAssets.map((quote) => `${clean}${quote}`);
}

function stockSymbolCandidates(symbol) {
  const clean = symbol.trim().toUpperCase();
  if (!clean) return [];
  if (clean.includes(".")) return [clean];
  return [`${clean}.US`, clean];
}

function detectStockCurrency(symbol) {
  const upper = symbol.toUpperCase();
  if (upper.endsWith(".US")) return "USD";
  if (upper.endsWith(".JP")) return "JPY";
  if (upper.endsWith(".UK") || upper.endsWith(".L")) return "GBP";
  if (upper.endsWith(".DE") || upper.endsWith(".FR") || upper.endsWith(".ES") || upper.endsWith(".IT")) return "EUR";
  return "USD";
}

function parseCsvLine(line) {
  const cells = [];
  let current = "";
  let quoted = false;
  for (const char of line) {
    if (char === "\"") {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells;
}

function detectQuoteAsset(symbol) {
  const quoteAssets = ["USDT", "USDC", "FDUSD", "BUSD", "BTC", "ETH", "BNB", "EUR", "TRY"];
  return quoteAssets.find((quote) => symbol.endsWith(quote) && symbol.length > quote.length) || "";
}

function unique(items) {
  return Array.from(new Set(items));
}

async function serveStatic(pathname, res) {
  const requested = pathname === "/" ? "/stock-portfolio.html" : pathname;
  const filePath = path.resolve(ROOT, `.${decodeURIComponent(requested)}`);

  if (!filePath.startsWith(ROOT)) {
    sendText(res, 403, "Forbidden");
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      sendText(res, 404, "Not found");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "content-type": MIME_TYPES[ext] || "application/octet-stream",
      "cache-control": "no-store"
    });
    res.end(content);
  });
}

function sendJson(res, status, body) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
    "cache-control": "no-store"
  });
  res.end(JSON.stringify(body));
}

function sendText(res, status, text) {
  res.writeHead(status, {
    "content-type": "text/plain; charset=utf-8",
    "cache-control": "no-store"
  });
  res.end(text);
}
