// ───────────── DoorstepsWash Shared App Logic ─────────────
const WA = "919469793349";

// ⚠️ SET THIS after deploying your Cloudflare Worker:
// e.g. "https://doorstepswash-api.yourname.workers.dev"
const BACKEND_URL = "https://doorstepswash-api.amitkumar300ee.workers.dev";

// ───────────── AUTH STORAGE ─────────────
function getToken() {
  try { return localStorage.getItem("hs_token") || ""; } catch (e) { return ""; }
}
function setToken(token) {
  try { localStorage.setItem("hs_token", token); } catch (e) {}
}
function clearToken() {
  try { localStorage.removeItem("hs_token"); localStorage.removeItem("hs_user"); } catch (e) {}
}
function getUser() {
  try { return JSON.parse(localStorage.getItem("hs_user") || "null"); } catch (e) { return null; }
}
function setUser(user) {
  try { localStorage.setItem("hs_user", JSON.stringify(user)); } catch (e) {}
}
function isLoggedIn() {
  return !!getToken();
}

// ───────────── API HELPERS ─────────────
async function apiPost(path, body, auth = false) {
  const headers = { "Content-Type": "application/json" };
  if (auth) headers["Authorization"] = "Bearer " + getToken();
  const res = await fetch(BACKEND_URL + path, {
    method: "POST",
    headers,
    body: JSON.stringify(body || {}),
  });
  return res.json();
}
async function apiGet(path, auth = false) {
  const headers = {};
  if (auth) headers["Authorization"] = "Bearer " + getToken();
  const res = await fetch(BACKEND_URL + path, { headers });
  return res.json();
}

// Fetch fresh user profile from backend and update localStorage
async function refreshUserProfile() {
  if (!isLoggedIn() || !BACKEND_URL) return getUser();
  try {
    const j = await apiGet("/api/profile", true);
    if (j.success && j.user) {
      setUser(j.user);
      return j.user;
    }
  } catch (e) {}
  return getUser();
}

// ───────────── DRAWER ─────────────
function openDrawer() {
  document.getElementById("drawer").classList.add("open");
  document.getElementById("drawerOverlay").classList.add("show");
  document.body.style.overflow = "hidden";
}
function closeDrawer() {
  document.getElementById("drawer").classList.remove("open");
  document.getElementById("drawerOverlay").classList.remove("show");
  document.body.style.overflow = "";
}

// ───────────── SCROLL REVEAL ─────────────
function initReveal() {
  const obs = new IntersectionObserver(
    (es) => es.forEach((e) => { if (e.isIntersecting) e.target.classList.add("in"); }),
    { threshold: 0.08 }
  );
  document.querySelectorAll(".rv").forEach((el) => obs.observe(el));
}

// ───────────── BOTTOM NAV ACTIVE STATE ─────────────
function setActiveNav(page) {
  document.querySelectorAll(".bn-item").forEach((b) => b.classList.remove("active"));
  const el = document.getElementById("nav-" + page);
  if (el) el.classList.add("active");
}

// ───────────── FAQ ACCORDION ─────────────
function faqT(btn) {
  const item = btn.parentElement;
  const open = item.classList.contains("open");
  document.querySelectorAll(".faqq").forEach((q) => q.classList.remove("open"));
  if (!open) item.classList.add("open");
}

// ───────────── HERO SLIDER ─────────────
let _slideCur = 0, _slideTot = 3, _slideTimer;
function goSlide(n) {
  _slideCur = n;
  const el = document.getElementById("slides");
  if (!el) return;
  el.style.transform = `translateX(-${_slideCur * 100}%)`;
  document.querySelectorAll(".dot").forEach((d, i) => d.classList.toggle("active", i === _slideCur));
  clearInterval(_slideTimer);
  startSlideTimer();
}
function startSlideTimer() {
  _slideTimer = setInterval(() => goSlide((_slideCur + 1) % _slideTot), 4200);
}
function initSlider() {
  const sl = document.getElementById("slides");
  if (!sl) return;
  startSlideTimer();
  let tx = 0;
  sl.addEventListener("touchstart", (e) => (tx = e.touches[0].clientX), { passive: true });
  sl.addEventListener(
    "touchend",
    (e) => {
      const dx = e.changedTouches[0].clientX - tx;
      if (Math.abs(dx) > 40) goSlide(dx < 0 ? (_slideCur + 1) % _slideTot : (_slideCur - 1 + _slideTot) % _slideTot);
    },
    { passive: true }
  );
}

// ───────────── FORM VALIDATION HELPER ─────────────
function vf(id, eid, ok) {
  const el = document.getElementById(id), er = document.getElementById(eid);
  if (!ok) { el.classList.add("err"); er.style.display = "block"; return false; }
  el.classList.remove("err"); er.style.display = "none"; return true;
}

// ───────────── BOOKING SUBMIT ─────────────
async function bookNow() {
  const nm = document.getElementById("f_name").value.trim();
  const ph = document.getElementById("f_phone").value.trim();
  const sv = document.getElementById("f_service").value;
  const dt = document.getElementById("f_date").value;
  const tm = document.getElementById("f_time").value;
  const ad = document.getElementById("f_address").value.trim();
  const ao = document.getElementById("f_addon").value;
  const nt = document.getElementById("f_notes").value.trim();

  const ok =
    vf("f_name", "e_name", nm.length >= 2) &
    vf("f_phone", "e_phone", /^[0-9+\s\-]{7,15}$/.test(ph)) &
    vf("f_service", "e_service", sv !== "") &
    vf("f_date", "e_date", dt !== "") &
    vf("f_time", "e_time", tm !== "") &
    vf("f_address", "e_address", ad.length >= 8);
  if (!ok) return;

  const btn = document.getElementById("subBtn");
  const txt = document.getElementById("subTxt");
  const sp = document.getElementById("subSp");
  btn.disabled = true; txt.textContent = "Submitting…"; sp.style.display = "block";

  const data = {
    name: nm, phone: ph, service: sv, addon: ao, date: dt, time: tm,
    address: ad, notes: nt || "None",
  };

  const method = document.querySelector('input[name="bookmethod"]:checked')?.value || "backend";

  if (method === "whatsapp") {
    openWA(data);
    btn.disabled = false; txt.textContent = "🚗 Confirm Booking"; sp.style.display = "none";
    return;
  }

  if (!BACKEND_URL) {
    showBad("Backend not configured yet. Please use WhatsApp booking instead.");
    btn.disabled = false; txt.textContent = "🚗 Confirm Booking"; sp.style.display = "none";
    return;
  }
  try {
    const j = await apiPost("/api/booking", data, isLoggedIn());
    if (j.success) {
      showOk(data, false, j.booking_id);
    } else {
      showBad(j.message || "Something went wrong. Please try WhatsApp.");
    }
  } catch (e) {
    showBad("Connection error. Please try WhatsApp booking.");
  }
  btn.disabled = false; txt.textContent = "🚗 Confirm Booking"; sp.style.display = "none";
}

function openWA(d) {
  const msg = `🚗 *New Booking – DoorstepsWash Jammu*\n\n👤 ${d.name}\n📞 ${d.phone}\n🛠️ ${d.service}\n➕ ${d.addon}\n📅 ${d.date} · ${d.time}\n📍 ${d.address}\n📝 ${d.notes}`;
  window.open(`https://wa.me/${WA}?text=${encodeURIComponent(msg)}`, "_blank");
  showOk(d, true);
}

function showOk(d, wa, bookingId) {
  const t = document.getElementById("toastMsg");
  t.className = "toast ok";
  if (wa) {
    t.innerHTML = `✅ WhatsApp opened! Send the message to confirm your booking for <b>${d.date}</b> at <b>${d.time}</b>.`;
  } else {
    t.innerHTML = `✅ Booking submitted! Status: <b>Pending</b>. We'll confirm shortly.` +
      (isLoggedIn() ? ` Track it in <b>My Bookings</b>.` : ` <a href="account.html" style="color:var(--teal);text-decoration:underline">Login</a> to track your bookings.`);
  }
  t.style.display = "block";
  ["f_name", "f_phone", "f_address", "f_notes"].forEach((id) => { const e = document.getElementById(id); if (e) e.value = ""; });
  ["f_service", "f_date", "f_time", "f_addon"].forEach((id) => { const e = document.getElementById(id); if (e) e.value = ""; });
  setTimeout(() => (t.style.display = "none"), 9000);
}
function showBad(m) {
  const t = document.getElementById("toastMsg");
  t.className = "toast bad"; t.textContent = "❌ " + m; t.style.display = "block";
  setTimeout(() => (t.style.display = "none"), 6000);
}

// ───────────── PRE-FILL BOOKING FORM ─────────────
function prefillBookingForm() {
  const params = new URLSearchParams(window.location.search);
  const service = params.get("service");
  if (service) {
    const sel = document.getElementById("f_service");
    if (sel) {
      for (const opt of sel.options) {
        if (opt.value.toLowerCase().includes(service.toLowerCase())) {
          sel.value = opt.value;
          break;
        }
      }
    }
  }
  const user = getUser();
  if (user) {
    const nm = document.getElementById("f_name");
    const ph = document.getElementById("f_phone");
    if (nm && !nm.value) nm.value = user.name || "";
    if (ph && !ph.value) ph.value = user.phone || "";
  }
}

// ───────────── DYNAMIC PRICING LOADER ─────────────
async function loadPricing() {
  if (!BACKEND_URL) return null;
  try {
    const j = await apiGet("/api/settings/pricing");
    if (!j.success) return null;
    const p = j.pricing;
    window.HS_PRICING = p;
    document.querySelectorAll("[data-price]").forEach((el) => {
      const path = el.getAttribute("data-price").split(".");
      let val = p;
      for (const key of path) {
        if (val && typeof val === "object" && key in val) val = val[key];
        else { val = undefined; break; }
      }
      if (val !== undefined) el.textContent = val;
    });
    return p;
  } catch (e) {
    return null;
  }
}

// ───────────── REBUILD BOOKING SELECTS FROM PRICING ─────────────
function rebuildBookingSelects(pricing) {
  if (!pricing) return;
  const svcSel = document.getElementById("f_service");
  const addonSel = document.getElementById("f_addon");

  if (svcSel) {
    const s = pricing.services || {};
    const opts = ['<option value="">— Choose service —</option>'];
    if (s.hatchback) opts.push(`<option value="${s.hatchback.label} – ₹${s.hatchback.price_min} to ₹${s.hatchback.price_max}">${s.hatchback.label} – ₹${s.hatchback.price_min} to ₹${s.hatchback.price_max}</option>`);
    if (s.sedan) opts.push(`<option value="${s.sedan.label} – ₹${s.sedan.price_min} to ₹${s.sedan.price_max}">${s.sedan.label} – ₹${s.sedan.price_min} to ₹${s.sedan.price_max}</option>`);
    if (s.suv) opts.push(`<option value="${s.suv.label} – ₹${s.suv.price_min} to ₹${s.suv.price_max}">${s.suv.label} – ₹${s.suv.price_min} to ₹${s.suv.price_max}</option>`);
    if (s.bike) opts.push(`<option value="${s.bike.label} – ₹${s.bike.price}">${s.bike.label} – ₹${s.bike.price}</option>`);
    if (s.premium) opts.push(`<option value="${s.premium.label} – ₹${s.premium.price}+">${s.premium.label} – ₹${s.premium.price}+</option>`);
    const prevValue = svcSel.value;
    svcSel.innerHTML = opts.join("");
    if (prevValue) svcSel.value = prevValue;
  }

  if (addonSel) {
    const a = pricing.addons || {};
    const opts = ['<option value="None">No add-ons</option>'];
    for (const key in a) {
      const item = a[key];
      const suffix = key === "interior_deep_clean" ? "+" : "";
      opts.push(`<option value="${item.label} – ₹${item.price}${suffix}">${item.label} – ₹${item.price}${suffix}</option>`);
    }
    const prevValue = addonSel.value;
    addonSel.innerHTML = opts.join("");
    if (prevValue) addonSel.value = prevValue;
  }
}

function injectDesktopNav(activePage) {
  const header = document.querySelector(".header");
  if (!header) return;
  if (window.innerWidth < 900) return;
  if (header.querySelector(".desktop-nav")) return;

  const links = [
    { href: "index.html#services", label: "Services", page: "home" },
    { href: "index.html#pricing", label: "Pricing", page: "home" },
    { href: "index.html#areas", label: "Areas", page: "home" },
    { href: "booking.html", label: "Book a Wash", page: "booking" },
    { href: "my-bookings.html", label: "My Bookings", page: "bookings" },
    { href: "index.html#reviews", label: "Reviews", page: "home" },
    { href: "index.html#faq", label: "FAQ", page: "home" },
  ];

  const nav = document.createElement("div");
  nav.className = "desktop-nav";
  nav.innerHTML = links
    .map((l) => `<a href="${l.href}"${l.page === activePage ? ' class="active"' : ""}>${l.label}</a>`)
    .join("");

  const logo = header.querySelector(".header-logo, .header-title");
  const rightBtn = header.querySelector(".call-btn");
  if (logo && rightBtn) {
    header.insertBefore(nav, rightBtn);
  } else {
    header.appendChild(nav);
  }

  if (!header.querySelector(".desktop-account-link")) {
    const acc = document.createElement("a");
    acc.href = "account.html";
    acc.className = "desktop-account-link";
    acc.style.cssText = "display:flex;align-items:center;gap:6px;font-size:.85rem;font-weight:700;color:var(--gray);margin-left:16px";
    acc.innerHTML = `👤 ${isLoggedIn() ? (getUser()?.name || "Account").split(" ")[0] : "Login"}`;
    if (rightBtn) rightBtn.parentElement.insertBefore(acc, rightBtn.nextSibling);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const dateEl = document.getElementById("f_date");
  if (dateEl) dateEl.min = new Date().toISOString().split("T")[0];
  initReveal();
  initSlider();
  injectDesktopNav(window.HS_PAGE || "home");
  window.addEventListener("resize", () => injectDesktopNav(window.HS_PAGE || "home"));
  loadPricing().then((p) => {
    if (p) rebuildBookingSelects(p);
    if (window.HS_PAGE === "booking") prefillBookingForm();
  });
});

// ───────────── SHARE APP ─────────────
function shareApp() {
  const shareData = {
    title: 'DoorstepsWash Jammu',
    text: '🚗 Doorstep Car Wash in Jammu! Book online — Clean. Shine. Protect. 💧',
    url: 'https://doorstepswash.in'
  };
  if (typeof Android !== 'undefined') {
    Android.shareApp();
  } else if (navigator.share) {
    navigator.share(shareData).catch(() => {});
  } else {
    const txt = `${shareData.text}\n${shareData.url}`;
    navigator.clipboard?.writeText(txt).then(() => alert('Link copied! Share it with friends.')).catch(() => {
      prompt('Copy this link:', shareData.url);
    });
  }
}
