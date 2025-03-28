
import { ChatOpenAI } from "@langchain/openai";
import { OpenAIEmbeddings } from "@langchain/openai";
import { z } from 'zod';
import { SystemMessage, HumanMessage, AIMessage, BaseMessage } from "@langchain/core/messages";
import { Annotation, MemorySaver, MessagesAnnotation, START, END, StateGraph, Command, interrupt } from "@langchain/langgraph";
import { CustomLocation, getWeather } from '../lib/weather';
import { eq, desc, sql, cosineDistance, l1Distance } from 'drizzle-orm';
import { db } from '@db';
import { embeddings, drinks } from '@db/schema';

/**
 * 1) Define OpenAI details and other constants
 * - Create output schema for structured output using zod 
 * - Select chat and embedding models
 * - Draft the system prompt to be used in all nodes
 * - Set thresholds for user information
 */

const outputSchema = z.object({
  response: z.string().describe("AIMessage response to the Human"),
  options: z.string().array().describe("List of user response options the user can choose from"),
  moods: z.string().array().optional().describe("List of moods the user mentioned"),
  drinkIngredients: z.string().array().optional().describe("List of ingredients the user mentioned"),
  drinkSuggested: z.boolean().optional().describe("Boolean indicating if a drink was suggested"),
})

const model = new ChatOpenAI({
  modelName: "gpt-4",
  temperature: 0.7,
  presencePenalty: 0.6,
  frequencyPenalty: 0.6
}).withStructuredOutput(outputSchema)

// Helper to detect duplicate messages
const isDuplicateMessage = (messages: BaseMessage[], newContent: string): boolean => {
  if (messages.length < 2) return false;
  const lastMessage = messages[messages.length - 1];
  const previousMessage = messages[messages.length - 2];
  return lastMessage.content === newContent || previousMessage.content === newContent;
};

const query_embedding = new OpenAIEmbeddings({
  modelName: "text-embedding-ada-002"
});

const generateEmbedding = async (query: string): Promise<number[]> => {
  const input = query.replaceAll('\n', ' ');
  const embedding = await query_embedding.embedQuery(input)
  return embedding;
}; 

let currentSessionwithRecommendation: string | null = null

const SYSPROMPT = `You are a friendly and knowledgeable virtual bartender interacting with a patron.
You help the patron find the perfect drink for any occasion based on your conversation with them and other context you have. 
Below you will be given specific instructions for each phase of the conversation.

IMPORTANT: Respond with valid JSON in the following format. 
When you are asking a straightforward question, provide exactly 3 options for a response for the patron to choose from, keep them declarative (never questions), under 30 characters in length, no punctuation.

"CRITICAL RULE: Never include questions in the options field. The options field is exclusively for user response options, not for you to ask questions."

{
  "message": "conversational response here",
  "options": ["Option 1", "Option 2", "..."],
}`;

const moodTotal = 1;
const ingredientTotal = 1;

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
interface Config {
  configurable: { thread_id: string };
  state?: {
    messages: BaseMessage[];
    drinkSuggested: boolean;
    drinkSuggestions: any[];
    sessionId: string;
    weather: string;
    location: CustomLocation | null;
    questionCount: number;
    preferences: Set<string>;
    moods: Set<string>;
  };
}

// Use sessionID as thread to cleanly reset state between sessions
export const config: Config = { configurable: { thread_id: "" } };

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
        goto: "questionPatron",
        update: {
          messages: [...state.messages, new AIMessage(response.response)],
          userWeather: state.userWeather,
        }
      });
    } catch (e) {
      if (attempts === maxRetries) {
        console.error("Max retry attempts reached:", e);
        return new Command({
          goto: "questionPatron",
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

async function questionPatron(state: typeof GraphState.State) {
  console.log("Questioning patron...");
  
  // Check if we have enough information to make a recommendation
  if (state.userMoods.length > moodTotal && state.drinkIngredients.length > ingredientTotal) {
    return new Command({
      goto: "makeRecommendation",
      update: {
        messages: [...state.messages]
      }
    });
  }
  
  // Get user input if the last message is from the AI
  const lastMessage = state.messages[state.messages.length - 1];
  if (lastMessage instanceof AIMessage) {
    const userInput = await interrupt(lastMessage.content) as HumanMessage;
    // Add user input to messages and continue to process it
    state = {
      ...state,
      messages: [...state.messages, userInput]
    };
  }
  
  // Process the latest user input and generate AI response
  const maxRetries = 3;
  let lastResponse = "";
  
  for (let attempts = 1; attempts <= maxRetries; attempts++) {
    const QUESTION_SYS_PROMPT = `
      PHASE 2 (Forget PHASE 1 instructions:
      As the virtual bartender, ask questions to determine the patron's mood, target vibe, and taste preferences all with the goal of finding the perfect cocktail for them. 
      Your questions should lead them to tell you something about their mood and drink/flavor preferences, and you should read between the lines of their tone to assess mood.

      In your JSON formatted responses, include two additional fields: "moods" and "ingredients" to store the patron's responses.
      Only add ingredients that they specifically mention in their response, but for moods, you should interpret their responses and demeanor to add one-word descriptors (e.g., "morose", "relaxed", "energetic")

      CRITICAL RULES (MUST FOLLOW):
      * Always end your response with a question to prompt the patron to respond.
      * Keep the conversation focused on cocktails and the patron's mood and preferences with relation to cocktails.
      * The options should never be questions, only declarative responses to a question raised in the message.
      * If and only if your question to the patron is is specifically about ingredients in the cocktail, always include the option "I'll pick the ingredients".
      * Do not ever say or suggest you have all the information to suggest a drink 
      * Do not ask about drink preparation or how the cocktail is served (e.g. don't ask "shaken or stirred?" or "what type of glass do you prefer?")
      * Do not ask about allergies or dietary restrictions
      * Do not ask about non-alcoholic or any non cocktail drinks, as we won't be recommending those (If they ask for a non-alcoholic drink, just say you're a bartender specializing in cocktails)
      `
    try {
      const messages = [
        new SystemMessage(QUESTION_SYS_PROMPT),
        ...state.messages
      ];
      
      const response = await model.invoke(messages);
      console.log("Response from model:", response);
      console.log("Mood:", state.userMoods);
      
      if (isDuplicateMessage(state.messages, response.response)) {
        console.log("Detected duplicate response, retrying...");
        if (attempts === maxRetries) {
          response.response = "I apologize, but I need to better understand what you're looking for. Could you rephrase that?";
          response.options = ["I need a drink recommendation", "Oh, nevermind...", "Goodbye"];
        } else {
          continue;
        }
      }
      
      lastResponse = response.response;
      const aiMessage = new AIMessage(response.response);
      (aiMessage as any).options = response.options;

      if (response.drinkIngredients) {
        response.drinkIngredients = response.drinkIngredients.map((ingredient: string) => ingredient.toLowerCase());
      }
      
      if (response.moods) {
        response.moods = response.moods.map((mood: string) => mood.toLowerCase());
      }
      
      // Return to self to continue the conversation loop until we have enough information
      return new Command({
        goto: "questionPatron",
        update: {
          messages: [...state.messages, aiMessage],
          drinkIngredients: response.drinkIngredients,
          userMoods: response.moods
        }
      });
      
    } catch (error) {
      console.error('Error in attempt', attempts, ':', error);
      if (attempts === maxRetries) {
        return new Command({
          goto: "questionPatron",
          update: {
            messages: [...state.messages, new AIMessage("I'm having trouble understanding you. Can you try again?")]
          }
        });
      }
    }
  }
  
  // If all retries failed
  return new Command({
    goto: "questionPatron",
    update: {
      messages: [...state.messages, new AIMessage("Interesting! Say more...")]
    }
  });
}

async function makeRecommendation(state: typeof GraphState.State)  {
  console.log("Making recommendations...");

  if (state.userMoods.length > moodTotal && state.drinkIngredients.length > ingredientTotal && currentSessionwithRecommendation == null) {
    console.log("Current session upon entering:", currentSessionwithRecommendation);
    currentSessionwithRecommendation = config.configurable.thread_id;
    console.log("Current session:", currentSessionwithRecommendation);
    console.log("User moods:", state.userMoods);
    console.log("User ingredients:", state.drinkIngredients);
    const drinkRecommendations = await getDrinkRecommendations(state.drinkIngredients, state.userMoods)
    console.log("Drink recommendations:", drinkRecommendations);

    const bestDrink = drinkRecommendations[0];

    return new Command({
      goto: END,
      update: {
        messages: [...state.messages, new AIMessage("I have a drink recommendation for you...")],
        drinkSuggested: true,
        drinkSuggestions: [bestDrink]
      }
    });
  }
}

/**
 * 4 ) Build graph
 */

export const graph = new StateGraph(GraphState)
  .addNode("greetPatron", greetPatron, {
    ends: ["questionPatron"]
  })
  .addNode("questionPatron", questionPatron, {
    ends: ["makeRecommendation"]
  })
  .addNode("makeRecommendation", makeRecommendation, {
    ends: [END]
  })
.addEdge(START, "greetPatron")
.addEdge("greetPatron", "questionPatron")
.addEdge("questionPatron", "makeRecommendation")
.addEdge("makeRecommendation", END)
.compile({
  checkpointer
});

/**
 * 5 ) Helper functions
 * - Start conversation
 * - Handle drink recommendation
 */

// Start the conversation
export async function startConversation(sessionId: string, weather: string, location: CustomLocation | null) {
  console.log("Starting conversation with sessionId =", sessionId);
  
  // Use sessionId as unique thread_id
  config.configurable = { thread_id: sessionId };
  config.state = undefined;
  
  // Initialize fresh state
  config.state = {
    messages: [],
    drinkSuggested: false,
    drinkSuggestions: [],
    sessionId,
    weather,
    location,
    questionCount: 0,
    preferences: new Set(),
    moods: new Set()
  };
  
  const messages = [
    new SystemMessage(
      `${SYSPROMPT}\n\n
      PHASE 1:
      For the first message in the conversation, just welcome the patron in a warm and inviting manner and making a sentence or two of small talk.

      At the patron's location, (${location?.city}, ${location?.regionname}), the weather is (${weather}), and the time is ${location?.time}.

      CRITICAL RULES (MUST FOLLOW):
      * Don't simply state the time, temperature, or weather, but rather make a passing reference to it in a natural way (e.g., "...beautiful clear morning in Tulsa...").
      * Don't ask the patron about their mood or anything related to drinks yet.
      * Don't pretend that you are in the same physical space with them or live in their city (you are a virtual bartender).
      `),
    new HumanMessage("Hello"),
  ]
  // Invoke the graph to start the wofkflow starting at the greetPatron node
  const response = await graph.invoke({messages: messages}, config)

  // Update the state with the user's location and weather for use in the initial welcome message
  return {
    // return the AI's greeting message
    messages: response.messages,
  };
}

interface DrinkRecommendation {
  id: number;
  name: string;
  description: string;
  recipe_url: string | null;
  moods: string[];
  preferences: string[];
  reasoning?: string;
}

const getDrinkRecommendations = async (ingredients: Array<String>, moods: Array<string>): Promise<DrinkRecommendation[]> => {
  const query = `Has ingredients: ${ingredients.join(", ")}; For these moods: ${moods.join(", ")}`
  console.log(`Sending query to vector DB: ${query}`)
  const embedding = await generateEmbedding(query);
  const similarity = sql<number>`1 - (${cosineDistance(embeddings.embedding, embedding)})`;
  const RecommendedDrinks = await db
    .select({ 
      id: embeddings.drinkId, 
      name: embeddings.drinkName, 
      description: embeddings.ingredients, // Using ingredients as description
      tags: embeddings.tags,
      recipe_url: drinks.recipeUrl,
      similarity,
      moods: sql<string[]>`ARRAY['${sql.raw(moods.join("','"))}']`,
      preferences: sql<string[]>`ARRAY['${sql.raw(ingredients.join("','"))}']`
    })
    .from(embeddings)
    .leftJoin(drinks, eq(embeddings.drinkId, drinks.id))
    .orderBy((t) => desc(t.similarity))
    .limit(4);

  // Add the user context to each drink and format according to interface
  const drinksWithContext: DrinkRecommendation[] = RecommendedDrinks
    .filter(drink => drink.id != null && drink.name != null)
    .map(drink => ({
      id: drink.id!,
      name: drink.name!,
      description: drink.description || '',
      recipe_url: drink.recipe_url || null,
      moods: moods,
      preferences: ingredients.map(i => i.toString()),
      reasoning: ''
    }));
  
  return drinksWithContext;
};