window.addEventListener("DOMContentLoaded", () => {
    const params = new URLSearchParams(window.location.search);
    const number = params.get("number");
    const date = params.get("date");
    const pDate = params.get("pDate");
    const filterRaw = params.get("filterDate");
    const filterDate = filterRaw && filterRaw !== "null" ? filterRaw : null;
    const invoiceId = `${number}__${date}`;

    document.getElementById("invoice-number").textContent = number;
    document.getElementById("invoice-date").textContent = date;
    document.getElementById("invoice-pDate").textContent = pDate;

    const acts = JSON.parse(localStorage.getItem("acts")) || {};
    const container = document.getElementById("acts-print");

    let totalCount = 0;
    let totalSum = 0;

    for (const [key, акт] of Object.entries(acts)) {

        if (filterDate && !акт.дата.endsWith(filterDate)) continue;


        const позиции = акт.позиции?.filter(p => p.fromInvoice === invoiceId);
        if (!позиции || позиции.length === 0) continue;

        let actCount = 0;
        let actSum = 0;

        const block = document.createElement("div");
        block.classList.add("act-block");

        const caption = document.createElement("h2");
        caption.textContent = `Акт ${акт.номер} от ${акт.дата}`;
        block.appendChild(caption);

        const table = document.createElement("table");
        table.innerHTML = `
      <thead>
        <tr>
          <th>Позиция</th>
          <th>Кол-во</th>
          <th>Сумма (€)</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;
        const tbody = table.querySelector("tbody");

        for (const p of позиции) {
            const row = document.createElement("tr");
            row.innerHTML = `
        <td>${p.item}</td>
        <td>${p.count}</td>
        <td>${(+p.sum).toFixed(2)}</td>
      `;
            tbody.appendChild(row);
            actCount += p.count;
            actSum += p.sum;
            totalCount += p.count;
            totalSum += p.sum;
        }

        const totalRow = document.createElement("tr");
        totalRow.classList.add("row-summary");
        totalRow.innerHTML = `
      <td><strong>Итого по акту</strong></td>
      <td><strong>${actCount}</strong></td>
      <td><strong>${actSum.toFixed(2)}</strong></td>
    `;
        tbody.appendChild(totalRow);

        block.appendChild(table);
        container.appendChild(block);
    }

    document.getElementById("total-count").textContent = totalCount;
    document.getElementById("total-sum").textContent = totalSum.toFixed(2);
});

