const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: String,
    description: String,
    price: String,
    category: String,
    brand: String,
    stock_quantity: Number,
    userId: String,
    imagePath: String
});

module.exports = mongoose.model("Product", productSchema);