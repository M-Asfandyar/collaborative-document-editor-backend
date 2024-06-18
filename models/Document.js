const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
    content: {
        type: String,
        required: true,
    },
    version: {
        type: Number,
        required: true,
        default: 1,
    },
    lastModifiedBy: {
        type: String,
        required: true,
    },
}, {
    timestamps: true,
});

// Added an index to the lastModifiedBy field for faster queries
documentSchema.index({ lastModifiedBy: 1 });

module.exports = mongoose.model('Document', documentSchema);
