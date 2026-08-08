const VERSION = "v1";
const CACHE_NAME = `sleepnote-crosspoint-${VERSION}`;

const APP_STATIC_RESOURCES = [
    "./",
    "./index.html",
    "./crosspoint.css",
    "./style.css",
    "./script.js",

    "./fonts/bitter.ttf",
    "./fonts/caveat.ttf",
    "./fonts/geist_mono.ttf",
    "./fonts/oswald.ttf",
    "./fonts/quicksand.ttf",
    "./fonts/roboto.ttf",
    "./fonts/sour_gummy.ttf",

    "./manifest.json",
    "./icons/192.png",
    "./icons/512.png"
]

self.addEventListener("install", (event) => {
    event.waitUntil(
        (async () => {
            const cache = await caches.open(CACHE_NAME);
            cache.addAll(APP_STATIC_RESOURCES);
        })()
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        (async () => {
            const names = await caches.keys();
            await Promise.all(
                names.map((name) => {
                    if (name !== CACHE_NAME) {
                        return caches.delete(name);
                    }
                    return;
                })
            );
            await clients.claim();
        })()
    );
});

// intercept with cached version on fetch
self.addEventListener("fetch", (event) => {
    // single page app, so always to go homepage
    if (event.request.mode === "navigate") {
        event.respondWith(caches.match("./"));
        return;
    }

    // other events
    event.respondWith(
        (async () => {
            const cache = await caches.open(CACHE_NAME);
            const cachedResponse = await cache.match(event.request.url);
            if (cachedResponse) {
                return cachedResponse;
            }
            return new Response(null, { status: 404 });
        })()
    );
});

