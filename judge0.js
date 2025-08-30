import fetch from "node-fetch";
import dotenv from 'dotenv';

dotenv.config();

const JUDGE0_URL = process.env.JUDGE0_URL;
const JUDGE0_KEY = process.env.JUDGE0_KEY;

// Language IDs for Judge0
export const LANGUAGE_IDS = {
  javascript: 63,  // Node.js
  python: 71,      // Python 3
  java: 62,        // Java
  cpp: 54,         // C++ (GCC 9.2.0)
  c: 50,           // C (GCC 9.2.0)
  csharp: 51,      // C# (Mono 6.6.0.161)
  go: 60,          // Go (1.13.5)
  rust: 73,        // Rust (1.40.0)
  php: 68,         // PHP (7.4.1)
  ruby: 72,        // Ruby (2.7.0)
  typescript: 74,  // TypeScript (3.7.4)
};

export async function compileCode({ language_id, source_code, stdin = "" }) {
  try {
    if (!JUDGE0_URL || !JUDGE0_KEY) {
      throw new Error('Judge0 configuration missing. Please set JUDGE0_URL and JUDGE0_KEY environment variables.');
    }

    console.log('Submitting code to Judge0:', {
      language_id,
      source_code_length: source_code.length,
      has_stdin: !!stdin
    });

    const response = await fetch(
      `${JUDGE0_URL}/submissions/?base64_encoded=false&wait=true`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-RapidAPI-Key": JUDGE0_KEY,
          "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
        },
        body: JSON.stringify({ 
          language_id: parseInt(language_id), 
          source_code, 
          stdin: stdin || ""
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Judge0 API error:', response.status, errorText);
      throw new Error(`Judge0 API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    
    console.log('Judge0 response:', {
      status: result.status?.description,
      has_output: !!result.stdout,
      has_error: !!result.stderr
    });

    // Return formatted result
    return {
      stdout: result.stdout || null,
      stderr: result.stderr || null,
      compile_output: result.compile_output || null,
      message: result.message || null,
      status: result.status || null,
      time: result.time || null,
      memory: result.memory || null,
      token: result.token || null,
      // Additional metadata
      language_id: result.language_id,
      created_at: result.created_at,
      finished_at: result.finished_at
    };
  } catch (err) {
    console.error("Judge0 submission error:", err);
    
    // Return error in consistent format
    return {
      stdout: null,
      stderr: err.message,
      compile_output: null,
      message: "Compilation service error",
      status: { id: -1, description: "Service Error" },
      time: null,
      memory: null,
      token: null,
      error: true
    };
  }
}

export async function getSubmission(token) {
  try {
    if (!JUDGE0_URL || !JUDGE0_KEY) {
      throw new Error('Judge0 configuration missing');
    }

    if (!token) {
      throw new Error('Submission token is required');
    }

    console.log('Getting submission result for token:', token);

    const response = await fetch(
      `${JUDGE0_URL}/submissions/${token}?base64_encoded=false`,
      {
        method: "GET",
        headers: {
          "X-RapidAPI-Key": JUDGE0_KEY,
          "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Judge0 get submission error:', response.status, errorText);
      throw new Error(`Failed to get submission: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    
    console.log('Submission result:', {
      token: result.token,
      status: result.status?.description,
      finished: result.finished_at ? true : false
    });

    return {
      stdout: result.stdout || null,
      stderr: result.stderr || null,
      compile_output: result.compile_output || null,
      message: result.message || null,
      status: result.status || null,
      time: result.time || null,
      memory: result.memory || null,
      token: result.token,
      language_id: result.language_id,
      created_at: result.created_at,
      finished_at: result.finished_at
    };
  } catch (err) {
    console.error("Judge0 get submission error:", err);
    throw new Error(`Failed to get submission: ${err.message}`);
  }
}

// Helper function to get language name from ID
export function getLanguageName(languageId) {
  const idToName = {};
  for (const [name, id] of Object.entries(LANGUAGE_IDS)) {
    idToName[id] = name;
  }
  return idToName[languageId] || 'Unknown';
}

// Helper function to validate language ID
export function isValidLanguageId(languageId) {
  return Object.values(LANGUAGE_IDS).includes(parseInt(languageId));
}