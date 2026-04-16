import { GoogleGenerativeAI } from "@google/generative-ai";
async function list() {
  try {
    const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models?key=AIzaSyDwq-aldfWx-Nk6u_hO6HPIfEG_yAE-tg8");
    const json = await res.json();
    console.log(JSON.stringify(json, null, 2));
  } catch (e) {
    console.error("Error formatting:", e);
  }
}
list();
