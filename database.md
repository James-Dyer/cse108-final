# Database
SQLite through SQLAlchemy ORM.

## Tables
- users
- assignments (many assignments to users)
- steps (the ordered plan)

### users
What: Stores user accounts for Code Lab.
Created when: A person signs up for an account.
Owned by: Each row is one student.

Columns (MVP):
id – UUID / integer PK
email – string, unique, not null
password_hash – string, not null
created_at – datetime, default now
updated_at – datetime, default now

### assignments
What: A coding assignment added by the user (text + metadata + analysis results).
Created when: User adds a new assignment via paste/upload.
Owned by: A single user (the creator).

Columns (MVP):
id – UUID / integer PK
user_id – FK → users.id, not null
title – string, not null (AI-suggested)
raw_instructions – text, not null
language – string, not null default for MVP is "python"
created_at – datetime
updated_at – datetime

### steps
What: Stores the ordered list of instructional steps generated for an assignment. 
Created when: Generated after the assignment is created and analyzed (summary + learning objective extraction). The system produces a list of steps, which are then persisted.
Owned by: Each step belongs to exactly one assignment.

Columns (MVP):
id – UUID / integer PK
assignment_id – FK → assignments.id, not null
title – string, short label for the step AI generated (e.g. “Design the data structures”)
description – text, detailed instructions for the step
order_index – integer, defines ordering within the assignment (0, 1, 2, …)
created_at – datetime
updated_at – datetime
