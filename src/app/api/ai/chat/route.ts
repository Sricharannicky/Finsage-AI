import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { chatWithAdvisor } from "@/lib/ai";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { message } = body;
  if (!message || typeof message !== "string") {
    return NextResponse.json({ error: "Message required" }, { status: 400 });
  }

  // Load recent conversation history (last 10 messages)
  const history = await db.aiChat.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  history.reverse();

  // Save user message
  await db.aiChat.create({
    data: { userId: user.id, role: "user", content: message },
  });

  const response = await chatWithAdvisor(
    user.id,
    message,
    history.map((h) => ({ role: h.role, content: h.content }))
  );

  // Save assistant response
  const saved = await db.aiChat.create({
    data: { userId: user.id, role: "assistant", content: response },
  });

  return NextResponse.json({
    response,
    messageId: saved.id,
    createdAt: saved.createdAt,
  });
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const messages = await db.aiChat.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
    take: 100,
  });
  return NextResponse.json({ messages });
}

export async function DELETE() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await db.aiChat.deleteMany({ where: { userId: user.id } });
  return NextResponse.json({ success: true });
}
