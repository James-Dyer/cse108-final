# Code Lab
A web app where CS students can paste or upload a coding assignment, and the system automatically:
- Understands the assignment,
- Pulls out the key learning objectives,
- Builds a step-by-step plan,
- Gives them a guided coding workspace with hints and tests,
- Tracks what they learned over time.

A smart, structured “lab partner” UI wrapped around the LLM.

## Student flow (end-to-end)
### Step 1: Log in
- User sign up and login with hashed/salted passwords
- Land on a Dashboard: list of assignments, progress, and skill summary.

### Step 2: Add an assignment
upload PDF/copy-paste text instructions

bonus: 
- GitHub starter code link
- Canvas download (not sure what this means yet)
- Code snippet
- Rubric
- Example I/O

Backend:
Identifies the instruction context.

### Step 3: Assignment understanding
The app shows a clean summary of the assignment in plain, consise language with this reccomended format:

Short summary - 1-2 sentences.

Key requirements (consise bullets): functions, inputs/outputs, constraints, grading criteria.

Additional info:
Important edge cases or tricky parts, as well as any important information that werent covered in the first two parts.

UI: a “Assignment Summary” page with clear instructions, not chat bubbles.

### Step 4: Learning objectives
the student clicks the "Let's get started!" button or something similar, a fun animation plays, and...

The system identifies relevant CS topics and frames them as learning objectives.
For each objective, it generates a mini-lesson card with:
- Short explanation
- Simple example
- Common mistakes (optional)

UI: a Learning Objectives page with cards you can open to read (modal style)

### Step 5: Guided coding workspace

The system breaks the assignment into an ordered list of steps, such as:

Read and understand the input/output format
Design the data structures
Sketch the algorithm in pseudocode
Write function signatures
Implement core logic
Clean up

UI: a “Plan” view with checkable steps.

Features:
- Basic embedded code editor (Monaco). (MVP supported language: python)
- “Run” button that sends the editor contents to a runner function. (python)
In-browser runtime 
Use Pyodide (CPython compiled to WebAssembly, runs entirely in the browser).
Load it via html script or as a module. (not sure which)
Call pyodide.runPython(code) and capture output, show in the ui console 

- Instructions panel for the current step.

Buttons like:
- “Show hint”
- “Analyze my code”
- "Reset Runtime"

Student writes code → clicks “Check step”:

The system can:

Give natural-language feedback about the implementation, and state of the students code in relation to the instructions.

UI: split view:
Left: instructions panel
Right: code editor with integrated terminal/console below

Header: Navigation Buttons as well as coding workspace buttons (run, hint, logout, next back, etc)

Important: You design prompts so the AI critiques and nudges, but doesn’t just spit the full solution.

## MVP boundaries
- generic for any CS class with labs/assignments in python.

- users can start multiple assignments, manage (delete) their assignments from the dashboard page. 
- Individual use only for now, students sign up and log in, no cross-collaboration
- Primary goal: “Get assignments done as efficiently as possible while still learning objectives instead of just having answers fed to the student"
- Assignments will be small lab-style exercises.
- for mvp we will be dealing with only single-file Python scripts, similar to the format of leetcode problems or simpler lab assignments. 

## LLM Behavior & Prompting Questions
- We will use the LLM for:
    Step 3: Summarizing the assignment.
    Step 4: Identifying learning objectives and generating mini-lessons.
    Step 5: Generating:
        the ordered list of steps
        the hints
        the code analysis feedback

LLM Determinism: 
step plan needs to be in a deterministic format so we can parse and display to the user in a polished format

**Assignment summary**
Input: Raw instructions text
Output: A summary of the assignment, bullet points, and additional contextual information 
Triggered: When an assignment is first created

**Learning Objectives**
Input: The instructions text
Output: A set of 3–6 learning objectives, each with a title, a short explanation, an example, and optional pitfalls.
Triggered: After the assignment summary has been generated

Schema:
```{
  "learning_objectives": [
    {
      "id": "string",
      "title": "string",
      "summary": "string",
      "why_it_matters": "string",
      "used_in_this_assignment": "string"
    }
  ]
}
```

**Step plan**
Input: The instructions combined with the extracted learning objectives
Output: An ordered list of steps. Needs a deterministic "Title:" and a generated short label for the step: (e.x. “Design the data structures”)
Triggered: After learning objective extraction

**Hint generation**
Input: The current step, the learner’s current code, and their history
Output: A single hint
Triggered: When the learner selects “Show hint”

**Code analysis**
Input: The current step, the full code submission, and the original instructions
Output: Feedback on code correctness and design quality
Triggered: When the learner selects “Analyze my code” or “Check”

## Database
schema should include 
