import fetch from "node-fetch";

const JUDGE0_URL = process.env.JUDGE0_URL; // https://judge0-ce.p.rapidapi.com
const JUDGE0_KEY = process.env.JUDGE0_KEY; // Your RapidAPI key

export async function compileCode({ language_id, source_code, stdin }) {
  try {
    const response = await fetch(
      `${JUDGE0_URL}/submissions/?base64_encoded=false&wait=true`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-RapidAPI-Key": JUDGE0_KEY,
          "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
        },
        body: JSON.stringify({ language_id, source_code, stdin: stdin || "" }),
      }
    );

    const result = await response.json();

    // return only the output
    return {
      stdout: result.stdout,
      stderr: result.stderr,
      compile_output: result.compile_output,
      message: result.message,
      status: result.status,
    };
  } catch (err) {
    console.error("Judge0 submission error:", err);
    throw new Error("Failed to compile code");
  }
}
