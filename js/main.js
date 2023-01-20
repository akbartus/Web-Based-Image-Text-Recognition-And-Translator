// Options
const tesseractOrigin = "eng";
const sourceLang = "en";
let targetLang = "ru";
const showBoundingBox = false;
const size = 0; // text size
const fontStyle = "Arial Narrow";
let dynamic = false; // text style
let simple = true; // text style
let fitText = false;
let textBackground = false;

// Some global variables
const canvas = document.getElementById("canvas");
let translatedText = [];
let fullTranslation;
let fontSize;
let link = document.getElementById('link');

// Select language to translate to
let language = document.getElementById("language");
function onChange() {
  targetLang = language.value;
  //let text = language.options[language.selectedIndex].text;
}
language.onchange = onChange;
onChange();

// Checkboxes
function option1() {
  let textStyle = document.getElementById("textStyle");
  if (textStyle.checked == true) {
    dynamic = true;
    simple = false;
  } else {
    dynamic = false;
    simple = true;
  }
}
function option2() {
  let fitWidth = document.getElementById("fitWidth");
  if (fitWidth.checked == true) {
    fitText = true;
  } else {
    fitText = false;
  }
}
function option3() {
  let textBack = document.getElementById("textBack");
  if (textBack.checked == true) {
    textBackground = true;
  } else {
    textBackground = false;
  }
}

// Tesseract API
const { createWorker, PSM } = Tesseract;
// File Reader
function previewFile() {
  const preview = document.querySelector("img");
  const file = document.querySelector("input[type=file]").files[0];
  const reader = new FileReader();

  reader.addEventListener(
    "load",
    () => {
      // convert image file to base64 string
      preview.src = reader.result;
    },
    false
  );
  if (file) {
    reader.readAsDataURL(file);
    myFunction();
  }
}

async function myFunction() {
  // Create Worker
  const worker = await createWorker();
  let loadedImage = document.querySelector("#wrapper").src;
  (async () => {
    await worker.loadLanguage(tesseractOrigin);
    await worker.initialize(tesseractOrigin);
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.AUTO, // change if necessary to different mode,
      user_defined_dpi: "70", // original DPI is 70.
    });

    const { data } = await worker.recognize(loadedImage);
    // replace new line symbols to prevent interrupted translations
    let ocrText = data.text.replace(/\n\n/g, "<br>").replace(/\n/g, "<br>");
    let sourceText = ocrText;
    // Google API
    const url =
      "https://translate.googleapis.com/translate_a/single?client=gtx&sl=" +
      sourceLang +
      "&tl=" +
      targetLang +
      "&dt=t&q=" +
      encodeURI(sourceText);
    fetch(url)
      .then(function (response) {
        return response.json();
      })
      .then(function (translation) {
        // Check if length of the translated text is greater than 1 word or equal
        if (translation[0].length > 1) {
          for (let i = 0; i < translation[0].length; i++) {
            // Gather all translated text
            fullTranslation += translation[0][i][0];
          }
        } else if (translation[0].length === 1) {
          fullTranslation = translation[0][0][0];
        }
        // Remove occasionall null or undefined value from translated text
        fullTranslation = fullTranslation.replace("undefined", "");

        // Get total number of lines in original text
        let numberOfLines = data.lines.length;
        // Put translated text into array by splitting it by <br> tag
        translatedText = fullTranslation.split("<br>", numberOfLines);

        //Add bounding image and box to canvas, replace box with text
        let ctx = canvas.getContext("2d");
        let image = new Image();
        image.src = loadedImage;
        image.crossOrigin = "Anonymous";
        // on image load
        image.onload = () => {
          canvas.width = image.width + 400; // extend the width if necessary
          canvas.height = image.height;

          // Draw original image on canvas
          ctx.drawImage(image, 0, 0);

          for (let n = 0; n < data.lines.length; n++) {
            // Chose whether font size should be dynamic based on original OCRed text or not
            if (dynamic) {
              fontSize = data.lines[n].words[0].font_size + size;
            } else if (simple) {
              fontSize = data.lines[1].words[0].font_size + size;
              }
              
            ctx.beginPath(); // very important, it tells that drawing begins
            
            // Add some rules, to make sure that some unexpected lines with characters are ommitted
            if (
              data.lines[n].text != " \n" &&
              data.lines[n].text != "  \n" &&
              data.lines[n].text != " \n\n" &&
              data.lines[n].text != "  \n\n" &&
              data.lines[n].text != "   \n\n"
            ) {
              // Get color behind text line's x,y points (getting second line text)
              const mainColor = ctx.getImageData(
                data.lines[1].bbox.y0,
                data.lines[1].bbox.y0,
                1,
                1
              );
              const r = mainColor.data[0];
              const g = mainColor.data[1];
              const b = mainColor.data[2];
              
              // Draw rectangle
              ctx.rect(
                data.lines[n].bbox.x0,
                data.lines[n].bbox.y0,
                data.lines[n].bbox.x1 - data.lines[n].bbox.x0,
                data.lines[n].bbox.y1 - data.lines[n].bbox.y0 + 10
              );
                // Add text background color, if true
              if (textBackground === true) {                
                ctx.fillStyle = `rgb(${r},${g},${b})`;
              } else {
                // Add white background to hide original image
                ctx.fillStyle = "white";
              }
              ctx.fill();

              // Show bounding box if necessary
              if (showBoundingBox === true) {
                ctx.stroke();
              }
              // Add text. Fit text to bounding box, if not, make it smaller
              if (fitText === true) {
                do {
                  fontSize--;
                  ctx.font = fontSize + "px " + fontStyle;
                } while (
                  ctx.measureText(translatedText[n]).width >
                  data.lines[n].bbox.x1 - data.lines[n].bbox.x0
                );
              } else {
                ctx.font = fontSize + "px " + fontStyle;
              }
              ctx.fillStyle = "black";

              // Do not show undefined if there is no more text placed on lines
              if (translatedText[n] != null) {
                ctx.fillText(
                  translatedText[n],
                  data.lines[n].bbox.x0,
                  data.lines[n].bbox.y0 + fontSize); // font-Size = offset on y axix
              }
            }
          }
        };
      });
    await worker.terminate();
    link.style.display = "block";
  })();
}




  
function downloadImage() {
  link.setAttribute('download', 'translatedImage.png');
  link.setAttribute('href', canvas.toDataURL("image/png").replace("image/png", "image/octet-stream"));
 
    }