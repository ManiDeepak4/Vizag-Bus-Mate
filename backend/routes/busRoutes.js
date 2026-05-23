const express = require('express');
const router = express.Router();
const Bus = require('../models/bus');

// ✅ Get bus by number (case-insensitive)
router.get('/:number', async (req, res) => {
  const busNumber = req.params.number;
  if (!busNumber || !/^[A-Za-z0-9]+$/.test(busNumber)) {
    return res.status(400).json({ message: 'Invalid bus number format' });
  }
  try {
    const bus = await Bus.findOne({
      number: { $regex: `^${busNumber}$`, $options: 'i' },
    });
    if (!bus) {
      return res.status(404).json({ message: 'Bus not found' });
    }
    res.json(bus);
  } catch (error) {
    console.error("❌ Error in /api/bus/:number:", error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ✅ Get buses by from and to (direction-aware)
router.get("/", async (req, res) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) {
      return res.status(400).json({ message: "Please provide from and to" });
    }

    const fromLower = from.trim().toLowerCase();
    const toLower = to.trim().toLowerCase();

    const buses = await Bus.find({
      route: {
        $all: [
          { $elemMatch: { $regex: new RegExp(`^${fromLower}$`, "i") } },
          { $elemMatch: { $regex: new RegExp(`^${toLower}$`, "i") } },
        ],
      },
    });

    const filtered = buses.map((bus) => {
  const routeLower = bus.route.map((stop) => stop.toLowerCase());
  const fromIndex = routeLower.indexOf(fromLower);
  const toIndex = routeLower.indexOf(toLower);

  if (fromIndex !== -1 && toIndex !== -1) {
    const isForward = fromIndex < toIndex;
    return {
      number: bus.number,
      route: isForward ? bus.route : [...bus.route].reverse(),
    };
  }
  return null;
}).filter(Boolean);

    if (filtered.length > 0) {
      return res.json(filtered);
    }

    // 🔄 No direct buses found, search for transfer routes (1-hop connections)
    const sourceBuses = await Bus.find({
      route: { $elemMatch: { $regex: new RegExp(`^${fromLower}$`, "i") } }
    });

    const destBuses = await Bus.find({
      route: { $elemMatch: { $regex: new RegExp(`^${toLower}$`, "i") } }
    });

    const connections = [];

    for (const sBus of sourceBuses) {
      const sRouteLower = sBus.route.map(s => s.toLowerCase());
      const fIdx = sRouteLower.indexOf(fromLower);

      for (const dBus of destBuses) {
        const dRouteLower = dBus.route.map(s => s.toLowerCase());
        const tIdx = dRouteLower.indexOf(toLower);

        // Find intersection stops
        const commonStops = sBus.route.filter(stop =>
          dBus.route.some(dStop => dStop.toLowerCase() === stop.toLowerCase())
        );

        for (const common of commonStops) {
          const commonLower = common.toLowerCase();
          // Don't transfer at source or destination itself
          if (commonLower === fromLower || commonLower === toLower) continue;

          const transSIdx = sRouteLower.indexOf(commonLower);
          const transDIdx = dRouteLower.indexOf(commonLower);

          if (fIdx !== -1 && transSIdx !== -1 && transDIdx !== -1 && tIdx !== -1) {
            const isLeg1Forward = fIdx < transSIdx;
            const isLeg2Forward = transDIdx < tIdx;

            connections.push({
              transferStop: common,
              leg1: {
                number: sBus.number,
                from: sBus.route[fIdx],
                to: common,
                route: isLeg1Forward ? sBus.route : [...sBus.route].reverse()
              },
              leg2: {
                number: dBus.number,
                from: common,
                to: dBus.route[tIdx],
                route: isLeg2Forward ? dBus.route : [...dBus.route].reverse()
              }
            });
          }
        }
      }
    }

    // Filter unique recommendations (max 3 distinct connections)
    const uniqueConnections = [];
    const seenCombination = new Set();

    for (const conn of connections) {
      const key = `${conn.leg1.number}-${conn.transferStop}-${conn.leg2.number}`;
      if (!seenCombination.has(key)) {
        seenCombination.add(key);
        uniqueConnections.push(conn);
      }
      if (uniqueConnections.length >= 3) break;
    }

    if (uniqueConnections.length > 0) {
      return res.json({
        type: "connecting",
        connections: uniqueConnections
      });
    }

    res.json([]);
  } catch (error) {
    console.error("❌ Error in /api/bus route:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
