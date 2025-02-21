from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import fitz  # PyMuPDF
import re
import logging
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
import os
from dotenv import load_dotenv

load_dotenv()
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

app = Flask(__name__, static_folder="../scripts", static_url_path="")
CORS(app)


logging.basicConfig(level=logging.INFO)

# Gemini AI (LangChain)
llm = ChatGoogleGenerativeAI(model="gemini-1.5-pro", google_api_key=GOOGLE_API_KEY)

# Chat Prompt
prompt_template = ChatPromptTemplate.from_messages([
    ("user", "You are an AI assistant specializing in drafting professional emails and LinkedIn messages. Your goal is to generate clear, concise, and relevant responses based on user input."),
    # ("user", "If the request contains references to existing information (e.g., extracted document text), use that data to improve accuracy. Do not generate information that is not provided."),
    ("user", "If the request is unclear or lacks enough context, ask for clarification instead of making assumptions."),
    ("user", "Latest email content: {latest_email_content}"),
    ("user", "Request: {message}")
])


latest_email_content = None
output_parser = StrOutputParser()
chain = prompt_template | llm | output_parser

# Frontend (popup.html)
@app.route("/")
def frontend():
    return send_from_directory(app.static_folder, "popup.html")

@app.route("/email", methods=["POST"])
def receive_email():
    global latest_email_content
    
    # Add more detailed logging
    logging.info(f"Received request headers: {dict(request.headers)}")
    logging.info(f"Received request data: {request.get_data()}")
    
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data received"}), 400
        
        if "message" not in data:
            return jsonify({"error": "Missing 'message' field in JSON"}), 400

        latest_email_content = data["message"].strip()
        logging.info(f"Processed email content: {latest_email_content[:100]}...")
        
        return jsonify({"message": "Email content stored successfully"}), 200
    except Exception as e:
        logging.error(f"Error processing request: {str(e)}")
        return jsonify({"error": f"Error processing request: {str(e)}"}), 400

# API Route
@app.route("/chat", methods=["POST"])
def chat():
    # Add more detailed logging
    logging.info(f"Received request headers: {dict(request.headers)}")
    logging.info(f"Received request data: {request.get_data()}")
    
    try:
        if request.content_type != "application/json":
            return jsonify({"error": "Invalid Content-Type, expected application/json"}), 415

        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data received"}), 400
            
        if "message" not in data:
            return jsonify({"error": "Missing 'message' field in JSON"}), 400

        message = data["message"].strip()
        logging.info(f"Processing message: {message[:100]}...")

        response = chain.invoke({
            "message": message,
            "latest_email_content": latest_email_content or ""
        })
        logging.info(f"Response: {response}")
        return jsonify({"response": response})
    except Exception as e:
        logging.error(f"Error processing request: {str(e)}")
        return jsonify({"error": f"Error processing request: {str(e)}"}), 400


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
