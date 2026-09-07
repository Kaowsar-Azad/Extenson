#target illustrator

// =============================================================================
// CLASSY STOCK ICON SET SIDEBAR BANNER GENERATOR (DYNAMICALLY PROPORTIONAL)
// Specifically tailored for Adobe Stock, Freepik, and Envato icon presentations.
//  - Fully Proportional: ALL text, badge, hero space, and spacing scale seamlessly
//    with the banner's actual width and height (NO tiny text on large artboards!).
//  - ZERO fake icons: Top hero space is reserved exclusively for YOUR icons.
//  - Classy Gradient Background with ambient corner glow and sleek dividing border.
//  - High-impact Two-Tone Title (White + Vibrant Accent).
//  - Prominent "21 Icon Set" Pill Badge (extra bold, scalable buyer-magnet).
//  - "100% VECTOR • EDITABLE" quality subtitle and 5-star rating.
//  - Completely leaves your white icon page untouched!
// =============================================================================

function main() {
    if (app.documents.length === 0) {
        alert("Please open your Illustrator document first!");
        return;
    }

    var doc = app.activeDocument;
    var abIndex = doc.artboards.getActiveArtboardIndex();
    var ab = doc.artboards[abIndex];
    var abBounds = ab.artboardRect; // [left, top, right, bottom]
    var abL = abBounds[0];
    var abT = abBounds[1];
    var abR = abBounds[2];
    var abB = abBounds[3];
    var abW = Math.abs(abR - abL);
    var abH = Math.abs(abT - abB);

    // Check if user has selected an icon on the artboard
    var userSelection = doc.selection;
    var selectedItem = (userSelection && userSelection.length > 0) ? userSelection[0] : null;

    // ─────────────────────────────────────────────────────────────────────────
    // 1. SCRIPTUI DIALOG
    // ─────────────────────────────────────────────────────────────────────────
    var dlg = new Window("dialog", "Classy Stock Banner Generator (Proportional)");
    dlg.orientation = "column";
    dlg.alignChildren = ["fill", "top"];
    dlg.spacing = 12;
    dlg.margins = 18;

    // A. Title Section
    var pnlTitle = dlg.add("panel", undefined, "Banner Typography (Two-Tone Title)");
    pnlTitle.orientation = "column";
    pnlTitle.alignChildren = ["fill", "top"];
    pnlTitle.spacing = 8;
    pnlTitle.margins = 12;

    var grpT1 = pnlTitle.add("group");
    grpT1.add("statictext", undefined, "Title Line 1 (White):");
    var txtT1 = grpT1.add("edittext", undefined, "ENGINEERING");
    txtT1.preferredSize = [240, 26];

    var grpT2 = pnlTitle.add("group");
    grpT2.add("statictext", undefined, "Title Line 2 (Accent):");
    var txtT2 = grpT2.add("edittext", undefined, "ICONS");
    txtT2.preferredSize = [240, 26];

    // B. Badge & Counter Section
    var pnlBadge = dlg.add("panel", undefined, "Buyer Badge (Large & Prominent)");
    pnlBadge.orientation = "column";
    pnlBadge.alignChildren = ["fill", "top"];
    pnlBadge.spacing = 8;
    pnlBadge.margins = 12;

    var grpCount = pnlBadge.add("group");
    grpCount.add("statictext", undefined, "Icon Count:");
    var txtCount = grpCount.add("edittext", undefined, "21");
    txtCount.characters = 5;

    grpCount.add("statictext", undefined, "Badge Text:");
    var txtSuffix = grpCount.add("edittext", undefined, "Icon Set");
    txtSuffix.characters = 12;

    var grpTag = pnlBadge.add("group");
    grpTag.add("statictext", undefined, "Bottom Tagline:");
    var txtTag = grpTag.add("edittext", undefined, "100% VECTOR • EDITABLE");
    txtTag.preferredSize = [240, 26];

    // C. Theme & Hero Options
    var pnlTheme = dlg.add("panel", undefined, "Classy Color Theme & Top Hero Icon");
    pnlTheme.orientation = "column";
    pnlTheme.alignChildren = ["fill", "top"];
    pnlTheme.spacing = 8;
    pnlTheme.margins = 12;

    var themeNames = [
        "1. Cloud Navy Gradient & Sky Cyan (Reference Match)",
        "2. Cyber Tech & Electric Neon Violet",
        "3. Emerald Luxury & Mint Green",
        "4. Deep Crimson & Flame Coral",
        "5. Royal Midnight & Amber Gold",
        "6. Dark Charcoal & Electric Blue"
    ];
    var grpTheme = pnlTheme.add("group");
    grpTheme.add("statictext", undefined, "Color Theme:");
    var ddTheme = grpTheme.add("dropdownlist", undefined, themeNames);
    ddTheme.selection = 0;
    ddTheme.preferredSize = [250, 26];

    // Hero Icon Checkbox
    var chkUseSelected = pnlTheme.add("checkbox", undefined, "Place a copy of my selected icon in the top Hero spot");
    if (selectedItem) {
        chkUseSelected.value = true;
        chkUseSelected.text = "Place a copy of my SELECTED ICON in top Hero spot";
    } else {
        chkUseSelected.value = false;
        chkUseSelected.text = "Leave top Hero space EMPTY (I will place my icon manually)";
    }

    // D. Sizing & Scaling Options
    var pnlScale = dlg.add("panel", undefined, "Banner Sizing & Proportions");
    pnlScale.orientation = "column";
    pnlScale.alignChildren = ["fill", "top"];
    pnlScale.spacing = 8;
    pnlScale.margins = 12;

    var grpWidth = pnlScale.add("group");
    grpWidth.add("statictext", undefined, "Banner Width (% of page):");
    var txtWidthPct = grpWidth.add("edittext", undefined, "27");
    txtWidthPct.characters = 4;
    grpWidth.add("statictext", undefined, "%");

    var scaleOptions = ["85% (Compact)", "100% (Standard Large)", "115% (Extra Large)", "130% (Massive)"];
    var grpTextScale = pnlScale.add("group");
    grpTextScale.add("statictext", undefined, "Text & Element Scale:");
    var ddScale = grpTextScale.add("dropdownlist", undefined, scaleOptions);
    ddScale.selection = 1; // 100%

    // E. Action Buttons
    var grpBtns = dlg.add("group");
    grpBtns.alignment = ["center", "bottom"];
    var btnOk = grpBtns.add("button", undefined, "Create Classy Banner", { name: "ok" });
    var btnCancel = grpBtns.add("button", undefined, "Cancel", { name: "cancel" });

    if (dlg.show() !== 1) {
        return; // User cancelled
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2. PARSE USER CHOICES
    // ─────────────────────────────────────────────────────────────────────────
    var title1 = txtT1.text.replace(/^\s+|\s+$/g, '').toUpperCase();
    var title2 = txtT2.text.replace(/^\s+|\s+$/g, '').toUpperCase();
    var countVal = txtCount.text.replace(/^\s+|\s+$/g, '');
    var suffixVal = txtSuffix.text.replace(/^\s+|\s+$/g, '');
    var badgeFullText = countVal + " " + suffixVal;
    var bottomTagText = txtTag.text.replace(/^\s+|\s+$/g, '').toUpperCase();
    var themeIdx = ddTheme.selection ? ddTheme.selection.index : 0;
    var useSelectedIcon = chkUseSelected.value && selectedItem;

    var widthPct = parseFloat(txtWidthPct.text);
    if (isNaN(widthPct) || widthPct < 15 || widthPct > 50) widthPct = 27;

    var scaleMultipliers = [0.85, 1.0, 1.15, 1.30];
    var scaleMultiplier = scaleMultipliers[ddScale.selection ? ddScale.selection.index : 1];

    // ─────────────────────────────────────────────────────────────────────────
    // 3. COLOR PALETTES (RGB & CMYK safe)
    // ─────────────────────────────────────────────────────────────────────────
    var isRGB = doc.documentColorSpace === DocumentColorSpace.RGB;

    function clr(r, g, b, c, m, y, k) {
        if (isRGB) {
            var rgbC = new RGBColor();
            rgbC.red = r; rgbC.green = g; rgbC.blue = b;
            return rgbC;
        } else {
            var cmykC = new CMYKColor();
            cmykC.cyan = c; cmykC.magenta = m; cmykC.yellow = y; cmykC.black = k;
            return cmykC;
        }
    }

    var palettes = [
        // 0. Cloud Navy & Sky Cyan
        {
            bgTop: clr(8, 28, 54, 100, 85, 30, 60),
            bgBottom: clr(13, 50, 94, 100, 70, 15, 25),
            accent: clr(0, 210, 255, 75, 10, 0, 0),
            accentSoft: clr(0, 168, 232, 75, 15, 0, 0),
            textDark: clr(8, 28, 54, 100, 85, 30, 60),
            pillBg: clr(255, 255, 255, 0, 0, 0, 0)
        },
        // 1. Cyber Tech & Violet
        {
            bgTop: clr(20, 10, 40, 90, 95, 30, 60),
            bgBottom: clr(42, 18, 80, 80, 90, 15, 20),
            accent: clr(168, 85, 247, 50, 75, 0, 0),
            accentSoft: clr(139, 92, 246, 60, 70, 0, 0),
            textDark: clr(20, 10, 40, 90, 95, 30, 60),
            pillBg: clr(255, 255, 255, 0, 0, 0, 0)
        },
        // 2. Emerald Luxury & Mint
        {
            bgTop: clr(4, 44, 34, 90, 40, 75, 60),
            bgBottom: clr(8, 76, 56, 90, 30, 70, 30),
            accent: clr(16, 185, 129, 75, 0, 60, 0),
            accentSoft: clr(52, 211, 153, 65, 0, 50, 0),
            textDark: clr(4, 44, 34, 90, 40, 75, 60),
            pillBg: clr(255, 255, 255, 0, 0, 0, 0)
        },
        // 3. Deep Crimson & Coral
        {
            bgTop: clr(44, 6, 16, 50, 95, 65, 65),
            bgBottom: clr(80, 12, 30, 40, 95, 60, 40),
            accent: clr(255, 90, 40, 0, 80, 90, 0),
            accentSoft: clr(255, 120, 60, 0, 65, 80, 0),
            textDark: clr(44, 6, 16, 50, 95, 65, 65),
            pillBg: clr(255, 255, 255, 0, 0, 0, 0)
        },
        // 4. Royal Midnight & Gold
        {
            bgTop: clr(11, 18, 34, 85, 75, 45, 70),
            bgBottom: clr(22, 36, 68, 85, 65, 30, 45),
            accent: clr(251, 191, 36, 0, 30, 95, 0),
            accentSoft: clr(245, 158, 11, 0, 40, 100, 0),
            textDark: clr(11, 18, 34, 85, 75, 45, 70),
            pillBg: clr(255, 255, 255, 0, 0, 0, 0)
        },
        // 5. Dark Charcoal & Electric Blue
        {
            bgTop: clr(18, 18, 22, 70, 65, 60, 80),
            bgBottom: clr(32, 32, 40, 65, 60, 50, 65),
            accent: clr(59, 130, 246, 75, 45, 0, 0),
            accentSoft: clr(96, 165, 250, 65, 30, 0, 0),
            textDark: clr(18, 18, 22, 70, 65, 60, 80),
            pillBg: clr(255, 255, 255, 0, 0, 0, 0)
        }
    ];

    var pal = palettes[themeIdx];
    var cWhite = clr(255, 255, 255, 0, 0, 0, 0);

    // ─────────────────────────────────────────────────────────────────────────
    // 4. DYNAMIC PROPORTIONAL DIMENSIONS (NO HARDCODED SMALL NUMBERS!)
    // ─────────────────────────────────────────────────────────────────────────
    var sbW = Math.round(abW * (widthPct / 100));
    var sbL = abR - sbW;
    var sbCX = sbL + sbW / 2;

    // Create Main Banner Group
    var gBanner = doc.groupItems.add();
    gBanner.name = "Classy_Stock_Banner";

    // 1. CLASSY GRADIENT BACKGROUND
    var bgRect = gBanner.pathItems.rectangle(abT, sbL, sbW, abH);
    
    var gradName = "ClassyBgGrad_" + themeIdx;
    var bgGrad = null;
    try { bgGrad = doc.gradients.getByName(gradName); } catch(e) {}
    if (!bgGrad) {
        bgGrad = doc.gradients.add();
        bgGrad.name = gradName;
        bgGrad.type = GradientType.LINEAR;
        bgGrad.gradientStops[0].rampPoint = 0;
        bgGrad.gradientStops[0].color = pal.bgTop;
        bgGrad.gradientStops[1].rampPoint = 100;
        bgGrad.gradientStops[1].color = pal.bgBottom;
    }
    var gc = new GradientColor();
    gc.gradient = bgGrad;
    gc.angle = -75; // Sleek modern diagonal gradient angle
    bgRect.filled = true;
    bgRect.fillColor = gc;
    bgRect.stroked = false;

    // 2. LEFT DIVIDING BORDER LINE (Cleanly separates sidebar from icon canvas)
    var divLineWidth = Math.max(3, Math.round(sbW * 0.005));
    var divLine = gBanner.pathItems.add();
    divLine.setEntirePath([[sbL, abT], [sbL, abB]]);
    divLine.filled = false;
    divLine.stroked = true;
    divLine.strokeColor = pal.accent;
    divLine.strokeWidth = divLineWidth;
    try { divLine.opacity = 60; } catch(e) {}

    // Typography Helper
    function makeText(g, str, cx, topY, size, color, bold, tracking) {
        var tf = g.textFrames.add();
        tf.contents = str;
        var ca = tf.textRange.characterAttributes;
        ca.size = size;
        ca.fillColor = color;
        if (tracking) {
            try { ca.tracking = tracking; } catch(e) {}
        }
        try {
            ca.textFont = app.textFonts.getByName(bold ? "Montserrat-Bold" : "Montserrat-Regular");
        } catch(e) {
            try {
                ca.textFont = app.textFonts.getByName(bold ? "Arial-BoldMT" : "ArialMT");
            } catch(e2) {}
        }
        try {
            tf.textRange.paragraphAttributes.justification = Justification.CENTER;
        } catch(e3) {}

        tf.left = cx - tf.width / 2;
        tf.top = topY;
        return tf;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 5. TOP HERO ICON AREA (Fully proportional to sbW and abH)
    // ─────────────────────────────────────────────────────────────────────────
    var targetHeroSize = Math.round(Math.min(sbW * 0.48, abH * 0.22) * scaleMultiplier);
    var heroCenterY = abT - (abH * 0.17);

    var gHeroSpot = gBanner.groupItems.add();
    gHeroSpot.name = "Hero_Icon_Spot";

    // Ambient Halo Ring Guide
    var haloR = Math.round(targetHeroSize * 0.58);
    var halo = gHeroSpot.pathItems.ellipse(heroCenterY + haloR, sbCX - haloR, haloR * 2, haloR * 2);
    halo.filled = false;
    halo.stroked = true;
    halo.strokeColor = pal.accent;
    halo.strokeWidth = Math.max(2, Math.round(sbW * 0.004));
    try { halo.opacity = 25; } catch(e) {}

    if (useSelectedIcon && selectedItem) {
        var clone = selectedItem.duplicate(gHeroSpot, ElementPlacement.PLACEATEND);
        var cb = clone.visibleBounds;
        var maxD = Math.max(cb[2] - cb[0], cb[1] - cb[3]);
        if (maxD > 0) {
            var sF = (targetHeroSize / maxD) * 100;
            clone.resize(sF, sF, true, true, true, true, sF, Transformation.CENTER);
            var ncb = clone.visibleBounds;
            clone.translate(sbCX - (ncb[0] + ncb[2]) / 2, heroCenterY - (ncb[1] + ncb[3]) / 2);
        }
    }

    // Horizontal Accent Line below Hero space
    var uLineY = heroCenterY - (targetHeroSize * 0.55) - (abH * 0.02);
    var uLineW = Math.round(sbW * 0.45);
    var uLineStroke = Math.max(3, Math.round(sbW * 0.007));
    var uLine = gBanner.pathItems.add();
    uLine.setEntirePath([[sbCX - uLineW / 2, uLineY], [sbCX + uLineW / 2, uLineY]]);
    uLine.filled = false;
    uLine.stroked = true;
    uLine.strokeColor = pal.accent;
    uLine.strokeWidth = uLineStroke;
    uLine.strokeCap = StrokeCap.ROUNDENDCAP;

    // ─────────────────────────────────────────────────────────────────────────
    // 6. MAIN TITLE (Large, Dynamic & Two-Tone)
    // ─────────────────────────────────────────────────────────────────────────
    var titleSize = Math.round(sbW * 0.095 * scaleMultiplier);
    var curY = uLineY - (abH * 0.035);

    if (title1.length > 0) {
        makeText(gBanner, title1, sbCX, curY, titleSize, cWhite, true, 80);
        curY -= Math.round(titleSize * 1.25);
    }
    if (title2.length > 0) {
        var t2Size = Math.round(titleSize * 0.95);
        makeText(gBanner, title2, sbCX, curY, t2Size, pal.accent, true, 80);
        curY -= Math.round(t2Size * 1.35);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 7. PROMINENT "21 ICON SET" PILL BADGE (Fully Scaled with Banner Width)
    // ─────────────────────────────────────────────────────────────────────────
    curY -= (abH * 0.025);

    var pillH = Math.round(Math.min(sbW * 0.16, abH * 0.08) * scaleMultiplier);
    var pillW = Math.round(Math.min(sbW * 0.85, Math.max(sbW * 0.65, badgeFullText.length * pillH * 0.38 + pillH * 0.8)));
    var pillRadius = Math.round(pillH * 0.28);
    var pillBorderWidth = Math.max(2, Math.round(sbW * 0.005));
    var pillTop = curY;

    // Outer Glow / Border for Pill
    var pillBorder = gBanner.pathItems.roundedRectangle(
        pillTop + pillBorderWidth,
        sbCX - (pillW + pillBorderWidth * 2) / 2,
        pillW + pillBorderWidth * 2,
        pillH + pillBorderWidth * 2,
        pillRadius + pillBorderWidth, pillRadius + pillBorderWidth
    );
    pillBorder.filled = false;
    pillBorder.stroked = true;
    pillBorder.strokeColor = pal.accent;
    pillBorder.strokeWidth = pillBorderWidth;

    // Solid White Pill
    var pill = gBanner.pathItems.roundedRectangle(
        pillTop,
        sbCX - pillW / 2,
        pillW,
        pillH,
        pillRadius, pillRadius
    );
    pill.filled = true;
    pill.fillColor = pal.pillBg;
    pill.stroked = false;

    // Bold Badge Text (Proportional to pill height)
    var badgeFontSize = Math.round(pillH * 0.50);
    var badgeTextY = pillTop - (pillH / 2) + (badgeFontSize * 0.36);
    makeText(gBanner, badgeFullText, sbCX, badgeTextY, badgeFontSize, pal.textDark, true, 50);

    // ─────────────────────────────────────────────────────────────────────────
    // 8. FOOTER SUBTITLE TAG ("100% VECTOR • EDITABLE")
    // ─────────────────────────────────────────────────────────────────────────
    curY = pillTop - pillH - (abH * 0.04);
    var tagSize = Math.round(sbW * 0.048 * scaleMultiplier);
    makeText(gBanner, bottomTagText, sbCX, curY, tagSize, pal.accent, true, 140);

    // 5-Star quality rating row
    curY -= (tagSize * 1.35 + abH * 0.012);
    var starSize = Math.round(tagSize * 0.75);
    makeText(gBanner, "★  ★  ★  ★  ★", sbCX, curY, starSize, cWhite, true, 80);

    app.redraw();
    alert(
        "Classy Showcase Banner Created Successfully!\n\n" +
        "• Artboard Size: " + Math.round(abW) + " × " + Math.round(abH) + " px\n" +
        "• Banner Width: " + sbW + " px (" + widthPct + "%)\n" +
        "• Title Font Size: " + titleSize + " pt (Proportional)\n" +
        "• Badge Size: " + pillW + " × " + pillH + " px (Font: " + badgeFontSize + " pt)\n" +
        "• Scale Mode: " + scaleOptions[ddScale.selection ? ddScale.selection.index : 1] + "\n\n" +
        "Everything has scaled perfectly to fit your document width!"
    );
}

try {
    main();
} catch (err) {
    alert("Error creating Banner:\n" + err.message);
}
