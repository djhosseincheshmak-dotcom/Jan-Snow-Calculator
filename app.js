
(() => {
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

  // Force English numerals and left-to-right number fields.
  document.querySelectorAll('input').forEach(input => {
    input.lang = 'en';
    input.dir = 'ltr';
    input.style.textAlign = 'left';
  });

  // Convert Persian and Arabic numerals in visible page text.
  const digitMap = {
    '۰':'0','۱':'1','۲':'2','۳':'3','۴':'4',
    '۵':'5','۶':'6','۷':'7','۸':'8','۹':'9',
    '٠':'0','١':'1','٢':'2','٣':'3','٤':'4',
    '٥':'5','٦':'6','٧':'7','٨':'8','٩':'9'
  };

  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT
  );

  let textNode;
  while ((textNode = walker.nextNode())) {
    textNode.nodeValue = textNode.nodeValue.replace(
      /[۰-۹٠-٩]/g,
      digit => digitMap[digit]
    );
  }

  const marginInput = $('marginPct');
  if (marginInput) {
    marginInput.value = '';
    marginInput.readOnly = true;
    marginInput.lang = 'en';
    marginInput.dir = 'ltr';

    const label = document.querySelector('label[for="marginPct"]');
    if (label) {
      label.textContent = 'Required Margin (%) - Auto';
    } else {
      const parent = marginInput.parentElement;
      const existingLabel = parent.querySelector('label');
      if (existingLabel) {
        existingLabel.textContent = 'Required Margin (%) - Auto';
      }
    }
  }

  const number = id => {
    const value = $(id).value.trim();
    return value === '' ? NaN : Number(value);
  };

  const fmt = (value, decimals = 2) =>
    Number(value).toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
      useGrouping: true
    });

  const put = (id, value) => {
    $(id).textContent = value;
  };

  // Add the Calculate button if it is missing from the HTML.
  let calculateButton = $('calculate');

  if (!calculateButton) {
    calculateButton = document.createElement('button');
    calculateButton.id = 'calculate';
    calculateButton.type = 'button';
    calculateButton.className = 'btn primary full';
    calculateButton.textContent = 'Calculate';
    $('reset').parentElement.insertBefore(
      calculateButton,
      $('reset')
    );
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

    const fractions = [v.f1, v.f2, v.f3].map(x => x / 100);
    const targetsR = [v.r1, v.r2, v.r3];
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
        'Check your inputs. Stop Loss direction must be correct, and partial exits must total exactly 100%.'
      );
      return;
    }

    const riskBudget = b * risk / 100;
    const feeRate = feePct / 100;
    const lossRate =
      distance / e + feeRate * (1 + s / e);

    const availableRisk = riskBudget - funding;

    if (availableRisk <= 0 || lossRate <= 0) {
      showError(
        'Funding cost is greater than or equal to the risk budget. Check your values.'
      );
      return;
    }

    // Position size is calculated so estimated stop loss
    // including entry fee, stop exit fee and funding
    // does not exceed the selected account risk.
    const notional = availableRisk / lossRate;
    const quantity = notional / e;
    const usedMargin = notional / lev;
    const marginPct = usedMargin / b * 100;
    const priceRisk = notional * distance / e;

    if (marginInput) {
      marginInput.value = fmt(marginPct, 4);
    }

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
            ${profit >= 0 ? '+' : ''}$${fmt(profit)}
          </td>
          <td class="${cumulative >= 0 ? 'good' : 'bad'}">
            ${cumulative >= 0 ? '+' : ''}$${fmt(cumulative)}
          </td>
        </tr>
      `;
    }).join('');

    const grossTotal = gross.reduce((a, c) => a + c, 0);
    const feesTotal = entryFee + exitFees.reduce((a, c) => a + c, 0);
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

  // Automatic calculation whenever an input changes.
  inputIds.forEach(id => {
    $(id).addEventListener('input', calculate);
  });

  // Manual Calculate button.
  calculateButton.addEventListener('click', calculate);

  // LONG / SHORT direction.
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

  // Reset all values to the agreed defaults.
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
