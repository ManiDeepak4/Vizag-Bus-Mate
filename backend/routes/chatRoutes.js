const express = require('express');
const router = express.Router();
const Bus = require('../models/bus');

// Predefined stop list for matching in Mock AI
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
  "Pedagantyada", "Pedda Waltair", "Pendurthi", "PM Palem", "Police Colony", "Railway Station",
  "Rama Talkies", "RK Beach", "Rushikonda", "RTC Complex", "Sabbavaram", "Scindia",
  "Seethammadhara", "Sheelanagar", "Shankarmatam", "Shantinagar", "Simhachalam",
  "Simhachalam Temple", "Sontyam", "Suryabagh", "Tagarapuvalasa", "Tenneti Park",
  "Thatichetlapalem", "Thotlakonda", "Town Kotha Road", "Vepagunta", "Venkojipalem",
  "Visakhapatnam Airport", "Vizianagaram Bus Stand", "Vizianagaram RTC Complex", "VUDA Park", "Yarada",
  "Yarada Beach", "Yendada"
];

// Helper to find a matching stop in text (case-insensitive fuzzy match)
function extractStops(text) {
  const normalized = text.toLowerCase();
  const found = [];
  
  // Sort stops by length descending to match longer names first (e.g. "Simhachalam Temple" before "Simhachalam")
  const sortedStops = [...allStops].sort((a, b) => b.length - a.length);
  
  for (const stop of sortedStops) {
    if (normalized.includes(stop.toLowerCase())) {
      found.push(stop);
      // Remove the matched stop from text to prevent sub-string matching
      // E.g. matching "Simhachalam" and "Simhachalam Temple" on the same substring
      const regex = new RegExp(stop.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi');
      text = text.replace(regex, '');
    }
  }
  return found;
}

// POST /api/chat
router.post('/', async (req, res) => {
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  // 1. Check if Gemini API Key is available
  if (process.env.GEMINI_API_KEY) {
    try {
      const { GoogleGenAI } = require('@google/genai');
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      // Retrieve all bus info from DB to provide context to Gemini
      const buses = await Bus.find({ isActive: true });
      const contextPrompt = `
You are the "Vizag Bus-Mate AI Assistant", a friendly transit companion for Visakhapatnam (Vizag) public transport.
Here is the active bus database in Vizag:
${JSON.stringify(buses.map(b => ({ number: b.number, route: b.route, source: b.source, destination: b.destination, fare: b.fare })))}

Instructions:
1. Answer the user's transit question accurately based on the active bus database above.
2. If they ask for a route or how to travel between two stops, look up the database.
3. If they ask in Telugu or Hindi, respond in that language.
4. VERY IMPORTANT: You must return a JSON response containing both:
   a. "text": A friendly, natural language response explaining the routes, transfer points, or bus info.
   b. "actions": An array of action objects that the frontend can trigger.
      - To search a direct/connecting route: { "type": "search_route", "from": "Stop Name", "to": "Stop Name" }
      - To view a specific bus number route: { "type": "view_bus", "busNumber": "Bus Number" }

Example JSON format:
{
  "text": "To go from MVP Colony to Gitam, you can take Bus 10H. It goes directly through MVP Colony and Gitam.",
  "actions": [{"type": "search_route", "from": "MVP Colony", "to": "Gitam"}]
}
Response must be valid JSON matching the format above. Do not wrap in markdown code blocks like \`\`\`json.
`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: message,
        config: {
          systemInstruction: contextPrompt,
          responseMimeType: 'application/json'
        }
      });

      const responseText = response.text || response.candidates[0].content.parts[0].text;
      const parsed = JSON.parse(responseText.trim());
      return res.json(parsed);

    } catch (err) {
      console.error("❌ Gemini API Error, falling back to Intelligent Mock Mode:", err);
      // Fall through to Mock Mode
    }
  }

  // 2. Intelligent Mock AI Mode (Uses real MongoDB queries under the hood)
  try {
    const text = message.trim();
    const cleanText = text.toLowerCase();
    
    // Check for Greetings
    if (/^(hi|hello|hey|greetings|good morning|good afternoon|good evening|yo)\b/.test(cleanText)) {
      return res.json({
        text: "Hello! 🚌 I am your Vizag Bus-Mate AI Assistant. Ask me how to travel between two stops (e.g. *'How to go from RTC Complex to Gitam?'*) or query a specific bus number route (e.g. *'Route of Bus 10H'*). How can I assist you today?",
        actions: []
      });
    }

    // Check for Bus Number query (e.g. "10H", "25V", "500", "bus 10h")
    const busMatch = text.match(/\b(?:bus\s+)?([0-9]{1,4}[A-Za-z]?)\b/i);
    if (busMatch && !cleanText.includes("from") && !cleanText.includes("to")) {
      const busNumber = busMatch[1].toUpperCase();
      const bus = await Bus.findOne({ number: { $regex: `^${busNumber}$`, $options: 'i' } });
      
      if (bus) {
        const source = bus.source || bus.route[0] || 'Unknown';
        const destination = bus.destination || bus.route[bus.route.length - 1] || 'Unknown';
        const fareStr = bus.fare ? `₹${bus.fare}` : '₹15 - ₹35';
        return res.json({
          text: `🚍 **Bus ${bus.number}** runs from **${source}** to **${destination}**.\n\n📍 **Stops on Route**:\n${bus.route.join(" ➔ ")}\n\n💰 **Fare**: Approx ${fareStr}. Type of Bus: **${bus.busType}**. Seats Available: **${bus.seatsAvailable}**.`,
          actions: [{ type: "view_bus", busNumber: bus.number }]
        });
      }
    }

    // Check for Route/Connection query (extract two stops)
    const matchedStops = extractStops(text);
    if (matchedStops.length >= 2) {
      // Assuming first matched stop is "From" and second is "To"
      // If user typed "to B from A", reverse order if we find indicators
      let fromStop = matchedStops[0];
      let toStop = matchedStops[1];

      const fromIndex = cleanText.indexOf(fromStop.toLowerCase());
      const toIndex = cleanText.indexOf(toStop.toLowerCase());
      const toWordIndex = cleanText.indexOf("to");
      const fromWordIndex = cleanText.indexOf("from");

      if (fromWordIndex !== -1 && toWordIndex !== -1 && fromWordIndex > toWordIndex) {
        // e.g. "to Gitam from MVP" -> reverse
        fromStop = matchedStops[1];
        toStop = matchedStops[0];
      }

      // Query database for direct buses
      const directBuses = await Bus.find({
        route: {
          $all: [
            { $elemMatch: { $regex: new RegExp(`^${fromStop}$`, "i") } },
            { $elemMatch: { $regex: new RegExp(`^${toStop}$`, "i") } },
          ],
        },
      });

      // Filter direction-aware buses
      const validBuses = directBuses.filter(bus => {
        const routeLower = bus.route.map(stop => stop.toLowerCase());
        const fIdx = routeLower.indexOf(fromStop.toLowerCase());
        const tIdx = routeLower.indexOf(toStop.toLowerCase());
        return fIdx !== -1 && tIdx !== -1 && fIdx < tIdx;
      });

      if (validBuses.length > 0) {
        const busNumbers = validBuses.map(b => `**Bus ${b.number}**`).join(", ");
        return res.json({
          text: `✅ Yes! I found **${validBuses.length} direct bus(es)** running from **${fromStop}** to **${toStop}**:\n👉 ${busNumbers}.\n\nClick the button below to view search results and detailed routes on the main page.`,
          actions: [{ type: "search_route", from: fromStop, to: toStop }]
        });
      }

      // No direct bus found, let's search for a connecting bus (1 transfer stop)
      // Find all buses passing through fromStop
      const sourceBuses = await Bus.find({
        route: { $elemMatch: { $regex: new RegExp(`^${fromStop}$`, "i") } }
      });
      // Find all buses passing through toStop
      const destBuses = await Bus.find({
        route: { $elemMatch: { $regex: new RegExp(`^${toStop}$`, "i") } }
      });

      let transferStop = null;
      let leg1Bus = null;
      let leg2Bus = null;

      for (const sBus of sourceBuses) {
        const sRouteLower = sBus.route.map(s => s.toLowerCase());
        const fromIdx = sRouteLower.indexOf(fromStop.toLowerCase());
        
        for (const dBus of destBuses) {
          const dRouteLower = dBus.route.map(s => s.toLowerCase());
          const toIdx = dRouteLower.indexOf(toStop.toLowerCase());

          // Find intersection
          const commonStops = sBus.route.filter(stop => 
            dBus.route.some(dStop => dStop.toLowerCase() === stop.toLowerCase())
          );

          for (const common of commonStops) {
            const commonLower = common.toLowerCase();
            // Don't use source or dest as transfer stop
            if (commonLower === fromStop.toLowerCase() || commonLower === toStop.toLowerCase()) continue;
            
            const transSIdx = sRouteLower.indexOf(commonLower);
            const transDIdx = dRouteLower.indexOf(commonLower);

            // Ensure correct travel direction
            // Leg 1: fromStop -> commonStop
            // Leg 2: commonStop -> toStop
            if (fromIdx < transSIdx && transDIdx < toIdx) {
              transferStop = common;
              leg1Bus = sBus.number;
              leg2Bus = dBus.number;
              break;
            }
          }
          if (transferStop) break;
        }
        if (transferStop) break;
      }

      if (transferStop) {
        return res.json({
          text: `🚌 No direct bus found between **${fromStop}** and **${toStop}**.\n\n🔄 However, you can travel with **1 transfer**:\n1️⃣ Take **Bus ${leg1Bus}** from **${fromStop}** to **${transferStop}**.\n2️⃣ Transfer at **${transferStop}**.\n3️⃣ Take **Bus ${leg2Bus}** from **${transferStop}** to **${toStop}**.`,
          actions: [
            { type: "search_route", from: fromStop, to: transferStop, label: `Search Leg 1 (Bus ${leg1Bus})` },
            { type: "search_route", from: transferStop, to: toStop, label: `Search Leg 2 (Bus ${leg2Bus})` }
          ]
        });
      }

      return res.json({
        text: `❌ I couldn't find a direct or single-transfer bus route from **${fromStop}** to **${toStop}** in our current system.\n\nTry searching for nearby transit centers like **RTC Complex** or **NAD Junction** to see if buses run from there.`,
        actions: []
      });
    }

    // Destination only search (e.g. "buses to Gitam")
    if (cleanText.includes("to ") || cleanText.includes("for ")) {
      const destination = matchedStops[0] || allStops.find(stop => cleanText.includes(stop.toLowerCase()));
      if (destination) {
        const destBuses = await Bus.find({
          route: { $elemMatch: { $regex: new RegExp(`^${destination}$`, "i") } }
        });
        if (destBuses.length > 0) {
          const numbers = destBuses.map(b => `**Bus ${b.number}**`).join(", ");
          return res.json({
            text: `🚌 Here are the buses that stop at **${destination}**:\n👉 ${numbers}.\n\nYou can query their full route details by asking e.g. *"Route of Bus ${destBuses[0].number}"*.`,
            actions: []
          });
        }
      }
    }

    // Default Fallback
    return res.json({
      text: "🤔 I didn't quite catch that. You can ask me questions like:\n*   *\"How do I get from MVP Colony to RTC Complex?\"*\n*   *\"Route of Bus 10H\"*\n*   *\"Which buses stop at Gitam?\"*\n\nPlease make sure to use standard Vizag bus stops (like *RTC Complex, MVP Colony, Gitam, Gajuwaka, NAD, Railway Station*, etc.) for the best results!",
      actions: []
    });

  } catch (error) {
    console.error("❌ Error in Mock AI:", error);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
