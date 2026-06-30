import {
  Brain,
  Code,
  ChartLineUp,
  MagnifyingGlass,
  type Icon,
} from "@phosphor-icons/react";

export interface TaskTemplate {
  id: string;
  label: string;
  icon: Icon;
  description: string;
  /** Structured prompt template — `{{input}}` is replaced with user text */
  promptTemplate: string;
  placeholder: string;
  defaultMinAgents: number;
  defaultMaxAgents: number;
  defaultHours: number;
}

export const TASK_TEMPLATES: TaskTemplate[] = [
  {
    id: "research",
    label: "Research",
    icon: MagnifyingGlass,
    description: "Deep-dive research with cited sources. Swarm agents fetch data via HTTP precompile and synthesize findings.",
    promptTemplate: `You are a research swarm. COMPREHENSIVELY investigate the following topic.

RESEARCH TOPIC:
{{input}}

Each agent should:
1. Gather data from the Ritual HTTP precompile (0x0801) where relevant
2. Provide factual, sourced analysis
3. Surface conflicting viewpoints if they exist
4. End with a confidence score (1-10)

Synthesize a consensus report with clear sections: Summary, Key Findings, Evidence, Conflicting Views, Confidence Assessment.`,
    placeholder: "e.g. Compare all L2 scaling solutions across security, cost, and decentralization",
    defaultMinAgents: 3,
    defaultMaxAgents: 7,
    defaultHours: 24,
  },
  {
    id: "code-review",
    label: "Code Review",
    icon: Code,
    description: "Multi-agent security audit of smart contracts or code. Each agent finds different vulnerability classes.",
    promptTemplate: `You are a code-review swarm. AUDIT the following code for security vulnerabilities and bugs.

CODE TO REVIEW:
\`\`\`
{{input}}
\`\`\`

Review criteria:
1. Re-entrancy & access control
2. Integer overflow / underflow
3. Logic errors & edge cases
4. Gas optimization
5. Upgradeability & proxy risks

Each agent specializes in 1-2 classes above. Flag HIGH/MEDIUM/LOW severity.
Synthesize into a unified audit report with an overall risk score.`,
    placeholder: "e.g. Paste a Solidity contract for multi-agent security audit",
    defaultMinAgents: 3,
    defaultMaxAgents: 5,
    defaultHours: 12,
  },
  {
    id: "market-analysis",
    label: "Market Analysis",
    icon: ChartLineUp,
    description: "On-chain and off-chain analysis of tokens, protocols, or market trends by AI agents.",
    promptTemplate: `You are a market-analysis swarm. ANALYZE the following asset or protocol.

ANALYSIS TARGET:
{{input}}

Each agent analyzes a different dimension:
1. On-chain metrics (TVL, volume, active users, whale concentration)
2. Technical analysis (price action, key levels, momentum)
3. Fundamental analysis (team, roadmap, tokenomics, competitors)
4. Sentiment analysis (social media, developer activity)

Merge into a consensus report: Bull/Bear verdict, confidence level, key risks, and a 7-day outlook.`,
    placeholder: "e.g. Due diligence on Arbitrum: strengths, risks, competitive positioning",
    defaultMinAgents: 4,
    defaultMaxAgents: 8,
    defaultHours: 24,
  },
  {
    id: "fact-check",
    label: "Fact Check",
    icon: Brain,
    description: "Verify claims using swarm consensus. Agents cross-reference sources and surface contradictions.",
    promptTemplate: `You are a fact-check swarm. VERIFY the following claim.

CLAIM TO VERIFY:
"{{input}}"

Instructions:
1. Each agent independently researches the claim
2. Cross-reference at least 2 distinct sources
3. Assign a truth rating: TRUE / MOSTLY TRUE / MIXED / MOSTLY FALSE / FALSE
4. Cite specific sources for every finding

Synthesize a verdict with: Final Rating, Supporting Evidence, Contradicting Evidence, Source Quality Assessment.`,
    placeholder: "e.g. 'Bitcoin mining uses more energy than Argentina' — fact-check this claim",
    defaultMinAgents: 2,
    defaultMaxAgents: 5,
    defaultHours: 6,
  },
];

export function getTemplateById(id: string): TaskTemplate | undefined {
  return TASK_TEMPLATES.find((t) => t.id === id);
}

export function fillPrompt(template: TaskTemplate, input: string): string {
  return template.promptTemplate.replace("{{input}}", input);
}
