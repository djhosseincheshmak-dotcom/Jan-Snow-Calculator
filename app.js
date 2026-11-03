
(() => {
  'use strict';

  const $ = id => document.getElementById(id);

  const inputIds = [
    'balance', 'riskPct', 'leverage', 'entry', 'stop',
    'r1', 'r2', 'r3', 'f1', 'f2', 'f3', 'fee', 'funding'
  ];

  const defaults = {
    balance: 1000,
    riskPct: 1,
    leverage: 100,
    entry: 2278,
    stop: 2220,
    r1: 1,
    r2: 1.5,
    r3: 2,
    f1: 50,
    f2: 30,
    f3: 20,
    fee: 0.05,
    funding: 0
  };

  let direction = 'LONG';

  // English interface
  document.documentElement.lang = 'en';
  document.documentElement.dir = 'ltr';
  document.body.dir = 'ltr';

  const translations = {
    'در حال بررسی وضعیت برنامه...': 'Checking app status...',
    '۱. مشخصات حساب و ریسک': '1. ACCOUNT & RISK SETTINGS',
    '۲. جهت معامله و قیمت‌ها': '2. TRADE DIRECTION & PRICES',
    '۳. تارگت‌ها و تقسیم خروج': '3. TARGETS & PARTIAL EXITS',
    '۴. هزینه‌های معامله': '4. TRADING COSTS',
    '۵. مشخصات پوزیشن': '5. POSITION DETAILS',
    '۶. سود و زیان تارگت‌ها': '6. TARGET PROFIT & LOSS',
    '۷. جمع‌بندی نهایی': '7. FINAL SUMMARY',

    'موجودی حساب (USDT)': 'Account Balance (USDT)',
    'مارجین اختصاصی از حساب (%)': 'Required Margin (%) - AUTO',
    'ریسک مجاز از حساب (%)': 'Account Risk (%)',
    'اهرم (Leverage)': 'Leverage (x)',

    'LONG خرید': 'LONG',
    'SHORT فروش': 'SHORT',

    'قیمت ورود (Entry)': 'Entry Price',
    'حد ضرر (Stop Loss)': 'Stop Loss Price',

    'تارگت اول (R)': 'TP1 Multiplier (R)',
    'تارگت دوم (R)': 'TP2 Multiplier (R)',
    'تارگت سوم (R)': 'TP3 Multiplier (R)',

    'خروج اول (%)': 'TP1 Exit (%)',
    'خروج دوم (%)': 'TP2 Exit (%)',
    'خروج سوم (%)': 'TP3 Exit (%)',

    'مجموع درصد خروج‌ها باید دقیقاً ۱۰۰٪ باشد.':
      'Total partial exits must equal exactly 100%.',
    'نسبت R فاصله تارگت را نسبت به فاصله ورود تا استاپ مشخص می‌کند.':
      'R defines target distance relative to the entry-to-stop distance.',

    'کارمزد هر سمت (%)': 'Fee Per Side (%)',
    'مجموع فاندینگ (USDT)': 'Total Funding Cost (USDT)',
    'کارمزد ورود و خروج جداگانه محاسبه می‌شود.':
      'Entry and exit fees are calculated separately.',
    'فاندینگ مثبت به‌عنوان هزینه در نظر گرفته شده است.':
      'Positive funding is treated as a cost.',

    'ارزش اسمی پوزیشن': 'Position Notional',
    'مارجین موردنیاز': 'Required Margin',
    'تعداد / حجم دارایی': 'Position Quantity',
    'اهرم مؤثر': 'Effective Leverage',
    'بودجه ریسک حساب': 'Account Risk Budget',
    'زیان تخمینی در استاپ': 'Estimated Stop Loss',

    'تارگت': 'TARGET',
    'قیمت': 'PRICE',
    'درصد خروج': 'EXIT (%)',
    'سود خالص': 'NET PROFIT',
    'سود تجمعی': 'CUMULATIVE PROFIT',
    'در انتظار محاسبه...': 'Waiting for calculation...',

    'سود ناخالص کل': 'Total Gross Profit',
    'مجموع کارمزد': 'Total Fees',
    'مجموع فاندینگ': 'Total Funding',
    'سود خالص نهایی': 'Final Net Profit',
    'بازده نسبت به موجودی حساب': 'Account Return',

    'محاسبه': 'CALCULATE',
    'بازنشانی': 'RESET DEFAULTS',

    'محاسبه با تغییر ورودی‌ها به‌صورت خودکار انجام می‌شود.':
      'Calculations update automatically when inputs change.',
    'دکمه محاسبه نیز بدون تغییر دادن اعداد، محاسبه را دوباره اجرا می‌کند.':
      'Use Calculate to run the calculation again.',

    'JAN SNOW آماده استفاده آفلاین است.':
      'JAN SNOW is ready for offline use.',
    'برنامه ثبت شد؛ در حال آماده‌سازی حالت آفلاین...':
      'App registered. Preparing offline mode...',
    'مرورگر از نصب آفلاین پشتیبانی نمی‌کند.':
      'This browser does not support offline installation.',
    'برای نصب آفلاین باید از HTTPS استفاده شود.':
      'HTTPS is required for offline installation.',
    'نصب آفلاین ناموفق بود؛ فایل‌ها را بررسی کن.':
      'Offline installation failed. Check app files.'
  };

  const digitMap = {
    '۰':'0','۱':'1','۲':'2','۳':'3','۴':'4',
    '۵':'5','۶':'6','۷':'7','۸':'8','۹':'9',
    '٠':'0','١':'1','٢':'2','٣':'3','٤':'4',
    '٥':'5','٦':'6','٧':'7','٨':'8','٩':'9'
  };

  function toEnglishDigits(value) {
    return String(value).replace(/[۰-۹٠-٩]/g, d => digitMap[d]);
  }

  function translatePage() {
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT
    );

    let node;
    while ((node = walker.nextNode())) {
      const original = node.nodeValue.trim();

      if (translations[original]) {
        node.nodeValue = node.nodeValue.replace(
          original,
          translations[original]
        );
      }

      node.nodeValue = toEnglishDigits(node.nodeValue);
    }

    document.querySelectorAll('input').forEach(input => {
      input.lang = 'en-US';
      input.dir = 'ltr';
      input.style.textAlign = 'left';
    });
  }

  translatePage();

  // Translate offline status when the service worker updates it.
  const offlineStatus = $('offlineStatus');

  if (offlineStatus) {
    new MutationObserver(translatePage).observe(offlineStatus, {
      childList: true,
      characterData: true,
      subtree: true
    });
  }

  // Auto-calculated margin field.
  const marginInput = $('marginPct');

  if (marginInput) {
    marginInput.readOnly = true;
    marginInput.value = '';
    marginInput.lang = 'en-US';
    marginInput.dir = 'ltr';
    marginInput.style.textAlign = 'left';

    const label = marginInput.parentElement.querySelector('label');
    if (label) label.textContent = 'Required Margin (%) - AUTO';
  }

  function number(id) {
    const value = toEnglishDigits($(id).value.trim());
    return value === '' ? NaN : Number(value);
  }

  function fmt(value, decimals = 2) {
    return Number(value).toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
      useGrouping: true
    });
  }

  function put(id, value) {
    $(id).textContent = value;
  }

  function showError(message) {
    $('status').innerHTML =
      `<div class="warning">${message}</div>`;
  }

  function calculate() {
    const v = Object.fromEntries(
      inputIds.map(id => [id, number(id)])
    );

    const {
      balance: b,
      riskPct: risk,
      leverage: lev,
      entry: e,
      stop: s,
      fee: feePct,
      funding
    } = v;

    const targetsR = [v.r1, v.r2, v.r3];
    const fractions = [v.f1, v.f2, v.f3].map(x => x / 100);
    const distance = Math.abs(e - s);

    const valid =
      inputIds.every(id =>
        $(id).value.trim() !== '' &&
        Number.isFinite(v[id])
      ) &&
      b > 0 &&
      risk > 0 &&
      lev > 0 &&
      e > 0 &&
      s > 0 &&
      e !== s &&
      (direction === 'LONG' ? s < e : s > e) &&
      targetsR.every(x => x > 0) &&
      fractions.every(x => x >= 0) &&
      Math.abs(fractions.reduce((a, c) => a + c, 0) - 1) < 1e-8 &&
      feePct >= 0 &&
      funding >= 0;

    if (!valid) {
      showError(
        'Check inputs. Stop Loss direction must be correct and partial exits must total exactly 100%.'
      );
      return;
    }

    const riskBudget = b * risk / 100;
    const feeRate = feePct / 100;

    // Estimated loss per unit of notional at stop.
    const lossRate =
      distance / e + feeRate * (1 + s / e);

    const availableRisk = riskBudget - funding;

    if (availableRisk <= 0 || lossRate <= 0) {
      showError(
        'Funding cost is greater than or equal to the risk budget.'
      );
      return;
    }

    // Position sizing based on account risk.
    const notional = availableRisk / lossRate;
    const quantity = notional / e;
    const usedMargin = notional / lev;
    const marginPct = usedMargin / b * 100;
    const priceRisk = notional * distance / e;

    if (marginInput) {
      marginInput.value = fmt(marginPct, 4);
    }

    // Target prices use exact R multipliers.
    const prices = targetsR.map(r =>
      direction === 'LONG'
        ? e + distance * r
        : e - distance * r
    );

    const gross = targetsR.map((r, i) =>
      priceRisk * r * fractions[i]
    );

    const entryFee = notional * feeRate;

    const exitFees = prices.map((price, i) =>
      notional * fractions[i] * price / e * feeRate
    );

    const net = gross.map((profit, i) =>
      profit -
      entryFee * fractions[i] -
      exitFees[i] -
      funding * fractions[i]
    );

    let cumulative = 0;

    $('targets').innerHTML = net.map((profit, i) => {
      cumulative += profit;

      return `
        <tr>
          <td>TP${i + 1} (${targetsR[i]}R)</td>
          <td>${fmt(prices[i], 4)}</td>
          <td>${fmt(fractions[i] * 100)}%</td>
          <td class="${profit >= 0 ? 'good' : 'bad'}">
            ${profit >= 0 ? '+' : '-'}$${fmt(Math.abs(profit))}
          </td>
          <td class="${cumulative >= 0 ? 'good' : 'bad'}">
            ${cumulative >= 0 ? '+' : '-'}$${fmt(Math.abs(cumulative))}
          </td>
        </tr>
      `;
    }).join('');

    const grossTotal = gross.reduce((a, c) => a + c, 0);
    const feesTotal =
      entryFee + exitFees.reduce((a, c) => a + c, 0);
    const netTotal = net.reduce((a, c) => a + c, 0);

    const stopFees =
      entryFee + notional * (s / e) * feeRate + funding;

    const stopLoss = priceRisk + stopFees;

    put('notional', '$' + fmt(notional));
    put('usedMargin', '$' + fmt(usedMargin));
    put('quantity', fmt(quantity, 6));
    put('effectiveLev', fmt(notional / usedMargin) + 'x');
    put('riskBudget', '$' + fmt(riskBudget));
    put('stopLoss', '-$' + fmt(stopLoss));
    put('grossTotal', '$' + fmt(grossTotal));
    put('feesTotal', '$' + fmt(feesTotal));
    put('fundTotal', '$' + fmt(funding));

    put(
      'netTotal',
      (netTotal >= 0 ? '+$' : '-$') + fmt(Math.abs(netTotal))
    );

    put('returnPct', fmt(netTotal / b * 100) + '%');

    $('status').innerHTML =
      '<div class="ok">Calculation successful. Position size is adjusted to the selected account risk.</div>';
  }

  // Automatic calculation.
  inputIds.forEach(id => {
    $(id).addEventListener('input', calculate);
  });

  // Manual calculation.
  $('calculate').addEventListener('click', calculate);

  // LONG / SHORT.
  $('long').addEventListener('click', () => {
    direction = 'LONG';
    $('long').classList.add('active');
    $('short').classList.remove('active');
    calculate();
  });

  $('short').addEventListener('click', () => {
    direction = 'SHORT';
    $('short').classList.add('active');
    $('long').classList.remove('active');
    calculate();
  });

  // Reset to defaults.
  $('reset').addEventListener('click', () => {
    inputIds.forEach(id => {
      $(id).value = defaults[id];
    });

    direction = 'LONG';
    $('long').classList.add('active');
    $('short').classList.remove('active');

    calculate();
  });

  calculate();
})();
