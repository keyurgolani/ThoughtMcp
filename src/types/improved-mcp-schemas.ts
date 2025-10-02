/**
 * Improved MCP tool schemas with user-friendly descriptions and examples
 */

export const IMPROVED_TOOL_SCHEMAS = {
  think: {
    name: "think",
    description:
      "Think through problems like a human - considering different angles, checking for mistakes, and providing thoughtful responses. Perfect for decisions, analysis, and creative problem-solving.",
    inputSchema: {
      type: "object",
      properties: {
        input: {
          type: "string",
          description: "Your question or problem to think about",
        },
        mode: {
          type: "string",
          enum: [
            "intuitive",
            "deliberative",
            "balanced",
            "creative",
            "analytical",
          ],
          description:
            "How to think about it: 'intuitive' for quick answers, 'deliberative' for careful analysis, 'creative' for innovative ideas, 'analytical' for logical reasoning, 'balanced' for general use (default)",
          default: "balanced",
        },
        context: {
          type: "object",
          properties: {
            session_id: { type: "string" },
            previous_thoughts: { type: "array", items: { type: "string" } },
            domain: { type: "string" },
            urgency: { type: "number", minimum: 0, maximum: 1 },
            complexity: { type: "number", minimum: 0, maximum: 1 },
          },
          description:
            "Optional context to help with thinking (previous conversations, topic area, urgency level)",
        },
        enable_emotion: {
          type: "boolean",
          description:
            "Include emotional considerations in thinking (recommended for personal decisions)",
          default: true,
        },
        enable_metacognition: {
          type: "boolean",
          description:
            "Check the quality of thinking and suggest improvements (recommended for important decisions)",
          default: true,
        },
        enable_systematic_thinking: {
          type: "boolean",
          description:
            "Use structured problem-solving methods for complex issues",
          default: true,
        },
        systematic_thinking_mode: {
          type: "string",
          enum: ["auto", "hybrid", "manual"],
          description:
            "How to select thinking frameworks: 'auto' lets the system choose, 'manual' for specific control",
          default: "auto",
        },
        temperature: {
          type: "number",
          minimum: 0,
          maximum: 2,
          description:
            "Creativity level: 0.3 for focused thinking, 0.7 for balanced, 1.2 for very creative",
          default: 0.7,
        },
        max_depth: {
          type: "number",
          minimum: 1,
          maximum: 20,
          description:
            "How deep to think: 5 for quick, 10 for normal, 15+ for very thorough",
          default: 10,
        },
      },
      required: ["input"],
    },
  },

  remember: {
    name: "remember",
    description:
      "Save important information to memory so it can be recalled later. Like writing in a smart notebook that organizes itself and connects related ideas.",
    inputSchema: {
      type: "object",
      properties: {
        content: {
          type: "string",
          description:
            "The information to remember (insights, facts, experiences, decisions)",
        },
        type: {
          type: "string",
          enum: ["episodic", "semantic"],
          description:
            "Type of memory: 'episodic' for specific experiences/events, 'semantic' for general knowledge/facts",
        },
        importance: {
          type: "number",
          minimum: 0,
          maximum: 1,
          description:
            "How important this is to remember: 0.3 for casual info, 0.7 for important, 0.9+ for critical",
          default: 0.5,
        },
        context: {
          type: "object",
          properties: {
            session_id: { type: "string" },
            domain: { type: "string" },
            timestamp: { type: "number" },
          },
          description:
            "Optional context about when/where this information came from",
        },
        emotional_tags: {
          type: "array",
          items: { type: "string" },
          description:
            "Emotional context (e.g., 'exciting', 'concerning', 'positive') to help with recall",
        },
      },
      required: ["content", "type"],
    },
  },

  recall: {
    name: "recall",
    description:
      "Find information from memory based on what you're looking for. Searches through past experiences and knowledge to find relevant information.",
    inputSchema: {
      type: "object",
      properties: {
        cue: {
          type: "string",
          description:
            "What you're looking for (keywords, topics, or descriptions of what you remember)",
        },
        type: {
          type: "string",
          enum: ["episodic", "semantic", "both"],
          description:
            "What to search: 'episodic' for experiences, 'semantic' for facts/knowledge, 'both' for everything (default)",
          default: "both",
        },
        threshold: {
          type: "number",
          minimum: 0,
          maximum: 1,
          description:
            "How closely related results need to be: 0.2 for loose matches, 0.5 for good matches, 0.8 for very similar",
          default: 0.3,
        },
        max_results: {
          type: "number",
          minimum: 1,
          maximum: 50,
          description: "Maximum number of memories to return (default: 10)",
          default: 10,
        },
        context: {
          type: "object",
          properties: {
            session_id: { type: "string" },
            domain: { type: "string" },
          },
          description: "Optional context to help focus the search",
        },
      },
      required: ["cue"],
    },
  },

  analyze_reasoning: {
    name: "analyze_reasoning",
    description:
      "Check the quality of thinking and reasoning to spot mistakes, biases, and areas for improvement. Like having a thinking coach review your logic.",
    inputSchema: {
      type: "object",
      properties: {
        reasoning_steps: {
          type: "array",
          items: {
            type: "object",
            properties: {
              type: {
                type: "string",
                description:
                  "Type of reasoning step (premise, conclusion, assumption, etc.)",
              },
              content: {
                type: "string",
                description: "The actual reasoning or statement",
              },
              confidence: {
                type: "number",
                description: "How confident you are in this step (0-1)",
              },
              alternatives: {
                type: "array",
                description: "Other ways to think about this",
              },
            },
            required: ["type", "content", "confidence"],
          },
          description:
            "The reasoning steps to analyze (from a decision or thought process)",
        },
        context: {
          type: "object",
          properties: {
            session_id: { type: "string" },
            domain: { type: "string" },
          },
          description: "Optional context about the reasoning situation",
        },
      },
      required: ["reasoning_steps"],
    },
  },

  analyze_systematically: {
    name: "analyze_systematically",
    description:
      "Apply proven problem-solving methods (like Design Thinking, Scientific Method, Root Cause Analysis) to tackle complex issues systematically.",
    inputSchema: {
      type: "object",
      properties: {
        input: {
          type: "string",
          description:
            "The complex problem or challenge to analyze systematically",
        },
        mode: {
          type: "string",
          enum: ["auto", "hybrid", "manual"],
          description:
            "Framework selection: 'auto' chooses the best method automatically (recommended)",
          default: "auto",
        },
        context: {
          type: "object",
          properties: {
            session_id: { type: "string" },
            domain: { type: "string" },
            urgency: { type: "number", minimum: 0, maximum: 1 },
            complexity: { type: "number", minimum: 0, maximum: 1 },
          },
          description:
            "Context about the problem (domain, urgency, complexity level)",
        },
      },
      required: ["input"],
    },
  },

  think_parallel: {
    name: "think_parallel",
    description:
      "Think about problems from multiple perspectives simultaneously - analytical, creative, critical, and synthetic viewpoints working together for comprehensive insights.",
    inputSchema: {
      type: "object",
      properties: {
        input: {
          type: "string",
          description:
            "The problem or question to analyze from multiple perspectives",
        },
        context: {
          type: "object",
          properties: {
            session_id: { type: "string" },
            domain: { type: "string" },
            urgency: { type: "number", minimum: 0, maximum: 1 },
            complexity: { type: "number", minimum: 0, maximum: 1 },
          },
          description: "Context about the problem for better analysis",
        },
        enable_coordination: {
          type: "boolean",
          description:
            "Allow different thinking streams to share insights and resolve conflicts (recommended)",
          default: true,
        },
        synchronization_interval: {
          type: "number",
          minimum: 100,
          maximum: 5000,
          description:
            "How often thinking streams coordinate (milliseconds, default: 1000)",
          default: 1000,
        },
      },
      required: ["input"],
    },
  },

  decompose_problem: {
    name: "decompose_problem",
    description:
      "Break down big, overwhelming problems into smaller, manageable pieces with clear priorities and dependencies. Perfect for large projects or complex challenges.",
    inputSchema: {
      type: "object",
      properties: {
        input: {
          type: "string",
          description:
            "The large or complex problem to break down into manageable parts",
        },
        context: {
          type: "object",
          properties: {
            session_id: { type: "string" },
            domain: { type: "string" },
            urgency: { type: "number", minimum: 0, maximum: 1 },
            complexity: { type: "number", minimum: 0, maximum: 1 },
          },
          description:
            "Context about the problem (domain, urgency, complexity)",
        },
        strategies: {
          type: "array",
          items: {
            type: "string",
            enum: [
              "functional",
              "temporal",
              "stakeholder",
              "component",
              "risk",
              "resource",
              "complexity",
            ],
          },
          description:
            "Specific breakdown approaches to use (leave empty for automatic selection)",
        },
        max_depth: {
          type: "number",
          minimum: 1,
          maximum: 5,
          description:
            "How many levels deep to break down the problem (2-3 usually works well)",
          default: 3,
        },
      },
      required: ["input"],
    },
  },

  think_probabilistic: {
    name: "think_probabilistic",
    description:
      "Handle uncertain situations by working with probabilities, updating beliefs based on evidence, and quantifying confidence levels. Great for risk assessment and decisions with incomplete information.",
    inputSchema: {
      type: "object",
      properties: {
        input: {
          type: "string",
          description:
            "The uncertain situation or question to analyze probabilistically",
        },
        context: {
          type: "object",
          properties: {
            session_id: { type: "string" },
            domain: { type: "string" },
            urgency: { type: "number", minimum: 0, maximum: 1 },
            complexity: { type: "number", minimum: 0, maximum: 1 },
          },
          description: "Context about the uncertain situation",
        },
        enable_bayesian_updating: {
          type: "boolean",
          description:
            "Update beliefs as new evidence comes in (recommended for evolving situations)",
          default: true,
        },
        uncertainty_threshold: {
          type: "number",
          minimum: 0,
          maximum: 1,
          description:
            "When to flag high uncertainty (0.1 = flag if >10% uncertain)",
          default: 0.1,
        },
        max_hypotheses: {
          type: "number",
          minimum: 1,
          maximum: 10,
          description: "Maximum number of possible explanations to consider",
          default: 3,
        },
        evidence_weight_threshold: {
          type: "number",
          minimum: 0,
          maximum: 1,
          description:
            "Minimum strength of evidence to consider (0.3 = ignore weak evidence)",
          default: 0.3,
        },
      },
      required: ["input"],
    },
  },

  analyze_memory_usage: {
    name: "analyze_memory_usage",
    description:
      "Check how memory is being used and get suggestions for optimization. Like running a health check on your memory system to keep it running smoothly.",
    inputSchema: {
      type: "object",
      properties: {
        analysis_depth: {
          type: "string",
          enum: ["shallow", "deep", "comprehensive"],
          description:
            "Analysis level: 'shallow' for quick check, 'deep' for detailed analysis (recommended), 'comprehensive' for full audit",
          default: "deep",
        },
        include_recommendations: {
          type: "boolean",
          description: "Include suggestions for improving memory performance",
          default: true,
        },
        context: {
          type: "object",
          properties: {
            session_id: { type: "string" },
            domain: { type: "string" },
          },
          description: "Optional context for the analysis",
        },
      },
    },
  },

  optimize_memory: {
    name: "optimize_memory",
    description:
      "Clean up memory by removing or archiving less important information while preserving valuable memories. Helps improve thinking performance and reduces clutter.",
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["analyze", "optimize", "preview_cleanup", "execute_cleanup"],
          description:
            "What to do: 'analyze' for memory analysis, 'optimize' for traditional optimization, 'preview_cleanup' to see cleanup options, 'execute_cleanup' for one-click cleanup",
          default: "analyze",
        },
        cleanup_option: {
          type: "string",
          enum: [
            "quick_tidy",
            "smart_cleanup",
            "deep_clean",
            "performance_boost",
            "storage_saver",
            "privacy_cleanup",
          ],
          description:
            "One-click cleanup option (for 'preview_cleanup' or 'execute_cleanup'): 'quick_tidy' (safest), 'smart_cleanup' (recommended), 'deep_clean' (thorough), 'performance_boost' (speed), 'storage_saver' (space), 'privacy_cleanup' (secure)",
        },
        optimization_mode: {
          type: "string",
          enum: ["conservative", "moderate", "aggressive"],
          description:
            "Cleanup level for traditional optimization: 'conservative' for minimal changes, 'moderate' for balanced cleanup (recommended), 'aggressive' for maximum cleanup",
          default: "moderate",
        },
        target_memory_reduction: {
          type: "number",
          minimum: 0,
          maximum: 0.5,
          description:
            "Percentage of memory to optimize (0.1 = 10%, recommended maximum 0.3 = 30%)",
          default: 0.1,
        },
        enable_gradual_degradation: {
          type: "boolean",
          description:
            "Gradually fade memories instead of deleting immediately (safer, allows recovery)",
          default: true,
        },
        require_user_consent: {
          type: "boolean",
          description: "Ask permission before removing important memories",
          default: true,
        },
        preserve_important_memories: {
          type: "boolean",
          description:
            "Always keep high-importance memories (strongly recommended)",
          default: true,
        },
        context: {
          type: "object",
          properties: {
            session_id: { type: "string" },
            domain: { type: "string" },
          },
          description: "Optional context for optimization",
        },
      },
    },
  },

  recover_memory: {
    name: "recover_memory",
    description:
      "Try to restore forgotten or degraded memories using partial clues and associations. Like trying to remember something that's 'on the tip of your tongue'.",
    inputSchema: {
      type: "object",
      properties: {
        memory_id: {
          type: "string",
          description:
            "The ID of the memory to recover (from memory analysis or audit logs)",
        },
        recovery_cues: {
          type: "array",
          items: {
            type: "object",
            properties: {
              type: {
                type: "string",
                enum: [
                  "semantic",
                  "temporal",
                  "contextual",
                  "associative",
                  "emotional",
                ],
                description:
                  "Type of clue: 'semantic' for topic/content, 'temporal' for when, 'contextual' for situation, 'associative' for related ideas, 'emotional' for feelings",
              },
              value: {
                type: "string",
                description: "The actual clue or hint you remember",
              },
              strength: {
                type: "number",
                minimum: 0,
                maximum: 1,
                description:
                  "How confident you are in this clue (0.5 = somewhat sure, 0.8 = very sure)",
                default: 0.5,
              },
            },
            required: ["type", "value"],
          },
          description:
            "Clues to help recover the memory (the more clues, the better chance of recovery)",
          minItems: 1,
        },
        recovery_strategies: {
          type: "array",
          items: {
            type: "string",
            enum: [
              "associative_recovery",
              "schema_based_recovery",
              "partial_cue_recovery",
            ],
          },
          description:
            "Recovery methods to try (leave empty for automatic selection)",
        },
        max_recovery_attempts: {
          type: "number",
          minimum: 1,
          maximum: 10,
          description:
            "Maximum number of recovery attempts (more attempts = better chance but slower)",
          default: 5,
        },
        confidence_threshold: {
          type: "number",
          minimum: 0,
          maximum: 1,
          description:
            "Minimum confidence needed to consider recovery successful (0.3 = accept partial recovery)",
          default: 0.3,
        },
        context: {
          type: "object",
          properties: {
            session_id: { type: "string" },
            domain: { type: "string" },
          },
          description: "Optional context for recovery",
        },
      },
      required: ["memory_id", "recovery_cues"],
    },
  },

  forgetting_audit: {
    name: "forgetting_audit",
    description:
      "Review what memories have been forgotten, archived, or modified. Provides transparency and allows you to restore accidentally forgotten information.",
    inputSchema: {
      type: "object",
      properties: {
        view_type: {
          type: "string",
          enum: ["summary", "detailed", "recent_highlights"],
          description:
            "What to show: 'summary' for overview (recommended), 'detailed' for full audit log, 'recent_highlights' for latest important changes",
          default: "summary",
        },
        time_period: {
          type: "string",
          enum: ["today", "week", "month", "quarter", "year", "all"],
          description:
            "Time period to review: 'today', 'week' (recommended), 'month', 'quarter', 'year', or 'all'",
          default: "week",
        },
        query: {
          type: "object",
          properties: {
            start_timestamp: {
              type: "number",
              description:
                "Show changes after this time (Unix timestamp, leave empty for all time)",
            },
            end_timestamp: {
              type: "number",
              description:
                "Show changes before this time (Unix timestamp, leave empty for now)",
            },
            memory_ids: {
              type: "array",
              items: { type: "string" },
              description:
                "Specific memory IDs to check (leave empty for all memories)",
            },
            execution_status: {
              type: "array",
              items: {
                type: "string",
                enum: ["pending", "executed", "cancelled", "failed"],
              },
              description:
                "Filter by what happened: 'executed' for completed, 'pending' for scheduled",
            },
            execution_method: {
              type: "array",
              items: {
                type: "string",
                enum: ["automatic", "manual", "user_requested"],
              },
              description:
                "Filter by how it happened: 'automatic' for system cleanup, 'user_requested' for manual",
            },
            user_consent_granted: {
              type: "boolean",
              description:
                "Show only changes you approved (true) or didn't approve (false)",
            },
            privacy_level: {
              type: "array",
              items: {
                type: "string",
                enum: ["public", "private", "confidential", "restricted"],
              },
              description: "Filter by privacy level of forgotten memories",
            },
            limit: {
              type: "number",
              minimum: 1,
              maximum: 1000,
              description: "Maximum number of results to show (default: 100)",
              default: 100,
            },
            offset: {
              type: "number",
              minimum: 0,
              description:
                "Skip this many results (for pagination, default: 0)",
              default: 0,
            },
          },
          description:
            "Filters for what to show in the audit (leave empty to see recent changes)",
        },
        include_summary: {
          type: "boolean",
          description: "Include summary statistics about memory changes",
          default: true,
        },
        export_format: {
          type: "string",
          enum: ["json", "csv", "xml"],
          description: "Format for exporting audit data (optional)",
        },
      },
    },
  },

  forgetting_policy: {
    name: "forgetting_policy",
    description:
      "Create and manage rules for what types of memories should be kept, forgotten, or require permission before removal. Like setting up automatic memory management preferences.",
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: [
            "list",
            "get",
            "create",
            "update",
            "delete",
            "evaluate",
            "import",
            "export",
            "list_presets",
            "use_preset",
          ],
          description:
            "What to do: 'list' to see policies, 'create' to make new policy, 'list_presets' to see easy options, 'use_preset' to apply a preset",
        },
        preset_id: {
          type: "string",
          enum: [
            "conservative",
            "balanced",
            "aggressive",
            "minimal",
            "privacy_focused",
          ],
          description:
            "Easy preset to use (for 'use_preset' action): 'conservative' (safest), 'balanced' (recommended), 'aggressive' (performance), 'minimal' (essential only), 'privacy_focused' (secure)",
        },
        policy_id: {
          type: "string",
          description:
            "Policy ID (needed for 'get', 'update', 'delete', 'export' actions)",
        },
        policy_data: {
          type: "object",
          description:
            "Policy details (needed for 'create' and 'update' actions)",
          properties: {
            policy_name: {
              type: "string",
              description: "Name for this policy",
            },
            description: {
              type: "string",
              description: "What this policy does",
            },
            active: {
              type: "boolean",
              description: "Whether this policy is currently active",
            },
            rules: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  rule_name: {
                    type: "string",
                    description: "Name for this rule",
                  },
                  description: {
                    type: "string",
                    description: "What this rule does",
                  },
                  priority: {
                    type: "number",
                    description:
                      "Rule priority (higher numbers = more important)",
                  },
                  conditions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        condition_type: {
                          type: "string",
                          enum: [
                            "memory_type",
                            "importance_threshold",
                            "age_days",
                            "access_frequency",
                            "content_category",
                            "privacy_level",
                            "user_tag",
                          ],
                          description:
                            "What to check: 'importance_threshold' for importance level, 'age_days' for how old, 'memory_type' for episodic/semantic",
                        },
                        operator: {
                          type: "string",
                          enum: [
                            "equals",
                            "not_equals",
                            "greater_than",
                            "less_than",
                            "contains",
                            "not_contains",
                            "in",
                            "not_in",
                          ],
                          description:
                            "How to compare: 'greater_than' for >, 'equals' for =, 'contains' for text matching",
                        },
                        value: { description: "Value to compare against" },
                        weight: {
                          type: "number",
                          description: "How important this condition is",
                        },
                      },
                      required: ["condition_type", "operator", "value"],
                    },
                    description:
                      "Conditions that must be met for this rule to apply",
                  },
                  condition_logic: {
                    type: "string",
                    enum: ["AND", "OR"],
                    description:
                      "How to combine conditions: 'AND' means all must be true, 'OR' means any can be true",
                  },
                  action: {
                    type: "string",
                    enum: [
                      "allow",
                      "deny",
                      "require_consent",
                      "delay",
                      "modify",
                    ],
                    description:
                      "What to do: 'allow' forgetting, 'deny' forgetting, 'require_consent' to ask permission",
                  },
                  action_parameters: {
                    type: "object",
                    description: "Additional settings for the action",
                  },
                },
                required: [
                  "rule_name",
                  "conditions",
                  "condition_logic",
                  "action",
                ],
              },
              description: "Rules that make up this policy",
            },
            user_preferences: {
              type: "object",
              properties: {
                consent_required_by_default: {
                  type: "boolean",
                  description: "Ask permission before forgetting by default",
                },
                protected_categories: {
                  type: "array",
                  items: { type: "string" },
                  description: "Categories of memories to always protect",
                },
                max_auto_forget_importance: {
                  type: "number",
                  description:
                    "Never auto-forget memories above this importance level",
                },
                retention_period_days: {
                  type: "number",
                  description: "Default number of days to keep memories",
                },
              },
              description: "Your general preferences for memory management",
            },
          },
        },
        evaluation_context: {
          type: "object",
          description:
            "Context for testing a policy (needed for 'evaluate' action)",
          properties: {
            memory_id: {
              type: "string",
              description: "Memory to test the policy against",
            },
            memory_type: {
              type: "string",
              enum: ["episodic", "semantic"],
              description: "Type of memory to test",
            },
            decision: { type: "object", description: "Decision context" },
            evaluation: { type: "object", description: "Evaluation context" },
            memory_metadata: { type: "object", description: "Memory details" },
          },
        },
        active_only: {
          type: "boolean",
          description:
            "For 'list' action: show only active policies (true) or all policies (false)",
          default: false,
        },
      },
      required: ["action"],
    },
  },
} as const;
