import { ChatOpenAI } from "@langchain/openai";
import { OpenAIEmbeddings } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { optional, z } from 'zod';
import { SystemMessage, HumanMessage, AIMessage, BaseMessage } from "@langchain/core/messages";
import { Annotation, MemorySaver, MessagesAnnotation, START, END, StateGraph, Command, interrupt, Graph } from "@langchain/langgraph";
import { CustomLocation } from '../lib/weather';
import { desc, asc, gt, eq, sql, cosineDistance, jaccardDistance } from 'drizzle-orm';
import { s } from "node_modules/vite/dist/node/types.d-aGj9QkWt";
import { drinkIngredients } from "@db/schema";

// chat and embedding models
const outputSchema = z.object({
  response: z.string().describe("AIMessage response to the Human"),
  options: z.string().array().describe("List of user response options the user can choose from"),
  moods: z.string().array().optional().describe("List of moods the user mentioned"),
  drinkIngredients: z.string().array().optional().describe("List of ingredients the user mentioned")
  
})

const model = new ChatOpenAI({
  modelName: "gpt-4",
  temperature: 0.4
}).withStructuredOutput(outputSchema);

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
Below you will be given specific instructions for each phase of the conversation.

IMPORTANT: Respond with valid JSON in the following format. 
Always provide exactly 3 options for the user to choose from, keep them declarative, under 30 characters in length, no punctuation:

{
  "message": "conversational response here",
  "options": ["Option 1", "Option 2", "..."],
  "moods": ["mood1", "mood2", "..."],
  "drinkIngredients": ["ingredient1", "ingredient2", "..."]
}`;

// Define the nodes
async function greetPatron(state: typeof GraphState.State) {
  console.log("Greeting the patron...");
  try {
    const response = await model.invoke([state.messages[0]]);

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
  console.log("Getting patron input...");
  const lastMessage = state.messages[state.messages.length - 1];
  
  // If this is an AI message, interrupt for user input
  if (lastMessage instanceof AIMessage) {
    const value = await interrupt(lastMessage.content);
    return new Command({
      goto: "questionPatron",
      update: {
        messages: [...state.messages, value]
      }
    });
  }
  
  // If this is a user message, continue to next node
  return new Command({
    goto: "questionPatron",
    update: {
      messages: state.messages,
    }
  });
}

async function questionPatron(state: typeof GraphState.State) {
  // We'll instruct the model to ask user about mood/ingredients
  console.log("Questioning patron...");

  // Add logic that looks at current state of context and determines if it's enough to move to receommendation


  const QUESTION_SYS_PROMPT = `${SYSPROMPT}\n\n
      PHASE 2:
      (You can disregard the previous instructions that were given under the heading PHASE 1)
      Ask questions to determine the patron's mood, their target vibe, and their preferences all with the goal of finding the perfect cocktail for them.

      In your JSON formatted responses, include two additional list fields: "moods" and "ingredients" to store the user's responses.
      Only add ingredients that they specifically mention in their response, but for moods, you should interpret their responses to add one-word descriptors (e.g., "morose", "relaxed", "energetic").

      DO:
      * Be creative in prompting them with questions to get them to open up about their mood and preferences.
      * Keep in mind their location, weather, and local time we already established as you think through appropp.
      
      DO NOT:
      * Suggest any specific cocktails at this phase
      * Ask about drink preparation or anything beyond flavors or ingredients
      * Ask about non-alcoholic or any non cocktail drinks, we won't be recommending those (If they ask for a non-alcoholic drink, just say you're a bartender specializing in cocktails)
      `
  const messages = [
    new SystemMessage(QUESTION_SYS_PROMPT),
    new HumanMessage(state.messages[state.messages.length - 1]),
    ...state.messages
  ];

  try {
    const response = await model.invoke(messages);

    console.log("questionPatron response:", response);

    try {
      const aiMessage = new AIMessage(response.response);
      // Attach options to the message metadata
      (aiMessage as any).options = response.options;
      (aiMessage as any).moods = response.moods;
      (aiMessage as any).drinkIngredients = response.drinkIngredients;
      return new Command({
        goto: "getPatronInput",
        update: {
          messages: [...state.messages, aiMessage]
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
  
  const messages = [
    new SystemMessage(
      `${SYSPROMPT}\n\n
      PHASE 1:
      For the first message in the conversation, just welcome the patron in a warm and inviting manner and making a sentence or two of small talk.

      DO:
      * Make passing reference to exactly one of: (${location?.city}, ${location?.regionname}), weather situation (${weather}), or time of day ${location?.time}.
      * Don't ask them about their mood or favorite drinks yet.
      
      DO NOT:
      * Pretend that you are in the same physical space with them or live in their city (you are a virtual bartender).
      * Directly say the temperature or time unless it is especially notable
      * Provide options related to drinks or ingredients. 
      `),
    new HumanMessage("Hello"),
  ]
  const response = await graph.invoke({messages: messages}, config);
  
  return {
    // return the last message in the chain
    messages: response.messages,
    options: response.userOptions
  };
}