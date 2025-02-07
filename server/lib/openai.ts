import { ChatOpenAI } from "@langchain/openai";
import { OpenAIEmbeddings } from "@langchain/openai";
import { z } from 'zod';
import { SystemMessage, HumanMessage, AIMessage, BaseMessage } from "@langchain/core/messages";
import { Annotation, MemorySaver, MessagesAnnotation, START, END, StateGraph, Command, interrupt, Graph } from "@langchain/langgraph";
import { CustomLocation, getWeather } from '../lib/weather';
import { desc, sql, cosineDistance, l1Distance } from 'drizzle-orm';
import { db } from '@db';
import { embeddings } from '@db/schema';

/**
 * 1) Define OpenAI details
 * - Create output schema for structured output using zod 
 * - Select chat and embedding models
 * - Draft the system prompt to be used throughout all nodes
 */

const moodTotal = 1;
const ingredientTotal = 1;

const outputSchema = z.object({
  response: z.string().describe("AIMessage response to the Human"),
  options: z.string().array().describe("List of user response options the user can choose from"),
  moods: z.string().array().optional().describe("List of moods the user mentioned"),
  drinkIngredients: z.string().array().optional().describe("List of ingredients the user mentioned"),
  drinkSuggested: z.boolean().optional().describe("Boolean indicating if a drink was suggested"),
  suggestedDrink: z.object({
    id: z.number().describe("ID of the suggested drink"),
    name: z.string().describe("Name of the suggested drink"),
    description: z.string().describe("Description of the suggested drink"),
    reasoning: z.string().describe("Reasoning behind the suggested drink"),
  }).optional().describe("Object containing the suggested drink"),
})

const model = new ChatOpenAI({
  modelName: "gpt-4",
  temperature: 0.4
}).withStructuredOutput(outputSchema)

const query_embedding = new OpenAIEmbeddings({
  modelName: "text-embedding-ada-002"
});

const generateEmbedding = async (query: string): Promise<number[]> => {
  const input = query.replaceAll('\n', ' ');
  const embedding = await query_embedding.embedQuery(input)
  return embedding;
}; 

const SYSPROMPT = `You are a friendly and knowledgeable virtual bartender interacting with a patron.
You help the patron find the perfect drink for any occasion based on your conversation with them and other context you have. 
Below you will be given specific instructions for each phase of the conversation.

IMPORTANT: Respond with valid JSON in the following format. 
When you are asking a straightforward question, provide exactly 3 options for the patron to choose from, keep them declarative, under 30 characters in length, no punctuation.

{
  "message": "conversational response here",
  "options": ["Option 1", "Option 2", "..."],
}`;

/**
 * 2) Define graph state
 * - Use LangGraph annotation to define state and reducers for state fields
 * - Create checkpointer to store state and config for accessing it
 */

const GraphState = Annotation.Root({
  ...MessagesAnnotation.spec,
  userOptions: Annotation<string[]>,
  userMoods: Annotation<string[]>({
    reducer: (state: string[], update: string[] | undefined) => {
      if (!update) return state;
      const filtered = update.filter(x => x !== undefined);
      return [...new Set([...state, ...filtered])];
    },
    default: () => [],
  }),
  drinkIngredients: Annotation<string[]>({
    reducer: (state: string[], update: string[] | undefined) => {
      if (!update) return state;
      const filtered = update.filter(x => x !== undefined);
      return [...new Set([...state, ...filtered])];
    },
    default: () => [],
  }),
  userWeather: Annotation<string>,
  userLocation: Annotation<string>,
  userTime: Annotation<string>,
  drinkSuggested: Annotation<boolean>,
  drinkSuggestions: Annotation<{
    id: number;
    name: string;
    description: string;
    reasoning: string;
  }[]>,
});

// use MemorySaver to store the state of the chain
const checkpointer = new MemorySaver();
// set config so we can use checkpointing
export const config = { configurable: { thread_id: "VirtualBartender" } };


/**
 * 3 ) Define graph nodes
 * - Create async functions for each node in the graph
 */

async function greetPatron(state: typeof GraphState.State) {
  console.log("Greeting the patron...");
  const maxRetries = 3;
  for (let attempts = 1; attempts <= maxRetries; attempts++) {
    try {
      const response = await model.invoke([state.messages[0]]);
      return new Command({
        goto:
          "getPatronInput",
        update: {
          messages: [...state.messages, new AIMessage(response.response)],
          userWeather: state.userWeather,
        }
      });
    } catch (e) {
      if (attempts === maxRetries) {
        console.error("Max retry attempts reached:", e);
        return new Command({
          goto: "getPatronInput",
          update: {
            messages: [...state.messages, new AIMessage("Hi! I'd be happy to help you find the perfect drink today. What brings you in?")],
            userWeather: state.userWeather,
          }
        });
      }
      console.error(`Attempt ${attempts} failed:`, e);
      continue;
    }
  }
}

async function getPatronInput(state: typeof GraphState.State) {
  console.log("Getting patron input...");
  const lastMessage = state.messages[state.messages.length - 1];

  // If this is an AI message, interrupt for user input
  if (lastMessage instanceof AIMessage) {
    const value = await interrupt(lastMessage.content);
    console.log(`userMoods length: ${state.userMoods.length}: ${state.userMoods.join(", ")} \n drinkIngredients length: ${state.drinkIngredients.length}: ${state.drinkIngredients.join(", ")}`)
    const nextGoto = state.userMoods.length > moodTotal && state.drinkIngredients.length > ingredientTotal ? "makeRecommendation" : "questionPatron";
    console.log(`Next goto: ${nextGoto}`)
    return new Command({
      goto: nextGoto,
      update: {
        messages: [...state.messages, value]
      }
    });
  }
}

async function questionPatron(state: typeof GraphState.State) {
  // We'll instruct the model to ask user about mood/ingredients
  console.log("Questioning patron...");

  const QUESTION_SYS_PROMPT = `${SYSPROMPT}\n\n
      PHASE 2:
      (You can disregard the previous instructions that were given under the heading PHASE 1)
      Ask questions to determine the patron's personality, mood, target vibe, and taste preferences with the goal of finding the perfect cocktail for them. 
      Prompt them with questions that  tell you something about their mood and drink/flavor preferences, and read between the lines of their tone to assess mood.
      Make absolutely certain you follow the CRITICAL RULES below for every response.

      Ask about whatever you know less about. Right now you know ${state.drinkIngredients.length} things about ingredients, and ${state.userMoods.length} things about the patron's mood or vibe.

      In your JSON formatted responses, include two additional fields: "moods" and "ingredients" to store the patron's responses.
      Only add ingredients that they specifically mention in their response, but for moods, you should interpret their responses and demeanor to add one-word descriptors (e.g., "morose", "relaxed", "energetic")
      
      CRITICAL RULES:
      * Always end your response with a question to prompt the patron to respond.
      * If and only if your question to the patron is is specifically about ingredients in the cocktail, always include the option "I'll pick the ingredients".
      * Do not include an option about picking ingredients if your question is not specifically asking about ingredients.
      * Do not use the word "ingredients" in more than one option for any option set
      * Do not use the word "ingredients" for an option where the patron wants you decide what to include in their drink (i.e., do not return options like: "surprise me with ingredients", "you choose the ingredients", etc.)
      * Do not ask about drink preparation or how the cocktail is served (e.g. don't ask "shaken or stirred?" or "what type of glass do you prefer?")
      * Do not ask about allergies or dietary restrictions
      * Do not ask about non-alcoholic or any non cocktail drinks, as we won't be recommending those (If they ask for a non-alcoholic drink, just say you're a bartender specializing in cocktails)
      * Do not suggest any specific cocktails at this phase
      `
  const messages = [
    new SystemMessage(QUESTION_SYS_PROMPT),
    ...state.messages
  ];

  try {
    const response = await model.invoke(messages);
    // discard the response and call model.invoke again if the response from the model is the same as the last user message
    if (response.response === state.messages[state.messages.length - 1].content) {
      console.log("Model response is the same as the last user message, retrying...");
      return new Command({
        goto: "questionPatron",
      });
    }  
    try {
      const aiMessage = new AIMessage(response.response);
      // Attach options to the message metadata
      (aiMessage as any).options = response.options;

      // make all drink ingredients lowercase if it exists
      if (response.drinkIngredients) {
        response.drinkIngredients = response.drinkIngredients.map((ingredient: string) => ingredient.toLowerCase());
      }
       // make all moods lowercase if it exists
      if (response.moods) {
        response.moods = response.moods.map((mood: string) => mood.toLowerCase());
      }
      return new Command({
        goto: "getPatronInput",
        update: {
          messages: [...state.messages, aiMessage],
          drinkIngredients: response.drinkIngredients,
          userMoods: response.moods
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

async function makeRecommendation(state: typeof GraphState.State)  {
  console.log("Making recommendations...");
  
  if (state.userMoods.length > moodTotal && state.drinkIngredients.length > ingredientTotal) {
    const drinkRecommendations = await getDrinkRecommendations(state.drinkIngredients, state.userMoods)
    console.log("Drink recommendations:", drinkRecommendations);
    
    // Get the best match drink
    const bestDrink = drinkRecommendations[0];
    console.log(bestDrink)
    const REC_SYS_PROMPT = `${SYSPROMPT}\n\n
        PHASE 3:
        I have analyzed the patron's preferences and found this drink:
        ${JSON.stringify(bestDrink, null, 2)}

        Based on their mood (${state.userMoods.join(", ")}) and preferred ingredients (${state.drinkIngredients.join(", ")}), craft a response that:
        1. Recommends this specific drink
        2. Explains why it's perfect for them, referencing their stated preferences
        3. Ends with a friendly goodbye

        Response should be conversational and natural, not just listing facts.`

    const messages = [
      new SystemMessage(REC_SYS_PROMPT),
      ...state.messages.slice(-2) // Only include the last exchange for context
    ];
    
    try {
      const response = await model.invoke(messages);
      return new Command({
        goto: END,
        update: {
          messages: [...state.messages, new AIMessage(response.response)],
          drinkSuggested: true,
          drinkSuggestions: [bestDrink]
        }
      });
    } catch (error) {
      console.error('LangChain API error:', error);
      throw error;
    }
  }
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
    ends: [END]
  })

// Basic edges for multi-turn
.addEdge(START, "greetPatron")
.addEdge("greetPatron", "getPatronInput")
.addEdge("questionPatron", "getPatronInput")
.addEdge("getPatronInput", "makeRecommendation")
.addEdge("makeRecommendation", END)

// compile graph
.compile({
  checkpointer
});

// Start the conversation
export async function startConversation(sessionId: string, weather: string, location: CustomLocation | null) {
  console.log("Starting conversation with sessionId =", sessionId);

  const messages = [
    new SystemMessage(
      `${SYSPROMPT}\n\n
      PHASE 1:
      For the first message in the conversation, just welcome the patron in a warm and inviting manner and making a sentence or two of small talk.

      DO:
      * Make passing reference to exactly one of: (${location?.city}, ${location?.regionname}), weather situation (${weather}), or time of day ${location?.time}.
      * Don't ask the patron about their mood or favorite drinks yet.

      DO NOT:
      * Pretend that you are in the same physical space with them or live in their city (you are a virtual bartender).
      * Directly say the temperature or time unless it is especially notable
      * Provide options related to drinks or ingredients. 
      `),
    new HumanMessage("Hello"),
  ]
  // Invoke the graph to start the wofkflow starting at the greetPatron node
  const response = await graph.invoke({messages: messages}, config)

  // Update the state with the user's location and weather for use in the initial welcome message
  try {
    await graph.updateState(config, {
      userWeather: weather,
      userLocation: location?.city + ", " + location?.regionname,
      userTime: location?.time,
    });
  } catch (e) {}

  return {
    // return the AI's greeting message
    messages: response.messages,
  };
}

const getDrinkRecommendations = async (ingredients: Array<String>, moods: Array<string>) => {
  const query = `Ingredients: ${ingredients.join(", ")} Mood: ${moods.join(", ")}`
  const embedding = await generateEmbedding(query);
  const similarity = sql<number>`1 - (${cosineDistance(embeddings.embedding, embedding)})`;
  const RecommendedDrinks = await db
    .select({ id: embeddings.drinkId, name: embeddings.drinkName, ingredients: embeddings.ingredients, tags: embeddings.tags, similarity })
    .from(embeddings)
    .orderBy((t) => desc(t.similarity))
    .limit(4);
  return RecommendedDrinks;
};