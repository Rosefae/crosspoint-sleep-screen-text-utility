const c = document.getElementById("render");
const ctx = c.getContext("2d");

const settingsForm = document.forms[0],
    settingsFields = (() => {
        let form = settingsForm.elements;
        let fields = {};

        for (const fieldName in form) {
            if (!isNaN(fieldName)) continue;
            if (fieldName === "length") continue;
            if (fieldName === "item") continue;
            if (fieldName === "namedItem") continue;
            // skip indexes and built-in properties/functions

            const field = form[fieldName];
            if (getFormFieldType(field) === "button") continue;
            // skip buttons

            fields[fieldName] = field;
        }

        return fields;
    })();

const downloadBtn = document.getElementById("download");
const uploadBtn = document.getElementById("upload");

const bgFieldset = document.getElementById("bg-fieldset");
const messageContainer = document.getElementById("toast");

const bodyIndentInput = settingsFields["body-indent"],
    filePicker = settingsFields["bg-img-file"],
    bgImgPreview = document.getElementById("bg-img-preview"),
    bgImgOpacityInput = settingsFields["bg-img-opacity"],
    bgImgHposSelect = settingsFields["bg-img-hpos"],
    bgImgVposSelect = settingsFields["bg-img-vpos"],
    bgImgStretch = settingsFields["bg-img-stretch"],
    bgImgRatioToggle = settingsFields["bg-img-ratio"];

let currentSettings = {};

function updateRender() {
    currentSettings = getSettingsFromForm();
    console.log("Updating Canvas");
    // Clear canvas
    ctx.clearRect(0, 0, c.width, c.height);

    // Set size
    switch (currentSettings["device"]) {
        case "x3":
            c.width = 528;
            c.height = 792;
            break;
        case "x4":
            c.width = 480;
            c.height = 800;
            break;
        default:
            invalidValueError("device", currentSettings["device"]);
    }

    // Grayscale
    ctx.filter = "grayscale(100)";

    // Set colors
    if (currentSettings["invert-colors"]) {
        var bgColor = "black";
        var fgColor = "white";
    }
    else {
        var bgColor = "white";
        var fgColor = "black";
    }

    // Get Sizes
    const paddingSize = currentSettings["h-padding"];
    const vPaddingSize = currentSettings["v-padding"];
    const headingSize = currentSettings["heading-size"];
    const gapSize = currentSettings["gap-size"];
    const bodySize = currentSettings["body-size"];
    const bodyLineHeight = currentSettings["body-ln"];
    const bodyAlign = currentSettings["body-align"];

    // don't indent centered text
    let indentSizeRaw = 0;
    if (currentSettings["body-align"] == "center") {
        bodyIndentInput.disabled = true;
    }
    else {
        bodyIndentInput.disabled = false;
        indentSizeRaw = currentSettings["body-indent"];
    }

    // Draw text
    const maxLineWidth = c.width - 2 * paddingSize;
    var currVPos = vPaddingSize;
    ctx.fillStyle = fgColor;
    ctx.textBaseline = "top";

    // Heading text
    const headingText = currentSettings["heading-text"];
    ctx.font = `bold ${headingSize}px Sour Gummy`;
    let headingXPos;
    switch (currentSettings["heading-align"]) {
        case "left":
            ctx.textAlign = "left";
            headingXPos = paddingSize;
            break;
        case "center":
            ctx.textAlign = "center";
            headingXPos = c.width / 2;
            break;
        case "right":
            ctx.textAlign = "right";
            headingXPos = c.width - paddingSize;
            break;
        default:
            invalidValueError("Heading text alignment", currentSettings["heading-text"]);
    }
    writeLineWithWrap(headingText, headingSize, 1, headingXPos);

    // Body text
    const bodyText = currentSettings["body-text"];
    ctx.font = `${bodySize}px Bitter`;

    let bodyXPos,
        firstLineIndent = 0,
        hangingIndent = 0;
    switch (currentSettings["body-align"]) {
        case "left":
            ctx.textAlign = "left";
            bodyXPos = paddingSize;
            if (indentSizeRaw > 0) {
                firstLineIndent = indentSizeRaw;
            }
            else {
                hangingIndent = indentSizeRaw * -1;
            }
            break;
        case "center":
            ctx.textAlign = "center";
            bodyXPos = c.width / 2;
            break;
        case "right":
            ctx.textAlign = "right";
            bodyXPos = c.width - paddingSize;
            if (indentSizeRaw > 0) {
                firstLineIndent = indentSizeRaw * -1;
            }
            else {
                hangingIndent = indentSizeRaw;
            }
            break;
        default:
            invalidValueError("Body text alignment", currentSettings["body-align"]);
    }

    currVPos += gapSize;

    // handle line break chars by rendering each line separately
    const bodyLines = bodyText.split(/\r?\n/);
    for (const line of bodyLines) {
        writeLineWithWrap(line, bodySize, bodyLineHeight, bodyXPos, true);
    }

    // Draw background last as the async image loading can otherwise make layering unpredictable

    ctx.globalCompositeOperation = "destination-over";

    if (currentSettings["use-bg-img"]) {
        // enable bg img controls
        filePicker.disabled = false;
        bgImgOpacityInput.disabled = false;
        bgImgHposSelect.disabled = false;
        bgImgVposSelect.disabled = false;
        bgImgStretch.disabled = false;
        bgImgRatioToggle.disabled = false;

        if (bgImgStretch.value == "none") bgImgRatioToggle.disabled = true;

        bgFieldset.classList.remove("collapse");

        handleBackgroundImg();
    }
    else {
        // disable bg img controls
        filePicker.disabled = true;
        bgImgOpacityInput.disabled = true;
        bgImgHposSelect.disabled = true;
        bgImgVposSelect.disabled = true;
        bgImgStretch.disabled = true;
        bgImgRatioToggle.disabled = true;

        bgFieldset.classList.add("collapse");

        fillBackgroundColor();
    }

    saveSettingsToLocalStorage();

    // Helper functions

    function writeLineWithWrap(text, textSize, lineHeight, startXPos, indent = false) {
        const words = text.split(" ");
        var currLine = words[0];
        var currIndent = indent ? firstLineIndent : 0;

        for (const word of words.slice(1)) {
            let testLine = currLine + " " + word;
            let width = ctx.measureText(testLine).width;
            if (width > maxLineWidth - Math.abs(currIndent)) {
                // if this word would overflow the line, draw what we already have and start a new line
                writeCurrLine();
                currLine = word;
                var currIndent = indent ? hangingIndent : 0;
            }
            else {
                // else add this word to the line
                currLine = testLine;
            }
        }

        // Write final line
        writeCurrLine();

        function writeCurrLine() {
            ctx.fillText(currLine, startXPos + currIndent, currVPos);
            currVPos += textSize * lineHeight;
        }
    }

    function fillBackgroundColor() {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, c.width, c.height);
    }

    function handleBackgroundImg() {
        bgImgPreview.onload = () => {
            console.log("Updating Background Image");
            drawBackgroundImg();
            fillBackgroundColor();

            // save image data once image has loaded and drawn correctly
            currentSettings["bg-img-data"] = bgImgPreview.src;
            saveSettingsToLocalStorage();
        }

        // if new file
        const file = filePicker.files[0];
        if (file) {
            updateBgImgData(file);
            return;
        }
        
        // otherwise existing data
        const imgData = bgImgPreview.src;
        if (imgData) {
            bgImgPreview.src = imgData; // reload the image
            return;
        }

        // otherwise just draw the bg color
        fillBackgroundColor();

    }

    function drawBackgroundImg() {
        const img = bgImgPreview,
            imgOpacity = currentSettings["bg-img-opacity"],
            imgW = img.naturalWidth,
            imgH = img.naturalHeight,
            hpos = currentSettings["bg-img-hpos"],
            vpos = currentSettings["bg-img-vpos"],
            stretch = currentSettings["bg-img-stretch"],
            preserveRatio = currentSettings["bg-img-ratio"];

        let dx, dy,
            dw = imgW,
            dh = imgH;

        switch (stretch) {
            case "none":
                break;
            case "stretch-h": {
                let stretchFactor = getStretchFactor("stretch", "width");
                dw = imgW * stretchFactor;
                if (preserveRatio) dh = imgH * stretchFactor;
                break;
            }
            case "stretch-v": {
                let stretchFactor = getStretchFactor("stretch", "height");
                dh = imgH * stretchFactor;
                if (preserveRatio) dw = imgW * stretchFactor;
                break;
            }
            case "stretch-hv": {
                let hStretchFactor = getStretchFactor("stretch", "width");
                let vStretchFactor = getStretchFactor("stretch", "height");

                if (preserveRatio) {
                    let finalStretchFactor = Math.max(hStretchFactor, vStretchFactor);
                    dh = imgH * finalStretchFactor;
                    dw = imgW * finalStretchFactor;
                }
                else {
                    dh = imgH * vStretchFactor;
                    dw = imgW * hStretchFactor;
                }
                break;
            }
            case "shrink-h": {
                let stretchFactor = getStretchFactor("shrink", "width");
                dw = imgW * stretchFactor;
                if (preserveRatio) dh = imgH * stretchFactor;
                break;
            }
            case "shrink-v": {
                let stretchFactor = getStretchFactor("shrink", "height");
                dh = imgH * stretchFactor;
                if (preserveRatio) dw = imgW * stretchFactor;
                break;
            }
            case "shrink-hv": {
                let hStretchFactor = getStretchFactor("shrink", "width");
                let vStretchFactor = getStretchFactor("shrink", "height");

                if (preserveRatio) {
                    let finalStretchFactor = Math.min(hStretchFactor, vStretchFactor);
                    dh = imgH * finalStretchFactor;
                    dw = imgW * finalStretchFactor;
                }
                else {
                    dh = imgH * vStretchFactor;
                    dw = imgW * hStretchFactor;
                }
                break;
            }
            default:
                invalidValueError("BG image stretch", stretch);
        }
        
        switch (hpos) {
            case "left":
                dx = 0;
                break;
            case "center":
                dx = (c.width - dw) / 2;
                break;
            case "right":
                dx = c.width - dw;
                break;
            default:
                invalidValueError("BG image hpos", hpos);
        }

        switch (vpos) {
            case "top":
                dy = 0;
                break;
            case "center":
                dy = (c.height - dh) / 2;
                break;
            case "bottom":
                dy = c.height - dh;
                break;
            default:
                invalidValueError("BG image vpos", vpos);
        }

        ctx.globalAlpha = imgOpacity;
        ctx.drawImage(img, dx, dy, dw, dh);
        ctx.globalAlpha = 1;

        function getStretchFactor(stretchType, dimensionType) {
            let canvasDimension, imgDimension;

            if (dimensionType == "width") {
                canvasDimension = c.width;
                imgDimension = imgW;
            }
            else if (dimensionType == "height") {
                canvasDimension = c.height;
                imgDimension = imgH;
            }
            else {
                invalidValueError("dimensionType", dimensionType);
            }

            if (stretchType == "stretch") {
                return Math.max(1, canvasDimension / imgDimension);
            }
            else if (stretchType == "shrink") {
                return Math.min(1, canvasDimension / imgDimension);
            }
            else {
                invalidValueError("stretchType", stretchType);
            }
        }
    }
}

function updateBgImgData(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        let imgData = e.target.result;
        bgImgPreview.src = imgData;
    }

    reader.readAsDataURL(file);
}

function canvasToBmp() {
    // https://stackoverflow.com/questions/29652307/canvas-unable-to-generate-bmp-image-dataurl-in-chrome
    
    /*! canvas-to-bmp version 1.0 ALPHA
    (c) 2015 Ken "Epistemex" Fyrstenberg
    MIT License (this header required)
    */
    
    // Could probably modify this to be more efficient / compact since everything is grayscale and full opacity

    const w = c.width;
    const h = c.height;
    const w4 = w * 4;
    const imgData = ctx.getImageData(0, 0, w, h);
    const data32 = new Uint32Array(imgData.data.buffer);

    const stride = Math.floor((32 * w + 31) / 32) * 4; // row length w/ padding
    const pixelArraySize = stride * h; // bitmap size
    const fileLength = 122 + pixelArraySize;  // 122 is header size

    var file = new ArrayBuffer(fileLength);
    var view = new DataView(file);
    var pos = 0,
        x,
        y = 0,
        p,
        s = 0,
        a,
        v;

    // write file header
    setU16(0x4d42);          // BM
    setU32(fileLength);      // total length
    pos += 4;                // skip unused fields
    setU32(0x7a);            // offset to pixels

    // DIB header
    setU32(108);             // header size
    setU32(w);
    setU32(-h >>> 0);        // negative = top-to-bottom
    setU16(1);               // 1 plane
    setU16(32);              // 32-bits (RGBA)
    setU32(3);               // no compression (BI_BITFIELDS, 3)
    setU32(pixelArraySize);  // bitmap size incl. padding (stride x height)
    setU32(2835);            // pixels/meter h (~72 DPI x 39.3701 inch/m)
    setU32(2835);            // pixels/meter v
    pos += 8;                // skip color/important colors
    setU32(0xff0000);        // red channel mask
    setU32(0xff00);          // green channel mask
    setU32(0xff);            // blue channel mask
    setU32(0xff000000);      // alpha channel mask
    setU32(0x57696e20);      // " win" color space

    // bitmap data, change order of ABGR to BGRA
    while (y < h) {
        p = 0x7a + y * stride; // offset + stride x height
        x = 0;
        while (x < w4) {
            v = data32[s++];                     // get ABGR
            a = v >>> 24;                        // alpha channel
            view.setUint32(p + x, (v << 8) | a); // set BGRA
            x += 4;
        }
        y++
    }

    return new Blob([file], { type: "image/bmp" });

    // helper method to move current buffer position
    function setU16(data) { view.setUint16(pos, data, true); pos += 2 }
    function setU32(data) { view.setUint32(pos, data, true); pos += 4 }
}

function downloadBmp() {
    const bmp = canvasToBmp();
    const url = URL.createObjectURL(bmp);
    const link = document.createElement('a');
    link.href = url;
    link.download = "sleep.bmp";
    link.click();
}

async function uploadBmp() {    
    // No way of knowing if it worked or not due to CORS
    const crosspointUploadUrl = "http://crosspoint.local/upload",
        destinationPath = "/",
        postUrl = `${crosspointUploadUrl}?path=${destinationPath}`;
    
    // set button to show it's doing things
    uploadBtn.disabled = true;
    uploadBtn.classList.add("loading");

    // Generate bitmap file
    const bmp = canvasToBmp();
    const postData = new FormData();
    postData.append("file", bmp, "sleep.bmp");

    // Upload
    try {
        await fetch(postUrl, {
            method: "POST",
            mode: "no-cors",
            body: postData
        });
        // "no-cors" mode will avoid x-origin error, but
        // will result in opaque response, so no way to know if it worked
    }
    catch (error) {
        let message = "Upload failed! Make sure device is in File Transfer mode.";
        console.error(message, error);
        showMessage(message, true, 10000);
    }
    finally {
        uploadBtn.disabled = false;
        uploadBtn.classList.remove("loading");
    }
}

// async function uploadViaWebSocket() {
//     // websocket keeps closing with code 1006 or 1009, even with chunking and waiting for response
//     // giving up for now
    
//     const bmp = canvasToBmp(),
//         wsStartString = `START:sleep.bmp:${bmp.size}:/`;
    
//     const socketReadyEvent = new CustomEvent("socketReady");

//     try {
//         const socket = new WebSocket("ws://crosspoint.local:81");
//         socket.addEventListener("open", (event) => {
//             console.log("Websocket open");
//             socket.send(wsStartString);
//         });
//         socket.addEventListener("message", async (event) => {
//             const message = event.data;

//             if (message == "READY") {
//                 sendBmpAsChunks(socket);
//             }
//             else if (message == "DONE") {
//                 console.log("Upload done");
//                 socket.close();
//             }
//             else if (message.startsWith("PROGRESS:")) {
//                 console.log(message);
//                 socket.dispatchEvent(socketReadyEvent);
//             }
//             else if (message.startsWith("ERROR:")) {
//                 console.error(message);
//             }
//             else {
//                 console.log("Message from WebSocket: ", message);
//             }
//         });
//         socket.addEventListener("error", (event) => {
//             console.error("Websocket Error: ", event);
//         });
//         socket.addEventListener("close", (event) => {
//             console.log("Websocket Closed: ", event);
//         });
//     }
//     catch (error) {
//         console.error(error);
//         console.log("Could not connect! Make sure device is connected");
//     }

//     async function sendBmpAsChunks(socket) {
//         const CHUNK_SIZE = 1024 * 64; // 64kb
//         let offset = 0;

//         while (offset < bmp.size) {
//             const chunk = bmp.slice(offset, offset + CHUNK_SIZE),
//                 buffer = await chunk.arrayBuffer();
            
//             socket.send(buffer);
            
//             // wait for server to send a progress update
//             await new Promise((r) => {
//                 socket.addEventListener("socketReady", () => {
//                     resolve();
//                 }, {once: true});
//             });

//             offset += CHUNK_SIZE;
//         }
//     }
// }

function showMessage(message, isError = false, duration = 5000) { // TODO: turn into a nice toast instead
    messageContainer.append(message);
    if (isError) {
        messageContainer.classList.add("error");
    }

    window.setTimeout(() => {
        messageContainer.classList.remove("error");
        messageContainer.replaceChildren();
    }, duration);
    
}

function invalidValueError(property, value) {
    let message = `Invalid ${property} value: ${value}`;
    showMessage(message, true);
}

function getFormFieldType(field) {
    if (field instanceof RadioNodeList) return "radiogroup";

    if (field instanceof Element) {
        let tagName = field.tagName.toLowerCase();
        switch (tagName) {
            case "button":
            case "textarea":
            case "select":
                return tagName;
        }

        let typeAttr = field.getAttribute("type")?.toLowerCase();
        if (typeAttr) return typeAttr;
    }

    return "unknown";
}

function getSettingsFromForm() {
    let newSettings = {};

    for (const fieldName in settingsFields) {
        let field = settingsFields[fieldName],
            fieldType = getFormFieldType(field);

        switch (fieldType) {
            case "file":
                // special handling
                continue;
            case "checkbox":
                newSettings[fieldName] = field.checked;
                continue;
            case "number":
                newSettings[fieldName] = parseFloat(field.value);
                continue;
        }

        newSettings[fieldName] = field.value;
    }

    return newSettings;
}

function saveSettingsToLocalStorage() {
    let settingsString = JSON.stringify(currentSettings);
    localStorage.setItem("crosspoint-sleep-text", settingsString);
}

function updateFormFromLocalStorage() {
    let settings = { // defaults
        "device": "x3",
        "invert-colors": false,
        "h-padding": 30,
        "v-padding": 50,
        "use-bg-img": false,
        "bg-img-opacity": 0.9,
        "bg-img-hpos": "center",
        "bg-img-vpos": "bottom",
        "bg-img-stretch": "none",
        "bg-img-ratio": false,
        "heading-size": 48,
        "heading-align": "center",
        "heading-text": "🎯 Today's Tasks",
        "gap-size": 40,
        "body-size": 32,
        "body-ln": 1.6,
        "body-align": "left",
        "body-indent": -35,
        "body-text": "☐ Some task\n☐ Some other task\n☐ Oh my god you have so many tasks\n☒ Make a dumb web utility\n☐ Now with word wrap and hanging indentation: Lorem ipsum dolor sit amet, consectetur adipiscing elit. etc etc"
    }

    // fetch from localstorage
    const storedSettingString = localStorage.getItem("crosspoint-sleep-text");
    if (storedSettingString) {
        Object.assign(settings, JSON.parse(storedSettingString));
    }

    // update form fields
    for (const fieldName in settingsFields) {
        let field = settingsFields[fieldName],
            fieldType = getFormFieldType(field),
            storedValue = Object.hasOwn(settings, fieldName) ? settings[fieldName] : null;
        
        switch (fieldType) {
            case "file":
                // special handling
                continue;
            case "checkbox":
                field.checked = storedValue;
                break;
            default: 
                field.value = storedValue;
        }
    }

    // update bg image
    if (Object.hasOwn(settings, "bg-img-data")) {
        bgImgPreview.src = settings["bg-img-data"];
    }

    updateRender();
}

window.onload = (() => {
    updateFormFromLocalStorage();
    settingsForm.addEventListener("change", updateRender);
    downloadBtn.addEventListener("click", downloadBmp);
    uploadBtn.addEventListener("click", uploadBmp);
});