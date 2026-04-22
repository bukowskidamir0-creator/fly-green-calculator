const aircraftProfiles = {
  e190e2: {
    label: "Embraer E190-E2",
    co2KgPerKm: 6.5,
    seats: 108,
    ltoCO2Kg: 850,
  },
  a320neo: {
    label: "Airbus A320neo",
    co2KgPerKm: 9.0,
    seats: 180,
    ltoCO2Kg: 1100,
  },
  a321neo: {
    label: "Airbus A321neo",
    co2KgPerKm: 11.5,
    seats: 220,
    ltoCO2Kg: 1250,
  },
  b767: {
    label: "Boeing 767-300ER",
    co2KgPerKm: 21.0,
    seats: 223,
    ltoCO2Kg: 2200,
  },
};

const routeCorrectionFactor = 1.07;
const passengerShare = 0.9;
const kztPerTonneCO2 = 7200;
const usdKzt = 469.52;

const form = document.querySelector("#calculator-form");
const distanceInput = document.querySelector("#distance");
const passengerCountInput = document.querySelector("#passenger-count");
const capacityNote = document.querySelector("#capacity-note");
const donationUsdInput = document.querySelector("#donation-usd");
const passengerCO2Output = document.querySelector("#passenger-co2");
const flightCO2Output = document.querySelector("#flight-co2");
const adjustedDistanceOutput = document.querySelector("#adjusted-distance");
const expectedPassengersOutput = document.querySelector("#expected-passengers");
const donationKztOutput = document.querySelector("#donation-kzt");
const donationCoverageOutput = document.querySelector("#donation-coverage");
const suggestedBalanceUsdOutput = document.querySelector("#suggested-balance-usd");
const modelNote = document.querySelector("#model-note");
const copyButton = document.querySelector("#copy-summary");
const copyLinkButton = document.querySelector("#copy-link");

const numberFormat = new Intl.NumberFormat("ru-RU");

function getSelectedAircraftInput() {
  return document.querySelector("input[name='aircraft']:checked");
}

function getSelectedAircraft() {
  return aircraftProfiles[getSelectedAircraftInput().value];
}

function roundToNearest(value, step) {
  return Math.round(value / step) * step;
}

function formatKzt(value) {
  return `${numberFormat.format(Math.max(value, 100))} KZT`;
}

function formatUsd(value) {
  return `$${numberFormat.format(Math.max(value, 1).toFixed(2))}`;
}

function clampPassengers(value, seats) {
  const parsed = Math.round(Number(value) || 1);
  return Math.min(Math.max(parsed, 1), seats);
}

function getDonationUsd() {
  return Math.max(Number(donationUsdInput.value) || 1, 1);
}

function calculate() {
  const aircraft = getSelectedAircraft();
  const distanceKm = Math.max(Number(distanceInput.value) || 0, 0);
  const passengerCount = clampPassengers(passengerCountInput.value, aircraft.seats);
  const donationUsd = getDonationUsd();
  const adjustedDistance = distanceKm * routeCorrectionFactor;
  const flightCO2Kg = adjustedDistance * aircraft.co2KgPerKm + aircraft.ltoCO2Kg;
  const passengerCO2Kg = (flightCO2Kg * passengerShare) / passengerCount;
  const balanceKzt = roundToNearest((passengerCO2Kg / 1000) * kztPerTonneCO2, 100);
  const balanceUsd = Math.max(balanceKzt / usdKzt, 1);
  const donationKzt = donationUsd * usdKzt;
  const coverage = Math.min((donationUsd / balanceUsd) * 100, 999);

  passengerCountInput.max = String(aircraft.seats);
  passengerCountInput.value = String(passengerCount);
  donationUsdInput.value = String(donationUsd);
  capacityNote.textContent = `Aircraft capacity: ${aircraft.seats} seats`;
  passengerCO2Output.textContent = `${numberFormat.format(Math.round(passengerCO2Kg))} kg CO2`;
  flightCO2Output.textContent = `${numberFormat.format((flightCO2Kg / 1000).toFixed(1))} t CO2`;
  adjustedDistanceOutput.textContent = `${numberFormat.format(Math.round(adjustedDistance))} km`;
  expectedPassengersOutput.textContent = `${numberFormat.format(passengerCount)}`;
  donationKztOutput.textContent = formatKzt(donationKzt);
  donationCoverageOutput.textContent = `${numberFormat.format(Math.round(coverage))}%`;
  suggestedBalanceUsdOutput.textContent = formatUsd(balanceUsd);
  modelNote.textContent = `${aircraft.label}: ${aircraft.co2KgPerKm} kg CO2/km, LTO ${numberFormat.format(aircraft.ltoCO2Kg)} kg, ${numberFormat.format(passengerCount)} passengers entered.`;

  updateUrlState(distanceKm, getSelectedAircraftInput().value, passengerCount, donationUsd);

  return {
    aircraft,
    distanceKm,
    adjustedDistance,
    flightCO2Kg,
    passengerCO2Kg,
    passengerCount,
    donationUsd,
    donationKzt,
    coverage,
    balanceUsd,
  };
}

function getSummaryText() {
  const result = calculate();

  return [
    "Fly Green CO2 Calculator",
    `Aircraft: ${result.aircraft.label}`,
    `Distance: ${Math.round(result.distanceKm)} km`,
    `Adjusted distance: ${Math.round(result.adjustedDistance)} km`,
    `Flight CO2: ${Math.round(result.flightCO2Kg)} kg`,
    `Passenger CO2: ${Math.round(result.passengerCO2Kg)} kg`,
    `Passengers entered: ${result.passengerCount}`,
    `Donation: ${formatUsd(result.donationUsd)} (${formatKzt(result.donationKzt)})`,
    `Estimated coverage: ${Math.round(result.coverage)}%`,
  ].join("\n");
}

async function copyToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }

  fallbackCopy(text);
}

async function copySummary() {
  await copyToClipboard(getSummaryText());
  flashButton(copyButton, "Copied", "Copy estimate");
}

async function copyShareLink() {
  await copyToClipboard(window.location.href);
  flashButton(copyLinkButton, "Copied", "Link");
}

function fallbackCopy(text) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

function flashButton(button, activeText, defaultText) {
  const label = button.querySelector("span:last-child");
  label.textContent = activeText;
  window.setTimeout(() => {
    label.textContent = defaultText;
  }, 1400);
}

function updateUrlState(distance, aircraft, passengers, donationUsd) {
  const params = new URLSearchParams(window.location.search);
  params.set("distance", String(Math.round(distance)));
  params.set("aircraft", aircraft);
  params.set("passengers", String(Math.round(passengers)));
  params.set("donation", String(Math.max(Number(donationUsd) || 1, 1)));
  params.delete("load");

  const nextUrl = `${window.location.pathname}?${params.toString()}${window.location.hash}`;
  window.history.replaceState(null, "", nextUrl);
}

function hydrateFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const distance = Number(params.get("distance"));
  const load = Number(params.get("load"));
  const passengers = Number(params.get("passengers"));
  const donation = Number(params.get("donation"));
  const aircraft = params.get("aircraft");

  if (Number.isFinite(distance) && distance > 0) {
    distanceInput.value = String(Math.round(distance));
  }

  if (aircraft && aircraftProfiles[aircraft]) {
    document.querySelector(`input[name='aircraft'][value='${aircraft}']`).checked = true;
  }

  const selectedAircraft = getSelectedAircraft();
  if (Number.isFinite(passengers) && passengers > 0) {
    passengerCountInput.value = String(clampPassengers(passengers, selectedAircraft.seats));
  } else if (Number.isFinite(load) && load >= 1 && load <= 100) {
    passengerCountInput.value = String(clampPassengers(selectedAircraft.seats * (load / 100), selectedAircraft.seats));
  }

  if (Number.isFinite(donation) && donation >= 1) {
    donationUsdInput.value = String(donation);
  }
}

form.addEventListener("input", calculate);
form.addEventListener("change", calculate);
passengerCountInput.addEventListener("blur", () => {
  passengerCountInput.value = String(clampPassengers(passengerCountInput.value, getSelectedAircraft().seats));
  calculate();
});
donationUsdInput.addEventListener("blur", () => {
  donationUsdInput.value = String(getDonationUsd());
  calculate();
});
copyButton.addEventListener("click", copySummary);
copyLinkButton.addEventListener("click", copyShareLink);

hydrateFromUrl();
calculate();
