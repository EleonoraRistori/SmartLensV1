let version = 3;
//Caricamento dei dati da database e del modello
let detailIDs = undefined;
let details = undefined;
let objectDetector = undefined;

(function($){
    console.log("jQuery" + $);
    $.fn.getDetailFromWebcam = async function (options) {
        try {

            var $this = $(this);

            detailIDs = await function getDetailsIDs() {

                var request_type = "getDetailIDs";
                var tmp = null;
                $.ajax({
                    url: options.serverURL,
                    type: "POST",
                    async: false,
                    //contentType: 'application/json; charset=utf-8',
                    data: {
                        "action": request_type,
                        "version": version
                    },
                    dataType: "json",
                    //headers: {"Content-type" :"application/x-www-form-urlencoded"},
                    success: function (data) {
                        // Run the code here that needs
                        //    to access the data returned
                        tmp = data;
                        return data;
                    },
                    error: function (jqXHR, textStatus) {
                        console.log('DB error' + textStatus);
                        //alert('Error occured');
                    }
                });

                return tmp;
            }();

            console.log('DetailsIDs loaded succesfully!')

            details = await function getDetails() {
                let lang = undefined;
                if(document.getElementById('Italian').href == window.location.href + '#')
                    lang = 'ita';
                else
                    lang = 'en';
                var request_type = "getDetails";
                var tmp = null;
                $.ajax({
                    url: options.serverURL,
                    type: "POST",
                    async: false,
                    //contentType: 'application/json; charset=utf-8',
                    data: {
                        "action": request_type,
                        "lang": lang,
                        "version": version
                    },
                    dataType: "json",
                    //headers: {"Content-type" :"application/x-www-form-urlencoded"},
                    success: function (data) {
                        // Run the code here that needs
                        //    to access the data returned
                        tmp = data;
                        return data;
                    },
                    error: function (jqXHR, textStatus) {
                        console.log('DB error' + textStatus);
                        //alert('Error occured');
                    }
                });

                return tmp;
            }();
            console.log('details loaded succesfully!')







        } catch(error) {
            console.log(error)
            alert('La tua connessione Internet è troppo lenta!')
        }
    }
})(jQuery);

try{
    objectDetector = await tf.loadGraphModel(
        'http://localhost/SmartLens/networkModels/exported_tfjs_30000/exported_tfjs_30000',
        {fromTFHub: true});

    console.log('Object Detector loaded Succesfully!');
} catch(error) {
    console.log(error)
    alert('La tua connessione Internet è troppo lenta!')
}

setTimeout(function(){
    camera_box.classList.add('loaded');
}, 500);


function drawBoxes(bounding_box, color){
    let box = document.createElement('p');
    camera_box.appendChild(box)
    let x, y = undefined;
    if(document.documentElement.clientWidth / document.documentElement.clientHeight > webcam.videoWidth / webcam.videoHeight){
        let offsetY = (document.documentElement.clientWidth * 3/4 - document.documentElement.clientHeight) / 2
        x = bounding_box[1] * document.documentElement.clientWidth;
        y = bounding_box[0] * webcam.videoHeight * document.documentElement.clientWidth / webcam.videoWidth - offsetY;
    }else{
        let offsetX = (document.documentElement.clientHeight * 4/3 - document.documentElement.clientWidth) / 2;
        x = bounding_box[1] * webcam.videoWidth * document.documentElement.clientHeight / webcam.videoHeight - offsetX;
        y = bounding_box[0] *  document.documentElement.clientHeight;
    }
    let width = bounding_box[3] * document.documentElement.clientWidth - x;
    let height = bounding_box[2] * document.documentElement.clientWidth - y;
    box.style.position = 'fixed'
    box.style.zIndex = '2'
    box.style.left = String(x) + 'px';
    box.style.top =String(y) + 'px';
    box.style.width = String(width) + 'px';
    box.style.height = String(height) + 'px';
    box.style.border = '4px solid ' + color;
    box.style.margin = '0';
    box.classList.add('bounding-box');

}



async function detectObjects(webcam){

    let videoFrameAsTensor = tf.browser.fromPixels(webcam);

    let normalizedTensorFrame = videoFrameAsTensor.reshape([1, webcam.videoHeight, webcam.videoWidth, 3])

    return  await objectDetector.executeAsync(normalizedTensorFrame).then(predictions =>{
        return predictions
    })

}



function getObjects(predictions){
    let boundingBoxes = predictions[0].arraySync();
    let classes = predictions[2].arraySync();
    let probabilities = predictions[3].arraySync();
    let recognisedDetails = []
    let recognisedBoxes = []
    for(let i=0; i<classes[0].length; i++){
        if(probabilities[0][i] > 0.85 && !recognisedDetails.includes(classes[0][i])){
            recognisedDetails.push(classes[0][i])
            recognisedBoxes.push(boundingBoxes[0][i])
        }
    }
    return [recognisedDetails, recognisedBoxes]

}

const setSheetHeight = (value) => {
    sheetHeight = Math.max(0, Math.min(100, value))
    sheetContents.style.height = `${sheetHeight}vh`

    if (sheetHeight === 100) {
        sheetContents.classList.add("fullscreen")
    } else {
        sheetContents.classList.remove("fullscreen")
    }
}

const setIsSheetShown = (value) => {
    sheet.setAttribute("aria-hidden", String(!value))
}



async function predictLoop() {

    console.log('Recognition Started!')
    let bounding_boxes = document.getElementsByClassName('bounding-box')
    for (let i=bounding_boxes.length-1; i >= 0; i--){
        bounding_boxes[i].remove();
    }

    let imageObjects = await detectObjects(webcam);
    let predictions = getObjects(imageObjects);
    let results = predictions[0];
    let boundingBoxes = predictions[1];
    if (results.length !== 0) {

        let main_artwork = details[detailIDs[results[0]]]['artwork-id'];
        for(let i=0; i<detailLinks.length; i++){
            detailLinks[i].style.display = 'none';
        }

        detailContainer.style.display = 'none';
        artworkTitle.innerText = details[main_artwork]['artwork'];
        author.innerText = details[main_artwork]['author'];
        detailName.innerText = details[main_artwork]['detail-name'];
        detailImage.src = details[main_artwork]['image'];
        description.innerText = details[main_artwork]['description'];
        if(details[main_artwork]['audio-guide'] != "") {
            document.getElementById('audio').style.display = 'block';
            document.getElementById('audio').src = details[main_artwork]['audio-guide'];
            document.getElementById('audioGuide').style.display = 'none';
            document.getElementById('restart').style.display = 'none';
        }else{
            document.getElementById('audioGuide').style.display = 'inline';
            document.getElementById('audio').style.display = 'none';
        }

        if(details[main_artwork]['video'] != ""){
            document.getElementById('detailVideo').src = details[main_artwork]['video'];
            document.getElementById('detailVideo').style.display = 'block';
            document.getElementById('detailVideo').poster = details[main_artwork]['image'];
        }else{
            document.getElementById('detailVideo').style.display = 'none';
        }
        setIsSheetShown(true)
        let detailNames = [];
        let colors = ['#2E92A9', '#F4F4F4', '#EF7365', '#FBD26C']
        for(let i in results){
            if (!detailNames.includes(details[detailIDs[results[i]]]['detail-name'])) {
                detailNames.push(details[detailIDs[results[i]]]['detail-name']);
                info.style.display = 'block';
                detailLinks[i].style.display = 'block';
                detailContainer.style.display = 'flex';
                detailImg[i].src = details[detailIDs[results[i]]]['detail-icon'];
                detailImg[i].style.borderColor = colors[i];
                detailLabels[i].innerText = details[detailIDs[results[i]]]['detail-name'];
                detailLinks[i].href = 'detailView.php?id=' + detailIDs[results[i]];
                drawBoxes(boundingBoxes[i], colors[i])
            } else {
                detailLinks[i].style.display = 'none';
            }
        }

    }




}

function startPredictLoop() {
    if (webcam.readyState >= 2) {
        console.log('Ready to predict')
        setInterval(function (){predictLoop()}, 2000)
    } else {
        setTimeout(function (){startPredictLoop()}, 1000)
    }
}







const webcam = document.getElementById('camera--view');
const camera_box = document.getElementById('camera');

const detailContainer = document.getElementById('detailContainer')
let video = document.querySelector('#camera--view')


const sheetContents = sheet.querySelector(".contents");

const artworkTitle = document.getElementById('artworkTitle');
const author = document.getElementById('author');
const detailName = document.getElementById('detailName');
const detailImage = document.getElementById('detailImage');
const description = document.getElementById('description');
const detailLinks = document.getElementsByClassName('details');
const detailImg = document.getElementsByClassName('detailImg');
const detailLabels = document.getElementsByClassName('detailLabel');
const info = document.getElementById('over-details');

setSheetHeight(Math.min(16, 720 / window.innerHeight * 100));
startPredictLoop();

