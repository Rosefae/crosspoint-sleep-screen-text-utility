const c = document.getElementById("render");
const ctx = c.getContext("2d");

const options = document.forms[0];
const downloadBtn = document.getElementById("download");

function updateRender() {
    console.log("Updating Canvas");
    // Clear canvas
    ctx.clearRect(0, 0, c.width, c.height);

    // Set size
    switch (options.elements["device"].value) {
        case "x3":
            c.width = 528;
            c.height = 792;
            break;
        case "x4":
            c.width = 480;
            c.height = 800;
            break;
    }

    // Grayscale
    ctx.filter = "grayscale(100)";

    // Set colors
    if (options.elements["invert-colors"].checked) {
        c.classList.add("inverted");
        var bgColor = "black";
        var fgColor = "white";
    }
    else {
        c.classList.remove("inverted");
        var bgColor = "white";
        var fgColor = "black";
    }

    // Draw background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, c.width, c.height);

    // Get Sizes
    const paddingSize = parseFloat(options.elements["h-padding"].value);
    const vPaddingSize = parseFloat(options.elements["v-padding"].value);
    const headingSize = parseFloat(options.elements["heading-size"].value);
    const gapSize = parseFloat(options.elements["gap-size"].value);
    const bodySize = parseFloat(options.elements["body-size"].value);
    const bodyLineHeight = parseFloat(options.elements["body-ln"].value);
    const indentSizeRaw = parseFloat(options.elements["body-indent"].value),
        firstLineIndent = indentSizeRaw > 0 ? indentSizeRaw : 0,
        hangingIndent = indentSizeRaw < 0 ? indentSizeRaw * -1 : 0;
    console.log(indentSizeRaw);


    // Draw text
    const maxLineWidth = c.width - 2 * paddingSize;
    var currVPos = vPaddingSize;
    ctx.fillStyle = fgColor;
    ctx.textBaseline = "top";

    // Heading text
    const headingText = options.elements["heading-text"].value;
    ctx.font = `bold ${headingSize}px Sour Gummy`;
    ctx.textAlign = "center";
    writeLineWithWrap(headingText, headingSize, 1, c.width / 2);

    // Body text
    const bodyText = options.elements["body-text"].value;
    ctx.font = `${bodySize}px Bitter`;
    ctx.textAlign = "left";

    currVPos += gapSize;

    // handle line break chars by rendering each line separately
    const bodyLines = bodyText.split(/\r?\n/);
    for (const line of bodyLines) {
        writeLineWithWrap(line, bodySize, bodyLineHeight, paddingSize, true);
    }

    function writeLineWithWrap(text, textSize, lineHeight, startXPos, indent = false) {
        const words = text.split(" ");
        var currLine = words[0];
        var currIndent = indent ? firstLineIndent : 0;

        for (const word of words.slice(1)) {
            let testLine = currLine + " " + word;
            let width = ctx.measureText(testLine).width;
            if (width > maxLineWidth - currIndent) {
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
}

function canvasToBmp() {
    // https://stackoverflow.com/questions/29652307/canvas-unable-to-generate-bmp-image-dataurl-in-chrome

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

function generatePlatitude() {
    const platitudes = [
        "Now or Never",
        "Today's the Day",
        "Carpe Diem",
        "Let's Go Girls",
        "Hello Sunshine",
        "Do the Thing"
    ];

    return "✨" + platitudes[Math.floor(Math.random() * platitudes.length)] + "✨";
}

options.elements["heading-text"].value = generatePlatitude();

window.onload = (() => {
    updateRender();
    options.addEventListener("change", updateRender);
    downloadBtn.addEventListener("click", downloadBmp);
});