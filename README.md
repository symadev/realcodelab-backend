# ⚡ RealCodeLab Backend  

The **backend** of RealCodeLab — a real-time collaborative coding platform that enables multiple users to **write, edit, and run code together** seamlessly.  
Built with **Node.js, Express, and Socket.IO**, and powered by **Judge0 API** for secure multi-language code execution.  

---

## ✨ Features  

- 🌐 **Real-time Collaboration** – powered by Socket.IO  
- ✍️ **Live Code Sync** – CRDT synchronization (via Yjs on frontend)  
- ⚙️ **Code Execution Engine** – Judge0 API integration for multiple languages  
- 🔒 **Secure Authentication** – JWT-based user authentication  
- 📁 **Room-based Sessions** – isolated coding rooms for teams  

---

## 🛠️ Tech Stack  

<p align="center">
  <img src="https://img.shields.io/badge/-Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/-Express-000000?style=for-the-badge&logo=express&logoColor=white" />
  <img src="https://img.shields.io/badge/-Socket.IO-010101?style=for-the-badge&logo=socket.io&logoColor=white" />
  <img src="https://img.shields.io/badge/-JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white" />
  <img src="https://img.shields.io/badge/-Judge0%20API-FF6C37?style=for-the-badge&logo=api&logoColor=white" />
  <img src="https://img.shields.io/badge/-MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white" />
</p>  

---

## 🚀 Backend Setup  

### Prerequisites  
- Node.js (v14 or higher)  
- npm or yarn package manager  
- Judge0 API key  

### Steps  

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Add your environment variables
JUDGE_API_KEY=your_judge_rapid_api_key
PORT=5001

# Start the server
npm start

```







