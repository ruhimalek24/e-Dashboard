const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CartItemSchema = new Schema({
    productId: {
        type: Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        default: 1
    }
});

const CartSchema = new mongoose.Schema({
    userId: String,
    items: [
        {
            productId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Product' // Reference to the Product model
            },
            quantity: Number
        }
    ],
    totalPrice: Number
});

module.exports = mongoose.model('Cart', CartSchema);