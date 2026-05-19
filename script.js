console.log("script connected");

// =========================
// ESTEESBITES CART SYSTEM
// =========================

// Single storage key
const STORAGE_KEY = "cart";

// =========================
// TOAST NOTIFICATION SYSTEM
// =========================

function showToast(message, type = "success"){

    const toastContainer =
        document.getElementById("toast-container");

    if(!toastContainer){
        alert(message);
        return;
    }

    const toast =
        document.createElement("div");

    toast.className =
        `toast-message toast-${type}`;

    toast.textContent = message;

    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);

}

// Show queued login-required toast (set by pages that redirect to login)
if(localStorage.getItem("showLoginToast")){

    showToast("Please login first", "error");
    localStorage.removeItem("showLoginToast");

}

// =========================
// AUTH CHECK
// =========================

function isLoggedIn(){

    const token =
        localStorage.getItem("token");

    return !!token;

}



// =========================
// ADD TO CART
// =========================

document.addEventListener("click", (e) => {

    if (e.target.classList.contains("add-to-cart")) {

        const name =
            e.target.dataset.name;

        const price =
            parseFloat(e.target.dataset.price);

        const image =
            e.target.dataset.image;

        let cart =
            JSON.parse(
                localStorage.getItem(STORAGE_KEY)
            ) || [];

        // Check existing item
        const existingItem =
            cart.find(item => item.name === name);

        if (existingItem) {

            existingItem.quantity += 1;

        } else {

            cart.push({

                id: Date.now(),

                name,
                price,
                image,

                quantity: 1

            });

        }

        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(cart)
        );

        updateCartCount();

        showToast(`${name} added to cart 🛒`, "success");

    }

});



// =========================
// RENDER CART
// =========================

const cartItems =
    document.getElementById("cart-items");

const subtotalElement =
    document.getElementById("subtotal");

const totalElement =
    document.getElementById("total");

const emptyCartMessage =
    document.getElementById("empty-cart-message");

function renderCart() {

    if (!cartItems) return;

    let cart =
        JSON.parse(
            localStorage.getItem(STORAGE_KEY)
        ) || [];

    cartItems.innerHTML = "";

    if (cart.length === 0) {

        if (emptyCartMessage) {
            emptyCartMessage.classList.remove("d-none");
        }

        subtotalElement.textContent = "GH₵ 0";
        totalElement.textContent = "GH₵ 0";

        return;
    }

    if (emptyCartMessage) {
        emptyCartMessage.classList.add("d-none");
    }

    let subtotal = 0;

    cart.forEach((item, index) => {

        const itemTotal =
            item.price * item.quantity;

        subtotal += itemTotal;

        cartItems.innerHTML += `

            <tr>

                <td>

                    <div class="d-flex align-items-center gap-3">

                        <img src="${item.image}"
                             class="cart-item-img"
                             alt="${item.name}">

                        <div>

                            <h6 class="mb-1 fw-bold">
                                ${item.name}
                            </h6>

                            <small class="text-muted">
                                Freshly prepared meal
                            </small>

                        </div>

                    </div>

                </td>

                <td class="fw-semibold">
                    GH₵ ${item.price}
                </td>

                <td>

                    <input type="number"
                           min="1"
                           value="${item.quantity}"
                           class="form-control quantity-input modern-quantity-input"
                           data-index="${index}">

                </td>

                <td class="fw-bold text-warning">
                    GH₵ ${itemTotal}
                </td>

                <td>

                    <button class="btn btn-outline-danger btn-sm remove-btn"
                            data-index="${index}">

                        Remove

                    </button>

                </td>

            </tr>

        `;

    });

    const deliveryFee = 20;

    const total =
        subtotal + deliveryFee;

    subtotalElement.textContent =
        `GH₵ ${subtotal}`;

    totalElement.textContent =
        `GH₵ ${total}`;
}

renderCart();


// =========================
// REMOVE ITEM
// =========================

document.addEventListener("click", (e) => {

    if (e.target.classList.contains("remove-btn")) {

        const index =
            e.target.dataset.index;

        let cart =
            JSON.parse(
                localStorage.getItem(STORAGE_KEY)
            ) || [];

        cart.splice(index, 1);

        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(cart)
        );

        updateCartCount();

        renderCart();

    }

});



// =========================
// UPDATE QUANTITY
// =========================

document.addEventListener("change", (e) => {

    if (e.target.classList.contains("quantity-input")) {

        const index =
            e.target.dataset.index;

        const quantity =
            parseInt(e.target.value);

        let cart =
            JSON.parse(
                localStorage.getItem(STORAGE_KEY)
            ) || [];

        if (quantity > 0) {

            cart[index].quantity = quantity;

            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(cart)
            );

            updateCartCount();

            renderCart();

        }

    }

});



// =========================
// UPDATE CART COUNT
// =========================

function updateCartCount() {

    const cartCount =
        document.getElementById("cart-count");

    if (!cartCount) return;

    let cart =
        JSON.parse(
            localStorage.getItem(STORAGE_KEY)
        ) || [];

    let totalItems = 0;

    cart.forEach(item => {

        totalItems += item.quantity;

    });

    cartCount.textContent = totalItems;

}

updateCartCount();



// =========================
// CLEAR CART
// =========================

const clearCartBtn =
    document.getElementById("clear-cart");

if (clearCartBtn) {

    clearCartBtn.addEventListener("click", () => {

        localStorage.removeItem(STORAGE_KEY);

        renderCart();

        updateCartCount();

    });

}

// =========================
// CHECKOUT FORM + BACKEND ORDER
// =========================

const checkoutForm = document.getElementById("checkout-form");

if (checkoutForm) {

    checkoutForm.addEventListener("submit", async (e) => {

        e.preventDefault();

        // Inputs
        const fullname =
            document.getElementById("fullname").value.trim();

        const phone =
            document.getElementById("phone").value.trim();

        const address =
            document.getElementById("address").value.trim();

        const city =
            document.getElementById("city").value.trim();

        const paymentMethod =
            document.getElementById("payment-method").value;

        // Messages
        const formMessage =
            document.getElementById("form-message");

        const successMessage =
            document.getElementById("success-message");

        // Clear messages
        formMessage.textContent = "";
        successMessage.classList.add("d-none");

        // =========================
        // VALIDATION
        // =========================

        if (fullname === "") {
            formMessage.textContent = "Full name is required.";
            return;
        }

        if (phone === "") {
            formMessage.textContent = "Phone number is required.";
            return;
        }

        if (address === "") {
            formMessage.textContent = "Delivery address is required.";
            return;
        }

        if (city === "") {
            formMessage.textContent = "City is required.";
            return;
        }

        if (paymentMethod === "Select Payment Method") {
            formMessage.textContent = "Please select a payment method.";
            return;
        }

        // =========================
        // GET USER + CART
        // =========================

        const loggedUser =
            JSON.parse(localStorage.getItem("loggedUser"));

        const cart =
            JSON.parse(localStorage.getItem("cart")) || [];

        if(!isLoggedIn()){

            showToast(
                "Please login first",
                "error"
            );

            setTimeout(() => {

                window.location.href =
                    "login.html";

            }, 1500);

            return;

        }

        if (cart.length === 0) {
            formMessage.textContent = "Your cart is empty.";
            return;
        }

        // =========================
        // CALCULATE TOTAL
        // =========================

        let total = 0;

        cart.forEach(item => {
            total += item.price * item.quantity;
        });

        // =========================
        // SEND ORDER TO BACKEND
        // =========================

        try {

            const response = await fetch(
                "https://esteesbites-backend.onrender.com/api/orders",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({

                        user_id: loggedUser.id,
                        email: loggedUser.email,
                        items: cart,
                        total,
                        fullname,
                        phone,
                        address,
                        city,
                        payment_method: paymentMethod

                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {

                formMessage.textContent = data.message;
                return;

            }

            // =========================
            // SUCCESS
            // =========================

            const toastType = data.emailError ? "warning" : "success";
            const toastMessage = data.emailError
                ? "Order placed, but confirmation email could not be sent."
                : "Order placed successfully 🎉";

            showToast(toastMessage, toastType);

            successMessage.textContent = data.message;
            successMessage.classList.remove("d-none");

            // Clear cart
            localStorage.removeItem("cart");

            // Reset form
            checkoutForm.reset();

            // Redirect after 2 seconds
            setTimeout(() => {
                window.location.href = "orders.html";
            }, 2000);

        }

        catch (error) {

            console.log(error);
            formMessage.textContent =
                "Something went wrong. Try again.";

        }

    });

}

// =========================
// MENU SEARCH FUNCTION
// =========================

const searchInput =
    document.getElementById("search-input");

if(searchInput){

    searchInput.addEventListener("keyup", () => {

        const searchValue =
            searchInput.value.toLowerCase();

        const menuItems =
            document.querySelectorAll(".menu-item");

        menuItems.forEach(item => {

            const foodName =
                item.textContent.toLowerCase();

            if(foodName.includes(searchValue)){

                item.style.display = "block";

            }else{

                item.style.display = "none";

            }

        });

    });

}

// =========================
// DARK MODE TOGGLE
// =========================

const darkModeToggle =
    document.getElementById("dark-mode-toggle");

// Load saved theme
if(localStorage.getItem("theme") === "dark"){

    document.body.classList.add("dark-mode");

}

// Toggle dark mode
if(darkModeToggle){

    darkModeToggle.addEventListener("click", () => {

        document.body.classList.toggle("dark-mode");

        // Save theme
        if(document.body.classList.contains("dark-mode")){

            localStorage.setItem("theme", "dark");

        }else{

            localStorage.setItem("theme", "light");

        }

    });

}

// =========================
// FETCH MEALS FROM BACKEND
// =========================

const mealsContainer =
    document.getElementById("meals-container");

if (mealsContainer) {

    mealsContainer.innerHTML = `
        <div class="col-12 loading-box">
            <div class="loading-spinner"></div>
            Loading meals...
        </div>
    `;

    fetch("https://esteesbites-backend.onrender.com/api/meals")

        .then(response => {
            if (!response.ok) {
                throw new Error("Failed to load meals");
            }
            return response.json();
        })

        .then(meals => {

            mealsContainer.innerHTML = "";

            if (!Array.isArray(meals) || meals.length === 0) {
                mealsContainer.innerHTML = `
                    <div class="col-12 alert alert-warning text-center">
                        No meals available right now.
                    </div>
                `;
                return;
            }

            meals.forEach(meal => {

                let imageUrl = meal.image;

if (imageUrl.includes("netlify.app/images/")) {
    const fileName = imageUrl.split("/").pop();
    imageUrl =
        `https://esteesbites-backend.onrender.com/uploads/${fileName}`;
}
else if (imageUrl.startsWith("http://localhost:5000")) {
    imageUrl = imageUrl.replace(
        "http://localhost:5000",
        "https://esteesbites-backend.onrender.com"
    );
}
else if (imageUrl.startsWith("http")) {
    imageUrl = meal.image;
}
else if (imageUrl.startsWith("/uploads") || imageUrl.startsWith("/images")) {
    imageUrl =
        `https://esteesbites-backend.onrender.com${imageUrl}`;
}
else if (imageUrl.startsWith("uploads/") || imageUrl.startsWith("images/")) {
    imageUrl =
        `https://esteesbites-backend.onrender.com/${imageUrl}`;
}

                mealsContainer.innerHTML += `

                    <div class="col-lg-3 col-md-6 menu-item"
                        data-category="${meal.category || 'all'}">

                        <div class="card menu-card shadow h-100">

                            <img src="${imageUrl}"
                                 class="card-img-top menu-image"
                                 alt="${meal.name}">

                            <div class="card-body d-flex flex-column text-center">

                                <h5 class="card-title">
                                    ${meal.name}
                                </h5>

                                <div class="mt-auto">

                                    <h5 class="text-warning fw-bold mb-3">
                                        GH₵ ${meal.price}
                                    </h5>

                                    <button 
                                        class="btn btn-dark w-100 add-to-cart"
                                        data-name="${meal.name}"
                                        data-price="${meal.price}"
                                        data-image="${imageUrl}">

                                        Add to Cart

                                    </button>

                                </div>

                            </div>

                        </div>

                    </div>

                `;

            });

        })

        .catch(error => {

            console.log("Fetch Error:", error);

            mealsContainer.innerHTML = `
                <div class="col-12 alert alert-danger text-center">
                    Failed to load meals.
                </div>
            `;

        });

}

// =========================
// MENU FILTERS
// =========================

document.addEventListener("click", (e) => {

    if(e.target.classList.contains("filter-btn")){

        // Active button
        document.querySelectorAll(".filter-btn")
            .forEach(btn => {

                btn.classList.remove(
                    "active-filter"
                );

            });

        e.target.classList.add(
            "active-filter"
        );

        const category =
            e.target.dataset.category;

        const menuItems =
            document.querySelectorAll(".menu-item");

        menuItems.forEach(item => {

            if(
                category === "all" ||
                item.dataset.category === category
            ){

                item.style.display = "block";

            }else{

                item.style.display = "none";

            }

        });

    }

});

// =========================
// LOGIN FRONTEND
// =========================

const loginForm =
    document.getElementById("login-form");

if(loginForm){

    loginForm.addEventListener("submit", async (e) => {

        e.preventDefault();

        // Inputs
        const email =
            document.getElementById("login-email").value;

        const password =
            document.getElementById("login-password").value;

        // Message area
        const loginMessage =
            document.getElementById("login-message");

        try{

            const response = await fetch("https://esteesbites-backend.onrender.com/api/login",


                {

                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({

                        email,
                        password

                    })

                }

            );

            const data = await response.json();

            // Error
            if(!response.ok){

                loginMessage.textContent =
                    data.message;

                return;

            }

            // Save logged user
            localStorage.setItem(

                "loggedUser",

                JSON.stringify(data.user)

            );

            localStorage.setItem(
                "token",
                data.token
            );

            // Success
            showToast("Login successful!", "success");

            // Redirect after a short delay so toast is visible
            setTimeout(() => {
                window.location.href = "index.html";
            }, 1200);

        }

        catch(error){

            console.log(error);

            loginMessage.textContent =
                "Something went wrong";

        }

    });

}

// =========================
// FRONTEND REGISTRATION
// =========================

const registerForm =
    document.getElementById("register-form");

if(registerForm){

    registerForm.addEventListener("submit", async (e) => {

        e.preventDefault();

        // Inputs
        const fullname =
            document.getElementById(
                "register-fullname"
            ).value;

        const email =
            document.getElementById(
                "register-email"
            ).value;

        const password =
            document.getElementById(
                "register-password"
            ).value;

        // Message
        const registerMessage =
            document.getElementById(
                "register-message"
            );

        try{

            const response = await fetch(

                "https://esteesbites-backend.onrender.com/api/register",

                {

                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({

                        fullname,
                        email,
                        password

                    })

                }

            );

            const data = await response.json();

            // Error
            if(!response.ok){

                registerMessage.textContent =
                    data.message;

                return;

            }

            // Success
            showToast("Registration successful!", "success");

            // Redirect to login after short delay
            setTimeout(() => {
                window.location.href = "login.html";
            }, 1200);

        }

        catch(error){

            console.log(error);

            registerMessage.textContent =
                "Something went wrong";

        }

    });

}

// =========================
// USER SESSION UI
// =========================

// Get stored user
const loggedUser =
    JSON.parse(localStorage.getItem("loggedUser"));


// Elements
const loginLink =
    document.getElementById("login-link");

const registerLink =
    document.getElementById("register-link");

const userInfo =
    document.getElementById("user-info");

const username =
    document.getElementById("username");

const logoutItem =
    document.getElementById("logout-item");

const logoutBtn =
    document.getElementById("logout-btn");


// If user logged in
if(loggedUser){

    // Hide login/register
    if(loginLink){
        loginLink.classList.add("d-none");
    }

    if(registerLink){
        registerLink.classList.add("d-none");
    }


    // Show username
    if(userInfo){

        userInfo.classList.remove("d-none");

        username.textContent =
            `Hi, ${loggedUser.fullname}`;

    }

    // Admin link
const adminLink =
    document.getElementById("admin-link");

if(
    adminLink &&
    loggedUser.role === "admin"
){

    adminLink.classList.remove("d-none");

}

    // Show logout
    if(logoutItem){

        logoutItem.classList.remove("d-none");

    }

}


// Logout
if(logoutBtn){

    logoutBtn.addEventListener("click", () => {

        // Remove user session
        localStorage.removeItem("loggedUser");
        localStorage.removeItem("token");

        // Redirect
        window.location.href = "login.html";

    });

}

// =========================
// SHOW / HIDE PASSWORD
// =========================

document.addEventListener("click", (e) => {

    if(e.target.classList.contains("toggle-password")){

        const targetId =
            e.target.dataset.target;

        const passwordInput =
            document.getElementById(targetId);

        if(passwordInput.type === "password"){

            passwordInput.type = "text";
            e.target.textContent = "🙈";

        }else{

            passwordInput.type = "password";
            e.target.textContent = "👁";

        }

    }

});

// =========================
// FETCH USER ORDERS
// =========================

const ordersContainer =
    document.getElementById("orders-container");

if (ordersContainer) {

    const loggedUser =
        JSON.parse(localStorage.getItem("loggedUser"));

    if (!loggedUser || !loggedUser.id) {

        ordersContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🔐</div>
                <h4>Please login first</h4>
                <p>You need to login to view your orders.</p>
                <a href="login.html" class="btn btn-dark">Login</a>
            </div>
        `;

    } else {

        ordersContainer.innerHTML = `
            <div class="loading-box">
                <div class="loading-spinner"></div>
                Loading your orders...
            </div>
        `;

        fetch(`https://esteesbites-backend.onrender.com/api/orders/${loggedUser.id}`)

            .then(response => response.json())

            .then(orders => {

                ordersContainer.innerHTML = "";

                if (orders.length === 0) {

                    ordersContainer.innerHTML = `
                        <div class="empty-state">
                            <div class="empty-icon">📦</div>
                            <h4>No orders yet</h4>
                            <p>Your order history will appear here.</p>
                            <a href="menu.html" class="btn btn-dark">
                                Order Now
                            </a>
                        </div>
                    `;

                    return;
                }

                orders.forEach(order => {

                    const items = JSON.parse(order.items);

                    let mealsHTML = "";

                    items.forEach(item => {

                        mealsHTML += `
                            <div class="d-flex justify-content-between mb-2">
                                <span>${item.name}</span>
                                <span class="fw-semibold">× ${item.quantity}</span>
                            </div>
                        `;

                    });

                    ordersContainer.innerHTML += `
                        <div class="card order-card shadow-sm mb-4">
                            <div class="card-body">

                                <div class="d-flex justify-content-between align-items-center mb-3">
                                    <h5 class="fw-bold mb-0">
                                        Order #${order.id}
                                    </h5>

                                    <span class="badge order-status-badge">
                                        ${order.status}
                                    </span>
                                </div>

                                <div class="order-items-list">
                                    ${mealsHTML}
                                </div>

                                <hr>

                                <div class="d-flex justify-content-between align-items-center">
                                    <span class="fw-bold">Total</span>
                                    <span class="fw-bold text-warning">
                                        GH₵ ${order.total}
                                    </span>
                                </div>

                                <small class="text-muted d-block mt-3">
                                    ${new Date(order.created_at).toLocaleString()}
                                </small>

                            </div>
                        </div>
                    `;

                });

            })

            .catch(error => {

                console.log(error);

                ordersContainer.innerHTML = `
                    <div class="alert alert-danger">
                        Failed to load orders.
                    </div>
                `;

            });

    }

}

// =========================
// CHECKOUT ORDER SUMMARY
// =========================

const checkoutSummaryItems =
    document.getElementById("checkout-summary-items");

if (checkoutSummaryItems) {

    const cart =
        JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

    const checkoutSubtotal =
        document.getElementById("checkout-subtotal");

    const checkoutTotal =
        document.getElementById("checkout-total");

    let subtotal = 0;

    checkoutSummaryItems.innerHTML = "";

    if (cart.length === 0) {

        checkoutSummaryItems.innerHTML = `
            <div class="alert alert-warning">
                Your cart is empty.
            </div>
        `;

        checkoutSubtotal.textContent = "GH₵ 0";
        checkoutTotal.textContent = "GH₵ 0";

    } else {

        cart.forEach(item => {

            const itemTotal =
                item.price * item.quantity;

            subtotal += itemTotal;

            checkoutSummaryItems.innerHTML += `

                <div class="d-flex justify-content-between mb-3">

                    <span>
                        ${item.name} × ${item.quantity}
                    </span>

                    <span>
                        GH₵ ${itemTotal}
                    </span>

                </div>

            `;

        });

        const deliveryFee = 20;

        checkoutSubtotal.textContent =
            `GH₵ ${subtotal}`;

        checkoutTotal.textContent =
            `GH₵ ${subtotal + deliveryFee}`;
    }
}

// =========================
// ADMIN: DISPLAY ALL ORDERS WITH PAGINATION
// =========================

let adminCurrentPage = 1;
const adminLimit = 10;

const adminOrdersContainer =
    document.getElementById("admin-orders-container");

const adminPagination =
    document.getElementById("admin-pagination");

function loadAdminOrders(page = 1){

    if (!adminOrdersContainer) return;

    adminOrdersContainer.innerHTML = `
        <div class="loading-box">
            <div class="loading-spinner"></div>
            Loading admin orders...
        </div>
    `;

    fetch(`https://esteesbites-backend.onrender.com/api/admin/orders?page=${page}&limit=${adminLimit}`, {
        headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`
        }
    })

        .then(response => response.json())

        .then(data => {

            const orders = data.orders;

            const totalOrders =
                document.getElementById("admin-total-orders");

            if (totalOrders) {
                totalOrders.textContent = data.total;
            }

            if (orders.length === 0) {

                adminOrdersContainer.innerHTML = `
                    <div class="alert alert-warning text-center">
                        No orders found.
                    </div>
                `;

                return;
            }

            let tableRows = "";

            orders.forEach(order => {

                tableRows += `
                    <tr>
                        <td>#${order.id}</td>
                        <td>${order.fullname}</td>
                        <td>${order.phone}</td>
                        <td>${order.email}</td>
                        <td>
                             ${JSON.parse(order.items).map(item => `
                             <div>
                             ${item.name} × ${item.quantity}
                             </div>
                               `).join("")}
                              </td>
                        <td>GH₵ ${order.total}</td>
                        <td>
                            <select class="form-select status-select"
                                    data-id="${order.id}">
                                    <option value="Received" ${order.status === "Received" ? "selected" : ""}>Received</option>
                                <option value="Pending" ${order.status === "Pending" ? "selected" : ""}>Pending</option>
                                <option value="Preparing" ${order.status === "Preparing" ? "selected" : ""}>Preparing</option>
                                <option value="On The Way" ${order.status === "On The Way" ? "selected" : ""}>On The Way</option>
                                <option value="Delivered" ${order.status === "Delivered" ? "selected" : ""}>Delivered</option>
                            </select>
                        </td>
                        <td>${new Date(order.created_at).toLocaleString()}</td>
                    </tr>
                `;

            });

            adminOrdersContainer.innerHTML = `
                <div class="table-responsive">
                    <table class="table table-bordered table-hover align-middle">
                        <thead class="table-dark">
                            <tr>
                                <th>Order ID</th>
                                <th>Customer</th>
                                <th>Phone</th>
                                <th>Email</th>
                                <th>Items</th>
                                <th>Total</th>
                                <th>Status</th>
                                <th>Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${tableRows}
                        </tbody>
                    </table>
                </div>
            `;

            renderAdminPagination(data.page, data.totalPages);

        })

        .catch(error => {
            console.log(error);

            adminOrdersContainer.innerHTML = `
                <div class="alert alert-danger">
                    Failed to load orders.
                </div>
            `;
        });
}

function renderAdminPagination(currentPage, totalPages){

    if (!adminPagination) return;

    adminPagination.innerHTML = "";

    if (totalPages <= 1) return;

    adminPagination.innerHTML += `
        <button class="btn btn-outline-dark me-2 admin-page-btn"
                data-page="${currentPage - 1}"
                ${currentPage === 1 ? "disabled" : ""}>
            Previous
        </button>
    `;

    for(let i = 1; i <= totalPages; i++){

        adminPagination.innerHTML += `
            <button class="btn ${i === currentPage ? "btn-dark" : "btn-outline-dark"} me-2 admin-page-btn"
                    data-page="${i}">
                ${i}
            </button>
        `;

    }

    adminPagination.innerHTML += `
        <button class="btn btn-outline-dark admin-page-btn"
                data-page="${currentPage + 1}"
                ${currentPage === totalPages ? "disabled" : ""}>
            Next
        </button>
    `;
}

document.addEventListener("click", (e) => {

    if(e.target.classList.contains("admin-page-btn")){

        const page = Number(e.target.dataset.page);

        if(page > 0){
            adminCurrentPage = page;
            loadAdminOrders(adminCurrentPage);
        }

    }

});

loadAdminOrders();

// =========================
// ADMIN: UPDATE ORDER STATUS
// =========================

document.addEventListener("change", async (e) => {

    if (e.target.classList.contains("status-select")) {

        const orderId =
            e.target.dataset.id;

        const status =
            e.target.value;

        try {

            const response = await fetch(`https://esteesbites-backend.onrender.com/api/admin/orders/${orderId}`,

                {

                    method: "PUT",

                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${localStorage.getItem("token")}`
                    },

                    body: JSON.stringify({
                        status
                    })

                }

            );

            const data =
                await response.json();

            if (!response.ok) {

                showToast(data.message, "error");
                return;

            }

            showToast("Order status updated!", "success");

        }

        catch (error) {

            console.log(error);

            showToast("Something went wrong", "error");

        }

    }

});

// =========================
// ADMIN: ADD MEAL
// =========================

const addMealForm =
    document.getElementById("add-meal-form");

if (addMealForm) {

    addMealForm.addEventListener(
        "submit",

        async (e) => {

            e.preventDefault();

            const name =
                document.getElementById(
                    "meal-name"
                ).value;

            const price =
                document.getElementById(
                    "meal-price"
                ).value;

            const category =
                document.getElementById(
                    "meal-category"
                ).value;

            const image =
                document.getElementById(
                    "meal-image"
                ).files[0];

            const mealMessage =
                document.getElementById(
                    "meal-message"
                );

            // FormData
            const formData =
                new FormData();

            formData.append("name", name);
            formData.append("price", price);
            formData.append("category", category);
            formData.append("image", image);

            try {

                const response = await fetch(

                    "https://esteesbites-backend.onrender.com/api/admin/meals",

                    {

                        method: "POST",

                        headers: {
                            Authorization:
                            `Bearer ${localStorage.getItem("token")}`
                        },

                        body: formData

                    }

                );

                const data =
                    await response.json();

                if (!response.ok) {

                    mealMessage.textContent =
                        data.message;

                    mealMessage.classList.add(
                        "text-danger"
                    );

                    return;

                }

                showToast(
                    "Meal added successfully!",
                    "success"
                );

                mealMessage.textContent = "";

                addMealForm.reset();

                // Reload meals
                location.reload();

            }

            catch (error) {

                console.log(error);

                showToast(
                    "Something went wrong",
                    "error"
                );

            }

        }

    );

}

// =========================
// ADMIN: DISPLAY MEALS
// =========================

const adminMealsContainer =
    document.getElementById("admin-meals-container");

if (adminMealsContainer) {

    adminMealsContainer.innerHTML = `
        <div class="loading-box">
            <div class="loading-spinner"></div>
            Loading meals...
        </div>
    `;

    fetch("https://esteesbites-backend.onrender.com/api/admin/meals", {
        headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`
        }
    })

    .then(response => {

        if (!response.ok) {
            throw new Error("Failed to load meals");
        }

        return response.json();

    })

    .then(meals => {

        if (meals.length === 0) {

            adminMealsContainer.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🍔</div>
                    <h4>No meals available</h4>
                    <p>Start by adding your first meal.</p>
                </div>
            `;

            return;

        }

        let mealsHTML = "";

        meals.forEach(meal => {

            let imageUrl = meal.image;

            if (imageUrl.includes("netlify.app/images/")) {
                const fileName = imageUrl.split("/").pop();
                imageUrl =
                    `https://esteesbites-backend.onrender.com/uploads/${fileName}`;
            }
            else if (imageUrl.startsWith("http://localhost:5000")) {
                imageUrl =
                    imageUrl.replace(
                        "http://localhost:5000",
                        "https://esteesbites-backend.onrender.com"
                    );
            }
            else if (imageUrl.startsWith("http")) {
                imageUrl = meal.image;
            }
            else if (imageUrl.startsWith("/uploads") || imageUrl.startsWith("/images")) {
                imageUrl =
                    `https://esteesbites-backend.onrender.com${imageUrl}`;
            }
            else if (imageUrl.startsWith("uploads/") || imageUrl.startsWith("images/")) {
                imageUrl =
                    `https://esteesbites-backend.onrender.com/${imageUrl}`;
            }

            mealsHTML += `
                <div class="d-flex justify-content-between align-items-center border-bottom py-3">

                    <div class="d-flex align-items-center gap-3">

                        <img src="${imageUrl}"
                             width="80"
                             height="80"
                             style="object-fit:cover;border-radius:8px;">

                        <div>
                            <h6 class="mb-1">${meal.name}</h6>
                            <small>GH₵ ${meal.price}</small>
                        </div>

                    </div>

                    <div class="d-flex gap-2">

                        <button class="btn btn-primary edit-meal-btn"
                                data-id="${meal.id}"
                                data-name="${meal.name}"
                                data-price="${meal.price}"
                                data-image="${imageUrl}">
                            Edit
                        </button>

                        <button class="btn btn-danger delete-meal-btn"
                                data-id="${meal.id}">
                            Delete
                        </button>

                    </div>

                </div>
            `;

        });

        adminMealsContainer.innerHTML = mealsHTML;

    })

    .catch(error => {

        console.log(error);

        adminMealsContainer.innerHTML = `
            <div class="alert alert-danger">
                Failed to load meals.
            </div>
        `;

    });

}

// =========================
// ADMIN: DELETE MEAL
// =========================

document.addEventListener("click", async (e) => {

    if (e.target.classList.contains("delete-meal-btn")) {

        const mealId =
            e.target.dataset.id;

        const confirmDelete =
            confirm("Delete this meal?");

        if (!confirmDelete) return;

        try {

            const response = await fetch(`https://esteesbites-backend.onrender.com/api/admin/meals/${mealId}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`
                }
            });

            const data =
                await response.json();

            if (!response.ok) {

                showToast(data.message, "error");
                return;

            }

            showToast("Meal deleted successfully!", "success");

            location.reload();

        }

        catch (error) {

            console.log(error);

            showToast("Something went wrong", "error");

        }

    }

});

// =========================
// ADMIN: OPEN EDIT MODAL
// =========================

document.addEventListener("click", (e) => {

    if (e.target.classList.contains("edit-meal-btn")) {

        const mealId =
            e.target.dataset.id;

        const mealName =
            e.target.dataset.name;

        const mealPrice =
            e.target.dataset.price;

        const mealImage =
            e.target.dataset.image;

        // Fill form
        document.getElementById(
            "edit-meal-id"
        ).value = mealId;

        document.getElementById(
            "edit-meal-name"
        ).value = mealName;

        document.getElementById(
            "edit-meal-price"
        ).value = mealPrice;

        document.getElementById(
            "edit-meal-image"
        ).value = mealImage;

        // Open modal
        const modal =
            new bootstrap.Modal(
                document.getElementById(
                    "editMealModal"
                )
            );

        modal.show();

    }

});

// =========================
// ADMIN: SAVE EDITED MEAL
// =========================

const editMealForm =
    document.getElementById("edit-meal-form");

if (editMealForm) {

    editMealForm.addEventListener(
        "submit",

        async (e) => {

            e.preventDefault();

            const id =
                document.getElementById(
                    "edit-meal-id"
                ).value;

            const name =
                document.getElementById(
                    "edit-meal-name"
                ).value;

            const price =
                document.getElementById(
                    "edit-meal-price"
                ).value;

            const image =
                document.getElementById(
                    "edit-meal-image"
                ).value;

            try {

                const response = await fetch(

                    `https://esteesbites-backend.onrender.com/api/admin/meals/${id}`,

                    {

                        method: "PUT",

                        headers: {
                            "Content-Type":
                                "application/json",

                        Authorization:
                        `Bearer ${localStorage.getItem("token")}`
                        },

                        body: JSON.stringify({

                            name,
                            price,
                            image

                        })

                    }

                );

                const data =
                    await response.json();

                if (!response.ok) {

                    showToast(data.message, "error");
                    return;

                }

                showToast("Meal updated successfully!", "success");

                location.reload();

            }

            catch (error) {

                console.log(error);

                showToast("Something went wrong", "error");

            }

        }

    );

}

// =========================
// ADMIN: ANALYTICS CHARTS
// =========================

const revenueChartCanvas =
    document.getElementById("revenueChart");

const statusChartCanvas =
    document.getElementById("statusChart");

if (revenueChartCanvas && statusChartCanvas) {

    fetch("https://esteesbites-backend.onrender.com/api/admin/analytics", {
        headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`
        }
    })

        .then(response => response.json())

        .then(data => {

            console.log("Analytics data:", data);

            // Update dashboard cards
            const totalOrdersCard =
                document.getElementById("admin-total-orders");

            const totalCustomersCard =
                document.getElementById("admin-total-customers");

            const totalRevenueCard =
                document.getElementById("admin-total-revenue");

            if (totalOrdersCard) {
                totalOrdersCard.textContent =
                    data.totals.total_orders;
            }

            if (totalCustomersCard) {
                totalCustomersCard.textContent =
                    data.totals.customers;
            }

            if (totalRevenueCard) {
                totalRevenueCard.textContent =
                    `GH₵ ${Number(data.totals.total_revenue)}`;
            }

            // Revenue chart
            const revenueLabels =
                data.revenue.map(item => item.order_date);

            const revenueValues =
                data.revenue.map(item => Number(item.revenue));

            new Chart(revenueChartCanvas, {
                type: "line",
                data: {
                    labels: revenueLabels,
                    datasets: [{
                        label: "Revenue",
                        data: revenueValues,
                        borderWidth: 3,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            display: true
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });

            // Status chart
            const statusLabels =
                data.status.map(item => item.status);

            const statusValues =
                data.status.map(item => Number(item.count));

            new Chart(statusChartCanvas, {
                type: "doughnut",
                data: {
                    labels: statusLabels,
                    datasets: [{
                        label: "Orders",
                        data: statusValues
                    }]
                },
                options: {
                    responsive: true
                }
            });

        })

        .catch(error => {
            console.log(error);
            showToast("Failed to load analytics", "error");
        });

}