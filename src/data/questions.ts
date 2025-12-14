import type { Question } from '../types/game';
import { generateId } from '../types/game';

// Trivia questions for Got Ya!
export const QUESTIONS: Question[] = [
  // Science
  {
    id: generateId(),
    text: "What is the chemical symbol for gold?",
    correctAnswer: "Au",
    category: "Science"
  },
  {
    id: generateId(),
    text: "How many bones are in the adult human body?",
    correctAnswer: "206",
    category: "Science"
  },
  {
    id: generateId(),
    text: "What planet is known as the Red Planet?",
    correctAnswer: "Mars",
    category: "Science"
  },
  {
    id: generateId(),
    text: "What is the hardest natural substance on Earth?",
    correctAnswer: "Diamond",
    category: "Science"
  },
  {
    id: generateId(),
    text: "What gas do plants absorb from the atmosphere?",
    correctAnswer: "Carbon dioxide",
    category: "Science"
  },

  // Geography
  {
    id: generateId(),
    text: "What is the capital of Australia?",
    correctAnswer: "Canberra",
    category: "Geography"
  },
  {
    id: generateId(),
    text: "What is the longest river in the world?",
    correctAnswer: "The Nile",
    category: "Geography"
  },
  {
    id: generateId(),
    text: "Which country has the most time zones?",
    correctAnswer: "France",
    category: "Geography"
  },
  {
    id: generateId(),
    text: "What is the smallest country in the world?",
    correctAnswer: "Vatican City",
    category: "Geography"
  },
  {
    id: generateId(),
    text: "On which continent is the Sahara Desert located?",
    correctAnswer: "Africa",
    category: "Geography"
  },

  // Pop Culture
  {
    id: generateId(),
    text: "What year was the first iPhone released?",
    correctAnswer: "2007",
    category: "Pop Culture"
  },
  {
    id: generateId(),
    text: "What is the name of the fictional city where Batman lives?",
    correctAnswer: "Gotham City",
    category: "Pop Culture"
  },
  {
    id: generateId(),
    text: "Who painted the Mona Lisa?",
    correctAnswer: "Leonardo da Vinci",
    category: "Pop Culture"
  },
  {
    id: generateId(),
    text: "What is the best-selling video game of all time?",
    correctAnswer: "Minecraft",
    category: "Pop Culture"
  },
  {
    id: generateId(),
    text: "What band was Freddie Mercury the lead singer of?",
    correctAnswer: "Queen",
    category: "Pop Culture"
  },

  // History
  {
    id: generateId(),
    text: "In what year did World War II end?",
    correctAnswer: "1945",
    category: "History"
  },
  {
    id: generateId(),
    text: "Who was the first person to walk on the moon?",
    correctAnswer: "Neil Armstrong",
    category: "History"
  },
  {
    id: generateId(),
    text: "What ancient wonder was located in Alexandria, Egypt?",
    correctAnswer: "The Lighthouse (Pharos)",
    category: "History"
  },
  {
    id: generateId(),
    text: "What year did the Titanic sink?",
    correctAnswer: "1912",
    category: "History"
  },
  {
    id: generateId(),
    text: "Who invented the telephone?",
    correctAnswer: "Alexander Graham Bell",
    category: "History"
  },

  // Language
  {
    id: generateId(),
    text: "What is the most spoken language in the world?",
    correctAnswer: "English",
    category: "Language"
  },
  {
    id: generateId(),
    text: "What does 'carpe diem' mean in English?",
    correctAnswer: "Seize the day",
    category: "Language"
  },
  {
    id: generateId(),
    text: "How many letters are in the Greek alphabet?",
    correctAnswer: "24",
    category: "Language"
  },
  {
    id: generateId(),
    text: "What language has the most words?",
    correctAnswer: "English",
    category: "Language"
  },
  {
    id: generateId(),
    text: "What is the official language of Brazil?",
    correctAnswer: "Portuguese",
    category: "Language"
  },

  // General Knowledge
  {
    id: generateId(),
    text: "How many sides does a hexagon have?",
    correctAnswer: "Six",
    category: "General"
  },
  {
    id: generateId(),
    text: "What is the largest mammal in the world?",
    correctAnswer: "Blue whale",
    category: "General"
  },
  {
    id: generateId(),
    text: "What is the currency of Japan?",
    correctAnswer: "Yen",
    category: "General"
  },
  {
    id: generateId(),
    text: "How many minutes are in a day?",
    correctAnswer: "1440",
    category: "General"
  },
  {
    id: generateId(),
    text: "What color is a giraffe's tongue?",
    correctAnswer: "Purple/Blue",
    category: "General"
  },
];

export function getRandomQuestions(count: number): Question[] {
  const shuffled = [...QUESTIONS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
