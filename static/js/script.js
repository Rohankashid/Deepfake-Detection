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
    document.getElementById('videoPreview').src = '';
    document.getElementById('videoPreviewContainer').style.display = 'none';
    document.getElementById('analysis-result').innerHTML = '';
    document.getElementById('justification').innerHTML = '';
    document.getElementById('analyzeAnotherBtn').style.display = 'none';
}

function handleVideoSubmit(event) {
    event.preventDefault();
    const videoInput = document.getElementById('videoFile');
    const errorMessage = document.getElementById('error-message');
    const file = videoInput.files[0];

    if (file && file.size > MAX_FILE_SIZE) {
        errorMessage.style.display = 'block';
        videoInput.value = '';
        return;
    }

    errorMessage.style.display = 'none';

    if (file) {
        loaderContainer.style.display = 'flex';
        processingOverlay.style.display = 'flex';
        analyzeBtn.classList.add('is-loading');
        analyzeBtn.disabled = true;

        uploadVideo(file);
    }
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