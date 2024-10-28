const express = require('express');
const upload = require('./multer/multerConfig');
require('./db/config');
const cors = require('cors');
const User = require('./db/User');
const Product = require('./db/Product');
const Cart = require('./db/Cart');


const app = express();

app.use(express.json());
app.use(cors());

app.use('/uploads', express.static('uploads'));

app.post('/signup', async (req, res) => {
    let user = new User(req.body);
    let result = await user.save();
    result = result.toObject();
    delete result.password;
    res.send(result);
})

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    let user = await User.findOne({ email });

    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }

    if (user.password !== password) {
        return res.status(401).json({ message: 'Incorrect password' });
    }

    res.json(user);
})


app.post('/add-product', upload.single('image'), async (req, res) => {
    const { name, description, price, category, brand, userId } = req.body;

    const product = new Product({
        name,
        description,
        price,
        category,
        brand,
        imagePath: req.file.path,
        userId,
    });

    let result = await product.save();
    res.send(result);
})


app.get('/products', async (req, res) => {
    const product = await Product.find();
    if (product.length > 0) {
        res.send(product);
    }
    else {
        res.send({ result: 'No Product found' });
    }
})

app.delete('/products/:id', async (req, res) => {
    let result = await Product.deleteOne({ _id: req.params.id });
    res.send(result);
})

app.get('/products/:id', async (req, res) => {
    let result = await Product.findOne({ _id: req.params.id });
    if (result) {
        res.send(result);
    }
    else {
        res.send({ "result": "No data found" });
    }
})

app.put('/products/:id', upload.single('image'), async (req, res) => {
    try {
        let updateData = req.body;
        if (req.file) {
            updateData.imagePath = req.file.path;
        }

        let result = await Product.updateOne(
            { _id: req.params.id },
            { $set: req.body }
        )
        res.send(result);
    }
    catch (err) {
        res.send({ message: 'Error in Updating product', err });
    }
})

app.get('/search/:key', async (req, res) => {
    let result = await Product.find({
        '$or': [
            { name: { $regex: req.params.key } },
            { brand: { $regex: req.params.key } },
            { category: { $regex: req.params.key } }
        ]
    });
    res.send(result);
})

app.post('/add-to-cart', async (req, res) => {
    const { userId, productId, quantity } = req.body;
    // console.log({
    //     userId,
    //     productId,
    //     quantity
    // });

    // Validate required fields
    if (!userId || !productId || !quantity) {
        return res.status(400).json({ error: 'userId, productId, and quantity are required.' });
    }

    try {
        // Check if the product exists in the database
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ error: 'Product not found.' });
        }

        // Find the user's cart
        let cart = await Cart.findOne({ userId });

        // If cart does not exist, create a new one
        if (!cart) {
            cart = new Cart({
                userId,
                items: [],
                totalPrice: 0
            });
        }

        // Check if the product already exists in the cart
        const productIndex = cart.items.findIndex(item => item.productId.toString() === productId);

        if (productIndex > -1) {
            // If product is already in the cart, update its quantity
            cart.items[productIndex].quantity += quantity;
        } else {
            // If product is not in the cart, add it to the cart
            cart.items.push({
                productId,
                quantity
            });
        }

        // Recalculate total price
        cart.totalPrice = await calculateTotalPrice(cart.items);

        // Save the updated cart
        await cart.save();

        res.status(200).json({ message: 'Product added to cart successfully', cart });
    } catch (error) {
        console.error('Error adding product to cart:', error);
        res.status(500).json({ error: 'Error adding product to cart', details: error.message });
    }
});

const calculateTotalPrice = async (items) => {
    let totalPrice = 0;
    for (const item of items) {
        const product = await Product.findById(item.productId);
        totalPrice += parseFloat(product.price) * item.quantity;
    }
    return totalPrice;
}

app.get('/cart/:userId', async (req, res) => {
    const userId = req.params.userId;
    // console.log(userId);
    try {
        const cart = await Cart.findOne({ userId })
            .populate('items.productId', 'name price imagePath');
        if (!cart) {
            return res.json({ msg: 'Cart not found' });
        }
        // console.log('RUHA', cart);
        // cart.items.forEach(item => console.log('------', item.productId.imagePath));
        res.json(cart);
    }
    catch (err) {
        console.log(err);
        res.json({ msg: 'Error to get Cart data' });
    }
});


app.put('/cart/:userId/updateQuantity', async (req, res) => {
    const userId = req.params.userId;
    const { productId, quantity } = req.body;
    console.log(userId, req.body);
    if (quantity < 1) {
        return res.json({ msg: 'Quantity must be more than 1' });
    }

    try {
        let cart = await Cart.findOne({ userId }).populate('items.productId');
        console.log(cart);
        console.log('Cart items:', cart.items.map(item => item.productId.toString()));
        console.log('Received productId:', productId); // Should already be a string

        if (!cart) {
            return res.json({ msg: ' Cart not found' });
        }
        const itemIndex = cart.items.findIndex(item => item.productId.equals(productId));

        if (itemIndex > -1) {
            cart.items[itemIndex].quantity = quantity;
        }
        else {
            return res.json({ msg: 'Product not found in the cart' });
        }

        cart.totalPrice = await calculateTotalPrice(cart.items);
        console.log(cart);
        await cart.save();
        console.log('-----RUHA----', cart);
        res.json({ msg: 'Cart updated successfully', cart });

    }
    catch (err) {
        console.log('Error in updating cart', err);
    }
})

app.listen(8001, () => {
    console.log('Server Listens at port 8001');
})