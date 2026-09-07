#target illustrator

// =============================================================================
// ICON GRID ARRANGER & RESIZER (Adobe Illustrator ExtendScript)
// Automatically resizes all selected icons to a uniform size (preserving aspect ratio),
// arranges them into a clean horizontal/vertical grid with even spacing,
// and centers the entire grid perfectly onto the active Artboard.
// =============================================================================

function main() {
    // 1. Ensure an Illustrator document is open
    if (app.documents.length === 0) {
        alert("No active document found!\nPlease open an Illustrator file with your icons.");
        return;
    }

    var doc = app.activeDocument;
    var abIndex = doc.artboards.getActiveArtboardIndex();
    var ab = doc.artboards[abIndex];
    var abRect = ab.artboardRect; // [left, top, right, bottom]

    // 2. Identify target icons (from selection or active artboard)
    var rawSelection = doc.selection;
    var items = [];

    if (rawSelection && rawSelection.length > 0) {
        // Collect only top-level selected items (avoid processing children of groups)
        for (var i = 0; i < rawSelection.length; i++) {
            var itm = rawSelection[i];
            var isTopLevel = true;
            var parentItem = itm.parent;
            while (parentItem && parentItem.typename !== "Layer" && parentItem.typename !== "Document") {
                for (var j = 0; j < rawSelection.length; j++) {
                    if (rawSelection[j] === parentItem) {
                        isTopLevel = false;
                        break;
                    }
                }
                if (!isTopLevel) break;
                parentItem = parentItem.parent;
            }
            if (isTopLevel) {
                items.push(itm);
            }
        }
    }

    // Fallback if nothing selected: offer to arrange all top-level items on active artboard
    if (items.length === 0) {
        var abLeft = abRect[0], abTop = abRect[1], abRight = abRect[2], abBottom = abRect[3];
        var promptAll = confirm(
            "No icons are currently selected.\n\n" +
            "Would you like to automatically arrange all items on the active Artboard?"
        );
        if (!promptAll) return;

        var allPageItems = doc.pageItems;
        for (var k = 0; k < allPageItems.length; k++) {
            var pageItem = allPageItems[k];
            if (pageItem.parent.typename === "Layer" && !pageItem.locked && !pageItem.hidden) {
                var b = pageItem.visibleBounds;
                var cx = (b[0] + b[2]) / 2;
                var cy = (b[1] + b[3]) / 2;
                // Check if inside active artboard
                if (cx >= abLeft && cx <= abRight && cy <= abTop && cy >= abBottom) {
                    items.push(pageItem);
                }
            }
        }

        if (items.length === 0) {
            alert("No items found on the active artboard.\nPlease select the icons you want to arrange.");
            return;
        }
    }

    // 3. User Interface Dialog
    var dlg = new Window("dialog", "Icon Grid Arranger & Resizer");
    dlg.orientation = "column";
    dlg.alignChildren = ["fill", "top"];
    dlg.spacing = 12;
    dlg.margins = 16;

    // Info
    var pnlInfo = dlg.add("panel", undefined, "Selection");
    pnlInfo.orientation = "column";
    pnlInfo.alignChildren = ["left", "center"];
    pnlInfo.margins = 10;
    pnlInfo.add("statictext", undefined, "Total Icons Detected: " + items.length);

    // Grid Settings
    var pnlSettings = dlg.add("panel", undefined, "Grid Configuration");
    pnlSettings.orientation = "column";
    pnlSettings.alignChildren = ["fill", "top"];
    pnlSettings.spacing = 8;
    pnlSettings.margins = 12;

    // Target Icon Size
    var grpSize = pnlSettings.add("group");
    grpSize.add("statictext", undefined, "Uniform Icon Size (px):");
    var txtSize = grpSize.add("edittext", undefined, "100");
    txtSize.characters = 6;

    // Columns
    var defaultCols = Math.ceil(Math.sqrt(items.length)) || 4;
    var grpCols = pnlSettings.add("group");
    grpCols.add("statictext", undefined, "Number of Columns:");
    var txtCols = grpCols.add("edittext", undefined, String(defaultCols));
    txtCols.characters = 6;

    // Spacing
    var grpGap = pnlSettings.add("group");
    grpGap.add("statictext", undefined, "Grid Spacing / Gap (px):");
    var txtGap = grpGap.add("edittext", undefined, "40");
    txtGap.characters = 6;

    // Options
    var chkCenter = pnlSettings.add("checkbox", undefined, "Center Grid on Artboard");
    chkCenter.value = true;

    var chkScaleStrokes = pnlSettings.add("checkbox", undefined, "Scale Strokes & Effects proportionally");
    chkScaleStrokes.value = true;

    var chkSort = pnlSettings.add("checkbox", undefined, "Sort Icons by current page position (Top to Bottom)");
    chkSort.value = true;

    // Action Buttons
    var grpButtons = dlg.add("group");
    grpButtons.alignment = ["center", "bottom"];
    var btnOk = grpButtons.add("button", undefined, "Arrange Icons", { name: "ok" });
    var btnCancel = grpButtons.add("button", undefined, "Cancel", { name: "cancel" });

    if (dlg.show() !== 1) {
        return; // User cancelled
    }

    // 4. Parse user parameters
    var targetSize = parseFloat(txtSize.text);
    if (isNaN(targetSize) || targetSize <= 0) targetSize = 100;

    var cols = parseInt(txtCols.text, 10);
    if (isNaN(cols) || cols <= 0) cols = defaultCols;

    var gap = parseFloat(txtGap.text);
    if (isNaN(gap) || gap < 0) gap = 40;

    var shouldCenter = chkCenter.value;
    var shouldScaleStrokes = chkScaleStrokes.value;
    var shouldSort = chkSort.value;

    // 5. Optional sort by current layout position (top-to-bottom, left-to-right)
    if (shouldSort) {
        items.sort(function(a, b) {
            var bA = a.visibleBounds;
            var bB = b.visibleBounds;
            // Vertical tolerance for row grouping (approx. 40px)
            if (Math.abs(bA[1] - bB[1]) > 40) {
                return bB[1] - bA[1]; // Top-most first
            }
            return bA[0] - bB[0];     // Left-most first
        });
    }

    // 6. Uniform Scaling (Fit each icon proportionally into targetSize x targetSize)
    for (var m = 0; m < items.length; m++) {
        var itmToScale = items[m];
        var bounds = itmToScale.visibleBounds;
        var curW = bounds[2] - bounds[0];
        var curH = bounds[1] - bounds[3];

        if (curW <= 0 || curH <= 0) {
            bounds = itmToScale.geometricBounds;
            curW = bounds[2] - bounds[0];
            curH = bounds[1] - bounds[3];
        }

        var maxDim = Math.max(curW, curH);
        if (maxDim > 0) {
            var scaleFactor = (targetSize / maxDim) * 100;
            itmToScale.resize(
                scaleFactor,
                scaleFactor,
                true, // changePositions
                true, // changeFillPatterns
                true, // changeFillGradients
                true, // changeStrokePattern
                shouldScaleStrokes ? scaleFactor : 100, // changeLineWidths
                Transformation.CENTER
            );
        }
    }

    // 7. Calculate Grid Dimensions & Positions
    var cellW = targetSize;
    var cellH = targetSize;
    var numRows = Math.ceil(items.length / cols);

    var totalGridW = cols * cellW + (cols - 1) * gap;
    var totalGridH = numRows * cellH + (numRows - 1) * gap;

    var abL = abRect[0];
    var abT = abRect[1];
    var abR = abRect[2];
    var abB = abRect[3];
    var abWidth = abR - abL;
    var abHeight = abT - abB;

    // Reference top-left for grid
    var startX = abL;
    var startY = abT;

    if (shouldCenter) {
        startX = abL + (abWidth - totalGridW) / 2;
        startY = abT - (abHeight - totalGridH) / 2;
    }

    // 8. Place each icon at the center of its designated grid cell
    for (var n = 0; n < items.length; n++) {
        var itmToPlace = items[n];
        var row = Math.floor(n / cols);
        var col = n % cols;

        // Cell Center coordinates
        var cellLeft = startX + col * (cellW + gap);
        var cellTop = startY - row * (cellH + gap);
        var cellCenterX = cellLeft + cellW / 2;
        var cellCenterY = cellTop - cellH / 2;

        // Current item center
        var curBounds = itmToPlace.visibleBounds;
        var itmCenterX = (curBounds[0] + curBounds[2]) / 2;
        var itmCenterY = (curBounds[1] + curBounds[3]) / 2;

        // Move to cell center
        var deltaX = cellCenterX - itmCenterX;
        var deltaY = cellCenterY - itmCenterY;
        itmToPlace.translate(deltaX, deltaY);
    }

    // 9. Redraw & Show Confirmation
    app.redraw();
    alert(
        "Icon Grid Arranged Successfully!\n\n" +
        "• Total Icons: " + items.length + "\n" +
        "• Uniform Size: " + targetSize + " px\n" +
        "• Grid: " + cols + " Columns × " + numRows + " Rows\n" +
        "• Spacing: " + gap + " px\n" +
        "• Centered on Artboard: " + (shouldCenter ? "Yes" : "No")
    );
}

try {
    main();
} catch (err) {
    alert("Error executing Icon Grid Arranger:\n" + err.message);
}
