/ Главная страница: загрузка курсов/репетиторов, фильтры, модалки и отправка заявок

(function () {
  const { PAGE_SIZE } = window.APP_CONFIG;
  const U = window.Utils;

  const state = {
    courses: [],
    tutors: [],
    coursesFiltered: [],
    tutorsFiltered: [],
    coursesPage: 1,
    selectedCourse: null,
    selectedTutor: null,
    orderContext: {
      type: "course",
      course: null,
      tutor: null,
    },
  };

  const coursesTbody = document.getElementById("coursesTbody");
  const coursesPagination = document.getElementById("coursesPagination");
  const coursesMeta = document.getElementById("coursesMeta");

  const tutorsTbody = document.getElementById("tutorsTbody");
  const tutorsMeta = document.getElementById("tutorsMeta");

  const courseQuery = document.getElementById("courseQuery");
  const courseLevel = document.getElementById("courseLevel");
  const courseReset = document.getElementById("courseReset");

  const tutorLanguage = document.getElementById("tutorLanguage");
  const tutorLevel = document.getElementById("tutorLevel");
  const tutorExperience = document.getElementById("tutorExperience");
  const tutorReset = document.getElementById("tutorReset");

  const courseInfoModalEl = document.getElementById("courseInfoModal");
  const courseInfoTitle = document.getElementById("courseInfoTitle");
  const courseInfoBody = document.getElementById("courseInfoBody");

  const orderModalEl = document.getElementById("orderModal");
  const orderModalTitle = document.getElementById("orderModalTitle");
  const orderForm = document.getElementById("orderForm");

  const orderTypeCourse = document.getElementById("orderTypeCourse");
  const orderTypeTutor = document.getElementById("orderTypeTutor");
  const orderBlockCourse = document.getElementById("orderBlockCourse");
  const orderBlockTutor = document.getElementById("orderBlockTutor");

  const orderCourseName = document.getElementById("orderCourseName");
  const orderCourseTeacher = document.getElementById("orderCourseTeacher");
  const orderCourseDate = document.getElementById("orderCourseDate");
  const orderCourseTime = document.getElementById("orderCourseTime");
  const orderCourseTimeHint = document.getElementById("orderCourseTimeHint");
  const orderCourseDurationInfo = document.getElementById("orderCourseDurationInfo");
  const orderCourseEndInfo = document.getElementById("orderCourseEndInfo");
  const orderPersonsCourse = document.getElementById("orderPersonsCourse");

  const orderTutorName = document.getElementById("orderTutorName");
  const orderTutorRate = document.getElementById("orderTutorRate");
  const orderTutorDate = document.getElementById("orderTutorDate");
  const orderTutorTime = document.getElementById("orderTutorTime");
  const orderTutorDuration = document.getElementById("orderTutorDuration");
  const orderPersonsTutor = document.getElementById("orderPersonsTutor");

  const optSupplementary = document.getElementById("optSupplementary");
  const optPersonalized = document.getElementById("optPersonalized");
  const optExcursions = document.getElementById("optExcursions");
  const optAssessment = document.getElementById("optAssessment");
  const optInteractive = document.getElementById("optInteractive");

  const badgeEarly = document.getElementById("badgeEarly");
  const badgeGroup = document.getElementById("badgeGroup");
  const badgeIntensive = document.getElementById("badgeIntensive");

  const orderPrice = document.getElementById("orderPrice");
  const orderPriceHidden = document.getElementById("orderPriceHidden");

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function formatDateRuFromDateObj(d) {
    return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()}`;
  }

  function formatTimeFromDateObj(d) {
    return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  }

  function renderStartDatesNice(startDates) {
    const arr = Array.isArray(startDates) ? startDates : [];
    if (arr.length === 0) {
      return `<div class="text-secondary">—</div>`;
    }

    const map = new Map();

    arr.forEach((dt) => {
      const d = U.parseApiDateTime(dt);
      if (!d || isNaN(d.getTime())) return;

      const dateText = formatDateRuFromDateObj(d);
      const timeText = formatTimeFromDateObj(d);

      if (!map.has(dateText)) map.set(dateText, new Set());
      map.get(dateText).add(timeText);
    });

    const dates = Array.from(map.keys()).sort((a, b) => {
      const [da, ma, ya] = a.split(".").map(Number);
      const [db, mb, yb] = b.split(".").map(Number);
      return new Date(ya, ma - 1, da) - new Date(yb, mb - 1, db);
    });

    let html = "";
    dates.forEach((dateText) => {
      const times = Array.from(map.get(dateText)).sort((t1, t2) => {
        return U.minutesFromHHMM(t1) - U.minutesFromHHMM(t2);
      });

      html += `
        <div class="mb-3">
          <div class="fw-semibold mb-2">${U.escapeHtml(dateText)}</div>
          <div class="d-flex flex-wrap gap-2">
            ${times
              .map((t) => `<span class="badge text-bg-light border">${U.escapeHtml(t)}</span>`)
              .join("")}
          </div>
        </div>
      `;
    });

    return html;
  }

  function init() {
    bindEvents();
    loadAll();
  }

  function bindEvents() {
    courseQuery.addEventListener("input", () => {
      state.coursesPage = 1;
      applyCoursesFilter();
      renderCourses();
    });
    courseLevel.addEventListener("change", () => {
      state.coursesPage = 1;
      applyCoursesFilter();
      renderCourses();
    });
    courseReset.addEventListener("click", () => {
      courseQuery.value = "";
      courseLevel.value = "";
      state.coursesPage = 1;
      applyCoursesFilter();
      renderCourses();
    });

    tutorLanguage.addEventListener("change", () => {
      applyTutorsFilter();
      renderTutors();
    });
    tutorLevel.addEventListener("change", () => {
      applyTutorsFilter();
      renderTutors();
    });
    tutorExperience.addEventListener("input", () => {
      applyTutorsFilter();
      renderTutors();
    });
    tutorReset.addEventListener("click", () => {
      tutorLanguage.value = "";
      tutorLevel.value = "";
      tutorExperience.value = "";
      applyTutorsFilter();
      renderTutors();
    });

    orderTypeCourse.addEventListener("change", syncOrderTypeUI);
    orderTypeTutor.addEventListener("change", syncOrderTypeUI);

    orderCourseDate.addEventListener("change", onCourseDateChange);
    orderCourseTime.addEventListener("change", recalcPrice);
    orderPersonsCourse.addEventListener("input", recalcPrice);

    orderTutorDate.addEventListener("change", recalcPrice);
    orderTutorTime.addEventListener("change", recalcPrice);
    orderTutorDuration.addEventListener("input", recalcPrice);
    orderPersonsTutor.addEventListener("input", recalcPrice);

    [optSupplementary, optPersonalized, optExcursions, optAssessment, optInteractive].forEach(
      (el) => el.addEventListener("change", recalcPrice)
    );

    orderForm.addEventListener("submit", onSubmitOrder);
  }

  async function loadAll() {
    try {
      const [courses, tutors] = await Promise.all([window.Api.getCourses(), window.Api.getTutors()]);

      state.courses = Array.isArray(courses) ? courses : [];
      state.tutors = Array.isArray(tutors) ? tutors : [];

      applyCoursesFilter();
      applyTutorsFilter();
      fillTutorLanguages();

      renderCourses();
      renderTutors();
    } catch (e) {
      U.showAlert("danger", e.message || "Не удалось загрузить данные. Попробуйте позже.");
      coursesTbody.innerHTML = `<tr><td colspan="6" class="p-4 text-danger">Не удалось загрузить список курсов</td></tr>`;
      tutorsTbody.innerHTML = `<tr><td colspan="6" class="p-4 text-danger">Не удалось загрузить список репетиторов</td></tr>`;
    }
  }

  function applyCoursesFilter() {
    const q = (courseQuery.value || "").trim().toLowerCase();
    const lvl = courseLevel.value;

    state.coursesFiltered = state.courses.filter((c) => {
      const okName = !q || String(c.name || "").toLowerCase().includes(q);
      const okLvl = !lvl || c.level === lvl;
      return okName && okLvl;
    });
  }

  function applyTutorsFilter(extra = {}) {
    const lang = (extra.language !== undefined ? extra.language : tutorLanguage.value) || "";
    const lvl = (extra.level !== undefined ? extra.level : tutorLevel.value) || "";
    const expMinRaw = extra.expMin !== undefined ? extra.expMin : tutorExperience.value;
    const expMin = expMinRaw === "" ? null : Number(expMinRaw);

    state.tutorsFiltered = state.tutors.filter((t) => {
      const offered = Array.isArray(t.languages_offered) ? t.languages_offered : [];
      const okLang = !lang || offered.includes(lang);
      const okLvl = !lvl || t.language_level === lvl;
      const okExp = expMin === null || Number(t.work_experience || 0) >= expMin;
      return okLang && okLvl && okExp;
    });
  }

  function fillTutorLanguages() {
    const set = new Set();
    state.tutors.forEach((t) => {
      const arr = Array.isArray(t.languages_offered) ? t.languages_offered : [];
      arr.forEach((x) => set.add(x));
    });

    const items = Array.from(set).sort((a, b) => a.localeCompare(b));
    tutorLanguage.innerHTML =
      `<option value="">Любой</option>` +
      items.map((x) => `<option value="${U.escapeHtml(x)}">${U.escapeHtml(x)}</option>`).join("");
  }

  function renderCourses() {
    const pag = U.paginate(state.coursesFiltered, state.coursesPage, PAGE_SIZE);

    coursesMeta.textContent = `Показано: ${pag.slice.length} из ${pag.total}`;
    coursesTbody.innerHTML = "";

    if (pag.total === 0) {
      coursesTbody.innerHTML = `<tr><td colspan="6" class="p-4 text-secondary">Ничего не найдено</td></tr>`;
      coursesPagination.innerHTML = "";
      return;
    }

    pag.slice.forEach((c) => {
      const tr = document.createElement("tr");

      if (state.selectedCourse && state.selectedCourse.id === c.id) {
        tr.classList.add("row-selected");
      }

      const weeks = Number(c.total_length) || 0;
      const weekHours = Number(c.week_length) || 0;

      tr.innerHTML = `
        <td>
          <div class="fw-semibold">${U.escapeHtml(c.name || "—")}</div>
          <div class="text-secondary small text-truncate" style="max-width: 520px;"
              data-bs-toggle="tooltip" data-bs-title="${U.escapeHtml(c.description || "")}">
            ${U.escapeHtml(c.description || "")}
          </div>
        </td>
        <td class="text-nowrap">${U.escapeHtml(c.level || "—")}</td>
        <td>${U.escapeHtml(c.teacher || "—")}</td>
        <td class="text-nowrap">${weeks} нед., ${weekHours} ч/нед</td>
        <td class="text-nowrap">${U.formatMoneyRub(c.course_fee_per_hour)}</td>
        <td class="text-end">
          <div class="btn-group btn-group-sm">
            <button class="btn btn-outline-secondary" data-action="info">Подробнее</button>
            <button class="btn btn-primary" data-action="order">Подать заявку</button>
          </div>
        </td>
      `;

      tr.addEventListener("click", (e) => {
        const btn = e.target.closest("button");
        if (btn) return;
        selectCourse(c);
      });

      tr.querySelector('[data-action="info"]').addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        openCourseInfo(c);
      });

      tr.querySelector('[data-action="order"]').addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        selectCourse(c);
        openOrderModal("course");
      });

      coursesTbody.appendChild(tr);
    });

    U.renderPagination(coursesPagination, pag.page, pag.pages, (p) => {
      state.coursesPage = p;
      renderCourses();
    });

    initTooltips();
  }

  // ✅ ИСПРАВЛЕНО: убрали кнопку "Выбрать", оставили только "Записаться"
  function renderTutors() {
    tutorsMeta.textContent = `Показано: ${state.tutorsFiltered.length}`;
    tutorsTbody.innerHTML = "";

    if (state.tutorsFiltered.length === 0) {
      tutorsTbody.innerHTML = `<tr><td colspan="6" class="p-4 text-secondary">Ничего не найдено</td></tr>`;
      return;
    }

    state.tutorsFiltered.forEach((t) => {
      const tr = document.createElement("tr");

      if (state.selectedTutor && state.selectedTutor.id === t.id) {
        tr.classList.add("row-selected");
      }

      const offered = Array.isArray(t.languages_offered) ? t.languages_offered : [];
      const offeredText = offered.length ? offered.join(", ") : "—";

      tr.innerHTML = `
        <td>
          <div class="fw-semibold">${U.escapeHtml(t.name || "—")}</div>
          <div class="text-secondary small">Говорит: ${
            U.escapeHtml((t.languages_spoken || []).join(", ") || "—")
          }</div>
        </td>
        <td class="text-nowrap">${Number(t.work_experience || 0)} лет</td>
        <td>${U.escapeHtml(offeredText)}</td>
        <td class="text-nowrap">${U.escapeHtml(t.language_level || "—")}</td>
        <td class="text-nowrap">${U.formatMoneyRub(t.price_per_hour)}</td>
        <td class="text-end">
          <button class="btn btn-sm btn-primary" data-action="order">Записаться</button>
        </td>
      `;

      tr.querySelector('[data-action="order"]').addEventListener("click", (e) => {
        e.preventDefault();
        selectTutor(t);
        openOrderModal("tutor");
      });

      tutorsTbody.appendChild(tr);
    });
  }

  function selectCourse(course) {
    state.selectedCourse = course;

    const guessed = U.guessCourseLanguage(course);
    if (guessed) {
      tutorLanguage.value = guessed;
      applyTutorsFilter({ language: guessed });
      renderTutors();
    } else {
      applyTutorsFilter();
      renderTutors();
    }

    renderCourses();
  }

  function selectTutor(tutor) {
    state.selectedTutor = tutor;
    renderTutors();
  }

  function openCourseInfo(course) {
    courseInfoTitle.textContent = course.name || "Курс";

    const startDatesHtml = renderStartDatesNice(course.start_dates);

    courseInfoBody.innerHTML = `
      <div class="mb-2"><span class="badge text-bg-primary">${U.escapeHtml(course.level || "—")}</span></div>
      <div class="mb-3 text-secondary">${U.escapeHtml(course.description || "—")}</div>

      <div class="row g-2">
        <div class="col-md-6">
          <div class="p-3 border rounded-4 bg-light">
            <div class="fw-semibold">Преподаватель</div>
            <div>${U.escapeHtml(course.teacher || "—")}</div>
          </div>
        </div>
        <div class="col-md-6">
          <div class="p-3 border rounded-4 bg-light">
            <div class="fw-semibold">Длительность</div>
            <div>${Number(course.total_length || 0)} недель • ${Number(course.week_length || 0)} часов/нед</div>
          </div>
        </div>

        <div class="col-12">
          <div class="p-3 border rounded-4 bg-light">
            <div class="fw-semibold mb-2">Доступные даты начала</div>
            ${startDatesHtml}
          </div>
        </div>
      </div>
    `;

    bootstrap.Modal.getOrCreateInstance(courseInfoModalEl).show();
  }

  function openOrderModal(type) {
    state.orderContext.type = type;

    if (type === "course") {
      if (!state.selectedCourse) {
        U.showAlert("warning", "Сначала выберите курс.");
        return;
      }
      state.orderContext.course = state.selectedCourse;
      orderTypeCourse.checked = true;
    } else {
      if (!state.selectedTutor) {
        U.showAlert("warning", "Сначала выберите репетитора.");
        return;
      }
      state.orderContext.tutor = state.selectedTutor;
      orderTypeTutor.checked = true;
    }

    orderForm.classList.remove("was-validated");

    optSupplementary.checked = false;
    optPersonalized.checked = false;
    optExcursions.checked = false;
    optAssessment.checked = false;
    optInteractive.checked = false;

    if (state.selectedCourse) {
      orderCourseName.value = state.selectedCourse.name || "";
      orderCourseTeacher.value = state.selectedCourse.teacher || "";
    }

    if (state.selectedTutor) {
      orderTutorName.value = state.selectedTutor.name || "";
      orderTutorRate.value = String(state.selectedTutor.price_per_hour || 0);
    }

    syncOrderTypeUI();
    prepareCourseDateTimeControls();
    prepareTutorControls();

    recalcPrice();

    bootstrap.Modal.getOrCreateInstance(orderModalEl).show();
  }

  function syncOrderTypeUI() {
    const t = getOrderType();

    orderBlockCourse.classList.toggle("d-none", t !== "course");
    orderBlockTutor.classList.toggle("d-none", t !== "tutor");

    const courseMode = t === "course";
    const tutorMode = t === "tutor";

    orderCourseDate.disabled = !courseMode;
    orderPersonsCourse.disabled = !courseMode;

    if (!courseMode) {
      orderCourseTime.disabled = true;
    } else {
      orderCourseTime.disabled = !orderCourseDate.value;
    }

    orderTutorDate.disabled = !tutorMode;
    orderTutorTime.disabled = !tutorMode;
    orderTutorDuration.disabled = !tutorMode;
    orderPersonsTutor.disabled = !tutorMode;

    orderModalTitle.textContent =
      t === "course" ? "Оформление заявки (курс)" : "Оформление заявки (репетитор)";

    recalcPrice();
  }

  function getOrderType() {
    return orderTypeTutor.checked ? "tutor" : "course";
  }

  function prepareCourseDateTimeControls() {
    const course = state.selectedCourse;
    if (!course) return;

    const startDates = Array.isArray(course.start_dates) ? course.start_dates : [];
    const dateSet = new Set();
    startDates.forEach((dt) => {
      const d = U.parseApiDateTime(dt);
      dateSet.add(U.toDateInputValue(d));
    });

    const dates = Array.from(dateSet).sort();
    orderCourseDate.innerHTML =
      `<option value="">Выберите дату</option>` +
      dates.map((d) => `<option value="${d}">${U.formatDateRu(d)}</option>`).join("");

    orderCourseTime.disabled = true;
    orderCourseTime.innerHTML = `<option value="">Сначала выберите дату</option>`;
    orderCourseTimeHint.textContent = "";

    if (!orderPersonsCourse.value) orderPersonsCourse.value = "1";

    const weeks = Number(course.total_length || 0);
    const durHours = U.calcCourseDurationHours(course);
    orderCourseDurationInfo.value = `${weeks} недель • всего ${durHours} часов`;

    orderCourseEndInfo.textContent = "";
  }

  function onCourseDateChange() {
    if (getOrderType() !== "course") return;

    const course = state.selectedCourse;
    if (!course) return;

    const chosenDate = orderCourseDate.value;
    const startDates = Array.isArray(course.start_dates) ? course.start_dates : [];

    const times = [];
    startDates.forEach((dt) => {
      const d = U.parseApiDateTime(dt);
      const dateStr = U.toDateInputValue(d);
      if (dateStr === chosenDate) {
        const hhmm = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
        times.push(hhmm);
      }
    });

    times.sort((a, b) => U.minutesFromHHMM(a) - U.minutesFromHHMM(b));

    orderCourseTime.disabled = false;
    orderCourseTime.innerHTML =
      `<option value="">Выберите время</option>` +
      times
        .map((t) => {
          const end = U.hhmmFromMinutes(U.minutesFromHHMM(t) + Number(course.week_length || 0) * 60);
          return `<option value="${t}">${t} – ${end}</option>`;
        })
        .join("");

    orderCourseTimeHint.textContent =
      times.length ? "Выберите удобное время занятия." : "На эту дату нет доступного времени.";

    const end = U.addWeeksToDate(chosenDate, Number(course.total_length || 0));
    orderCourseEndInfo.textContent = `Примерная дата окончания: ${U.formatDateRu(end)}`;

    recalcPrice();
  }

  function prepareTutorControls() {
    const now = new Date();
    const minDate = U.toDateInputValue(now);
    orderTutorDate.min = minDate;

    if (!orderTutorDate.value) orderTutorDate.value = minDate;
    if (!orderTutorDuration.value) orderTutorDuration.value = "1";
    if (!orderPersonsTutor.value) orderPersonsTutor.value = "1";
  }

  function getOptionsForApi(autoFlags) {
    return {
      early_registration: autoFlags.early,
      group_enrollment: autoFlags.group,
      intensive_course: autoFlags.intensive,
      supplementary: optSupplementary.checked,
      personalized: optPersonalized.checked,
      excursions: optExcursions.checked,
      assessment: optAssessment.checked,
      interactive: optInteractive.checked,
    };
  }

  function updateBadges(autoFlags) {
    badgeEarly.className = `badge ${autoFlags.early ? "text-bg-success" : "text-bg-secondary"}`;
    badgeEarly.textContent = `Ранняя запись: ${autoFlags.early ? "да" : "нет"}`;

    badgeGroup.className = `badge ${autoFlags.group ? "text-bg-success" : "text-bg-secondary"}`;
    badgeGroup.textContent = `Групповая запись: ${autoFlags.group ? "да" : "нет"}`;

    badgeIntensive.className = `badge ${autoFlags.intensive ? "text-bg-success" : "text-bg-secondary"}`;
    badgeIntensive.textContent = `Интенсив: ${autoFlags.intensive ? "да" : "нет"}`;
  }

  function recalcPrice() {
    const type = getOrderType();

    if (type === "course") {
      const course = state.selectedCourse;
      if (!course) {
        orderPrice.textContent = "—";
        orderPriceHidden.value = "";
        return;
      }

      const dateStart = orderCourseDate.value;
      const timeStart = orderCourseTime.value;
      const persons = Number(orderPersonsCourse.value || 0);

      const early = dateStart ? U.calcEarlyRegistration(dateStart) : false;
      const group = U.calcGroupEnrollment(persons);
      const intensiveAuto = Number(course.week_length || 0) >= 5;

      const options = getOptionsForApi({ early, group, intensive: intensiveAuto });
      updateBadges({ early, group, intensive: intensiveAuto });

      if (!dateStart || !timeStart || !persons) {
        orderPrice.textContent = "—";
        orderPriceHidden.value = "";
        return;
      }

      const durationHours = U.calcCourseDurationHours(course);
      const total = U.calcCoursePrice({
        feePerHour: course.course_fee_per_hour,
        durationHours,
        dateStart,
        timeStart,
        persons,
        weeks: Number(course.total_length || 0),
        intensiveAuto,
        options,
      });

      orderPrice.textContent = U.formatMoneyRub(total);
      orderPriceHidden.value = String(total);
      return;
    }

    const tutor = state.selectedTutor;
    if (!tutor) {
      orderPrice.textContent = "—";
      orderPriceHidden.value = "";
      return;
    }

    const dateStart = orderTutorDate.value;
    const timeStart = orderTutorTime.value;
    const durationHours = Number(orderTutorDuration.value || 0);
    const persons = Number(orderPersonsTutor.value || 0);

    const early = dateStart ? U.calcEarlyRegistration(dateStart) : false;
    const group = U.calcGroupEnrollment(persons);

    const options = getOptionsForApi({ early, group, intensive: false });
    updateBadges({ early, group, intensive: false });

    if (!dateStart || !timeStart || !durationHours || !persons) {
      orderPrice.textContent = "—";
      orderPriceHidden.value = "";
      return;
    }

    const total = U.calcCoursePrice({
      feePerHour: tutor.price_per_hour,
      durationHours,
      dateStart,
      timeStart,
      persons,
      weeks: 1,
      intensiveAuto: false,
      options,
    });

    orderPrice.textContent = U.formatMoneyRub(total);
    orderPriceHidden.value = String(total);
  }

  async function onSubmitOrder(e) {
    e.preventDefault();
    e.stopPropagation();

    const type = getOrderType();
    orderForm.classList.add("was-validated");

    if (!orderForm.checkValidity()) {
      U.showAlert("warning", "Проверьте поля формы — есть ошибки.");
      return;
    }

    try {
      let payload = null;

      if (type === "course") {
        const course = state.selectedCourse;
        const dateStart = orderCourseDate.value;
        const timeStart = orderCourseTime.value;
        const persons = Number(orderPersonsCourse.value);

        const early = U.calcEarlyRegistration(dateStart);
        const group = U.calcGroupEnrollment(persons);
        const intensiveAuto = Number(course.week_length || 0) >= 5;

        const options = getOptionsForApi({ early, group, intensive: intensiveAuto });

        payload = {
          tutor_id: 0,
          course_id: Number(course.id),
          date_start: dateStart,
          time_start: timeStart,
          duration: U.calcCourseDurationHours(course),
          persons,
          price: Number(orderPriceHidden.value),
          ...options,
        };
      } else {
        const tutor = state.selectedTutor;
        const dateStart = orderTutorDate.value;
        const timeStart = orderTutorTime.value;
        const duration = Number(orderTutorDuration.value);
        const persons = Number(orderPersonsTutor.value);

        const early = U.calcEarlyRegistration(dateStart);
        const group = U.calcGroupEnrollment(persons);

        const options = getOptionsForApi({ early, group, intensive: false });

        payload = {
          tutor_id: Number(tutor.id),
          course_id: 0,
          date_start: dateStart,
          time_start: timeStart,
          duration,
          persons,
          price: Number(orderPriceHidden.value),
          ...options,
        };
      }

      await window.Api.createOrder(payload);

      U.showAlert("success", "Заявка успешно отправлена!");
      bootstrap.Modal.getOrCreateInstance(orderModalEl).hide();
    } catch (err) {
      U.showAlert("danger", err.message || "Не удалось отправить заявку. Попробуйте позже.");
    }
  }

  function initTooltips() {
    const list = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    list.forEach((el) => {
      bootstrap.Tooltip.getOrCreateInstance(el);
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
