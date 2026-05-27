console.log("script connected");

// =========================
// BACKEND API URL
// Change this when deploying
// =========================

const API_URL = "https://esteesbites-backend.onrender.com";



function getMealImage(imagePath) {

    if (!imagePath) {
        return "images/default-food.jpg";
    }

    if (imagePath.includes("localhost:5000")) {
        return imagePath.replace(
            "http://localhost:5000",
            API_URL
        );
    }

    if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
        return imagePath;
    }

    if (imagePath.startsWith("/uploads") || imagePath.startsWith("/images")) {
        return `${API_URL}${imagePath}`;
    }

    if (imagePath.startsWith("uploads/") || imagePath.startsWith("images/")) {
        return `${API_URL}/${imagePath}`;
    }

    return imagePath;
}

// =========================
// ESTEESBITES CART SYSTEM
// =========================

// Single storage key
const STORAGE_KEY = "cart";

// =========================
// SHOW TOAST NOTIFICATION
// =========================

function showToast(message, type = "success") {

    const toastContainer = document.getElementById("toast-container");

    if (!toastContainer) return;

    const toast = document.createElement("div");

    toast.className = `toast-message toast-${type}`;
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
// LOAD PROFILE PAGE
// =========================

const profileForm = document.getElementById("profile-form");

if (profileForm) {

    const token = localStorage.getItem("token");

    if (!token) {
        showToast("Please login first", "error");

        setTimeout(() => {
            window.location.href = "login.html";
        }, 1500);
    }

    

// =========================
// SHOW PROFILE FORM
// =========================

    const editProfileBtn =
    document.getElementById("edit-profile-btn");

    if (editProfileBtn) {

    editProfileBtn.addEventListener("click", () => {

        const profileForm =
            document.getElementById("profile-form");

        if (
            profileForm.style.display === "none"
        ) {

            profileForm.style.display = "block";

            editProfileBtn.textContent =
                "Close";

        }

        else {

            profileForm.style.display = "none";

            editProfileBtn.textContent =
                "Edit Profile";

        }

    });

}

    // =========================
    // FETCH PROFILE DETAILS
    // =========================

    async function loadProfile() {
        try {
            const response = await fetch(`${API_URL}/api/profile`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            const user = await response.json();

            if (!response.ok) {
                showToast(user.message || "Failed to load profile", "error");
                return;
            }

            document.getElementById("profile-name").textContent = user.fullname;
            document.getElementById("profile-email").textContent = user.email;
            document.getElementById("profile-display-phone").textContent = user.phone || "Not added";
            document.getElementById("profile-display-address").textContent = user.address || "Not added";
            document.getElementById("profile-loyalty-points").textContent = user.loyalty_points || 0;
            document.getElementById("profile-phone").value = user.phone || "";
            document.getElementById("profile-address").value = user.address || "";
            
            // Total orders
            document.getElementById(
                "profile-total-orders"
            ).textContent =
                user.total_orders || 0;

            // Total spent
            document.getElementById(
                "profile-total-spent"
            ).textContent =
                `GH₵${user.total_spent}`;

            // Member since
            document.getElementById(
                "profile-member-since"
            ).textContent =
                new Date(
                    user.created_at
                ).toLocaleDateString();

            // Last order
            document.getElementById(
                "profile-last-order"
            ).textContent =
                user.last_order_date
                ? new Date(
                    user.last_order_date
                ).toLocaleDateString()
                : "No orders yet";

                // =========================
                // LOAD RECENT ORDERS
                // =========================

                const recentOrdersResponse =
                    await fetch(
                        `${API_URL}/api/profile/recent-orders`,
                        {
                            headers: {
                                Authorization: `Bearer ${token}`
                            }
                        }
                    );

                const recentOrders =
                    await recentOrdersResponse.json();

                const recentOrdersList =
                    document.getElementById(
                        "recent-orders-list"
                    );

                if (recentOrders.length > 0) {

                    recentOrdersList.innerHTML = "";

                    recentOrders.forEach(order => {

                    // =========================
                    // FORMAT ORDER ID
                    // =========================

                    const orderCode =
                        `EST-${String(order.id).padStart(5, "0")}`;

                    // =========================
                    // PARSE ORDER ITEMS SAFELY
                    // =========================

                    let items = [];

                    try {
                        if (typeof order.items === "string") {
                            items = JSON.parse(order.items);
                        } else if (Array.isArray(order.items)) {
                            items = order.items;
                        }
                    } catch (error) {
                        items = [];
                    }

                    const itemsText = items.map(item => {
                        return `${item.name} × ${item.quantity}`;
                    }).join(", ");

                    recentOrdersList.innerHTML += `
                        <div class="recent-order-card">

                            <div>
                                <strong>${orderCode}</strong>

                                <p class="mb-1 text-muted">
                                    ${itemsText || "No items found"}
                                </p>

                                <p class="mb-0 fw-bold text-warning">
                                    GH₵ ${order.total}
                                </p>
                            </div>

                            <span class="badge bg-warning">
                                ${order.status}
                            </span>

                        </div>
                    `;

                });

                }

        } catch (error) {
            console.log(error);
            showToast("Failed to load profile", "error");
        }

        // =========================
        // LOAD FAVORITE MEALS
        // =========================

        async function loadFavoriteMeals() {

            const favoriteMealsList =
                document.getElementById("favorite-meals-list");

            if (!favoriteMealsList) return;

            try {

                const response = await fetch(
                    `${API_URL}/api/favorites`,
                    {
                        headers: {
                            Authorization:
                            `Bearer ${token}`
                        }
                    }
                );

                const favorites =
                    await response.json();

                if (favorites.length === 0) {
                    favoriteMealsList.innerHTML = `
                        <p class="text-muted">
                            No favorite meals yet.
                        </p>
                    `;
                    return;
                }

                favoriteMealsList.innerHTML = "";

                favorites.forEach(meal => {

                    const mealImage = getMealImage(meal.image || meal.image_url);

                    favoriteMealsList.innerHTML += `
                        <div class="favorite-meal-card">

                            <img src="${mealImage}" alt="${meal.name}">

                            <div>
                                <strong>${meal.name}</strong>
                                <p class="mb-0 text-warning">
                                    GH₵ ${meal.price}
                                </p>
                            </div>

                            <button
                                class="btn btn-sm btn-outline-danger"
                                onclick="removeFavorite(${meal.id})">
                                Remove
                            </button>

                        </div>
                    `;

                });

            } catch (error) {
                console.log(error);
                showToast("Failed to load favorites", "error");
            }
        }

        loadFavoriteMeals();

        // =========================
        // REMOVE FAVORITE MEAL
        // Makes function available to onclick
        // =========================

        window.removeFavorite = async function (mealId) {

            const token = localStorage.getItem("token");

            try {
                const response = await fetch(`${API_URL}/api/favorites/${mealId}`, {
                    method: "DELETE",
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });

                const data = await response.json();

                showToast(data.message, "success");

                loadFavoriteMeals();

            } catch (error) {
                console.log(error);
                showToast("Failed to remove favorite", "error");
            }
        };

        // =========================
        // LOAD NOTIFICATIONS
        // =========================

        async function loadNotifications() {

            const notificationsList =
                document.getElementById("notifications-list");

            const notificationCount =
                document.getElementById("notification-count");

            if (!notificationsList) return;

            try {

                const response = await fetch(
                    `${API_URL}/api/notifications`,
                    {
                        headers: {
                            Authorization:
                            `Bearer ${token}`
                        }
                    }
                );

                const notifications =
                    await response.json();

                   
                // Unread count
                const unread =
                    notifications.filter(
                        notification => !notification.is_read
                    ).length;

                notificationCount.textContent =
                    unread;

                if (notifications.length === 0) {

                    notificationsList.innerHTML = `
                        <p class="text-muted">
                            No notifications yet.
                        </p>
                    `;

                    return;
                }

                    notificationsList.innerHTML = "";

                    notifications.forEach(notification => {

                        const notificationClass =
                            notification.is_read
                                ? "notification-read"
                                : "unread";

                        notificationsList.innerHTML += `
                            <div class="notification-card ${notificationClass}"
                                data-id="${notification.id}">

                                <div class="d-flex justify-content-between gap-3">

                                    <div>

                                        <p class="mb-1">
                                            ${notification.message}
                                        </p>

                                        <small class="text-muted">
                                            ${new Date(
                                                notification.created_at
                                            ).toLocaleString()}
                                        </small>

                                    </div>

                                    ${!notification.is_read ? `

                                        <button
                                            class="btn btn-sm btn-dark mark-read-btn"
                                            data-id="${notification.id}">

                                            Mark Read

                                        </button>

                                    ` : ""}

                                </div>

                            </div>
                        `;

                    });

            }

            catch (error) {

                console.log(error);

            }

        }

        loadNotifications();



        
        // =========================
        // MARK NOTIFICATION AS READ
        // =========================

        window.markNotificationAsRead =
        async function markNotificationAsRead(notificationId) {

     try {

        const response = await fetch(`${API_URL}/api/notifications/${notificationId}`, {
            method: "DELETE",
            headers: {
                Authorization:
                `Bearer ${localStorage.getItem("token")}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            showToast(data.message || "Failed to remove notification", "error");
            return;
        }

        showToast("Notification removed", "success");

        loadProfileNotifications();

     } catch (error) {
        console.log(error);
        showToast("Something went wrong", "error");
     }
     };
   }

     loadProfile();

        // =========================
        // AUTO READ NOTIFICATIONS
        // =========================

        document.addEventListener("click", async (e) => {

    if (!e.target.classList.contains("mark-read-btn")) return;

    const notificationId = e.target.dataset.id;

    const card = e.target.closest(".notification-card");

    try {
        await fetch(`${API_URL}/api/notifications/${notificationId}/read`, {
            method: "PUT",
            headers: {
                Authorization:
                `Bearer ${localStorage.getItem("token")}`
            }
        });

        card.style.opacity = "0";

        setTimeout(() => {
            card.remove();
        }, 400);

    } catch (error) {
        console.log(error);
    }
});

    // =========================
    // UPDATE PROFILE DETAILS
    // =========================

    profileForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const phone = document.getElementById("profile-phone").value.trim();
        const address = document.getElementById("profile-address").value.trim();

        try {
            const response = await fetch(`${API_URL}/api/profile`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ phone, address })
            });

            const data = await response.json();

            if (!response.ok) {
                showToast(data.message || "Failed to update profile", "error");
                return;
            }

            showToast("Profile updated successfully", "success");

        } catch (error) {
            console.log(error);
            showToast("Something went wrong", "error");
        }
    });
}



// =========================
// ADD TO CART
// =========================

document.addEventListener("click", (e) => {
    const addCartBtn = e.target.closest(".add-cart-btn");

    if (!addCartBtn) return;

    if (addCartBtn.classList.contains("add-cart-btn")) {

        const name =
            addCartBtn.dataset.name;

        const price =
            parseFloat(addCartBtn.dataset.price);

        const image =
            addCartBtn.dataset.image;

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
        updateFloatingCartCount();
        renderCart();

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

                <div class="cart-item-card reveal-zoom">

                    <img src="${item.image}"
                        class="cart-item-img"
                        alt="${item.name}">

                    <div class="cart-item-details">

                        <h5 class="cart-item-title">
                            ${item.name}
                        </h5>

                        <p class="cart-item-price mb-2">
                            GH₵ ${item.price}
                        </p>

                        <small class="text-muted">
                            Freshly prepared meal
                        </small>

                        <div class="d-flex justify-content-between align-items-center mt-3">

                            <div class="cart-qty-controls">

                                <button class="cart-qty-btn decrease-btn"
                                        data-index="${index}">
                                    -
                                </button>

                                <span class="fw-bold">
                                    ${item.quantity}
                                </span>

                                <button class="cart-qty-btn increase-btn"
                                        data-index="${index}">
                                    +
                                </button>

                            </div>

                            <strong class="text-warning">
                                GH₵ ${itemTotal}
                            </strong>

                        </div>

                        <button class="btn btn-outline-danger btn-sm remove-btn mt-3"
                                data-index="${index}">
                            Remove
                        </button>

                    </div>

                </div>

            `;

    });

    const deliveryFee = 0;

    const total =
        subtotal + deliveryFee;

    subtotalElement.textContent =
        `GH₵ ${subtotal}`;

    totalElement.textContent =
        `GH₵ ${total}`;
}

renderCart();
revealOnScroll();



// =========================
// CART QUANTITY BUTTONS
// =========================

document.addEventListener("click", (e) => {

    let cart =
        JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

    if (e.target.classList.contains("increase-btn")) {

        const index = e.target.dataset.index;

        cart[index].quantity++;

        localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));

        renderCart();
        updateCartCount();
        updateFloatingCartCount();
    }

    if (e.target.classList.contains("decrease-btn")) {

        const index = e.target.dataset.index;

        if (cart[index].quantity > 1) {
            cart[index].quantity--;
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));

        renderCart();
        updateCartCount();
        updateFloatingCartCount();
    }

});


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
        updateFloatingCartCount();

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
            updateFloatingCartCount();

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

        totalItems += Number(item.quantity) || 0;

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
        updateFloatingCartCount();

    });

}

// =========================
// COUPON STATE
// =========================
let redeemedPoints = 0;
let pointsDiscount = 0;

let appliedCouponCode = null;
let couponDiscount = 0;

// =========================
// CHECKOUT FORM + PAYSTACK + CASH ON DELIVERY
// =========================

const checkoutForm = document.getElementById("checkout-form");

// =========================
// LOAD CHECKOUT USER POINTS
// Gets fresh loyalty points from backend
// =========================

async function loadCheckoutUserPoints() {

    const pointsBox =
        document.getElementById("checkout-loyalty-points");

    const token =
        localStorage.getItem("token");

    if (!pointsBox || !token) return;

    try {
        const response = await fetch(`${API_URL}/api/profile`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const user = await response.json();

        if (!response.ok) return;

        pointsBox.textContent =
            user.loyalty_points || 0;

        const loggedUser =
            JSON.parse(localStorage.getItem("loggedUser")) || {};

        loggedUser.loyalty_points =
            user.loyalty_points || 0;

        localStorage.setItem(
            "loggedUser",
            JSON.stringify(loggedUser)
        );

    } catch (error) {
        console.log(error);
    }
}

loadCheckoutUserPoints();

//REDEEM POINTS FUNCTION
const redeemPointsBtn =
    document.getElementById("redeem-points-btn");

if (redeemPointsBtn) {

    redeemPointsBtn.addEventListener("click", () => {

        const loggedUser =
            JSON.parse(localStorage.getItem("loggedUser"));

        const pointsMessage =
            document.getElementById("points-message");

        const userPoints =
            Number(loggedUser.loyalty_points || 0);

        if (userPoints < 10) {
            pointsMessage.textContent =
                "You need at least 10 points to redeem.";
            pointsMessage.className =
                "d-block mt-2 text-danger";
            return;
        }

        redeemedPoints = userPoints;
        pointsDiscount =
            Math.floor(userPoints / 10);

        pointsMessage.textContent =
            `Points redeemed! You saved GH₵ ${pointsDiscount}`;
        pointsMessage.className =
            "d-block mt-2 text-success";

        updateCheckoutSummaryWithDiscount();

    });

}



// =========================
// SAVE ORDER FUNCTION
// Sends final order to backend
// =========================

async function saveOrder(orderData) {

    const token = localStorage.getItem("token");

    try {
        const response = await fetch(`${API_URL}/api/orders`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(orderData)
        });

        const data = await response.json();

        if (!response.ok) {
            showToast(data.message || "Order failed. Try again.", "error");
            return;
        }

        completeOrderFlow();

    } catch (error) {
        console.log(error);
        hideCheckoutOverlay();
        showToast("Something went wrong. Try again.", "error");
    }
}

function completeOrderFlow() {
    if (typeof activateCompleteStep === "function") {
        activateCompleteStep();
    }

    showCheckoutSuccessOverlay();

    localStorage.removeItem("cart");
    localStorage.removeItem("pendingOrder");
    sessionStorage.removeItem("pendingOrder");
    clearPendingOrderWindowName();
    clearPendingOrderCookie();

    setTimeout(() => {
        window.location.href = "orders.html";
    }, 2000);
}

function safeParse(value) {
    try {
        return value ? JSON.parse(value) : null;
    } catch {
        return null;
    }
}

function getReturnParam(name) {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.has(name)) {
        return searchParams.get(name);
    }

    const hash = window.location.hash.replace(/^#/, "");
    const hashParams = new URLSearchParams(hash);
    return hashParams.get(name);
}

async function createOrderFromPaystackReference(reference) {
    showCheckoutOverlay(
        "Finalizing your Paystack order...",
        "Completing the order from Paystack transaction metadata."
    );

    try {
        const response = await fetch(`${API_URL}/api/orders/paystack/${encodeURIComponent(reference)}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            }
        });

        const data = await response.json();

        if (!response.ok) {
            console.warn("Paystack server order fallback failed", data);
            hideCheckoutOverlay();
            return false;
        }

        completeOrderFlow();
        return true;
    } catch (error) {
        console.error(error);
        hideCheckoutOverlay();
        return false;
    }
}

async function handlePaystackReturn() {
    const reference = getReturnParam("reference") || getReturnParam("trxref");

    if (!reference) return;

    console.log("Paystack return reference detected:", reference);

    let pendingOrder = null;
    let source = null;

    pendingOrder = safeParse(localStorage.getItem("pendingOrder"));
    if (pendingOrder) source = "localStorage";

    if (!pendingOrder) {
        pendingOrder = safeParse(sessionStorage.getItem("pendingOrder"));
        if (pendingOrder) source = "sessionStorage";
    }

    if (!pendingOrder) {
        pendingOrder = getPendingOrderFromWindowName();
        if (pendingOrder) source = "window.name";
    }

    if (!pendingOrder) {
        pendingOrder = getPendingOrderFromCookie();
        if (pendingOrder) source = "cookie";
    }

    if (!pendingOrder) {
        const serverCreated = await createOrderFromPaystackReference(reference);
        if (serverCreated) {
            window.history.replaceState({}, document.title, window.location.pathname);
            return;
        }
    }

    if (!pendingOrder) {
        pendingOrder = rebuildPendingOrderFromCheckoutForm();
        if (pendingOrder) source = "rebuild";
    }

    console.log("Paystack pending order source:", source, pendingOrder);

    if (!pendingOrder) {
        showToast("No pending Paystack order found. Please try again.", "error");
        return;
    }

    pendingOrder.payment_reference = reference;
    pendingOrder.payment_method = "Paystack";

    showCheckoutOverlay(
        "Verifying your payment...",
        "Please wait while we confirm your Paystack payment."
    );

    window.history.replaceState({}, document.title, window.location.pathname);

    saveOrder(pendingOrder);
}

function getPendingOrderFromWindowName() {
    try {
        const data = JSON.parse(window.name);
        return data && data.__pendingOrder ? data.__pendingOrder : null;
    } catch {
        return null;
    }
}

function setPendingOrderToWindowName(orderData) {
    try {
        const current = JSON.parse(window.name) || {};
        current.__pendingOrder = orderData;
        window.name = JSON.stringify(current);
    } catch {
        window.name = JSON.stringify({ __pendingOrder: orderData });
    }
}

function clearPendingOrderWindowName() {
    try {
        const data = JSON.parse(window.name);
        if (data && data.__pendingOrder) {
            delete data.__pendingOrder;
            window.name = JSON.stringify(data);
        }
    } catch {
        window.name = "";
    }
}

function setPendingOrderCookie(orderData) {
    try {
        const encoded = encodeURIComponent(JSON.stringify(orderData));
        document.cookie = `pendingOrder=${encoded}; path=/; max-age=900`;
    } catch {
        // ignore
    }
}

function getPendingOrderFromCookie() {
    const match = document.cookie.match(/(?:^|; )pendingOrder=([^;]+)/);
    if (!match) return null;

    try {
        return JSON.parse(decodeURIComponent(match[1]));
    } catch {
        return null;
    }
}

function clearPendingOrderCookie() {
    document.cookie = "pendingOrder=; path=/; max-age=0";
}

function rebuildPendingOrderFromCheckoutForm() {
    const loggedUser = JSON.parse(localStorage.getItem("loggedUser"));
    const cart = JSON.parse(localStorage.getItem("cart")) || [];

    if (!loggedUser || cart.length === 0) {
        return null;
    }

    const fullname = document.getElementById("fullname")?.value.trim();
    const phone = document.getElementById("phone")?.value.trim();
    const address = document.getElementById("address")?.value.trim();
    const city = document.getElementById("city")?.value.trim();

    if (!fullname || !phone || !address || !city) {
        return null;
    }

    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    return {
        user_id: loggedUser.id,
        email: loggedUser.email,
        items: cart,
        total,
        fullname,
        phone,
        address,
        city,
        payment_method: "Paystack"
    };
}

handlePaystackReturn();




// =========================
// CHECKOUT FORM SUBMIT
// Handles Paystack and Cash on Delivery
// =========================

if (checkoutForm) {

    checkoutForm.addEventListener("submit", async (e) => {

        e.preventDefault();

        const fullname = document.getElementById("fullname").value.trim();
        const phone = document.getElementById("phone").value.trim();
        const address = document.getElementById("address").value.trim();
        const city = document.getElementById("city").value.trim();
        const paymentMethod = document.getElementById("payment-method").value;

        const formMessage = document.getElementById("form-message");
        const successMessage = document.getElementById("success-message");

        // =========================
        // PREORDER DETAILS INPUTS
        // =========================

        const orderType =
            document.getElementById("order-type").value;

        const preferredDate =
            document.getElementById("preferred-date").value;

        const preferredTime =
            document.getElementById("preferred-time").value;

        const specialNotes =
            document.getElementById("special-notes").value.trim();

        formMessage.textContent = "";
        successMessage.classList.add("d-none");

        // =========================
        // VALIDATION
        // =========================

        if (fullname === "") {
            showToast("Full name is required.", "error");
            return;
        }

        if (phone === "") {
            showToast("Phone number is required.", "error");
            return;
        }

        if (address === "") {
            showToast("Delivery address is required.", "error");
            return;
        }

        if (city === "") {
            showToast("City is required.", "error");
            return;
        }

        if (paymentMethod === "Select Payment Method") {
            showToast("Please select a payment method.", "error");
            return;
        }

        // =========================
        // CHECK LOGIN
        // =========================

        if (!isLoggedIn()) {
            showToast("Please login first", "error");

            setTimeout(() => {
                window.location.href = "login.html";
            }, 1500);

            return;
        }

        // =========================
        // GET USER + CART
        // =========================

        const loggedUser = JSON.parse(localStorage.getItem("loggedUser"));
        const cart = JSON.parse(localStorage.getItem("cart")) || [];
        const token = localStorage.getItem("token");

        if (cart.length === 0) {
            showToast("Your cart is empty.", "error");
            return;
        }

        // =========================
        // CALCULATE TOTAL
        // =========================

        let total = 0;

        cart.forEach(item => {
            total += (item.price * item.quantity);
        });

        //Discount Total
        total = total - couponDiscount - pointsDiscount;
        if (total < 0){ 
            total = 0;
        }

        // =========================
        // PREPARE ORDER DATA
        // =========================

        const orderData = {
            user_id: loggedUser.id,
            email: loggedUser.email,
            items: cart,
            total,
            fullname,
            phone,
            address,
            city,
            payment_method: paymentMethod,
            order_type: orderType,
            preferred_date: preferredDate,
            preferred_time: preferredTime,
            special_notes: specialNotes,
            coupon_code: appliedCouponCode,
            discount_amount: couponDiscount,
            redeemed_points: redeemedPoints,
            points_discount: pointsDiscount
        };

        // =========================
        // CASH ON DELIVERY
        // Save order directly
        // =========================
        

        if (paymentMethod === "Cash on Delivery") {
            showCheckoutOverlay(
                "Placing your order...",
                "Please wait while we save your order."
            );
            await saveOrder(orderData);
            return;
        }

        // =========================
        // MOBILE MONEY / DEBIT CARD
        // Initialize payment first
        // =========================

        if (paymentMethod === "Paystack" || paymentMethod === "Debit Card") {
            showCheckoutOverlay(
                    "Opening secure payment...",
                    "You will be redirected to Paystack shortly."
                );

            try {
                const response = await fetch(`${API_URL}/api/payments/initialize`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        email: loggedUser.email,
                        amount: total,
                        callback_url: `${window.location.origin}/checkout.html`,
                        orderData
                    })
                });

                const data = await response.json();

                if (!response.ok) {
                    showToast(data.message || "Payment initialization failed", "error");
                    return;
                }

                // Save order temporarily before going to Paystack
                localStorage.setItem("pendingOrder", JSON.stringify(orderData));
                sessionStorage.setItem("pendingOrder", JSON.stringify(orderData));
                setPendingOrderToWindowName(orderData);
                setPendingOrderCookie(orderData);

                // Redirect to Paystack checkout
                window.location.href = data.authorization_url;

            } catch (error) {
                console.log(error);
                showToast("Payment initialization failed", "error");
            }
        }
    });
}



// =========================
// CANCEL ORDER FUNCTION
// Allows user to cancel pending orders
// =========================

async function cancelOrder(orderId) {

    // Check login
    const token = localStorage.getItem("token");
    if (!token) {
        showToast("Please login first", "error");
        return;
    }

    // Confirmation alert
    const confirmCancel = confirm(
        "Are you sure you want to cancel this order?"
    );

    // Stop if user clicks cancel
    if (!confirmCancel) return;

    try {

        // Send cancel request to backend
        const response = await fetch(
            `${API_URL}/api/orders/${orderId}/cancel`,
            {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        // Convert response to JSON
        const data = await response.json();

        // =========================
        // SHOW TOAST MESSAGE
        // =========================

        if (response.ok) {

            showToast(data.message, "success");

            // Reload orders
            location.reload();

        } else {

            showToast(data.message, "error");
        }

    } catch (error) {

        // Handle request errors
        console.error(error);

        showToast("Failed to cancel order", "error");
    }
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
// MEALS FROM BACKEND
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

    fetch(`${API_URL}/api/meals`)

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
                            `${API_URL}/uploads/${fileName}`;
                    }
                    else if (imageUrl.startsWith("http://localhost:5000")) {
                        imageUrl = imageUrl.replace(
                            "http://localhost:5000",
                            `${API_URL}`
                        );
                    }
                    else if (imageUrl.startsWith("http")) {
                        imageUrl = meal.image;
                    }
                    else if (imageUrl.startsWith("/uploads") || imageUrl.startsWith("/images")) {
                        imageUrl =
                            `${API_URL}${imageUrl}`;
                    }
                    else if (imageUrl.startsWith("uploads/") || imageUrl.startsWith("images/")) {
                        imageUrl =
                            `${API_URL}/${imageUrl}`;
                    }

                // Determine availability from common DB fields
                const isAvailable = (function() {
                    if (typeof meal.available !== 'undefined') return Boolean(Number(meal.available));
                    if (typeof meal.is_available !== 'undefined') return Boolean(Number(meal.is_available));
                    if (typeof meal.in_stock !== 'undefined') return Number(meal.in_stock) > 0;
                    if (typeof meal.stock !== 'undefined') return Number(meal.stock) > 0;
                    if (typeof meal.status !== 'undefined') {
                        const s = String(meal.status).toLowerCase();
                        return s === 'available' || s === 'in stock' || s === 'in_stock';
                    }
                    return true; // assume available when no field provided
                })();

                const availabilityBadge = isAvailable
                    ? `<span class="badge bg-success meal-availability">Available</span>`
                    : `<span class="badge bg-danger meal-availability">Out of Stock</span>`;

                const addButtonHtml = isAvailable
                    ? `\n                    <button\n                        class="btn btn-dark w-100 add-cart-btn add-to-cart"\n                        data-name="${meal.name}"\n                        data-price="${meal.price}"\n                        data-image="${imageUrl}">\n\n                        Add to Cart\n\n                    </button>\n\n                `
                    : `\n                    <button class="btn btn-secondary w-100" disabled>Out of Stock</button>\n\n                `;


                    // =========================
                    // SMART MEAL STATUS BEHAVIOR
                    // =========================

                    const mealStatus =
                        meal.availability_status || "Available Today";

                    let buttonText = "Add to Cart";
                    let buttonClass = "btn btn-dark w-100 add-cart-btn add-to-cart";
                    let buttonDisabled = "";
                    let extraCardClass = "";

                    if (mealStatus === "Preorder") {
                        buttonText = "Preorder Now";
                    }

                    else if (mealStatus === "Limited") {
                        buttonText = "Order Limited Meal";
                        extraCardClass = "limited-pulse";
                    }

                    else if (mealStatus === "Sold Out") {
                        buttonText = "Sold Out";
                        buttonClass = "btn btn-secondary w-100";
                        buttonDisabled = "disabled";
                    }

                    else if (mealStatus === "Event Only") {
                        buttonText = "Contact for Booking";
                        buttonClass = "btn btn-outline-primary w-100";
                    }


                mealsContainer.innerHTML += `

    <div class="col-lg-3 col-md-6 mb-4 menu-item reveal-zoom"
        data-category="${meal.category || 'all'}">

        <div class="card meal-card hover-lift h-100 ${extraCardClass} quick-view-trigger"
            data-id="${meal.id}"
            data-name="${meal.name}"
            data-price="${meal.price}"
            data-image="${imageUrl}"
            data-category="${meal.category || 'Uncategorized'}"
            data-status="${meal.availability_status || 'Available Today'}">

            <!-- =========================
            MEAL IMAGE
            ========================= -->

            <div class="meal-card-img-wrapper">

                <img src="${imageUrl}"
                    class="card-img-top menu-image"
                    alt="${meal.name}">

                <!-- Category Badge -->
                <span class="meal-category-badge
                    ${meal.availability_status === "Preorder" ? "preorder" : ""}
                    ${meal.availability_status === "Sold Out" ? "soldout" : ""}
                    ${meal.availability_status === "Limited" ? "limited" : ""}
                    ${meal.availability_status === "Event Only" ? "event" : ""}
                    ${meal.availability_status === "Available Today" ? "available" : ""}">
                    
                    ${meal.availability_status || "Available Today"}

                </span>

                <!-- Favorite Button -->
                <button
                    class="favorite-btn"
                    onclick="toggleFavorite(${meal.id})">

                    ❤️

                </button>

            </div>

            <!-- =========================
            MEAL BODY
            ========================= -->

            <div class="meal-card-body d-flex flex-column">

                <h5 class="meal-title text-center">
                    ${meal.name}
                </h5>

                <div class="mt-auto">

                    <div class="meal-footer-info">

                        <span class="meal-price">
                            GH₵ ${meal.price}
                        </span>

                    </div>

                    <!-- Add To Cart -->
                    <button
                        class="${buttonClass}"
                        data-name="${meal.name}"
                        data-price="${meal.price}"
                        data-image="${imageUrl}"
                        ${buttonDisabled}>

                        ${buttonText}

                    </button>

                </div>

            </div>

        </div>

    

`;

            });

            revealOnScroll();

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
        const identifier = document.getElementById("identifier").value.trim();

        const password =
            document.getElementById("login-password").value;

        // Message area
        const loginMessage =
            document.getElementById("login-message");

        try{

            const response = await fetch(`${API_URL}/api/login`,


                {

                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({

                        identifier,
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

        const phone = document.getElementById("phone").value.trim();
        const address = document.getElementById("address").value.trim();

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

                `${API_URL}/api/register`,

                {

                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({

                        fullname,
                        email,
                        phone,
                        address,
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

// =========================
// FETCH ORDERS FROM BACKEND
// Requires logged-in user token
// =========================

const token = localStorage.getItem("token");

fetch(`${API_URL}/api/orders/${loggedUser.id}`, {
    method: "GET",
    headers: {
        Authorization: `Bearer ${token}`
    }
})

.then(response => response.json())

.then(orders => {

    ordersContainer.innerHTML = "";

    if (orders.length === 0) {
        ordersContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📦</div>
                <h4>No orders yet</h4>
                <p>Your order history will appear here.</p>
                <a href="menu.html" class="btn btn-dark">Order Now</a>
            </div>
        `;
        return;
    }

    orders.forEach(order => {

        // =========================
        // FORMAT REAL ORDER ID
        // Example: EST-00014
        // =========================

        const orderCode = `EST-${String(order.id).padStart(5, "0")}`;

        // =========================
        // PARSE ORDER ITEMS SAFELY
        // =========================

        let items = [];

        try {
            if (typeof order.items === "string") {
                items = JSON.parse(order.items);
            } else if (Array.isArray(order.items)) {
                items = order.items;
            } else if (typeof order.items === "object") {
                items = Object.values(order.items);
            }
        } catch (error) {
            console.log("Items parse error:", error);
            items = [];
        }

        // =========================
        // CREATE MEALS HTML
        // =========================

        let mealsHTML = "";

        items.forEach(item => {
            mealsHTML += `
                <div class="order-meal-row">
                    <span>${item.name}</span>
                    <span>× ${item.quantity}</span>
                </div>
            `;
        });

        // =========================
        // PAYMENT STATUS
        // =========================

        const paymentStatus = 
        order.payment_method === "Cash on Delivery"
        ? "Cash on Delivery"
        : (order.payment_status || "Paid");


        // =========================
        // DISPLAY ORDER CARD
        // =========================

        ordersContainer.innerHTML += `
            <div class="card order-card shadow-sm mb-4">
                <div class="card-body">

                    <div class="order-header">
                        <div>
                            <small class="order-id-label">Order ID</small>
                            <h5 class="order-id-text mb-0">${orderCode}</h5>
                        </div>

                        <span class="badge order-status-badge ${order.status}">
                            ${order.status}
                        </span>
                    </div>

                    <div class="order-items-list mt-4">
                        ${mealsHTML}
                    </div>

                    
                            <div class="order-info-row">
                                <span>Order Type</span>
                                <strong>${order.order_type || "Delivery"}</strong>
                            </div>

                            <div class="order-info-row">
                                <span>Preferred Date</span>
                                <strong>${order.preferred_date
                                ? new Date(order.preferred_date).toLocaleDateString()
                                : "Not set"}</strong>
                            </div>

                            <div class="order-info-row">
                                <span>Preferred Time</span>
                                <strong>${order.preferred_time || "Not set"}</strong>
                            </div>

                            ${order.special_notes ? `
                                <div class="special-notes-box mt-3">
                                    <strong>Special Notes</strong>
                                    <p>${order.special_notes}</p>
                                </div>
                            ` : ""}

                       <!-- =========================
                        ORDER TRACKING TIMELINE
                        ========================= -->

                        <div class="tracking-wrapper mt-4">

                            <!-- Pending -->
                            <div class="tracking-step ${
                                order.status === 'Pending' ||
                                order.status === 'Accepted' ||
                                order.status === 'Preparing' ||
                                order.status === 'Delivery' ||
                                order.status === 'Delivered' ||
                                order.status === 'Received'
                                    ? 'active'
                                    : ''
                            }">

                                <div class="tracking-icon">📝</div>
                                <small>Pending</small>

                            </div>

                            <div class="tracking-line"></div>

                            <!-- Accepted -->
                            <div class="tracking-step ${
                                order.status === 'Accepted' ||
                                order.status === 'Preparing' ||
                                order.status === 'Delivery' ||
                                order.status === 'Delivered' ||
                                order.status === 'Received'
                                    ? 'active'
                                    : ''
                            }">

                                <div class="tracking-icon">✅</div>
                                <small>Accepted</small>

                            </div>

                            <div class="tracking-line"></div>

                            <!-- Preparing -->
                            <div class="tracking-step ${
                                order.status === 'Preparing' ||
                                order.status === 'Delivery' ||
                                order.status === 'Delivered' ||
                                order.status === 'Received'
                                    ? 'active'
                                    : ''
                            }">

                                <div class="tracking-icon">👨‍🍳</div>
                                <small>Preparing</small>

                            </div>

                            <div class="tracking-line"></div>

                            <!-- Delivery -->
                            <div class="tracking-step ${
                                order.status === 'Delivery' ||
                                order.status === 'Delivered' ||
                                order.status === 'Received'
                                    ? 'active'
                                    : ''
                            }">

                                <div class="tracking-icon">🛵</div>
                                <small>Delivery</small>

                            </div>

                            <div class="tracking-line"></div>

                            <!-- Delivered -->
                            <div class="tracking-step ${
                                order.status === 'Delivered' ||
                                order.status === 'Received'
                                    ? 'active'
                                    : ''
                            }">

                                <div class="tracking-icon">📦</div>
                                <small>Delivered</small>

                            </div>

                            <div class="tracking-line"></div>

                            <!-- Received -->
                            <div class="tracking-step ${
                                order.status === 'Received'
                                    ? 'active'
                                    : ''
                            }">

                                <div class="tracking-icon">🎉</div>
                                <small>Received</small>

                            </div>

                        </div>
                                <!-- =========================
                                  CANCELLED STATUS
                                 ========================= -->

                            ${order.status === "Cancelled" ? `

                                <div class="cancelled-order-box mt-4">

                                    <div class="cancelled-icon">
                                        ❌
                                    </div>

                                    <div>
                                        <strong>
                                            Order Cancelled
                                        </strong>

                                        <p class="mb-0 text-muted">
                                            This order was cancelled.
                                        </p>
                                    </div>

                                </div>

                            ` : ""}


                    <hr>

                    <div class="order-info-row">
                        <span>Total</span>
                        <strong class="text-warning">GH₵ ${order.total}</strong>
                    </div>

                    <div class="order-info-row">
                        <span>Payment</span>
                        <strong>${paymentStatus}</strong>
                    </div>

                    <small class="text-muted d-block mt-3">
                        ${new Date(order.created_at).toLocaleString()}
                    </small>

                    ${order.status === "Pending" ? `
                        <button class="btn cancel-order-btn mt-3"
                            onclick="cancelOrder(${order.id})">
                            Cancel Order
                        </button>
                    ` : ""}

                    ${order.status === "Received" || order.status === "Cancelled" ? `
                        <button class="btn btn-outline-danger btn-sm mt-3"
                                onclick="hideUserOrder(${order.id})">
                            Remove From My Orders
                        </button>
                    ` : ""}

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

        const deliveryFee = 0;

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

    fetch(`${API_URL}/api/admin/orders?page=${page}&limit=${adminLimit}`, {
        headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`
        }
    })

        .then(response => response.json())

        .then(data => {

            const orders = data.orders;

            const totalOrders =
                document.getElementById("total-orders");

                     
            

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
                    // =========================
                    // FORMAT ORDER ID
                    // =========================

                    const orderCode =
                        `EST-${String(order.id).padStart(5, "0")}`;

                tableRows += `
                    <tr>
                        <td>${orderCode}</td>
                        <td>${order.fullname}</td>
                        <td>${order.phone}</td>
                        <td>${order.email}</td>
                        <td>
                             ${(() => {

                            // =========================
                            // SAFE ITEMS PARSER
                            // =========================

                            let items = [];

                            try {

                                if (typeof order.items === "string") {

                                    items = JSON.parse(order.items);

                                } else if (Array.isArray(order.items)) {

                                    items = order.items;

                                } else if (typeof order.items === "object") {

                                    items = Object.values(order.items);

                                }

                            } catch (error) {

                                console.log("Items parse error:", error);

                                items = [];

                            }

                            return items.map(item => `
                                <div>
                                    ${item.name} × ${item.quantity}
                                </div>
                            `).join("");

                        })()}
                              </td>

                        <td>
                            <span class="badge bg-dark">
                                ${order.order_type || "Delivery"}
                            </span>
                        </td>

                        <td>
                            ${order.preferred_date
                                ? new Date(order.preferred_date).toLocaleDateString()
                                : "Not set"}
                        </td>

                        <td>
                            ${order.preferred_time || "Not set"}
                        </td>

                        <td>

                            ${order.special_notes

                                ? `

                                <button class="btn btn-sm btn-warning view-note-btn"
                                        data-note="${order.special_notes}">

                                    View Note

                                </button>

                                `

                                : `<span class="text-muted">None</span>`

                            }

                        </td>
                        <td>GH₵ ${order.total}</td>
                        <td>
                            <select class="form-select status-select"
                                    data-id="${order.id}">
                                    <option value="Accepted" ${order.status === "Accepted" ? "selected" : ""}>Accepted</option>
                                    <option value="Received" ${order.status === "Received" ? "selected" : ""}>Received</option>
                                <option value="Pending" ${order.status === "Pending" ? "selected" : ""}>Pending</option>
                                <option value="Preparing" ${order.status === "Preparing" ? "selected" : ""}>Preparing</option>
                                <option value="Delivery" ${order.status === "Delivery" ? "selected" : ""}>Delivery</option>
                                <option value="Delivered" ${order.status === "Delivered" ? "selected" : ""}>Delivered</option>
                                <option value="Cancelled" ${order.status === "Cancelled" ? "selected" : ""}>Cancelled</option>
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
                                <th>Order Type</th>
                                <th>Date</th>
                                <th>Time</th>
                                <th>Notes</th>
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
// =========================
// VIEW CUSTOMER NOTE
// =========================

document.addEventListener("click", (e) => {

    if (e.target.classList.contains("view-note-btn")) {

        const note =
            e.target.dataset.note;

        document.getElementById(
            "modal-note-text"
        ).textContent = note;

        const modal =
            new bootstrap.Modal(
                document.getElementById("notesModal")
            );

        modal.show();

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

const response = await fetch(`${API_URL}/api/admin/orders/${orderId}`,

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
            loadKitchenQueue();

        }

        catch (error) {

            console.log(error);

            showToast("Something went wrong", "error");

        }

    }

});

// =========================
// ADMIN: ADD MEAL
// Uploads meal image to Cloudinary through backend
// =========================

const addMealForm = document.getElementById("add-meal-form");

if (addMealForm) {

    addMealForm.addEventListener("submit", async (e) => {

        e.preventDefault();

        // =========================
        // GET FORM INPUTS
        // =========================

        const name = document.getElementById("meal-name").value.trim();
        const price = document.getElementById("meal-price").value.trim();
        const category = document.getElementById("meal-category").value.trim();
        const image = document.getElementById("meal-image").files[0];
        const mealMessage = document.getElementById("meal-message");
        const availability =
        document.getElementById("meal-availability").value;

        mealMessage.textContent = "";
        mealMessage.classList.remove("text-danger", "text-success");

        // =========================
        // VALIDATION
        // =========================

        if (!name || !price || !category || !image) {
            mealMessage.textContent = "All fields including image are required.";
            mealMessage.classList.add("text-danger");
            return;
        }

        // =========================
        // PREPARE FORM DATA
        // Important: Do not set Content-Type manually
        // =========================

        const formData = new FormData();

        formData.append("name", name);
        formData.append("price", price);
        formData.append("category", category);
        formData.append("image", image);
        formData.append("availability_status", availability);

        try {

            // =========================
            // SEND MEAL TO BACKEND
            // Backend uploads image to Cloudinary
            // =========================

            const response = await fetch(`${API_URL}/api/admin/meals`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`
                },
                body: formData
            });

            const data = await response.json();

            if (!response.ok) {
                mealMessage.textContent = data.message || "Failed to add meal.";
                mealMessage.classList.add("text-danger");
                return;
            }

            showToast("Meal added successfully!", "success");

            mealMessage.textContent = "Meal added successfully!";
            mealMessage.classList.add("text-success");

            addMealForm.reset();

            setTimeout(() => {
                location.reload();
            }, 1000);

        } catch (error) {
            console.log(error);
            showToast("Something went wrong", "error");
        }
    });
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

    fetch(`${API_URL}/api/admin/meals`, {
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
                    `${API_URL}/uploads/${fileName}`;
            }
            else if (imageUrl.startsWith("http://localhost:5000")) {
                imageUrl =
                    imageUrl.replace(
                        "http://localhost:5000",
                        `${API_URL}`
                    );
            }
            else if (imageUrl.startsWith("http")) {
                imageUrl = meal.image;
            }
            else if (imageUrl.startsWith("/uploads") || imageUrl.startsWith("/images")) {
                imageUrl =
                    `${API_URL}${imageUrl}`;
            }
            else if (imageUrl.startsWith("uploads/") || imageUrl.startsWith("images/")) {
                imageUrl =
                    `${API_URL}/${imageUrl}`;
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
                                data-image="${imageUrl}"
                                data-availability="${meal.availability_status || 'Available Today'}">
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

const response = await fetch(`${API_URL}/api/admin/meals/${mealId}`, {
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

        const mealAvailability =
            e.target.dataset.availability || "Available Today";

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

        document.getElementById(
            "edit-meal-availability"
        ).value = mealAvailability;

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
            const availability =
                document.getElementById(
                    "edit-meal-availability"
                ).value;

            try {

                const response = await fetch(

                    `${API_URL}/api/admin/meals/${id}`,

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
                            image,
                            availability_status: availability

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

    fetch(`${API_URL}/api/admin/analytics`, {
        headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`
        }
    })

        .then(response => response.json())

        .then(data => {

            console.log("Analytics data:", data);

            // Update dashboard cards
            const totalOrdersCard =
                document.getElementById("total-orders");

            const totalCustomersCard =
                document.getElementById("total-customers");

            const totalRevenueCard =
                document.getElementById("total-revenue");

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

// =========================
// TOGGLE FAVORITE
// =========================

async function toggleFavorite(mealId) {

    const token =
        localStorage.getItem("token");

    if (!token) {

        showToast(
            "Please login first",
            "error"
        );

        return;
    }

    try {

        const response = await fetch(
            `${API_URL}/api/favorites`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",

                    Authorization:
                    `Bearer ${token}`
                },

                body: JSON.stringify({
                    meal_id: mealId
                })
            }
        );

        const data =
            await response.json();

        showToast(
            data.message,
            "success"
        );

    }

    catch (error) {

        console.log(error);

        showToast(
            "Failed to add favorite",
            "error"
        );
        

    }

}

// =========================
// GLOBAL SCROLL REVEAL ANIMATION
// Works for dynamically loaded meal cards too
// =========================

// =========================
// REPLAY SCROLL ANIMATION
// Animation plays whenever element enters screen
// =========================

function revealOnScroll() {

    const revealElements = document.querySelectorAll(
        ".reveal, .reveal-left, .reveal-right, .reveal-zoom"
    );

    revealElements.forEach(element => {

        const elementTop =
            element.getBoundingClientRect().top;

        const elementBottom =
            element.getBoundingClientRect().bottom;

        const windowHeight =
            window.innerHeight;

        // Element is inside screen
        if (
            elementTop < windowHeight - 80 &&
            elementBottom > 80
        ) {

            element.classList.add("active");

        }

        // Element leaves screen
        else {

            element.classList.remove("active");

        }

    });

}

window.addEventListener("scroll", revealOnScroll);
window.addEventListener("load", revealOnScroll);

// =========================
// ANIMATED NAVBAR ON SCROLL
// =========================

const navbar = document.querySelector(".custom-navbar");

window.addEventListener("scroll", () => {
    if (!navbar) return;

    if (window.scrollY > 60) {
        navbar.classList.add("nav-scrolled");
    } else {
        navbar.classList.remove("nav-scrolled");
    }
});


// =========================
// ACTIVE NAV LINK
// Highlights current page
// =========================

const currentPage = window.location.pathname.split("/").pop();

document.querySelectorAll(".nav-link").forEach(link => {
    const linkPage = link.getAttribute("href");

    if (linkPage === currentPage) {
        link.classList.add("active-page");
    }
});

// =========================
// ANIMATED HAMBURGER BUTTON
// =========================

const navbarToggler =
    document.querySelector(".navbar-toggler");

const navbarCollapse =
    document.querySelector(".navbar-collapse");

if (navbarToggler && navbarCollapse) {

    navbarToggler.addEventListener("click", () => {

        navbarToggler.classList.toggle("active");

    });

}

// =========================
// PAGE ENTRANCE ANIMATION
// =========================

document.body.classList.add("page-enter");

// =========================
// FLOATING CART COUNT
// =========================

function updateFloatingCartCount() {

    const floatingCartCount =
        document.getElementById("floating-cart-count");

    if (!floatingCartCount) return;

    const cart =
        JSON.parse(localStorage.getItem(STORAGE_KEY)) ||
        JSON.parse(localStorage.getItem("esteesbites_cart")) ||
        [];

    const totalItems =
        cart.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

    floatingCartCount.textContent = totalItems;
}

function initializeCartCounts() {
    updateCartCount();
    updateFloatingCartCount();
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeCartCounts);
} else {
    initializeCartCounts();
}

// =========================
// PREMIUM PAYMENT SELECTION
// =========================

const paymentCards =
    document.querySelectorAll(".payment-card");

const paymentMethodInput =
    document.getElementById("payment-method");

paymentCards.forEach(card => {

    card.addEventListener("click", () => {

        // Remove active class
        paymentCards.forEach(c => {
            c.classList.remove("active-payment");
        });

        // Add active class
        card.classList.add("active-payment");

        // Update hidden input
        paymentMethodInput.value =
            card.dataset.method;

        activatePaymentStep();

    });

});

// =========================
// CHECKOUT OVERLAY CONTROLS
// =========================

function showCheckoutOverlay(
    title = "Processing your order...",
    text = "Please wait while we prepare your checkout."
) {
    const overlay = document.getElementById("checkout-overlay");
    const titleEl = document.getElementById("checkout-overlay-title");
    const textEl = document.getElementById("checkout-overlay-text");

    if (!overlay) return;

    overlay.classList.remove("d-none", "success");
    titleEl.textContent = title;
    textEl.textContent = text;
}

function showCheckoutSuccessOverlay() {
    const overlay = document.getElementById("checkout-overlay");
    const titleEl = document.getElementById("checkout-overlay-title");
    const textEl = document.getElementById("checkout-overlay-text");

    if (!overlay) return;

    overlay.classList.add("success");
    titleEl.textContent = "Order placed successfully!";
    textEl.textContent = "Redirecting you to your orders...";
}

function hideCheckoutOverlay() {
    const overlay = document.getElementById("checkout-overlay");

    if (!overlay) return;

    overlay.classList.add("d-none");
}

// =========================
// CHECKOUT STEP CONTROLLER
// Safe version so it does not break payment callback
// =========================

function activatePaymentStep() {

    const paymentStep =
        document.getElementById("payment-step");

    const paymentLine =
        document.getElementById("payment-line");

    if (paymentStep) {
        paymentStep.classList.add("active");
    }

    if (paymentLine) {
        paymentLine.classList.add("active");
    }

}

function activateCompleteStep() {

    const completeStep =
        document.getElementById("complete-step");

    if (completeStep) {
        completeStep.classList.add("active");
    }

}

// =========================
// MEAL QUICK VIEW MODAL
// Opens meal details popup
// =========================

document.addEventListener("click", (e) => {

    const card = e.target.closest(".quick-view-trigger");

    // Ignore Add to Cart and Favorite clicks
    if (
        e.target.classList.contains("add-to-cart") ||
        e.target.classList.contains("favorite-btn")
    ) {
        return;
    }

    if (!card) return;

    const id = card.dataset.id;
    loadMealReviews(id);
    const name = card.dataset.name;
    const price = card.dataset.price;
    const image = card.dataset.image;
    const category = card.dataset.category;
    const status = card.dataset.status;

    document.getElementById("quick-view-image").src = image;
    document.getElementById("quick-view-name").textContent = name;
    document.getElementById("quick-view-price").textContent = `GH₵ ${price}`;
    document.getElementById("quick-view-category").textContent = category;
    document.getElementById("quick-view-status").textContent = status;
    document.getElementById("quick-view-quantity").value = 1;

    const addBtn = document.getElementById("quick-view-add-cart");

    addBtn.dataset.id = id;
    addBtn.dataset.name = name;
    addBtn.dataset.price = price;
    addBtn.dataset.image = image;

    if (status === "Sold Out") {
        addBtn.textContent = "Sold Out";
        addBtn.disabled = true;
        addBtn.className = "btn btn-secondary w-100";
    } else if (status === "Preorder") {
        addBtn.textContent = "Preorder Now";
        addBtn.disabled = false;
        addBtn.className = "btn btn-dark w-100";
    } else if (status === "Event Only") {
        addBtn.textContent = "Contact for Booking";
        addBtn.disabled = false;
        addBtn.className = "btn btn-outline-primary w-100";
    } else {
        addBtn.textContent = "Add to Cart";
        addBtn.disabled = false;
        addBtn.className = "btn btn-dark w-100";
    }

    const modal = new bootstrap.Modal(
        document.getElementById("mealQuickViewModal")
    );

    modal.show();
});

// =========================
// QUICK VIEW ADD TO CART
// =========================

const quickViewAddCart =
    document.getElementById("quick-view-add-cart");

if (quickViewAddCart) {

    quickViewAddCart.addEventListener("click", () => {

        const quantity =
            Number(document.getElementById("quick-view-quantity").value);

        const meal = {
            id: quickViewAddCart.dataset.id,
            name: quickViewAddCart.dataset.name,
            price: Number(quickViewAddCart.dataset.price),
            image: quickViewAddCart.dataset.image,
            quantity: quantity
        };

        let cart =
            JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

        const existingMeal =
            cart.find(item => item.name === meal.name);

        if (existingMeal) {
            existingMeal.quantity += quantity;
        } else {
            cart.push(meal);
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));

        updateCartCount();
        updateFloatingCartCount();

        showToast("Meal added to cart", "success");

        const modal =
            bootstrap.Modal.getInstance(
                document.getElementById("mealQuickViewModal")
            );

        modal.hide();
    });
}

// =========================
// LOAD MEAL REVIEWS
// Shows reviews inside quick view modal
// =========================

async function loadMealReviews(mealId) {

    const reviewsBox =
        document.getElementById("quick-view-reviews");

    if (!reviewsBox) return;

    try {
        const response = await fetch(
            `${API_URL}/api/meals/${mealId}/reviews`
        );

        const reviews = await response.json();

        if (reviews.length === 0) {
            reviewsBox.innerHTML = `
                <p class="text-muted">No reviews yet.</p>
            `;
            return;
        }

        reviewsBox.innerHTML = "";

        reviews.forEach(review => {

            reviewsBox.innerHTML += `
                <div class="review-card">

                    <strong>
                        ${review.user_name || "Customer"}
                    </strong>

                    <div class="text-warning">
                        ${"⭐".repeat(review.rating)}
                    </div>

                    <p class="mb-1">
                        ${review.review || ""}
                    </p>

                    <small class="text-muted">
                        ${new Date(review.created_at).toLocaleString()}
                    </small>

                </div>
            `;

        });

    } catch (error) {
        console.log(error);
        reviewsBox.innerHTML = `
            <p class="text-danger">Failed to load reviews.</p>
        `;
    }
}

// =========================
// SUBMIT MEAL REVIEW
// Uses event delegation so modal button always works
// =========================

document.addEventListener("click", async (e) => {

    if (!e.target || e.target.id !== "submit-review-btn") {
        return;
    }

    const token =
        localStorage.getItem("token");

    const loggedUser =
        JSON.parse(localStorage.getItem("loggedUser"));

    const mealId =
        document.getElementById("quick-view-add-cart").dataset.id;

    const rating =
        document.getElementById("review-rating").value;

    const review =
        document.getElementById("review-text").value.trim();

    if (!token) {
        showToast("Please login first", "error");
        return;
    }

    if (!rating) {
        showToast("Please select a rating", "error");
        return;
    }

    try {

        const response = await fetch(
            `${API_URL}/api/meals/${mealId}/reviews`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },

                body: JSON.stringify({
                    user_name: loggedUser.fullname || loggedUser.name || "Customer",
                    rating: Number(rating),
                    review
                })
            }
        );

        const data =
            await response.json();

        if (!response.ok) {
            showToast(
                data.message || "Failed to submit review",
                "error"
            );
            return;
        }

        showToast(
            "Review submitted successfully",
            "success"
        );

        document.getElementById("review-rating").value = "";
        document.getElementById("review-text").value = "";

        loadMealReviews(mealId);

    } catch (error) {

        console.log(error);

        showToast(
            "Something went wrong",
            "error"
        );

    }

});

// =========================
// LOAD HOMEPAGE FEATURED MEALS
// =========================

const featuredMealsContainer =
    document.getElementById("featured-meals-container");

if (featuredMealsContainer) {

    fetch(`${API_URL}/api/home/featured-meals`)

        .then(response => response.json())

        .then(meals => {

            featuredMealsContainer.innerHTML = "";

            if (!meals || meals.length === 0) {
                featuredMealsContainer.innerHTML = `
                    <div class="col-12 text-center text-muted">
                        No featured meals yet.
                    </div>
                `;
                return;
            }

            meals.forEach(meal => {

                const rating =
                    Number(meal.average_rating).toFixed(1);

                const mealImage = getMealImage(meal.image || meal.image_url);

                featuredMealsContainer.innerHTML += `
                    <div class="col-lg-4 col-md-6 reveal-zoom">

                        <div class="featured-meal-card hover-lift">

                            <img src="${mealImage}" alt="${meal.name}">

                            <div class="featured-meal-body">

                                <span class="meal-category-badge position-static d-inline-block mb-3">
                                    ${meal.availability_status || "Available Today"}
                                </span>

                                <h4>
                                    ${meal.name}
                                </h4>

                                <p class="featured-rating">
                                    ⭐ ${rating} 
                                    <span class="text-muted">
                                        (${meal.review_count} reviews)
                                    </span>
                                </p>

                                <div class="d-flex justify-content-between align-items-center">

                                    <strong class="meal-price">
                                        GH₵ ${meal.price}
                                    </strong>

                                    <a href="menu.html" class="btn btn-dark btn-sm">
                                        Order
                                    </a>

                                </div>

                            </div>

                        </div>

                    </div>
                `;

            });

            revealOnScroll();

        })

        .catch(error => {
            console.log(error);

            featuredMealsContainer.innerHTML = `
                <div class="col-12 alert alert-danger text-center">
                    Failed to load featured meals.
                </div>
            `;
        });
}

// =========================
// CONVERT VAPID KEY
// Required for browser push subscription
// =========================

function urlBase64ToUint8Array(base64String) {

    const padding = "=".repeat(
        (4 - base64String.length % 4) % 4
    );

    const base64 =
        (base64String + padding)
            .replace(/-/g, "+")
            .replace(/_/g, "/");

    const rawData =
        window.atob(base64);

    const outputArray =
        new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] =
            rawData.charCodeAt(i);
    }

    return outputArray;
}

// =========================
// REGISTER PUSH NOTIFICATIONS
// =========================

async function registerPushNotifications() {

    const token =
        localStorage.getItem("token");

    if (!token) return;

    if (!("serviceWorker" in navigator)) return;

    if (!("PushManager" in window)) return;

    try {

        const permission =
            await Notification.requestPermission();

        if (permission !== "granted") {
            return;
        }

        const registration =
            await navigator.serviceWorker.register("sw.js");

        const subscription =
            await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(
                    "BEJM_Kj1ON4dEEjgKhyG8k381-U0P8CqsVncIpAoZlWds63jYt9rUXhy_40JutiXoOeUPqKskRRHqGLq1meOuWc"
                )
            });

        await fetch(`${API_URL}/api/push/subscribe`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization:
                `Bearer ${token}`
            },
            body: JSON.stringify(subscription)
        });

        console.log("Push notifications enabled");

    } catch (error) {
        console.log("Push notification error:", error);
    }
}

registerPushNotifications();

// =========================
// ADMIN: LOAD KITCHEN QUEUE
// Groups orders by status
// =========================

function loadKitchenQueue() {

    const pendingBox =
        document.getElementById("pending-orders");

    const preparingBox =
        document.getElementById("preparing-orders");

    const deliveryBox =
        document.getElementById("delivery-orders");

    const completedBox =
        document.getElementById("completed-orders");

    if (!pendingBox) return;

    pendingBox.innerHTML = "";
    preparingBox.innerHTML = "";
    deliveryBox.innerHTML = "";
    completedBox.innerHTML = "";

    fetch(`${API_URL}/api/admin/orders?page=1&limit=100`, {
        headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`
        }
    })

    .then(response => response.json())

    .then(data => {

        const orders = data.orders || [];

        orders.forEach(order => {

            const orderCode =
                `EST-${String(order.id).padStart(5, "0")}`;

            let items = [];

            try {
                items = typeof order.items === "string"
                    ? JSON.parse(order.items)
                    : order.items;
            } catch {
                items = [];
            }

            const itemsHTML =
                items.map(item => `
                    <div>
                        ${item.name} × ${item.quantity}
                    </div>
                `).join("");

            const card = `
                <div class="kitchen-order-card">

                    <h5>${orderCode}</h5>

                    <p class="mb-1 fw-bold">
                        ${order.fullname}
                    </p>

                    <p class="kitchen-order-items">
                        ${itemsHTML}
                    </p>

                    <small class="text-muted d-block mb-2">
                        ${order.order_type || "Delivery"} • 
                        ${order.preferred_date
                                ? new Date(order.preferred_date).toLocaleDateString()
                                : "Not set"} • 
                        ${order.preferred_time || "No time"}
                    </small>

                    ${order.special_notes ? `
                        <div class="special-notes-box mt-2">
                            ${order.special_notes}
                        </div>
                    ` : ""}

                    <select class="form-select mt-3 status-select"
                            data-id="${order.id}">
                        <option value="Pending" ${order.status === "Pending" ? "selected" : ""}>Pending</option>
                        <option value="Preparing" ${order.status === "Preparing" ? "selected" : ""}>Preparing</option>
                        <option value="Delivery" ${order.status === "Delivery" ? "selected" : ""}>Delivery</option>
                        <option value="Delivered" ${order.status === "Delivered" ? "selected" : ""}>Delivered</option>
                        <option value="Received" ${order.status === "Received" ? "selected" : ""}>Received</option>
                        <option value="Cancelled" ${order.status === "Cancelled" ? "selected" : ""}>Cancelled</option>
                    </select>

                    ${order.status === "Delivered" || order.status === "Received" ? `

                        <button
                            class="btn btn-outline-danger btn-sm w-100 mt-2 archive-order-btn"
                            data-id="${order.id}">

                            Remove From Queue

                        </button>

                    ` : ""}

                    <a
                        href="https://wa.me/${order.phone}?text=${encodeURIComponent(
                            `Hello ${order.fullname}, your ESTEESBITES order (${orderCode}) is currently ${order.status}. Thank you for choosing ESTEESBITES.`
                        )}"
                        target="_blank"
                        class="btn btn-success btn-sm w-100 mt-2">

                        WhatsApp Customer

                    </a>

                    


                </div>
            `;

            if (order.status === "Pending") {
                pendingBox.innerHTML += card;
            }
            else if (order.status === "Received") {
                pendingBox.innerHTML += card;
            }

            else if (order.status === "Preparing") {
                preparingBox.innerHTML += card;
            }

            else if (order.status === "Delivery") {
                deliveryBox.innerHTML += card;
            }

            else if (
                order.status === "Delivered" ||
                order.status === "Received"

                
            ) {
                
                completedBox.innerHTML += card;
                
            }

        });

    })

    .catch(error => {
        console.log(error);
    });
}

loadKitchenQueue();

// =========================
// ADMIN: LOAD CUSTOMERS
// =========================

const adminCustomersContainer =
    document.getElementById("admin-customers-container");

if (adminCustomersContainer) {

    fetch(`${API_URL}/api/admin/customers`, {
        headers: {
            Authorization:
            `Bearer ${localStorage.getItem("token")}`
        }
    })

    .then(response => response.json())

    .then(customers => {

        if (!customers || customers.length === 0) {
            adminCustomersContainer.innerHTML = `
                <div class="alert alert-warning">
                    No customers found.
                </div>
            `;
            return;
        }

        let rows = "";

        customers.forEach(customer => {

            rows += `
                <tr>
                    <td>${customer.fullname}</td>
                    <td>${customer.phone || "Not added"}</td>
                    <td>${customer.email}</td>
                </tr>
            `;

        });

        adminCustomersContainer.innerHTML = `
            <div class="table-responsive">
                <table class="table table-bordered table-hover align-middle">
                    <thead class="table-dark">
                        <tr>
                            <th>Name</th>
                            <th>Phone</th>
                            <th>Email</th>
                        </tr>
                    </thead>

                    <tbody>
                        ${rows}
                    </tbody>
                </table>
            </div>
        `;

    })

    .catch(error => {
        console.log(error);

        adminCustomersContainer.innerHTML = `
            <div class="alert alert-danger">
                Failed to load customers.
            </div>
        `;
    });

}

// =========================
// ARCHIVE ORDER FROM QUEUE
// =========================

document.addEventListener("click", async (e) => {

    if (!e.target.classList.contains("archive-order-btn")) {
        return;
    }

    const orderId =
        e.target.dataset.id;

    try {

        const response = await fetch(

            `${API_URL}/api/admin/orders/${orderId}/archive`,

            {
                method: "PUT",

                headers: {
                    Authorization:
                    `Bearer ${localStorage.getItem("token")}`
                }
            }

        );

        const data =
            await response.json();

        if (!response.ok) {

            showToast(
                data.message,
                "error"
            );

            return;
        }

        showToast(
            "Order removed from queue",
            "success"
        );

        loadKitchenQueue();

    } catch (error) {

        console.log(error);

        showToast(
            "Failed to archive order",
            "error"
        );

    }

});

// =========================
// ADMIN: CREATE COUPON
// =========================

const couponForm = document.getElementById("coupon-form");

if (couponForm) {

    couponForm.addEventListener("submit", async (e) => {

        e.preventDefault();

        const code = document.getElementById("coupon-code").value.trim();
        const discountType = document.getElementById("discount-type").value;
        const discountValue = document.getElementById("discount-value").value;
        const expiryDate = document.getElementById("coupon-expiry").value;
        const usageLimit = document.getElementById("usage-limit").value;

        try {
            const response = await fetch(`${API_URL}/api/admin/coupons`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("token")}`
                },
                body: JSON.stringify({
                    code,
                    discount_type: discountType,
                    discount_value: discountValue,
                    expiry_date: expiryDate,
                    usage_limit: usageLimit
                })
            });

            const data = await response.json();

            if (!response.ok) {
                showToast(data.message || "Failed to create coupon", "error");
                return;
            }

            showToast("Coupon created successfully", "success");
            couponForm.reset();

        } catch (error) {
            console.log(error);
            showToast("Something went wrong", "error");
        }
    });
}

// =========================
// APPLY COUPON
// =========================

const applyCouponBtn =
    document.getElementById("apply-coupon-btn");

if (applyCouponBtn) {

    applyCouponBtn.addEventListener("click", async () => {

        const couponInput =
            document.getElementById("coupon-code-input");

        const couponMessage =
            document.getElementById("coupon-message");

        const code =
            couponInput.value.trim();

        if (!code) {
            showToast("Enter coupon code", "error");
            return;
        }

        const cart =
            JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

        let subtotal = 0;

        cart.forEach(item => {
            subtotal += item.price * item.quantity;
        });

        const deliveryFee = 0;
        const total = subtotal + deliveryFee;

        try {
            const response = await fetch(`${API_URL}/api/coupons/validate`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("token")}`
                },
                body: JSON.stringify({
                    code,
                    total
                })
            });

            const data = await response.json();

            if (!response.ok) {
                couponMessage.textContent =
                    data.message || "Invalid coupon";
                couponMessage.className =
                    "d-block mt-2 text-danger";
                return;
            }

            appliedCouponCode = data.code;
            couponDiscount = Number(data.discount);

            couponMessage.textContent =
                `Coupon applied! You saved GH₵ ${couponDiscount}`;
            couponMessage.className =
                "d-block mt-2 text-success";

            showToast("Coupon applied successfully", "success");

            updateCheckoutSummaryWithDiscount();

        } catch (error) {
            console.log(error);
            showToast("Failed to apply coupon", "error");
        }
    });
}

// =========================
// UPDATE CHECKOUT SUMMARY WITH DISCOUNT
// =========================

function updateCheckoutSummaryWithDiscount() {

    const cart =
        JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

    let subtotal = 0;

    cart.forEach(item => {
        subtotal += item.price * item.quantity;
    });

    const deliveryFee = 0;

    const totalBeforeDiscount =
        subtotal + deliveryFee;

    const totalDiscount =
        couponDiscount + pointsDiscount;

    let finalTotal =
        totalBeforeDiscount - totalDiscount;

    if (finalTotal < 0) {
        finalTotal = 0;
    }

    document.getElementById("checkout-total").textContent =
        `GH₵ ${finalTotal}`;

    let discountRow =
        document.getElementById("checkout-discount-row");

    if (!discountRow) {

        const totalElement =
            document.getElementById("checkout-total")
                .parentElement;

        totalElement.insertAdjacentHTML(
            "beforebegin",
            `
            <div class="d-flex justify-content-between mb-3"
                 id="checkout-discount-row">
                <span>Discount</span>
                <strong class="text-success">
                    - GH₵ ${totalDiscount}
                </strong>
            </div>
            `
        );

    } else {

        discountRow.querySelector("strong").textContent =
            `- GH₵ ${totalDiscount}`;
    }
}

// =========================
// ADMIN: LOAD COUPONS
// =========================

const adminCouponsContainer =
    document.getElementById("admin-coupons-container");

function loadAdminCoupons() {

    if (!adminCouponsContainer) return;

    fetch(`${API_URL}/api/admin/coupons`, {
        headers: {
            Authorization:
            `Bearer ${localStorage.getItem("token")}`
        }
    })

    .then(response => response.json())

    .then(coupons => {

                if (!coupons || coupons.length === 0) {
                    adminCouponsContainer.innerHTML = `
                        <div class="alert alert-warning">
                            No coupons created yet.
                        </div>
                    `;
                    return;
                }

                let rows = "";

                coupons.forEach(coupon => {

                    const today = new Date();
        today.setHours(0, 0, 0, 0);

        const expiryDate = coupon.expiry_date
            ? new Date(coupon.expiry_date)
            : null;

        const isExpired =
            expiryDate && expiryDate < today;

        const couponActive =
            coupon.is_active && !isExpired;

            rows += `
                <tr>
                    <td>
                        <strong>${coupon.code}</strong>
                    </td>

                    <td>${coupon.discount_type}</td>

                    <td>${coupon.discount_value}</td>

                    <td>
                       
                        ${coupon.expiry_date
                                ? new Date(coupon.expiry_date).toLocaleDateString()
                                : "No expiry"}
                    </td>

                    <td>
                        ${coupon.used_count} / 
                        ${coupon.usage_limit == 0 ? "Unlimited" : coupon.usage_limit}
                    </td>

                    <td>
                        <span class="badge ${couponActive ? "bg-success" : "bg-danger"}">
                            ${isExpired ? "Expired" : couponActive ? "Active" : "Inactive"}
                        </span>
                    </td>

                    <td>
                        <button class="btn btn-sm btn-outline-danger delete-coupon-btn"
                                data-id="${coupon.id}">
                            Delete
                        </button>
                    </td>
                </tr>
            `;

        });

        adminCouponsContainer.innerHTML = `
            <div class="table-responsive">
                <table class="table table-bordered table-hover align-middle">
                    <thead class="table-dark">
                        <tr>
                            <th>Code</th>
                            <th>Type</th>
                            <th>Value</th>
                            <th>Expiry</th>
                            <th>Usage</th>
                            <th>Status</th>
                            <th>Action</th>
                        </tr>
                    </thead>

                    <tbody>
                        ${rows}
                    </tbody>
                </table>
            </div>
        `;
    })

    .catch(error => {
        console.log(error);

        adminCouponsContainer.innerHTML = `
            <div class="alert alert-danger">
                Failed to load coupons.
            </div>
        `;
    });
}

loadAdminCoupons();

// =========================
// ADMIN: DELETE COUPON
// =========================

document.addEventListener("click", async (e) => {

    if (!e.target.classList.contains("delete-coupon-btn")) return;

    const couponId = e.target.dataset.id;

    const confirmDelete = confirm(
        "Are you sure you want to delete this coupon?"
    );

    if (!confirmDelete) return;

    try {
        const response = await fetch(
            `${API_URL}/api/admin/coupons/${couponId}`,
            {
                method: "DELETE",
                headers: {
                    Authorization:
                    `Bearer ${localStorage.getItem("token")}`
                }
            }
        );

        const data = await response.json();

        if (!response.ok) {
            showToast(data.message || "Failed to delete coupon", "error");
            return;
        }

        showToast("Coupon deleted successfully", "success");

        loadAdminCoupons();

    } catch (error) {
        console.log(error);
        showToast("Something went wrong", "error");
    }
});

// =========================
// CUSTOM SALES REPORTS
// Generates report using selected start and end dates
// Only received orders are counted
// =========================

const generateReportBtn =
    document.getElementById("generate-report-btn");

if (generateReportBtn) {

    generateReportBtn.addEventListener("click", loadCustomSalesReport);

}


// =========================
// LOAD CUSTOM SALES REPORT
// =========================

function loadCustomSalesReport() {

    const startDate =
        document.getElementById("report-start-date").value;

    const endDate =
        document.getElementById("report-end-date").value;

    const salesContainer =
        document.getElementById("custom-sales-container");

    if (!startDate || !endDate) {
        showToast("Please select start and end date", "error");
        return;
    }

    if (new Date(startDate) > new Date(endDate)) {
        showToast("Start date cannot be after end date", "error");
        return;
    }

    salesContainer.innerHTML = `
        <div class="loading-box">
            <div class="loading-spinner"></div>
            Generating sales report...
        </div>
    `;

    fetch(`${API_URL}/api/admin/sales-reports/custom?start=${startDate}&end=${endDate}`, {
        headers: {
            Authorization:
            `Bearer ${localStorage.getItem("token")}`
        }
    })

    .then(response => response.json())

    .then(reports => {

            let totalRevenue = 0;
            let totalOrders = reports.length;

            reports.forEach(order => {
                totalRevenue += Number(order.total);
            });

            const averageOrder =
                totalOrders ? totalRevenue / totalOrders : 0;

            document.getElementById("custom-report-revenue").textContent =
                `GH₵ ${totalRevenue.toFixed(2)}`;

            document.getElementById("custom-report-orders").textContent =
                totalOrders;

            document.getElementById("custom-report-average").textContent =
                `GH₵ ${averageOrder.toFixed(2)}`;

        if (reports.length === 0) {
            salesContainer.innerHTML = `
                <div class="alert alert-warning">
                    No received orders found for this date range.
                </div>
            `;
            return;
        }

        let rows = "";

        reports.forEach(order => {

            rows += `
                <tr>
                    <td>
                        ${new Date(order.created_at).toLocaleDateString()}
                    </td>

                    <td>
                        EST-${String(order.id).padStart(5, "0")}
                    </td>

                    <td>
                        ${order.fullname}
                    </td>

                    <td>
                        GH₵ ${Number(order.total).toFixed(2)}
                    </td>
                </tr>
            `;



        });

        salesContainer.innerHTML = `
            <div class="table-responsive report-table-wrapper">

                <table class="table table-bordered table-hover report-table">

                    <thead>
                        <tr>
                        <th>Date</th>
                        <th>Order ID</th>
                        <th>Customer</th>
                        <th>Revenue</th>
                    </tr>
                    </thead>

                    <tbody>
                        ${rows}
                    </tbody>

                </table>

            </div>
        `;

        currentSalesReport = reports;

    })

    .catch(error => {

        console.log(error);

        salesContainer.innerHTML = `
            <div class="alert alert-danger">
                Failed to generate sales report.
            </div>
        `;

    });

}

// =========================
// DOWNLOAD SALES REPORT PDF
// =========================

let currentSalesReport = [];

const downloadReportBtn =
    document.getElementById("download-report-pdf");

if (downloadReportBtn) {

    downloadReportBtn.addEventListener("click", () => {

        if (currentSalesReport.length === 0) {
            showToast("Generate a report first", "error");
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        let totalRevenue = 0;

        currentSalesReport.forEach(order => {
            totalRevenue += Number(order.total);
        });

        doc.setFontSize(18);
        doc.text("ESTEESBITES Sales Report", 14, 20);

        doc.setFontSize(11);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);
        doc.text(`Total Orders: ${currentSalesReport.length}`, 14, 35);
        doc.text(`Total Revenue: GHC ${totalRevenue.toFixed(2)}`, 14, 42);

        const rows = currentSalesReport.map(order => [
            `EST-${String(order.id).padStart(5, "0")}`,
            order.fullname,
            order.phone,
            order.order_type || "Delivery",
            `GHC ${Number(order.total).toFixed(2)}`,
            new Date(order.created_at).toLocaleString()
        ]);

        doc.autoTable({
            startY: 50,
            head: [[
                "Order ID",
                "Customer",
                "Phone",
                "Type",
                "Revenue",
                "Date"
            ]],
            body: rows,
            theme: "grid",
            headStyles: {
                fillColor: [17, 24, 39]
            }
        });

        const finalY = doc.lastAutoTable.finalY + 10;

        doc.setFontSize(13);
        doc.text(
            `FINAL TOTAL REVENUE: GHC ${totalRevenue.toFixed(2)}`,
            14,
            finalY
        );

        doc.save("esteesbites-sales-report.pdf");
    });
}


// =========================
// HIDE USER ORDER
// =========================
async function hideUserOrder(orderId) {

    const confirmRemove =
        confirm("Remove this order from your orders list?");

    if (!confirmRemove) return;

    try {
        const response = await fetch(`${API_URL}/api/orders/${orderId}/hide`, {
            method: "PUT",
            headers: {
                Authorization:
                `Bearer ${localStorage.getItem("token")}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            showToast(data.message, "error");
            return;
        }

        showToast("Order removed from your list", "success");

        location.reload();

    } catch (error) {
        console.log(error);
        showToast("Something went wrong", "error");
    }
}

// =========================
// CATERING REQUEST FORM
// =========================

const cateringForm =
    document.getElementById("catering-form");

if (cateringForm) {

    cateringForm.addEventListener("submit", async (e) => {

        e.preventDefault();

        const requestData = {
            fullname: document.getElementById("catering-fullname").value.trim(),
            phone: document.getElementById("catering-phone").value.trim(),
            email: document.getElementById("catering-email").value.trim(),
            event_type: document.getElementById("catering-event-type").value,
            event_date: document.getElementById("catering-event-date").value,
            event_time: document.getElementById("catering-event-time").value,
            location: document.getElementById("catering-location").value.trim(),
            guests: document.getElementById("catering-guests").value,
            budget: document.getElementById("catering-budget").value,
            message: document.getElementById("catering-message").value.trim()
        };

        try {

            const response = await fetch(`${API_URL}/api/catering-requests`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(requestData)
            });

            const data = await response.json();

            if (!response.ok) {
                showToast(data.message || "Failed to send request", "error");
                return;
            }

            showToast("Catering request sent successfully", "success");

            cateringForm.reset();

        } catch (error) {

            console.log(error);
            showToast("Something went wrong", "error");

        }

    });

}

// =========================
// ADMIN: LOAD CATERING REQUESTS
// =========================

const adminCateringContainer =
    document.getElementById("admin-catering-container");

if (adminCateringContainer) {

    fetch(`${API_URL}/api/admin/catering-requests`, {
        headers: {
            Authorization:
            `Bearer ${localStorage.getItem("token")}`
        }
    })

    .then(response => response.json())

    .then(requests => {

        if (!requests || requests.length === 0) {
            adminCateringContainer.innerHTML = `
                <div class="alert alert-warning">
                    No catering requests yet.
                </div>
            `;
            return;
        }

        let cards = "";

        requests.forEach(request => {

            cards += `
                <div class="card shadow-sm border-0 rounded-4 p-4 mb-3">

                    <div class="d-flex justify-content-between flex-wrap gap-2">

                        <div>
                            <h5 class="fw-bold mb-1">
                                ${request.fullname}
                            </h5>

                            <p class="text-muted mb-0">
                                ${request.event_type}
                            </p>
                        </div>

                        <span class="badge bg-warning text-dark align-self-start">
                            ${request.status}
                        </span>

                    </div>

                    <hr>

                    <div class="row g-3">

                        <div class="col-md-4">
                            <strong>Phone:</strong>
                            <p>${request.phone}</p>
                        </div>

                        <div class="col-md-4">
                            <strong>Email:</strong>
                            <p>${request.email || "Not provided"}</p>
                        </div>

                        <div class="col-md-4">
                            <strong>Guests:</strong>
                            <p>${request.guests || "Not set"}</p>
                        </div>

                        <div class="col-md-4">
                            <strong>Date:</strong>
                            <p>
                                ${request.event_date
                                    ? new Date(request.event_date).toLocaleDateString()
                                    : "Not set"}
                            </p>
                        </div>

                        <div class="col-md-4">
                            <strong>Time:</strong>
                            <p>${request.event_time || "Not set"}</p>
                        </div>

                        <div class="col-md-4">
                            <strong>Budget:</strong>
                            <p>
                                ${request.budget
                                    ? `GH₵ ${request.budget}`
                                    : "Not set"}
                            </p>
                        </div>

                        <div class="col-12">
                            <strong>Location:</strong>
                            <p>${request.location}</p>
                        </div>

                        <div class="col-12">
                            <strong>Message:</strong>
                            <p>${request.message || "No extra details"}</p>
                        </div>

                    </div>

                    <a href="https://wa.me/${request.phone}?text=${encodeURIComponent(
                        `Hello ${request.fullname}, we received your ESTEESBITES catering request for ${request.event_type}.`
                    )}"
                       target="_blank"
                       class="btn btn-success btn-sm mt-3">
                        WhatsApp Customer
                    </a>
                    
                <button class="btn btn-outline-danger btn-sm mt-2 delete-catering-btn"
                        data-id="${request.id}">
                    Delete Request
                </button>

                </div>

            `;
        });

        adminCateringContainer.innerHTML = cards;
    })

    .catch(error => {
        console.log(error);

        adminCateringContainer.innerHTML = `
            <div class="alert alert-danger">
                Failed to load catering requests.
            </div>
        `;
    });
}

// =========================
// SUPPORT MESSAGE FORM
// =========================

const supportForm =
    document.getElementById("support-form");

if (supportForm) {

    supportForm.addEventListener("submit", async (e) => {

        e.preventDefault();

        const supportData = {
            fullname: document.getElementById("support-fullname").value.trim(),
            phone: document.getElementById("support-phone").value.trim(),
            email: document.getElementById("support-email").value.trim(),
            subject: document.getElementById("support-subject").value.trim(),
            message: document.getElementById("support-message").value.trim()
        };

        try {

            const response = await fetch(`${API_URL}/api/support-messages`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(supportData)
            });

            const data = await response.json();

            if (!response.ok) {
                showToast(data.message || "Failed to send message", "error");
                return;
            }

            showToast("Support message sent successfully", "success");

            supportForm.reset();

        } catch (error) {

            console.log(error);
            showToast("Something went wrong", "error");

        }

    });

}

// =========================
// ADMIN: LOAD SUPPORT MESSAGES
// =========================

const adminSupportContainer =
    document.getElementById("admin-support-container");

if (adminSupportContainer) {

    fetch(`${API_URL}/api/admin/support-messages`, {
        headers: {
            Authorization:
            `Bearer ${localStorage.getItem("token")}`
        }
    })

    .then(response => response.json())

    .then(messages => {

        if (!messages || messages.length === 0) {
            adminSupportContainer.innerHTML = `
                <div class="alert alert-warning">
                    No support messages yet.
                </div>
            `;
            return;
        }

        let cards = "";

        messages.forEach(msg => {

            cards += `
                <div class="card shadow-sm border-0 rounded-4 p-4 mb-3">

                    <div class="d-flex justify-content-between flex-wrap gap-2">

                        <div>
                            <h5 class="fw-bold mb-1">
                                ${msg.subject}
                            </h5>

                            <p class="text-muted mb-0">
                                From: ${msg.fullname}
                            </p>
                        </div>

                        <span class="badge bg-info text-dark align-self-start">
                            ${msg.status}
                        </span>

                    </div>

                    <hr>

                    <p>
                        ${msg.message}
                    </p>

                    <div class="row g-3">

                        <div class="col-md-4">
                            <strong>Phone:</strong>
                            <p>${msg.phone}</p>
                        </div>

                        <div class="col-md-4">
                            <strong>Email:</strong>
                            <p>${msg.email || "Not provided"}</p>
                        </div>

                        <div class="col-md-4">
                            <strong>Date:</strong>
                            <p>${new Date(msg.created_at).toLocaleString()}</p>
                        </div>

                    </div>

                    <a href="https://wa.me/${msg.phone}?text=${encodeURIComponent(
                        `Hello ${msg.fullname}, we received your ESTEESBITES support message about "${msg.subject}".`
                    )}"
                       target="_blank"
                       class="btn btn-success btn-sm mt-2">
                        Reply on WhatsApp
                    </a>

                    <div class="d-flex gap-2 flex-wrap mt-3">

                        <button class="btn btn-outline-dark btn-sm resolve-support-btn"
                                data-id="${msg.id}">
                            Mark Resolved
                        </button>

                        <button class="btn btn-outline-danger btn-sm delete-support-btn"
                                data-id="${msg.id}">
                            Delete
                        </button>

                    </div>

                </div>
            `;
        });

        adminSupportContainer.innerHTML = cards;
    })

    .catch(error => {
        console.log(error);

        adminSupportContainer.innerHTML = `
            <div class="alert alert-danger">
                Failed to load support messages.
            </div>
        `;
    });
}

// =========================
// ADMIN: SUPPORT ACTIONS
// =========================

document.addEventListener("click", async (e) => {

    // Mark resolved
    if (e.target.classList.contains("resolve-support-btn")) {

        const id = e.target.dataset.id;

        const response = await fetch(
            `${API_URL}/api/admin/support-messages/${id}/resolve`,
            {
                method: "PUT",
                headers: {
                    Authorization:
                    `Bearer ${localStorage.getItem("token")}`
                }
            }
        );

        const data = await response.json();

        if (!response.ok) {
            showToast(data.message, "error");
            return;
        }

        showToast("Support message resolved", "success");
        location.reload();
    }

    // Delete
    if (e.target.classList.contains("delete-support-btn")) {

        const id = e.target.dataset.id;

        if (!confirm("Delete this support message?")) return;

        const response = await fetch(
            `${API_URL}/api/admin/support-messages/${id}`,
            {
                method: "DELETE",
                headers: {
                    Authorization:
                    `Bearer ${localStorage.getItem("token")}`
                }
            }
        );

        const data = await response.json();

        if (!response.ok) {
            showToast(data.message, "error");
            return;
        }

        showToast("Support message deleted", "success");
        location.reload();
    }

});

// =========================
// ADMIN: DELETE CATERING REQUEST
// =========================

document.addEventListener("click", async (e) => {

    if (!e.target.classList.contains("delete-catering-btn")) return;

    const requestId = e.target.dataset.id;

    const confirmDelete =
        confirm("Delete this catering request?");

    if (!confirmDelete) return;

    try {
        const response = await fetch(
            `${API_URL}/api/admin/catering-requests/${requestId}`,
            {
                method: "DELETE",
                headers: {
                    Authorization:
                    `Bearer ${localStorage.getItem("token")}`
                }
            }
        );

        const data = await response.json();

        if (!response.ok) {
            showToast(data.message, "error");
            return;
        }

        showToast("Catering request deleted", "success");

        location.reload();

    } catch (error) {
        console.log(error);
        showToast("Something went wrong", "error");
    }
});
