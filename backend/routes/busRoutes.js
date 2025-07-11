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
      number: (bus.number && bus.number.toString()) || (bus.busNumber && bus.busNumber.toString()) || bus._id.toString(),
      route: isForward ? bus.route : [...bus.route].reverse(),
    };
  }
  return null;
}).filter(Boolean);

    res.json(filtered);
  } catch (error) {
    console.error("❌ Error in /api/bus route:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
