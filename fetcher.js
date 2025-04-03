const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const { JSDOM } = require("jsdom")
const iconv = require('iconv-lite'); // For encoding/decoding

const saveDir = "./Log";
let lastResponse = "";
let readfromfile = true;

if (!fs.existsSync(saveDir)) {
  fs.mkdirSync(saveDir);
}

const files = fs.readdirSync(saveDir)
  .filter(file => file.startsWith("Vertretungsplan-") && file.endsWith(".html"))
  .sort()
  .reverse();

if (files.length > 0) {
  const lastFilePath = path.join(saveDir, files[0]);
  lastResponse = fs.readFileSync(lastFilePath, "utf-8");
  readfromfile = true;
  console.log(`Loaded last response from ${lastFilePath}`);
} else {
  console.log("No previous response files found.");
}

async function fetchData() {
  try {
    const cookies = [
      "refreshToken=1.AQUA7hAZq_xtCkykzuMRxN8fzWCRSK104blHg-VNbnqkl4IbAXoFAA.AgABAwEAAABVrSpeuWamRam2jAF1XRQEAwDs_wUA9P_e80wtsjX1fX4YjOv925tV2csXGOwqUZHgY4-G7hX0vVa9Rvr-kVbpT4BRwgL7hper8ra6vKiQGBZsmLlT2QNyXC9jw1xBRKZyKFgSlA__eIhOMjqJMXAr3nE9LDmFwyMCS_gCOGWLYo9SbUJsu3qn4fjHH70MsaNa9EATtRqJlv6k09IKkjzYzlOjxXHchZeGXbopFYgTbgDT-j-5csx55HBtFxs-XjjDxV-WhC3iMUc0AX6vV7VfAkohfCDaZJVgQj6Nqu8_tqWye4T9dtwpsrjVQztVJZ8AY7utoyTtGTmOrhQXhMo7hhbk2d9FVkPaU2e48JpdD0CS5E2x6TD-9MLje4vJQWSz557djbE-o1e1cLg6LGDW12Qeon_RsvaYX_duVjyAuE7My7Nv3H4_FXre_z9ChawLvjfqdXxL-gilXEhXcdjTgxTriZMuXFL5_wtSqnoW4kJqjNwAlfaTi5dgGhVWhge1635i0zV-mkqZ8a4eLIbEJdlaj6dKtaMR7M-k6SxIvvjfJfKk2kQq5uSQwC9uBWEXGvsoGbTW1Shej5yaKHaUbj6Yz0EZ5gDiZJOZwrGwxDis9ZlT4Q8wExoq10ARokaSytoTrWrK-riwJtdBj6cvV9pPCLoHuTEzyb6MVz2ZgWJN2HALQRNc0QIDvMvQQQ2jFMvgE9URiv94NL2jNDZJtgNPj0LT2262i9YseaZ_yvU-WEc3pECy0bYF0zJJ9-panKbFyySAaI3mjhimBJ9306oOdw7xVrSRzqCtGkfVNc_uvvRK4MhmiuvBz0JVK5Jb8h30FQ"
    ];

    const response = await fetch("https://portal.helmholtzschule.de/?apiCall=vertretung", {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "de,en-US",
        "Cookie": cookies.join('; ')
      },
    });

    if (!response.ok) {
      console.error("Error fetching data: ", response.status);
      return;
    }

    // Ensure the response body is correctly handled as a Buffer
    const buffer = await response.buffer();  // using `.buffer()` instead of `.arrayBuffer()`

    // Now using iconv-lite to decode the buffer from iso-8859-1 (latin1)
    const htmlResponse = iconv.decode(buffer, 'iso-8859-1');

    let htmlContent = htmlResponse;

    if (readfromfile) {
      let dom = new JSDOM(htmlContent);
      let doc = dom.window.document;

      // Remove existing <title> and <meta> tags
      doc.querySelectorAll("title, meta").forEach(el => el.remove());

      let meta = doc.createElement("meta");
      meta.setAttribute("charset", "utf-8");
      doc.head.prepend(meta);

      htmlContent = doc.documentElement.outerHTML;
    }

    if (htmlContent !== lastResponse) {
      lastResponse = htmlResponse;
      readfromfile = false;
      console.log("Something changed, saving response...");
      saveResponseToFile(htmlContent);
    }
  } catch (error) {
    console.error("Error during fetch:", error);
  }
  console.log("Fetch performed at", new Date(Date.now()).toString());
}

function saveResponseToFile(html) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").split("T")[0] + "_" + new Date().toLocaleTimeString().replace(/[: ]/g, "-");
  const filePath = path.join(saveDir, `Vertretungsplan-${timestamp}.html`);

  let dom = new JSDOM(html);
  let doc = dom.window.document;

  // Remove existing <title> and <meta> tags
  doc.querySelectorAll("title, meta").forEach(el => el.remove());

  let meta = doc.createElement("meta");
  meta.setAttribute("charset", "utf-8");
  doc.head.prepend(meta);

  fs.writeFileSync(filePath, doc.documentElement.outerHTML, "utf-8");
  console.log(`New response saved as ${filePath}`);
}

setInterval(fetchData, 30000);
fetchData();
