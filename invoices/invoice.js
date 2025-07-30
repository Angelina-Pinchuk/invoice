window.addEventListener('DOMContentLoaded', main);
function formatDateBY(inputDate) {
    const date = new Date(inputDate);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
}
function message(){
    const deleteButton = document.querySelector(".delete-act-btn");
    const actSelect = document.getElementById("act");
    const popup = document.getElementById("delete-confirm");
    const confirmBtn = document.getElementById("confirm-delete");
    const cancelBtn = document.getElementById("cancel-delete");

    let selectedActOption = null;

    deleteButton.addEventListener("click", () => {
        const selected = actSelect.selectedIndex;
        if (selected === -1) return;

        selectedActOption = actSelect.options[selected];
        const actKey = selectedActOption.value;

        if (!actKey || actKey === "Нет актов") {
            alert("Выберите акт!!!")
            return
        }

        popup.classList.remove("hidden");
    });

    confirmBtn.addEventListener("click", () => {
        if (!selectedActOption) return;

        const actKey = selectedActOption.value;
        const acts = JSON.parse(localStorage.getItem("acts")) || {};
        const deletedAct = acts[actKey];
        if (!deletedAct?.позиции || deletedAct.позиции.length === 0) {
            delete acts[actKey];
            localStorage.setItem("acts", JSON.stringify(acts));

            selectedActOption.remove();
            selectedActOption = null;
            actSelect.selectedIndex = 0;

            popup.classList.add("hidden");
            return;
        }

        const invoiceId = getCurrentDetailsId();

        const affectedPositions = deletedAct.позиции?.filter(p => p.fromInvoice === invoiceId) || [];

        const remainingPositions = deletedAct.позиции?.filter(p => p.fromInvoice !== invoiceId);

        if (remainingPositions.length === 0) {
            delete acts[actKey];
        } else {
            acts[actKey].позиции = remainingPositions;
        }

        localStorage.setItem("acts", JSON.stringify(acts));

        const allDetails = JSON.parse(localStorage.getItem("details")) || {};
        const details = allDetails[invoiceId] || [];

        for (const p of affectedPositions) {
            const itemName = p.item;
            const restoreCount = +p.count || 0;
            const restoreSum = +p.sum || 0;

            for (const entry of details) {
                const assembled = `${entry["арт"]} — ${entry["наименование"]}`;
                if (assembled === itemName) {
                    entry["остаток-колво"] = (
                        +entry["остаток-колво"] + restoreCount
                    ).toString();
                    entry["остаток-сумма"] = (
                        +entry["остаток-сумма"] + restoreSum
                    ).toFixed(2);
                }
            }
        }

        allDetails[invoiceId] = details;
        localStorage.setItem("details", JSON.stringify(allDetails));

        if (!remainingPositions.length) {
            selectedActOption.remove();
        }

        selectedActOption = null;
        actSelect.selectedIndex = 0;

        const rows = document.querySelectorAll("#positions-body tr");

        for (const row of rows) {
            const inputs = row.querySelectorAll("input, textarea");
            let art = "";
            let name = "";
            let остатокКолво = null;
            let остатокСумма = null;

            inputs.forEach(input => {
                if (input.name === "арт") art = input.value;
                if (input.name === "наименование") name = input.value;
                if (input.name === "остаток-колво") остатокКолво = input;
                if (input.name === "остаток-сумма") остатокСумма = input;
            });

            const assembled = `${art} — ${name}`;
            const match = affectedPositions.find(p => p.item === assembled);

            if (match && остатокКолво && остатокСумма) {
                const oldКолво = parseFloat(остатокКолво.value) || 0;
                const oldСумма = parseFloat(остатокСумма.value) || 0;

                остатокКолво.value = (oldКолво + (+match.count || 0)).toString();
                остатокСумма.value = (oldСумма + (+match.sum || 0)).toFixed(2);
            }
        }

        updateInvoiceSummary();
        popup.classList.add("hidden");
    });





    cancelBtn.addEventListener("click", () => {
        selectedActOption = null;
        popup.classList.add("hidden");
    });

}
function hint(){
    const table = document.querySelector("#positions-table thead");
    const tooltip = document.getElementById("ctrlD-tooltip");

    table.addEventListener("mouseenter", () => {
        const rect = table.getBoundingClientRect();
        tooltip.style.top = (rect.top + window.scrollY - 35) + "px";
        tooltip.style.left = (rect.left + window.scrollX) + "px";
        tooltip.classList.remove("hidden");
    });

    table.addEventListener("mouseleave", () => {
        tooltip.classList.add("hidden");
    });

}
function fillWriteoffOptions() {
    const datalist = document.getElementById("item-list");
    datalist.innerHTML = "";

    const rows = document.querySelectorAll("#positions-body tr");

    const optionsSet = new Set(); // избежать дублей

    rows.forEach(row => {
        const art = row.querySelector('[name="арт"]')?.value.trim();
        const name = row.querySelector('[name="наименование"]')?.value.trim();

        if (art && name) {
            const option = document.createElement("option");
            const text = `${art} — ${name}`;
            if (!optionsSet.has(text)) {
                option.value = text;
                datalist.appendChild(option);
                optionsSet.add(text);
            }
        }
    });
}
function addEmptyRow() {
    const tbody = document.getElementById("positions-body");
    const row = document.createElement("tr");
    row.classList.add("data-row");

    const columns = [
        "арт", "наименование", "цена", "колво", "договор", "ндс", "аванс",
        "остаток-колво", "остаток-сумма"
    ];

    for (const name of columns) {
        const cell = document.createElement("td");
        let input;

        if (["арт", "наименование"].includes(name)) {
            input = document.createElement("textarea");
            input.rows = 1;
            input.classList.add("auto-grow");
        } else if (["колво", "остаток-колво"].includes(name)) {
            input = document.createElement("input");
            input.type = "number";
            input.step = "1";
        } else {
            input = document.createElement("input");
            input.type = "number";
            input.step = "0.01";
        }

        input.name = name;
        input.classList.add("add");
        if (name.startsWith("остаток")) input.readOnly = true;

        cell.appendChild(input);
        row.appendChild(cell);
    }

    const summaryRow = tbody.querySelector(".invoice-summary");
    if (summaryRow) {
        tbody.insertBefore(row, summaryRow);
    } else {
        tbody.appendChild(row);
    }
}

function loadDetails() {
    const columns = [
        "арт", "наименование", "цена", "колво", "договор", "ндс", "аванс",
        "остаток-колво", "остаток-сумма"
    ];
    const id = getCurrentDetailsId();
    const allDetails = JSON.parse(localStorage.getItem("details")) || {};
    const rows = allDetails[id] || [];
    const tbody = document.getElementById("positions-body");

    const firstRow = tbody.querySelector("tr");
    if (firstRow) firstRow.remove();

    rows.forEach(data => {
        const row = document.createElement("tr");
        row.classList.add("data-row");

        for (const key of columns) {
            const cell = document.createElement("td");
            let input;

            if (["арт", "наименование"].includes(key)) {
                input = document.createElement("textarea");
                input.rows = 1;
                input.classList.add("auto-grow");
                input.value = data[key] || "";
            }
            else if (["колво", "остаток-колво"].includes(key)){
                input = document.createElement("input");
                input.type = "number";
                input.step = "1"
                input.value = data[key] || "";
            } else {
                input = document.createElement("input");
                input.type = "number";
                input.step = "0.01"
                input.value = data[key] || "";
            }

            input.name = key;
            input.classList.add("add");
            input.readOnly = key.startsWith("остаток");

            if (key === "остаток-колво" || key === "остаток-сумма") {
                const raw = parseFloat(data[key] || "0");
                input.classList.remove("zero", "negative");
                if (raw === 0) input.classList.add("zero");
                else if (raw < 0) input.classList.add("negative");
            }

            cell.appendChild(input);
            row.appendChild(cell);
        }

        tbody.appendChild(row);
        const textareas = row.querySelectorAll("textarea.auto-grow");
        for (const ta of textareas) {
            ta.style.height = "auto";
            ta.style.height = ta.scrollHeight + "px";
        }

    });
    addEmptyRow();
}
function updateInvoiceSummary() {
    const tbody = document.querySelector("#positions-table tbody");
    if (!tbody) return;

    const oldSummary = tbody.querySelector(".invoice-summary");
    oldSummary?.remove();

    let totalAgreement = 0;
    let totalVAT = 0;
    let totalInvoice = 0;
    let totalRestCount = 0;
    let totalRestSum = 0;

    const rows = tbody.querySelectorAll("tr");

    for (const row of rows) {
        const cells = row.querySelectorAll("td");
        if (cells.length < 9) continue;

        const values = [...cells].map(cell => {
            const input = cell.querySelector("input, textarea");
            return input ? input.value.trim() : cell.textContent.trim();
        });

        totalAgreement += +values[4] || 0;
        totalVAT += +values[5] || 0;
        totalInvoice += +values[6] || 0;

        const count = +values[7] || 0;
        const sumRaw = values[8]?.replace(",", ".").replace(/[^\d.-]/g, "") || "0";
        const sum = +sumRaw;

        totalRestCount += count;
        totalRestSum += sum;
    }

    const summaryRow = document.createElement("tr");
    summaryRow.classList.add("invoice-summary");
    summaryRow.innerHTML = `
    <td colspan="4"><strong>Итого:</strong></td>
    <td><strong>${totalAgreement.toFixed(2).replace(".", ",")}</strong></td>
    <td><strong>${totalVAT.toFixed(2).replace(".", ",")}</strong></td>
    <td><strong>${totalInvoice.toFixed(2).replace(".", ",")}</strong></td>
    <td><strong>${totalRestCount}</strong></td>
  <td><strong>${totalRestSum.toFixed(2).replace(".", ",")}</strong></td>
  `;

    tbody.appendChild(summaryRow);
}


function saveDetails() {
    const id = getCurrentDetailsId();
    const rows = document.querySelectorAll("#positions-body tr");
    const details = [];

    rows.forEach(row => {
        const entry = {};

        row.querySelectorAll("input, textarea").forEach(field => {
            entry[field.name] = field.value.trim();
        });

        const isEmpty = Object.values(entry).every(val => val === "");
        if (!isEmpty) details.push(entry);
    });
    const allDetails = JSON.parse(localStorage.getItem("details")) || {};
    allDetails[id] = details;
    localStorage.setItem("details", JSON.stringify(allDetails));
}



function fillActList() {
    const select = document.getElementById("act");
    select.innerHTML = "";

    const acts = JSON.parse(localStorage.getItem("acts")) || {};

    if (Object.keys(acts).length === 0) {
        const defaultOption = document.createElement("option");
        defaultOption.textContent = "Нет актов";
        defaultOption.disabled = true;
        defaultOption.selected = true;
        select.appendChild(defaultOption);
        return;
    }

    for (const key in acts) {
        const act = acts[key];
        const option = document.createElement("option");
        option.value = `${act.номер}__${act.дата}`;
        option.textContent = `${act.номер} — ${act.дата}`;
        select.appendChild(option);
    }
}
function getCurrentDetailsId() {
    const params = new URLSearchParams(window.location.search);
    const number = params.get("number");
    const date = params.get("date");
    return `${number}__${date}`;
}

function loadParam(){
    const params = new URLSearchParams(window.location.search);
    const number = params.get("number");
    const date = params.get("date");
    const pDate= params.get("pDate");
    document.getElementById("invoice-number").textContent = number;
    document.getElementById("invoice-date").textContent = date;
    document.getElementById("invoice-pDate").textContent = pDate;

}
function main() {
    const popup = document.getElementById("popup");
    const newButton = document.getElementById("new");
    const closePopup = document.getElementById("close-popup");
    const actForm = document.getElementById("act-form");

    newButton.addEventListener("click", () => {
        popup.classList.remove("hidden");
        actForm.number.value = "";
        actForm.date.value = "";
    });

    closePopup.addEventListener("click", () => {
        popup.classList.add("hidden");
    });

    actForm.addEventListener("submit", function (e) {
        e.preventDefault();
        const number = this.number.value;
        const date = this.date.value;
        const formattedDate = formatDateBY(date);

        const newAct = {
            номер: number,
            дата: formattedDate
        };

        let acts = JSON.parse(localStorage.getItem("acts")) || {};
        const key = `${number}__${formattedDate}`;

        if (acts[key]) {
            alert(`Акт № "${number}" от "${formattedDate}" уже существует.`);
            return;
        }

        acts[key] = { номер: number, дата: formattedDate };
        localStorage.setItem("acts", JSON.stringify(acts));
        acts[key] = newAct;
        localStorage.setItem("acts", JSON.stringify(acts));
        popup.classList.add("hidden");

        const select = document.getElementById("act");
        const option = document.createElement("option");
        option.value = key;
        option.textContent = `${number} — ${formattedDate}`;
        option.selected = true;
        select.appendChild(option);

    });
    const useButton = document.querySelector('input[value="Использовать"]');
    const writeoffPopup = document.getElementById("writeoff-popup");
    const closeWriteoff = document.getElementById("close-writeoff-popup");

    useButton.addEventListener("click", () => {
        const select = document.getElementById("act");
        const selectedAct = select.textContent; // например, "Акт-001"

        if (!selectedAct || selectedAct === "Нет актов") {
            alert("Пожалуйста, выберите реальный акт.");
            return;
        }

        writeoffPopup.classList.remove("hidden");

        sessionStorage.setItem("selectedAct", selectedAct);

        fillWriteoffOptions();
    });


    closeWriteoff.addEventListener("click", () => {
        warning.classList.remove("visible");
        writeoffPopup.classList.add("hidden");
        itemInput.value = "";
        countInput.value = "";
        sumInput.value = "";
        existingInput.value = "";
        restDisplay.value = "";
    });
    document.addEventListener("input", function (e) {
        if (e.target.matches("textarea.auto-grow")) {
            e.target.style.height = "auto";
            e.target.style.height = e.target.scrollHeight + "px";
        }
    });
    document.getElementById("positions-body").addEventListener("input", (e) => {
        const row = e.target.closest("tr");
        if (!row) return;

        if (e.target.name === "ндс") {
            row.dataset.ndsManual = "true";
        }

        if (e.target.name === "договор") {
            row.dataset.dogovorManual = "true";
        }

        const цена = parseFloat(row.querySelector('input[name="цена"]')?.value) || 0;
        const колво = parseFloat(row.querySelector('input[name="колво"]')?.value) || 0;

        const договор = row.querySelector('input[name="договор"]');
        const ндс = row.querySelector('input[name="ндс"]');
        const аванс = row.querySelector('input[name="аванс"]');
        const остаток_колво = row.querySelector('input[name="остаток-колво"]');
        const остаток_сумма = row.querySelector('input[name="остаток-сумма"]');

        const shouldUpdateD = e.target.name === "цена" || e.target.name === "колво";
        const isDogovorManual = row.dataset.dogovorManual === "true";

        if (shouldUpdateD || !isDogovorManual) {
            const newДоговор = +(цена * колво).toFixed(2);
            договор.value = newДоговор;
            row.dataset.dogovorManual = "";
        }

        const isNDSEdited = row.dataset.ndsManual === "true";
        const shouldUpdateNDS = e.target.name === "цена" || e.target.name === "колво";

        if (shouldUpdateNDS || !isNDSEdited) {
            const newНДС = +(parseFloat(договор.value || 0) * 0.2).toFixed(2);
            ндс.value = newНДС;
            row.dataset.ndsManual = "";
        }

        const newАванс = +(parseFloat(договор.value || 0) + parseFloat(ндс.value || 0)).toFixed(2);
        if (document.activeElement !== аванс) аванс.value = newАванс;

        остаток_колво.value = колво;
        остаток_сумма.value = договор.value;

        const inputs = row.querySelectorAll("input,textarea");
        const isFilled = Array.from(inputs).slice(0, 4).every(input => input.value.trim() !== "");
        const dataRows = document.querySelectorAll("#positions-body tr.data-row");
        const isLastRow = row === dataRows[dataRows.length - 1];
        if (isFilled && isLastRow) addEmptyRow();

        saveDetails();
    });

    const itemInput = document.getElementById("item-input");
    const countInput = document.getElementById("writeoff-count");
    const sumInput = document.getElementById("writeoff-sum");
    const existingInput = document.getElementById("existing-count");
    const warning = document.getElementById("warning-message");

    let selectedRow = null;

    itemInput.addEventListener("input", () => {
        const value = itemInput.value.trim();
        const number = new URLSearchParams(window.location.search).get("number");
        const date = new URLSearchParams(window.location.search).get("date");
        const invoiceNumber = `${number}__${date}`;
        const rows = document.querySelectorAll("#positions-body tr");

        selectedRow = null;
        for (const row of rows) {
            const art = row.querySelector('[name="арт"]')?.value.trim();
            const name = row.querySelector('[name="наименование"]')?.value.trim();
            const combo = `${art} — ${name}`;
            if (combo === value) {
                selectedRow = row;

                const остатокКолво = parseFloat(row.querySelector('[name="остаток-колво"]')?.value || "0");
                const остатокСумма = parseFloat(row.querySelector('[name="остаток-сумма"]')?.value || "0");

                itemInput.dataset.restCol = остатокКолво;
                itemInput.dataset.restSum = остатокСумма;

                const actKey = document.getElementById("act")?.value;
                const acts = JSON.parse(localStorage.getItem("acts")) || {};
                const позиции = acts[actKey]?.позиции || [];

                const found = позиции.find(p => p.item === value && p.fromInvoice === invoiceNumber);
                existingInput.value = found?.count || "0";
                existingInput.dataset.prev = found?.count || "0";

                break;
            }
        }
    });


    function updateByCount() {
        if (!selectedRow) return;
        const count = parseFloat(countInput.value) || 0;
        const price = parseFloat(selectedRow.querySelector('[name="цена"]')?.value || "0");
        const sum = +(count * price).toFixed(2);
        sumInput.value = sum;
        checkWarning();
    }

    function updateBySum() {
        if (!selectedRow) return;
        const sum = parseFloat(sumInput.value) || 0;
        const price = parseFloat(selectedRow.querySelector('[name="цена"]')?.value || "0");
        const count = Math.floor(sum / price); // округляем вниз
        countInput.value = count;
        checkWarning();
    }

    function checkWarning() {
        const restCol = parseFloat(itemInput.dataset.restCol || "0");
        const restSum = parseFloat(itemInput.dataset.restSum || "0");
        const count = parseFloat(countInput.value || "0");
        const sum = parseFloat(sumInput.value || "0");

        const overflow = count > restCol || sum > restSum;

        if (overflow) {
            warning.classList.add("visible");
        } else {
            warning.classList.remove("visible");
        }
    }

    countInput.addEventListener("input", updateByCount);
    sumInput.addEventListener("input", updateBySum);

    document.getElementById("writeoff-form").addEventListener("submit", function (e) {
        e.preventDefault();
        const number = new URLSearchParams(window.location.search).get("number");
        const date = new URLSearchParams(window.location.search).get("date");
        const invoiceNumber = `${number}__${date}`;
        const item = itemInput.value.trim();
        const count = parseFloat(countInput.value) || 0;
        const sum = parseFloat(sumInput.value) || 0;
        const edited = parseFloat(existingInput.value) || 0;
        const actKey = document.getElementById("act")?.value;

        if (!item || !selectedRow || !actKey) {
            alert("❗ Заполните все поля корректно.");
            return;
        }

        const price = parseFloat(selectedRow.querySelector('[name="цена"]')?.value || "0");
        const остатокКолво = selectedRow.querySelector('[name="остаток-колво"]');
        const остатокСумма = selectedRow.querySelector('[name="остаток-сумма"]');
        let currentКолво = parseFloat(остатокКолво.value || "0");
        let currentСумма = parseFloat(остатокСумма.value || "0");

        const acts = JSON.parse(localStorage.getItem("acts")) || {};
        if (!acts[actKey]) {
            alert("❗ Акт не найден.");
            return;
        }
        if (!acts[actKey].позиции) acts[actKey].позиции = [];


        const previousEntry = acts[actKey].позиции.find(
            p => p.item === item && p.fromInvoice === invoiceNumber
        );

        const previousCount = previousEntry?.count || 0;

        const delta = edited - previousCount;

        acts[actKey].позиции = acts[actKey].позиции.filter(
            p => !(p.item === item && p.fromInvoice === invoiceNumber)
        );

        let finalCount = edited + count;
        let finalSum = sum || +(finalCount * price).toFixed(2); // если сумма не указана — считаем её

        acts[actKey].позиции.push({
            item: item,
            count: finalCount,
            sum: finalSum,
            fromInvoice: invoiceNumber
        });
        localStorage.setItem("acts", JSON.stringify(acts));

        let newКолво = currentКолво + (previousCount - edited) - count;
        let newСумма = currentСумма + ((previousCount - edited) * price) - sum;

        function applyHighlight(input, rawValue) {
            input.classList.remove("zero", "negative");
            if (rawValue < 0) input.classList.add("negative");
            else if (rawValue === 0) input.classList.add("zero");
        }

        остатокКолво.value = newКолво.toString();
        остатокСумма.value = newСумма.toFixed(2); // даже если < 0

        applyHighlight(остатокКолво, newКолво);
        applyHighlight(остатокСумма, newСумма);

        saveDetails();
        warning.classList.add("hidden");
        warning.classList.remove("visible");
        document.getElementById("writeoff-popup").classList.add("hidden");
        itemInput.value = "";
        countInput.value = "";
        sumInput.value = "";
        existingInput.value = "";
        updateInvoiceSummary();
    });
    document.querySelector("#show-act-details").addEventListener("click", () => {
        document.getElementById("acts-filter").classList.remove("hidden");
    });

    document.getElementById("close-acts-filter").addEventListener("click", () => {
        document.getElementById("acts-filter").classList.add("hidden");
        document.getElementById("month").value = "";
        document.getElementById("year").value = "";
    });

    document.getElementById("filter-acts").addEventListener("click", () => {
        const month = document.getElementById("month").value.padStart(2, "0");
        const year = document.getElementById("year").value;

        if (!month || !year) return;

        const number = new URLSearchParams(location.search).get("number");
        const date = new URLSearchParams(window.location.search).get("date");
        const pDate = new URLSearchParams(window.location.search).get("pDate");
        const data = `${month}.${year}`;
        const url = `../acts/showActs.html?number=${number}&date=${date}&pDate=${pDate}&filterDate=${data}`;
        window.open(url, "_blank");
        document.getElementById("acts-filter").classList.add("hidden");
        document.getElementById("month").value = "";
        document.getElementById("year").value = "";
    });

    document.getElementById("show-all-acts").addEventListener("click", () => {
        const number = new URLSearchParams(window.location.search).get("number");
        const date = new URLSearchParams(window.location.search).get("date");
        const pDate = new URLSearchParams(window.location.search).get("pDate");
        const url = `../acts/showActs.html?number=${number}&date=${date}&pDate=${pDate}`;
        window.open(url, "_blank");
        document.getElementById("acts-filter").classList.add("hidden");
        document.getElementById("month").value = "";
        document.getElementById("year").value = "";
    });

    document.addEventListener("keydown", (e) => {
        if (e.ctrlKey && (e.key === "d" || e.key === "в")) {
            e.preventDefault();

            const table = document.querySelector("#positions-table tbody");
            const rows = Array.from(table.querySelectorAll("tr.data-row"));
            if (rows.length < 2) return;

            const lastRow = rows[rows.length - 1];
            const isLastEmpty = Array.from(lastRow.querySelectorAll("input, textarea"))
                .every(input => input.value.trim() === "");

            if (!isLastEmpty) return;

            const targetRow = rows[rows.length - 2];

            const indexToRemove = rows.indexOf(targetRow);

            targetRow.remove();

            const id = getCurrentDetailsId();
            const allDetails = JSON.parse(localStorage.getItem("details")) || {};
            if (allDetails[id]) {
                allDetails[id].splice(indexToRemove, 1);
                localStorage.setItem("details", JSON.stringify(allDetails));
            }
        }
        updateInvoiceSummary();
    });
    document.querySelector("#positions-table tbody").addEventListener("input", (e) => {
        const target = e.target;
        if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
            updateInvoiceSummary();
        }
    });


    message();
    hint();
    loadDetails();
    updateInvoiceSummary();
    //localStorage.clear();
    fillActList();
    loadParam();
}

