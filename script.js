const c = document.getElementById("render");
const ctx = c.getContext("2d");

const settingsForm = document.forms[0];
const downloadBtn = document.getElementById("download");
const uploadBtn = document.getElementById("upload");

const bodyIndentInput = settingsForm.elements["body-indent"],
    filePicker = settingsForm.elements["bg-img-file"],
    bgImgOpacityInput = settingsForm.elements["bg-img-opacity"],
    bgImgHposSelect = settingsForm.elements["bg-img-hpos"],
    bgImgVposSelect = settingsForm.elements["bg-img-vpos"],
    bgImgStretch = settingsForm.elements["bg-img-stretch"],
    bgImgRatioToggle = settingsForm.elements["bg-img-ratio"];

let currentSettings = {};

function updateRender() {
    updateSettingsFromForm();
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
        const file = filePicker.files[0];

        if (!file) {
            fillBackgroundColor();
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            let img = new Image();
            img.src = e.target.result;
            img.onload = () => {
                drawBackgroundImg(img);
                fillBackgroundColor();
            }
        }

        reader.readAsDataURL(file);
    }

    function drawBackgroundImg(img) {
        const imgOpacity = currentSettings["bg-img-opacity"],
            imgW = img.width,
            imgH = img.height,
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
                if (preserveRatio) dw = imgH * stretchFactor;
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
                if (preserveRatio) dw = imgH * stretchFactor;
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

function uploadBmp() {
    // Check device status http://crosspoint.local/api/status
    // if not connected, prompt user to connect "Device not connected"

    // Generate bitmap file
    const bmp = canvasToBmp();
    const url = URL.createObjectURL(bmp);

    // POST /upload
}

function showMessage(message, messageType) {
    // TODO: turn into a nice toast instead
    window.alert(messageType + ": " + message);
}

function invalidValueError(property, value) {
    let message = `Invalid ${property} value: ${value}`;
    showMessage(message, "error");
}

function updateSettingsFromForm() {
    let settings = {};

    for (const fieldName in settingsForm.elements) {
        if (!isNaN(fieldName)) continue;
        if (fieldName === "length") continue;
        if (fieldName === "item") continue;
        if (fieldName === "namedItem") continue;
        // skip indexes and built-in properties/functions

        const field = settingsForm.elements[fieldName];

        if (field instanceof Element && field.tagName.toLowerCase() == "button") continue;
        // skip buttons

        if (fieldName === "bg-img-file") {
            // it gets the special treatment
        }

        if (field instanceof Element) {
            switch (field.getAttribute("type")?.toLowerCase()) {
                case "checkbox":
                    settings[fieldName] = field.checked;
                    continue;
                case "number":
                    settings[fieldName] = parseFloat(field.value);
                    continue;
            }
        }

        settings[fieldName] = field.value;

    }

    currentSettings = settings;
}

function saveSettingsToLocalStorage() {
    console.log("TODO: actually save settings to localStorage");
}

function getSettingsFromLocalStorage() {
    const defaultSettings = {
        
    }
}

function generatePlatitude() {
    const platitudes = [
        "Now or Never",
        "Today's the Day",
        "Carpe Diem",
        "Let's Go Girls",
        "Hello Sunshine",
        "Do the Thing"
    ];

    return "✨ " + platitudes[Math.floor(Math.random() * platitudes.length)] + " ✨";
}

settingsForm.elements["heading-text"].value = generatePlatitude();

window.onload = (() => {
    updateRender();
    settingsForm.addEventListener("change", updateRender);
    downloadBtn.addEventListener("click", downloadBmp);
});