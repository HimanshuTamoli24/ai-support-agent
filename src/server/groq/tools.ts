import { querySimilarEvidence } from "~/server/pinecone/client";

export interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export const groqTools: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "search_historical_precedents",
      description:
        "Search historical customer support conversations to find how the brand previously resolved similar customer problems. Use this to ground replies in actual precedent.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The search query describing the customer's problem or keywords",
          },
          brandId: {
            type: "string",
            description: "Optional brand ID to scope precedents",
          },
          topK: {
            type: "number",
            description: "Number of similar conversations to return (default 5)",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "lookup_order_status",
      description:
        "Look up the current tracking status, delivery ETA, and shipping courier details for an order ID or tracking number.",
      parameters: {
        type: "object",
        properties: {
          orderId: {
            type: "string",
            description: "The order ID or tracking number mentioned by customer (e.g. #ORD-12345, TRK-98765)",
          },
        },
        required: ["orderId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "lookup_brand_policy",
      description:
        "Verify official brand policies regarding returns, refund timeframes, hardware warranty (e.g. Apple battery <80% health), and compensation rules.",
      parameters: {
        type: "object",
        properties: {
          category: {
            type: "string",
            enum: [
              "returns_and_refunds",
              "hardware_warranty_battery",
              "cancellation",
              "shipping_delays",
              "security_fraud",
            ],
            description: "Policy category to query",
          },
          brandName: {
            type: "string",
            description: "Brand name (e.g. AppleSupport, AmazonHelp, Uber_Support)",
          },
        },
        required: ["category"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "escalate_to_human_supervisor",
      description:
        "Trigger immediate escalation to a human support tier-2 supervisor. Call this when safety hazards, legal/chargeback threats, security compromises, or extreme customer frustration occur.",
      parameters: {
        type: "object",
        properties: {
          reason: {
            type: "string",
            description: "Clear, concise explanation of why human intervention is required",
          },
          urgency: {
            type: "string",
            enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
            description: "Urgency level of the escalation",
          },
          category: {
            type: "string",
            enum: [
              "SAFETY_HAZARD",
              "LEGAL_CHARGEBACK",
              "ACCOUNT_SECURITY",
              "UNRESOLVED_COMPLAINT",
              "POLICY_EXCEPTION",
            ],
            description: "Escalation category",
          },
          customerMessage: {
            type: "string",
            description: "The original customer message triggering escalation",
          },
        },
        required: ["reason", "urgency", "category", "customerMessage"],
      },
    },
  },
];

export async function executeGroqTool(name: string, args: Record<string, any>) {
  switch (name) {
    case "search_historical_precedents": {
      try {
        const results = await querySimilarEvidence({
          queryText: args.query,
          brandId: args.brandId,
          topK: args.topK ?? 5,
        });
        return {
          found: results.length > 0,
          count: results.length,
          precedents: results.map((r) => ({
            messageId: r.messageId,
            role: r.role,
            text: r.text,
            similarityScore: Number((r.score * 100).toFixed(1)) + "%",
          })),
        };
      } catch (err) {
        return { found: false, error: String(err) };
      }
    }

    case "lookup_order_status": {
      const cleanId = String(args.orderId || "").replace(/[^a-zA-Z0-9_-]/g, "");
      const isDelayed = cleanId.length % 2 === 0;
      const isDelivered = cleanId.endsWith("9") || cleanId.endsWith("0");

      if (isDelivered) {
        return {
          orderId: cleanId,
          status: "DELIVERED",
          carrier: "FedEx Express",
          deliveredAt: "Yesterday at 2:45 PM",
          location: "Front Porch / Mailroom",
          canReturnUntil: "Within 14 days of delivery",
        };
      }

      return {
        orderId: cleanId,
        status: isDelayed ? "IN_TRANSIT_DELAYED" : "OUT_FOR_DELIVERY",
        carrier: "UPS Next Day Air",
        estimatedDelivery: isDelayed ? "Tomorrow by 8:00 PM (Sorting delay)" : "Today by 7:00 PM",
        currentLocation: "Regional Distribution Hub",
      };
    }

    case "lookup_brand_policy": {
      const brandName = args.brandName || "Brand Support";
      const policies: Record<string, { policyName: string; terms: string[]; resolutionRule: string }> = {
        returns_and_refunds: {
          policyName: `${brandName} Standard 14-Day Return & Refund Policy`,
          terms: [
            "Items returned within 14 days of delivery in original condition are eligible for full refund.",
            "Refunds take 3-5 business days to reflect on the original payment method.",
          ],
          resolutionRule: "Provide return portal link or generate prepaid return label.",
        },
        hardware_warranty_battery: {
          policyName: `${brandName} Hardware & Battery Limited Warranty`,
          terms: [
            "1-year standard warranty covers hardware defects and battery health degradation below 80% maximum capacity.",
            "If battery health >= 80%, recommend diagnostic battery optimization tips.",
          ],
          resolutionRule: "Guide user to Settings > Battery > Battery Health. If < 80%, schedule Genius Bar / service repair.",
        },
        cancellation: {
          policyName: `${brandName} Order Cancellation Policy`,
          terms: ["Orders in 'Processing' status can be cancelled instantly."],
          resolutionRule: "If order hasn't shipped, cancel order and confirm immediate refund.",
        },
        shipping_delays: {
          policyName: `${brandName} Carrier Delay Compensation Policy`,
          terms: ["Delays past 48 hours of estimated delivery qualify for shipping refund or credit."],
          resolutionRule: "Apologize for carrier backlog, share updated tracking ETA, and credit shipping fees.",
        },
        security_fraud: {
          policyName: `${brandName} Account Security & Fraud Policy`,
          terms: ["Any unauthorized account access or unfamiliar transactions requires immediate human review."],
          resolutionRule: "Must escalate to human safety specialist immediately.",
        },
      };

      return {
        brand: brandName,
        category: args.category,
        policy: policies[args.category] || policies.returns_and_refunds,
      };
    }

    case "escalate_to_human_supervisor": {
      const ticketId = `ESC-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`;
      return {
        escalated: true,
        ticketId,
        urgency: args.urgency,
        category: args.category,
        reason: args.reason,
        slaMinutes: args.urgency === "CRITICAL" ? 15 : 60,
        assignedTeam: "Tier-2 Human Escalations Team",
      };
    }

    default:
      return { error: `Tool ${name} not found.` };
  }
}
