'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const AssistantInputSchema = z.object({
  history: z.array(
    z.object({
      role: z.enum(['user', 'model']),
      content: z.array(z.object({ text: z.string() })),
    })
  ),
  message: z.string(),
});

export type AssistantInput = z.infer<typeof AssistantInputSchema>;

const AssistantOutputSchema = z.string();
export type AssistantOutput = z.infer<typeof AssistantOutputSchema>;

const assistantPrompt = `Eres el Asistente Virtual de Sunshine. Solo respondes preguntas sobre inversiones en nuestra plataforma. Los planes actuales son VIP BOOST: Bronce (2%), Plata (2.4%), Oro (2.6%) y Diamante (2.8%), RESPONDE PREGUNTAS USUALES DEL USUARIO . No hables de otros temas.`;

export async function asistenteVirtual(
  input: AssistantInput
): Promise<AssistantOutput> {
  const { history, message } = input;
  const { text } = await ai.generate({
    model: 'googleai/gemini-2.5-flash',
    prompt: message,
    history: history,
    system: assistantPrompt,
  });
  return text;
}
