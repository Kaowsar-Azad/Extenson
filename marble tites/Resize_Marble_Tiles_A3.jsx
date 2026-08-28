#target photoshop

// ============================================================
// MARBLE TILES BATCH RESIZER (A3 SIZE)
// Loops through an Input folder, forces images to 4961x3543 px 
// (300 DPI), converts to sRGB, and saves to an Output folder.
// ============================================================

function main() {
    // 1. Select Input Folder
    var inputFolder = Folder.selectDialog("Select INPUT folder containing the original images:");
    if (inputFolder === null) {
        alert("Action cancelled: No Input folder selected.");
        return;
    }

    // 2. Select Output Folder
    var outputFolder = Folder.selectDialog("Select OUTPUT folder to save the resized images:");
    if (outputFolder === null) {
        alert("Action cancelled: No Output folder selected.");
        return;
    }

    // 3. Get all image files from the Input folder
    var fileList = inputFolder.getFiles(/\.(jpg|jpeg|png|tif|tiff|webp)$/i);
    if (fileList.length === 0) {
        alert("No supported images found in the selected Input folder.");
        return;
    }

    var successCount = 0;
    var errorCount = 0;

    // Save options for Maximum Quality JPEG
    var jpegOptions = new JPEGSaveOptions();
    jpegOptions.quality = 12;
    jpegOptions.embedColorProfile = true;

    // 4. Loop through each file
    for (var i = 0; i < fileList.length; i++) {
        var file = fileList[i];
        
        try {
            // Open the document
            var doc = app.open(file);
            
            // Unlock background layer if it is locked
            if (doc.activeLayer.isBackgroundLayer) {
                doc.activeLayer.isBackgroundLayer = false;
                doc.activeLayer.name = "Layer 0";
            }

            // Change Color Mode to RGB if it isn't already
            if (doc.mode !== DocumentMode.RGB) {
                doc.changeMode(ChangeMode.RGB);
            }

            // Convert Profile to sRGB
            try {
                doc.convertProfile("sRGB IEC61966-2.1", Intent.RELATIVECOLORIMETRIC, true, true);
            } catch (e) {
                try {
                    doc.colorProfileName = "sRGB IEC61966-2.1";
                } catch(e2) {}
            }

            // Force Resize to 4961 x 3543 pixels at 300 DPI
            var targetWidth = UnitValue(4961, "px");
            var targetHeight = UnitValue(3543, "px");
            doc.resizeImage(targetWidth, targetHeight, 300, ResampleMethod.BICUBIC);

            // Create new file path in the Output folder
            var saveFile = new File(outputFolder.fsName + "/" + file.name.replace(/\.[^\.]+$/, '') + ".jpg");

            // Save and Close
            doc.saveAs(saveFile, jpegOptions, true, Extension.LOWERCASE);
            doc.close(SaveOptions.DONOTSAVECHANGES);

            successCount++;
        } catch (err) {
            errorCount++;
            // Close the document if it failed during processing
            if (app.documents.length > 0 && app.activeDocument === doc) {
                doc.close(SaveOptions.DONOTSAVECHANGES);
            }
        }
    }

    // 5. Show Summary
    alert("Batch Processing Complete!\n\n" +
          "Successfully resized: " + successCount + " images\n" +
          "Failed: " + errorCount + " images\n\n" +
          "Saved to: " + outputFolder.fsName);
}

// Wrap in try-catch to avoid unhandled Photoshop-level errors
try {
    main();
} catch (e) {
    alert("A critical error occurred: " + e.message);
}
