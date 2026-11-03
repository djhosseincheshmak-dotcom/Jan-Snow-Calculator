(() => {
  const $ = id => document.getElementById(id);

  const ids = [
    'balance', 'marginPct', 'riskPct', 'leverage',
    'entry', 'stop', 'r1', 'r2', 'r3',
    'f1', 'f2', 'f3', 'fee', 'funding'
  ];

  const defaults = {
    balance: 1000, marginPct: 8.5, riskPct: 1,
    leverage: 100, entry: 2278, stop: 2220,
    r1: 1, r2: 1.5, r3: 2,
    f1: 50, f2: 30, f3: 20,
    fee: 0.05, funding: 0
  };

  let direction = 'LONG';

  const number = id => Number($(id).value);

  const fmt = value => Number(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  const put = (id, value) => {
    $(id).textContent = value;
  };

  function calculate() {
    const v = Object.fromEntries(ids.map(id => [id, number(id)]));

    const {
      balance: b, marginPct: m, riskPct: r,
      leverage: lev, entry: e, stop: s,
      fee: feePct, funding: funding
    } = v;

    const fractions = [v.f1, v.f2, v.f3].map(x => x / 100);
    const targetsR = [v.r1, v.r2, v.r3];
    const distance = Math.abs(e - s);

    const valid =
      ids.every(id =>
        $(id).value.trim() !== '' &&
        Number.isFinite(v[id])
      ) &&
      b > 0 && m > 0 && r > 0 && lev > 0 &&
      e > 0 && s > 0 && e !== s &&
      (direction === 'LONG' ? s < e : s > e) &&
      targetsR.every(x => x > 0) &&
      fractions.every(x => x >= 0) &&
      Math.abs(fractions.reduce((a, c) => a + c, 0) - 1) < 1e-8 &&
      feePct >= 0 && funding >= 0;

    if (!valid) {
      $('status').innerHTML =
        '<div class="warning">ورودی‌ها را بررسی کن. استاپ باید در جهت درست باشد و مجموع درصد خروج‌ها دقیقاً ۱۰۰٪ شود.</div>';
      return;
    }

    const riskBudget = b * r / 100;
    const marginBudget = b * m / 100;

    const riskNotional = riskBudget * e / distance;
    const marginNotional = marginBudget * lev;
    const notional = Math.min(riskNotional, marginNotional);

    const quantity = notional / e;
    const usedMargin = notional / lev;
    const priceRisk = notional * distance / e;
    const feeRate = feePct / 100;

    const prices = targetsR.map(x =>
      direction === 'LONG'
        ? e + distance * x
        : e - distance * x
    );

    const gross = targetsR.map((x, i) =>
      priceRisk * x * fractions[i]
    );

    const entryFee = notional * feeRate;

    const exitFees = prices.map((price, i) =>
      notional * fractions[i] * price / e * feeRate
    );

    const net = gross.map((profit, i) =>
      profit - entryFee * fractions[i] - exitFees[i] - funding * fractions[i]
    );

    let cumulative = 0;

    $('targets').innerHTML = net.map((profit, i) => {
      cumulative += profit;

      return `
        <tr>
          <td>TP${i + 1}</td>
          <td>${fmt(prices[i])}</td>
          <td>${fmt(fractions[i] * 100)}%</td>
          <td class="${profit >= 0 ? 'good' : 'bad'}">${profit >= 0 ? '+' : ''}$${fmt(profit)}</td>
          <td class="${cumulative >= 0 ? 'good' : 'bad'}">${cumulative >= 0 ? '+' : ''}$${fmt(cumulative)}</td>
        </tr>
      `;
    }).join('');

    const grossTotal = gross.reduce((a, c) => a + c, 0);
    const feesTotal = entryFee + exitFees.reduce((a, c) => a + c, 0);
    const netTotal = net.reduce((a, c) => a + c, 0);
    const stopFees = entryFee + notional * (s / e) * feeRate + funding;

    put('notional', '$' + fmt(notional));
    put('usedMargin', '$' + fmt(usedMargin));
    put('quantity', fmt(quantity));
    put('effectiveLev', fmt(notional / usedMargin) + 'x');
    put('riskBudget', '$' + fmt(riskBudget));
    put('stopLoss', '-$' + fmt(priceRisk + stopFees));

    put('grossTotal', '$' + fmt(grossTotal));
    put('feesTotal', '$' + fmt(feesTotal));
    put('fundTotal', '$' + fmt(funding));
    put('netTotal', (netTotal >= 0 ? '+$' : '-$') + fmt(Math.abs(netTotal)));
    put('returnPct', fmt(netTotal / b * 100) + '%');

    $('status').innerHTML =
      riskNotional > marginNotional
        ? '<div class="warning">محدودیت مارجین فعال است؛ حجم کاهش یافته است. فاصله لیکوییدیشن را در صرافی بررسی کن.</div>'
        : '<div class="ok">محاسبه موفق بود؛ حجم بر اساس سقف ریسک تعیین شده است.</div>';
  }

  // محاسبه خودکار با تغییر ورودی‌ها
  ids.forEach(id => {
    $(id).addEventListener('input', calculate);
  });

  // دکمه محاسبه مستقل
  $('calculate').addEventListener('click', calculate);

  // تغییر جهت معامله
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

  // فقط دکمه بازنشانی مقادیر اولیه را برمی‌گرداند
  $('reset').addEventListener('click', () => {
    ids.forEach(id => {
      $(id).value = defaults[id];
    });

    direction = 'LONG';
    $('long').classList.add('active');
    $('short').classList.remove('active');

    calculate();
  });

  calculate();
})();
