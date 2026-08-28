#target illustrator

// ============================================================
// CANVA 9 FONTS TEXT GENERATOR (PREMIUM EDITION)
// 3000x3000 Grid Layout & Auto-Outlined for Shutterstock
// ============================================================

function main() {
    // 1. Prompt User for Text
    var userText = prompt("Enter the text to generate in 9 Canva Fonts:", "Your Text Here", "Premium Canva Fonts Generator");
    if (!userText || userText.replace(/^\s+|\s+$/g, '') === "") return; 
    
    // 2. Prompt for colorful option
    var isColorful = confirm("Do you want COLORFUL text?\n\n(Click 'Yes' for beautiful typographic colors, or 'No' for classic black)");
    
    // Create new 4MP+ document (4500 x 3000)
    var doc = app.documents.add(DocumentColorSpace.CMYK, 4500, 3000);
    
    // Set standard colors
    var black = new CMYKColor(); black.cyan=0; black.magenta=0; black.yellow=0; black.black=100;
    var gray = new CMYKColor(); gray.cyan=0; gray.magenta=0; gray.yellow=0; gray.black=60;
    var lightGray = new CMYKColor(); lightGray.cyan=0; lightGray.magenta=0; lightGray.yellow=0; lightGray.black=15;
    var white = new CMYKColor(); white.cyan=0; white.magenta=0; white.yellow=0; white.black=0;
    var cyanTone = new CMYKColor(); cyanTone.cyan=70; cyanTone.magenta=0; cyanTone.yellow=0; cyanTone.black=0; // Badge color
    
    // Vibrant colors for typographic art
    var vibrantColors = [
        [0, 90, 85, 0],   // Bright Red
        [80, 10, 0, 0],   // Vibrant Cyan
        [0, 50, 100, 0],  // Orange
        [65, 0, 100, 0],  // Leaf Green
        [60, 90, 0, 0],   // Purple
        [0, 80, 20, 0],   // Hot Pink
        [100, 80, 0, 0],  // Deep Blue
        [10, 100, 100, 0] // Crimson
    ];
    function getRandomVibrantColor() {
        var c = new CMYKColor();
        var arr = vibrantColors[Math.floor(Math.random() * vibrantColors.length)];
        c.cyan = arr[0]; c.magenta = arr[1]; c.yellow = arr[2]; c.black = arr[3];
        return c;
    }
    
    // Font configuration (PostScript names from Illustrator)
    var fontConfigs = [
        { label: "1. Adventure Await", names: ["ADVENTUREAWAITRegular"] },
        { label: "2. Amsterdam", names: ["Amsterdam-Regular"] },
        { label: "3. Blubly Demo", names: ["BlublyDemo-Regular"] },
        { label: "4. ByteBounce", names: ["ByteBounce"] },
        { label: "5. Good Vibes", names: ["GoodVibes"] },
        { label: "6. Holiday", names: ["Holiday-Regular"] },
        { label: "7. Nerdropol Lattice", names: ["NerdropolLattice-Regular"] },
        { label: "8. Quivert", names: ["QuivertRegular"] },
        { label: "9. Sweet Apricot", names: ["SweetApricotRegular"] }
    ];
    
    // Helper function to find a working font
    function getWorkingFont(namesArray) {
        for (var i = 0; i < namesArray.length; i++) {
            try {
                var font = app.textFonts.getByName(namesArray[i]);
                if (font) return font;
            } catch (e) {}
        }
        return app.textFonts[0]; 
    }

    // Grid properties
    var cardW = 1350; // Larger cards
    var cardH = 750;
    var startX = 125; // Perfectly centered ( (4500 - 4250) / 2 )
    var startY = doc.artboards[0].artboardRect[1] - 225; // Centered for 3 rows ( (3000 - 2550) / 2 )
    var spacingX = 1450; // Col spacing
    var spacingY = 900;  // Row spacing
    var cols = 3;

    for (var i = 0; i < fontConfigs.length; i++) {
        var cfg = fontConfigs[i];
        var row = Math.floor(i / cols);
        var col = i % cols;
        var cx = startX + col * spacingX;
        var cy = startY - row * spacingY;
        
        // --- DRAW CARD BACKGROUND ---
        var g = doc.groupItems.add();
        var card = g.pathItems.roundedRectangle(cy, cx, cardW, cardH, 20, 20);
        card.filled = true; card.fillColor = white;
        card.stroked = true; card.strokeColor = lightGray; card.strokeWidth = 3;
        
        // Removed the badge and badge number to keep the design clean
        
        // --- DRAW FONT LABEL ---
        var workingFont = getWorkingFont(cfg.names);
        var label = g.textFrames.add();
        label.contents = cfg.label; // Removed the bracketed font name so it fits inside the box
        label.textRange.characterAttributes.size = 80; // Much larger label font
        label.textRange.characterAttributes.fillColor = gray;
        // Position label at bottom center initially
        label.position = [cx + 100, cy - cardH + 130];
        
        // --- DRAW MAIN TEXT ---
        var mainText = g.textFrames.add();
        mainText.contents = userText;
        mainText.textRange.characterAttributes.textFont = workingFont;
        mainText.textRange.characterAttributes.size = 150; // Initial size before scaling
        mainText.textRange.characterAttributes.fillColor = isColorful ? getRandomVibrantColor() : black;
        mainText.position = [cx + 100, cy - 250]; // Approx position
        
        // --- CRITICAL STEP: OUTLINE AND RESIZE ---
        // Outline text to convert it into Vector Paths (Required by Shutterstock)
        var outlinedText = mainText.createOutline();
        
        // Auto-Scale to ensure consistent width across all fonts
        var targetWidth = 1100;
        var targetMaxHeight = 400;
        
        if (outlinedText.width > 0 && outlinedText.height > 0) {
            var scaleX = (targetWidth / outlinedText.width) * 100;
            var scaleY = scaleX; // Keep aspect ratio
            
            // Check if scaling makes it too tall, if so scale by height instead
            if ((outlinedText.height * (scaleY/100)) > targetMaxHeight) {
                scaleY = (targetMaxHeight / outlinedText.height) * 100;
                scaleX = scaleY;
            }
            
            // Protect against Infinity or NaN
            if (!isNaN(scaleX) && !isNaN(scaleY) && scaleX > 0 && scaleY > 0 && isFinite(scaleX) && isFinite(scaleY)) {
                outlinedText.resize(scaleX, scaleY);
            }
            
            // --- PERFECT CENTERING ---
            // Center the outlined text exactly in the middle of the card
            outlinedText.left = cx + (cardW - outlinedText.width) / 2;
            outlinedText.top = cy - (cardH - outlinedText.height) / 2 + 20; // Shift up slightly for label
        } else {
            // Fallback if the font doesn't support the characters (e.g., Bengali text in Latin fonts)
            outlinedText.left = cx + (cardW) / 2;
            outlinedText.top = cy - (cardH) / 2;
        }
        
        // Center the label exactly at the bottom of the card
        var outlinedLabel = label.createOutline();
        outlinedLabel.left = cx + (cardW - outlinedLabel.width) / 2;
        
        // Badge outlining removed
    }
    
    app.redraw();
    alert("Success!\nAll 9 fonts generated, auto-scaled, grouped in a premium 3x3 grid, and OUTLINED for Shutterstock.");
}

main();
