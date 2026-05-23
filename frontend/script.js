const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5000'
  : 'https://vizag-bus-mate-backend.onrender.com';
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
    if (!response.ok || (Array.isArray(buses) && buses.length === 0)) {
      resultDiv.innerHTML = `<p>❌ No buses found for this route</p>`;
      return;
    }

    if (!Array.isArray(buses) && buses.type === 'connecting') {
      const title = document.createElement("h3");
      title.innerHTML = `🔄 No direct buses found. Recommended transfer routes:`;
      title.style.margin = "10px 0 15px 0";
      resultDiv.appendChild(title);

      buses.connections.forEach((conn, index) => {
        const card = document.createElement("div");
        card.className = "result-card";
        
        card.innerHTML = `
          <div style="font-weight: 600; margin-bottom: 12px; font-size: 16px; color: #1d3557;">
            Route Option ${index + 1}: Transfer via <span class="bus-number-red">${conn.transferStop}</span>
          </div>
          
          <!-- Leg 1 Info -->
          <div style="margin-left: 10px; margin-bottom: 10px; border-left: 3px solid #457b9d; padding-left: 10px;">
            <p style="margin: 0 0 5px 0; font-weight: 550;">1️⃣ Leg 1: Take <span style="color:#457b9d; font-weight:bold;">Bus ${conn.leg1.number}</span></p>
            <p style="margin: 0; font-size: 14px; color: #555;">From <span class="bus-number-red">${conn.leg1.from}</span> to <span class="bus-number-red">${conn.leg1.to}</span></p>
            <button class="bus-link leg-toggle-btn" style="margin-top: 6px; padding: 4px 8px; font-size: 13px;" id="btn-leg1-${index}">View Leg 1 Route <span class="arrow">▼</span></button>
            <div class="route-container" id="route-leg1-${index}" style="margin-top: 5px;"></div>
          </div>
          
          <!-- Transfer node -->
          <div style="margin: 10px 0 10px 10px; font-weight: bold; font-size: 14px; color: #e63946;">
            🔄 Transfer at ${conn.transferStop}
          </div>
          
          <!-- Leg 2 Info -->
          <div style="margin-left: 10px; border-left: 3px solid #1d3557; padding-left: 10px;">
            <p style="margin: 0 0 5px 0; font-weight: 550;">2️⃣ Leg 2: Take <span style="color:#1d3557; font-weight:bold;">Bus ${conn.leg2.number}</span></p>
            <p style="margin: 0; font-size: 14px; color: #555;">From <span class="bus-number-red">${conn.leg2.from}</span> to <span class="bus-number-red">${conn.leg2.to}</span></p>
            <button class="bus-link leg-toggle-btn" style="margin-top: 6px; padding: 4px 8px; font-size: 13px;" id="btn-leg2-${index}">View Leg 2 Route <span class="arrow">▼</span></button>
            <div class="route-container" id="route-leg2-${index}" style="margin-top: 5px;"></div>
          </div>
        `;
        
        resultDiv.appendChild(card);
        
        const leg1Btn = card.querySelector(`#btn-leg1-${index}`);
        const leg1Container = card.querySelector(`#route-leg1-${index}`);
        leg1Btn.onclick = () => toggleLegRoute(conn.leg1, leg1Container, leg1Btn);
        
        const leg2Btn = card.querySelector(`#btn-leg2-${index}`);
        const leg2Container = card.querySelector(`#route-leg2-${index}`);
        leg2Btn.onclick = () => toggleLegRoute(conn.leg2, leg2Container, leg2Btn);
      });
      return;
    }

    // Render direct bus results
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

// Toggle Leg Route Timeline
function toggleLegRoute(leg, container, button) {
  const arrow = button.querySelector(".arrow");

  // Toggle open/close
  if (container.classList.contains("expanded")) {
    container.classList.remove("expanded");
    container.innerHTML = "";
    arrow.classList.remove("rotate");
    return;
  }

  container.classList.add("expanded");
  arrow.classList.add("rotate");

  const from = leg.from.toLowerCase();
  const to = leg.to.toLowerCase();
  
  // Build timeline with highlights
  container.innerHTML = `
    <div class="timeline" style="margin-top: 10px;">
      ${leg.route.map((stop, i) => {
        const stopLower = stop.toLowerCase();
        const isHighlight = stopLower === from || stopLower === to;
        return `
          <div class="timeline-item ${isHighlight ? "highlight" : ""}">
            <div class="circle"></div>
            <div class="stop-name" style="font-size: 15px;">${stop}</div>
            ${i < leg.route.length - 1 ? '<div class="timeline-line"></div>' : ''}
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

// --- AI Chatbot Frontend Logic ---

const chatbotContainer = document.getElementById("aiChatbotContainer");
const chatbotMessages = document.getElementById("chatbotMessages");
const chatbotInput = document.getElementById("chatbotInput");

// Toggle chatbot window open/closed
function toggleChatbot() {
  chatbotContainer.classList.toggle("closed");
  chatbotContainer.classList.toggle("open");
  
  if (chatbotContainer.classList.contains("open")) {
    chatbotInput.focus();
    scrollToBottom();
  }
}

// Send suggestion chip message
function sendSuggestion(text) {
  chatbotInput.value = text;
  sendChatMessage();
}

// Handle keypress inside chat input (Enter key)
function handleChatbotKeydown(event) {
  if (event.key === "Enter") {
    sendChatMessage();
  }
}

// Scroll chat window to bottom
function scrollToBottom() {
  chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
}

// Send chat message to backend
async function sendChatMessage() {
  const messageText = chatbotInput.value.trim();
  if (!messageText) return;

  // Clear input field
  chatbotInput.value = "";

  // Append user message
  appendMessage(messageText, "user");
  scrollToBottom();

  // Append typing indicator
  const typingIndicator = appendTypingIndicator();
  scrollToBottom();

  try {
    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ message: messageText })
    });

    if (!response.ok) {
      throw new Error("Failed to connect to assistant");
    }

    const data = await response.json();
    
    // Remove typing indicator
    typingIndicator.remove();

    // Append AI response text
    const botMsgDiv = appendMessage(data.text, "bot");

    // Process actions if returned
    if (data.actions && data.actions.length > 0) {
      const actionsContainer = document.createElement("div");
      actionsContainer.className = "chat-actions-container";
      
      data.actions.forEach(action => {
        const btn = document.createElement("button");
        btn.className = "chat-action-btn";
        
        if (action.type === "search_route") {
          btn.textContent = action.label || `🔍 Find route from ${action.from} to ${action.to}`;
          btn.onclick = () => {
            document.getElementById("fromInput").value = action.from;
            document.getElementById("toInput").value = action.to;
            // Scroll to the main search by route box and pulse it
            const routeBox = document.querySelector(".route-inputs").closest(".search-box");
            routeBox.scrollIntoView({ behavior: "smooth" });
            
            // Highlight it temporarily
            routeBox.style.outline = "2px solid #e63946";
            setTimeout(() => routeBox.style.outline = "none", 1500);

            // Close chatbot on mobile to show results, otherwise keep open
            if (window.innerWidth <= 600) {
              toggleChatbot();
            }
            
            // Perform search
            searchByRoute();
          };
        } else if (action.type === "view_bus") {
          btn.textContent = action.label || `🚌 View Bus ${action.busNumber} Route`;
          btn.onclick = () => {
            document.getElementById("busNumberInput").value = action.busNumber;
            const numberBox = document.getElementById("busNumberInput").closest(".search-box");
            numberBox.scrollIntoView({ behavior: "smooth" });
            
            // Highlight it temporarily
            numberBox.style.outline = "2px solid #e63946";
            setTimeout(() => numberBox.style.outline = "none", 1500);

            if (window.innerWidth <= 600) {
              toggleChatbot();
            }

            searchByNumber();
          };
        }
        
        actionsContainer.appendChild(btn);
      });
      
      botMsgDiv.appendChild(actionsContainer);
    }

  } catch (error) {
    typingIndicator.remove();
    appendMessage("⚠️ " + error.message, "bot");
  } finally {
    scrollToBottom();
  }
}

// Append a text message bubble
function appendMessage(text, sender) {
  const msgDiv = document.createElement("div");
  msgDiv.className = `chat-message ${sender}`;
  
  // Renders markdown-like bold (e.g. **text**) and line breaks in the text
  const formattedText = text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>");
    
  msgDiv.innerHTML = `<p>${formattedText}</p>`;
  
  // Insert before suggestion chips if they are present, or just append
  const chips = chatbotMessages.querySelector(".suggestion-chips-container");
  if (chips && sender === "user") {
    chatbotMessages.insertBefore(msgDiv, chips);
  } else {
    chatbotMessages.appendChild(msgDiv);
  }
  
  return msgDiv;
}

// Append typing dots
function appendTypingIndicator() {
  const typingDiv = document.createElement("div");
  typingDiv.className = "typing-indicator";
  typingDiv.innerHTML = `
    <div class="typing-dot"></div>
    <div class="typing-dot"></div>
    <div class="typing-dot"></div>
  `;
  chatbotMessages.appendChild(typingDiv);
  return typingDiv;
}
