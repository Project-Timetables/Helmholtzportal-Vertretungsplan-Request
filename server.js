import express from 'express';
import cors from 'cors';
import fs from "fs";
import path from "path";
import { JSDOM } from "jsdom";

const app = express();
const port = 3000;

// Enable CORS for all routes
app.use(cors());

let saveDir = "./Log"
let lastResponse = "";
let readfromfile = true

const files = fs.readdirSync(saveDir)
  .filter(file => file.startsWith("Vertretungsplan-") && file.endsWith(".html"))
  .sort()
  .reverse(); // Sort in descending order to get the latest file first

if (files.length > 0) {
  const lastFilePath = path.join(saveDir, files[0]);
  lastResponse = fs.readFileSync(lastFilePath, "utf-8");
  readfromfile = true
  console.log(`Loaded last response from ${lastFilePath}`);
} else {
  console.log("No previous response files found.");
}

app.get('/api/vertretung', async (req, res) => {
  try {
    // Set up cookies (in this case, the refreshToken cookie)
    const cookies = [
      "refreshToken=1.AQUA7hAZq_xtCkykzuMRxN8fzWCRSK104blHg-VNbnqkl4IbAXoFAA.AgABAwEAAABVrSpeuWamRam2jAF1XRQEAwDs_wUA9P_e80wtsjX1fX4YjOv925tV2csXGOwqUZHgY4-G7hX0vVa9Rvr-kVbpT4BRwgL7hper8ra6vKiQGBZsmLlT2QNyXC9jw1xBRKZyKFgSlA__eIhOMjqJMXAr3nE9LDmFwyMCS_gCOGWLYo9SbUJsu3qn4fjHH70MsaNa9EATtRqJlv6k09IKkjzYzlOjxXHchZeGXbopFYgTbgDT-j-5csx55HBtFxs-XjjDxV-WhC3iMUc0AX6vV7VfAkohfCDaZJVgQj6Nqu8_tqWye4T9dtwpsrjVQztVJZ8AY7utoyTtGTmOrhQXhMo7hhbk2d9FVkPaU2e48JpdD0CS5E2x6TD-9MLje4vJQWSz557djbE-o1e1cLg6LGDW12Qeon_RsvaYX_duVjyAuE7My7Nv3H4_FXre_z9ChawLvjfqdXxL-gilXEhXcdjTgxTriZMuXFL5_wtSqnoW4kJqjNwAlfaTi5dgGhVWhge1635i0zV-mkqZ8a4eLIbEJdlaj6dKtaMR7M-k6SxIvvjfJfKk2kQq5uSQwC9uBWEXGvsoGbTW1Shej5yaKHaUbj6Yz0EZ5gDiZJOZwrGwxDis9ZlT4Q8wExoq10ARokaSytoTrWrK-riwJtdBj6cvV9pPCLoHuTEzyb6MVz2ZgWJN2HALQRNc0QIDvMvQQQ2jFMvgE9URiv94NL2jNDZJtgNPj0LT2262i9YseaZ_yvU-WEc3pECy0bYF0zJJ9-panKbFyySAaI3mjhimBJ9306oOdw7xVrSRzqCtGkfVNc_uvvRK4MhmiuvBz0JVK5Jb8h30FQ"
    ];

    // Fetch the HTML content from the external URL with cookies and headers
    const response = await fetch("https://portal.helmholtzschule.de/?apiCall=vertretung", {
      method: "GET", // HTTP method (GET)
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:136.0) Gecko/20100101 Firefox/136.0",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "de,en-US;q=0.7,en;q=0.3",
        "Accept-Encoding": "gzip, deflate, br, zstd",
        "DNT": "1",
        "Referer": "https://portal.helmholtzschule.de/?apiCall=vertretung",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "same-origin",
        "Priority": "u=0, i",
        "Cache-Control": "max-age=0",
        "TE": "trailers",
        "Cookie": cookies.join('; ') // Add cookies to the request
      },
      mode: "cors", // Cross-origin resource sharing mode
    });

    // If the fetch request fails, send an error response
    if (!response.ok) {
      return res.status(response.status).send('Error fetching data');
    }

    const buffer = await response.arrayBuffer(); // Read as binary buffer
    const htmlResponse = new TextDecoder("iso-8859-1").decode(buffer); // Decode as iso-8859-1

    let htmlContent = htmlResponse

    res.send(htmlResponse);

    if (readfromfile){
      let dom = new JSDOM(htmlContent);
      let doc = dom.window.document;
      let headElements = doc.head.children;
      for (let i = headElements.length - 1; i >= 0; i--) {
          let tagName = headElements[i].tagName.toLowerCase();
          if (["meta", "title", "link"].includes(tagName)) {
              headElements[i].remove();
          }
      }
      let meta = doc.createElement("meta");
      meta.setAttribute("charset", "utf-8");
      doc.head.prepend(meta);
      htmlContent = doc.documentElement.outerHTML
    }


    if (htmlContent != lastResponse){
      lastResponse = htmlResponse
      readfromfile = false
      console.log("Something changed")
      saveResponseToFile(htmlContent)
    }


  } catch (error) {
    console.error('Error during fetch:', error);
    res.status(500).send('Error fetching data');
  }
  console.log("fetch performed " + new Date(Date.now()))
});

function saveResponseToFile(html) {
  const now = new Date(Date.now());
  const offset = now.getTimezoneOffset() * 60000; // Get timezone offset in milliseconds
  const timestamp = new Date(now - offset).toISOString()
  .replace(/:/g, "-") // Windows does not allow colons in filenames
  .replace("T", "_")
  .split(".")[0]; // Remove milliseconds
  const filePath = path.join(saveDir, `Vertretungsplan-${timestamp}.html`);
  let dom = new JSDOM(html);
  let doc = dom.window.document;
  let headElements = doc.head.children;
  for (let i = headElements.length - 1; i >= 0; i--) {
      let tagName = headElements[i].tagName.toLowerCase();
      if (["meta", "title", "link"].includes(tagName)) {
          headElements[i].remove();
      }
  }
  let meta = doc.createElement("meta");
  meta.setAttribute("charset", "utf-8");
  doc.head.prepend(meta);
  fs.writeFile(filePath, doc.documentElement.outerHTML, "utf-8", (err) => {
    if (err) {
        console.error("Error saving file:", err);
    } else {
        console.log(`New response saved as ${filePath}`);
    }
  });
}

// Start the server
app.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});