"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import { google } from "googleapis";

export const backupToSheet = action({
  args: {
    rows: v.array(v.array(v.string())),
  },
  handler: async (ctx, { rows }) => {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    const res = await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: "Для Олени",
      valueInputOption: "RAW",
      requestBody: { values: rows },
    });

    return { success: true };
  },
});
