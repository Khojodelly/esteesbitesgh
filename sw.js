// =========================
// SERVICE WORKER
// Handles push notifications
// =========================

self.addEventListener("push", (event) => {

    const data = event.data
        ? event.data.json()
        : {
            title: "ESTEESBITES",
            body: "You have a new notification."
        };

    const options = {
        body: data.body,
        icon: "images/chef.jpg",
        badge: "images/chef.jpg"
    };

    event.waitUntil(
        self.registration.showNotification(
            data.title,
            options
        )
    );
});