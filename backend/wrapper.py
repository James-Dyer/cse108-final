from openai import OpenAI
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize client - will fail if OPENAI_API_KEY is not set
api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    raise RuntimeError("OPENAI_API_KEY environment variable not set. Please configure it in .env file.")

client = OpenAI(api_key=api_key)

SYSTEM_PROMPT = """
You are an AI programming tutor helping students learn Python.

Rules:
- DO NOT give full solutions.
- DO NOT write complete functions or programs.
- DO NOT fix the entire code.
- You MAY explain concepts.
- You MAY point out where the bug is.
- You MAY show at most 1–2 lines of example code.
- Prefer asking guiding questions.
- If asked for the answer, refuse and give a hint instead.
"""

def get_tutor_hint(assignment, student_code, question):
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": f"""
Assignment:
{assignment}

Student Code:
{student_code}

Student Question:
{question}
"""
            }
        ],
        temperature=0.4
    )

    return response.choices[0].message.content
