(() => {
  let scheduled = false;

  function queueCategoryFromCode(code) {
    const value = String(code || "").trim().toUpperCase();
    if (value.startsWith("G")) return "general";
    if (value.startsWith("D")) return "dental";
    return "";
  }

  function applyReceptionLayout() {
    if (!window.location.pathname.startsWith("/reception")) return;

    const table = document.querySelector(".queue-table");
    if (!table) return;
    table.classList.add("careflow-category-columns");

    const rows = table.querySelectorAll(".queue-row:not(.queue-head)");
    rows.forEach((row) => {
      const code = row.querySelector("strong")?.textContent || "";
      const category = queueCategoryFromCode(code);
      if (category) row.setAttribute("data-careflow-category", category);
    });
  }

  function applyNurseLayout() {
    if (!window.location.pathname.startsWith("/nurse")) return;

    const list = document.querySelector(".nurse-list");
    if (!list) return;

    let visibleGeneral = 0;
    const cards = list.querySelectorAll(".nurse-card");
    cards.forEach((card) => {
      const code = card.querySelector("strong")?.textContent || "";
      const category = queueCategoryFromCode(code);
      const isDental = category === "dental";
      card.toggleAttribute("hidden", isDental);
      if (category === "general" && !isDental) visibleGeneral += 1;
    });

    let empty = document.getElementById("careflow-general-empty");
    if (visibleGeneral === 0) {
      if (!empty) {
        empty = document.createElement("div");
        empty.id = "careflow-general-empty";
        empty.textContent = "No General queue numbers are waiting for the nurse.";
        list.appendChild(empty);
      }
    } else {
      empty?.remove();
    }
  }

  function apply() {
    scheduled = false;
    applyReceptionLayout();
    applyNurseLayout();
  }

  function scheduleApply() {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(apply);
  }

  document.addEventListener(
    "click",
    (event) => {
      if (!window.location.pathname.startsWith("/nurse")) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const button = target.closest("button");
      if (!button || !/^Call next$/i.test((button.textContent || "").trim())) return;

      const cards = Array.from(document.querySelectorAll(".nurse-card:not([hidden])"));
      const nextGeneralWaiting = cards.find((card) => {
        const status = (card.querySelector("span")?.textContent || "").trim().toLowerCase();
        const code = card.querySelector("strong")?.textContent || "";
        return queueCategoryFromCode(code) === "general" && status === "waiting";
      });

      if (!nextGeneralWaiting) return;
      const calledButton = Array.from(nextGeneralWaiting.querySelectorAll("button")).find(
        (candidate) => /^Called$/i.test((candidate.textContent || "").trim()),
      );
      if (!calledButton) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      calledButton.click();
    },
    true,
  );

  const observer = new MutationObserver(scheduleApply);

  function start() {
    apply();
    const root = document.getElementById("root");
    if (root) observer.observe(root, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();