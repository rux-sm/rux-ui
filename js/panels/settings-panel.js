(function () {
  "use strict";

  const YARD_KEY = "yard-location-v1";
  const MAPBOX_TOKEN_KEY = "mapbox-token-v1";
  const SPOT_PADDING_KEY = "spot-padding-v1";
  const MISSIVE_URL_KEY = "missive-search-url-v1";
  const DEFAULT_MISSIVE_URL = "https://mail.missiveapp.com/#search/";
  const DEFAULT_SPOT_PADDING = 15;
  const DEFAULT_YARD = {
    name: "Yard",
    address: "2801 Zinnia Ave, McAllen, TX 78504",
    lat: null,
    lng: null,
  };

  const root = document.querySelector('.scheduler-app__module[data-module="settings"]');
  const nameInput = document.getElementById("settings-yard-name");
  const addressInput = document.getElementById("settings-yard-address");
  const latInput = document.getElementById("settings-yard-lat");
  const lngInput = document.getElementById("settings-yard-lng");
  const statusEl = document.getElementById("settings-yard-status");
  const messageEl = document.getElementById("settings-yard-message");
  const saveBtn = document.getElementById("settings-yard-save-btn");
  const defaultBtn = document.getElementById("settings-yard-default-btn");
  const verifyBtn = document.getElementById("settings-yard-verify-btn");
  const mapboxTokenInput = document.getElementById("settings-mapbox-token");
  const mapboxStatusEl = document.getElementById("settings-mapbox-status");
  const mapboxMessageEl = document.getElementById("settings-mapbox-message");
  const mapboxSaveBtn = document.getElementById("settings-mapbox-save-btn");

  const locationsListEl = document.getElementById("settings-locations-list");
  const locationEditorEl = document.getElementById("settings-location-editor");
  const locationNameInput = document.getElementById("settings-location-name");
  const locationAddressInput = document.getElementById("settings-location-address");
  const locationLatInput = document.getElementById("settings-location-lat");
  const locationLngInput = document.getElementById("settings-location-lng");
  const locationsMessageEl = document.getElementById("settings-locations-message");
  const locationAddBtn = document.getElementById("settings-location-add-btn");
  const locationVerifyBtn = document.getElementById("settings-location-verify-btn");
  const locationCancelBtn = document.getElementById("settings-location-cancel-btn");
  const locationSaveBtn = document.getElementById("settings-location-save-btn");

  const missiveUrlInput = document.getElementById("settings-missive-url");
  const missiveMessageEl = document.getElementById("settings-integrations-message");
  const missiveSaveBtn = document.getElementById("settings-integrations-save-btn");

  const forceRefreshBtn = document.getElementById("settings-force-refresh-btn");
  const forceRefreshMessageEl = document.getElementById("settings-force-refresh-message");

  const spotPaddingInput = document.getElementById("settings-spot-padding");
  const billingWorkflowEl = document.getElementById("settings-billing-workflow");
  const billingConfirmEl = document.getElementById("settings-billing-confirm");
  const billingMessageEl = document.getElementById("settings-billing-message");
  const billingSaveBtn = document.getElementById("settings-billing-save-btn");
  const billingDefaultBtn = document.getElementById("settings-billing-default-btn");

  let db = null;
  let locationsDb = null;
  let initialized = false;
  let currentYard = { ...DEFAULT_YARD };
  let spotPaddingMins = DEFAULT_SPOT_PADDING;
  let billingConfig = window.RuxBilling?.getConfig?.() || null;
  let mapboxToken = "";
  let missiveSearchUrl = DEFAULT_MISSIVE_URL;
  let yardSearchTimer = null;
  let yardSearchSeq = 0;
  let yardSessionToken = uuid();
  let yardSuggestions = [];
  let yardSuggestionsEl = null;
  let savedLocations = [];
  let editingLocationId = null;

  function escHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function uuid() {
    return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function parseCoordinate(value) {
    if (value === null || value === undefined || value === "") return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function normalizeYard(value) {
    const yard = value && typeof value === "object" ? value : {};
    return {
      name: String(yard.name || DEFAULT_YARD.name).trim() || DEFAULT_YARD.name,
      address: String(yard.address || DEFAULT_YARD.address).trim() || DEFAULT_YARD.address,
      lat: parseCoordinate(yard.lat),
      lng: parseCoordinate(yard.lng),
    };
  }

  function setMessage(text = "", state = "") {
    if (!messageEl) return;
    messageEl.textContent = text;
    messageEl.classList.toggle("is-error", state === "error");
    messageEl.classList.toggle("is-success", state === "success");
  }

  function setMapboxMessage(text = "", state = "") {
    if (!mapboxMessageEl) return;
    mapboxMessageEl.textContent = text;
    mapboxMessageEl.classList.toggle("is-error", state === "error");
    mapboxMessageEl.classList.toggle("is-success", state === "success");
  }

  function setLocationsMessage(text = "", state = "") {
    if (!locationsMessageEl) return;
    locationsMessageEl.textContent = text;
    locationsMessageEl.classList.toggle("is-error", state === "error");
    locationsMessageEl.classList.toggle("is-success", state === "success");
  }

  function setBillingMessage(text = "", state = "") {
    if (!billingMessageEl) return;
    billingMessageEl.textContent = text;
    billingMessageEl.classList.toggle("is-error", state === "error");
    billingMessageEl.classList.toggle("is-success", state === "success");
  }

  function setMapboxStatus(hasToken) {
    if (!mapboxStatusEl) return;
    mapboxStatusEl.textContent = hasToken ? "Saved" : "Not set";
    mapboxStatusEl.classList.toggle("rux-badge--info", !hasToken);
    mapboxStatusEl.classList.toggle("rux-badge--success", hasToken);
  }

  function setStatus(isDefault) {
    if (!statusEl) return;
    statusEl.textContent = isDefault ? "Default" : "Saved";
    statusEl.classList.toggle("rux-badge--info", isDefault);
    statusEl.classList.toggle("rux-badge--success", !isDefault);
  }

  function fillForm(yard) {
    if (!nameInput || !addressInput || !latInput || !lngInput) return;
    nameInput.value = yard.name || "";
    addressInput.value = yard.address || "";
    latInput.value = yard.lat == null ? "" : String(yard.lat);
    lngInput.value = yard.lng == null ? "" : String(yard.lng);
  }

  function ensureYardSuggestions() {
    if (yardSuggestionsEl) return yardSuggestionsEl;
    yardSuggestionsEl = document.createElement("div");
    yardSuggestionsEl.className = "settings-app__suggestions";
    yardSuggestionsEl.hidden = true;
    yardSuggestionsEl.setAttribute("role", "listbox");
    yardSuggestionsEl.setAttribute("aria-label", "Yard address suggestions");
    document.body.appendChild(yardSuggestionsEl);
    return yardSuggestionsEl;
  }

  function hideYardSuggestions() {
    if (!yardSuggestionsEl) return;
    yardSuggestionsEl.hidden = true;
    yardSuggestionsEl.innerHTML = "";
    yardSuggestions = [];
  }

  function positionYardSuggestions() {
    if (!addressInput) return;
    const suggestionsEl = ensureYardSuggestions();
    const rect = addressInput.getBoundingClientRect();
    const margin = 8;
    const width = Math.max(rect.width, 240);
    suggestionsEl.style.left = `${Math.max(margin, Math.min(rect.left, window.innerWidth - width - margin))}px`;
    suggestionsEl.style.top = `${rect.bottom + 4}px`;
    suggestionsEl.style.width = `${Math.min(width, window.innerWidth - margin * 2)}px`;
  }

  function suggestionLabel(suggestion) {
    return suggestion.full_address ||
      [suggestion.name, suggestion.place_formatted].filter(Boolean).join(", ") ||
      suggestion.name ||
      "Address";
  }

  function featureLabel(feature, fallback = "") {
    const props = feature?.properties || {};
    return props.full_address ||
      [props.name, props.place_formatted].filter(Boolean).join(", ") ||
      fallback ||
      "Address";
  }

  function applyYardFeature(feature, fallbackLabel = "") {
    const props = feature?.properties || {};
    const coords = feature?.geometry?.coordinates || [
      props.coordinates?.longitude,
      props.coordinates?.latitude,
    ];
    const lng = Number(coords?.[0]);
    const lat = Number(coords?.[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new Error("Mapbox did not return coordinates for that address.");
    }
    addressInput.value = featureLabel(feature, fallbackLabel);
    latInput.value = String(lat);
    lngInput.value = String(lng);
    setMessage("Yard address verified. Save yard to keep it.", "success");
  }

  function renderYardSuggestions(suggestions) {
    const suggestionsEl = ensureYardSuggestions();
    yardSuggestions = suggestions;
    if (!suggestions.length) {
      hideYardSuggestions();
      return;
    }
    positionYardSuggestions();
    suggestionsEl.innerHTML = suggestions.map((suggestion, i) => `
      <button class="settings-app__suggestion" type="button" role="option" data-suggestion-idx="${i}">
        <span class="settings-app__suggestion-name">${escHtml(suggestion.name || suggestionLabel(suggestion))}</span>
        <span class="settings-app__suggestion-address">${escHtml(suggestion.place_formatted || suggestion.full_address || "")}</span>
      </button>
    `).join("");
    suggestionsEl.hidden = false;
  }

  async function suggestYardAddress() {
    const token = mapboxToken;
    const q = addressInput?.value.trim() || "";
    if (!token || q.length < 3) {
      hideYardSuggestions();
      return;
    }
    const seq = ++yardSearchSeq;
    const url = new URL("https://api.mapbox.com/search/searchbox/v1/suggest");
    url.searchParams.set("q", q);
    url.searchParams.set("session_token", yardSessionToken);
    url.searchParams.set("access_token", token);
    url.searchParams.set("country", "US");
    url.searchParams.set("types", "address,poi");
    url.searchParams.set("limit", "5");
    url.searchParams.set("proximity", "ip");
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Mapbox suggest failed: ${response.status}`);
      const data = await response.json();
      if (seq !== yardSearchSeq) return;
      renderYardSuggestions(data.suggestions || []);
    } catch (err) {
      console.warn("Yard address suggestions failed:", err);
      hideYardSuggestions();
    }
  }

  async function retrieveYardSuggestion(suggestion) {
    const token = mapboxToken;
    if (!token || !suggestion?.mapbox_id) return;
    const url = new URL(`https://api.mapbox.com/search/searchbox/v1/retrieve/${encodeURIComponent(suggestion.mapbox_id)}`);
    url.searchParams.set("session_token", yardSessionToken);
    url.searchParams.set("access_token", token);
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Mapbox retrieve failed: ${response.status}`);
      const data = await response.json();
      applyYardFeature(data.features?.[0], suggestionLabel(suggestion));
      yardSessionToken = uuid();
      hideYardSuggestions();
    } catch (err) {
      console.warn("Yard address retrieve failed:", err);
      setMessage(err?.message || "Could not verify yard address.", "error");
    }
  }

  async function verifyYardAddress() {
    const token = mapboxToken;
    const q = addressInput?.value.trim() || "";
    if (!token) throw new Error("Save a Mapbox public token first.");
    if (q.length < 3) throw new Error("Enter a yard address to verify.");

    const url = new URL("https://api.mapbox.com/search/searchbox/v1/forward");
    url.searchParams.set("q", q);
    url.searchParams.set("access_token", token);
    url.searchParams.set("country", "US");
    url.searchParams.set("types", "address,poi");
    url.searchParams.set("limit", "1");
    url.searchParams.set("proximity", "ip");
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Mapbox verify failed: ${response.status}`);
    const data = await response.json();
    const feature = data.features?.[0];
    if (!feature) throw new Error("No verified address found.");
    applyYardFeature(feature, q);
    hideYardSuggestions();
  }

  function readForm() {
    const lat = latInput.value.trim();
    const lng = lngInput.value.trim();
    const yard = {
      name: nameInput.value.trim(),
      address: addressInput.value.trim(),
      lat: lat ? Number(lat) : null,
      lng: lng ? Number(lng) : null,
    };
    if (!yard.name) throw new Error("Yard name is required.");
    if (!yard.address) throw new Error("Yard address is required.");
    if (lat && !Number.isFinite(yard.lat)) throw new Error("Latitude must be a number.");
    if (lng && !Number.isFinite(yard.lng)) throw new Error("Longitude must be a number.");
    return yard;
  }

  function publishYard(yard) {
    currentYard = normalizeYard(yard);
    window.RuxSettings = {
      ...(window.RuxSettings || {}),
      DEFAULT_YARD,
      getYard: () => ({ ...currentYard }),
      getMapboxToken: () => mapboxToken,
    };
    document.dispatchEvent(new CustomEvent("settings:yard", { detail: { yard: { ...currentYard } } }));
  }

  function publishMapboxToken(token) {
    mapboxToken = String(token || "").trim();
    window.RuxSettings = {
      ...(window.RuxSettings || {}),
      DEFAULT_YARD,
      getYard: () => ({ ...currentYard }),
      getMapboxToken: () => mapboxToken,
    };
    document.dispatchEvent(new CustomEvent("settings:mapbox", { detail: { hasToken: !!mapboxToken } }));
  }

  async function loadYard() {
    if (!db) {
      try {
        db = await import("../data/settings-db.js");
      } catch (err) {
        console.warn("Could not load settings-db:", err);
        publishYard(DEFAULT_YARD);
        fillForm(DEFAULT_YARD);
        setStatus(true);
        setMessage("Using default yard until settings are available.");
        return;
      }
    }

    const saved = await db.getSetting(YARD_KEY);
    const yard = normalizeYard(saved);
    publishYard(yard);
    fillForm(yard);
    setStatus(!saved);
    setMessage(saved ? "" : "Using default yard.");
  }

  async function loadMapboxToken() {
    if (!db) db = await import("../data/settings-db.js");
    const saved = await db.getSetting(MAPBOX_TOKEN_KEY);
    const token = typeof saved === "string" ? saved.trim() : "";
    publishMapboxToken(token);
    if (mapboxTokenInput) mapboxTokenInput.value = token;
    setMapboxStatus(!!token);
    setMapboxMessage(token ? "" : "Address verification is disabled until a token is saved.");
  }

  async function saveYard(yard) {
    if (!db) db = await import("../data/settings-db.js");
    const normalized = normalizeYard(yard);
    await db.setSetting(YARD_KEY, normalized);
    publishYard(normalized);
    setStatus(false);
    setMessage("Yard saved.", "success");
    return normalized;
  }

  async function saveMapboxToken(token) {
    if (!db) db = await import("../data/settings-db.js");
    const normalized = String(token || "").trim();
    await db.setSetting(MAPBOX_TOKEN_KEY, normalized);
    publishMapboxToken(normalized);
    setMapboxStatus(!!normalized);
    setMapboxMessage(normalized ? "Mapbox token saved." : "Mapbox token cleared.", "success");
  }

  async function ensureLocationsDb() {
    if (!locationsDb) locationsDb = await import("../data/locations-db.js?v=1");
    return locationsDb;
  }

  function renderLocations() {
    if (!locationsListEl) return;
    if (!savedLocations.length) {
      locationsListEl.innerHTML = '<p class="settings-locations-empty">No saved locations yet.</p>';
      return;
    }
    locationsListEl.innerHTML = savedLocations.map((location) => `
      <div class="settings-location-row" data-location-id="${escHtml(location.id)}">
        <div class="settings-location-row__details">
          <span class="settings-location-row__name">${escHtml(location.name)}</span>
          <span class="settings-location-row__address rux-u-caption" title="${escHtml(location.address)}">${escHtml(location.address)}</span>
        </div>
        <button class="rux-button rux-button--ghost rux-button--icon" type="button" data-location-edit aria-label="Edit ${escHtml(location.name)}" title="Edit location">
          <span class="rux-icon" aria-hidden="true">edit</span>
        </button>
        <button class="rux-button rux-button--ghost rux-button--icon" type="button" data-location-delete aria-label="Delete ${escHtml(location.name)}" title="Delete location">
          <span class="rux-icon" aria-hidden="true">delete</span>
        </button>
      </div>`).join("");
  }

  async function loadLocations() {
    if (!locationsListEl) return;
    try {
      savedLocations = await (await ensureLocationsDb()).loadLocations({ refresh: true });
      renderLocations();
      setLocationsMessage("");
    } catch (err) {
      console.warn("Could not load saved locations:", err);
      locationsListEl.innerHTML = '<p class="settings-locations-empty">Saved locations are unavailable.</p>';
      setLocationsMessage(err?.message || "Could not load saved locations.", "error");
    }
  }

  function showLocationEditor(location = null) {
    editingLocationId = location?.id || null;
    locationNameInput.value = location?.name || "";
    locationAddressInput.value = location?.address || "";
    locationLatInput.value = location?.lat == null ? "" : String(location.lat);
    locationLngInput.value = location?.lng == null ? "" : String(location.lng);
    locationEditorEl.dataset.mapboxId = location?.mapboxId || "";
    locationEditorEl.hidden = false;
    locationAddBtn.hidden = true;
    locationVerifyBtn.hidden = false;
    locationCancelBtn.hidden = false;
    locationSaveBtn.hidden = false;
    setLocationsMessage(location ? "Editing saved location." : "Enter and verify a new location.");
    locationNameInput.focus();
  }

  function hideLocationEditor() {
    editingLocationId = null;
    locationEditorEl.hidden = true;
    locationAddBtn.hidden = false;
    locationVerifyBtn.hidden = true;
    locationCancelBtn.hidden = true;
    locationSaveBtn.hidden = true;
    setLocationsMessage("");
  }

  async function verifyLocationAddress() {
    const q = locationAddressInput.value.trim();
    if (!mapboxToken) throw new Error("Save a Mapbox public token first.");
    if (q.length < 3) throw new Error("Enter an address to verify.");
    const url = new URL("https://api.mapbox.com/search/searchbox/v1/forward");
    url.searchParams.set("q", q);
    url.searchParams.set("access_token", mapboxToken);
    url.searchParams.set("country", "US");
    url.searchParams.set("types", "address,poi");
    url.searchParams.set("limit", "1");
    url.searchParams.set("proximity", "ip");
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Mapbox verify failed: ${response.status}`);
    const data = await response.json();
    const feature = data.features?.[0];
    if (!feature) throw new Error("No verified location found.");
    const props = feature.properties || {};
    const coords = feature.geometry?.coordinates || [
      props.coordinates?.longitude,
      props.coordinates?.latitude,
    ];
    const lng = Number(coords?.[0]);
    const lat = Number(coords?.[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new Error("Mapbox did not return coordinates for that location.");
    }
    locationAddressInput.value = featureLabel(feature, q);
    locationLatInput.value = String(lat);
    locationLngInput.value = String(lng);
    locationEditorEl.dataset.mapboxId = props.mapbox_id || props.feature_id || "";
    if (!locationNameInput.value.trim() && props.name) locationNameInput.value = props.name;
    setLocationsMessage("Location verified. Save to add it to autofill.", "success");
  }

  function readLocationForm() {
    return {
      id: editingLocationId,
      name: locationNameInput.value.trim(),
      address: locationAddressInput.value.trim(),
      lat: locationLatInput.value,
      lng: locationLngInput.value,
      mapboxId: locationEditorEl.dataset.mapboxId || null,
    };
  }

  function setIntegrationsMessage(text, type) {
    if (!missiveMessageEl) return;
    missiveMessageEl.textContent = text || "";
    missiveMessageEl.className = "settings-app__message" + (type ? ` settings-app__message--${type}` : "");
  }

  function publishMissiveUrl(url) {
    missiveSearchUrl = url || DEFAULT_MISSIVE_URL;
    window.RuxSettings = { ...(window.RuxSettings || {}), getMissiveSearchUrl: () => missiveSearchUrl };
    document.dispatchEvent(new CustomEvent("settings:missive", { detail: { url: missiveSearchUrl } }));
  }

  async function loadMissiveUrl() {
    if (!db) db = await import("../data/settings-db.js");
    const saved = await db.getSetting(MISSIVE_URL_KEY);
    const url = typeof saved === "string" && saved.trim() ? saved.trim() : DEFAULT_MISSIVE_URL;
    publishMissiveUrl(url);
    if (missiveUrlInput) missiveUrlInput.value = url;
  }

  async function saveMissiveUrl(url) {
    if (!db) db = await import("../data/settings-db.js");
    const normalized = String(url || "").trim() || DEFAULT_MISSIVE_URL;
    await db.setSetting(MISSIVE_URL_KEY, normalized);
    publishMissiveUrl(normalized);
    setIntegrationsMessage("Saved.", "success");
  }

  function publishSpotPadding(mins) {
    spotPaddingMins = Number.isFinite(mins) && mins >= 0 ? mins : DEFAULT_SPOT_PADDING;
    window.RuxSettings = {
      ...(window.RuxSettings || {}),
      getSpotPadding: () => spotPaddingMins,
    };
  }

  async function loadSpotPadding() {
    if (!db) db = await import("../data/settings-db.js");
    const saved = await db.getSetting(SPOT_PADDING_KEY);
    const mins = saved != null ? Number(saved) : DEFAULT_SPOT_PADDING;
    publishSpotPadding(Number.isFinite(mins) ? mins : DEFAULT_SPOT_PADDING);
    if (spotPaddingInput) spotPaddingInput.value = spotPaddingMins;
  }

  async function saveSpotPadding(mins) {
    if (!db) db = await import("../data/settings-db.js");
    const normalized = Number.isFinite(mins) && mins >= 0 ? mins : DEFAULT_SPOT_PADDING;
    await db.setSetting(SPOT_PADDING_KEY, normalized);
    publishSpotPadding(normalized);
    if (spotPaddingInput) spotPaddingInput.value = normalized;
  }

  function workflowRowsHtml(config) {
    const labels = {
      contractSigned: "Contract",
      poReceived: "PO",
      invoiced: "Invoice",
    };
    return Object.entries(config.workflow).map(([key, item]) => `
      <div class="settings-billing-row" data-billing-setting="${key}">
        <span class="settings-billing-row__label">${escHtml(labels[key] || key)}</span>
        <input class="rux-input settings-billing-row__input" type="text" maxlength="32" value="${escHtml(item.label)}" data-billing-label-input="${key}" />
        <label class="rux-switch" title="${item.active ? "Visible in trip editor" : "Hidden in trip editor"}">
          <input type="checkbox" ${item.active ? "checked" : ""} data-billing-active="${key}" />
          <span class="rux-switch__track"></span>
          <span class="rux-switch__thumb"></span>
        </label>
      </div>
    `).join("");
  }

  function confirmRowsHtml(config) {
    const meta = window.RuxBilling?.STATUS_META || {};
    const order = ["contract_signed", "po_received", "deposit_received", "paid_full", "overpaid"];
    const selected = new Set(config.confirmWhen || []);
    const labelOverrides = {
      contract_signed: config.workflow.contractSigned?.label,
      po_received: config.workflow.poReceived?.label,
    };
    return order.map((status) => {
      const item = meta[status] || { label: status, badgeClass: "rux-badge--info", icon: "" };
      const label = labelOverrides[status] || item.label;
      const iconHtml = item.icon ? `<span class="rux-icon">${escHtml(item.icon)}</span>` : "";
      return `<label class="settings-billing-confirm">
        <input type="checkbox" ${selected.has(status) ? "checked" : ""} data-confirm-status="${status}" />
        <span class="rux-badge ${escHtml(item.badgeClass)}">${iconHtml}${escHtml(label)}</span>
      </label>`;
    }).join("");
  }

  function readBillingForm() {
    const current = billingConfig || window.RuxBilling?.getConfig?.() || window.RuxBilling?.DEFAULT_CONFIG;
    const next = window.RuxBilling?.normalizeConfig?.(current) || current;
    billingWorkflowEl?.querySelectorAll("[data-billing-label-input]").forEach((input) => {
      const key = input.dataset.billingLabelInput;
      if (!next.workflow[key]) return;
      next.workflow[key].label = input.value.trim() || next.workflow[key].label;
    });
    billingWorkflowEl?.querySelectorAll("[data-billing-active]").forEach((input) => {
      const key = input.dataset.billingActive;
      if (!next.workflow[key]) return;
      next.workflow[key].active = input.checked;
    });
    next.confirmWhen = Array.from(billingConfirmEl?.querySelectorAll("[data-confirm-status]:checked") || [])
      .map((input) => input.dataset.confirmStatus);
    return window.RuxBilling?.normalizeConfig?.(next) || next;
  }

  function renderBillingSettings(config = billingConfig) {
    if (!billingWorkflowEl || !billingConfirmEl || !window.RuxBilling) return;
    billingConfig = window.RuxBilling.normalizeConfig(config || window.RuxBilling.DEFAULT_CONFIG);
    billingWorkflowEl.innerHTML = workflowRowsHtml(billingConfig);
    billingConfirmEl.innerHTML = confirmRowsHtml(billingConfig);
    
  }

  function publishBilling(config) {
    billingConfig = window.RuxBilling?.normalizeConfig?.(config) || config;
    window.RuxBilling?.applyToTripPanel?.(document.querySelector(".rux-scope-trip"));
    renderBillingSettings(billingConfig);
  }

  async function loadBilling() {
    if (!window.RuxBilling) return;
    billingConfig = await window.RuxBilling.load();
    renderBillingSettings(billingConfig);
  }

  async function init() {
    if (!root || initialized) return;
    initialized = true;
    await loadYard();
    await loadMapboxToken();
    await loadLocations();
    await loadSpotPadding();
    await loadBilling();
    await loadMissiveUrl();
  }

  saveBtn?.addEventListener("click", async () => {
    saveBtn.disabled = true;
    setMessage("Saving...");
    try {
      await saveYard(readForm());
    } catch (err) {
      setMessage(err?.message || "Could not save yard.", "error");
    } finally {
      saveBtn.disabled = false;
    }
  });

  defaultBtn?.addEventListener("click", () => {
    fillForm(DEFAULT_YARD);
    hideYardSuggestions();
    setStatus(true);
    setMessage("Default yard loaded. Save to make it permanent.");
  });

  verifyBtn?.addEventListener("click", async () => {
    verifyBtn.disabled = true;
    setMessage("Verifying address...");
    try {
      await verifyYardAddress();
    } catch (err) {
      setMessage(err?.message || "Could not verify yard address.", "error");
    } finally {
      verifyBtn.disabled = false;
    }
  });

  addressInput?.addEventListener("input", () => {
    if (latInput) latInput.value = "";
    if (lngInput) lngInput.value = "";
    setMessage("");
    clearTimeout(yardSearchTimer);
    yardSearchTimer = setTimeout(suggestYardAddress, 250);
  });

  addressInput?.addEventListener("focusin", () => {
    if (ensureYardSuggestions().hidden) yardSessionToken = uuid();
    suggestYardAddress();
  });

  ensureYardSuggestions().addEventListener("click", event => {
    const button = event.target.closest("[data-suggestion-idx]");
    if (!button) return;
    const suggestion = yardSuggestions[Number(button.dataset.suggestionIdx)];
    retrieveYardSuggestion(suggestion);
  });

  document.addEventListener("mousedown", event => {
    const suggestionsEl = ensureYardSuggestions();
    if (event.target === addressInput || suggestionsEl.contains(event.target)) return;
    hideYardSuggestions();
  });

  window.addEventListener("resize", () => {
    if (yardSuggestionsEl && !yardSuggestionsEl.hidden) positionYardSuggestions();
  });

  root?.addEventListener("scroll", () => {
    if (yardSuggestionsEl && !yardSuggestionsEl.hidden) positionYardSuggestions();
  });

  mapboxSaveBtn?.addEventListener("click", async () => {
    mapboxSaveBtn.disabled = true;
    setMapboxMessage("Saving...");
    try {
      await saveMapboxToken(mapboxTokenInput?.value || "");
    } catch (err) {
      setMapboxMessage(err?.message || "Could not save Mapbox token.", "error");
    } finally {
      mapboxSaveBtn.disabled = false;
    }
  });

  locationAddBtn?.addEventListener("click", () => showLocationEditor());
  locationCancelBtn?.addEventListener("click", hideLocationEditor);

  locationAddressInput?.addEventListener("input", () => {
    locationLatInput.value = "";
    locationLngInput.value = "";
    locationEditorEl.dataset.mapboxId = "";
    setLocationsMessage("Verify the changed address before saving.");
  });

  locationVerifyBtn?.addEventListener("click", async () => {
    locationVerifyBtn.disabled = true;
    setLocationsMessage("Verifying address...");
    try {
      await verifyLocationAddress();
    } catch (err) {
      setLocationsMessage(err?.message || "Could not verify location.", "error");
    } finally {
      locationVerifyBtn.disabled = false;
    }
  });

  locationSaveBtn?.addEventListener("click", async () => {
    locationSaveBtn.disabled = true;
    setLocationsMessage("Saving...");
    try {
      await (await ensureLocationsDb()).saveLocation(readLocationForm());
      savedLocations = await locationsDb.loadLocations({ refresh: true });
      renderLocations();
      hideLocationEditor();
      setLocationsMessage("Location saved.", "success");
    } catch (err) {
      setLocationsMessage(err?.message || "Could not save location.", "error");
    } finally {
      locationSaveBtn.disabled = false;
    }
  });

  locationsListEl?.addEventListener("click", async (event) => {
    const row = event.target.closest("[data-location-id]");
    if (!row) return;
    const location = savedLocations.find((item) => item.id === row.dataset.locationId);
    if (!location) return;
    if (event.target.closest("[data-location-edit]")) {
      showLocationEditor(location);
      return;
    }
    if (!event.target.closest("[data-location-delete]")) return;
    if (!window.confirm(`Delete ${location.name} from saved locations?`)) return;
    try {
      await (await ensureLocationsDb()).deleteLocation(location.id);
      savedLocations = await locationsDb.loadLocations({ refresh: true });
      renderLocations();
      setLocationsMessage("Location deleted.", "success");
    } catch (err) {
      setLocationsMessage(err?.message || "Could not delete location.", "error");
    }
  });

  document.getElementById("settings-spot-padding-save-btn")?.addEventListener("click", async () => {
    const btn = document.getElementById("settings-spot-padding-save-btn");
    if (btn) btn.disabled = true;
    try {
      const val = parseInt(spotPaddingInput?.value ?? DEFAULT_SPOT_PADDING, 10);
      await saveSpotPadding(Number.isFinite(val) && val >= 0 ? val : DEFAULT_SPOT_PADDING);
    } finally {
      if (btn) btn.disabled = false;
    }
  });

  billingDefaultBtn?.addEventListener("click", () => {
    if (!window.RuxBilling) return;
    billingConfig = window.RuxBilling.normalizeConfig(window.RuxBilling.DEFAULT_CONFIG);
    renderBillingSettings(billingConfig);
    setBillingMessage("Default billing workflow loaded. Save to keep it.");
  });

  billingSaveBtn?.addEventListener("click", async () => {
    if (!window.RuxBilling) return;
    billingSaveBtn.disabled = true;
    setBillingMessage("Saving...");
    try {
      const saved = await window.RuxBilling.save(readBillingForm());
      publishBilling(saved);
      setBillingMessage("Billing workflow saved.", "success");
    } catch (err) {
      setBillingMessage(err?.message || "Could not save billing workflow.", "error");
    } finally {
      billingSaveBtn.disabled = false;
    }
  });

  document.addEventListener("settings:billing", (event) => {
    billingConfig = event.detail?.config || window.RuxBilling?.getConfig?.();
    renderBillingSettings(billingConfig);
  });

  function setForceRefreshMessage(text = "", state = "") {
    if (!forceRefreshMessageEl) return;
    forceRefreshMessageEl.textContent = text;
    forceRefreshMessageEl.classList.toggle("is-error", state === "error");
    forceRefreshMessageEl.classList.toggle("is-success", state === "success");
  }

  forceRefreshBtn?.addEventListener("click", async () => {
    if (!window.confirm("Force refresh every open tab right now? Anyone with unsaved work will lose it.")) return;
    forceRefreshBtn.disabled = true;
    setForceRefreshMessage("Refreshing everyone...");
    try {
      await window.RuxAppReload?.triggerReload?.();
      setForceRefreshMessage("Refresh sent.", "success");
    } catch (err) {
      console.error("Force refresh failed:", err);
      setForceRefreshMessage("Could not reach the refresh channel.", "error");
    } finally {
      forceRefreshBtn.disabled = false;
    }
  });

  missiveSaveBtn?.addEventListener("click", async () => {
    missiveSaveBtn.disabled = true;
    setIntegrationsMessage("Saving...");
    try {
      await saveMissiveUrl(missiveUrlInput?.value || "");
    } catch (err) {
      setIntegrationsMessage(err?.message || "Could not save.", "error");
    } finally {
      missiveSaveBtn.disabled = false;
    }
  });

  window.RuxSettings = {
    ...(window.RuxSettings || {}),
    DEFAULT_YARD,
    DEFAULT_MISSIVE_URL,
    getYard: () => ({ ...currentYard }),
    getMapboxToken: () => mapboxToken,
    getSpotPadding: () => spotPaddingMins,
    getBillingWorkflow: () => window.RuxBilling?.getConfig?.() || billingConfig,
    getMissiveSearchUrl: () => missiveSearchUrl,
    saveYard,
    saveMapboxToken,
  };
  window.SettingsPanel = { init, reload: async () => { await loadYard(); await loadLocations(); await loadBilling(); await loadMissiveUrl(); } };

  if (document.readyState !== "loading") init().catch(err => console.error("SettingsPanel init failed:", err));
})();
