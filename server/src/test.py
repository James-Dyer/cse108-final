from openai import OpenAI
from dotenv import load_dotenv
import os

load_dotenv()
client = OpenAI()
OPENAI_MODEL = os.getenv("OPENAI_MODEL")

prompt = f"""
    Generate a student-facing assignment overview.
    Do not include any introductory or meta sentences (e.g., “This assignment requires…”, “In this assignment…”, or explanations of what the assignment is).
    Do not include any headers.
    Begin the output starting with the summary.

    If applicable, include:
    - A brief summary (1–2 sentences)
    - A requirements list
    - An example
    - Any necessary notes

    Assignment instructions:
    Write an adding program that does the following (10 points):
Ask the user to enter two or more numbers separated by spaces
Print the sum of all the numbers to the console
Throw an error if they do not enter at least two numbers or contain a string
Note: the numbers can be integers or decimals
Example: 
The user enters: 1 2 3 4 
The program prints: 10

    Rules:
    - Maximum 200 words
    - No title or headers
    - Output only the assignment content
"""
response = client.responses.create(
    model=OPENAI_MODEL,
    input=prompt,
    max_output_tokens=320,
)
text = (response.output_text or "").strip()

print(text)
