// API-клиент для учебного сервиса (fetch-обёртка + нормализация ошибок)
// Все запросы автоматически добавляют api_key в query-string

(function () {
  const cfg = window.APP_CONFIG;

  function buildUrl(path, params = {}) {
    const url = new URL(cfg.API_BASE_URL + path);

    url.searchParams.set("api_key", cfg.API_KEY || "");

    Object.keys(params).forEach((k) => {
      if (params[k] !== undefined && params[k] !== null && params[k] !== "") {
        url.searchParams.set(k, params[k]);
      }
    });

    return url.toString();
  }

  function normalizeErrorMessage(msg) {
    const m = String(msg || "");
    if (/api_key|api|авторизац|доступ/i.test(m)) {
      return "Не удалось получить доступ к сервису. Пожалуйста, попробуйте позже.";
    }
    return m || "Произошла ошибка. Попробуйте позже.";
  }

  async function request(method, path, body) {
    const url = buildUrl(path);

    const options = {
      method,
      headers: {
        "Content-Type": "application/json",
      },
    };

    if (body !== undefined) {
      options.body = JSON.stringify(body);
    }

    const res = await fetch(url, options);

    let data = null;
    try {
      data = await res.json();
    } catch (e) {
      data = null;
    }

    if (!res.ok) {
      const rawMsg =
        (data && (data.error || data.message)) || `Ошибка сервера: ${res.status}`;
      throw new Error(normalizeErrorMessage(rawMsg));
    }

    return data;
  }

  window.Api = {
    getCourses() {
      return request("GET", "/api/courses");
    },
    getTutors() {
      return request("GET", "/api/tutors");
    },
    getOrders() {
      return request("GET", "/api/orders");
    },
    createOrder(payload) {
      return request("POST", "/api/orders", payload);
    },
    updateOrder(id, payload) {
      return request("PUT", `/api/orders/${id}`, payload);
    },
    deleteOrder(id) {
      return request("DELETE", `/api/orders/${id}`);
    },

    async getCourseById(id) {
      try {
        return await request("GET", `/api/course/${id}`);
      } catch (e) {
        return await request("GET", `/api/courses/${id}`);
      }
    },
    async getTutorById(id) {
      try {
        return await request("GET", `/api/tutors/${id}`);
      } catch (e) {
        return await request("GET", `/api/tutor/${id}`);
      }
    },
    async getOrderById(id) {
      return request("GET", `/api/orders/${id}`);
    },
  };
})();
