// Личный кабинет: просмотр заявок + модалки (подробнее/редактирование/удаление) + пагинация

(function () {
  const { PAGE_SIZE } = window.APP_CONFIG;
  const U = window.Utils;

  const state = {
    courses: [],
    tutors: [],
    orders: [],
    ordersPage: 1,
    deleteId: null,
    editingOrder: null,
    courseMap: new Map(),
    tutorMap: new Map(),
  };

  const ordersTbody = document.getElementById("ordersTbody");
  const ordersPagination = document.getElementById("ordersPagination");
  const ordersMeta = document.getElementById("ordersMeta");

  const detailsModalEl = document.getElementById("orderDetailsModal");
  const detailsTitle = document.getElementById("detailsTitle");
  const detailsBody = document.getElementById("detailsBody");

  const orderModalEl = document.getElementById("orderModal");
  const orderModalTitle = document.getElementById("orderModalTitle");
  const orderForm = document.getElementById("orderForm");
  const editingOrderId = document.getElementById("editingOrderId");

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

  const confirmDeleteModalEl = document.getElementById("confirmDeleteModal");
  const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");

  function init() {
    bindEvents();
    loadAll();
  }

  function bindEvents() {
    orderTypeCourse.addEventListener("change", syncOrderTypeUI);
    orderTypeTutor.addEventListener("change", syncOrderTypeUI);

    orderCourseDate.addEventListener("change", onCourseDateChange);
    orderCourseTime.addEventListener("change", recalcPrice);
    orderPersonsCourse.addEventListener("input", recalcPrice);

    orderTutorDate.addEventListener("change", recalcPrice);
    orderTutorTime.addEventListener("change", recalcPrice);
    orderTutorDuration.addEventListener("input", recalcPrice);
    orderPersonsTutor.addEventListener("input", recalcPrice);

    [optSupplementary, optPersonalized, optExcursions, optAssessment, optInteractive]
      .forEach((el) => el.addEventListener("change", recalcPrice));

    orderForm.addEventListener("submit", onSaveEdit);
    confirmDeleteBtn.addEventListener("click", onConfirmDelete);
  }

  async function loadAll() {
    try {
      const [courses, tutors, orders] = await Promise.all([
        window.Api.getCourses(),
        window.Api.getTutors(),
        window.Api.getOrders(),
      ]);

      state.courses = Array.isArray(courses) ? courses : [];
      state.tutors = Array.isArray(tutors) ? tutors : [];
      state.orders = Array.isArray(orders) ? orders : [];

      state.courseMap = new Map(state.courses.map((c) => [Number(c.id), c]));
      state.tutorMap = new Map(state.tutors.map((t) => [Number(t.id), t]));

      renderOrders();
    } catch (e) {
      U.showAlert("danger", e.message || "Не удалось загрузить данные. Попробуйте позже.");
      ordersTbody.innerHTML = `<tr><td colspan="6" class="p-4 text-danger">Не удалось загрузить заявки</td></tr>`;
    }
  }

  function renderOrders() {
    const pag = U.paginate(state.orders, state.ordersPage, PAGE_SIZE);

    ordersMeta.textContent = `Показано: ${pag.slice.length} из ${pag.total}`;
    ordersTbody.innerHTML = "";

    if (pag.total === 0) {
      ordersTbody.innerHTML = `<tr><td colspan="6" class="p-4 text-secondary">Заявок пока нет</td></tr>`;
      ordersPagination.innerHTML = "";
      return;
    }

    pag.slice.forEach((o, idx) => {
      const tr = document.createElement("tr");

      const rowNum = (pag.page - 1) * PAGE_SIZE + idx + 1;
      const isCourse = Number(o.course_id || 0) > 0;
      const type = isCourse ? "Курс" : "Репетитор";

      const title = isCourse
        ? (state.courseMap.get(Number(o.course_id)) || {}).name
        : (state.tutorMap.get(Number(o.tutor_id)) || {}).name;

      const dt = `${U.formatDateRu(o.date_start)} ${U.formatTime(o.time_start)}`;
      const price = U.formatMoneyRub(o.price);

      tr.innerHTML = `
        <td class="text-nowrap">${rowNum}</td>
        <td>${type}</td>
        <td class="fw-semibold">${U.escapeHtml(title || "—")}</td>
        <td class="text-nowrap">${dt}</td>
        <td class="text-nowrap">${price}</td>
        <td class="text-end">
          <div class="btn-group btn-group-sm">
            <button class="btn btn-outline-secondary" data-action="details">Подробнее</button>
            <button class="btn btn-outline-primary" data-action="edit">Изменить</button>
            <button class="btn btn-outline-danger" data-action="delete">Удалить</button>
          </div>
        </td>
      `;

      tr.querySelector('[data-action="details"]').addEventListener("click", () => openDetails(o));
      tr.querySelector('[data-action="edit"]').addEventListener("click", () => openEdit(o));
      tr.querySelector('[data-action="delete"]').addEventListener("click", () => openDelete(o));

      ordersTbody.appendChild(tr);
    });

    U.renderPagination(ordersPagination, pag.page, pag.pages, (p) => {
      state.ordersPage = p;
      renderOrders();
    });
  }

  function openDetails(order) {
    const isCourse = Number(order.course_id || 0) > 0;
    const course = isCourse ? state.courseMap.get(Number(order.course_id)) : null;
    const tutor = !isCourse ? state.tutorMap.get(Number(order.tutor_id)) : null;

    const title = isCourse ? (course && course.name) : (tutor && tutor.name);
    detailsTitle.textContent = `Заявка #${order.id} — ${title || "—"}`;

    const persons = Number(order.persons || 0);

    const baseInfo = `
      <div class="row g-2">
        <div class="col-md-6">
          <div class="p-3 border rounded-4 bg-light">
            <div class="fw-semibold mb-1">Тип</div>
            <div>${isCourse ? "Курс" : "Репетитор"}</div>
          </div>
        </div>
        <div class="col-md-6">
          <div class="p-3 border rounded-4 bg-light">
            <div class="fw-semibold mb-1">Дата/время</div>
            <div>${U.formatDateRu(order.date_start)} • ${U.formatTime(order.time_start)}</div>
          </div>
        </div>
        <div class="col-md-6">
          <div class="p-3 border rounded-4 bg-light">
            <div class="fw-semibold mb-1">Студентов</div>
            <div>${persons}</div>
          </div>
        </div>
        <div class="col-md-6">
          <div class="p-3 border rounded-4 bg-light">
            <div class="fw-semibold mb-1">Стоимость</div>
            <div class="fs-5 fw-bold">${U.formatMoneyRub(order.price)}</div>
          </div>
        </div>
      </div>
    `;

    const optionsList = `
      <div class="mt-3 p-3 border rounded-4 bg-white">
        <div class="fw-semibold mb-2">Опции</div>
        <div class="d-flex flex-wrap gap-2">
          ${renderOptionBadge("Ранняя запись", order.early_registration)}
          ${renderOptionBadge("Групповая запись", order.group_enrollment)}
          ${renderOptionBadge("Интенсив", order.intensive_course)}
          ${renderOptionBadge("Доп. материалы", order.supplementary)}
          ${renderOptionBadge("Индивидуальные занятия", order.personalized)}
          ${renderOptionBadge("Экскурсии", order.excursions)}
          ${renderOptionBadge("Оценка уровня", order.assessment)}
          ${renderOptionBadge("Интерактивная платформа", order.interactive)}
        </div>
      </div>
    `;

    let extraInfo = "";
    if (isCourse && course) {
      extraInfo = `
        <div class="mt-3 p-3 border rounded-4 bg-white">
          <div class="fw-semibold mb-2">Информация о курсе</div>
          <div><span class="text-secondary">Преподаватель:</span> ${U.escapeHtml(course.teacher || "—")}</div>
          <div><span class="text-secondary">Уровень:</span> ${U.escapeHtml(course.level || "—")}</div>
          <div><span class="text-secondary">Длительность:</span> ${Number(course.total_length || 0)} нед., ${Number(course.week_length || 0)} ч/нед</div>
        </div>
      `;
    }
    if (!isCourse && tutor) {
      extraInfo = `
        <div class="mt-3 p-3 border rounded-4 bg-white">
          <div class="fw-semibold mb-2">Информация о репетиторе</div>
          <div><span class="text-secondary">Опыт:</span> ${Number(tutor.work_experience || 0)} лет</div>
          <div><span class="text-secondary">Ставка:</span> ${U.formatMoneyRub(tutor.price_per_hour)} / час</div>
          <div><span class="text-secondary">Языки:</span> ${(tutor.languages_offered || []).join(", ") || "—"}</div>
        </div>
      `;
    }

    detailsBody.innerHTML = baseInfo + extraInfo + optionsList;
    bootstrap.Modal.getOrCreateInstance(detailsModalEl).show();
  }

  function renderOptionBadge(title, value) {
    const ok = !!value;
    const cls = ok ? "text-bg-success" : "text-bg-secondary";
    return `<span class="badge ${cls}">${U.escapeHtml(title)}: ${ok ? "да" : "нет"}</span>`;
  }

  function openEdit(order) {
    state.editingOrder = order;
    editingOrderId.value = String(order.id);

    orderForm.classList.remove("was-validated");

    const isCourse = Number(order.course_id || 0) > 0;
    orderTypeCourse.checked = isCourse;
    orderTypeTutor.checked = !isCourse;

    if (isCourse) {
      const course = state.courseMap.get(Number(order.course_id));
      orderCourseName.value = (course && course.name) || "—";
      orderCourseTeacher.value = (course && course.teacher) || "—";

      prepareCourseDateTimeControls(course);

      orderCourseDate.value = order.date_start;
      onCourseDateChange();
      orderCourseTime.value = U.formatTime(order.time_start);
      orderPersonsCourse.value = String(order.persons || 1);
    } else {
      const tutor = state.tutorMap.get(Number(order.tutor_id));
      orderTutorName.value = (tutor && tutor.name) || "—";
      orderTutorRate.value = String((tutor && tutor.price_per_hour) || 0);

      orderTutorDate.value = order.date_start;
      orderTutorTime.value = U.formatTime(order.time_start);
      orderTutorDuration.value = String(order.duration || 1);
      orderPersonsTutor.value = String(order.persons || 1);
    }

    optSupplementary.checked = !!order.supplementary;
    optPersonalized.checked = !!order.personalized;
    optExcursions.checked = !!order.excursions;
    optAssessment.checked = !!order.assessment;
    optInteractive.checked = !!order.interactive;

    syncOrderTypeUI();
    recalcPrice();

    orderModalTitle.textContent = `Редактирование заявки #${order.id}`;
    bootstrap.Modal.getOrCreateInstance(orderModalEl).show();
  }

  function syncOrderTypeUI() {
    const t = getOrderType();
    const courseMode = t === "course";
    const tutorMode = t === "tutor";
    
    orderBlockCourse.classList.toggle("d-none", !courseMode);
    orderBlockTutor.classList.toggle("d-none", !tutorMode);

    orderCourseDate.disabled = !courseMode;
    orderCourseTime.disabled = !courseMode || !orderCourseDate.value;
    orderPersonsCourse.disabled = !courseMode;

    orderTutorDate.disabled = !tutorMode;
    orderTutorTime.disabled = !tutorMode;
    orderTutorDuration.disabled = !tutorMode;
    orderPersonsTutor.disabled = !tutorMode;
    
    recalcPrice();
  }

  function getOrderType() {
    return orderTypeTutor.checked ? "tutor" : "course";
  }

  function prepareCourseDateTimeControls(course) {
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

    const weeks = Number(course.total_length || 0);
    const durHours = U.calcCourseDurationHours(course);
    orderCourseDurationInfo.value = `${weeks} недель • всего ${durHours} часов`;
    orderCourseEndInfo.textContent = "";
  }

  function onCourseDateChange() {
    const order = state.editingOrder;
    if (!order) return;

    const course = state.courseMap.get(Number(order.course_id));
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
      times.map((t) => {
        const end = U.hhmmFromMinutes(U.minutesFromHHMM(t) + Number(course.week_length || 0) * 60);
        return `<option value="${t}">${t} – ${end}</option>`;
      }).join("");

    orderCourseTimeHint.textContent =
      times.length ? "Выберите удобное время занятия." : "На эту дату нет доступного времени.";

    const end = U.addWeeksToDate(chosenDate, Number(course.total_length || 0));
    orderCourseEndInfo.textContent = `Примерная дата окончания: ${U.formatDateRu(end)}`;

    recalcPrice();
  }

  function updateBadges(flags) {
    badgeEarly.className = `badge ${flags.early ? "text-bg-success" : "text-bg-secondary"}`;
    badgeEarly.textContent = `Ранняя запись: ${flags.early ? "да" : "нет"}`;

    badgeGroup.className = `badge ${flags.group ? "text-bg-success" : "text-bg-secondary"}`;
    badgeGroup.textContent = `Групповая запись: ${flags.group ? "да" : "нет"}`;

    badgeIntensive.className = `badge ${flags.intensive ? "text-bg-success" : "text-bg-secondary"}`;
    badgeIntensive.textContent = `Интенсив: ${flags.intensive ? "да" : "нет"}`;
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

  function recalcPrice() {
    const order = state.editingOrder;
    if (!order) return;

    const type = getOrderType();

    if (type === "course") {
      const course = state.courseMap.get(Number(order.course_id));
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

    const tutor = state.tutorMap.get(Number(order.tutor_id));
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

  async function onSaveEdit(e) {
    e.preventDefault();
    e.stopPropagation();

    orderForm.classList.add("was-validated");
    if (!orderForm.checkValidity()) {
      U.showAlert("warning", "Проверьте поля формы — есть ошибки.");
      return;
    }

    try {
      const id = Number(editingOrderId.value);
      const type = getOrderType();

      let payload = null;

      if (type === "course") {
        const old = state.editingOrder;
        const course = state.courseMap.get(Number(old.course_id));

        const dateStart = orderCourseDate.value;
        const timeStart = orderCourseTime.value;
        const persons = Number(orderPersonsCourse.value);

        const early = U.calcEarlyRegistration(dateStart);
        const group = U.calcGroupEnrollment(persons);
        const intensiveAuto = Number(course.week_length || 0) >= 5;

        const options = getOptionsForApi({ early, group, intensive: intensiveAuto });

        payload = {
          date_start: dateStart,
          time_start: timeStart,
          duration: U.calcCourseDurationHours(course),
          persons,
          price: Number(orderPriceHidden.value),
          ...options,
        };
      } else {
        const dateStart = orderTutorDate.value;
        const timeStart = orderTutorTime.value;
        const duration = Number(orderTutorDuration.value);
        const persons = Number(orderPersonsTutor.value);

        const early = U.calcEarlyRegistration(dateStart);
        const group = U.calcGroupEnrollment(persons);

        const options = getOptionsForApi({ early, group, intensive: false });

        payload = {
          date_start: dateStart,
          time_start: timeStart,
          duration,
          persons,
          price: Number(orderPriceHidden.value),
          ...options,
        };
      }

      const updated = await window.Api.updateOrder(id, payload);

      const idx = state.orders.findIndex((x) => Number(x.id) === id);
      if (idx >= 0) state.orders[idx] = updated;

      U.showAlert("success", "Заявка обновлена!");
      bootstrap.Modal.getOrCreateInstance(orderModalEl).hide();
      renderOrders();
    } catch (err) {
      U.showAlert("danger", err.message || "Не удалось сохранить изменения. Попробуйте позже.");
    }
  }

  function openDelete(order) {
    state.deleteId = Number(order.id);
    bootstrap.Modal.getOrCreateInstance(confirmDeleteModalEl).show();
  }

  async function onConfirmDelete() {
    if (!state.deleteId) return;

    try {
      await window.Api.deleteOrder(state.deleteId);

      state.orders = state.orders.filter((o) => Number(o.id) !== state.deleteId);
      state.deleteId = null;

      U.showAlert("success", "Заявка удалена.");
      bootstrap.Modal.getOrCreateInstance(confirmDeleteModalEl).hide();

      const totalPages = Math.max(1, Math.ceil(state.orders.length / PAGE_SIZE));
      state.ordersPage = Math.min(state.ordersPage, totalPages);

      renderOrders();
    } catch (err) {
      U.showAlert("danger", err.message || "Не удалось удалить заявку. Попробуйте позже.");
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
