const MAX_FILE_SIZE = 100 * 1024 * 1024;
const analyzeBtn = document.getElementById('analyzeBtn');
const loaderContainer = document.getElementById('loaderContainer');
const resultContainer = document.getElementById('result-container');
const analysisResult = document.getElementById('analysis-result');
const analyzeAnotherBtn = document.getElementById('analyzeAnotherBtn');
const processingOverlay = document.getElementById('processingOverlay');
const videoPreview = document.getElementById('videoPreview');

function displayResult(result) {
    const resultContainer = document.getElementById('analysis-result');
    const justificationElement = document.getElementById('justification');
    const analyzeAnotherBtn = document.getElementById('analyzeAnotherBtn');
    
    // Display the main result
    resultContainer.innerHTML = `
        <h3>Analysis Result</h3>
        <p class="result-text ${result.isFake ? 'fake' : 'real'}">
            ${result.isFake ? '⚠️ This video appears to be FAKE' : '✅ This video appears to be REAL'}
        </p>
        <p class="confidence">Confidence: ${result.confidence}%</p>
    `;

    // Display the justification
    justificationElement.innerHTML = `
        <h4>Analysis Details:</h4>
        <p>${result.justification || 'No detailed analysis available.'}</p>
    `;

    analyzeAnotherBtn.style.display = 'block';
}

function resetForm() {
    document.getElementById('videoForm').reset();
    document.getElementById('frameDisplay').innerHTML = '';
    document.getElementById('videoPreview').src = '';
    document.getElementById('videoPreviewContainer').style.display = 'none';
    document.getElementById('analysis-result').innerHTML = '';
    document.getElementById('justification').innerHTML = '';
    document.getElementById('analyzeAnotherBtn').style.display = 'none';

    const errorMessage = document.getElementById('error-message');
    if (errorMessage) {
        errorMessage.style.display = 'none';
        errorMessage.textContent = '';
    }
    // DO NOT call videoPreview.load() here!
}

function handleVideoSubmit(event) {

    console.log("inside handlevideo submit")
    event.preventDefault();
    const fileInput = document.getElementById('videoFile');
    const file = fileInput.files[0];

    if (file.size > 100 * 1024 * 1024) {
        document.getElementById('error-message').style.display = 'block';
        return;
    }

    document.getElementById('loaderContainer').style.display = 'block';

    const formData = new FormData();
    formData.append('video', file);

    fetch('/upload', {
        method: 'POST',
        body: formData
    })
    .then(res => res.json())
    .then(data => {
        document.getElementById('loaderContainer').style.display = 'none';
        document.getElementById('analysis-result').innerText = `Prediction: ${data.prediction} (${data.confidence})`;
        document.getElementById('justification').innerText = data.justification;
        document.getElementById('analyzeAnotherBtn').style.display = 'block';

        // Display frames
        const frameContainer = document.getElementById('frameDisplay');
        frameContainer.innerHTML = ''; // Clear previous frames
        if (data.frames && data.frames.length > 0) {
            data.frames.forEach(url => {
                const img = document.createElement('img');
                img.src = url + '?t=' + new Date().getTime();
                img.alt = 'Extracted Frame';
                img.className = 'frame-image';
                frameContainer.appendChild(img);
            });
        }
        console.log("Frames received:", data.frames);
    })
    .catch(err => {
        document.getElementById('loaderContainer').style.display = 'none';
        alert("Error analyzing video: " + err);
    });
}


function uploadVideo(file) {
    const formData = new FormData();
    formData.append('video', file);

    fetch('http://127.0.0.1:5000/upload', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        loaderContainer.style.display = 'none';
        processingOverlay.style.display = 'none';
        analyzeBtn.classList.remove('is-loading');
        analyzeBtn.disabled = false;

        if (data.status === 'success') {
            analysisResult.innerHTML = `<p>Analysis Complete: <strong>${data.prediction}</strong> ${data.confidence} confidence</p>`;
            // Add justification display
            const justificationElement = document.getElementById('justification');
            justificationElement.innerHTML = `
                <h4>Analysis Details:</h4>
                <p>${data.justification || 'No detailed analysis available.'}</p>
            `;
            resultContainer.style.display = 'block';
            analyzeAnotherBtn.style.display = 'block';
        } else {
            analysisResult.innerHTML = `<p style="color: red;">Error: ${data.message}</p>`;
            resultContainer.style.display = 'block';
            analyzeAnotherBtn.style.display = 'block';
        }
    })
    .catch(error => {
        console.error('Error:', error);
        loaderContainer.style.display = 'none';
        processingOverlay.style.display = 'none';
        analyzeBtn.classList.remove('is-loading');
        analyzeBtn.disabled = false;
        analysisResult.innerHTML = `<p style="color: red;">Analysis failed. Please try again.</p>`;
        resultContainer.style.display = 'block';
        analyzeAnotherBtn.style.display = 'block';
    });
}

function previewVideo() {
    document.getElementById('analysis-result').innerHTML = '';
    document.getElementById('justification').innerHTML = '';
    document.getElementById('frameDisplay').innerHTML = '';
    const videoFileInput = document.getElementById('videoFile');
    const videoPreview = document.getElementById('videoPreview');
    const videoPreviewContainer = document.getElementById('videoPreviewContainer');
    const errorMessage = document.getElementById('error-message');
    const file = videoFileInput.files[0];

    if (file) {
        if (file.size > MAX_FILE_SIZE) {
            errorMessage.style.display = 'block';
            videoFileInput.value = '';
            videoPreview.src = '';
            videoPreviewContainer.style.display = 'none';
            return;
        }

        errorMessage.style.display = 'none';

        const videoURL = URL.createObjectURL(file);
        videoPreview.src = videoURL;

        videoPreview.onloadeddata = () => {
            console.log("Video is ready to play.");
            videoPreviewContainer.style.display = 'block';
            videoPreview.style.display = 'block';
        };

        videoPreview.onerror = () => {
            console.error("⚠️ Video preview failed — possibly unsupported codec.");
            errorMessage.style.display = 'block';
            errorMessage.textContent = '⚠️ Cannot preview this video. Unsupported format or corrupted file.';
            videoPreviewContainer.style.display = 'none';
        };

        videoPreview.load();
    } else {
        videoPreview.src = '';
        videoPreviewContainer.style.display = 'none';
    }
}

document.addEventListener('DOMContentLoaded', function() {
    // console.log("clickeddddddd")
    const analyzeAnotherBtn = document.getElementById('analyzeAnotherBtn');
    if (analyzeAnotherBtn) {
        analyzeAnotherBtn.addEventListener('click', resetForm);
    }
});