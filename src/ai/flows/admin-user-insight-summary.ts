'use server';
/**
 * @fileOverview This file implements a Genkit flow that generates an AI-powered summary of a user's activity and profile for administrators.
 *
 * - adminUserInsightSummary - A function that handles the generation of the user insight summary.
 * - AdminUserInsightSummaryInput - The input type for the adminUserInsightSummary function.
 * - AdminUserInsightSummaryOutput - The return type for the adminUserInsightSummary function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AdminUserInsightSummaryInputSchema = z.object({
  userId: z.string().describe('The unique identifier for the user.'),
  userProfile: z.object({
    name: z.string().describe("The user's full name."),
    email: z.string().email().describe("The user's email address."),
    role: z.string().describe("The user's role (e.g., 'user', 'admin')."),
    saldoUSDT: z.number().describe("The user's current USDT balance."),
  }).describe("The user's profile information."),
  depositRequests: z.array(z.object({
    date: z.string().describe("The date of the deposit request in ISO format (YYYY-MM-DD)."),
    amount: z.number().describe("The USDT amount of the deposit request."),
    status: z.enum(['Pendiente', 'Aprobado', 'Rechazado']).describe("The status of the deposit request."),
    comprobanteURL: z.string().url().describe("URL to the proof of transfer.").optional(),
  })).describe("A list of the user's deposit requests."),
});
export type AdminUserInsightSummaryInput = z.infer<typeof AdminUserInsightSummaryInputSchema>;

const AdminUserInsightSummaryOutputSchema = z.object({
  summary: z.string().describe("A concise summary of the user's profile and activity, highlighting key information relevant to an administrator."),
  unusualPatternsDetected: z.boolean().describe("True if any unusual or suspicious patterns are identified in the user's activity or profile, otherwise false."),
  unusualPatternsDescription: z.string().describe("A detailed description of any unusual patterns detected, or a confirmation that none were found."),
});
export type AdminUserInsightSummaryOutput = z.infer<typeof AdminUserInsightSummaryOutputSchema>;

const adminUserInsightPrompt = ai.definePrompt({
  name: 'adminUserInsightPrompt',
  input: { schema: AdminUserInsightSummaryInputSchema },
  output: { schema: AdminUserInsightSummaryOutputSchema },
  prompt: `You are an AI assistant designed to help administrators quickly assess user trustworthiness and manage accounts. Your task is to analyze a user's profile and deposit request history, then provide a concise summary. Crucially, you must identify and describe any unusual or suspicious patterns.

Here is the user's information:

---
User Profile:
Name: {{{userProfile.name}}}
Email: {{{userProfile.email}}}
Role: {{{userProfile.role}}}
Current USDT Balance: {{{userProfile.saldoUSDT}}} USDT

---
Deposit Request History:
{{#if depositRequests}}
  {{#each depositRequests}}
    - Date: {{{date}}}, Amount: {{{amount}}} USDT, Status: {{{status}}}
  {{/each}}
{{else}}
  No deposit requests found.
{{/if}}

---

Analyze the provided data and generate a summary, paying close attention to:
- The overall activity level.
- The consistency of deposit amounts and frequencies.
- The ratio of approved vs. rejected requests.
- Any large, sudden, or frequent deposits that might seem unusual.
- Any instances of multiple rejections without clear resolution.
- Any discrepancies in the user's profile or typical behavior for their role.

Format your response as a JSON object strictly adhering to the following schema, and make sure the 'unusualPatternsDetected' field is accurate based on your findings. If no unusual patterns are found, set 'unusualPatternsDetected' to 'false' and 'unusualPatternsDescription' to "No unusual patterns detected."`,
});

const adminUserInsightSummaryFlow = ai.defineFlow(
  {
    name: 'adminUserInsightSummaryFlow',
    inputSchema: AdminUserInsightSummaryInputSchema,
    outputSchema: AdminUserInsightSummaryOutputSchema,
  },
  async (input) => {
    const { output } = await adminUserInsightPrompt(input);
    return output!;
  }
);

export async function adminUserInsightSummary(input: AdminUserInsightSummaryInput): Promise<AdminUserInsightSummaryOutput> {
  return adminUserInsightSummaryFlow(input);
}
