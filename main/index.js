window.addEventListener('DOMContentLoaded', main);
function formatDateBY(inputDate) {
    const date = new Date(inputDate);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
}

function fillInvoiceList() {
    const select = document.getElementById("count"); // предполагаем, что ID у выпадающего списка — "invoice-select"
    select.innerHTML = ""; // очищаем

    const invoices = JSON.parse(localStorage.getItem("invoices")) || [];

    if (invoices.length === 0) {
        const defaultOption = document.createElement("option");
        defaultOption.textContent = "Нет счёт-фактур";
        defaultOption.value = "Нет счёт-фактур";
        defaultOption.disabled = true;
        defaultOption.selected = true;
        select.appendChild(defaultOption);
        return;
    }

    for (const invoice of invoices) {
        const option = document.createElement("option");
        option.value = `${invoice.номер} — ${invoice.дата} — ${invoice.дата_оплаты}`;
        option.textContent = `${invoice.номер} — ${invoice.дата}`;
        select.appendChild(option);
    }
}

function main() {
    const newButton = document.getElementById("new");
    const popup = document.getElementById("popup");
    const closePopup = document.getElementById("close-popup");

    newButton.addEventListener("click", () => {
        popup.classList.remove("hidden");
    });

    closePopup.addEventListener("click", () => {
        popup.classList.add("hidden");
    });

    document.getElementById("invoice-form").addEventListener("submit", function (e) {
        e.preventDefault();

        const number = this.number.value;
        const date = this.date.value;
        const datePaid = this.datepay.value;
        const formattedDate = formatDateBY(date);
        const pDate = formatDateBY(datePaid);
        const id = `${number}__${formattedDate}`; // уникальный ID

        const newInvoice = {
            id: id,
            номер: number,
            дата: formattedDate,
            дата_оплаты: pDate
        };

        let invoices = JSON.parse(localStorage.getItem("invoices")) || [];
        invoices.push(newInvoice);
        localStorage.setItem("invoices", JSON.stringify(invoices));

        popup.classList.add("hidden");

        const select = document.getElementById("count");
        const option = document.createElement("option");
        option.value = `${newInvoice.номер} — ${newInvoice.дата} — ${newInvoice.дата_оплаты}`;
        option.textContent = `${newInvoice.номер} — ${newInvoice.дата}`;
        option.selected = true;
        select.appendChild(option);

        this.number.value = "";
        this.date.value = "";
        this.datepay.value = "";

        const url = `../invoices/invoice.html?number=${number}&date=${formattedDate}&pDate=${pDate}`;
        window.open(url, "_blank");

    });
    document.getElementById("open").addEventListener("click", () => {
        const select = document.getElementById("count");
        const selectedValue = select.value;
        if (!selectedValue || selectedValue === "Нет счёт-фактур") {
            alert("Пожалуйста, выберите счёт-фактуру.");
            return;
        }

        const [number, date,pDate] = selectedValue.split(" — ");

        const url = `../invoices/invoice.html?number=${number}&date=${date}&pDate=${pDate}`;
        window.open(url, "_blank");

    });

    document.getElementById("download-json").addEventListener("click", () => {
        const invoices = JSON.parse(localStorage.getItem("invoices")) || [];
        const details = JSON.parse(localStorage.getItem("details")) || {};
        const acts = JSON.parse(localStorage.getItem("acts")) || {};

        const fullPackage = { invoices, details, acts };

        const blob = new Blob([JSON.stringify(fullPackage, null, 2)], { type: "application/json" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "full-data-package.json";
        link.click();
        URL.revokeObjectURL(link.href);
    });



    document.getElementById("import-json").addEventListener("change", function (event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function (e) {
            try {
                const { invoices, details, acts } = JSON.parse(e.target.result);

                if (invoices) localStorage.setItem("invoices", JSON.stringify(invoices));
                if (details) localStorage.setItem("details", JSON.stringify(details));
                if (acts) localStorage.setItem("acts", JSON.stringify(acts));

                alert("✅ Все данные успешно загружены!");
                location.reload();
            } catch (error) {
                alert("⚠️ Ошибка при загрузке файла");
            }
        };
        reader.readAsText(file);
    });
    //localStorage.clear();
    fillInvoiceList();
}


