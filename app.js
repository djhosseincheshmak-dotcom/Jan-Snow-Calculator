(() => {
  const $ = id => document.getElementById(id);

  const ids = [
    'balance', 'marginPct', 'riskPct', 'leverage',
    'entry', 'stop', 'r1', 'r2', 'r3',
    'f1', 'f2', 'f3', 'fee', 'funding'
  ];

  const defaults = {
    balance: 1000,
    marginPct: '',
    riskPct: 1,
    leverage: '',
    entry: '',
    stop: '',
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

  // درصد مارجین فقط محاسبه می‌شود و دستی قابل تغییر نیست
  $('marginPct').readOnly = true;
  $('marginPct').placeholder = 'محاسبه خودکار';

  const marginLabel = $('marginPct').parentElement.querySelector('label');
  if (marginLabel) {
    marginLabel.textContent = 'درصد مارجین موردنیاز (خودکار)';
  }

  $('marginPct').value = '';

  const number = id => {
    const value = $(id).value.trim();
    return value === '' ? 0 : Number(value);
  };

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
      balance: b,
      riskPct: r,
      leverage: lev,
      entry: e,
      stop: s,
      fee: feePct,
      funding
    } = v;

    const fractions = [v.f1, v.f2, v.f3].map(x => x / 100);
    const targetsR = [v.r1, v.r2, v.r3];
    const distance = Math.abs(e - s);

    const required = [
      'balance', 'riskPct', 'leverage',
      'entry', 'stop', 'r1', 'r2', 'r3',
      'f1', 'f2', 'f3'
    ];

    const valid =
      required.every(id =>
        $(id).value.trim() !== '' &&
        Number.isFinite(number(id))
      ) &&
      b > 0 && r > 0 && lev > 0 &&
      e > 0 && s > 0 && e !== s &&
      (direction === 'LONG' ? s < e : s > e) &&
      targetsR.every(x => x > 0) &&
      fractions.every(x => x >= 0) &&
      Math.abs(fractions.reduce((a, c) => a + c, 0) - 1) < 1e-8 &&
      feePct >= 0 && funding >= 0;

    if (!valid) {
      $('marginPct').value = '';
      $('status').innerHTML =
        '<div class="warning">اهرم، ورود و استاپ را وارد کن. استاپ باید در جهت درست باشد و مجموع خروج‌ها دقیقاً ۱۰۰٪ شود.</div>';
      return;
    }

    const riskBudget = b * r / 100;
    const feeRate = feePct / 100;

    // زیان هر واحد ارزش اسمی، شامل حرکت قیمت و کارمزد دو سمت
    const lossRate =
      distance / e +
      feeRate * (1 + s / e);

    // حجم پوزیشن طوری تعیین می‌شود که زیان تخمینی از بودجه ریسک بیشتر نشود
    const availableRisk = riskBudget - funding;

    if (availableRisk <= 0 || lossRate <= 0) {
      $('status').innerHTML =
        '<div class="warning">هزینه فاندینگ از بودجه ریسک بیشتر یا مساوی آن است. ورودی فاندینگ را بررسی کن.</div>';
      return;
    }

    const notional = availableRisk / lossRate;
    const quantity = notional / e;
    const usedMargin = notional / lev;
    const marginPct = usedMargin / b * 100;
    const priceRisk = notional * distance / e;

    $('marginPct').value = fmt(marginPct);

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
          <td>TP${i + 1}</td>
          <td>${fmt(prices[i])}</td>
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
    const feesTotal = entryFee + exitFees.reduce((a, c) => a + c, 0);
    const netTotal = net.reduce((a, c) => a + c, 0);
    const stopLoss = priceRisk + feesTotal * 0 +
      entryFee + notional * (s / e) * feeRate + funding;

    put('notional', '$' + fmt(notional));
    put('usedMargin', '$' + fmt(usedMargin));
    put('quantity', fmt(quantity));
    put('effectiveLev', fmt(notional / usedMargin) + 'x');
    put('riskBudget', '$' + fmt(riskBudget));
    put('stopLoss', '-$' + fmt(stopLoss));

    put('grossTotal', '$' + fmt(grossTotal));
    put('feesTotal', '$' + fmt(feesTotal));
    put('fundTotal', '$' + fmt(funding));
    put('netTotal', (netTotal >= 0 ? '+$' : '-$') + fmt(Math.abs(netTotal)));
    put('returnPct', fmt(netTotal / b * 100) + '%');

    $('status').innerHTML =
      '<div class="ok">حجم پوزیشن بر اساس ریسک ۱٪ و با احتساب کارمزد دو سمت محاسبه شد. مارجین به‌صورت خودکار تعیین شده است.</div>';
  }

  ids.forEach(id => {
    $(id).addEventListener('input', calculate);
  });

  $('calculate').addEventListener('click', calculate);

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
