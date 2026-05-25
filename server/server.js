

const path = require("path");
const dotenv = require("dotenv");

dotenv.config({
    path: path.resolve(__dirname, "../.env")
});

console.log("=== ENV DEBUG ===");
console.log("__dirname:", __dirname);
console.log("Env path:", path.resolve(__dirname, "../.env"));
console.log("CLOUDINARY_CLOUD_NAME:", process.env.CLOUDINARY_CLOUD_NAME);
console.log("CLOUDINARY_API_KEY:", process.env.CLOUDINARY_API_KEY);
console.log("CLOUDINARY_API_SECRET:", process.env.CLOUDINARY_API_SECRET);
console.log("=== END ENV DEBUG ===");

const port = process.env.PORT || 5000;
const express = require("express");
const cors = require("cors");
const app = express();
app.use(cors());
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
        return res.sendStatus(200);
    }

    next();
});
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const multer = require("multer");
const nodemailer = require("nodemailer");
const JWT_SECRET = process.env.JWT_SECRET;
const axios = require("axios");
const webpush = require("web-push");

const db = require("./db");



// =========================
// WEB PUSH SETUP
// =========================

webpush.setVapidDetails(
    "mailto:abugribismark4@gmail.com",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
);

// =========================
// CLOUDINARY IMPORTS
// Handles meal image uploads
// =========================

const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const { error } = require("console");



// =========================
// CLOUDINARY CONFIGURATION
// Connect backend to Cloudinary
// =========================

console.log("About to configure Cloudinary...");
console.log("process.env.CLOUDINARY_CLOUD_NAME before config:", process.env.CLOUDINARY_CLOUD_NAME);

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

console.log("After Cloudinary config:");
console.log("cloudinary.config cloud_name:", cloudinary.config().cloud_name);

console.log("Cloudinary env loaded:", {
    cloud_name: !!process.env.CLOUDINARY_CLOUD_NAME,
    api_key: !!process.env.CLOUDINARY_API_KEY,
    api_secret: !!process.env.CLOUDINARY_API_SECRET
});
console.log("Cloudinary cloud_name value:", process.env.CLOUDINARY_CLOUD_NAME);

if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    console.error("Missing Cloudinary credentials from .env");
}

if (process.env.CLOUDINARY_CLOUD_NAME === "secret" || process.env.CLOUDINARY_CLOUD_NAME.trim() === "") {
    console.error("Cloudinary cloud name appears to be a placeholder. Set CLOUDINARY_CLOUD_NAME to your real Cloudinary account name.");
}

if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_CLOUD_NAME !== process.env.CLOUDINARY_CLOUD_NAME.toLowerCase()) {
    console.error("Cloudinary cloud name should be lowercase and match your Cloudinary account name.");
}

// =========================
// CLOUDINARY STORAGE SETUP
// Stores uploaded meal images in Cloudinary
// =========================

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: "esteesbites/meals",
        allowed_formats: ["jpg", "jpeg", "png", "webp"]
    }
});

// =========================
// MULTER UPLOAD MIDDLEWARE
// Used in meal upload routes
// =========================

const upload = multer({ storage });


app.use(cors());

app.use(express.json());

app.use("/images",
    express.static(path.join(__dirname, "images")));

const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use("/uploads", express.static(uploadsDir));

// =========================
// MULTER STORAGE
// =========================
    
const localStorage = multer.diskStorage({

    destination: (req, file, cb) => {

        cb(null, uploadsDir);

    },

    filename: (req, file, cb) => {

        cb(

            null,

            Date.now() +
            path.extname(file.originalname)

        );

    }

});

const localUpload = multer({
    storage: localStorage
});

const PORT = 5000;

// =========================
// GET USER PROFILE
// Loads user profile, order count, spending, and last order
// =========================

app.get("/api/profile", authenticateToken, (req, res) => {

    const userId = req.user.id;

    const sql = `
        SELECT 
            users.id,
            users.fullname,
            users.email,
            users.phone,
            users.address,
            users.created_at,
            users.loyalty_points,
            COUNT(orders.id) AS total_orders,
            COALESCE(SUM(orders.total), 0) AS total_spent,
            MAX(orders.created_at) AS last_order_date
        FROM users
        LEFT JOIN orders ON users.id = orders.user_id
        WHERE users.id = ?
        GROUP BY users.id
    `;

    db.query(sql, [userId], (err, results) => {

        if (err) {
            console.log(err);
            return res.status(500).json({
                message: "Database error"
            });
        }

        res.json(results[0]);
    });
});

// =========================
// UPDATE USER PROFILE
// Updates phone and address
// =========================

app.put("/api/profile", authenticateToken, (req, res) => {

    const userId = req.user.id;
    const { phone, address } = req.body;

    const sql = `
        UPDATE users
        SET phone = ?, address = ?
        WHERE id = ?
    `;

    db.query(sql, [phone, address, userId], (err) => {

        if (err) {
            console.log(err);
            return res.status(500).json({
                message: "Failed to update profile"
            });
        }

        res.json({
            message: "Profile updated successfully"
        });
    });
});

// =========================
// RECENT USER ORDERS
// =========================

app.get(
    "/api/profile/recent-orders",
    authenticateToken,
    (req, res) => {

        const userId = req.user.id;

        const sql = `
            SELECT *
            FROM orders
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT 3
        `;

        db.query(sql, [userId], (err, results) => {

            if (err) {

                console.log(err);

                return res.status(500).json({
                    message: "Database error"
                });

            }

            res.json(results);

        });

    }
);



// =========================
// GET ALL MEALS
// =========================

app.get("/api/meals", (req, res) => {

    const sql = "SELECT * FROM meals";

    db.query(sql, (err, results) => {

        if(err){

            res.status(500).json({
                error: "Database error"
            });

        }else{

            res.json(results);

        }

    });

});


// =========================
// USER REGISTRATION
// =========================

app.post("/api/register", async (req, res) => {

    const { fullname, email, phone, address, password } = req.body;

    if(!fullname || !email || !phone || !address || !password){

        return res.status(400).json({
            message: "All fields are required"
        });

    }

    const hashedPassword =
        await bcrypt.hash(password, 10);

    const sql = `
        INSERT INTO users (fullname, email, phone, address, password)
        VALUES (?, ?, ?, ?, ?)
    `;

    db.query(

        sql,

        [fullname, email, phone, address, hashedPassword],

        (err, result) => {

            if(err){

                return res.status(500).json({
                    message: "Email already exists"
                });

            }

            res.json({
                message: "Registration successful"
            });

        }

    );

});

// =========================
// USER LOGIN API
// =========================

app.post("/api/login", (req, res) => {

    const identifier =
    req.body.identifier.trim();

    const password =
    req.body.password; 

    // Check fields
    if(!identifier || !password){

        return res.status(400).json({
            message: "All fields are required"
        });

    }

    // Find user
    const sql = `
        SELECT * FROM users
        WHERE TRIM(email) = ? or TRIM(phone) = ?
    `;

    db.query(sql, [identifier, identifier], async (err, results) => {

        if(err){

            return res.status(500).json({
                message: "Database error"
            });

        }

        // User not found
        if(results.length === 0){

            return res.status(401).json({
                message: "Invalid email or password"
            });

        }

        const user = results[0];

        // Compare password
        const validPassword =
            await bcrypt.compare(
                password,
                user.password
            );

        if(!validPassword){

            return res.status(401).json({
                message: "Invalid email/phone or password"
            });

        }

        // Login success
        // Create token
const token = jwt.sign(

    {
        id: user.id,
        email: user.email,
        role: user.role
    },

    JWT_SECRET,

    {
        expiresIn: "7d"
    }

);

res.json({

    message: "Login successful",

    token,

    user: {
        id: user.id,
        fullname: user.fullname,
        email: user.email,
        phone: user.phone,
        address: user.address,
        role: user.role
    }

});

    });

});

// =========================
// CREATE NOTIFICATION HELPER
// Saves notification for a user
// =========================

function createNotification(userId, message) {

    const sql = `
        INSERT INTO notifications
        (user_id, message)
        VALUES (?, ?)
    `;

    db.query(sql, [userId, message], (err) => {

        if (err) {
            console.log("Notification error:", err);
        }

    });
    // =========================
    // SEND PUSH NOTIFICATION
    // =========================

    sendPushNotification(
        userId,
        "ESTEESBITES",
        message
    );
}

// =========================
// CREATE ORDER API
// Supports Paystack and Cash on Delivery
// =========================

app.post("/api/orders", authenticateToken, async (req, res) => {

    const {
        user_id,
        items,
        total,
        fullname,
        phone,
        address,
        city,
        payment_method,
        email,
        payment_reference,
        order_type,
        preferred_date,
        preferred_time,
        special_notes,
        coupon_code,
        discount_amount,
        redeemed_points,
        points_discount
    } = req.body;

    // Validate normal order fields
    if (
        !user_id ||
        !items ||
        !total ||
        !fullname ||
        !phone ||
        !address ||
        !city ||
        !payment_method ||
        !email
    ) {
        return res.status(400).json({
            message: "All fields are required"
        });
    }

    try {

        let paymentStatus = "unpaid";
        let transactionId = null;
        let finalPaymentReference = null;

        // =========================
        // PAYSTACK PAYMENT CHECK
        // Verify payment before saving order
        // =========================

        if (payment_method === "Paystack") {

            // Paystack orders must have payment reference
            if (!payment_reference) {
                return res.status(400).json({
                    message: "Payment reference is required"
                });
            }

            // Verify payment with Paystack
            const verifyResponse = await axios.get(
                `https://api.paystack.co/transaction/verify/${payment_reference}`,
                {
                    headers: {
                        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
                    }
                }
            );

            const paymentData = verifyResponse.data.data;

            // Stop if payment was not successful
            if (paymentData.status !== "success") {
                return res.status(400).json({
                    message: "Payment was not successful"
                });
            }

            // Stop if paid amount does not match cart total
            if (paymentData.amount / 100 !== Number(total)) {
                return res.status(400).json({
                    message: "Payment amount does not match order total"
                });
            }

            // Payment is verified
            paymentStatus = "Paid";
            transactionId = paymentData.id;
            finalPaymentReference = payment_reference;
        }

        // =========================
        // CASH ON DELIVERY CHECK
        // Save order without Paystack verification
        // =========================

        if (payment_method === "Cash on Delivery") {
            paymentStatus = "Unpaid";
            transactionId = null;
            finalPaymentReference = null;
        }

        // =========================
        // SAVE ORDER TO DATABASE
        // =========================

        const sql = `
            INSERT INTO orders
            (
                user_id,
                fullname,
                phone,
                address,
                city,
                payment_method,
                items,
                total,
                status,
                payment_status,
                payment_reference,
                transaction_id,
                order_type,
                preferred_date,
                preferred_time,
                special_notes
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        db.query(
            sql,
                    [
            user_id,
            fullname,
            phone,
            address,
            city,
            payment_method,
            JSON.stringify(items),
            total,
            "Pending",
            paymentStatus,
            finalPaymentReference,
            transactionId,

            // Preorder details
            order_type || "Delivery",
            preferred_date || null,
            preferred_time || null,
            special_notes || null
        ],
                    (err, result) => {

                // Database error
                if (err) {
                    console.error(err);

                    return res.status(500).json({
                        message: "Failed to create order"
                    });
                }



                //Successfully created order, send notification to user
                createNotification(
                    user_id,
                    "Your order has been placed successfully."
                );

                // =========================
                // GENERATE ORDER CODE
                // =========================

                const orderCode =
                    `EST-${String(result.insertId).padStart(5, "0")}`;



                // =========================
                // SEND ADMIN SMS
                // =========================

                sendAdminSMS(

                    `New ESTEESBITES Order ${orderCode}. Customer: ${fullname}. Phone: ${phone}. Total: GHC ${total}. Payment: ${payment_method}.`

                );
                // =========================
                // SEND CUSTOMER SMS
                // =========================

                sendCustomerSMS(
                    phone,
                    `Hi ${fullname}, your ESTEESBITES order ${orderCode} has been received. Total: GHC ${total}. We will update you soon. Thank you!`
                );

                // =========================
                // UPDATE COUPON USAGE
                // =========================

                if (coupon_code) {

                    const couponSql = `
                        UPDATE coupons
                        SET used_count = used_count + 1
                        WHERE code = ?
                    `;

                    db.query(
                        couponSql,
                        [coupon_code.toUpperCase()],
                        (err) => {

                            if (err) {
                                console.log("Coupon usage update error:", err);
                            }

                        }
                    );

                }
                // =========================
                // DEDUCT REDEEMED POINTS
                // =========================

                if (redeemed_points > 0) {

                    const deductPointsSql = `
                        UPDATE users
                        SET loyalty_points =
                            loyalty_points - ?
                        WHERE id = ?
                    `;

                    db.query(
                        deductPointsSql,
                        [redeemed_points, user_id],
                        (err) => {

                            if (err) {
                                console.log(
                                    "Points deduction error:",
                                    err
                                );
                            }

                        }
                    );

                }

                // Success response
                res.status(201).json({
                    message: "Order created successfully",
                    order_id: result.insertId,
                    payment_status: paymentStatus
                });
            }
        );

    } catch (error) {

        // Payment verification or server error
        console.error(error.response?.data || error.message);

        res.status(500).json({
            message: "Order creation failed"
        });
    }
});

// =========================
// GET USER ORDERS
// =========================

app.get("/api/orders/:userId", (req, res) => {

    const userId = req.params.userId;

    const sql = `
        SELECT * FROM orders
        WHERE user_id = ?
        AND hidden_from_user = FALSE
        ORDER BY created_at DESC
    `;

    db.query(sql, [userId], (err, results) => {

        if (err) {
            return res.status(500).json({
                message: "Database error"
            });
        }

        res.json(results);

    });

});

// =========================
// CANCEL ORDER ROUTE
// Users can cancel only pending orders
// =========================

app.put("/api/orders/:id/cancel", authenticateToken, (req, res) => {

    const orderId = req.params.id;
    const userId = req.user.id;

    // Check if order belongs to logged in user
    const checkSql = `
        SELECT * FROM orders
        WHERE id = ? AND user_id = ?
    `;

    db.query(checkSql, [orderId, userId], (err, results) => {

        // Database error
        if (err) {
            return res.status(500).json({
                message: "Database error"
            });
        }

        // Order not found
        if (results.length === 0) {
            return res.status(404).json({
                message: "Order not found"
            });
        }

        const order = results[0];

        // Only pending orders can be cancelled
        if (order.status !== "Pending") {
            return res.status(400).json({
                message: "Order cannot be cancelled"
            });
        }

        // Update order status
        const updateSql = `
            UPDATE orders
            SET status = 'Cancelled'
            WHERE id = ?
        `;

        db.query(updateSql, [orderId], (err) => {

            // Update failed
            if (err) {
                return res.status(500).json({
                    message: "Failed to cancel order"
                });
            }

            // Success response
            res.json({
                message: "Order cancelled successfully"
            });
        });
    });
});

// =========================
// USER: HIDE ORDER FROM ORDERS PAGE
// Keeps order in database
// =========================

app.put("/api/orders/:id/hide", authenticateToken, (req, res) => {

    const orderId = req.params.id;
    const userId = req.user.id;

    const sql = `
        UPDATE orders
        SET hidden_from_user = TRUE
        WHERE id = ?
        AND user_id = ?
        AND status IN ('Received', 'Cancelled')
    `;

    db.query(sql, [orderId, userId], (err, result) => {

        if (err) {
            console.log(err);
            return res.status(500).json({
                message: "Database error"
            });
        }

        if (result.affectedRows === 0) {
            return res.status(400).json({
                message: "Only completed or cancelled orders can be removed"
            });
        }

        res.json({
            message: "Order removed from your list"
        });
    });
});


// =========================
// ADMIN: GET ALL ORDERS WITH PAGINATION
// =========================

app.get("/api/admin/orders", authenticateToken, (req, res) => {

    if(req.user.role !== "admin"){
        return res.status(403).json({
            message: "Admin access only"
        });
    }

    const page =
        parseInt(req.query.page) || 1;

    const limit =
        parseInt(req.query.limit) || 10;

    const offset =
        (page - 1) * limit;

    const countSql = `
        SELECT COUNT(*) AS total
        FROM orders
        WHERE archived_from_queue = 0
    `;

    const ordersSql = `
        SELECT 
            orders.id,
            orders.fullname,
            orders.phone,
            orders.address,
            orders.city,
            orders.payment_method,
            orders.items,
            orders.total,
            orders.status,
            orders.created_at,
            users.email,
            orders.order_type,
            orders.preferred_date,
            orders.preferred_time,
            orders.special_notes
        FROM orders
        JOIN users ON orders.user_id = users.id
        WHERE orders.archived_from_queue = 0
        ORDER BY orders.created_at DESC
        LIMIT ? OFFSET ?
    `;

    db.query(countSql, (err, countResult) => {

        if(err){
            return res.status(500).json({
                message: "Count error"
            });
        }

        db.query(
            ordersSql,
            [limit, offset],
            (err, results) => {

                if(err){
                    console.log(err);

                    return res.status(500).json({
                        message: "Database error"
                    });
                }

                res.json({
                    orders: results,
                    total: countResult[0].total,
                    page,
                    limit,
                    totalPages: Math.ceil(
                        countResult[0].total / limit
                    )
                });

            }
        );

    });

});

// =========================
// ADMIN: UPDATE ORDER STATUS
// Updates order status and notifies customer
// =========================

app.put("/api/admin/orders/:id", authenticateToken, (req, res) => {

    const orderId = req.params.id;
    const { status } = req.body;

    // Validation
    if (!status) {
        return res.status(400).json({
            message: "Status is required"
        });
    }

    // First get the order owner
    const getOrderSql = `
        SELECT 
        user_id,
        fullname,
        phone
        FROM orders
        WHERE id = ?
    `;

    db.query(getOrderSql, [orderId], (err, results) => {

        if (err) {
            return res.status(500).json({
                message: "Database error"
            });
        }

        if (results.length === 0) {
            return res.status(404).json({
                message: "Order not found"
            });
        }

        const userId = results[0].user_id;
        const order = results[0];
        const orderCode = `EST-${String(orderId).padStart(5, "0")}`;

        // Update order status
        const updateSql = `
            UPDATE orders
            SET status = ?
            WHERE id = ?
        `;

        db.query(updateSql, [status, orderId], (err) => {

            if (err) {
                return res.status(500).json({
                    message: "Database error"
                });
            }

            // Create notification message
            let notificationMessage = "";

            if (status === "Pending") {
                notificationMessage = "Your order is now pending.";
            } else if (status === "Accepted") { 
                notificationMessage = "Your order has been accepted.";
            } else if (status === "Preparing") {
                notificationMessage = "Your meal is being prepared.";
            } else if (status === "Delivery") {
                notificationMessage = "Your order is out for delivery.";
            } else if (status === "Delivered") {
                notificationMessage = "Your order has been delivered.";

                // =========================
                // REWARD LOYALTY POINTS
                // =========================

                const getOrderSql = `
                    SELECT user_id, total
                    FROM orders
                    WHERE id = ?
                `;

                db.query(getOrderSql, [orderId], (err, results) => {

                    if (err || results.length === 0) {
                        console.log(err);
                        return;
                    }

                    const order =
                        results[0];

                    // Example:
                    // GH₵10 spent = 1 point
                    const earnedPoints =
                        Math.floor(order.total / 10);

                    const updatePointsSql = `
                        UPDATE users
                        SET loyalty_points =
                            loyalty_points + ?
                        WHERE id = ?
                    `;

                    db.query(
                        updatePointsSql,
                        [earnedPoints, order.user_id],
                        (err) => {

                            if (err) {
                                console.log(err);
                                return;
                            }

                            // Notify customer
                            createNotification(
                                order.user_id,
                                `You earned ${earnedPoints} loyalty points!`
                            );

                        }
                    );

                });


   
            } else if (status === "Received") {
                notificationMessage = "Order marked as received. Enjoy your meal!";
                // =========================
                // SMS: ORDER RECEIVED
                // =========================

                sendCustomerSMS(

                    order.phone,

                    `Hi ${order.fullname}, your ESTEESBITES order ${orderCode} has been completed successfully. Thank you for ordering with us!`

                );
            } else if (status === "Cancelled") {
                notificationMessage = "Your order has been cancelled.";

                // =========================
                // SMS: ORDER CANCELLED
                // =========================

                sendCustomerSMS(

                    order.phone,

                    `Hi ${order.fullname}, your ESTEESBITES order ${orderCode} has been cancelled. Please contact support if needed.`

                );
            }

            // Save notification
            if (notificationMessage) {
                createNotification(userId, notificationMessage);
            }

            res.json({
                message: "Order status updated"
            });
        });
    });
});

// =========================
// ADMIN: ADD MEAL
// =========================

app.post(
    "/api/admin/meals",
    authenticateToken,
    (req, res) => {
        try {
            upload.single("image")(req, res, (err) => {
                if (err) {
                    console.error("Upload middleware error:", err);
                    return res.status(400).json({
                        message: err.message || "Image upload failed",
                        debug: {
                            name: err.name,
                            code: err.code,
                            stack: err.stack
                        }
                    });
                }

            const {
                name,
                price,
                category,
                availability_status
            } = req.body;

            // Uploaded image path
            const image = req.file
                ? req.file.path || req.file.url || req.file.secure_url || req.file.filename || ""
                : "";

            // =========================
            // DEBUG CLOUDINARY UPLOAD
            // Check if image uploaded successfully
            // =========================

            console.log("BODY:", req.body);
            console.log("FILE:", req.file);
            console.log("IMAGE URL:", image);
            try {
                fs.appendFileSync(
                    path.join(__dirname, 'upload-debug.log'),
                    `\n=== UPLOAD DEBUG ===\nBODY: ${JSON.stringify(req.body)}\nFILE: ${JSON.stringify(req.file, Object.getOwnPropertyNames(req.file || {}), 2)}\nIMAGE URL: ${image}\n`
                );
            } catch (err) {
                console.error('Failed to write upload-debug.log', err);
            }

            // Validation
            if (
                !name ||
                !price ||
                !category ||
                !image
            ) {

                return res.status(400).json({
                    message: "All fields are required",
                    debug: {
                        name,
                        price,
                        category,
                        image,
                        availability_status,
                        file: req.file ? {
                            path: req.file.path,
                            url: req.file.url,
                            secure_url: req.file.secure_url,
                            originalname: req.file.originalname,
                            mimetype: req.file.mimetype,
                            size: req.file.size
                        } : null,
                        body: req.body
                    }
                });

            }

        const sql = `
            INSERT INTO meals
            (name, price, image, category, availability_status)
            VALUES (?, ?, ?, ?, ?)
        `;

        db.query(
            sql,
            [
                name,
                price,
                image,
                category,
                availability_status
            ],
            (err, result) => {
                if (err) {
                    console.log(err);
                    return res.status(500).json({
                        message: "Database error"
                    });
                }
                res.json({
                    message: "Meal added successfully"
                });
            }
        );

        });
        } catch (err) {
            console.error("Upload sync error:", err);
            return res.status(500).json({
                message: "Image upload failed",
                debug: {
                    message: err.message,
                    stack: err.stack
                }
            });
        }
    }
);

// =========================
// ADMIN: DELETE MEAL
// =========================

app.delete("/api/admin/meals/:id", authenticateToken, (req, res) => {

    const mealId = req.params.id;

    const sql = `
        DELETE FROM meals
        WHERE id = ?
    `;

    db.query(
        sql,
        [mealId],
        (err, result) => {

            if (err) {

                console.log(err);

                return res.status(500).json({
                    message: "Database error"
                });

            }

            res.json({
                message: "Meal deleted successfully"
            });

        }
    );

});


// =========================
// ADMIN: GET ALL MEALS
// =========================

app.get("/api/admin/meals", authenticateToken, (req, res) => {

    const sql = `
        SELECT * FROM meals
        ORDER BY id DESC
    `;

    db.query(sql, (err, results) => {

        if (err) {

            console.log(err);

            return res.status(500).json({
                message: "Database error"
            });

        }

        res.json(results);

    });

});

// =========================
// ADMIN: UPDATE MEAL
// =========================

app.put("/api/admin/meals/:id", authenticateToken, (req, res) => {

    const mealId = req.params.id;

    const {
        name,
        price,
        image,
        availability_status
    } = req.body;

    // Validation
    if (!name || !price || !image || !availability_status) {

        return res.status(400).json({
            message: "All fields are required"
        });

    }

    const sql = `
        UPDATE meals
        SET name = ?, price = ?, image = ?,availability_status = ?
        WHERE id = ?
    `;

    db.query(
        sql,
        [name, price, image, availability_status || "Available Today", mealId],
        (err, result) => {

            if (err) {

                console.error("Meal update error:", err);

                return res.status(500).json({
                    message: "Database error",
                    error: err.message
                });

            }

            res.json({
                message: "Meal updated successfully"
            });

        }
    );

});

// =========================
// AUTH MIDDLEWARE
// =========================

function authenticateToken(
    req,
    res,
    next
){

    const authHeader =
        req.headers["authorization"];

    const token =
        authHeader &&
        authHeader.split(" ")[1];

    if(!token){

        return res.status(401).json({
            message: "Access denied"
        });

    }

    jwt.verify(

        token,

        JWT_SECRET,

        (err, user) => {

            if(err){

                return res.status(403).json({
                    message: "Invalid token"
                });

            }

            req.user = user;

            next();

        }

    );

}

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  requireTLS: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false
  }
});

transporter.verify((error, success) => {
  if (error) {
    console.log(error);
  } else {
    console.log("SMTP READY");
  }
});


// =========================
// ADMIN: ANALYTICS
// =========================

app.get("/api/admin/analytics", authenticateToken, (req, res) => {

    if(req.user.role !== "admin"){
        return res.status(403).json({
            message: "Admin access only"
        });
    }

    const revenueSql = `
    SELECT 
        DATE_FORMAT(created_at, '%Y-%m-%d') AS order_date,
        SUM(total) AS revenue,
        COUNT(*) AS orders
    FROM orders
    GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d')
    ORDER BY order_date ASC
`;

    const statusSql = `
        SELECT status, COUNT(*) AS count
        FROM orders
        GROUP BY status
    `;

    db.query(revenueSql, (err, revenueResults) => {

        if(err){
            return res.status(500).json({
                message: "Revenue analytics error"
            });
        }

        db.query(statusSql, (err, statusResults) => {

            if(err){
                return res.status(500).json({
                    message: "Status analytics error"
                });
            }

            // Totals: customers, total revenue and total orders
            const totalsSql = `
                SELECT 
                    (SELECT COUNT(*) FROM users) AS customers,
                    (SELECT COALESCE(SUM(total), 0) FROM orders WHERE status = 'Received') AS total_revenue,
                    (SELECT COUNT(*) FROM orders) AS total_orders

            `;

            db.query(totalsSql, (err, totalsResults) => {

                if(err){
                    return res.status(500).json({
                        message: "Totals analytics error"
                    });
                }

                res.json({
                    revenue: revenueResults,
                    status: statusResults,
                    totals: totalsResults[0]
                });

            });

        });

    });

});

// =========================
// INITIALIZE PAYSTACK PAYMENT
// Creates payment link for checkout
// =========================

app.post("/api/payments/initialize", authenticateToken, async (req, res) => {

    try {

        const { email, amount, orderData } = req.body;

        // Validate request data
        if (!email || !amount) {
            return res.status(400).json({
                message: "Email and amount are required"
            });
        }

        // Convert amount to pesewas
        // Example: GHS 50 => 5000
        const amountInPesewas = amount * 100;

        const clientOrigin = req.get("origin") || `http://${req.get("host")}`;
        const callbackUrl =
            req.body.callback_url ||
            `${clientOrigin.replace(/\/$/, "")}/checkout.html`;

        const paystackPayload = {
            email,
            amount: amountInPesewas,
            currency: "GHS",
            callback_url: callbackUrl
        };

        if (orderData) {
            paystackPayload.metadata = {
                pendingOrder: JSON.stringify(orderData)
            };
        }

        // =========================
        // SEND REQUEST TO PAYSTACK
        // =========================

        const response = await axios.post(
            "https://api.paystack.co/transaction/initialize",
            paystackPayload,
            {
                headers: {
                    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                    "Content-Type": "application/json"
                }
            }
        );

        // Return Paystack payment link
        res.json({
            message: "Payment initialized successfully",
            authorization_url: response.data.data.authorization_url,
            reference: response.data.data.reference
        });

    } catch (error) {

        // Handle errors
        console.error(
            error.response?.data || error.message
        );

        res.status(500).json({
            message: "Failed to initialize payment"
        });
    }
});

// =========================
// CREATE PAYSTACK ORDER FROM CALLBACK
// Uses stored Paystack metadata when client-side pending order is unavailable
// =========================

app.post("/api/orders/paystack/:reference", async (req, res) => {
    try {
        const reference = req.params.reference;

        if (!reference) {
            return res.status(400).json({
                message: "Payment reference is required"
            });
        }

        const verifyResponse = await axios.get(
            `https://api.paystack.co/transaction/verify/${reference}`,
            {
                headers: {
                    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
                }
            }
        );

        const paymentData = verifyResponse.data.data;

        if (paymentData.status !== "success") {
            return res.status(400).json({
                message: "Payment was not successful"
            });
        }

        const metadata = paymentData.metadata || {};
        let orderData = metadata.pendingOrder;

        if (!orderData) {
            return res.status(400).json({
                message: "No Paystack order metadata found"
            });
        }

        if (typeof orderData === "string") {
            try {
                orderData = JSON.parse(orderData);
            } catch {
                return res.status(400).json({
                    message: "Invalid Paystack order metadata"
                });
            }
        }

        const {
            user_id,
            items,
            total,
            fullname,
            phone,
            address,
            city,
            payment_method,
            email
        } = orderData;

        if (
            !user_id ||
            !items ||
            !total ||
            !fullname ||
            !phone ||
            !address ||
            !city ||
            !payment_method ||
            !email
        ) {
            return res.status(400).json({
                message: "Incomplete order metadata"
            });
        }

        const parsedTotal = Number(total);
        if (parsedTotal !== paymentData.amount / 100) {
            return res.status(400).json({
                message: "Payment amount does not match order total"
            });
        }

        const duplicateSql = `SELECT COUNT(*) AS count FROM orders WHERE payment_reference = ?`;
        db.query(duplicateSql, [reference], (err, results) => {
            if (err) {
                console.error(err);
                return res.status(500).json({
                    message: "Failed to check existing order"
                });
            }

            if (results[0].count > 0) {
                return res.status(200).json({
                    message: "Order already exists for this payment reference",
                    order_exists: true
                });
            }

            const sql = `
                INSERT INTO orders
                (user_id, fullname, phone, address, city, payment_method, items, total, status, payment_status, payment_reference, transaction_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            db.query(
                sql,
                [
                    user_id,
                    fullname,
                    phone,
                    address,
                    city,
                    payment_method,
                    JSON.stringify(items),
                    parsedTotal,
                    "Pending",
                    "Paid",
                    reference,
                    paymentData.id
                ],
                (err, result) => {
                    if (err) {
                        console.error(err);
                        return res.status(500).json({
                            message: "Failed to create order"
                        });
                    }

                    createNotification(
                        user_id,
                        "Your order has been placed successfully."
                    );

                    res.status(201).json({
                        message: "Order created successfully",
                        order_id: result.insertId
                    });
                }
            );
        });
    } catch (error) {
        console.error(error.response?.data || error.message);

        res.status(500).json({
            message: "Order creation failed"
        });
    }
});

// =========================
// VERIFY PAYSTACK PAYMENT
// Confirms if payment was successful
// =========================

app.get("/api/payments/verify/:reference", authenticateToken, async (req, res) => {
    try {
        const reference = req.params.reference;

        // Send verification request to Paystack
        const response = await axios.get(
            `https://api.paystack.co/transaction/verify/${reference}`,
            {
                headers: {
                    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
                }
            }
        );

        const paymentData = response.data.data;

        // Check payment status
        if (paymentData.status === "success") {
            return res.json({
                message: "Payment verified successfully",
                status: "success",
                reference: paymentData.reference,
                amount: paymentData.amount / 100,
                transaction_id: paymentData.id
            });
        }

        // Payment not successful
        res.status(400).json({
            message: "Payment not successful",
            status: paymentData.status
        });

    } catch (error) {
        console.error(error.response?.data || error.message);

        res.status(500).json({
            message: "Payment verification failed"
        });
    }
});

// GLOBAL ERROR HANDLER

app.use((err, req, res, next) => {
    console.error("Server error:", err);

    if (err.name === "MulterError") {
        return res.status(400).json({
            message: err.message
        });
    }

    res.status(500).json({
        message: "Internal server error"
    });
});

// =========================
// ADD TO FAVORITES
// =========================

app.post(
    "/api/favorites",
    authenticateToken,
    (req, res) => {

        const userId = req.user.id;
        const { meal_id } = req.body;

        const sql = `
            INSERT INTO favorites
            (user_id, meal_id)
            VALUES (?, ?)
        `;

        db.query(sql, [userId, meal_id], (err) => {

            if (err) {

                // Ignore duplicate favorites
                if (err.code === "ER_DUP_ENTRY") {

                    return res.json({
                        message: "Already in favorites"
                    });

                }

                console.log(err);

                return res.status(500).json({
                    message: "Database error"
                });

            }

            res.json({
                message: "Added to favorites"
            });

        });

    }
);

// =========================
// GET USER FAVORITES
// =========================

app.get(
    "/api/favorites",
    authenticateToken,
    (req, res) => {

        const userId = req.user.id;

        const sql = `
            SELECT meals.*
            FROM favorites
            JOIN meals
            ON favorites.meal_id = meals.id
            WHERE favorites.user_id = ?
            ORDER BY favorites.created_at DESC
        `;

        db.query(sql, [userId], (err, results) => {

            if (err) {

                console.log(err);

                return res.status(500).json({
                    message: "Database error"
                });

            }

            res.json(results);

        });

    }
);

// =========================
// REMOVE FAVORITE
// =========================

app.delete(
    "/api/favorites/:mealId",
    authenticateToken,
    (req, res) => {

        const userId = req.user.id;
        const mealId = req.params.mealId;

        const sql = `
            DELETE FROM favorites
            WHERE user_id = ?
            AND meal_id = ?
        `;

        db.query(sql, [userId, mealId], (err) => {

            if (err) {

                console.log(err);

                return res.status(500).json({
                    message: "Database error"
                });

            }

            res.json({
                message: "Favorite removed"
            });

        });

    }
);

// =========================
// GET USER NOTIFICATIONS
// Loads logged-in user's notifications
// =========================

app.get("/api/notifications", authenticateToken, (req, res) => {

    const userId = req.user.id;

    const sql = `
        SELECT *
        FROM notifications
        WHERE user_id = ?
        ORDER BY created_at DESC
    `;

    db.query(sql, [userId], (err, results) => {

        if (err) {
            console.log(err);
            return res.status(500).json({
                message: "Database error"
            });
        }

        res.json(results);
    });
});

// =========================
// MARK NOTIFICATION AS READ
// =========================

app.put("/api/notifications/:id/read", authenticateToken, (req, res) => {

    const notificationId = req.params.id;
    const userId = req.user.id;

    const sql = `
        UPDATE notifications
        SET is_read = TRUE
        WHERE id = ?
        AND user_id = ?
    `;

    db.query(sql, [notificationId, userId], (err) => {

        if (err) {
            console.log(err);
            return res.status(500).json({
                message: "Database error"
            });
        }

        res.json({
            message: "Notification marked as read"
        });
    });
});

// =========================
// GET MEAL REVIEWS
// Loads reviews for one meal
// =========================

app.get("/api/meals/:mealId/reviews", (req, res) => {

    const mealId = req.params.mealId;

    const sql = `
        SELECT *
        FROM meal_reviews
        WHERE meal_id = ?
        ORDER BY created_at DESC
    `;

    db.query(sql, [mealId], (err, results) => {

        if (err) {
            return res.status(500).json({
                message: "Database error"
            });
        }

        res.json(results);
    });
});

// =========================
// ADD MEAL REVIEW
// Allows logged-in user to review meal
// =========================

app.post("/api/meals/:mealId/reviews", authenticateToken, (req, res) => {

    const mealId = req.params.mealId;
    const userId = req.user.id;
    const { user_name, rating, review } = req.body;

    if (!rating) {
        return res.status(400).json({
            message: "Rating is required"
        });
    }

    const sql = `
        INSERT INTO meal_reviews
        (meal_id, user_id, user_name, rating, review)
        VALUES (?, ?, ?, ?, ?)
    `;

    db.query(
        sql,
        [mealId, userId, user_name, rating, review],
        (err) => {

            if (err) {
                return res.status(500).json({
                    message: "Database error"
                });
            }

            res.json({
                message: "Review added successfully"
            });
        }
    );
});

// =========================
// HOMEPAGE FEATURED MEALS
// Trending, top-rated, and latest meals
// =========================

app.get("/api/home/featured-meals", (req, res) => {

    const sql = `
        SELECT 
            meals.*,

            COALESCE(AVG(meal_reviews.rating), 0) AS average_rating,
            COUNT(meal_reviews.id) AS review_count

        FROM meals

        LEFT JOIN meal_reviews
        ON meals.id = meal_reviews.meal_id

        GROUP BY meals.id

        ORDER BY average_rating DESC, review_count DESC, meals.id DESC

        LIMIT 6
    `;

    db.query(sql, (err, results) => {

        if (err) {
            console.log(err);

            return res.status(500).json({
                message: "Database error"
            });
        }

        res.json(results);
    });
});

// =========================
// SAVE PUSH SUBSCRIPTION
// Prevents duplicate subscriptions
// =========================

app.post("/api/push/subscribe", authenticateToken, (req, res) => {

    const userId = req.user.id;
    const subscription = req.body;

    if (!subscription || !subscription.endpoint) {
        return res.status(400).json({
            message: "Invalid subscription"
        });
    }

    // Remove old subscription for same user and same browser endpoint
    const deleteSql = `
        DELETE FROM push_subscriptions
        WHERE user_id = ?
        AND JSON_EXTRACT(subscription_json, '$.endpoint') = ?
    `;

    db.query(deleteSql, [userId, subscription.endpoint], (err) => {

        if (err) {
            console.log(err);
            return res.status(500).json({
                message: "Failed to clean old subscription"
            });
        }

        const insertSql = `
            INSERT INTO push_subscriptions
            (user_id, subscription_json)
            VALUES (?, ?)
        `;

        db.query(
            insertSql,
            [userId, JSON.stringify(subscription)],
            (err) => {

                if (err) {
                    console.log(err);
                    return res.status(500).json({
                        message: "Failed to save subscription"
                    });
                }

                res.json({
                    message: "Push subscription saved"
                });
            }
        );
    });
});

// =========================
// SEND PUSH NOTIFICATION HELPER
// Sends browser notification to user
// =========================

function sendPushNotification(userId, title, body) {

    const sql = `
        SELECT subscription_json
        FROM push_subscriptions
        WHERE user_id = ?
    `;

    db.query(sql, [userId], (err, results) => {

        if (err) {
            console.log("Push fetch error:", err);
            return;
        }

        results.forEach(row => {

            const subscription =
                JSON.parse(row.subscription_json);

            webpush.sendNotification(
                subscription,
                JSON.stringify({
                    title,
                    body
                })
            ).catch(error => {
                console.log("Push send error:", error.message);
            });

        });

    });
}

// =========================
// ADMIN: GET ALL CUSTOMERS
// Shows customer name, phone, and email
// =========================

app.get("/api/admin/customers", authenticateToken, (req, res) => {

    const sql = `
        SELECT 
            id,
            fullname,
            phone,
            email
        FROM users
        ORDER BY id DESC
    `;

    db.query(sql, (err, results) => {

        if (err) {
            console.log(err);

            return res.status(500).json({
                message: "Database error"
            });
        }

        res.json(results);
    });
});


// =========================
// ADMIN: CREATE COUPON
// =========================

app.post("/api/admin/coupons", authenticateToken, (req, res) => {

    const {
        code,
        discount_type,
        discount_value,
        expiry_date,
        usage_limit
    } = req.body;

    if (!code || !discount_type || !discount_value) {
        return res.status(400).json({
            message: "Code, discount type, and value are required"
        });
    }

    const sql = `
        INSERT INTO coupons
        (code, discount_type, discount_value, expiry_date, usage_limit)
        VALUES (?, ?, ?, ?, ?)
    `;

    db.query(
        sql,
        [
            code.toUpperCase(),
            discount_type,
            discount_value,
            expiry_date || null,
            usage_limit || 0
        ],
        (err) => {

            if (err) {
                console.log(err);

                return res.status(500).json({
                    message: "Failed to create coupon"
                });
            }

            res.json({
                message: "Coupon created successfully"
            });
        }
    );
});

// =========================
// VALIDATE COUPON
// Checks coupon before checkout
// =========================

app.post("/api/coupons/validate", authenticateToken, (req, res) => {

    const { code, total } = req.body;

    if (!code || !total) {
        return res.status(400).json({
            message: "Coupon code and total are required"
        });
    }

    const sql = `
        SELECT *
        FROM coupons
        WHERE code = ?
        AND is_active = TRUE
    `;

    db.query(sql, [code.toUpperCase()], (err, results) => {

        if (err) {
            return res.status(500).json({
                message: "Database error"
            });
        }

        if (results.length === 0) {
            return res.status(404).json({
                message: "Invalid coupon"
            });
        }

        const coupon = results[0];

        if (coupon.expiry_date && new Date(coupon.expiry_date) < new Date()) {
            return res.status(400).json({
                message: "Coupon has expired"
            });
        }

        if (coupon.usage_limit > 0 && coupon.used_count >= coupon.usage_limit) {
            return res.status(400).json({
                message: "Coupon usage limit reached"
            });
        }

        let discount = 0;

        if (coupon.discount_type === "percentage") {
            discount = Number(total) * (Number(coupon.discount_value) / 100);
        } else {
            discount = Number(coupon.discount_value);
        }

        if (discount > Number(total)) {
            discount = Number(total);
        }

        res.json({
            message: "Coupon applied successfully",
            code: coupon.code,
            discount
        });
    });
});
// =========================
// ADMIN: GET ALL COUPONS
// =========================

app.get("/api/admin/coupons", authenticateToken, (req, res) => {

    const sql = `
        SELECT *
        FROM coupons
        ORDER BY id DESC
    `;

    db.query(sql, (err, results) => {

        if (err) {
            console.log(err);
            return res.status(500).json({
                message: "Database error"
            });
        }

        res.json(results);
    });
});

// =========================
// ADMIN: DELETE COUPON
// =========================

app.delete("/api/admin/coupons/:id", authenticateToken, (req, res) => {

    const couponId = req.params.id;

    const sql = `
        DELETE FROM coupons
        WHERE id = ?
    `;

    db.query(sql, [couponId], (err) => {

        if (err) {
            console.log(err);
            return res.status(500).json({
                message: "Failed to delete coupon"
            });
        }

        res.json({
            message: "Coupon deleted successfully"
        });
    });
});

// =========================
// ARCHIVE ORDER FROM QUEUE
// =========================

app.put("/api/admin/orders/:id/archive", authenticateToken, (req, res) => {

    const orderId = req.params.id;

    const sql = `
        UPDATE orders
        SET archived_from_queue = TRUE
        WHERE id = ?
    `;

    db.query(sql, [orderId], (err) => {

        if (err) {

            console.log(err);

            return res.status(500).json({
                message: "Database error"
            });

        }

        res.json({
            message: "Order archived from queue"
        });

    });

});

// =========================
// ADMIN: CUSTOM SALES REPORT
// Uses selected start/end dates
// Only counts RECEIVED orders
// =========================

app.get("/api/admin/sales-reports/custom", authenticateToken, (req, res) => {

    const { start, end } = req.query;

    if (!start || !end) {

        return res.status(400).json({
            message: "Start date and end date are required"
        });

    }

    const sql = `
    SELECT
        id,
        fullname,
        phone,
        total,
        payment_method,
        order_type,
        preferred_date,
        preferred_time,
        created_at
    FROM orders
    WHERE LOWER(TRIM(status)) = 'received'
    AND DATE(created_at) BETWEEN ? AND ?
    ORDER BY created_at DESC
`;

    db.query(sql, [start, end], (err, results) => {

        if (err) {

            console.log(err);

            return res.status(500).json({
                message: "Sales report error"
            });

        }

        res.json(results);

    });

});

// =========================
// SEND ADMIN SMS
// Sends SMS alert when a new order is placed
// =========================

async function sendAdminSMS(message) {

    try {

        const response = await axios.post(
            "https://sms.arkesel.com/api/v2/sms/send",
            {
                sender: process.env.ARKESEL_SENDER_ID,
                message: message,
                recipients: [
                    process.env.ADMIN_PHONE
                ]
            },
            {
                headers: {
                    "Content-Type": "application/json",
                    "api-key": process.env.ARKESEL_API_KEY
                }
            }
        );

        console.log("Admin SMS sent:", response.data);

    } catch (error) {

        console.log(
            "Admin SMS error:",
            error.response?.data || error.message
        );

    }
}

// =========================
// SEND CUSTOMER SMS
// =========================

async function sendCustomerSMS(phone, message) {

    try {

        const response = await axios.post(
            "https://sms.arkesel.com/api/v2/sms/send",
            {
                sender: process.env.ARKESEL_SENDER_ID,
                message: message,
                recipients: [phone]
            },
            {
                headers: {
                    "Content-Type": "application/json",
                    "api-key": process.env.ARKESEL_API_KEY
                }
            }
        );

        console.log(
            "Customer SMS sent:",
            response.data
        );

    } catch (error) {

        console.log(
            "Customer SMS error:",
            error.response?.data || error.message
        );

    }
}

// =========================
// CREATE CATERING REQUEST
// =========================

app.post("/api/catering-requests", (req, res) => {

    const {
        fullname,
        phone,
        email,
        event_type,
        event_date,
        event_time,
        location,
        guests,
        budget,
        message
    } = req.body;

    if (
        !fullname ||
        !phone ||
        !event_type ||
        !event_date ||
        !location
    ) {
        return res.status(400).json({
            message: "Required fields are missing"
        });
    }

    const sql = `
        INSERT INTO catering_requests
        (
            fullname,
            phone,
            email,
            event_type,
            event_date,
            event_time,
            location,
            guests,
            budget,
            message
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(
        sql,
        [
            fullname,
            phone,
            email || null,
            event_type,
            event_date,
            event_time || null,
            location,
            guests || null,
            budget || null,
            message || null
        ],
        (err) => {

            if (err) {
                console.log(err);
                return res.status(500).json({
                    message: "Failed to send request"
                });
            }

            res.json({
                message: "Catering request sent successfully"
            });
            // =========================
            // SEND ADMIN SMS
            // =========================

            sendAdminSMS(
                `New ESTEESBITES catering request from ${fullname}. Event: ${event_type}. Date: ${event_date}. Phone: ${phone}.`
            );
        }
    );
});

// =========================
// ADMIN: GET CATERING REQUESTS
// =========================

app.get("/api/admin/catering-requests", authenticateToken, (req, res) => {

    const sql = `
        SELECT *
        FROM catering_requests
        ORDER BY created_at DESC
    `;

    db.query(sql, (err, results) => {

        if (err) {
            console.log(err);
            return res.status(500).json({
                message: "Database error"
            });
        }

        res.json(results);
    });
});

// =========================
// ADMIN: DELETE CATERING REQUEST
// =========================

app.delete("/api/admin/catering-requests/:id", authenticateToken, (req, res) => {

    const requestId = req.params.id;

    const sql = `
        DELETE FROM catering_requests
        WHERE id = ?
    `;

    db.query(sql, [requestId], (err) => {

        if (err) {
            console.log(err);
            return res.status(500).json({
                message: "Failed to delete request"
            });
        }

        res.json({
            message: "Catering request deleted"
        });
    });
});


// =========================
// CREATE SUPPORT MESSAGE
// =========================

app.post("/api/support-messages", (req, res) => {

    const {
        fullname,
        phone,
        email,
        subject,
        message
    } = req.body;

    if (!fullname || !phone || !subject || !message) {
        return res.status(400).json({
            message: "Required fields are missing"
        });
    }

    const sql = `
        INSERT INTO support_messages
        (fullname, phone, email, subject, message)
        VALUES (?, ?, ?, ?, ?)
    `;

    db.query(
        sql,
        [
            fullname,
            phone,
            email || null,
            subject,
            message
        ],
        (err) => {

            if (err) {
                console.log(err);
                return res.status(500).json({
                    message: "Failed to send message"
                });
            }

            sendAdminSMS(
                `New ESTEESBITES support message from ${fullname}. Subject: ${subject}. Phone: ${phone}.`
            );

            res.json({
                message: "Support message sent successfully"
            });
        }
    );
});

// =========================
// ADMIN: GET SUPPORT MESSAGES
// =========================

app.get("/api/admin/support-messages", authenticateToken, (req, res) => {

    const sql = `
        SELECT *
        FROM support_messages
        ORDER BY created_at DESC
    `;

    db.query(sql, (err, results) => {

        if (err) {
            console.log(err);
            return res.status(500).json({
                message: "Database error"
            });
        }

        res.json(results);
    });
});

// =========================
// ADMIN: MARK SUPPORT MESSAGE RESOLVED
// =========================

app.put("/api/admin/support-messages/:id/resolve", authenticateToken, (req, res) => {

    const messageId = req.params.id;

    const sql = `
        UPDATE support_messages
        SET status = 'Resolved'
        WHERE id = ?
    `;

    db.query(sql, [messageId], (err) => {

        if (err) {
            return res.status(500).json({
                message: "Failed to update message"
            });
        }

        res.json({
            message: "Support message marked as resolved"
        });
    });
});

// =========================
// ADMIN: DELETE SUPPORT MESSAGE
// =========================

app.delete("/api/admin/support-messages/:id", authenticateToken, (req, res) => {

    const messageId = req.params.id;

    const sql = `
        DELETE FROM support_messages
        WHERE id = ?
    `;

    db.query(sql, [messageId], (err) => {

        if (err) {
            return res.status(500).json({
                message: "Failed to delete message"
            });
        }

        res.json({
            message: "Support message deleted"
        });
    });
});

// START SERVER

app.listen(port, () => {

    console.log(`Server running on port ${port}`);

});

