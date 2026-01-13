// Utils: уведомления, форматирование дат/денег, пагинация и расчёт стоимости заявки
// Здесь собраны общие функции, используемые на главной странице и в кабинете

(function () {
  function showAlert(type, text) {
    const wrap = document.getElementById("notifications");
    if (!wrap) return;

    const el = document.createElement("div");
    el.className = `alert alert-${type} shadow-sm`;
    el.role = "alert";
    el.innerHTML = `
      <div class="d-flex gap-2 align-items-start">
        <div class="flex-grow-1">${escapeHtml(text)}</div>
        <button type="button" class="btn-close" aria-label="Закрыть"></button>
      </div>
    `;

    const btn = el.querySelector(".btn-close");
    btn.addEventListener("click", () => el.remove());

    wrap.appendChild(el);

    setTimeout(() => {
      el.classList.add("fade");
      el.addEventListener("transitionend", () => el.remove(), { once: true });
      setTimeout(() => el.remove(), 800);
    }, 5000);
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function formatMoneyRub(value) {
    const v = Number(value) || 0;
    return `${Math.round(v).toLocaleString("ru-RU")} ₽`;
  }

  function toDateInputValue(dateObj) {
    return `${dateObj.getFullYear()}-${pad2(dateObj.getMonth() + 1)}-${pad2(
      dateObj.getDate()
    )}`;
  }

  function parseApiDateTime(dtString) {
    return new Date(dtString);
  }

  function formatDateRu(yyyyMmDd) {
    const [y, m, d] = (yyyyMmDd || "").split("-");
    if (!y || !m || !d) return "—";
    return `${d}.${m}.${y}`;
  }

  function formatTime(hhmm) {
    if (!hhmm) return "—";
    return hhmm.slice(0, 5);
  }

  function addWeeksToDate(yyyyMmDd, weeks) {
    const [y, m, d] = yyyyMmDd.split("-").map((x) => Number(x));
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + weeks * 7);
    return toDateInputValue(dt);
  }

  function minutesFromHHMM(hhmm) {
    const [h, m] = hhmm.split(":").map((x) => Number(x));
    return h * 60 + m;
  }

  function hhmmFromMinutes(total) {
    const h = Math.floor(total / 60);
    const m = total % 60;
    return `${pad2(h)}:${pad2(m)}`;
  }

  function isWeekend(yyyyMmDd) {
    const [y, m, d] = yyyyMmDd.split("-").map((x) => Number(x));
    const dt = new Date(y, m - 1, d);
    const day = dt.getDay();
    return day === 0 || day === 6;
  }

  function calcSurcharges(timeStart) {
    const minutes = minutesFromHHMM(timeStart);
    const morning = minutes >= 9 * 60 && minutes <= 12 * 60 ? 400 : 0;
    const evening = minutes >= 18 * 60 && minutes <= 20 * 60 ? 1000 : 0;
    return { morning, evening };
  }

  function calcEarlyRegistration(dateStart) {
    const [y, m, d] = dateStart.split("-").map((x) => Number(x));
    const start = new Date(y, m - 1, d);
    const now = new Date();

    const diffMs = start.getTime() - now.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    return diffDays >= 30;
  }

  function calcGroupEnrollment(persons) {
    return Number(persons) >= 5;
  }

  function paginate(items, page, pageSize) {
    const total = items.length;
    const pages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(Math.max(1, page), pages);
    const start = (safePage - 1) * pageSize;
    const end = start + pageSize;
    return {
      page: safePage,
      pages,
      total,
      slice: items.slice(start, end),
    };
  }

  function renderPagination(ul, page, pages, onPage) {
    ul.innerHTML = "";

    function addItem(label, p, disabled, active) {
      const li = document.createElement("li");
      li.className = `page-item ${disabled ? "disabled" : ""} ${
        active ? "active" : ""
      }`;

      const a = document.createElement("a");
      a.className = "page-link";
      a.href = "#";
      a.textContent = label;

      a.addEventListener("click", (e) => {
        e.preventDefault();
        if (disabled) return;
        onPage(p);
      });

      li.appendChild(a);
      ul.appendChild(li);
    }

    addItem("«", page - 1, page <= 1, false);
    for (let p = 1; p <= pages; p += 1) addItem(String(p), p, false, p === page);
    addItem("»", page + 1, page >= pages, false);
  }

  function guessCourseLanguage(course) {
    const text = `${course.name || ""} ${course.description || ""}`.toLowerCase();
    const known = [
      "english",
      "spanish",
      "russian",
      "french",
      "german",
      "chinese",
      "italian",
      "japanese",
      "korean",
    ];
    const found = known.find((lng) => text.includes(lng));
    if (!found) return "";
    return found[0].toUpperCase() + found.slice(1);
  }

  function calcCourseDurationHours(course) {
    const weeks = Number(course.total_length) || 0;
    const weekHours = Number(course.week_length) || 0;
    return weeks * weekHours;
  }

  function calcCoursePrice(params) {
    const {
      feePerHour,
      durationHours,
      dateStart,
      timeStart,
      persons,
      weeks,
      intensiveAuto,
      options,
    } = params;

    const weekendMultiplier = isWeekend(dateStart) ? 1.5 : 1;
    const { morning, evening } = calcSurcharges(timeStart);

    let total =
      ((Number(feePerHour) || 0) *
        (Number(durationHours) || 0) *
        weekendMultiplier +
        morning +
        evening) *
      (Number(persons) || 0);

    if (options.supplementary) total += 2000 * (Number(persons) || 0);

    if (options.personalized) {
      total += 1500 * (Number(weeks) || 0) * (Number(persons) || 0);
    }

    if (options.assessment) total += 300 * (Number(persons) || 0);

    if (options.excursions) total *= 1.25;
    if (options.interactive) total *= 1.5;

    if (options.intensive_course || intensiveAuto) total *= 1.2;

    if (options.early_registration) total *= 0.9;
    if (options.group_enrollment) total *= 0.85;

    return Math.round(total);
  }

  window.Utils = {
    showAlert,
    escapeHtml,
    formatMoneyRub,
    parseApiDateTime,
    formatDateRu,
    formatTime,
    toDateInputValue,
    addWeeksToDate,
    minutesFromHHMM,
    hhmmFromMinutes,
    paginate,
    renderPagination,
    guessCourseLanguage,
    calcCourseDurationHours,
    calcCoursePrice,
    calcEarlyRegistration,
    calcGroupEnrollment,
  };
})();
