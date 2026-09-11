// content.js - Image Downloader Content Script

console.log("[Image Downloader] Content script initialized.");

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "scan_images") {
    const result = scanPageImages();
    sendResponse(result);
    return true;
  }

  if (request.action === "scroll_and_scan") {
    scrollAndScan().then((result) => {
      sendResponse(result);
    });
    return true;
  }

  if (request.action === "show_toast") {
    showToast(request.message, request.type);
    sendResponse({ success: true });
    return true;
  }
});

function detectKeyword() {
  const isDreamstime = window.location.hostname.includes("dreamstime.com");
  if (!isDreamstime) {
    return document.title.replace(/[^\w\s-]/g, "").trim().substring(0, 30) || "Images";
  }

  // 1. Try search inputs
  const searchInput = document.querySelector(
    'input[name="sfield"], input[name="srh_field"], input[type="search"], .search-box input, input.search-input'
  );
  if (searchInput && searchInput.value && searchInput.value.trim().length > 0) {
    return searchInput.value.trim();
  }

  // 2. Try URL search params
  const urlParams = new URLSearchParams(window.location.search);
  const q = urlParams.get("sfield") || urlParams.get("srh_field") || urlParams.get("q");
  if (q && q.trim().length > 0) {
    return q.trim();
  }

  // 3. Try URL path (e.g. /best-stock-photos or /paper-photos)
  const pathParts = window.location.pathname.split("/").filter(Boolean);
  if (pathParts.length > 0) {
    const lastPart = pathParts[pathParts.length - 1].replace(/-photos|-images|-stock-photos/g, "").replace(/-/g, " ");
    if (lastPart && lastPart.length > 2) {
      return lastPart;
    }
  }

  return "stock_photos";
}

function scanPageImages() {
  const isDreamstime = window.location.hostname.includes("dreamstime.com");
  const keyword = detectKeyword();
  const cleanKeyword = keyword.replace(/[^\w\s-]/g, "").replace(/\s+/g, "_");

  const imagesMap = new Map(); // Key: normalized ID or URL

  if (isDreamstime) {
    scanDreamstimeImages(imagesMap, cleanKeyword);
  } else {
    scanGenericImages(imagesMap, cleanKeyword);
  }

  const images = Array.from(imagesMap.values());
  console.log(`[Image Downloader] Found ${images.length} candidate images.`);

  return {
    success: true,
    isDreamstime,
    keyword: cleanKeyword,
    pageTitle: document.title,
    count: images.length,
    images: images
  };
}

function scanDreamstimeImages(imagesMap, keyword) {
  // Candidate elements: img, picture source, background image divs
  const elements = Array.from(document.querySelectorAll('img, picture > source, [data-src], [data-srcset], .item-photo, .dt-image'));

  let counter = 1;

  for (const el of elements) {
    // Gather all possible image URLs on element
    const candidates = [];

    if (el.tagName === "IMG") {
      if (el.src) candidates.push(el.src);
      if (el.dataset.src) candidates.push(el.dataset.src);
      if (el.dataset.original) candidates.push(el.dataset.original);
      if (el.dataset.lazy) candidates.push(el.dataset.lazy);
      if (el.srcset) candidates.push(...parseSrcset(el.srcset));
    } else if (el.tagName === "SOURCE") {
      if (el.srcset) candidates.push(...parseSrcset(el.srcset));
      if (el.dataset.srcset) candidates.push(...parseSrcset(el.dataset.srcset));
    } else {
      if (el.dataset.src) candidates.push(el.dataset.src);
      const bg = window.getComputedStyle(el).backgroundImage;
      if (bg && bg.startsWith("url(")) {
        candidates.push(bg.slice(4, -1).replace(/["']/g, ""));
      }
    }

    for (const rawUrl of candidates) {
      if (!rawUrl || typeof rawUrl !== "string") continue;
      if (!rawUrl.includes("thumbs.dreamstime.com")) continue;

      // Filter out avatars, icons, badges, banners
      if (
        rawUrl.includes("/avatar/") ||
        rawUrl.includes("/author/") ||
        rawUrl.includes("/user/") ||
        rawUrl.includes("/logo") ||
        rawUrl.includes("/badge") ||
        rawUrl.includes("icon")
      ) {
        continue;
      }

      // Dreamstime URL pattern: https://thumbs.dreamstime.com/[tzmxb]/[path]/[name]-[id].jpg
      // Convert /t/ or /m/ or /x/ into /b/ (Big watermark preview ~800-1000px)
      // or /z/ (Zoom preview)
      const highResUrl = rawUrl
        .replace(/\/thumbs\.dreamstime\.com\/[tmx]\//, "/thumbs.dreamstime.com/b/")
        .replace(/\/thumbs\.dreamstime\.com\/m\//, "/thumbs.dreamstime.com/b/")
        .replace(/\/thumbs\.dreamstime\.com\/t\//, "/thumbs.dreamstime.com/b/");

      // Also try Zoom /z/ url as alt
      const zoomUrl = rawUrl
        .replace(/\/thumbs\.dreamstime\.com\/[tmxb]\//, "/thumbs.dreamstime.com/z/");

      // Extract unique identifier from filename
      const match = rawUrl.match(/\/([^\/\?]+)\.jpg/i);
      const filenameBase = match ? match[1] : `image_${counter}`;
      const uniqueKey = filenameBase.replace(/^[tmxbz]_/, "");

      if (imagesMap.has(uniqueKey)) continue;

      // Extract descriptive name from alt or parent title
      let title = "";
      if (el.tagName === "IMG") {
        title = el.getAttribute("alt") || el.getAttribute("title") || "";
      } else {
        const parentImg = el.parentElement ? el.parentElement.querySelector("img") : null;
        if (parentImg) {
          title = parentImg.getAttribute("alt") || parentImg.getAttribute("title") || "";
        }
      }

      let cleanName = title
        .replace(/[^\w\s-]/g, "")
        .trim()
        .replace(/\s+/g, "_")
        .substring(0, 40);

      if (!cleanName || cleanName.length < 3) {
        cleanName = `${keyword}_${counter}`;
      } else {
        cleanName = `${keyword}_${counter}_${cleanName}`;
      }

      const formattedNumber = String(counter).padStart(2, "0");
      const finalFilename = `${formattedNumber}_${cleanName}.jpg`;

      imagesMap.set(uniqueKey, {
        id: uniqueKey,
        highResUrl: highResUrl,
        zoomUrl: zoomUrl,
        thumbUrl: rawUrl,
        title: title || `${keyword} #${counter}`,
        filename: finalFilename,
        selected: true
      });

      counter++;
    }
  }
}

function scanGenericImages(imagesMap, keyword) {
  const imgs = Array.from(document.querySelectorAll("img"));
  let counter = 1;

  for (const img of imgs) {
    const src = img.currentSrc || img.src || img.dataset.src;
    if (!src || src.startsWith("data:") || src.length < 10) continue;

    // Filter tiny icons
    const rect = img.getBoundingClientRect();
    const naturalW = img.naturalWidth || rect.width || 0;
    const naturalH = img.naturalHeight || rect.height || 0;
    if (naturalW < 120 || naturalH < 120) continue;

    const extMatch = src.match(/\.(jpg|jpeg|png|webp|avif)/i);
    const ext = extMatch ? extMatch[1].toLowerCase() : "jpg";

    const formattedNumber = String(counter).padStart(2, "0");
    const cleanName = (img.alt || `${keyword}_${counter}`)
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "_")
      .substring(0, 40);

    const finalFilename = `${formattedNumber}_${cleanName}.${ext}`;

    if (!imagesMap.has(src)) {
      imagesMap.set(src, {
        id: `img_${counter}`,
        highResUrl: src,
        zoomUrl: src,
        thumbUrl: src,
        title: img.alt || `Image #${counter}`,
        filename: finalFilename,
        selected: true
      });
      counter++;
    }
  }
}

function parseSrcset(srcset) {
  if (!srcset) return [];
  return srcset
    .split(",")
    .map(item => item.trim().split(/\s+/)[0])
    .filter(Boolean);
}

async function scrollAndScan() {
  const distance = Math.min(window.innerHeight * 1.5, 1200);
  window.scrollBy({ top: distance, behavior: "smooth" });
  await new Promise(r => setTimeout(r, 1200));
  return scanPageImages();
}

function showToast(message, type = "info") {
  let toast = document.getElementById("img-downloader-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "img-downloader-toast";
    toast.style.position = "fixed";
    toast.style.bottom = "20px";
    toast.style.right = "20px";
    toast.style.zIndex = "2147483647";
    toast.style.padding = "12px 20px";
    toast.style.borderRadius = "8px";
    toast.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    toast.style.fontSize = "14px";
    toast.style.fontWeight = "600";
    toast.style.boxShadow = "0 6px 20px rgba(0,0,0,0.3)";
    toast.style.transition = "all 0.3s ease";
    toast.style.color = "#ffffff";
    document.body.appendChild(toast);
  }

  if (type === "success") {
    toast.style.background = "linear-gradient(135deg, #00c853, #00e676)";
  } else if (type === "error") {
    toast.style.background = "linear-gradient(135deg, #d50000, #ff1744)";
  } else {
    toast.style.background = "linear-gradient(135deg, #1a73e8, #4285f4)";
  }

  toast.textContent = message;
  toast.style.opacity = "1";
  toast.style.transform = "translateY(0)";

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(10px)";
  }, 4000);
}
