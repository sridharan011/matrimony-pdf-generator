const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const { PDFDocument, rgb, StandardFonts } = require("pdf-lib");

function createWindow() {
  const win = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  win.loadFile("index.html");
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.on("generate-biodata-pdf", async (event, data) => {
  try {
    const { name, dob, email, phone, profilePhoto, centerPhoto } = data;

    const TEMPLATE_PATH = path.join(__dirname, "template.pdf");
    const templateBytes = fs.readFileSync(TEMPLATE_PATH);
    const pdfDoc = await PDFDocument.load(templateBytes);
    const page = pdfDoc.getPages()[0];
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // --- Draw text fields ---
    let y = height - 120;
    const gap = 20;
    const draw = (label, value) => {
      page.drawText(`${label}: ${value || "-"}`, {
        x: 70,
        y,
        size: 12,
        font,
        color: rgb(0, 0, 0),
      });
      y -= gap;
    };

    draw("Name", name);
    draw("Date of Birth", dob);
    draw("Email", email);
    draw("Phone", phone);

    // --- Embed images ---
    if (profilePhoto) {
      const bytes = Buffer.from(profilePhoto, "base64");
      try {
        const img = await pdfDoc.embedJpg(bytes);
        page.drawImage(img, {
          x: width - 150,
          y: height - 200,
          width: 100,
          height: 100,
        });
      } catch {
        const img = await pdfDoc.embedPng(bytes);
        page.drawImage(img, {
          x: width - 150,
          y: height - 200,
          width: 100,
          height: 100,
        });
      }
    }

    if (centerPhoto) {
      const bytes = Buffer.from(centerPhoto, "base64");
      try {
        const img = await pdfDoc.embedJpg(bytes);
        page.drawImage(img, {
          x: width / 2 - 50,
          y: height / 2 - 50,
          width: 100,
          height: 100,
        });
      } catch {
        const img = await pdfDoc.embedPng(bytes);
        page.drawImage(img, {
          x: width / 2 - 50,
          y: height / 2 - 50,
          width: 100,
          height: 100,
        });
      }
    }

    // --- Save location (pendrive or fallback) ---
    const drives = ["E:/", "F:/", "G:/"];
    let savePath = drives.find((d) => fs.existsSync(d)) || __dirname;
    const folder = path.join(savePath, "Biodata_PDFs");
    if (!fs.existsSync(folder)) fs.mkdirSync(folder);

    const filePath = path.join(folder, `${name || "biodata"}_${Date.now()}.pdf`);
    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync(filePath, pdfBytes);

    event.reply("pdf-generated", `✅ PDF saved at:\n${filePath}`);
  } catch (err) {
    console.error("Error creating PDF:", err);
    event.reply("pdf-generated", "⚠️ Error: Could not create PDF. Check console for details.");
  }
});
