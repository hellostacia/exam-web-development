// Карта учебных ресурсов: фиксированный список мест + фильтры + поиск по списку + метки на карте

(function () {
  const U = window.Utils;

  const MAP_KEY = (window.APP_CONFIG && window.APP_CONFIG.YANDEX_MAPS_KEY) || "";

  const MAP_CENTER = (window.APP_CONFIG && window.APP_CONFIG.MAP_CENTER) || [55.751244, 37.618423];
  const MAP_ZOOM = (window.APP_CONFIG && window.APP_CONFIG.MAP_ZOOM) || 11;

  const elMap = document.getElementById("resourcesMap");
  const elList = document.getElementById("resourcesList");
  const elMeta = document.getElementById("resourcesMeta");
  const elSearch = document.getElementById("resourcesSearch");
  const elSuggest = document.getElementById("resourcesSuggest");
  const elReset = document.getElementById("resourcesReset");

  if (!elMap || !elList || !elSearch || !elSuggest || !elMeta || !elReset) return;

  const CATEGORY_LABELS = {
    edu: "Образовательные учреждения",
    community: "Общественные центры",
    library: "Публичные библиотеки",
    private: "Частные языковые курсы",
    cafe: "Языковые кафе или клубы",
  };

  // Небольшой набор ресурсов
  const RESOURCES = [
    {
      id: 1,
      name: "Библиотека иностранной литературы",
      category: "library",
      coords: [55.7486, 37.5797],
      address: "Николоямская ул., 1",
      hours: "Пн–Сб 11:00–21:00",
      phone: "+7 (495) 915-36-41",
      description: "Книги и медиа на разных языках, читальные залы и мероприятия.",
      tags: ["библиотека", "ресурсы", "иностранные языки"],
    },
    {
      id: 2,
      name: "Городской культурный центр «Диалог»",
      category: "community",
      coords: [55.7642, 37.6047],
      address: "ул. Тверская, 12",
      hours: "Ежедневно 10:00–20:00",
      phone: "+7 (999) 111-22-33",
      description: "Лекции, встречи и разговорные клубы (по расписанию).",
      tags: ["культурный центр", "разговорный клуб"],
    },
    {
      id: 3,
      name: "Языковое кафе «Полиглот»",
      category: "cafe",
      coords: [55.7584, 37.6166],
      address: "ул. Петровка, 20/1",
      hours: "Ежедневно 09:00–23:00",
      phone: "+7 (999) 234-56-78",
      description: "Вечера языкового обмена и настольные игры на разных языках.",
      tags: ["кафе", "языковой обмен", "языковой клуб"],
    },
    {
      id: 4,
      name: "Частные курсы «SmartLingua»",
      category: "private",
      coords: [55.7335, 37.5872],
      address: "Комсомольский пр-т, 15",
      hours: "Пн–Пт 10:00–21:00",
      phone: "+7 (999) 345-67-89",
      description: "Групповые занятия и интенсивы, пробное занятие по записи.",
      tags: ["курсы", "иностранный язык"],
    },
    {
      id: 5,
      name: "Учебный центр «Campus»",
      category: "edu",
      coords: [55.7067, 37.5208],
      address: "Ломоносовский пр-т, 27",
      hours: "Пн–Сб 09:00–20:00",
      phone: "+7 (999) 777-00-11",
      description: "Образовательные программы, клубы по интересам, открытые встречи.",
      tags: ["учебный центр", "образование"],
    },
    {
      id: 6,
      name: "Публичная библиотека района",
      category: "library",
      coords: [55.7819, 37.5987],
      address: "ул. Новая, 8",
      hours: "Вт–Вс 12:00–20:00",
      phone: "+7 (999) 555-44-33",
      description: "Подборки учебников и разговорные встречи (иногда).",
      tags: ["библиотека", "учебники"],
    },
    {
      id: 7,
      name: "Культурный центр «Мир языков»",
      category: "community",
      coords: [55.7425, 37.6535],
      address: "ул. Земляной Вал, 33",
      hours: "Пн–Пт 11:00–20:00",
      phone: "+7 (999) 888-12-12",
      description: "Выставки и встречи с носителями языка, тематические вечера.",
      tags: ["культурные центры", "встречи"],
    },
    {
      id: 8,
      name: "Языковой клуб «Speak&Go»",
      category: "cafe",
      coords: [55.7692, 37.6398],
      address: "ул. Сретенка, 24/2",
      hours: "Ср–Вс 17:00–22:00",
      phone: "+7 (999) 101-10-10",
      description: "Разговорная практика по уровням, запись через администатора.",
      tags: ["языковой клуб", "разговорная практика"],
    },
  ];

  let map = null;
  let placemarksById = new Map();
  let userPlacemark = null;

  function loadYmapsScript() {
    return new Promise((resolve, reject) => {
      if (window.ymaps && typeof window.ymaps.ready === "function") {
        resolve();
        return;
      }

      if (!MAP_KEY) {
        reject(new Error("NO_KEY"));
        return;
      }

      const s = document.createElement("script");
      s.src = `https://api-maps.yandex.ru/2.1/?apikey=${encodeURIComponent(MAP_KEY)}&lang=ru_RU`;
      s.defer = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("LOAD_FAIL"));
      document.head.appendChild(s);
    });
  }

  function buildBalloonHtml(r) {
    const safe = (x) => U.escapeHtml(String(x || "—"));

    return `
      <div style="max-width: 280px;">
        <div style="font-weight: 700; margin-bottom: 6px;">${safe(r.name)}</div>
        <div style="margin-bottom: 6px;">
          <div><span style="color:#6c757d;">Адрес:</span> ${safe(r.address)}</div>
          <div><span style="color:#6c757d;">Часы:</span> ${safe(r.hours)}</div>
          <div><span style="color:#6c757d;">Контакты:</span> ${safe(r.phone)}</div>
        </div>
        <div style="color:#495057; font-size: 13px;">${safe(r.description)}</div>
      </div>
    `;
  }

  function createPlacemark(r) {
    return new ymaps.Placemark(
      r.coords,
      {
        balloonContent: buildBalloonHtml(r),
        hintContent: U.escapeHtml(r.name),
      },
      {
        preset: "islands#blueIcon",
      }
    );
  }

  function getActiveCategories() {
    const checked = Array.from(document.querySelectorAll('input[name="resFilter"]:checked'))
      .map((x) => x.value)
      .filter(Boolean);

    return checked.length ? checked : Object.keys(CATEGORY_LABELS);
  }

  function matchesSearch(r, q) {
    if (!q) return true;
    const text = [
      r.name,
      r.address,
      r.description,
      (r.tags || []).join(" "),
      CATEGORY_LABELS[r.category] || "",
    ]
      .join(" ")
      .toLowerCase();

    return text.includes(q);
  }

  function applyFilters() {
    const q = (elSearch.value || "").trim().toLowerCase();
    const cats = getActiveCategories();

    const filtered = RESOURCES.filter((r) => cats.includes(r.category) && matchesSearch(r, q));
    renderList(filtered);
    renderMarkers(filtered);
    elMeta.textContent = `Найдено: ${filtered.length}`;
  }

  function renderList(list) {
    if (!list.length) {
      elList.innerHTML = `<div class="text-secondary small">По вашему запросу ничего не найдено.</div>`;
      return;
    }

    elList.innerHTML = list
      .map((r) => {
        const cat = CATEGORY_LABELS[r.category] || "—";
        return `
          <div class="resource-item" data-id="${r.id}">
            <div class="resource-title">${U.escapeHtml(r.name)}</div>
            <div class="resource-meta">${U.escapeHtml(cat)} • ${U.escapeHtml(r.address)}</div>
          </div>
        `;
      })
      .join("");

    elList.querySelectorAll(".resource-item").forEach((item) => {
      item.addEventListener("click", () => {
        const id = Number(item.getAttribute("data-id"));
        focusOnResource(id);
      });
    });
  }

  function renderMarkers(list) {
    if (!map) return;

    map.geoObjects.removeAll();
    placemarksById.clear();

    if (userPlacemark) {
      map.geoObjects.add(userPlacemark);
    }

    list.forEach((r) => {
      const pm = createPlacemark(r);
      placemarksById.set(r.id, pm);
      map.geoObjects.add(pm);
    });

    const bounds = map.geoObjects.getBounds();
    if (bounds) {
      map.setBounds(bounds, { checkZoomRange: true, zoomMargin: 40 });
    }
  }

  function focusOnResource(id) {
    if (!map) return;
    const pm = placemarksById.get(id);
    const r = RESOURCES.find((x) => x.id === id);
    if (!pm || !r) return;

    map.setCenter(r.coords, Math.max(map.getZoom(), 14), { duration: 250 });
    pm.balloon.open();
  }

  function tryGeolocationButton() {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = [pos.coords.latitude, pos.coords.longitude];

        if (map) {
          userPlacemark = new ymaps.Placemark(
            coords,
            { hintContent: "Вы здесь" },
            { preset: "islands#redDotIcon" }
          );
          map.geoObjects.add(userPlacemark);
        }
      },
      () => {
      },
      { enableHighAccuracy: false, timeout: 4000 }
    );
  }

  function initMap() {
    map = new ymaps.Map("resourcesMap", {
      center: MAP_CENTER,
      zoom: MAP_ZOOM,
      controls: ["zoomControl", "geolocationControl"],
    });

    applyFilters();
    tryGeolocationButton();
  }

  function bindUi() {
    elSearch.addEventListener("input", applyFilters);

    elSuggest.addEventListener("change", () => {
      const v = (elSuggest.value || "").trim();
      if (v) elSearch.value = v;
      applyFilters();
    });

    document.querySelectorAll('input[name="resFilter"]').forEach((cb) => {
      cb.addEventListener("change", applyFilters);
    });

    elReset.addEventListener("click", () => {
      elSearch.value = "";
      elSuggest.value = "";
      document.querySelectorAll('input[name="resFilter"]').forEach((cb) => {
        cb.checked = false;
      });
      applyFilters();
    });
  }

  document.addEventListener("DOMContentLoaded", async () => {
    bindUi();

    try {
      await loadYmapsScript();
      window.ymaps.ready(initMap);
    } catch (e) {
      elMeta.textContent = `Найдено: ${RESOURCES.length}`;
      renderList(RESOURCES);
    }
  });
})();
