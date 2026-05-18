require("dotenv").config();
const port = process.env.PORT || 5000;
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const nodemailer = require("nodemailer");
const JWT_SECRET = process.env.JWT_SECRET;

const db = require("./db");

const app = express();

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
    
const storage = multer.diskStorage({

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

const upload = multer({
    storage
});

const PORT = 5000;



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

    const { fullname, email, password } = req.body;

    if(!fullname || !email || !password){

        return res.status(400).json({
            message: "All fields are required"
        });

    }

    const hashedPassword =
        await bcrypt.hash(password, 10);

    const sql = `
        INSERT INTO users (fullname, email, password)
        VALUES (?, ?, ?)
    `;

    db.query(

        sql,

        [fullname, email, hashedPassword],

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

    const { email, password } = req.body;

    // Check fields
    if(!email || !password){

        return res.status(400).json({
            message: "All fields are required"
        });

    }

    // Find user
    const sql = `
        SELECT * FROM users
        WHERE email = ?
    `;

    db.query(sql, [email], async (err, results) => {

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
                message: "Invalid email or password"
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
        role: user.role
    }

});

    });

});

// =========================
// CREATE ORDER API (UPDATED)
// =========================

app.post("/api/orders", (req, res) => {

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
} = req.body;

    // Validation
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

    const sql = `
        INSERT INTO orders 
        (user_id, fullname, phone, address, city, payment_method, items, total)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
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
            total
        ],
        (err, result) => {

            if (err) {
                console.log(err);
                return res.status(500).json({
                    message: "Database error while creating order"
                });
            }

            // Send confirmation email
const mailOptions = {
    from: process.env.EMAIL_USER || "YOUR_EMAIL@gmail.com",
    to: email,
    subject: "ESTEESBITES Order Confirmation",
    html: `
        <h2>Thank you for your order!</h2>

        <p>Your order has been received successfully.</p>

        <p><strong>Order ID:</strong> #${result.insertId}</p>

        <p><strong>Total:</strong> GH₵ ${total}</p>

        <p><strong>Status:</strong> Pending</p>

        <br>

        <p>ESTEESBITES will prepare your meal soon.</p>
    `
};

transporter.sendMail(mailOptions, (emailErr) => {

    if (emailErr) {
        console.error("Email error:", emailErr);

        return res.json({
            message: "Order placed successfully, but confirmation email could not be sent.",
            orderId: result.insertId,
            emailError: emailErr.message
        });
    }

    res.json({
        message: "Order placed successfully",
        orderId: result.insertId
    });

});

        });

});

// =========================
// GET USER ORDERS
// =========================

app.get("/api/orders/:userId", (req, res) => {

    const userId = req.params.userId;

    const sql = `
        SELECT * FROM orders
        WHERE user_id = ?
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
            users.email
        FROM orders
        JOIN users ON orders.user_id = users.id
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
// =========================

app.put("/api/admin/orders/:id",authenticateToken, (req, res) => {

    const orderId = req.params.id;

    const { status } = req.body;

    // Validation
    if (!status) {

        return res.status(400).json({
            message: "Status is required"
        });

    }

    const sql = `
        UPDATE orders
        SET status = ?
        WHERE id = ?
    `;

    db.query(
        sql,
        [status, orderId],
        (err, result) => {

            if (err) {

                console.log(err);

                return res.status(500).json({
                    message: "Database error"
                });

            }

            res.json({
                message: "Order status updated"
            });

        }
    );

});

// =========================
// ADMIN: ADD MEAL
// =========================

app.post(
    "/api/admin/meals",
    authenticateToken,
    upload.single("image"),
    (req, res) => {

        const {
            name,
            price,
            category
        } = req.body;

        // Uploaded image path
        const image =
            req.file
            ? `http://localhost:5000/uploads/${req.file.filename}`
            : "";

        // Validation
        if (
            !name ||
            !price ||
            !category ||
            !image
        ) {

            return res.status(400).json({
                message: "All fields are required"
            });

        }

        const sql = `
            INSERT INTO meals
            (name, price, image, category)
            VALUES (?, ?, ?, ?)
        `;

        db.query(

            sql,

            [
                name,
                price,
                image,
                category
            ],

            (err, result) => {

                if (err) {

                    console.log(err);

                    return res.status(500).json({
                        message: "Database error"
                    });

                }

                res.json({
                    message:
                        "Meal added successfully"
                });

            }

        );

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
        image
    } = req.body;

    // Validation
    if (!name || !price || !image) {

        return res.status(400).json({
            message: "All fields are required"
        });

    }

    const sql = `
        UPDATE meals
        SET name = ?, price = ?, image = ?
        WHERE id = ?
    `;

    db.query(
        sql,
        [name, price, image, mealId],
        (err, result) => {

            if (err) {

                console.log(err);

                return res.status(500).json({
                    message: "Database error"
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
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

transporter.verify((err, success) => {
    if (err) {
        console.error("Email transporter configuration error:", err);
    } else {
        console.log("Email transporter is ready");
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
                    (SELECT IFNULL(SUM(total), 0) FROM orders) AS total_revenue,
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


// START SERVER

app.listen(port, () => {

    console.log(`Server running on port ${port}`);

});

