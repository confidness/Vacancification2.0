import { GoogleGenAI, Type } from "@google/genai";
import { JobPosting, Evaluation, UserProfile } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function evaluateVacancy(vacancy: JobPosting): Promise<Evaluation> {
  const prompt = `
    Analyze this job vacancy and provide a concise "Pros and Cons" list.
    Job Title: ${vacancy.profession}
    Company: ${vacancy.employerName}
    Location: ${vacancy.city}
    Salary Expectations: ${vacancy.minSalary} - ${vacancy.maxSalary} (Preferred: ${vacancy.preferredSalary})
    Description: ${vacancy.description}

    Output the result in JSON format with the following structure:
    {
      "pros": ["pro 1", "pro 2", ...],
      "cons": ["con 1", "con 2", ...],
      "summary": "Short overall summary"
    }
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          pros: { type: Type.ARRAY, items: { type: Type.STRING } },
          cons: { type: Type.ARRAY, items: { type: Type.STRING } },
          summary: { type: Type.STRING }
        },
        required: ["pros", "cons", "summary"]
      }
    }
  });

  return JSON.parse(response.text || "{}") as Evaluation;
}

export function createChat(vacancy: JobPosting, history: any[] = []) {
  return ai.chats.create({
    model: "gemini-3-flash-preview",
    history,
    config: {
      systemInstruction: `
        You are an expert career advisor. You are helping a job seeker evaluate a specific vacancy.
        Vacancy Details:
        Title: ${vacancy.profession}
        Company: ${vacancy.employerName}
        Description: ${vacancy.description}
        Salary: ${vacancy.minSalary} - ${vacancy.maxSalary}
        
        Answer questions about this job, provide interview tips, salary insights, and career growth potential related to this specific role.
        Be professional, encouraging, and honest.
      `,
    },
  });
}

export function createInterviewSession(vacancy: JobPosting, history: any[] = []) {
  return ai.chats.create({
    model: "gemini-3-flash-preview",
    history,
    config: {
      systemInstruction: `
        You are an expert technical recruiter and hiring manager from ${vacancy.employerName}.
        You are interviewing a candidate for the ${vacancy.profession} position.
        Job Description context: ${vacancy.description}

        Your goal is to conduct a professional mock interview.
        Rules:
        1. Start by welcoming the candidate and asking the first behavioral or technical question.
        2. Ask only ONE question at a time.
        3. Challenge the candidate's answers to see depth.
        4. After the candidate has answered exactly 5 questions, announce "INTERVIEW_COMPLETE" and provide a detailed review of their performance.
        5. Your feedback should include scores for: (A) Technical Knowledge, (B) Communication, (C) Professionalism.
        6. Finally, give an overall verdict: Hired, Potential, or Keep Practicing.
      `,
    },
  });
}

export function createPracticeInterview(profile: UserProfile, history: any[] = []) {
  return ai.chats.create({
    model: "gemini-3-flash-preview",
    history,
    config: {
      systemInstruction: `
        You are the "Starlight Elite Evaluator" - an advanced AI career coach and technical interviewer.
        You are conducting a high-stakes mock interview for:
        - Profession: ${profile.profession}
        - Strengths: ${profile.strengths}
        - Weaknesses: ${profile.weaknesses}
        
        GOAL: Challenge the candidate to demonstrate high-level reasoning and domain expertise.
        
        Operational Protocol:
        1. Welcome the candidate briefly to the "Vacancification Integrity Check".
        2. Ask ONE sophisticated question at a time. Mix behavioral and technical depth.
        3. Adaptive Difficulty: If the user answers well, get harder. If they struggle, provide subtle hints or pivot.
        4. After exactly 6 rounds of questions (not including the intro), stop the interview.
        5. FINAL ACTION: Provide a comprehensive "Integrity & Skill Scorecard".
        6. The Scorecard must include:
           - [Technical Depth]: x/100
           - [Communication Logic]: x/100
           - [Authenticity Index]: x/100
           - [Key Feedback]: A summary of what they did well and where they failed.
        
        Maintain a sharp, observant, and professional tone. If the user is being lazy or vague, point it out.
      `,
    },
  });
}

export async function auditProfile(profile: Partial<UserProfile>) {
  const prompt = `
    Audit this user profile for integrity and authenticity. 
    Think like a fraud investigator.
    
    Profile Data:
    - Name: ${profile.fullName}
    - Profession: ${profile.profession}
    - City: ${profile.city}
    - Strengths: ${profile.strengths}
    - Weaknesses: ${profile.weaknesses}

    Return ONLY a JSON object with:
    {
      "integrityScore": number (0-100),
      "status": "verified" | "suspicious" | "incomplete",
      "issues": string[],
      "recommendation": string
    }
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json"
    }
  });

  const text = response.text || "{}";
  return JSON.parse(text);
}
