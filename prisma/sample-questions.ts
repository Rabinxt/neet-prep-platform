type SampleOption = {
  label: "A" | "B" | "C" | "D";
  text: string;
  isCorrect: boolean;
};

export type DevelopmentQuestion = {
  id: string;
  questionText: string;
  explanation: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  order: number;
  useTopic: boolean;
  options: [SampleOption, SampleOption, SampleOption, SampleOption];
};

export type DevelopmentSubjectContent = {
  subjectSlug: "physics" | "chemistry" | "biology";
  chapter: { name: string; slug: string; description: string; order: number };
  topic: { name: string; slug: string; description: string; order: number };
  questions: DevelopmentQuestion[];
};

export const developmentQuestionBank: DevelopmentSubjectContent[] = [
  {
    subjectSlug: "physics",
    chapter: {
      name: "Development Sample: Mechanics",
      slug: "dev-sample-mechanics",
      description: "Development-only chapter used to verify the question-bank interface.",
      order: 1,
    },
    topic: {
      name: "Development Sample: Motion and Forces",
      slug: "dev-sample-motion-and-forces",
      description: "Development-only topic for sample Physics questions.",
      order: 1,
    },
    questions: [
      {
        id: "dev-question-physics-01",
        questionText: "A passenger moves forward when a moving bus stops suddenly. Which property best explains this observation?",
        explanation: "The passenger's body tends to remain in motion when the bus stops, demonstrating inertia of motion.",
        difficulty: "EASY",
        order: 1,
        useTopic: true,
        options: [
          { label: "A", text: "Inertia of rest", isCorrect: false },
          { label: "B", text: "Inertia of motion", isCorrect: true },
          { label: "C", text: "Conservation of charge", isCorrect: false },
          { label: "D", text: "Gravitational attraction", isCorrect: false },
        ],
      },
      {
        id: "dev-question-physics-02",
        questionText: "A net force of 10 N acts on a 2 kg object. What is its acceleration?",
        explanation: "Newton's second law gives a = F/m = 10/2 = 5 m/s².",
        difficulty: "EASY",
        order: 2,
        useTopic: true,
        options: [
          { label: "A", text: "2 m/s²", isCorrect: false },
          { label: "B", text: "4 m/s²", isCorrect: false },
          { label: "C", text: "5 m/s²", isCorrect: true },
          { label: "D", text: "20 m/s²", isCorrect: false },
        ],
      },
      {
        id: "dev-question-physics-03",
        questionText: "If the speed of an object is doubled while its mass remains constant, its kinetic energy becomes:",
        explanation: "Kinetic energy is proportional to the square of speed, so doubling speed makes it four times as large.",
        difficulty: "MEDIUM",
        order: 3,
        useTopic: false,
        options: [
          { label: "A", text: "Two times", isCorrect: false },
          { label: "B", text: "Four times", isCorrect: true },
          { label: "C", text: "Eight times", isCorrect: false },
          { label: "D", text: "Unchanged", isCorrect: false },
        ],
      },
    ],
  },
  {
    subjectSlug: "chemistry",
    chapter: {
      name: "Development Sample: Chemistry Foundations",
      slug: "dev-sample-chemistry-foundations",
      description: "Development-only chapter used to verify the question-bank interface.",
      order: 1,
    },
    topic: {
      name: "Development Sample: Atomic and Chemical Basics",
      slug: "dev-sample-atomic-and-chemical-basics",
      description: "Development-only topic for sample Chemistry questions.",
      order: 1,
    },
    questions: [
      {
        id: "dev-question-chemistry-01",
        questionText: "The atomic number of an element is equal to the number of which particles in its nucleus?",
        explanation: "Atomic number is defined by the number of protons in the nucleus.",
        difficulty: "EASY",
        order: 1,
        useTopic: true,
        options: [
          { label: "A", text: "Neutrons", isCorrect: false },
          { label: "B", text: "Electrons and neutrons", isCorrect: false },
          { label: "C", text: "Protons", isCorrect: true },
          { label: "D", text: "Nucleons", isCorrect: false },
        ],
      },
      {
        id: "dev-question-chemistry-02",
        questionText: "At 25 °C, the pH of a neutral aqueous solution is:",
        explanation: "At 25 °C, neutral water has equal hydrogen and hydroxide ion concentrations and a pH of 7.",
        difficulty: "EASY",
        order: 2,
        useTopic: true,
        options: [
          { label: "A", text: "0", isCorrect: false },
          { label: "B", text: "7", isCorrect: true },
          { label: "C", text: "10", isCorrect: false },
          { label: "D", text: "14", isCorrect: false },
        ],
      },
      {
        id: "dev-question-chemistry-03",
        questionText: "A covalent bond is formed primarily by:",
        explanation: "A covalent bond forms when atoms share one or more pairs of electrons.",
        difficulty: "MEDIUM",
        order: 3,
        useTopic: false,
        options: [
          { label: "A", text: "Transfer of neutrons", isCorrect: false },
          { label: "B", text: "Sharing of electrons", isCorrect: true },
          { label: "C", text: "Transfer of protons", isCorrect: false },
          { label: "D", text: "Sharing of nuclei", isCorrect: false },
        ],
      },
    ],
  },
  {
    subjectSlug: "biology",
    chapter: {
      name: "Development Sample: Cell Biology",
      slug: "dev-sample-cell-biology",
      description: "Development-only chapter used to verify the question-bank interface.",
      order: 1,
    },
    topic: {
      name: "Development Sample: Cell Structure",
      slug: "dev-sample-cell-structure",
      description: "Development-only topic for sample Biology questions.",
      order: 1,
    },
    questions: [
      {
        id: "dev-question-biology-01",
        questionText: "Which cell organelle is commonly called the powerhouse of the cell?",
        explanation: "Mitochondria generate most of the cell's ATP through aerobic respiration.",
        difficulty: "EASY",
        order: 1,
        useTopic: true,
        options: [
          { label: "A", text: "Golgi apparatus", isCorrect: false },
          { label: "B", text: "Lysosome", isCorrect: false },
          { label: "C", text: "Mitochondrion", isCorrect: true },
          { label: "D", text: "Ribosome", isCorrect: false },
        ],
      },
      {
        id: "dev-question-biology-02",
        questionText: "Which nitrogenous base is normally absent from DNA?",
        explanation: "DNA contains adenine, thymine, guanine, and cytosine. Uracil normally occurs in RNA instead of thymine.",
        difficulty: "EASY",
        order: 2,
        useTopic: true,
        options: [
          { label: "A", text: "Adenine", isCorrect: false },
          { label: "B", text: "Guanine", isCorrect: false },
          { label: "C", text: "Cytosine", isCorrect: false },
          { label: "D", text: "Uracil", isCorrect: true },
        ],
      },
      {
        id: "dev-question-biology-03",
        questionText: "In plant cells, photosynthesis takes place mainly in the:",
        explanation: "Chloroplasts contain chlorophyll and the internal membrane systems required for photosynthesis.",
        difficulty: "MEDIUM",
        order: 3,
        useTopic: false,
        options: [
          { label: "A", text: "Nucleus", isCorrect: false },
          { label: "B", text: "Chloroplast", isCorrect: true },
          { label: "C", text: "Vacuole", isCorrect: false },
          { label: "D", text: "Cell wall", isCorrect: false },
        ],
      },
    ],
  },
];
