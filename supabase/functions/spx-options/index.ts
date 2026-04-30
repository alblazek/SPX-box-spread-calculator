import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const MARKETDATA_BASE = "https://api.marketdata.app/v1/options";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "expirations";

    if (action === "expirations") {
      return await handleExpirations();
    } else if (action === "chain") {
      const expiration = url.searchParams.get("expiration");
      if (!expiration) {
        return new Response(JSON.stringify({ error: "Missing expiration parameter" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return await handleChain(expiration);
    } else if (action === "box-spreads") {
      const expiration = url.searchParams.get("expiration");
      if (!expiration) {
        return new Response(JSON.stringify({ error: "Missing expiration parameter" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return await handleBoxSpreads(expiration);
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function handleExpirations() {
  // Fetch all SPX expiration dates
  const expUrl = `${MARKETDATA_BASE}/expirations/SPX/`;
  const expResp = await fetch(expUrl);
  const expData = await expResp.json();

  if (expData.s !== "ok") {
    return new Response(JSON.stringify({ error: "Failed to fetch expirations", details: expData }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const expirations: string[] = expData.expirations || [];

  // For each expiration, fetch a summary of volume/open interest
  // We'll fetch the chain with volume data for each expiration
  // To keep it efficient, we'll process in batches and only get key stats
  const results: ExpirationSummary[] = [];

  // Process up to 30 expirations to avoid excessive API calls
  const expirationsToProcess = expirations.slice(0, 30);

  for (const exp of expirationsToProcess) {
    try {
      const summary = await fetchExpirationSummary(exp);
      if (summary) {
        results.push(summary);
      }
    } catch {
      // Skip expirations that fail
    }
  }

  // Sort by total volume descending
  results.sort((a, b) => b.totalVolume - a.totalVolume);

  return new Response(JSON.stringify({ s: "ok", expirations: results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function fetchExpirationSummary(expiration: string): Promise<ExpirationSummary | null> {
  // Fetch calls and puts for this expiration with volume data
  // Use strikeLimit to reduce data size - get 40 strikes around ATM
  const callUrl = `${MARKETDATA_BASE}/chain/SPX/?expiration=${expiration}&side=call&strikeLimit=40&pm=true`;
  const putUrl = `${MARKETDATA_BASE}/chain/SPX/?expiration=${expiration}&side=put&strikeLimit=40&pm=true`;

  const [callResp, putResp] = await Promise.all([fetch(callUrl), fetch(putUrl)]);
  const callData = await callResp.json();
  const putData = await putResp.json();

  if (callData.s !== "ok" && putData.s !== "ok") {
    return null;
  }

  const callVolumes: number[] = callData.volume || [];
  const putVolumes: number[] = putData.volume || [];
  const callOI: number[] = callData.openInterest || [];
  const putOI: number[] = putData.openInterest || [];
  const strikes: number[] = callData.strike || putData.strike || [];
  const callBids: number[] = callData.bid || [];
  const callAsks: number[] = callData.ask || [];
  const putBids: number[] = putData.bid || [];
  const putAsks: number[] = putData.ask || [];
  const underlyingPrice: number = callData.underlyingPrice?.[0] || putData.underlyingPrice?.[0] || 0;
  const dte: number = callData.dte?.[0] || putData.dte?.[0] || 0;

  const totalVolume = [...callVolumes, ...putVolumes].reduce((s, v) => s + (v || 0), 0);
  const totalOI = [...callOI, ...putOI].reduce((s, v) => s + (v || 0), 0);

  return {
    expiration,
    dte,
    totalVolume,
    totalOpenInterest: totalOI,
    underlyingPrice,
    numStrikes: strikes.length,
  };
}

async function handleChain(expiration: string) {
  // Fetch full chain for a specific expiration
  const callUrl = `${MARKETDATA_BASE}/chain/SPX/?expiration=${expiration}&side=call&pm=true`;
  const putUrl = `${MARKETDATA_BASE}/chain/SPX/?expiration=${expiration}&side=put&pm=true`;

  const [callResp, putResp] = await Promise.all([fetch(callUrl), fetch(putUrl)]);
  const callData = await callResp.json();
  const putData = await putResp.json();

  return new Response(JSON.stringify({ calls: callData, puts: putData }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function handleBoxSpreads(expiration: string) {
  // Fetch calls and puts for this expiration
  const callUrl = `${MARKETDATA_BASE}/chain/SPX/?expiration=${expiration}&side=call&pm=true&minOpenInterest=10`;
  const putUrl = `${MARKETDATA_BASE}/chain/SPX/?expiration=${expiration}&side=put&pm=true&minOpenInterest=10`;

  const [callResp, putResp] = await Promise.all([fetch(callUrl), fetch(putUrl)]);
  const callData = await callResp.json();
  const putData = await putResp.json();

  if (callData.s !== "ok" || putData.s !== "ok") {
    return new Response(JSON.stringify({ error: "Failed to fetch option chain" }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const dte: number = callData.dte?.[0] || 0;
  const underlyingPrice: number = callData.underlyingPrice?.[0] || 0;

  // Build maps of strike -> option data
  const callMap = new Map<number, OptionData>();
  const putMap = new Map<number, OptionData>();

  const callStrikes: number[] = callData.strike || [];
  const callBids: number[] = callData.bid || [];
  const callAsks: number[] = callData.ask || [];
  const callMids: number[] = callData.mid || [];
  const callVolumes: number[] = callData.volume || [];
  const callOIs: number[] = callData.openInterest || [];

  for (let i = 0; i < callStrikes.length; i++) {
    const bid = callBids[i] || 0;
    const ask = callAsks[i] || 0;
    if (bid > 0 && ask > 0) {
      callMap.set(callStrikes[i], {
        strike: callStrikes[i],
        bid,
        ask,
        mid: callMids[i] || (bid + ask) / 2,
        volume: callVolumes[i] || 0,
        openInterest: callOIs[i] || 0,
      });
    }
  }

  const putStrikes: number[] = putData.strike || [];
  const putBids: number[] = putData.bid || [];
  const putAsks: number[] = putData.ask || [];
  const putMids: number[] = putData.mid || [];
  const putVolumes: number[] = putData.volume || [];
  const putOIs: number[] = putData.openInterest || [];

  for (let i = 0; i < putStrikes.length; i++) {
    const bid = putBids[i] || 0;
    const ask = putAsks[i] || 0;
    if (bid > 0 && ask > 0) {
      putMap.set(putStrikes[i], {
        strike: putStrikes[i],
        bid,
        ask,
        mid: putMids[i] || (bid + ask) / 2,
        volume: putVolumes[i] || 0,
        openInterest: putOIs[i] || 0,
      });
    }
  }

  // Find common strikes to build box spreads
  const commonStrikes = [...callMap.keys()].filter((k) => putMap.has(k));
  commonStrikes.sort((a, b) => a - b);

  // Build box spreads from pairs of strikes
  // A box spread: Buy Call @ lower, Sell Call @ higher, Buy Put @ higher, Sell Put @ lower
  // Net credit = (Sell Put lower + Sell Call higher) - (Buy Call lower + Buy Put higher)
  // = (put_lower_bid + call_higher_bid) - (call_lower_ask + put_higher_ask)
  const boxSpreads: BoxSpreadData[] = [];

  for (let i = 0; i < commonStrikes.length - 1; i++) {
    const lowerStrike = commonStrikes[i];
    const higherStrike = commonStrikes[i + 1];
    const boxWidth = higherStrike - lowerStrike;

    // Skip very narrow boxes (less than 5 points) or very wide (more than 200 points)
    if (boxWidth < 5 || boxWidth > 200) continue;

    const callLower = callMap.get(lowerStrike)!;
    const callHigher = callMap.get(higherStrike)!;
    const putLower = putMap.get(lowerStrike)!;
    const putHigher = putMap.get(higherStrike)!;

    // Box spread credit (what you receive):
    // Sell Put @ lower strike (receive bid) + Sell Call @ higher strike (receive bid)
    // Buy Call @ lower strike (pay ask) + Buy Put @ higher strike (pay ask)
    const creditReceived = putLower.bid + callHigher.bid;
    const debitPaid = callLower.ask + putHigher.ask;
    const netCredit = creditReceived - debitPaid;

    // Also calculate using midpoints for a fair-value estimate
    const midCredit = putLower.mid + callHigher.mid;
    const midDebit = callLower.mid + putHigher.mid;
    const netMidCredit = midCredit - midDebit;

    // The box payout at expiration is always the box width
    const payout = boxWidth;

    // Only include if there's a reasonable credit (positive net credit or close to it)
    if (netCredit <= 0 && netMidCredit <= 0) continue;

    // Use the better of net credit or mid credit for rate calculation
    const effectiveCredit = netCredit > 0 ? netCredit : netMidCredit;
    const interestCost = payout - effectiveCredit;

    if (interestCost <= 0 || dte <= 0) continue;

    const annualizedRate = (interestCost / effectiveCredit) * (365 / dte) * 100;

    // Minimum OI across all 4 legs
    const minOI = Math.min(
      callLower.openInterest,
      callHigher.openInterest,
      putLower.openInterest,
      putHigher.openInterest
    );

    const totalVolume =
      callLower.volume + callHigher.volume + putLower.volume + putHigher.volume;

    // Bid-ask spread quality (lower is better)
    const totalSpreadCost =
      (callLower.ask - callLower.bid) +
      (callHigher.ask - callHigher.bid) +
      (putLower.ask - putLower.bid) +
      (putHigher.ask - putHigher.bid);

    boxSpreads.push({
      lowerStrike,
      higherStrike,
      boxWidth,
      netCredit: Math.max(netCredit, 0),
      netMidCredit,
      payout,
      annualizedRate,
      dte,
      minOpenInterest: minOI,
      totalVolume,
      totalSpreadCost,
      legs: {
        callLower: { strike: lowerStrike, bid: callLower.bid, ask: callLower.ask, mid: callLower.mid, oi: callLower.openInterest, vol: callLower.volume },
        callHigher: { strike: higherStrike, bid: callHigher.bid, ask: callHigher.ask, mid: callHigher.mid, oi: callHigher.openInterest, vol: callHigher.volume },
        putLower: { strike: lowerStrike, bid: putLower.bid, ask: putLower.ask, mid: putLower.mid, oi: putLower.openInterest, vol: putLower.volume },
        putHigher: { strike: higherStrike, bid: putHigher.bid, ask: putHigher.ask, mid: putHigher.mid, oi: putHigher.openInterest, vol: putHigher.volume },
      },
    });
  }

  // Sort by rate ascending (lowest cost of capital first)
  boxSpreads.sort((a, b) => a.annualizedRate - b.annualizedRate);

  return new Response(
    JSON.stringify({
      s: "ok",
      expiration,
      dte,
      underlyingPrice,
      boxSpreads: boxSpreads.slice(0, 50),
    }),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}

interface OptionData {
  strike: number;
  bid: number;
  ask: number;
  mid: number;
  volume: number;
  openInterest: number;
}

interface ExpirationSummary {
  expiration: string;
  dte: number;
  totalVolume: number;
  totalOpenInterest: number;
  underlyingPrice: number;
  numStrikes: number;
}

interface BoxSpreadData {
  lowerStrike: number;
  higherStrike: number;
  boxWidth: number;
  netCredit: number;
  netMidCredit: number;
  payout: number;
  annualizedRate: number;
  dte: number;
  minOpenInterest: number;
  totalVolume: number;
  totalSpreadCost: number;
  legs: {
    callLower: { strike: number; bid: number; ask: number; mid: number; oi: number; vol: number };
    callHigher: { strike: number; bid: number; ask: number; mid: number; oi: number; vol: number };
    putLower: { strike: number; bid: number; ask: number; mid: number; oi: number; vol: number };
    putHigher: { strike: number; bid: number; ask: number; mid: number; oi: number; vol: number };
  };
}
