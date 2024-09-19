const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  category: { type: String, required: true },
  subcategories: { type: [String], required: true },
  image: {
    data: Buffer,
    contentType: String,
  }
}, { 
  timestamps: true 
});

// Virtual to retrieve the image in Base64 format
categorySchema.virtual('imagePath').get(function () {
  return this.image ? `data:${this.image.contentType};base64,${this.image.data.toString('base64')}` : null;
});

const Category = mongoose.model('Category', categorySchema);

module.exports = Category;
