const API_BASE_URL = 'https://vizag-bus-mate-backend.onrender.com';
const resultDiv = document.getElementById("result");
const loading = document.getElementById("loading");

const allStops = [
  "Achutapuram", "Adavivaram", "Aganampudi", "Akkayyapalem", "Anandapuram",
  "Anakapalle", "Arilova", "AU Out Gate", "Bakkannapalem", "Beach Road",
  "Bheemili", "BHPV", "Bhogapuram", "Carshed Junction", "Chinna Gadhili",
  "China Waltair", "Chodavaram", "Convent Junction", "Dabagardens", "Dibbapalem",
  "Duvvada", "Elamanchili", "Endada", "Gajuwaka", "Ganesh Nagar",
  "Gitam", "Gopalapatnam", "Gurudwara", "Hanumanthavaka", "HB Colony",
  "Health City", "INHS Kalyani", "INS Circars", "INS Dega", "INS Kalinga",
  "Isukathota", "Jagadamba", "Janata Colony", "Kailasapuram", "Kailasagiri",
  "Kancharapalem", "King George Hospital", "Kommadi", "Kurmannapalem", "Lankelapalem",
  "Madhavadhara", "Madhurawada", "Maddilapalem", "Maddilapalem Depot", "Marikavalasa",
  "Mindi", "Muralinagar", "MVP Colony", "NAD", "Naval Base",
  "Naval Dockyard", "NSTL", "Old Gajuwaka", "Padmanabham", "Parawada",
  "Pedagantyada", "Pedda Waltair", "Pendurthi", "PM Palem", "Police Colony","Railway Station",
  "Rama Talkies", "RK Beach", "Rushikonda", "RTC Complex", "Sabbavaram", "Scindia",
  "Seethammadhara", "Sheelanagar", "Shankarmatam", "Shantinagar", "Simhachalam",
  "Simhachalam Temple", "Sontyam", "Suryabagh", "Tagarapuvalasa", "Tenneti Park",
  "Thatichetlapalem", "Thotlakonda", "Town Kotha Road", "Vepagunta", "Venkojipalem",
  "Visakhapatnam Airport", "Vizianagaram Bus Stand", "Vizianagaram RTC Complex", "VUDA Park", "Yarada",
  "Yarada Beach", "Yendada"
];


// Search by Bus Number
async function searchByNumber() {
  const number = document.getElementById("busNumberInput").value.trim();
  if (!number) return;

  loading.style.display = "block";
  resultDiv.innerHTML = "";

  try {
    const res = await fetch(`${API_BASE_URL}/api/bus/${number}`);
    if (!res.ok) throw new Error("Bus not found");
    const bus = await res.json();

   resultDiv.innerHTML = `
  <div class="result-card">
    <h3><span class="bus-number-red">Bus Number: ${bus.number}</span></h3>
    <div class="timeline">
      ${bus.route.map(stop => `
        <div class="timeline-item">
          <div class="circle"></div>
          <div class="stop-name">${stop}</div>
        </div>
      `).join("")}
    </div>
  </div>
`;

  } catch (err) {
    resultDiv.innerHTML = `<p>❌ ${err.message}</p>`;
  } finally {
    loading.style.display = "none";
  }
}

// Search by From-To Route (with reverse fallback)
async function searchByRoute() {
  const from = document.getElementById("fromInput").value.trim();
  const to = document.getElementById("toInput").value.trim();
  if (!from || !to) return;

  loading.style.display = "block";
  resultDiv.innerHTML = "";

  try {
    const response = await fetch(`${API_BASE_URL}/api/bus?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
    const buses = await response.json();

    // Handle response
    if (!response.ok || buses.length === 0) {
      resultDiv.innerHTML = `<p>❌ No buses found for this route</p>`;
      return;
    }

    // Render bus results
    buses.forEach(bus => {
      const btn = document.createElement("button");
      btn.className = "bus-link";
      btn.innerHTML = `Bus ${bus.number} <span class="arrow">▼</span>`;
      btn.onclick = () => toggleRoute(bus, btn);

      const container = document.createElement("div");
      container.className = "route-container";
      container.id = `route-${bus.number}`;  // ✅ FIXED: Changed from bus.busnumber to bus.number

      resultDiv.appendChild(btn);
      resultDiv.appendChild(container);
    });

  } catch (err) {
    resultDiv.innerHTML = `<p>⚠️ ${err.message}</p>`;
  } finally {
    loading.style.display = "none";
  }
}


// Toggle Show/Hide Route
function toggleRoute(bus, button) {
  const container = document.getElementById(`route-${bus.number}`);
  const arrow = button.querySelector(".arrow");

  // Close all others
  document.querySelectorAll(".route-container.expanded").forEach(div => {
    div.classList.remove("expanded");
    div.innerHTML = "";
    const otherArrow = div.previousElementSibling?.querySelector(".arrow");
    if (otherArrow) otherArrow.classList.remove("rotate");
  });

  // Toggle open/close
  if (container.classList.contains("expanded")) {
    container.classList.remove("expanded");
    container.innerHTML = "";
    arrow.classList.remove("rotate");
    return;
  }

  container.classList.add("expanded");
  arrow.classList.add("rotate");

  const from = document.getElementById("fromInput").value.trim().toLowerCase();
  const to = document.getElementById("toInput").value.trim().toLowerCase();
  const routeLower = bus.route.map(stop => stop.toLowerCase());

  const fromIndex = routeLower.indexOf(from);
  const toIndex = routeLower.indexOf(to);

  let fullRoute = [...bus.route]; // start with original full route

  if (fromIndex !== -1 && toIndex !== -1 && fromIndex > toIndex) {
    fullRoute.reverse(); // reverse only if search is in opposite direction
  }

  // Build timeline with highlights
  container.innerHTML = `
    <div class="timeline">
      ${fullRoute.map((stop, i) => {
        const stopLower = stop.toLowerCase();
        const isHighlight = stopLower === from || stopLower === to;
        return `
          <div class="timeline-item ${isHighlight ? "highlight" : ""}">
            <div class="circle"></div>
            <div class="stop-name">${stop}</div>
            ${i < fullRoute.length - 1 ? '<div class="timeline-line"></div>' : ''}
          </div>
        `;
      }).join("")}
    </div>
  `;
}

// Swap From and To Inputs
function swapInputs() {
  const fromInput = document.getElementById("fromInput");
  const toInput = document.getElementById("toInput");
  const temp = fromInput.value;
  fromInput.value = toInput.value;
  toInput.value = temp;

  // Optional: Auto trigger search after swap
  searchByRoute();  // ✅ This will refresh results automatically
}


// Autocomplete Suggestions
function setupAutocomplete(inputId, suggestionsId) {
  const input = document.getElementById(inputId);
  const suggestionsBox = document.getElementById(suggestionsId);
  let selectedIndex = -1;

  input.addEventListener("input", () => {
    const term = input.value.trim().toLowerCase();
    suggestionsBox.innerHTML = "";
    selectedIndex = -1;

    if (!term) {
      suggestionsBox.style.display = "none";
      return;
    }

    const matched = allStops.filter(stop =>
      stop.toLowerCase().includes(term)
    );

    if (matched.length === 0) {
      suggestionsBox.style.display = "none";
      return;
    }

    matched.forEach((stop, index) => {
      const div = document.createElement("div");
      div.textContent = stop;
      div.addEventListener("click", () => {
        input.value = stop;
        suggestionsBox.style.display = "none";
      });
      suggestionsBox.appendChild(div);
    });

    suggestionsBox.style.display = "block";
  });

  input.addEventListener("keydown", (e) => {
    const items = suggestionsBox.querySelectorAll("div");
    if (!items.length) return;

    if (e.key === "ArrowDown") {
      selectedIndex = (selectedIndex + 1) % items.length;
      highlight(items);
    } else if (e.key === "ArrowUp") {
      selectedIndex = (selectedIndex - 1 + items.length) % items.length;
      highlight(items);
    } else if (e.key === "Enter") {
      if (selectedIndex > -1) {
        input.value = items[selectedIndex].textContent;
        suggestionsBox.style.display = "none";
        e.preventDefault();
      }
    }
  });

  document.addEventListener("click", (e) => {
    if (!suggestionsBox.contains(e.target) && e.target !== input) {
      suggestionsBox.style.display = "none";
    }
  });

  function highlight(items) {
    items.forEach((item, idx) => {
      item.classList.toggle("highlight", idx === selectedIndex);
    });
  }
}



// Initialize autocomplete
setupAutocomplete("fromInput", "fromSuggestions");
setupAutocomplete("toInput", "toSuggestions");
