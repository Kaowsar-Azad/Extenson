#target illustrator

function main() {
    var docWidth = 3200;
    var docHeight = 1800;
    var doc = app.documents.add(DocumentColorSpace.CMYK, docWidth, docHeight);
    doc.rulerOrigin = [0, 0];
    
    function makeCMYK(c, m, y, k) { 
        var clr = new CMYKColor(); 
        clr.cyan = c; clr.magenta = m; clr.yellow = y; clr.black = k; 
        return clr; 
    }
    
    var cDark = makeCMYK(100, 75, 15, 40);   // Primary Navy
    var cAccent = makeCMYK(75, 10, 0, 0);     // Cyan Accent
    var cWhite = makeCMYK(0, 0, 0, 0);        // Pure White
    var strokeW = 4.5;
    
    function style(p, fC, sC, sW) {
        if (fC) { p.filled = true; p.fillColor = fC; } else { p.filled = false; }
        if (sC) { p.stroked = true; p.strokeColor = sC; p.strokeWidth = sW || strokeW; p.strokeCap = StrokeCap.ROUNDENDCAP; p.strokeJoin = StrokeJoin.ROUNDENDJOIN; } else { p.stroked = false; }
    }
    
    function cr(g, cx, cy, w, h, f, s, sW) { var p = g.pathItems.rectangle(cy + h/2, cx - w/2, w, h); style(p, f, s, sW); return p; }
    function crr(g, cx, cy, w, h, r, f, s, sW) { var p = g.pathItems.roundedRectangle(cy + h/2, cx - w/2, w, h, r, r); style(p, f, s, sW); return p; }
    function cc(g, cx, cy, r, f, s, sW) { var p = g.pathItems.ellipse(cy + r, cx - r, r*2, r*2); style(p, f, s, sW); return p; }
    function ce(g, cx, cy, rx, ry, f, s, sW) { var p = g.pathItems.ellipse(cy + ry, cx - rx, rx*2, ry*2); style(p, f, s, sW); return p; }
    function cl(g, x1, y1, x2, y2, s, sW) { var p = g.pathItems.add(); p.setEntirePath([[x1, y1], [x2, y2]]); style(p, null, s, sW); return p; }
    function cp(g, pts, closed, f, s, sW) { var p = g.pathItems.add(); p.setEntirePath(pts); p.closed = closed; style(p, f, s, sW); return p; }

    var abRect = doc.artboards[0].artboardRect;
    var abLeft = abRect[0], abTop = abRect[1], abRight = abRect[2], abBottom = abRect[3];
    var abHeight = Math.abs(abTop - abBottom);

    var gridW = 2400;
    var sbX = abLeft + gridW;
    var sbW = docWidth - gridW; // 800px

    // --- SIDEBAR BANNER ---
    var gSidebar = doc.groupItems.add();
    cr(gSidebar, sbX + sbW/2, abTop - abHeight/2, sbW, abHeight, cDark, null);
    
    var heroY = abTop - 350;
    crr(gSidebar, sbX + sbW/2, heroY, 260, 180, 20, cWhite, cAccent, 10);
    cl(gSidebar, sbX + sbW/2 - 130, heroY - 40, sbX + sbW/2 + 130, heroY - 40, cDark, 8);
    cp(gSidebar, [[sbX + sbW/2 - 30, heroY - 90], [sbX + sbW/2 + 30, heroY - 90], [sbX + sbW/2 + 45, heroY - 140], [sbX + sbW/2 - 45, heroY - 140]], true, cWhite, null);
    crr(gSidebar, sbX + sbW/2, heroY - 140, 160, 15, 7.5, cWhite, null);
    cc(gSidebar, sbX + sbW/2 + 60, heroY - 60, 40, cWhite, cDark, 10);
    cl(gSidebar, sbX + sbW/2 + 88, heroY - 88, sbX + sbW/2 + 120, heroY - 120, cDark, 14);

    function t(g, str, cx, y, size, color, bold) {
        var tf = g.textFrames.add();
        tf.contents = str;
        tf.textRange.characterAttributes.size = size;
        try { tf.textRange.characterAttributes.textFont = app.textFonts.getByName(bold ? "Montserrat-Bold" : "Montserrat-Regular"); } 
        catch(e) { try { tf.textRange.characterAttributes.textFont = app.textFonts.getByName("Arial-BoldMT"); } catch(e2) {} }
        tf.textRange.characterAttributes.fillColor = color;
        tf.left = cx - tf.width / 2;
        tf.top = y;
        return tf;
    }
    
    t(gSidebar, "DIGITAL TECH", sbX + sbW/2, abTop - 600, 60, cWhite, true);
    t(gSidebar, "& BUSINESS SEO", sbX + sbW/2, abTop - 680, 50, cAccent, true);
    crr(gSidebar, sbX + sbW/2, abTop - 800, 300, 80, 15, cWhite, null);
    t(gSidebar, "100 Icon Set", sbX + sbW/2, abTop - 775, 38, cDark, true);
    t(gSidebar, "FULLY EDITABLE", sbX + sbW/2, abTop - 1000, 65, cWhite, true);

    // --- PROCEDURAL ICONS GENERATOR ---
    var bases = [
        // 0: Screen
        function(g, x, y) { crr(g, x, y+5, 64, 44, 4, cWhite, cDark); cl(g, x, y-17, x, y-25, cDark); cl(g, x-15, y-25, x+15, y-25, cDark); },
        // 1: Cloud
        function(g, x, y) { cc(g, x, y+5, 20, cWhite, cDark); cc(g, x-15, y-2, 12, cWhite, cDark); cc(g, x+15, y-2, 12, cWhite, cDark); cr(g, x, y-7, 30, 14, cWhite, null); cl(g, x-27, y-14, x+27, y-14, cDark); },
        // 2: Shield
        function(g, x, y) { cp(g, [[x, y+24], [x+20, y+10], [x+20, y-5], [x, y-24], [x-20, y-5], [x-20, y+10]], true, cWhite, cDark); },
        // 3: Document
        function(g, x, y) { cp(g, [[x-18, y+26], [x+6, y+26], [x+18, y+14], [x+18, y-26], [x-18, y-26]], true, cWhite, cDark); cp(g, [[x+6, y+26], [x+6, y+14], [x+18, y+14]], true, cWhite, cDark); },
        // 4: Folder
        function(g, x, y) { cp(g, [[x-24, y+18], [x-6, y+18], [x, y+10], [x+24, y+10], [x+24, y-20], [x-24, y-20]], true, cWhite, cDark); },
        // 5: Mobile
        function(g, x, y) { crr(g, x, y, 36, 60, 6, cWhite, cDark); cc(g, x, y-20, 3, cDark, null); cl(g, x-6, y+22, x+6, y+22, cDark); },
        // 6: Server
        function(g, x, y) { crr(g, x, y+18, 50, 16, 3, cWhite, cDark); crr(g, x, y, 50, 16, 3, cWhite, cDark); crr(g, x, y-18, 50, 16, 3, cWhite, cDark); cc(g, x-15, y+18, 2, cDark, null); cc(g, x-15, y, 2, cDark, null); cc(g, x-15, y-18, 2, cDark, null); },
        // 7: Gear
        function(g, x, y) { cc(g, x, y, 22, cWhite, cDark); cc(g, x, y, 8, cWhite, cDark); cl(g, x, y+22, x, y+28, cDark); cl(g, x, y-22, x, y-28, cDark); cl(g, x+22, y, x+28, y, cDark); cl(g, x-22, y, x-28, y, cDark); cl(g, x+16, y+16, x+20, y+20, cDark); cl(g, x-16, y-16, x-20, y-20, cDark); cl(g, x+16, y-16, x+20, y-20, cDark); cl(g, x-16, y+16, x-20, y+20, cDark); },
        // 8: Globe
        function(g, x, y) { cc(g, x, y, 24, cWhite, cDark); ce(g, x, y, 10, 24, null, cDark); cl(g, x-24, y, x+24, y, cDark); },
        // 9: Node / Network
        function(g, x, y) { cc(g, x, y+12, 8, cWhite, cDark); cc(g, x-16, y-12, 8, cWhite, cDark); cc(g, x+16, y-12, 8, cWhite, cDark); cl(g, x-5, y+8, x-12, y-6, cDark); cl(g, x+5, y+8, x+12, y-6, cDark); cl(g, x-8, y-12, x+8, y-12, cDark); }
    ];

    var mods = [
        // 0: Search (Magnifier)
        function(g, x, y) { cc(g, x+14, y-14, 10, cWhite, cAccent); cl(g, x+21, y-21, x+28, y-28, cAccent, 6); },
        // 1: Security (Padlock)
        function(g, x, y) { crr(g, x+12, y-16, 16, 12, 2, cAccent, cDark); cp(g, [[x+8, y-10], [x+8, y-4], [x+16, y-4], [x+16, y-10]], false, null, cDark); },
        // 2: Verified (Checkmark)
        function(g, x, y) { cc(g, x+14, y-14, 12, cWhite, cAccent); cp(g, [[x+8, y-14], [x+12, y-18], [x+20, y-8]], false, null, cAccent); },
        // 3: Alert (Warning)
        function(g, x, y) { cp(g, [[x+14, y-4], [x+24, y-24], [x+4, y-24]], true, cWhite, cAccent); cl(g, x+14, y-12, x+14, y-18, cAccent); cc(g, x+14, y-21, 1, cAccent, null); },
        // 4: Analytics (Chart)
        function(g, x, y) { crr(g, x-8, y-8, 6, 16, 1, cAccent, null); crr(g, x, y-4, 6, 24, 1, cAccent, null); crr(g, x+8, y, 6, 32, 1, cAccent, null); },
        // 5: Code (</>)
        function(g, x, y) { cp(g, [[x-4, y+6], [x-10, y], [x-4, y-6]], false, null, cAccent); cp(g, [[x+4, y+6], [x+10, y], [x+4, y-6]], false, null, cAccent); cl(g, x+2, y+8, x-2, y-8, cAccent); },
        // 6: Media (Play)
        function(g, x, y) { cc(g, x, y, 16, cWhite, cAccent); cp(g, [[x-4, y+6], [x+6, y], [x-4, y-6]], true, cAccent, null); },
        // 7: Sync (Arrows)
        function(g, x, y) { cp(g, [[x-14, y], [x-14, y+10], [x+4, y+10]], false, null, cAccent); cp(g, [[x+14, y], [x+14, y-10], [x-4, y-10]], false, null, cAccent); cp(g, [[x, y+6], [x+6, y+10], [x, y+14]], true, cAccent, null); cp(g, [[x, y-6], [x-6, y-10], [x, y-14]], true, cAccent, null); },
        // 8: Network (Wi-fi)
        function(g, x, y) { cc(g, x, y-8, 3, cAccent, null); cp(g, [[x-8, y], [x, y+6], [x+8, y]], false, null, cAccent); cp(g, [[x-14, y+6], [x, y+16], [x+14, y+6]], false, null, cAccent); },
        // 9: AI (Sparkles)
        function(g, x, y) { cp(g, [[x+14, y-10], [x+18, y-18], [x+26, y-22], [x+18, y-26], [x+14, y-34], [x+10, y-26], [x+2, y-22], [x+10, y-18]], true, cAccent, null); cp(g, [[x+4, y-4], [x+6, y-8], [x+10, y-10], [x+6, y-12], [x+4, y-16], [x+2, y-12], [x-2, y-10], [x+2, y-8]], true, cAccent, null); }
    ];

    var baseNames = ["SCREEN", "CLOUD", "SECURITY", "DOCUMENT", "FOLDER", "MOBILE", "SERVER", "SYSTEM", "GLOBAL", "NETWORK"];
    var modNames = ["SEARCH", "LOCK", "VERIFIED", "ALERT", "ANALYTICS", "CODE", "MEDIA", "SYNC", "WIFI", "AI"];

    var cols = 10;
    var rows = 10;
    var cellW = gridW / cols;
    var cellH = abHeight / rows;

    for (var i = 0; i < 100; i++) {
        var baseIdx = Math.floor(i / 10);
        var modIdx = i % 10;
        
        var cx = abLeft + modIdx * cellW + cellW / 2;
        var cy = abTop - (baseIdx * cellH + cellH / 2) + 25;

        var gIcon = doc.groupItems.add();
        bases[baseIdx](gIcon, cx, cy);
        mods[modIdx](gIcon, cx, cy);

        var name = baseNames[baseIdx] + " " + modNames[modIdx];
        t(gIcon, name, cx, cy - 55, 14, cDark, true);
    }

    app.redraw();
    alert("100 Fully Procedural Vector Icons created successfully!\n\nThis script generated 10 base shapes multiplied by 10 modifiers to create 100 unique, original, and highly professional tech icons for Adobe Stock.");
}

main();
