#target illustrator

function main() {
    var win = new Window("dialog", "Batch Scale EPS to 4 Megapixels");
    win.orientation = "column";
    win.alignChildren = ["fill", "top"];
    win.spacing = 15;
    win.margins = 20;
    
    // UI Panels
    var panelIn = win.add("panel", undefined, "Input Folder");
    panelIn.orientation = "row";
    panelIn.alignChildren = ["left", "center"];
    var txtIn = panelIn.add("edittext", undefined, "");
    txtIn.characters = 35;
    var btnIn = panelIn.add("button", undefined, "Select");
    
    var panelOut = win.add("panel", undefined, "Output Folder");
    panelOut.orientation = "row";
    panelOut.alignChildren = ["left", "center"];
    var txtOut = panelOut.add("edittext", undefined, "");
    txtOut.characters = 35;
    var btnOut = panelOut.add("button", undefined, "Select");

    // Store folder objects for reliable path handling
    var inputFolderObj = null;
    var outputFolderObj = null;
    
    // Event Listeners
    btnIn.onClick = function() {
        var f = Folder.selectDialog("Select Input Folder containing EPS files");
        if (f) {
            inputFolderObj = f;
            txtIn.text = f.fsName;
            if (txtOut.text === "") {
                var defaultOut = new Folder(decodeURI(f) + "/Output_4MP");
                outputFolderObj = defaultOut;
                txtOut.text = defaultOut.fsName;
            }
        }
    }
    
    btnOut.onClick = function() {
        var f = Folder.selectDialog("Select Output Folder");
        if (f) {
            outputFolderObj = f;
            txtOut.text = f.fsName;
        }
    }
    
    // Action Buttons
    var grpBtns = win.add("group");
    grpBtns.alignment = ["center", "top"];
    var btnRun = grpBtns.add("button", undefined, "Start Processing", {name: "ok"});
    var btnCancel = grpBtns.add("button", undefined, "Cancel", {name: "cancel"});
    
    btnRun.onClick = function() {
        if (txtIn.text === "" || txtOut.text === "") {
            alert("Please select both Input and Output folders.");
            return;
        }

        // Use stored folder objects if available, otherwise create from text
        var inFolder = inputFolderObj ? inputFolderObj : new Folder(txtIn.text);
        var outFolder = outputFolderObj ? outputFolderObj : new Folder(txtOut.text);
        
        if (!inFolder.exists) {
            alert("Input folder does not exist:\n" + inFolder.fsName);
            return;
        }
        if (!outFolder.exists) {
            var created = outFolder.create();
            if (!created) {
                alert("Failed to create output folder:\n" + outFolder.fsName);
                return;
            }
        }
        
        win.close(1);
        processFolder(inFolder, outFolder);
    }
    
    btnCancel.onClick = function() {
        win.close(0);
    }
    
    win.show();
}

function processFolder(inFolder, outFolder) {
    var files = inFolder.getFiles(function(f) {
        return f instanceof File && f.name.match(/\.eps$/i);
    });
    
    if (files.length === 0) {
        alert("No EPS files found in the selected input folder.");
        return;
    }
    
    var successCount = 0;
    var errorCount = 0;
    var errorLog = [];
    
    // Suppress alerts/dialogs during batch processing
    var originalInteractionLevel = app.userInteractionLevel;
    app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;
    
    for (var i = 0; i < files.length; i++) {
        var file = files[i];
        try {
            // Open file
            var doc = app.open(file);
            
            // Process (scale, outline text, clip)
            processDocument(doc);
            
            // Build output path using decodeURI for reliable cross-platform path
            var savePath = decodeURI(outFolder) + "/" + file.name;
            var outFile = new File(savePath);
            
            // Save Options (EPS 10, No font embedding, CMYK PostScript)
            var saveOpts = new EPSSaveOptions();
            saveOpts.compatibility = Compatibility.ILLUSTRATOR10;
            saveOpts.embedAllFonts = false;
            saveOpts.cmykPostScript = true;
            
            doc.saveAs(outFile, saveOpts);
            doc.close(SaveOptions.DONOTSAVECHANGES);
            
            successCount++;
        } catch (e) {
            errorCount++;
            errorLog.push(file.name + ": " + e.message + " (line " + e.line + ")");
            try {
                if (app.documents.length > 0) {
                    app.activeDocument.close(SaveOptions.DONOTSAVECHANGES);
                }
            } catch(err) {}
        }
    }
    
    // Restore interaction level
    app.userInteractionLevel = originalInteractionLevel;
    
    var msg = "Batch Processing Complete!\n\n";
    msg += "Successfully processed: " + successCount + " files.\n";
    msg += "Errors: " + errorCount + " files.\n";
    msg += "Output folder: " + outFolder.fsName;
    
    if (errorLog.length > 0) {
        msg += "\n\n--- Error Details ---\n";
        for (var k = 0; k < errorLog.length; k++) {
            msg += errorLog[k] + "\n";
        }
    }
    
    alert(msg);
}

function processDocument(doc) {
    // 1. Ensure CMYK Color Space
    try {
        app.executeMenuCommand("doc-color-cmyk");
    } catch(e) {}
    
    // Unlock and unhide all
    try { app.executeMenuCommand("unlockAll"); } catch(e) {}
    try { app.executeMenuCommand("showAll"); } catch(e) {}
    
    // 2. Outline all Text (loop backwards)
    for (var i = doc.textFrames.length - 1; i >= 0; i--) {
        try {
            var tf = doc.textFrames[i];
            tf.locked = false;
            tf.hidden = false;
            tf.createOutline();
        } catch(e) {}
    }
    
    // Set ruler origin to 0,0
    doc.rulerOrigin = [0, 0];
    
    var ab = doc.artboards[0];
    var rect = ab.artboardRect; // [left, top, right, bottom]
    
    var width = Math.abs(rect[2] - rect[0]);
    var height = Math.abs(rect[1] - rect[3]);
    var area = width * height;
    
    var targetArea = 4100000; // Target is 4.1 Megapixels
    var needsScale = (area < targetArea);
    
    var scalePct = 100;
    var f = 1;
    
    if (needsScale) {
        f = Math.sqrt(targetArea / area);
        scalePct = f * 100;
    }
    
    // 3. Select All and Group
    app.executeMenuCommand("selectall");
    
    // If there's a selection, group it
    if (doc.selection.length > 0) {
        app.executeMenuCommand("group");
    }
    
    // Now scale everything if needed
    if (needsScale && doc.selection.length > 0) {
        // Scale the selected group
        var sel = doc.selection[0];
        sel.resize(scalePct, scalePct, true, true, true, true, scalePct, Transformation.DOCUMENTORIGIN);
        
        // Scale Artboard
        ab.artboardRect = [rect[0] * f, rect[1] * f, rect[2] * f, rect[3] * f];
    }
    
    // Deselect
    doc.selection = null;
    
    // 4. Create Clipping Mask for the Artboard
    var newRect = ab.artboardRect;
    var maskTop = newRect[1];
    var maskLeft = newRect[0];
    var maskWidth = Math.abs(newRect[2] - newRect[0]);
    var maskHeight = Math.abs(newRect[1] - newRect[3]);
    
    // Get the active layer
    var layer = doc.activeLayer;
    
    // Create mask rectangle on the active layer
    var maskPath = layer.pathItems.rectangle(maskTop, maskLeft, maskWidth, maskHeight);
    maskPath.filled = false;
    maskPath.stroked = false;
    maskPath.name = "ClipMask";
    
    // Select all, then make clipping mask
    app.executeMenuCommand("selectall");
    
    if (doc.selection.length > 1) {
        app.executeMenuCommand("makeMask");
    }
    
    // Deselect
    doc.selection = null;
}

main();
