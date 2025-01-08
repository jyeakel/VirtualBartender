import { ChatOpenAI } from "@langchain/openai";
import { OpenAIEmbeddings } from "@langchain/openai";
import { optional, z } from 'zod';
import { SystemMessage, HumanMessage, AIMessage, BaseMessage } from "@langchain/core/messages";
import { Annotation, MemorySaver, MessagesAnnotation, START, END, StateGraph, Command, interrupt, Graph } from "@langchain/langgraph";
import { CustomLocation } from '../lib/weather';
import { desc, asc, gt, eq, sql, cosineDistance, jaccardDistance } from 'drizzle-orm';

// chat and embedding models
const outputSchema = z.object({
  response: z.string().describe("AIMessage response to the Human"),
  options: z.string().array().describe("List of user response options the user can choose from"),
})

const model = new ChatOpenAI({
  modelName: "gpt-4",
  temperature: 0.4
}).withStructuredOutput(outputSchema, {name: "response"});

const query_embedding = new OpenAIEmbeddings({
  modelName: "text-embedding-3-small"
});

// Define the state of the graph
const GraphState = Annotation.Root({
  ...MessagesAnnotation.spec,
  context: Annotation<{
    userMoods: string[];
    drinkIngredients: string[];
    userWeather?: string;
    userTime?: string;
    userLocation?: CustomLocation | null;
  }>,
  drink_suggested: Annotation<boolean>,
  drinkSuggestions: Annotation<{
    id: number;
    name: string;
    description: string;
    reasoning: string;
  }[]>,
  userOptions: Annotation<string[]>
});

// use MemorySaver to store the state of the chain
const checkpointer = new MemorySaver();
// set config so we can use checkpointing
export const config = { configurable: { thread_id: "VirtualBartender" } };

const SYSPROMPT = `You are a friendly and knowledgeable virtual bartender.
You help users find the perfect drink for any occasion based on your conversation with them and other context you have. 

Your responses should be conversational and engaging, while focused on helping the user with the task at hand.

IMPORTANT: Respond with valid JSON in the following format and provide no more than 3 options for the user to choose from:
{
  "message": "conversational response here",
  "options": ["Option 1", "Option 2", "..."],
}`;

// Define the nodes
async function greetPatron(state: typeof GraphState.State) {
  console.log("Greeting the patron...");
  try {
    const response = await model.invoke([{
      role: "system",
      content: SYSPROMPT
    }, {
      role: "user",
      content: state.messages[state.messages.length - 1].content
    }]);

    const userOptions = response.options;

    try {
      return new Command({
        goto:
          "getPatronInput",
        update: {
          messages: [...state.messages, new AIMessage(response.response)],
          userOptions: response.options
        }
      });
    } catch (e) {
      console.error("Some error occurred", e);
      return {
        messages: { role: "assistant", content: "I'm having trouble understanding you. Can you try again?" },
        options: ["Start Over", "Try Different Approach"]
      };
    }
  } catch (error) {
    console.error('LangChain API error:', error);
    throw error;
  }
}

async function getPatronInput(state: typeof GraphState.State) {
  // stub of function, just pass state to next node
  console.log(state);
  console.log("Getting patron input...");
  let bartenderPrompt = state.messages[state.messages.length - 1].content;
  const value = interrupt(bartenderPrompt)
  try {
    console.log("Continue from interrupt with value:", value);
    return new Command({
      goto:
        "questionPatron",
      update: {
        messages: [...state.messages, value],
      }
    });
  } catch (e) {
    console.error("Some error occurred", e);
    return {
      messages: { role: "assistant", content: "I'm having trouble understanding you. Can you try again?" },
      options: ["Start Over", "Try Different Approach"]
    };
  }
}

async function questionPatron(state: typeof GraphState.State) {
  // We'll instruct the model to ask user about mood/ingredients
  console.log("Questioning patron...");
  try {
    const response = await model.invoke([{
      role: "system",
      content: "Ask the patron about some of their favorite drinks or ingredients. Provide no more than 3 options."
    }, {
      role: "user",
      content: state.messages[state.messages.length - 1].content
    }]);

    console.log("questionPatron response:", response);

    try {
      return new Command({
        goto:
          "getPatronInput",
        update: {
          messages: [...state.messages, new AIMessage(response.response)],
        }
      });
    } catch (e) {
      console.error("Some error occurred", e);
      return {
        messages: { role: "assistant", content: "I'm having trouble understanding you. Can you try again?" },
        options: ["Start Over", "Try Different Approach"]
      };
    }
  } catch (error) {
    console.error('LangChain API error:', error);
    throw error;
  }
}

async function makeRecommendation(state: typeof GraphState.State) {
  // stub of function, just pass state to next node
  return new Command({
    goto: END,
    update: state
  });
}

export const graph = new StateGraph(GraphState)
  .addNode("greetPatron", greetPatron, {
    ends: ["getPatronInput"]
  })
  .addNode("questionPatron", questionPatron, {
    ends: ["getPatronInput"]
  })
  // Node for interupting the conversation and gathering all user input
  .addNode("getPatronInput", getPatronInput, { 
    ends: ["questionPatron", "makeRecommendation"]
  })
  .addNode("makeRecommendation", makeRecommendation, {
    ends: ["questionPatron", END]
  })

// Basic edges for multi-turn
.addEdge(START, "greetPatron")
.addEdge("greetPatron", "getPatronInput")
.addEdge("getPatronInput", "questionPatron")
.addEdge("questionPatron", "getPatronInput")
.addEdge("getPatronInput", "makeRecommendation")
.addEdge("makeRecommendation", END)

// compile graph
.compile({
  checkpointer
});

/**
 * Called once to start a brand-new conversation.
 */
export async function startConversation(sessionId: string, weather: string, location: CustomLocation | null) {
  console.log("Starting conversation with sessionId =", sessionId);
  
  const message = [
    new HumanMessage("Hello"),
  ];

  const response = await graph.invoke({messages: message}, config);
  
  return {
    // return the last message in the chain
    messages: response.messages,
    options: response.userOptions
  };
}

export async function manageConversation(sessionId: string, state: typeof GraphState.State) {
  console.log("Starting conversation with sessionId =", sessionId);

}


/**
 * Called for each new user message after the greeting.
 * Each .invoke() transitions exactly one more node in the state machine:
 *  greet -> gather, gather -> gather, gather -> recommend, etc.
 */
export async function generateResponse(userMessage: string) {
  console.log("User says:", userMessage);
}
