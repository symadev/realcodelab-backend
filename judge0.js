import axios from 'axios';

const BASE = process.env.JUDGE0_URL;
const headers = process.env.JUDGE0_KEY ? {
  'x-rapidapi-key': process.env.JUDGE0_KEY,
  'x-rapidapi-host': 'judge0-ce.p.rapidapi.com',
  'Content-Type': 'application/json',
} : {
  'Content-Type': 'application/json',
};

export async function compileCode({ language_id, source_code, stdin = '', base64Encoded = false }) {
  try {
    const queryParams = new URLSearchParams({
      base64_encoded: base64Encoded.toString(),
      wait: 'false',
    }).toString();

    const postData = {
      language_id,
      cpu_time_limit: 5,
      wall_time_limit: 10,
    };

    if (base64Encoded) {
      postData.source_code = Buffer.from(source_code).toString('base64');
      postData.stdin = Buffer.from(stdin).toString('base64');
    } else {
      postData.source_code = source_code;
      postData.stdin = stdin;
    }





    // Submit code for compilation
    const { data: { token } } = await axios.post(
      `${BASE}/submissions?${queryParams}`,
      postData,
      { headers }
    );

    // Poll for result
    for (let i = 0; i < 40; i++) {
      const { data } = await axios.get(
        `${BASE}/submissions/${token}?base64_encoded=${base64Encoded}`,
        { headers }
      );

      

      const statusDescription = data.status?.description;
      if (statusDescription && !['In Queue', 'Processing'].includes(statusDescription)) {
        // Decode base64 output if needed
        const decodeIfNeeded = (str) =>
          base64Encoded && str ? Buffer.from(str, 'base64').toString('utf8') : (str || '');

        return {
          status: statusDescription,
          stdout: decodeIfNeeded(data.stdout),
          stderr: decodeIfNeeded(data.stderr) || decodeIfNeeded(data.compile_output),
          time: data.time,
          memory: data.memory,
        };
      }

      await new Promise((resolve) => setTimeout(resolve, 350));
    }

    return { status: 'Timeout', stderr: 'Timeout waiting for result' };
  } catch (error) {
    console.error('compileCode error:', error.message || error);
    return { status: 'Error', stderr: 'Failed to compile code' };
  }
}
