/**
 * Problem Decomposer
 *
 * Decomposes complex problems into meaningful sub-problems with:
 * - Domain-specific component extraction
 * - Descriptive sub-problem names
 * - Relationship-based dependency descriptions
 *
 * Requirements: 2.1, 2.2, 2.3, 2.5
 */

export interface SubProblem {
  id: string;
  name: string;
  description: string;
  depth: number;
  parent?: string;
  domain?: string;
}

export interface Dependency {
  from: string;
  to: string;
  type: string;
  description: string;
}

export interface DecompositionResult {
  subProblems: SubProblem[];
  dependencies: Dependency[];
}

/**
 * Parameters for generating sub-problems
 */
interface GenerateSubProblemsParams {
  parentProblem: string;
  components: string[];
  parentId: string;
  currentDepth: number;
  maxDepth: number;
  actionIntent: string;
  domain: string;
}

/**
 * Domain patterns for extracting domain-specific components
 */
const DOMAIN_PATTERNS: Record<string, { keywords: string[]; components: string[] }> = {
  // Real-time and collaborative systems (HIGH PRIORITY - was missing)
  realtime: {
    keywords: [
      "real-time",
      "realtime",
      "collaborative",
      "collaboration",
      "live",
      "sync",
      "synchronization",
      "websocket",
      "socket",
      "streaming",
    ],
    components: [
      "Real-time Communication Protocol",
      "State Synchronization",
      "Conflict Resolution (CRDT/OT)",
      "Presence Detection",
      "Event Broadcasting",
      "Connection Management",
      "Offline Support & Reconciliation",
      "Latency Optimization",
    ],
  },
  // Document editing (specific to collaborative docs)
  document: {
    keywords: ["document", "editor", "editing", "text", "rich text", "markdown", "wysiwyg"],
    components: [
      "Document Model & Schema",
      "Operational Transform / CRDT",
      "Cursor & Selection Sync",
      "Version History",
      "Undo/Redo Stack",
      "Formatting Engine",
      "Export & Import",
    ],
  },
  ecommerce: {
    keywords: ["e-commerce", "ecommerce", "shop", "store", "cart", "checkout", "product", "order"],
    components: [
      "User Authentication",
      "Product Catalog",
      "Shopping Cart",
      "Checkout Process",
      "Order Management",
      "Payment Processing",
      "Inventory Management",
      "Customer Support",
    ],
  },
  webapp: {
    keywords: ["web", "application", "app", "platform", "system", "portal"],
    components: [
      "User Interface",
      "Backend Services",
      "Data Storage",
      "Authentication",
      "API Design",
      "Security",
      "Performance Optimization",
      "Deployment",
    ],
  },
  mobile: {
    keywords: ["mobile", "ios", "android", "app"],
    components: [
      "User Interface",
      "Navigation",
      "Data Persistence",
      "Network Layer",
      "Push Notifications",
      "Offline Support",
      "App Store Deployment",
    ],
  },
  data: {
    keywords: ["data", "analytics", "database", "pipeline", "etl", "warehouse"],
    components: [
      "Data Collection",
      "Data Processing",
      "Data Storage",
      "Data Analysis",
      "Visualization",
      "Reporting",
      "Data Quality",
    ],
  },
  ml: {
    keywords: ["machine learning", "ml", "ai", "model", "training", "prediction"],
    components: [
      "Data Preparation",
      "Feature Engineering",
      "Model Selection",
      "Training Pipeline",
      "Model Evaluation",
      "Deployment",
      "Monitoring",
    ],
  },
  api: {
    keywords: ["api", "rest", "graphql", "endpoint", "service"],
    components: [
      "API Design",
      "Authentication",
      "Rate Limiting",
      "Documentation",
      "Error Handling",
      "Versioning",
      "Testing",
    ],
  },
  security: {
    keywords: ["security", "auth", "encryption", "access", "permission"],
    components: [
      "Authentication",
      "Authorization",
      "Data Encryption",
      "Access Control",
      "Audit Logging",
      "Vulnerability Assessment",
    ],
  },
  performance: {
    keywords: ["performance", "optimization", "speed", "latency", "throughput", "scalable"],
    components: [
      "Performance Analysis",
      "Bottleneck Identification",
      "Caching Strategy",
      "Load Balancing",
      "Database Optimization",
      "Code Optimization",
    ],
  },
  testing: {
    keywords: ["test", "testing", "qa", "quality", "validation"],
    components: [
      "Test Strategy",
      "Unit Testing",
      "Integration Testing",
      "End-to-End Testing",
      "Performance Testing",
      "Test Automation",
    ],
  },
  devops: {
    keywords: ["devops", "ci", "cd", "deployment", "infrastructure", "docker", "kubernetes"],
    components: [
      "CI/CD Pipeline",
      "Infrastructure Setup",
      "Containerization",
      "Monitoring",
      "Logging",
      "Alerting",
      "Disaster Recovery",
    ],
  },
  // Microservices and distributed systems
  microservices: {
    keywords: ["microservice", "microservices", "distributed", "service mesh", "saga"],
    components: [
      "Service Decomposition",
      "Inter-service Communication",
      "Service Discovery",
      "API Gateway",
      "Data Consistency (Saga/Event Sourcing)",
      "Observability",
      "Fault Tolerance",
    ],
  },
  // Migration projects
  migration: {
    keywords: ["migrate", "migration", "legacy", "modernize", "modernization", "refactor"],
    components: [
      "Current State Assessment",
      "Target Architecture Design",
      "Data Migration Strategy",
      "Incremental Migration Plan",
      "Rollback Strategy",
      "Testing & Validation",
      "Cutover Planning",
    ],
  },
};

/**
 * Action verbs for generating descriptive names
 */
const ACTION_VERBS: Record<string, string[]> = {
  build: ["Design", "Implement", "Create", "Develop"],
  improve: ["Optimize", "Enhance", "Refactor", "Upgrade"],
  fix: ["Debug", "Resolve", "Repair", "Correct"],
  analyze: ["Investigate", "Evaluate", "Assess", "Review"],
  plan: ["Define", "Outline", "Strategize", "Architect"],
  integrate: ["Connect", "Combine", "Merge", "Unify"],
  migrate: ["Transfer", "Move", "Convert", "Transition"],
  scale: ["Expand", "Grow", "Distribute", "Parallelize"],
};

/**
 * Dependency relationship descriptions
 */
const DEPENDENCY_DESCRIPTIONS: Record<string, string> = {
  hierarchical: "is a component of",
  sequential: "must be completed before",
  parallel: "can be worked on alongside",
  data: "provides data for",
  interface: "defines the interface for",
  foundation: "provides the foundation for",
};

export class ProblemDecomposer {
  /**
   * Decompose a problem into meaningful sub-problems
   */
  decompose(problem: string, maxDepth: number): DecompositionResult {
    const subProblems: SubProblem[] = [];
    const dependencies: Dependency[] = [];

    // Detect domain from problem text
    const domain = this.detectDomain(problem);

    // Extract action intent from problem
    const actionIntent = this.extractActionIntent(problem);

    // Generate root problem
    const rootId = "root";
    const rootName = this.generateRootName(problem, actionIntent);
    subProblems.push({
      id: rootId,
      name: rootName,
      description: problem,
      depth: 1,
      domain,
    });

    // Generate sub-problems based on domain and problem analysis
    if (maxDepth > 1) {
      const components = this.extractComponents(problem, domain);
      const childProblems = this.generateSubProblems({
        parentProblem: problem,
        components,
        parentId: rootId,
        currentDepth: 2,
        maxDepth,
        actionIntent,
        domain,
      });

      subProblems.push(...childProblems.subProblems);
      dependencies.push(...childProblems.dependencies);
    }

    return { subProblems, dependencies };
  }

  /**
   * Detect the domain of the problem
   *
   * Prioritizes more specific domains over generic ones.
   * For example, "real-time collaborative document editing" should
   * match "realtime" or "document" before "webapp".
   */
  private detectDomain(problem: string): string {
    const lowerProblem = problem.toLowerCase();

    // Score each domain by keyword matches
    const domainScores: Array<{ domain: string; score: number; specificity: number }> = [];

    // Domains ordered by specificity (more specific first)
    // Business domains (ecommerce) are prioritized over technical aspects (performance)
    // because they define the problem space more specifically
    const specificityOrder: Record<string, number> = {
      realtime: 10,
      document: 10,
      microservices: 9,
      migration: 9,
      ml: 8,
      ecommerce: 8, // Business domain - higher priority than technical aspects
      security: 7,
      testing: 6,
      devops: 6,
      api: 5,
      data: 4,
      mobile: 3,
      performance: 2, // Technical aspect - lower priority, often co-occurs with other domains
      webapp: 1, // Most generic, lowest priority
    };

    for (const [domain, config] of Object.entries(DOMAIN_PATTERNS)) {
      const matchCount = config.keywords.filter((kw) => lowerProblem.includes(kw)).length;
      if (matchCount >= 1) {
        domainScores.push({
          domain,
          score: matchCount,
          specificity: specificityOrder[domain] ?? 0,
        });
      }
    }

    // Sort by specificity first, then by match count
    domainScores.sort((a, b) => {
      if (b.specificity !== a.specificity) {
        return b.specificity - a.specificity;
      }
      return b.score - a.score;
    });

    return domainScores.length > 0 ? domainScores[0].domain : "general";
  }

  /**
   * Extract action intent from problem text
   */
  private extractActionIntent(problem: string): string {
    const lowerProblem = problem.toLowerCase();

    for (const [intent, verbs] of Object.entries(ACTION_VERBS)) {
      if (verbs.some((v) => lowerProblem.includes(v.toLowerCase()))) {
        return intent;
      }
    }

    // Check for common problem patterns
    if (lowerProblem.includes("how to") || lowerProblem.includes("create")) {
      return "build";
    }
    if (lowerProblem.includes("why") || lowerProblem.includes("understand")) {
      return "analyze";
    }
    if (lowerProblem.includes("improve") || lowerProblem.includes("better")) {
      return "improve";
    }
    if (
      lowerProblem.includes("fix") ||
      lowerProblem.includes("bug") ||
      lowerProblem.includes("error")
    ) {
      return "fix";
    }

    return "build"; // Default intent
  }

  /**
   * Generate a meaningful root problem name
   */
  private generateRootName(problem: string, actionIntent: string): string {
    // Extract key nouns from problem
    const keyTerms = this.extractKeyTerms(problem);

    if (keyTerms.length > 0) {
      const verb = this.getActionVerb(actionIntent);
      return `${verb} ${keyTerms.slice(0, 3).join(" ")}`;
    }

    // Fallback: use first meaningful words
    const words = problem.split(/\s+/).filter((w) => w.length > 3);
    if (words.length >= 2) {
      return `${words[0]} ${words[1]}`.substring(0, 50);
    }

    return problem.substring(0, 50);
  }

  /**
   * Extract key terms from problem text
   */
  private extractKeyTerms(problem: string): string[] {
    const stopWords = new Set([
      "the",
      "a",
      "an",
      "and",
      "or",
      "but",
      "in",
      "on",
      "at",
      "to",
      "for",
      "of",
      "with",
      "by",
      "from",
      "as",
      "is",
      "was",
      "are",
      "were",
      "been",
      "be",
      "have",
      "has",
      "had",
      "do",
      "does",
      "did",
      "will",
      "would",
      "could",
      "should",
      "may",
      "might",
      "must",
      "shall",
      "can",
      "need",
      "that",
      "this",
      "these",
      "those",
      "it",
      "its",
      "how",
      "what",
      "when",
      "where",
      "why",
      "which",
      "who",
      "whom",
      "i",
      "we",
      "you",
      "they",
      "he",
      "she",
      "my",
      "our",
      "your",
      "their",
    ]);

    const words = problem
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !stopWords.has(w));

    // Return unique terms
    return [...new Set(words)];
  }

  /**
   * Get an action verb for the intent
   */
  private getActionVerb(intent: string): string {
    const verbs = ACTION_VERBS[intent] || ACTION_VERBS.build;
    return verbs[0];
  }

  /**
   * Extract components from problem text based on domain
   */
  private extractComponents(problem: string, domain: string): string[] {
    const domainConfig = DOMAIN_PATTERNS[domain];

    if (domainConfig) {
      // Filter components that are relevant to the problem
      const lowerProblem = problem.toLowerCase();
      const relevantComponents = domainConfig.components.filter((comp) => {
        const compWords = comp.toLowerCase().split(/\s+/);
        return compWords.some((word) => lowerProblem.includes(word));
      });

      if (relevantComponents.length >= 2) {
        return relevantComponents;
      }

      // Return default components for the domain
      return domainConfig.components.slice(0, 4);
    }

    // Extract components from problem text directly
    return this.extractComponentsFromText(problem);
  }

  /**
   * Extract components directly from problem text
   */
  private extractComponentsFromText(problem: string): string[] {
    const components: string[] = [];

    // Look for enumerated items
    const listPatterns = [
      /(?:including|such as|like|with)\s+([^.]+)/gi,
      /(?:need to|want to|should)\s+([^.]+)/gi,
      /(\w+(?:\s+\w+)?)\s+(?:and|,)\s+(\w+(?:\s+\w+)?)/gi,
    ];

    for (const pattern of listPatterns) {
      const matches = problem.matchAll(pattern);
      for (const match of matches) {
        const items = match[1]?.split(/,\s*|\s+and\s+/) || [];
        components.push(...items.map((item) => this.capitalizeWords(item.trim())));
      }
    }

    // If no components found, generate generic ones based on key terms
    if (components.length < 2) {
      const keyTerms = this.extractKeyTerms(problem);
      return keyTerms.slice(0, 4).map((term) => this.capitalizeWords(term));
    }

    return [...new Set(components)].slice(0, 6);
  }

  /**
   * Capitalize words in a string
   */
  private capitalizeWords(str: string): string {
    return str
      .split(/\s+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  }

  /**
   * Generate sub-problems recursively
   */
  private generateSubProblems(params: GenerateSubProblemsParams): DecompositionResult {
    const { parentProblem, components, parentId, currentDepth, maxDepth, actionIntent, domain } =
      params;
    const subProblems: SubProblem[] = [];
    const dependencies: Dependency[] = [];

    const verb = this.getActionVerb(actionIntent);

    for (let i = 0; i < components.length; i++) {
      const component = components[i];
      const subProblemId = `${parentId}-${i}`;

      // Generate meaningful name
      const name = `${verb} ${component}`;

      // Generate description that explains what needs to be solved
      const description = this.generateDescription(component, parentProblem, actionIntent);

      subProblems.push({
        id: subProblemId,
        name,
        description,
        depth: currentDepth,
        parent: parentId,
        domain,
      });

      // Add dependency with meaningful description
      const depType = this.determineDependencyType(i, components.length);
      dependencies.push({
        from: parentId,
        to: subProblemId,
        type: depType,
        description: `"${component}" ${DEPENDENCY_DESCRIPTIONS[depType]} "${parentId === "root" ? "the main problem" : "its parent"}"`,
      });

      // Recurse if not at max depth
      if (currentDepth < maxDepth) {
        const subComponents = this.generateSubComponents(component, domain);
        if (subComponents.length > 0) {
          const childResult = this.generateSubProblems({
            parentProblem: `${verb} ${component}`,
            components: subComponents,
            parentId: subProblemId,
            currentDepth: currentDepth + 1,
            maxDepth,
            actionIntent,
            domain,
          });
          subProblems.push(...childResult.subProblems);
          dependencies.push(...childResult.dependencies);
        }
      }
    }

    return { subProblems, dependencies };
  }

  /**
   * Generate a description for a sub-problem
   */
  private generateDescription(
    component: string,
    _parentProblem: string,
    actionIntent: string
  ): string {
    const actionDescriptions: Record<string, string> = {
      build: `Define and implement the ${component.toLowerCase()} component`,
      improve: `Analyze and optimize the ${component.toLowerCase()} for better performance`,
      fix: `Identify and resolve issues in the ${component.toLowerCase()}`,
      analyze: `Investigate and understand the ${component.toLowerCase()} behavior`,
      plan: `Create a detailed plan for the ${component.toLowerCase()}`,
      integrate: `Connect and integrate the ${component.toLowerCase()} with other components`,
      migrate: `Migrate and transition the ${component.toLowerCase()} to the new system`,
      scale: `Scale and distribute the ${component.toLowerCase()} for higher load`,
    };

    return (
      actionDescriptions[actionIntent] ||
      `Address the ${component.toLowerCase()} aspect of the problem`
    );
  }

  /**
   * Determine dependency type based on position
   */
  private determineDependencyType(index: number, total: number): string {
    if (index === 0) {
      return "foundation";
    }
    if (index === total - 1) {
      return "sequential";
    }
    return "hierarchical";
  }

  /**
   * Generate sub-components for a component
   */
  private generateSubComponents(component: string, domain: string): string[] {
    const componentLower = component.toLowerCase();

    // Common sub-component patterns
    const subComponentPatterns: Record<string, string[]> = {
      authentication: ["Login Flow", "Registration", "Password Reset", "Session Management"],
      "user interface": [
        "Layout Design",
        "Component Library",
        "Responsive Design",
        "Accessibility",
      ],
      "data storage": ["Schema Design", "Query Optimization", "Backup Strategy", "Migration Plan"],
      "api design": [
        "Endpoint Definition",
        "Request Validation",
        "Response Format",
        "Error Handling",
      ],
      security: ["Input Validation", "Access Control", "Encryption", "Audit Logging"],
      testing: ["Test Cases", "Test Data", "Automation", "Coverage Analysis"],
      deployment: ["Environment Setup", "CI/CD Pipeline", "Monitoring", "Rollback Plan"],
      performance: ["Profiling", "Caching", "Load Testing", "Optimization"],
      catalog: ["Product Listing", "Search Functionality", "Category Management"],
      cart: ["Item Management", "Price Calculation", "Persistence"],
      checkout: ["Payment Integration", "Order Validation", "Confirmation"],
      order: ["Order Processing", "Status Tracking", "History Management"],
      inventory: ["Stock Tracking", "Reorder Logic", "Availability Check"],
      payment: ["Gateway Integration", "Transaction Processing", "Refund Handling"],
      user: ["Profile Management", "Preferences", "Account Settings"],
      notification: ["Email Notifications", "Push Notifications", "In-App Alerts"],
      search: ["Query Processing", "Result Ranking", "Filtering"],
      analytics: ["Data Collection", "Metrics Calculation", "Reporting"],
      backend: ["Business Logic", "Data Access", "Service Layer"],
      frontend: ["UI Components", "State Management", "Routing"],
      database: ["Schema Design", "Query Optimization", "Indexing"],
      api: ["Endpoint Design", "Request Handling", "Response Formatting"],
      integration: ["External APIs", "Data Mapping", "Error Handling"],
      validation: ["Input Validation", "Business Rules", "Error Messages"],
      logging: ["Log Collection", "Log Storage", "Log Analysis"],
      monitoring: ["Health Checks", "Alerting", "Dashboards"],
      caching: ["Cache Strategy", "Invalidation", "Storage"],
      queue: ["Message Processing", "Retry Logic", "Dead Letter Handling"],
      // NEW: Real-time and collaborative sub-components
      "real-time": ["WebSocket Setup", "Event Handling", "Connection Pooling"],
      realtime: ["WebSocket Setup", "Event Handling", "Connection Pooling"],
      communication: ["Protocol Selection", "Message Format", "Heartbeat"],
      synchronization: ["State Diffing", "Merge Strategy", "Conflict Detection"],
      sync: ["State Diffing", "Merge Strategy", "Conflict Detection"],
      "conflict resolution": ["CRDT Implementation", "OT Algorithm", "Merge Rules"],
      crdt: ["Data Structure Selection", "Merge Function", "Garbage Collection"],
      presence: ["User Tracking", "Status Updates", "Cursor Sync"],
      broadcast: ["Pub/Sub Setup", "Channel Management", "Message Routing"],
      // NEW: Document editing sub-components
      document: ["Schema Definition", "Content Model", "Serialization"],
      editor: ["Input Handling", "Selection Management", "Rendering"],
      "version history": ["Snapshot Storage", "Diff Generation", "Restore Logic"],
      formatting: ["Style Application", "Block Types", "Inline Marks"],
      // NEW: Migration sub-components
      migration: ["Dependency Analysis", "Risk Assessment", "Rollback Plan"],
      "data migration": ["Schema Mapping", "ETL Pipeline", "Validation"],
      modernization: ["Architecture Review", "Technology Selection", "Phased Approach"],
      // NEW: Microservices sub-components
      "service decomposition": ["Bounded Context", "API Contract", "Data Ownership"],
      "service discovery": ["Registry Setup", "Health Checks", "Load Balancing"],
      "api gateway": ["Routing Rules", "Rate Limiting", "Authentication"],
      saga: ["Choreography vs Orchestration", "Compensation Logic", "Timeout Handling"],
      "event sourcing": ["Event Store", "Projection", "Replay"],
    };

    for (const [pattern, subComponents] of Object.entries(subComponentPatterns)) {
      if (componentLower.includes(pattern)) {
        return subComponents.slice(0, 3);
      }
    }

    // Fallback: generate generic sub-components based on domain
    return this.generateGenericSubComponents(component, domain);
  }

  /**
   * Generate generic sub-components when no specific pattern matches
   * This ensures decomposition can reach the requested maxDepth
   */
  private generateGenericSubComponents(component: string, domain: string): string[] {
    // Domain-specific generic sub-components
    const domainSubComponents: Record<string, string[]> = {
      ecommerce: ["Requirements Analysis", "Implementation", "Integration"],
      webapp: ["Design Phase", "Development Phase", "Testing Phase"],
      mobile: ["UI Design", "Core Logic", "Platform Integration"],
      data: ["Data Modeling", "Processing Logic", "Output Generation"],
      ml: ["Data Preparation", "Model Development", "Evaluation"],
      api: ["Specification", "Implementation", "Documentation"],
      security: ["Threat Analysis", "Implementation", "Verification"],
      performance: ["Analysis", "Optimization", "Validation"],
      testing: ["Test Design", "Test Implementation", "Test Execution"],
      devops: ["Configuration", "Automation", "Monitoring"],
      general: ["Analysis", "Implementation", "Verification"],
    };

    const subComponents = domainSubComponents[domain] || domainSubComponents.general;

    // Customize sub-component names with the component context
    const componentWords = component.split(/\s+/).filter((w) => w.length > 3);
    const contextWord = componentWords.length > 0 ? componentWords[componentWords.length - 1] : "";

    if (contextWord) {
      return subComponents.map((sub) => `${sub} for ${contextWord}`);
    }

    return subComponents;
  }
}
