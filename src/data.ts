export const profile = {
  name: 'Jayasankar R',
  handle: 'jaya',
  host: 'dev',
  domain: 'jayasankar.dev',
  role: 'Full Stack Engineer',
  location: 'Bengaluru, India',
  bio: 'Full Stack Engineer with 3+ years shipping production features end to end: React interfaces, TypeScript/Node.js APIs, PostgreSQL/Redis data layers and Docker/AWS deployment. I build real-time, event-driven workflows and AI-powered pipelines, and I care about reliability: idempotency, retries, caching and observability.',
};

export const links = [
  { label: 'github', url: 'https://github.com/Jayasankar-R' },
  { label: 'linkedin', url: 'https://www.linkedin.com/in/jayasankar-r/' },
  { label: 'email', url: 'mailto:jayasankarr.mec@gmail.com' },
];

export type YM = { y: number; m: number };
export type Job = {
  company: string;
  branch: string;
  title: string;
  start: YM;
  end: YM | null; // null = present
  commits: { tag: string; msg: string }[];
  tech: string[];
};

// newest first
export const jobs: Job[] = [
  {
    company: 'Carelatitude',
    branch: 'carelatitude',
    title: 'Full Stack Developer (Freelance)',
    start: { y: 2026, m: 10 },
    end: null,
    commits: [
      { tag: 'own', msg: 'End-to-end delivery of a healthcare platform linking hospitals in Kerala with patients in New Zealand.' },
      { tag: 'product', msg: 'Turned business requirements into features and workflows for hospital listings and service discovery.' },
      { tag: 'ui', msg: 'Responsive React interfaces built from reusable components.' },
      { tag: 'api', msg: 'Designed the Java/Spring Boot backend architecture and REST API contracts.' },
      { tag: 'ai', msg: 'AI-assisted development and UI/UX tooling to speed up design and delivery.' },
    ],
    tech: ['React', 'Java', 'Spring Boot', 'REST APIs', 'Git'],
  },
  {
    company: 'Cheero',
    branch: 'cheero',
    title: 'Full Stack Engineer (Freelance)',
    start: { y: 2026, m: 4 },
    end: { y: 2026, m: 9 },
    commits: [
      { tag: 'arch', msg: 'Node.js/Express services for quick commerce: orders, inventory, rider assignment, payments, payouts, notifications.' },
      { tag: 'ai', msg: 'AI WhatsApp order pipeline (WhatsApp Business API, OpenAI, n8n) parsing free text into structured JSON.' },
      { tag: 'auto', msg: 'Automated validation, inventory checks, pricing and confirmations, with handling for ambiguous messages.' },
      { tag: 'realtime', msg: 'Socket.IO dispatch and rider state machine with GPS sync, geofencing and auto re-queueing.' },
      { tag: 'data', msg: 'PostgreSQL models and Redis caching for high-frequency order, inventory and rider-state ops.' },
      { tag: 'auth', msg: 'JWT, OTP and role checks; integrated Cashfree payments, Firebase and AWS IVS with payout tracking.' },
    ],
    tech: ['Node.js', 'Express', 'PostgreSQL', 'Redis', 'Socket.IO', 'OpenAI API', 'n8n', 'React Native'],
  },
  {
    company: 'Onfuturesites',
    branch: 'onfuturesites',
    title: 'Full-Stack Engineer',
    start: { y: 2025, m: 11 },
    end: { y: 2026, m: 4 },
    commits: [
      { tag: 'own', msg: 'Owned backend features from design to Docker deployment, with unit and integration tests.' },
      { tag: 'api', msg: 'TypeScript/Node.js (Fastify) REST APIs for service-to-service communication.' },
      { tag: 'data', msg: 'PostgreSQL schemas and Prisma data-access patterns tuned for performance.' },
      { tag: 'debug', msg: 'Tracked down production issues across service layers, cutting error rates.' },
    ],
    tech: ['TypeScript', 'Node.js', 'Fastify', 'PostgreSQL', 'Prisma', 'Docker'],
  },
  {
    company: 'Self-Employed',
    branch: 'devops',
    title: 'DevOps Engineer (Freelance)',
    start: { y: 2025, m: 6 },
    end: { y: 2025, m: 10 },
    commits: [
      { tag: 'k8s', msg: 'Shipped containerized services to AWS EKS with Docker and Helm.' },
      { tag: 'ci', msg: 'Zero-downtime CI/CD with GitHub Actions and ArgoCD; release images in AWS ECR.' },
      { tag: 'obs', msg: 'Prometheus, Grafana, Loki and Fluent Bit, plus Slack/WhatsApp alerting.' },
      { tag: 'sre', msg: 'Kept 24/7 workloads highly available while raising release frequency.' },
    ],
    tech: ['AWS EKS', 'Kubernetes', 'Helm', 'ArgoCD', 'Prometheus', 'Grafana'],
  },
  {
    company: 'Captain Fresh',
    branch: 'captain-fresh',
    title: 'Software Engineer',
    start: { y: 2023, m: 8 },
    end: { y: 2025, m: 4 },
    commits: [
      { tag: 'erp', msg: 'REST APIs and microservices for a production ERP (TypeScript, Go, Spring Boot on PostgreSQL) with RBAC and approval flows.' },
      { tag: 'cache', msg: 'Server-side caching: −14% API response time and lower DB load.' },
      { tag: 'reliab', msg: 'Idempotent, fault-tolerant workflows with graceful recovery under peak load.' },
      { tag: 'integr', msg: 'Third-party integrations with webhooks, request signing, rate limits and retries.' },
      { tag: 'ship', msg: 'Deployed on AWS with Docker; shipped iteratively with PMs and QA in Agile teams.' },
    ],
    tech: ['TypeScript', 'Node.js', 'Java', 'Spring Boot', 'Go', 'PostgreSQL', 'AWS'],
  },
];

export const projects = [
  {
    name: 'gofarm',
    title: 'GoFarm',
    kind: 'AI agri backend',
    desc: 'Backend for an AI agriculture assistant: Dockerized Node.js/MongoDB APIs with RBAC and caching, plus HuggingFace Transformers and RAG for context-aware recommendations, with guardrails and retries.',
    stack: ['Node.js', 'Python', 'MongoDB', 'Redis', 'Docker', 'RAG'],
  },
  {
    name: 'springsentinel',
    title: 'SpringSentinel',
    kind: 'web app',
    desc: 'Secure REST API with JWT auth and role-based authorization via Spring Security; layered CRUD on JPA + MySQL.',
    stack: ['Spring Boot', 'JWT', 'JPA', 'MySQL', 'Spring Security'],
  },
  {
    name: 'que-gen',
    title: 'Que-Gen',
    kind: 'web app',
    desc: 'Automated question-paper generation. Led the backend; faculty pick criteria and get a custom paper.',
    stack: ['ReactJS', 'NodeJS', 'MongoDB', 'Express'],
  },
  {
    name: 'plastico',
    title: 'Plastico',
    kind: 'mobile web app',
    desc: 'Plastic and bio-waste procurement with logistics, grading and tracking built in.',
    stack: ['ReactJS', 'NodeJS', 'Firebase', 'Material-UI'],
  },
];

export const stack: Record<string, string[]> = {
  languages: ['TypeScript', 'JavaScript', 'Java', 'Go', 'Python'],
  frontend: ['React', 'React Native', 'HTML', 'CSS', 'GraphQL clients'],
  backend: ['Node.js', 'Express', 'Fastify', 'Spring Boot', 'GraphQL', 'Socket.IO', 'Webhooks'],
  data: ['PostgreSQL', 'Redis', 'MongoDB', 'Prisma', 'Sequelize'],
  'ai/llm': ['OpenAI API', 'RAG', 'HuggingFace', 'n8n', 'Guardrails'],
  security: ['JWT', 'OTP auth', 'RBAC', 'Request signing'],
  cloud: ['AWS EKS/EC2/ECR/IVS', 'Docker', 'Kubernetes', 'Helm', 'GitHub Actions', 'ArgoCD'],
  reliability: ['Idempotency', 'Retries', 'Prometheus', 'Grafana', 'Loki', 'Fluent Bit'],
};

export const education = [
  {
    institution: 'Indian Institute of Technology, Kharagpur',
    degree: 'Executive PG Program – AI-Native Software Engineering',
    duration: 'Jun 2026 – Present',
  },
  {
    institution: 'Govt. Model Engineering College, Kerala',
    degree: 'B.Tech – Electrical and Electronics Engineering',
    duration: 'Aug 2019 – Jun 2023',
  },
];
