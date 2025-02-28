// At the start of your file, get the latest email content
let latestEmailContent = '';

chrome.storage.local.get(['latestEmailContent'], function(result) {
    latestEmailContent = result.latestEmailContent || '';
});

async function sendMessage() {
    const chatBox = document.getElementById("chat-box");
    const userInput = document.getElementById("user-input");
    const userMessage = userInput.value.trim();
  
    if (userMessage) {
        const userMessageElement = document.createElement("div");
        userMessageElement.className = "user-message";
        userMessageElement.textContent = userMessage;
        chatBox.appendChild(userMessageElement);
  
        const botMessageElement = document.createElement("div");
        botMessageElement.className = "bot-message";
        botMessageElement.textContent = "Processing...";
        chatBox.appendChild(botMessageElement);
   
        const message = userInput.value;
        userInput.value = "";
      
        try {
            const reply = await fetch("http://127.0.0.1:5000/chat", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    message,
                    emailContent: latestEmailContent // Include the email content
                })
            });
  
            const final = await reply.json();
            botMessageElement.remove();
            
            const finalMessageElement = document.createElement("div");
            finalMessageElement.className = "bot-message";
            finalMessageElement.textContent = final.response;
            chatBox.appendChild(finalMessageElement);
        } catch {
            botMessageElement.remove();
            const errorMessageElement = document.createElement("div");
            errorMessageElement.className = "error-message";
            errorMessageElement.textContent = "Error fetching response";
            chatBox.appendChild(errorMessageElement);
        }
    }
}

// Add event listener for Enter key
document.getElementById("user-input").addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage();
});

// Add event listener for Send button
document.getElementById("send-button").addEventListener("click", sendMessage);

// Add message listener for content updates
window.addEventListener('message', (event) => {
    if (event.data.type === 'emailContentUpdate') {
        latestEmailContent = event.data.content;
        console.log('Email content updated in popup');
    }
});

// Request latest content when popup loads
window.parent.postMessage({ type: 'requestEmailContent' }, '*');
    