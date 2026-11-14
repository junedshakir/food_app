# Food Delivery App — Initial Requirements

## 1. Overview

I want to build a food delivery app inspired by [Zomato](https://www.zomato.com). The first release should include only the bare-minimum (MVP) features.

- **Platform:** Browser-based web app only.
- **Out of scope:** Mobile app. It will be developed after the web app launches successfully.

## 2. Technology Preferences

### 2.1 Authentication

- Suggest an easy-to-set-up, free authentication service (e.g., Supabase or Firebase).
- Provide a document with exact, step-by-step instructions for me to:
  1. Create an account with the chosen service.
  2. Set up the project and generate the API key(s).

### 2.2 Database

- Use **MongoDB**.
- I will create a new account on **MongoDB Atlas** and share the database credentials.

### Tech Stack

- I want this application to be fully built in typescript with nextjs, tailwind css, shadcn components.
- All services must be in services layer
- All UI logic must be in UI components
- All APIs must be in /api following the standards of nextjs APIs
- All in all make sure that MVC pattern is used and the code is well structured and adheres to the design principles and patterns.

### 2.3 Architecture Review

- Point out any other architectural components or mechanisms this application needs that I may have missed.

## 3. Deliverables

All deliverables must be created in the order below. Each step starts only after the previous one is approved.

### Step 1 — Product Requirements Document (PRD)

- **File:** `project-docs/prd.md`
- Follow a standard PRD format.
- Include all functional and non-functional requirements a typical food delivery app would have, limited to **MVP scope**.
- Include project scaffolding. I am starting from a clean slate and want guidance from seeding the project through building the final product.

### Step 2 — User Stories

- Create only after I approve the PRD.
- Derive the stories from the PRD so I can implement them one after another.
- Group the stories into **epics**.
- Define the order of execution, with **project scaffolding as the first story**.

### Step 3 — Architecture Document

- Create a detailed architecture document for the application.

## 4. Documentation Conventions

- Store all project-specific documents in `/Users/shakir/trainings/food-delivery-app/project-docs`.
- Record these conventions and document locations in `CLAUDE.md` so they stay with the project.
