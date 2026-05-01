import React, { useState, useEffect } from 'react';
import { HelpCircle, X, ChevronDown, BookOpen, ExternalLink } from 'lucide-react';

export default function BoxSpreadCalculator() {
  const [contractsInput, setContractsInput] = useState('1');
  const [expirationDate, setExpirationDate] = useState('');
  const [boxWidthInput, setBoxWidthInput] = useState('200');
  const [midpointInput, setMidpointInput] = useState('95.50');

  const contracts = Number(contractsInput) || 0;
  const boxWidth = Number(boxWidthInput) || 0;
  const midpoint = Number(midpointInput) || 0;

  const [results, setResults] = useState({
    dte: 0,
    rate: 0,
    effectiveLoanAmount: 0,
    actualCredit: 0,
    totalRepayment: 0,
    limitOrder: 0
  });

  const [showGuide, setShowGuide] = useState(false);
  const [openHelp, setOpenHelp] = useState<string | null>(null);

  useEffect(() => {
    if (expirationDate && boxWidth && midpoint && contracts > 0) {
      const today = new Date();
      const expDate = new Date(expirationDate);
      const timeDiff = expDate.getTime() - today.getTime();
      const dte = Math.floor(timeDiff / (1000 * 3600 * 24));

      if (dte > 0) {
        const effectiveLoanAmount = contracts * boxWidth * 100;
        const creditPerContract = midpoint * 100;
        const payoutPerContract = boxWidth * 100;
        const interestPaid = payoutPerContract - creditPerContract;

        const annualizedRate = (interestPaid / creditPerContract) * (365 / dte) * 100;

        const actualCredit = contracts * creditPerContract;
        const totalRepayment = contracts * payoutPerContract;

        const limitOrder = midpoint - 0.15;

        setResults({
          dte,
          rate: annualizedRate.toFixed(2),
          effectiveLoanAmount,
          actualCredit,
          totalRepayment,
          limitOrder: limitOrder.toFixed(2)
        });
      }
    }
  }, [contracts, expirationDate, boxWidth, midpoint, contractsInput, boxWidthInput, midpointInput]);

  const toggleHelp = (key: string) => {
    setOpenHelp(openHelp === key ? null : key);
  };

  // Calculate suggested midpoint for 4.5% yield
  useEffect(() => {
    if (expirationDate && boxWidth > 0) {
      const today = new Date();
      const expDate = new Date(expirationDate);
      const timeDiff = expDate.getTime() - today.getTime();
      const dte = Math.floor(timeDiff / (1000 * 3600 * 24));

      if (dte > 0 && midpointInput === '') {
        // Target annualized rate: 4.5%
        const targetRate = 0.045;
        // interestPaid / creditPerContract = targetRate * (dte / 365)
        // (boxWidth * 100 - creditPerContract) / creditPerContract = targetRate * (dte / 365)
        // Let x = creditPerContract
        // (boxWidth * 100 - x) / x = targetRate * (dte / 365)
        // boxWidth * 100 - x = x * targetRate * (dte / 365)
        // boxWidth * 100 = x + x * targetRate * (dte / 365)
        // boxWidth * 100 = x * (1 + targetRate * (dte / 365))
        // x = (boxWidth * 100) / (1 + targetRate * (dte / 365))

        const creditPerContract = (boxWidth * 100) / (1 + targetRate * (dte / 365));
        const suggestedMidpoint = creditPerContract / 100;
        setMidpointInput(suggestedMidpoint.toFixed(2));
      }
    }
  }, [expirationDate, boxWidth, midpointInput]);

  return (
    <div className="max-w-3xl mx-auto p-6 bg-slate-50 min-h-screen font-sans">
      <div className="bg-white rounded-xl shadow-lg p-8 border border-slate-200">
        <div className="flex items-start justify-between mb-6 border-b pb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">SPX Box Spread Borrowing Tool</h1>
            <p className="text-sm text-slate-500 mt-1">Calculate your cost of capital when borrowing via SPX box spreads</p>
          </div>
          <button
            onClick={() => setShowGuide(!showGuide)}
            className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors flex-shrink-0"
          >
            <BookOpen className="w-4 h-4" />
            How It Works
          </button>
        </div>

        {/* Financial Overview Box */}
        {results.dte > 0 && (
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 rounded-lg p-6 mb-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Financial Overview</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-white rounded-lg p-4 border border-slate-100">
                <p className="text-sm text-slate-600 mb-1">Effective APR</p>
                <p className="text-3xl font-bold text-green-600">{results.rate}%</p>
              </div>
              <div className="bg-white rounded-lg p-4 border border-slate-100">
                <p className="text-sm text-slate-600 mb-1">Duration</p>
                <p className="text-3xl font-bold text-slate-800">{results.dte} Days</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center bg-white rounded-lg p-4 border border-slate-100">
                <p className="text-sm text-slate-600">Cash Generated Today:</p>
                <p className="text-lg font-bold text-green-600">${results.actualCredit.toLocaleString()}</p>
              </div>
              <div className="flex justify-between items-center bg-white rounded-lg p-4 border border-slate-100">
                <p className="text-sm text-slate-600">Repayment at Expiry:</p>
                <p className="text-lg font-bold text-red-600">${results.totalRepayment.toLocaleString()}</p>
              </div>
            </div>
          </div>
        )}

        {/* Borrowing Warning */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <div className="bg-amber-100 rounded-full p-1.5 flex-shrink-0 mt-0.5">
            <svg className="w-4 h-4 text-amber-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
          </div>
          <div className="text-sm text-amber-800">
            <strong>You are the borrower.</strong> This tool is for people who want to <em>receive cash now</em> and repay at expiration. You sell the box spread (receive credit), which means you borrow money. Do <strong>not</strong> buy the box -- that would make you the lender.
          </div>
        </div>

        {/* Full Guide Panel */}
        {showGuide && (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-800">Understanding Box Spread Borrowing</h2>
              <button onClick={() => setShowGuide(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-5 text-sm text-slate-700 leading-relaxed">
              <div>
                <h3 className="font-bold text-slate-900 mb-1">What is a Box Spread?</h3>
                <p>
                  A box spread is a combination of four options legs (two calls, two puts) at two different strikes
                  with the same expiration. It has a guaranteed payoff at expiration equal to the difference between
                  the strike prices, regardless of where SPX settles.
                </p>
                <p className="mt-2">
                  <strong>As a borrower</strong>, you <em>sell</em> the box spread: you receive a credit now and pay the
                  fixed box width at expiration. The difference is your interest cost. This is cheaper than margin
                  loans for many investors, especially after the Section 1256 tax advantage.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-slate-900 mb-1">Borrowing vs. Lending -- Getting the Direction Right</h3>
                <div className="bg-white rounded-lg p-4 border border-slate-200 space-y-3">
                  <div>
                    <span className="inline-block bg-green-100 text-green-800 text-xs font-bold px-2 py-0.5 rounded mr-2">BORROWING</span>
                    <strong>You sell the box.</strong> You receive cash now (credit) and owe the box width at expiration.
                    <div className="ml-4 mt-1 text-xs text-slate-600">
                      Sell Put @ Lower + Sell Call @ Higher = you receive credit<br/>
                      Buy Call @ Lower + Buy Put @ Higher = you pay debit<br/>
                      Net: you receive more credit than you pay in debit = cash in hand now
                    </div>
                  </div>
                  <div>
                    <span className="inline-block bg-red-100 text-red-800 text-xs font-bold px-2 py-0.5 rounded mr-2">LENDING</span>
                    <strong>You buy the box.</strong> You pay cash now (debit) and receive the box width at expiration.
                    <div className="ml-4 mt-1 text-xs text-slate-600">
                      This is the opposite -- you are lending money to someone else. Do NOT do this if you need to borrow.
                    </div>
                  </div>
                </div>
                <p className="mt-2">
                  On your broker's order screen, make sure the net <strong>credit</strong> is positive and you are
                  <strong> selling to open</strong> all four legs. If the order shows a net <em>debit</em>, you are buying the box
                  (lending) -- cancel and re-enter.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-slate-900 mb-1">How to Find the Inputs on Your Broker</h3>
                <ol className="list-decimal list-inside space-y-2 ml-2">
                  <li>
                    <strong>Go to the SPX options chain</strong> on Fidelity, TDAmeritrade, Interactive Brokers, or
                    any broker that supports multi-leg index options.
                  </li>
                  <li>
                    <strong>Pick an expiration date.</strong> SPX has weekly (Friday) and monthly (3rd Friday)
                    expirations. Monthly expirations tend to have the most liquidity and tightest spreads.
                  </li>
                  <li>
                    <strong>Choose two strikes</strong> that are relatively close to the current SPX level
                    (within ~5% is ideal). The difference between them is your <em>Box Width</em>.
                    Common widths: 5, 10, 25, 50, or 100 points.
                  </li>
                  <li>
                    <strong>Read the bid and ask</strong> for each of the four legs, then compute the net credit
                    of the whole box. The midpoint of that net credit is your <em>Bid/Ask Midpoint</em>.
                  </li>
                </ol>
              </div>

              <div>
                <h3 className="font-bold text-slate-900 mb-1">Computing the Net Credit (Midpoint)</h3>
                <p className="mb-2">When you <strong>sell</strong> the box to borrow money, the four legs are:</p>
                <div className="bg-white rounded-lg p-4 border border-slate-200 font-mono text-xs space-y-1">
                  <div><span className="text-green-600">+ Sell Put @ Lower Strike</span> (you receive the bid)</div>
                  <div><span className="text-green-600">+ Sell Call @ Higher Strike</span> (you receive the bid)</div>
                  <div><span className="text-red-600">- Buy Call @ Lower Strike</span> (you pay the ask)</div>
                  <div><span className="text-red-600">- Buy Put @ Higher Strike</span> (you pay the ask)</div>
                  <div className="border-t border-slate-200 pt-1 mt-2 font-bold">
                    = Net Credit per contract (in points) -- this is cash you receive
                  </div>
                </div>
                <p className="mt-2">
                  The <em>midpoint</em> is the average of the natural credit (using bids for sells, asks for buys)
                  and the reverse (using asks for sells, bids for buys). Most brokers show the "mid" or "mark" price
                  for each leg -- you can also just average the natural credit and the natural debit to approximate it.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-slate-900 mb-1">Worked Example</h3>
                <div className="bg-white rounded-lg p-4 border border-slate-200 text-xs space-y-1.5">
                  <div className="font-semibold text-slate-900 mb-1">SPX at 5,500 | Expiration in 60 days</div>
                  <div>Lower Strike: 5,475 | Higher Strike: 5,575 | Box Width: 100</div>
                  <div className="border-t border-slate-200 pt-1.5 mt-1.5 space-y-1">
                    <div>Sell Put 5475: bid 42.00 / ask 43.50</div>
                    <div>Sell Call 5575: bid 38.00 / ask 39.50</div>
                    <div>Buy Call 5475: bid 67.00 / ask 68.50</div>
                    <div>Buy Put 5575: bid 63.00 / ask 64.50</div>
                  </div>
                  <div className="border-t border-slate-200 pt-1.5 mt-1.5">
                    <div>Natural credit (you receive): (42.00 + 38.00) - (68.50 + 64.50) = 80.00 - 133.00 = -53.00</div>
                    <div className="text-slate-500 italic mt-1">Wait -- negative means you'd pay. Let's flip to the correct borrowing direction:</div>
                  </div>
                  <div className="border-t border-slate-200 pt-1.5 mt-1.5">
                    <div className="font-semibold">Correct framing for borrowing:</div>
                    <div>Credit received = Box Width - Implied Interest</div>
                    <div>If the fair value of the box is 95.00, you receive $95 now and owe $100 at expiry.</div>
                    <div>The $5.00 difference is your interest cost for 60 days.</div>
                  </div>
                  <div className="border-t border-slate-200 pt-1.5 mt-1.5 font-semibold">
                    Midpoint credit = 95.00 | Annualized rate: (5.00 / 95.00) x (365 / 60) x 100 = 3.21%
                  </div>
                </div>
                <p className="mt-2">
                  In practice, you'll read the net credit directly from your broker's multi-leg order screen.
                  Enter that net credit as the <em>Bid/Ask Midpoint</em> and the strike difference as the <em>Box Width</em>.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-slate-900 mb-1">Choosing a Box Width</h3>
                <p className="mb-2">Wider boxes (50-100+ points) generally have:</p>
                <ul className="list-disc list-inside ml-2 space-y-1">
                  <li>Tighter bid-ask spreads as a percentage of width</li>
                  <li>Lower effective interest rates (less slippage)</li>
                  <li>More open interest near the money</li>
                </ul>
                <p className="mt-2">
                  Narrower boxes (5-25 points) are easier to fill but may carry wider proportional spreads.
                  A 25-50 point box is a good starting point for most retail investors.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-slate-900 mb-1">Valid Expiration Dates for SPX</h3>
                <p className="mb-2">
                  SPX options expire on Fridays. The most liquid expirations are:
                </p>
                <ul className="list-disc list-inside ml-2 space-y-1">
                  <li><strong>Monthly (AM-settled):</strong> 3rd Friday of each month -- the traditional "standard" expiration with the highest volume and open interest.</li>
                  <li><strong>Weekly (PM-settled):</strong> Every Friday -- end-of-day settlement, slightly less liquid but more frequent.</li>
                  <li><strong>Quarterly:</strong> End of quarter (Mar, Jun, Sep, Dec) -- very high liquidity.</li>
                </ul>
                <p className="mt-2">
                  For box spread borrowing, most people choose expirations 30-180 days out.
                  Shorter DTE gives a higher annualized rate (more slippage per day);
                  longer DTE locks in the rate for longer but ties up capital. 45-90 days is a common sweet spot.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-slate-900 mb-1">Section 1256 Tax Advantage</h3>
                <p>
                  SPX index options qualify for Section 1256 treatment: 60% of gains are taxed as long-term
                  (max 15-20%) and 40% as short-term (max 37%), regardless of holding period. This means the
                  blended maximum rate is roughly 26.8%, compared to 37% for ordinary interest income.
                  This makes the <em>after-tax</em> cost of box spread borrowing significantly lower than
                  margin loans or personal loans at the same nominal rate.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-slate-900 mb-2">Further Reading</h3>
                <div className="space-y-2">
                  <a
                    href="https://thefinancebuff.com/short-box-spread-vs-margin-loan-fidelity.html"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-2 p-3 bg-white rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-colors group"
                  >
                    <ExternalLink className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-sm font-semibold text-slate-800 group-hover:text-blue-700">Short Box Spread Trade vs Margin Loan at Fidelity</div>
                      <div className="text-xs text-slate-500">The Finance Buff -- Step-by-step walkthrough of executing a box spread on Fidelity, with screenshots and rate comparisons against margin loans.</div>
                    </div>
                  </a>
                  <a
                    href="https://www.boxtrades.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-2 p-3 bg-white rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-colors group"
                  >
                    <ExternalLink className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-sm font-semibold text-slate-800 group-hover:text-blue-700">Box Spread Yields | Boxtrades.com</div>
                      <div className="text-xs text-slate-500">Live and historical box spread yields across SPX expirations. See what rates other traders are getting, compare expirations, and find the best available box spread for your timeframe.</div>
                    </div>
                  </a>
                  <a
                    href="https://www.boxtrades.com/faq/what-is-a-box-spread"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-2 p-3 bg-white rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-colors group"
                  >
                    <ExternalLink className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-sm font-semibold text-slate-800 group-hover:text-blue-700">Box Spread Calculator | Boxtrades.com</div>
                      <div className="text-xs text-slate-500">Calculate implied interest rates from box spread prices. Enter the credit received and strike width to compute your effective borrowing rate.</div>
                    </div>
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Input Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Number of Contracts */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-slate-700">Number of Contracts</label>
              <button onClick={() => toggleHelp('contracts')} className="text-blue-500 hover:text-blue-700">
                {openHelp === 'contracts' ? <ChevronDown className="w-4 h-4" /> : <HelpCircle className="w-4 h-4" />}
              </button>
            </div>
            <input
              type="text"
              inputMode="decimal"
              value={contractsInput}
              onChange={(e) => setContractsInput(e.target.value)}
              className="w-full p-2 border rounded bg-slate-50 focus:ring-2 focus:ring-blue-500 no-spinner"
            />
            {openHelp === 'contracts' && (
              <div className="mt-2 p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-slate-700 space-y-2">
                <p>Each SPX contract has a <strong>100x multiplier</strong>. The effective loan amount per contract equals the Box Width times 100.</p>
                <p><strong>Example:</strong> 1 contract with a 200-point box width = 1 x 200 x 100 = <strong>$20,000</strong> effective loan.</p>
                <p>For a $50,000 loan with a 200-point box, you'd need 3 contracts (3 x 200 x 100 = $60,000). Pick the number that gets closest to your target.</p>
              </div>
            )}
            <div className="mt-2 p-2 bg-slate-100 rounded text-sm text-slate-600">
              Effective Loan Amount: <strong className="text-slate-800">${(contracts * boxWidth * 100).toLocaleString()}</strong>
              <span className="text-xs text-slate-400 ml-1">({contracts} x {boxWidth} x 100)</span>
            </div>
          </div>

          {/* Expiration Date */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-slate-700">Expiration Date</label>
              <button onClick={() => toggleHelp('expiration')} className="text-blue-500 hover:text-blue-700">
                {openHelp === 'expiration' ? <ChevronDown className="w-4 h-4" /> : <HelpCircle className="w-4 h-4" />}
              </button>
            </div>
            <input
              type="date"
              value={expirationDate}
              onChange={(e) => setExpirationDate(e.target.value)}
              className="w-full p-2 border rounded bg-slate-50 focus:ring-2 focus:ring-blue-500"
            />
            {openHelp === 'expiration' && (
              <div className="mt-2 p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-slate-700 space-y-2">
                <p><strong>SPX expirations fall on Fridays.</strong> The most liquid are the 3rd Friday of each month (standard monthly).</p>
                <p>Weekly expirations exist every Friday (PM-settled). Monthly AM-settled expirations on the 3rd Friday have the highest volume.</p>
                <p><strong>Tip:</strong> Pick a date 30-180 days out. 45-90 days is the sweet spot for rate vs. flexibility.</p>
                <p className="text-slate-500 italic">Check your broker's SPX options chain to confirm available dates.</p>
              </div>
            )}
          </div>

          {/* Box Width */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-slate-700">Box Width (Strike Difference)</label>
              <button onClick={() => toggleHelp('boxwidth')} className="text-blue-500 hover:text-blue-700">
                {openHelp === 'boxwidth' ? <ChevronDown className="w-4 h-4" /> : <HelpCircle className="w-4 h-4" />}
              </button>
            </div>
            <input
              type="text"
              inputMode="decimal"
              value={boxWidthInput}
              onChange={(e) => setBoxWidthInput(e.target.value)}
              className="w-full p-2 border rounded bg-slate-50 focus:ring-2 focus:ring-blue-500 no-spinner"
            />
            {openHelp === 'boxwidth' && (
              <div className="mt-2 p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-slate-700 space-y-2">
                <p>This is the difference between the higher and lower strike prices in your box.</p>
                <p><strong>Example:</strong> If your lower strike is 5475 and higher is 5575, the box width is 100.</p>
                <div className="bg-white rounded p-2 border border-slate-200">
                  <div className="font-semibold mb-1">Common widths:</div>
                  <div className="grid grid-cols-2 gap-1">
                    <div><strong>5 pts</strong> -- very narrow, higher slippage</div>
                    <div><strong>10 pts</strong> -- narrow, OK for small loans</div>
                    <div><strong>25 pts</strong> -- good balance</div>
                    <div><strong>50 pts</strong> -- tighter spreads</div>
                    <div><strong>100 pts</strong> -- best liquidity</div>
                    <div><strong>200 pts</strong> -- very wide, less common</div>
                  </div>
                </div>
                <p><strong>Rule of thumb:</strong> Wider boxes have proportionally tighter bid-ask spreads, giving you a lower borrowing rate. 25-100 points is typical.</p>
              </div>
            )}
          </div>

          {/* Midpoint */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-slate-700">Bid/Ask Midpoint ($)</label>
              <button onClick={() => toggleHelp('midpoint')} className="text-blue-500 hover:text-blue-700">
                {openHelp === 'midpoint' ? <ChevronDown className="w-4 h-4" /> : <HelpCircle className="w-4 h-4" />}
              </button>
            </div>
            <input
              type="text"
              inputMode="decimal"
              value={midpointInput}
              onChange={(e) => setMidpointInput(e.target.value)}
              className="w-full p-2 border rounded bg-slate-50 focus:ring-2 focus:ring-blue-500 no-spinner"
            />
            {openHelp === 'midpoint' && (
              <div className="mt-2 p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-slate-700 space-y-2">
                <p>This is the <strong>net credit per contract</strong> (in points) you receive when you sell the box spread, using the midpoint of the bid-ask spread for each leg.</p>
                <div className="bg-white rounded p-2 border border-slate-200 space-y-1">
                  <div className="font-semibold">How to compute it from your broker:</div>
                  <ol className="list-decimal list-inside ml-1 space-y-0.5">
                    <li>Build the 4-leg order on your broker's multi-leg screen</li>
                    <li>The broker shows a <strong>net credit</strong> (or net debit) for the whole package</li>
                    <li>Take the midpoint between the natural credit and natural debit</li>
                    <li>Enter that value here</li>
                  </ol>
                </div>
                <p><strong>Quick check:</strong> The midpoint should be slightly less than the box width. The difference is your interest cost. For a 100-point box, a midpoint of ~95-99 means you're paying 1-5 points of interest.</p>
                <p><strong>Example:</strong> Box width = 100, midpoint = 95.50. You receive $9,550 per contract now and owe $10,000 at expiry. The $450 difference is your interest cost.</p>
              </div>
            )}
          </div>
        </div>

        {/* Links to Options Chains */}
        <div className="mb-8 p-4 bg-slate-50 border border-slate-200 rounded-lg">
          <h3 className="text-sm font-semibold text-slate-700 mb-2">Look Up Current SPX Options Chains</h3>
          <p className="text-xs text-slate-500 mb-3">Use these to find current strikes, bid/ask prices, and expiration dates for your box spread.</p>
          <div className="flex flex-wrap gap-3 mb-4">
            <a
              href="https://finance.yahoo.com/quote/%5ESPX/options/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 bg-white border border-blue-200 hover:border-blue-400 px-3 py-2 rounded-lg transition-colors"
            >
              Yahoo Finance - SPX Options
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <a
              href="https://www.barchart.com/stocks/quotes/%24SPX/options"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 bg-white border border-blue-200 hover:border-blue-400 px-3 py-2 rounded-lg transition-colors"
            >
              Barchart - SPX Options
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
          <img src="/image.png" alt="Fidelity multi-leg order entry example" className="w-full rounded-lg border border-slate-200" />
        </div>

        {/* Results Dashboard */}
        {results.dte > 0 ? (
          <div className="bg-blue-50 rounded-lg p-6 mb-8 border border-blue-100">
            <h2 className="text-lg font-bold text-blue-900 mb-4">Borrowing Overview</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
              <div className="bg-white p-3 rounded shadow-sm border border-blue-50">
                <span className="block text-slate-500">Borrowing Rate</span>
                <span className="block text-xl font-bold text-slate-800">{results.rate}%</span>
              </div>
              <div className="bg-white p-3 rounded shadow-sm border border-blue-50">
                <span className="block text-slate-500">Days to Expiration</span>
                <span className="block text-xl font-bold text-slate-800">{results.dte}</span>
              </div>
              <div className="bg-white p-3 rounded shadow-sm border border-blue-50">
                <span className="block text-slate-500">Effective Loan Amount</span>
                <span className="block text-xl font-bold text-slate-800">${results.effectiveLoanAmount.toLocaleString()}</span>
              </div>
              <div className="bg-white p-3 rounded shadow-sm border border-blue-50">
                <span className="block text-slate-500">Cash You Receive Now</span>
                <span className="block text-xl font-bold text-green-600">${results.actualCredit.toLocaleString()}</span>
              </div>
              <div className="bg-white p-3 rounded shadow-sm border border-blue-50">
                <span className="block text-slate-500">You Owe at Expiry</span>
                <span className="block text-xl font-bold text-red-600">${results.totalRepayment.toLocaleString()}</span>
              </div>
            </div>
            <p className="mt-4 text-xs text-slate-500 italic">
              *Section 1256 60/40 tax treatment applies to SPX, making the after-tax borrowing cost significantly lower than margin or personal loans at the same rate.
            </p>
          </div>
        ) : (
          <div className="bg-yellow-50 text-yellow-800 p-4 rounded mb-8">
            Please enter a valid future expiration date to see the borrowing overview.
          </div>
        )}

        {/* Fidelity Execution Checklist */}
        <div className="bg-slate-800 rounded-lg p-6 text-white shadow-inner">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-green-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" /><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm9.707 5.707a1 1 0 00-1.414-1.414L9 12.586l-1.293-1.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
            Fidelity Execution Checklist
          </h2>
          <ol className="list-decimal list-inside space-y-3 text-slate-300 text-sm">
            <li>Log in to Fidelity.com, navigate to <strong>Trade &gt; Options</strong>.</li>
            <li>Enter Symbol: <strong className="text-white bg-slate-700 px-2 py-1 rounded">SPX</strong>.</li>
            <li>Change Strategy to <strong className="text-white">Custom / Multi-Leg</strong>.</li>
            <li>Add 4 legs with the exact same Expiration Date ({expirationDate || '___'}):
              <ul className="list-disc list-inside ml-6 mt-2 space-y-1 text-slate-400">
                <li>Leg 1: <strong className="text-green-400">Buy to Open</strong> Call at Lower Strike</li>
                <li>Leg 2: <strong className="text-red-400">Sell to Open</strong> Call at Higher Strike</li>
                <li>Leg 3: <strong className="text-green-400">Buy to Open</strong> Put at Higher Strike</li>
                <li>Leg 4: <strong className="text-red-400">Sell to Open</strong> Put at Lower Strike</li>
              </ul>
            </li>
            <li className="bg-amber-900/30 p-2 rounded border border-amber-700/50">
              <strong className="text-amber-300">Verify you are borrowing:</strong> The order must show a <strong>net credit</strong> (money coming to you). If it shows a net debit, you are buying the box (lending) -- cancel and re-enter.
            </li>
            <li>Set Quantity to <strong className="text-white bg-slate-700 px-2 py-1 rounded">{contracts || '___'}</strong>.</li>
            <li>Set Order Type to <strong className="text-white">Net Credit</strong> with a Limit Price.</li>
            <li className="mt-4 p-3 bg-slate-700 rounded border border-slate-600">
              <strong className="text-white block mb-1">Execution Strategy (Walking the Limit):</strong>
              Start your limit order at <strong className="text-green-400">${results.limitOrder || '___'}</strong>. Wait 60 seconds. If it does not fill, cancel and replace the order, dropping the credit requested by $0.05. Do not drop below the point where your borrowing rate exceeds your maximum acceptable rate.
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
