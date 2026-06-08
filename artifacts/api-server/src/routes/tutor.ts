import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, lecturesTable, topicsTable } from "@workspace/db";
import { AskTutorBody, AskTutorResponse } from "@workspace/api-zod";
import { chatText, chatJson, FAST_MODEL } from "../lib/ai";

const router: IRouter = Router();

router.get("/tutor/suggestions/:lectureId", async (req, res): Promise<void> => {
  const lectureId = Number(req.params.lectureId);
  if (!Number.isFinite(lectureId)) {
    res.status(400).json({ error: "invalid lectureId" });
    return;
  }
  const [lecture] = await db
    .select()
    .from(lecturesTable)
    .where(eq(lecturesTable.id, lectureId));
  if (!lecture) {
    res.status(404).json({ error: "lecture not found" });
    return;
  }

  try {
    const out = await chatJson<{ questions: string[] }>(
      'You are an encouraging college quantitative-reasoning tutor. Reply as strict JSON of the form {"questions": string[]} with NO other keys.',
      `From the lecture below, generate 6 short, concrete starter questions a student might want to ask after reading it. Cover every major idea in the reading (not just the first one). Each question must be one sentence, under ~18 words, in the student's voice (e.g. "Why does ...?", "Can you show me ...?", "What's the difference between ...?").\n\nLECTURE TITLE: ${lecture.title}\n\nLECTURE BODY:\n"""\n${lecture.body}\n"""`,
      FAST_MODEL,
    );
    const questions = Array.isArray(out?.questions)
      ? out.questions.filter((q) => typeof q === "string" && q.trim().length > 0).slice(0, 8)
      : [];
    res.json({ questions });
  } catch {
    res.json({ questions: [] });
  }
});

router.post("/tutor/ask", async (req, res): Promise<void> => {
  const parsed = AskTutorBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { message, selectedLectureText, topicId } = parsed.data;

  // Optional topic scoping: ground the tutor in the topic the student is
  // currently practicing so practice-time questions stay on-target.
  let topicContext = "";
  if (topicId != null) {
    const [topic] = await db
      .select()
      .from(topicsTable)
      .where(eq(topicsTable.id, topicId));
    if (topic) {
      const [lecture] = await db
        .select()
        .from(lecturesTable)
        .where(eq(lecturesTable.topicId, topic.id));
      topicContext =
        `The student is practicing the topic "${topic.title}".` +
        (lecture?.body
          ? `\n\nRelevant lecture material for this topic:\n"""\n${lecture.body.slice(0, 2500)}\n"""`
          : "");
    }
  }

  const sys =
    "You are an encouraging, substantive college quantitative-reasoning tutor having a real back-and-forth conversation with one student. Explain step by step, use concrete numbers and fully worked examples, name the relevant concepts (units, ratios, percentages, base rates, probability, correlation vs. causation), and check the student's understanding with a follow-up nudge. Be thorough and genuinely helpful — give as much depth as the question warrants rather than a canned one-liner. When the student is mid-practice, help them reason through the method without simply handing over the final numeric answer.";
  const contextBlocks = [topicContext, selectedLectureText
    ? `Context from the lecture the student is reading:\n"""\n${selectedLectureText}\n"""`
    : ""]
    .filter(Boolean)
    .join("\n\n");
  const user = contextBlocks
    ? `${contextBlocks}\n\nStudent question: ${message}`
    : message;

  let text = "";
  try {
    text = await chatText(sys, user);
  } catch {
    text =
      "I'm having trouble reaching the tutor service right now. Try again in a moment, and consider re-reading the relevant section of the lecture.";
  }
  res.json(AskTutorResponse.parse({ text, audioUrl: null }));
});

export default router;
