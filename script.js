/* =============================================================
   BIMSHIRE CONCIERGE — Quote Generator
   script.js — Clean architecture, rebuilt from scratch
   ============================================================= */

'use strict';

// ─── CONSTANTS ────────────────────────────────────────────────

const MAX_HOTELS = 3;

const OCCUPANCY_LABELS = {
    1: 'Single',
    2: 'Double',
    3: 'Triple',
    4: 'Quad',
    5: 'Quint',
};

const HOTEL_OPTIONS = [
    'Ramada by Wyndham Panama',
    'Riande Urban Hotel',
    'The Executive Hotel',
    'Marinn Place Financial District',
    'Hotel Riu Plaza',
    'Holiday Inn Financial Distrito',
    'Megapolis Hotel Panama',
];

// ─── STATE ────────────────────────────────────────────────────

let mode = 'standard'; // 'standard' | 'group'
let hotelSeq = 0;      // monotonically increasing ID for hotel elements
let hotelIds = [];     // ordered list of active hotel IDs

// ─── INIT ─────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('startDate').min = today;
    document.getElementById('endDate').min = today;

    document.getElementById('startDate').addEventListener('change', validateDates);
    document.getElementById('endDate').addEventListener('change', validateDates);

    addHotel();
});

// ─── MODE SWITCHING ───────────────────────────────────────────

function setMode(newMode) {
    mode = newMode;

    document.getElementById('btnStandard').classList.toggle('active', mode === 'standard');
    document.getElementById('btnGroup').classList.toggle('active', mode === 'group');

    document.getElementById('travelerFieldsStandard').classList.toggle('hidden', mode !== 'standard');
    document.getElementById('flightFieldStandard').classList.toggle('hidden', mode !== 'standard');
    document.getElementById('occupancySelector').classList.toggle('hidden', mode !== 'group');
    document.getElementById('groupDepositField').classList.toggle('hidden', mode !== 'group');

    // Refresh hotel cards so occupancy inputs appear/disappear
    renderOccupancyInputs();
}

// ─── HOTEL MANAGEMENT ─────────────────────────────────────────

function addHotel() {
    if (hotelIds.length >= MAX_HOTELS) return;

    hotelSeq++;
    const id = hotelSeq;
    hotelIds.push(id);

    const card = document.createElement('div');
    card.className = 'hotel-card';
    card.id = `hotel-${id}`;

    card.innerHTML = `
        <div class="hotel-card-header">
            <span class="hotel-card-title">Hotel Option ${hotelIds.length}</span>
            ${hotelIds.length > 1
                ? `<button type="button" class="btn-remove" onclick="removeHotel(${id})">Remove</button>`
                : ''}
        </div>
        <div class="hotel-name-row">
            <select class="field-input" id="hotelSelect-${id}" onchange="onHotelSelectChange(${id})">
                <option value="">Select hotel…</option>
                ${HOTEL_OPTIONS.map(h => `<option value="${h}">${h}</option>`).join('')}
                <option value="custom">Other (custom name)</option>
            </select>
            <span class="field-error" id="hotelNameError-${id}"></span>
        </div>
        <div class="hotel-custom-row" id="hotelCustomRow-${id}">
            <input class="field-input" type="text" id="hotelCustomName-${id}" placeholder="Enter hotel name">
        </div>

        <!-- Standard: single price -->
        <div id="hotelStandardPrices-${id}" style="margin-top:10px;">
            <label class="sub-label">Hotel price per person (USD)</label>
            <input class="field-input" type="number" id="hotelPrice-${id}" placeholder="0.00" min="0" step="0.01">
            <span class="field-error" id="hotelPriceError-${id}"></span>
        </div>

        <!-- Group: occupancy-based prices -->
        <div class="occ-inputs-grid" id="hotelOccInputs-${id}"></div>
    `;

    document.getElementById('hotelContainer').appendChild(card);
    updateAddHotelBtn();

    // Render occupancy inputs if in group mode
    if (mode === 'group') {
        refreshOccInputsForHotel(id);
    }
}

function removeHotel(id) {
    const idx = hotelIds.indexOf(id);
    if (idx === -1) return;
    hotelIds.splice(idx, 1);
    document.getElementById(`hotel-${id}`)?.remove();
    renumberHotelLabels();
    updateAddHotelBtn();
}

function renumberHotelLabels() {
    hotelIds.forEach((id, i) => {
        const card = document.getElementById(`hotel-${id}`);
        if (!card) return;
        card.querySelector('.hotel-card-title').textContent = `Hotel Option ${i + 1}`;
    });
}

function updateAddHotelBtn() {
    const btn = document.getElementById('addHotelBtn');
    if (hotelIds.length >= MAX_HOTELS) {
        btn.disabled = true;
        btn.textContent = 'Maximum 3 hotels reached';
    } else {
        btn.disabled = false;
        btn.textContent = '+ Add Hotel';
    }
}

function onHotelSelectChange(id) {
    const sel = document.getElementById(`hotelSelect-${id}`);
    const customRow = document.getElementById(`hotelCustomRow-${id}`);
    customRow.classList.toggle('show', sel.value === 'custom');
}

// ─── OCCUPANCY INPUT RENDERING ────────────────────────────────

function getSelectedOccupancies() {
    return Array.from(document.querySelectorAll('input[name="occ"]:checked'))
        .map(cb => parseInt(cb.value))
        .sort((a, b) => a - b);
}

function renderOccupancyInputs() {
    hotelIds.forEach(id => refreshOccInputsForHotel(id));
}

function refreshOccInputsForHotel(hotelId) {
    const standardPrices = document.getElementById(`hotelStandardPrices-${hotelId}`);
    const occGrid = document.getElementById(`hotelOccInputs-${hotelId}`);
    if (!standardPrices || !occGrid) return;

    if (mode === 'standard') {
        standardPrices.style.display = '';
        occGrid.classList.remove('show');
        occGrid.innerHTML = '';
        return;
    }

    // Group mode
    standardPrices.style.display = 'none';
    occGrid.classList.add('show');

    const selected = getSelectedOccupancies();
    occGrid.innerHTML = selected.map(n => `
        <div class="occ-row">
            <div class="occ-row-label">${OCCUPANCY_LABELS[n]} Occupancy (${n} ${n === 1 ? 'person' : 'people'})</div>
            <div class="occ-row-grid">
                <div>
                    <div class="occ-sub">Flight (no bags) — total for ${n}</div>
                    <input class="field-input" type="number" id="occFlight-${hotelId}-${n}" placeholder="0.00" min="0" step="0.01">
                </div>
                <div>
                    <div class="occ-sub">Flight (with bags) — total for ${n}</div>
                    <input class="field-input" type="number" id="occFlightBags-${hotelId}-${n}" placeholder="0.00" min="0" step="0.01">
                </div>
                <div>
                    <div class="occ-sub">Hotel — total for ${n}</div>
                    <input class="field-input" type="number" id="occHotel-${hotelId}-${n}" placeholder="0.00" min="0" step="0.01">
                </div>
            </div>
        </div>
    `).join('');
}

// ─── CALCULATION LOGIC ────────────────────────────────────────

/**
 * Standard mode calculation.
 * flightPrice and hotelPrice are per person totals.
 * adults + children = totalPeople
 */
function calcStandard(flightPerPerson, hotelPerPerson, adults, children) {
    const totalPeople = adults + children;
    const baseCost = (flightPerPerson + hotelPerPerson) * totalPeople;

    // Taxi fee
    let taxiFee = 50;
    if (totalPeople > 2) taxiFee = 50 + 10 * (totalPeople - 2);

    // Service fee
    let serviceFee;
    if (adults === 1 && children === 0) {
        serviceFee = 130;
    } else {
        serviceFee = 75 * totalPeople;
    }

    const subtotal1 = baseCost + taxiFee + serviceFee;
    const subtotal2 = subtotal1 * 2.03;
    const subtotal3 = subtotal2 + subtotal2 * 0.02;
    const finalTotal = Math.ceil(subtotal3 / 2);
    const perPerson = (finalTotal / totalPeople).toFixed(2);

    return { finalTotal, perPerson };
}

/**
 * Group / occupancy mode calculation.
 * flightTotal and hotelTotal are the combined totals for n people.
 */
function calcOccupancy(flightTotal, hotelTotal, n) {
    const baseCost = flightTotal + hotelTotal;

    // Taxi fee same formula based on occupancy count
    let taxiFee = 50;
    if (n > 2) taxiFee = 50 + 10 * (n - 2);

    // Service fee
    let serviceFee;
    if (n === 1) {
        serviceFee = 130;
    } else {
        serviceFee = 75 * n;
    }

    const subtotal1 = baseCost + taxiFee + serviceFee;
    const subtotal2 = subtotal1 * 2.03;
    const subtotal3 = subtotal2 + subtotal2 * 0.02;
    const finalTotal = Math.ceil(subtotal3 / 2);
    const perPerson = (finalTotal / n).toFixed(2);

    return { finalTotal, perPerson };
}

// ─── DATE HELPERS ─────────────────────────────────────────────

function validateDates() {
    const s = document.getElementById('startDate').value;
    const e = document.getElementById('endDate').value;
    if (s && e && new Date(s) >= new Date(e)) {
        showErr('endDateError', 'Return date must be after departure');
        return false;
    }
    clearErr('endDateError');
    return true;
}

function formatDateRange(startStr, endStr) {
    const opts = { month: 'long', day: 'numeric', year: 'numeric' };
    const s = new Date(startStr);
    const e = new Date(endStr);
    const sfmt = s.toLocaleDateString('en-US', opts);
    const efmt = e.toLocaleDateString('en-US', opts);

    // Same year: "May 10 - June 5, 2025"
    if (s.getFullYear() === e.getFullYear()) {
        const sNoYear = s.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
        const eNoYear = e.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
        return `${sNoYear} – ${eNoYear}, ${s.getFullYear()}`;
    }
    return `${sfmt} – ${efmt}`;
}

function depositDeadline(startStr) {
    const d = new Date(startStr);
    d.setMonth(d.getMonth() - 3);
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

// ─── VALIDATION HELPERS ───────────────────────────────────────

function showErr(id, msg) {
    const el = document.getElementById(id);
    if (el) { el.textContent = msg; }
}
function clearErr(id) {
    const el = document.getElementById(id);
    if (el) el.textContent = '';
}
function clearAllErrors() {
    document.querySelectorAll('.field-error').forEach(el => el.textContent = '');
}

function validateForm() {
    clearAllErrors();
    let ok = true;

    const dest = document.getElementById('destination').value.trim();
    if (!dest) { showErr('destinationError', 'Destination is required'); ok = false; }

    const s = document.getElementById('startDate').value;
    const e = document.getElementById('endDate').value;
    if (!s) { showErr('startDateError', 'Departure date required'); ok = false; }
    if (!e) { showErr('endDateError', 'Return date required'); ok = false; }
    if (s && e && !validateDates()) ok = false;

    if (mode === 'standard') {
        const adults   = parseInt(document.getElementById('adults').value) || 0;
        const children = parseInt(document.getElementById('children').value) || 0;
        if (adults + children === 0) { showErr('adultsError', 'At least one traveler required'); ok = false; }

        const fp = parseFloat(document.getElementById('flightPrice').value);
        if (!fp || fp <= 0) { showErr('flightPriceError', 'Valid flight price required'); ok = false; }

        const fpb = parseFloat(document.getElementById('flightPriceWithBags').value);
        if (!fpb || fpb <= 0) { showErr('flightPriceWithBagsError', 'Valid flight price (with bags) required'); ok = false; }
    }

    if (mode === 'group') {
        const occs = getSelectedOccupancies();
        if (occs.length === 0) {
            showErr('destinationError', ''); // no dedicated field; alert
            ok = false;
            alert('Select at least one occupancy type for group mode.');
        }
    }

    // Validate each hotel
    hotelIds.forEach((id, i) => {
        const sel = document.getElementById(`hotelSelect-${id}`);
        if (!sel) return;

        const name = sel.value === 'custom'
            ? (document.getElementById(`hotelCustomName-${id}`)?.value.trim() || '')
            : sel.value;

        if (!name) { showErr(`hotelNameError-${id}`, 'Hotel name required'); ok = false; }

        if (mode === 'standard') {
            const hp = parseFloat(document.getElementById(`hotelPrice-${id}`)?.value);
            if (!hp || hp <= 0) { showErr(`hotelPriceError-${id}`, 'Hotel price required'); ok = false; }
        }
        // Group mode: individual field errors would clutter; basic presence check
    });

    return ok;
}

// ─── HOTEL NAME GETTER ────────────────────────────────────────

function getHotelName(id) {
    const sel = document.getElementById(`hotelSelect-${id}`);
    if (!sel) return '';
    if (sel.value === 'custom') {
        return document.getElementById(`hotelCustomName-${id}`)?.value.trim() || '';
    }
    return sel.value;
}

// ─── QUOTE GENERATION ─────────────────────────────────────────

function generateQuote() {
    if (!validateForm()) return;

    const dest     = document.getElementById('destination').value.trim();
    const startStr = document.getElementById('startDate').value;
    const endStr   = document.getElementById('endDate').value;
    const dateRange = formatDateRange(startStr, endStr);
    const deadline  = depositDeadline(startStr);

    let quote = '';

    if (mode === 'standard') {
        quote = buildStandardQuote(dest, dateRange, deadline);
    } else {
        quote = buildGroupQuote(dest, dateRange, deadline);
    }

    document.getElementById('quoteOutput').textContent = quote;
}

// ─── STANDARD QUOTE BUILDER ───────────────────────────────────

function buildStandardQuote(dest, dateRange, deadline) {
    const adults   = parseInt(document.getElementById('adults').value) || 0;
    const children = parseInt(document.getElementById('children').value) || 0;

    const fpNoBags  = parseFloat(document.getElementById('flightPrice').value);
    const fpWithBags = parseFloat(document.getElementById('flightPriceWithBags').value);

    let travelerText = '';
    if (adults > 0) travelerText += `${adults} Adult${adults > 1 ? 's' : ''}`;
    if (children > 0) {
        if (travelerText) travelerText += ', ';
        travelerText += `${children} Child${children > 1 ? 'ren' : ''}`;
    }

    const depositAmount = calcDepositAmount(fpNoBags, hotelIds.length > 0
        ? parseFloat(document.getElementById(`hotelPrice-${hotelIds[0]}`)?.value || 0)
        : 0, adults, children);

    // Build hotel blocks
    function hotelBlock(flightPerPerson) {
        return hotelIds.map(id => {
            const name = getHotelName(id);
            const hp   = parseFloat(document.getElementById(`hotelPrice-${id}`)?.value) || 0;
            const { perPerson } = calcStandard(flightPerPerson, hp, adults, children);
            return `${name}\n• $${perPerson} per person`;
        }).join('\n\n');
    }

    // Deposit per person (use no-bags flight + first hotel as reference)
    const refHp = hotelIds.length > 0
        ? parseFloat(document.getElementById(`hotelPrice-${hotelIds[0]}`)?.value || 0)
        : 0;
    const depPerPerson = calcDepositPP(fpNoBags, refHp, adults, children);

    return [
        'BIMSHIRE CONCIERGE',
        'PACKAGE QUOTATION',
        '',
        `${dest} Getaway ✈️🌴`,
        '',
        `📅 Travel Dates: ${dateRange}`,
        `🧳 Travelers: ${travelerText}`,
        '',
        '─────────────────────────────',
        'WITHOUT CHECKED BAGS',
        '─────────────────────────────',
        '',
        '🏨 Hotel Options & Package Prices (USD)',
        hotelBlock(fpNoBags),
        '',
        'Deposit Information',
        `• Lock in current rate: $${depPerPerson} per person deposit`,
        `• Deposit deadline: ${deadline}`,
        '',
        '─────────────────────────────',
        'WITH CHECKED BAGS',
        '─────────────────────────────',
        '',
        '🏨 Hotel Options & Package Prices (USD)',
        hotelBlock(fpWithBags),
        '',
        'Deposit Information',
        `• Lock in current rate: $${depPerPerson} per person deposit`,
        `• Deposit deadline: ${deadline}`,
        '',
        '─────────────────────────────',
        '',
        '✅ Package Inclusions:',
        '✔️ Round-trip airfare',
        '✔️ Hotel accommodation',
        '✔️ Airport transfers',
        '✔️ Daily breakfast',
        '✔️ Taxes & fees',
        '',
        '📌 Important Notes:',
        '• Prices are subject to availability and may change until booked.',
        '• Payment is required to secure rates.',
        '',
        '📧 bgibookings@gmail.com',
        '📞 +1 (246) 262-9602',
        '',
        `📍 Let's plan your perfect ${dest} escape! 🌟`,
    ].join('\n');
}

// ─── GROUP / OCCUPANCY QUOTE BUILDER ──────────────────────────

function buildGroupQuote(dest, dateRange, deadline) {
    const occs = getSelectedOccupancies();
    const depositAmt = parseFloat(document.getElementById('groupDeposit').value) || 0;

    // We render: WITHOUT CHECKED BAGS section, then WITH CHECKED BAGS section
    // For each section: for each occupancy, list each hotel

    function occSection(useBags) {
        const label = useBags ? 'WITH CHECKED BAGS' : 'WITHOUT CHECKED BAGS';
        const flightKey = useBags ? 'occFlightBags' : 'occFlight';

        const lines = [`─────────────────────────────`, label, `─────────────────────────────`];

        occs.forEach(n => {
            lines.push('');
            lines.push(`${OCCUPANCY_LABELS[n]} Occupancy:`);
            hotelIds.forEach(id => {
                const name = getHotelName(id);
                const flight = parseFloat(document.getElementById(`${flightKey}-${id}-${n}`)?.value) || 0;
                const hotel  = parseFloat(document.getElementById(`occHotel-${id}-${n}`)?.value) || 0;
                const { finalTotal, perPerson } = calcOccupancy(flight, hotel, n);
                lines.push(`${name}`);
                lines.push(`• $${finalTotal} ($${perPerson} per person)`);
            });
        });

        return lines;
    }

    const travelerSummary = `${occs.map(n => OCCUPANCY_LABELS[n]).join(' / ')} Occupancy`;

    const parts = [
        'BIMSHIRE CONCIERGE',
        'PACKAGE QUOTATION',
        '',
        `${dest} Getaway ✈️🌴`,
        '',
        `📅 Travel Dates: ${dateRange}`,
        `🧳 Travelers: ${travelerSummary}`,
        '',
        ...occSection(false),
        '',
        ...occSection(true),
        '',
        '─────────────────────────────',
        'Deposit Information',
        depositAmt > 0
            ? `• Deposit: $${depositAmt.toFixed(2)} per person`
            : '• Deposit: Please contact us for deposit details.',
        `• Deposit deadline: ${deadline}`,
        '',
        '─────────────────────────────',
        '',
        '✅ Package Inclusions:',
        '✔️ Round-trip airfare',
        '✔️ Hotel accommodation',
        '✔️ Airport transfers',
        '✔️ Daily breakfast',
        '✔️ Taxes & fees',
        '',
        '📌 Important Notes:',
        '• Prices are subject to availability and may change until booked.',
        '• Payment is required to secure rates.',
        '',
        '📧 bgibookings@gmail.com',
        '📞 +1 (246) 262-9602',
        '',
        `📍 Let's plan your perfect ${dest} escape! 🌟`,
    ];

    return parts.join('\n');
}

// ─── DEPOSIT HELPERS ──────────────────────────────────────────

function calcDepositPP(flightPP, hotelPP, adults, children) {
    // Deposit = roughly 25% of per-person package price, rounded
    const { perPerson } = calcStandard(flightPP, hotelPP, adults, children);
    return Math.ceil(parseFloat(perPerson) * 0.25);
}

function calcDepositAmount(flightPP, hotelPP, adults, children) {
    const { finalTotal } = calcStandard(flightPP, hotelPP, adults, children);
    return Math.ceil(finalTotal * 0.25);
}

// ─── COPY TO CLIPBOARD ────────────────────────────────────────

function copyQuote() {
    const text = document.getElementById('quoteOutput').textContent || '';
    if (!text || text.includes('Fill in the form')) {
        alert('Generate a quote first!');
        return;
    }

    const toast = document.getElementById('copyToast');
    function showToast() {
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2600);
    }

    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(showToast).catch(() => fallbackCopy(text, showToast));
    } else {
        fallbackCopy(text, showToast);
    }
}

function fallbackCopy(text, cb) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try { document.execCommand('copy'); cb(); } catch (_) {}
    document.body.removeChild(ta);
}
