const fs = require("fs");
const path = require("path");
const { PDFDocument, rgb, StandardFonts } = require("pdf-lib");

const TEMPLATE_PATH = path.join(__dirname, "template.pdf");

async function generatePDF() {
  try {
    const name = document.getElementById("name").value || "Unnamed";
    const dob = document.getElementById("dob").value || "";
    const email = document.getElementById("email").value || "";
    const phone = document.getElementById("phone").value || "";
    const address = document.getElementById("address").value || "";
    const profileImgFile = document.getElementById("profilePhoto").files[0];
    const centerImgFile = document.getElementById("centerPhoto").files[0];

    const pdfBytes = fs.readFileSync(TEMPLATE_PATH);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const page = pdfDoc.getPages()[0];
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // write text — update coordinates later once you finalize layout
    let y = height - 120;
    const lineGap = 18;
    const addLine = (label, value) => {
      page.drawText(`${label}: ${value}`, {
        x: 70,
        y,
        size: 12,
        font,
        color: rgb(0, 0, 0)
      });
      y -= lineGap;
    };

    addLine("Name", name);
    addLine("DOB", dob);
    addLine("Email", email);
    addLine("Phone", phone);
    addLine("Address", address);

    // helper to embed images
    async function embedImage(file) {
      if (!file) return null;
      const bytes = new Uint8Array(await file.arrayBuffer());
      const type = file.type;
      if (type.includes("png")) return pdfDoc.embedPng(bytes);
      else if (type.includes("jpg") || type.includes("jpeg")) return pdfDoc.embedJpg(bytes);
      else return null;
    }

    const profileImg = await embedImage(profileImgFile);
    const centerImg = await embedImage(centerImgFile);

    if (profileImg) {
      page.drawImage(profileImg, {
        x: width - 150,
        y: height - 200,
        width: 100,
        height: 100,
      });
    }

    if (centerImg) {
      page.drawImage(centerImg, {
        x: width / 2 - 50,
        y: height / 2 - 50,
        width: 100,
        height: 100,
      });
    }

    // pick pendrive or fallback
    const drives = ["E:/", "F:/", "G:/"];
    let savePath = null;
    for (const drive of drives) {
      if (fs.existsSync(drive)) {
        savePath = path.join(drive, "Biodata_PDFs");
        if (!fs.existsSync(savePath)) fs.mkdirSync(savePath);
        break;
      }
    }

    if (!savePath) {
      savePath = path.join(__dirname, "local_backups");
      if (!fs.existsSync(savePath)) fs.mkdirSync(savePath);
    }

    const outPath = path.join(savePath, `${name}_${Date.now()}.pdf`);
    const outBytes = await pdfDoc.save();
    fs.writeFileSync(outPath, outBytes);
    alert(`✅ PDF created successfully:\n${outPath}`);
  } catch (err) {
    console.error(err);
    alert("⚠️ Something went wrong while creating the PDF. Check console for details.");
  }
}
