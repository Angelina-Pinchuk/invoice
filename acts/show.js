window.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const number = params.get("number");
    const date = params.get("date");
    const pDate = params.get("pDate");
    const filterDate = params.get("filterDate"); // 👈 новинка!
    const invoiceId = `${number}__${date}`;

    document.getElementById("invoice-number").textContent = number;
    document.getElementById("invoice-date").textContent = date;
    document.getElementById("invoice-pDate").textContent = pDate;

    const acts = JSON.parse(localStorage.getItem("acts")) || {};
    const grid = document.getElementById("acts-grid");

    let totalCount = 0;
    let totalSum = 0;

    for (const [key, акт] of Object.entries(acts)) {

        if (filterDate && !акт.дата.endsWith(filterDate)) continue;


        const позиции = акт.позиции?.filter(p => p.fromInvoice === invoiceId);
        if (!позиции || позиции.length === 0) continue;

        let actCount = 0;
        let actSum = 0;

        const wrapper = document.createElement("div");
        wrapper.classList.add("act-box");

        const caption = document.createElement("h3");
        caption.textContent = `Акт: ${акт.номер} от ${акт.дата}`;
        wrapper.appendChild(caption);

        const printBtn = document.createElement("span");
        printBtn.innerHTML = "🖨️";
        printBtn.title = "Предпросмотр PDF";
        printBtn.classList.add("print-icon");

        printBtn.addEventListener("click", () => {
            const url = `printActs.html?number=${number}&date=${date}&pDate=${pDate}&filterDate=${filterDate}`;
            window.open(url, "_blank");
        });

        caption.appendChild(printBtn);

        const table = document.createElement("table");
        table.classList.add("act-table");

        const thead = document.createElement("thead");
        thead.innerHTML = `
      <tr>
        <th>Позиция</th>
        <th>Кол-во</th>
        <th>Сумма (€)</th>
      </tr>`;
        table.appendChild(thead);

        const tbody = document.createElement("tbody");

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

        const finalRow = document.createElement("tr");
        finalRow.classList.add("act-summary");
        finalRow.innerHTML = `
      <td><strong>Итого по акту</strong></td>
      <td><strong>${actCount}</strong></td>
      <td><strong>${actSum.toFixed(2)}</strong></td>
    `;
        tbody.appendChild(finalRow);
        table.appendChild(tbody);
        wrapper.appendChild(table);
        grid.appendChild(wrapper);
    }

    document.getElementById("total-count").textContent = totalCount;
    document.getElementById("total-sum").textContent = totalSum.toFixed(2);

});
