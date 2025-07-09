const mongoose = require('mongoose');

const busSchema = new mongoose.Schema({
  number: {
    type: String,
    required: true,
    unique: true
  },
  route: {
    type: [String],
    required: true
  }
});

module.exports = mongoose.model('Bus', busSchema);
