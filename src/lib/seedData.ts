import { collection, addDoc, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

export const seedSampleData = async (currentUserId: string) => {
  const sampleCandidates = [
    {
      fullName: "Alex Rivers",
      profession: "Senior Product Designer",
      city: "San Francisco",
      birthDate: "1992-05-15",
      gender: "male",
      role: "candidate",
      email: "alex@example.com",
      strengths: "User empathy, rapid prototyping, design systems.",
      weaknesses: "Public speaking, complex motion graphics.",
      createdAt: serverTimestamp()
    },
    {
      fullName: "Elena Volkov",
      profession: "Frontend Engineer (React)",
      city: "Berlin",
      birthDate: "1995-11-22",
      gender: "female",
      role: "candidate",
      email: "elena@example.com",
      strengths: "Performance optimization, accessibility, clean code.",
      weaknesses: "Backend architecture, assembly language.",
      createdAt: serverTimestamp()
    },
    {
      fullName: "Marcus Chen",
      profession: "AI Research Scientist",
      city: "Toronto",
      birthDate: "1988-03-10",
      gender: "male",
      role: "candidate",
      email: "marcus@example.com",
      strengths: "Machine learning, NLP, mathematical modeling.",
      weaknesses: "Sales, marketing copy.",
      createdAt: serverTimestamp()
    }
  ];

  const sampleJobs = [
    {
      profession: "Lead AI Designer",
      city: "Remote",
      description: "Looking for someone to lead our AI interaction design paradigms. Experience with LLMs and prompt engineering is a plus.",
      employerName: "NeuroLabs AI",
      employerId: "system_generated_1",
      createdAt: serverTimestamp()
    },
    {
      profession: "Staff Frontend Developer",
      city: "London",
      salary: "£90k - £120k",
      description: "Join our core team building the next generation of financial dashboards. Deep expertise in React and TypeScript required.",
      employerName: "FinFlow Tech",
      employerId: "system_generated_2",
      createdAt: serverTimestamp()
    }
  ];

  // Seed candidates (Note: we use addDoc to give them unique IDs since we can't spoof actual Auth UIDs easily)
  for (const cand of sampleCandidates) {
    await addDoc(collection(db, 'profiles'), cand);
  }

  // Seed jobs
  for (const job of sampleJobs) {
    await addDoc(collection(db, 'jobs'), job);
  }
};
