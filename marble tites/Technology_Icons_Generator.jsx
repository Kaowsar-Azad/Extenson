#target illustrator

// ============================================================
// TECHNOLOGY ICONS GENERATOR
// Creates 12 Editable Stroke Tech Vectors via Pure Code
// ============================================================

function main() {
    var doc = app.documents.add(DocumentColorSpace.CMYK, 800, 600);
    doc.rulerOrigin = [0, 0];
    
    var black = new CMYKColor(); black.cyan=0; black.magenta=0; black.yellow=0; black.black=100;
    var white = new CMYKColor(); white.cyan=0; white.magenta=0; white.yellow=0; white.black=0;
    
    function applyStyle(path, fill) {
        path.filled = fill;
        if (fill) path.fillColor = white;
        path.stroked = true;
        path.strokeColor = black;
        path.strokeWidth = 2.5; // Bold lines for icons
        path.strokeCap = StrokeCap.ROUNDENDCAP;
        path.strokeJoin = StrokeJoin.ROUNDENDJOIN;
    }

    function drawLine(g, x1, y1, x2, y2) {
        var p = g.pathItems.add();
        p.setEntirePath([[x1, y1], [x2, y2]]);
        applyStyle(p, false);
    }

    function drawCircle(g, cx, cy, r, fill) {
        var p = g.pathItems.ellipse(cy+r, cx-r, r*2, r*2);
        applyStyle(p, fill !== false); 
        return p;
    }

    function drawRect(g, x, y, w, h, fill) {
        var p = g.pathItems.rectangle(y, x, w, h);
        applyStyle(p, fill !== false);
        return p;
    }

    function drawRoundedRect(g, x, y, w, h, r, fill) {
        var p = g.pathItems.roundedRectangle(y, x, w, h, r, r);
        applyStyle(p, fill !== false);
        return p;
    }
    
    function drawPoly(g, pts, closed, fill) {
        var p = g.pathItems.add();
        p.setEntirePath(pts);
        p.closed = closed;
        applyStyle(p, fill !== false);
        return p;
    }

    // ==========================================
    // ICON BUILDERS (100x100 bounding box each)
    // ==========================================
    
    // 1. Laptop
    function iconLaptop(x, y) {
        var g = doc.groupItems.add();
        // Screen
        drawRoundedRect(g, x+15, y-20, 70, 45, 4, true);
        // Inner Screen
        drawRect(g, x+20, y-25, 60, 35, false);
        // Base
        drawPoly(g, [[x+5, y-65], [x+95, y-65], [x+85, y-70], [x+15, y-70]], true, true);
        // Trackpad
        drawLine(g, x+40, y-65, x+60, y-65);
    }
    
    // 2. Smartphone
    function iconSmartphone(x, y) {
        var g = doc.groupItems.add();
        // Body
        drawRoundedRect(g, x+25, y-10, 50, 80, 8, true);
        // Screen
        drawRect(g, x+30, y-20, 40, 60, false);
        // Speaker / Notch
        drawLine(g, x+42, y-15, x+58, y-15);
        // Home Button
        drawCircle(g, x+50, y-85, 3, false);
    }
    
    // 3. Server / Database
    function iconServer(x, y) {
        var g = doc.groupItems.add();
        // Top Rack
        drawRoundedRect(g, x+20, y-20, 60, 18, 3, true);
        drawCircle(g, x+30, y-29, 2, true); drawCircle(g, x+38, y-29, 2, true);
        drawLine(g, x+55, y-29, x+70, y-29);
        
        // Mid Rack
        drawRoundedRect(g, x+20, y-41, 60, 18, 3, true);
        drawCircle(g, x+30, y-50, 2, true); drawCircle(g, x+38, y-50, 2, true);
        drawLine(g, x+55, y-50, x+70, y-50);
        
        // Bottom Rack
        drawRoundedRect(g, x+20, y-62, 60, 18, 3, true);
        drawCircle(g, x+30, y-71, 2, true); drawCircle(g, x+38, y-71, 2, true);
        drawLine(g, x+55, y-71, x+70, y-71);
    }
    
    // 4. Cloud Computing
    function iconCloud(x, y) {
        var g = doc.groupItems.add();
        // Base flat rounded rect
        drawRoundedRect(g, x+20, y-45, 60, 25, 12, true);
        // Cloud puffs
        drawCircle(g, x+40, y-35, 15, true);
        drawCircle(g, x+60, y-40, 18, true);
        drawCircle(g, x+75, y-55, 12, true);
        // Nodes / Data
        drawLine(g, x+50, y-70, x+50, y-90);
        drawLine(g, x+35, y-70, x+35, y-85);
        drawLine(g, x+65, y-70, x+65, y-85);
        drawCircle(g, x+50, y-90, 4, true);
        drawCircle(g, x+35, y-85, 4, true);
        drawCircle(g, x+65, y-85, 4, true);
    }
    
    // 5. Wi-Fi Signal
    function iconWifi(x, y) {
        var g = doc.groupItems.add();
        // Dot
        drawCircle(g, x+50, y-75, 5, true);
        // We will create the wifi waves using ellipses clipped by a mask
        // Actually simpler: just math out the anchor points for an arc.
        // Or simpler: Polygons that look like arcs!
        // To keep it 100% pure script without complex bezier math:
        // We will draw 3 full circles and cover the bottom parts with a white V-shape
        drawCircle(g, x+50, y-75, 15, false);
        drawCircle(g, x+50, y-75, 30, false);
        drawCircle(g, x+50, y-75, 45, false);
        
        // White V overlay to hide bottom and sides (Creates the Wifi Wedge)
        var mask = g.pathItems.add();
        mask.setEntirePath([
            [x+50, y-75],
            [x-20, y+10],
            [x-20, y-100],
            [x+120, y-100],
            [x+120, y+10]
        ]);
        mask.closed = true;
        mask.filled = true; mask.fillColor = white;
        mask.stroked = false;
        
        // Ensure dot is on top
        drawCircle(g, x+50, y-75, 5, true);
    }
    
    // 6. Processor / Microchip
    function iconProcessor(x, y) {
        var g = doc.groupItems.add();
        
        // Pins (drawn first so they are behind)
        var px = [25, 35, 50, 65, 75];
        for (var i=0; i<5; i++) {
            drawLine(g, x+px[i], y-10, x+px[i], y-90); // Vertical
            drawLine(g, x+10, y-px[i], x+90, y-px[i]); // Horizontal
        }
        
        // Main chip body
        drawRoundedRect(g, x+20, y-20, 60, 60, 5, true);
        // Inner core
        drawRect(g, x+35, y-35, 30, 30, false);
        
        // Circuit line
        drawCircle(g, x+30, y-30, 2, true);
    }
    
    // 7. Gear / Settings
    function iconGear(x, y) {
        var g = doc.groupItems.add();
        var cx = x+50, cy = y-50;
        
        // Teeth
        for(var i=0; i<8; i++) {
            var angle = (i * 45) * (Math.PI/180);
            var dist = 25;
            var tx = cx + dist * Math.cos(angle);
            var ty = cy + dist * Math.sin(angle);
            
            // Just draw small rectangles rotated (polygon representation)
            var tw = 12, th = 12;
            var pts = [
                [tx - tw/2, ty - th/2], [tx + tw/2, ty - th/2],
                [tx + tw/2, ty + th/2], [tx - tw/2, ty + th/2]
            ];
            // Rotate polygon
            var rPts = [];
            for(var p=0; p<4; p++) {
                var dx = pts[p][0] - cx, dy = pts[p][1] - cy;
                var rx = dx*Math.cos(angle) - dy*Math.sin(angle);
                var ry = dx*Math.sin(angle) + dy*Math.cos(angle);
                rPts.push([cx+rx, cy+ry]);
            }
            drawPoly(g, rPts, true, true);
        }
        // Main body
        drawCircle(g, cx, cy, 20, true);
        // Inner hole
        var hole = drawCircle(g, cx, cy, 8, true);
    }
    
    // 8. Smartwatch
    function iconSmartwatch(x, y) {
        var g = doc.groupItems.add();
        // Straps
        drawRect(g, x+35, y-10, 30, 80, true);
        drawLine(g, x+35, y-25, x+65, y-25);
        drawLine(g, x+35, y-75, x+65, y-75);
        // Watch face
        drawRoundedRect(g, x+25, y-25, 50, 50, 8, true);
        // Screen
        drawRect(g, x+32, y-32, 36, 36, false);
        // Button
        drawRect(g, x+75, y-45, 3, 10, true);
    }
    
    // 9. Network / Nodes
    function iconNetwork(x, y) {
        var g = doc.groupItems.add();
        var n1 = [x+50, y-20];
        var n2 = [x+20, y-50];
        var n3 = [x+80, y-45];
        var n4 = [x+35, y-85];
        var n5 = [x+75, y-80];
        
        drawLine(g, n1[0], n1[1], n2[0], n2[1]);
        drawLine(g, n1[0], n1[1], n3[0], n3[1]);
        drawLine(g, n2[0], n2[1], n4[0], n4[1]);
        drawLine(g, n2[0], n2[1], n5[0], n5[1]);
        drawLine(g, n3[0], n3[1], n5[0], n5[1]);
        drawLine(g, n4[0], n4[1], n5[0], n5[1]);
        
        drawCircle(g, n1[0], n1[1], 8, true);
        drawCircle(g, n2[0], n2[1], 8, true);
        drawCircle(g, n3[0], n3[1], 8, true);
        drawCircle(g, n4[0], n4[1], 8, true);
        drawCircle(g, n5[0], n5[1], 8, true);
    }
    
    // 10. Shield (Cybersecurity)
    function iconShield(x, y) {
        var g = doc.groupItems.add();
        drawPoly(g, [
            [x+20, y-20],
            [x+80, y-20],
            [x+80, y-50],
            [x+50, y-90],
            [x+20, y-50]
        ], true, true);
        
        // Inner checkmark
        drawPoly(g, [
            [x+35, y-45],
            [x+45, y-55],
            [x+65, y-35]
        ], false, false);
    }
    
    // 11. Battery
    function iconBattery(x, y) {
        var g = doc.groupItems.add();
        // Body
        drawRoundedRect(g, x+15, y-35, 65, 35, 4, true);
        // Tip
        drawRoundedRect(g, x+80, y-45, 8, 15, 2, true);
        // Power Bars
        drawRect(g, x+25, y-43, 10, 19, false);
        drawRect(g, x+40, y-43, 10, 19, false);
        drawRect(g, x+55, y-43, 10, 19, false);
    }
    
    // 12. Gamepad / Controller
    function iconGamepad(x, y) {
        var g = doc.groupItems.add();
        // Controller body (two overlapping rounded rects for wings)
        drawRoundedRect(g, x+10, y-35, 40, 40, 20, true);
        drawRoundedRect(g, x+50, y-35, 40, 40, 20, true);
        // Middle bridge
        drawRect(g, x+30, y-40, 40, 30, true);
        // Left D-Pad (Cross)
        var dx = x+30, dy = y-55;
        drawPoly(g, [
            [dx-2, dy+6], [dx+2, dy+6], [dx+2, dy+2], [dx+6, dy+2], [dx+6, dy-2],
            [dx+2, dy-2], [dx+2, dy-6], [dx-2, dy-6], [dx-2, dy-2], [dx-6, dy-2],
            [dx-6, dy+2], [dx-2, dy+2]
        ], true, false);
        
        // Right Action Buttons
        drawCircle(g, x+65, y-60, 3, false);
        drawCircle(g, x+75, y-50, 3, false);
    }
    
    // ==========================================
    // GRID LAYOUT RUNNER
    // ==========================================
    var icons = [
        iconLaptop, iconSmartphone, iconServer, iconCloud,
        iconWifi, iconProcessor, iconGear, iconSmartwatch,
        iconNetwork, iconShield, iconBattery, iconGamepad
    ];
    var rect = doc.artboards[0].artboardRect;
    var startX = rect[0] + 100;
    var startY = rect[1] - 100;
    var spacingX = 150;
    var spacingY = 150;
    var cols = 4;
    
    for (var i = 0; i < icons.length; i++) {
        var row = Math.floor(i / cols);
        var col = i % cols;
        var x = startX + col * spacingX;
        var y = startY - row * spacingY;
        
        icons[i](x, y);
    }
    
    app.redraw();
    alert("Technology Icons generated successfully!\nAll 12 icons are pure vectors with 2.5pt editable strokes.");
}

main();
