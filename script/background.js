// background.js
// chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
//     if(request.action === "showPopup") {
      
//             chrome.windows.create({
//                 url: chrome.runtime.getURL('popup.html'),
//                 type: 'popup',
//                 width: 400,
//                 height: 500,
//                 top: 100,
//                 left: 100
//             }, function(window) {
//                 // Handle popup creation
//             });
            
            
//     }
// });

let retryCount = 0;
const MAX_RETRIES = 3;
const BACKOFF_DELAY = 1000;

async function keepServiceWorkerAlive(promise) {
    const keepAlive = setInterval(() => {
        chrome.runtime.getPlatformInfo();
    }, 25 * 1000);
    
    try {
        await promise;
    } finally {
        clearInterval(keepAlive);
    }
}

async function sendToChatbot(emailContent) {
    if (!emailContent) {
        console.warn("No email content to send.");
        return;
    }
    
    if (retryCount > MAX_RETRIES) {
        console.error("Max retries reached. Stopping request.");
        return;
    }
    
    // const proxyUrl = '"https://localhost.workers.dev"';
    try {
        const response = await fetch("http://127.0.0.1:5000/email", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ message: emailContent })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const data = await response.json();
        retryCount = 0;
        chrome.runtime.sendMessage({
            type: "chatbotResponse",
            content: data.response
        });
        return data;
    } catch (error) {
        console.error("Error sending to chatbot:", error);
        retryCount++;
        await new Promise(resolve => setTimeout(resolve, BACKOFF_DELAY * retryCount));
        return sendToChatbot(emailContent);
    }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "emailContent") {
        // Store the latest email content
        chrome.storage.local.set({ 'latestEmailContent': message.content });
        
        keepServiceWorkerAlive(sendToChatbot(message.content));
        sendResponse({ status: "processing" });
    }
    return true;
});