import { GoogleGenAI, Type } from "@google/genai";
import { AIParseResult, Priority } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

const modelName = "gemini-3-flash-preview";

export const parseTodoWithAI = async (input: string): Promise<AIParseResult> => {
  if (!input.trim()) throw new Error("Input is empty");

  const prompt = `
    Analyse l'entrée utilisateur suivante pour une tâche à faire et extrais les informations structurées.
    L'utilisateur écrit en français.
    
    Entrée utilisateur: "${input}"
    
    Aujourd'hui nous sommes le ${new Date().toLocaleDateString('fr-FR')}.
    
    Règles:
    - Si la priorité n'est pas claire, mets "Moyenne".
    - Si la catégorie n'est pas claire, mets "Général".
    - Essaie de déduire une date d'échéance si mentionnée (e.g., "demain", "vendredi prochain"). Format ISO YYYY-MM-DD.
    - Génère 1 à 3 tags pertinents.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "Le titre concis de la tâche" },
            description: { type: Type.STRING, description: "Une description plus détaillée ou le contexte, si disponible" },
            priority: { type: Type.STRING, enum: ["Basse", "Moyenne", "Haute", "Critique"] },
            category: { type: Type.STRING, description: "Catégorie (ex: Travail, Personnel, Santé)" },
            tags: { type: Type.ARRAY, items: { type: Type.STRING } },
            dueDate: { type: Type.STRING, description: "Date d'échéance au format YYYY-MM-DD ou null si non spécifié", nullable: true }
          },
          required: ["title", "priority", "category", "tags"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    return JSON.parse(text) as AIParseResult;
  } catch (error) {
    console.error("Error parsing todo with AI:", error);
    // Fallback if AI fails
    return {
      title: input,
      description: "",
      priority: "Moyenne",
      category: "Général",
      tags: [],
      dueDate: null
    };
  }
};

export const generateSubtasks = async (taskTitle: string, taskDescription?: string): Promise<string[]> => {
  const prompt = `
    Agis comme un expert en productivité. Décompose la tâche suivante en 3 à 5 sous-tâches concrètes et actionnables.
    Réponds uniquement avec un tableau JSON de chaînes de caractères.
    
    Tâche: ${taskTitle}
    Contexte: ${taskDescription || "Aucun"}
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });
    
    const text = response.text;
    if (!text) return [];
    return JSON.parse(text) as string[];
  } catch (error) {
    console.error("Error generating subtasks:", error);
    return [];
  }
};

export const getSmartAdvice = async (todos: any[]): Promise<string> => {
  const prompt = `
    Analyse cette liste de tâches (JSON) et donne un conseil court (max 2 phrases) en français pour motiver l'utilisateur ou lui suggérer par quoi commencer. Sois professionnel et encourageant.
    
    Tâches: ${JSON.stringify(todos.map(t => ({ title: t.title, priority: t.priority, status: t.status })))}
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
    });
    return response.text || "Continuez votre bon travail !";
  } catch (e) {
    return "Organisez vos priorités pour une journée productive.";
  }
};

export const prioritizeTasks = async (todos: any[]): Promise<string[]> => {
  const prompt = `
    Agis comme un expert en productivité utilisant la matrice d'Eisenhower.
    Analyse la liste de tâches suivante et détermine l'ordre optimal d'exécution pour maximiser l'efficacité.
    
    Critères de tri :
    1. Date d'échéance (Urgence).
    2. Niveau de priorité (Importance : Critique > Haute > Moyenne > Basse).
    3. Complexité et effort estimé (basé sur le titre et la description).
    
    Tâches à trier : 
    ${JSON.stringify(todos.map(t => ({ id: t.id, title: t.title, priority: t.priority, dueDate: t.dueDate, description: t.description })))}
    
    Instructions :
    - Retourne UNIQUEMENT un tableau JSON contenant les ID des tâches dans l'ordre recommandé (du premier à faire au dernier).
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });

    const text = response.text;
    if (!text) return [];
    return JSON.parse(text) as string[];
  } catch (error) {
    console.error("Error prioritizing tasks:", error);
    return [];
  }
};