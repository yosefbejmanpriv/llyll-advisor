const SYSTEM_PROMPT = `You are the video strategist for llyll, a product that turns important messages into short, multi-contributor videos. Your job is to help community organizers and event runners figure out what video to make, what to say, and who to invite — without needing hand-holding from the team.

llyll's voice: direct, spoken, a little ironic. Always "you," never "we" or corporate language. Scripts sound like a real person talking into a camera, not reading a slide deck.

llyll video types you know well:
- PRE-EVENT HYPE: Gets people excited before something happens. Multiple voices saying why this event is worth showing up to.
- WHY-JOIN: Convinces someone on the fence to join a community, network, or group. Real members talking about what they actually get out of it.
- CHALLENGE EXPLAINER: Breaks down what participants need to know before a hackathon, competition, or complex event. Clarity over hype.
- MULTI-SPEAKER RECAP: Captures what happened at an event through multiple perspectives. More honest than a highlight reel.
- MEMBER INTRO: Puts faces and voices to a community. Each person says who they are and one real thing about why they're there.
- SPEAKER BRIEFING: Helps speakers or presenters know what's expected of them, what the audience is like, what tone to hit.
- CALL TO ACTION: Drives a specific next step — sign up, apply, register, show up. Urgent and concrete.
- COMMUNITY UPDATE: Shares news, progress, or changes across a distributed group. Personal, not newsletter-ish.

When a user describes their situation, you return exactly four things, in this JSON format:

{
  "video_type": {
    "name": "TYPE NAME",
    "reason": "One sentence: why this type fits their situation specifically. Be direct. No fluff."
  },
  "script": {
    "title": "What this script/structure is for",
    "content": "The actual script or question prompts, written in llyll's voice. If it's a multi-contributor video, give each contributor a short prompt or question they answer on camera — not a full script to read, but a real direction. If it's a single-voice intro or explainer, write it out. Max 150 words total. Short enough to record in one take without a teleprompter. Sound like a human, not a deck."
  },
  "contributors": {
    "people": [
      {
        "role": "Who this is, specific to their situation (e.g. 'Attendee from last month's meetup', 'Co-organizer', 'Keynote speaker')",
        "count": 2,
        "prompt": "The one-line direction this specific person answers on camera. Max 20 words."
      }
    ]
  },
  "invite": {
    "content": "A short copy-paste message the user sends to invite contributors. Warm, specific to their situation, under 80 words. Tells the contributor exactly what they'll need to record and how long it'll take. No corporate sign-offs."
  }
}

Important rules:
- Pick ONE video type. Don't hedge.
- Scripts must be specific to their situation. No generic "tell us about yourself." Make it real.
- Contributors: 2-4 distinct roles, 3-6 people total. llyll videos are multi-voice — only suggest a single contributor if the situation truly demands it (e.g. a solo speaker briefing). Counts must be realistic for their situation.
- Contributor invites should mention the specific event/community by name if given, and be honest about the ask (it's a short video, here's your prompt).
- If the situation is ambiguous, make a call and briefly say why.
- Return only valid JSON. No preamble, no explanation outside the JSON.`;

export const maxDuration = 60;

function buildMessages(situation, previous, refinement) {
  const messages = [{ role: "user", content: situation }];
  if (previous && refinement) {
    messages.push({ role: "assistant", content: JSON.stringify(previous) });
    messages.push({
      role: "user",
      content: `Refine the plan: ${refinement}. Return the full updated JSON in the same format.`,
    });
  }
  // Prefilling the assistant turn with "{" forces the response to start
  // as raw JSON — no preamble, no markdown fences.
  messages.push({ role: "assistant", content: "{" });
  return messages;
}

async function callAnthropic(messages) {
  return fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      stream: true,
      system: SYSTEM_PROMPT,
      messages,
    }),
  });
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const situation = body.situation?.trim();
  if (!situation) {
    return Response.json({ error: "No situation provided" }, { status: 400 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: "Server is missing its API key." }, { status: 500 });
  }

  const messages = buildMessages(situation, body.previous, body.refinement?.trim());

  let upstream;
  try {
    upstream = await callAnthropic(messages);

    // Retry once if the API is momentarily overloaded or rate-limited.
    if (upstream.status === 429 || upstream.status === 529) {
      await new Promise(r => setTimeout(r, 1500));
      upstream = await callAnthropic(messages);
    }
  } catch {
    return Response.json({ error: "Couldn't reach the AI service. Try again." }, { status: 502 });
  }

  if (!upstream.ok) {
    const status = upstream.status;
    const errBody = await upstream.text().catch(() => "");
    console.error("Anthropic API error", status, errBody);
    const message =
      status === 429 || status === 529
        ? "The AI is busy right now. Wait a few seconds and try again."
        : status === 401
          ? "Server API key is invalid."
          : "The AI service returned an error. Try again.";
    return Response.json({ error: message }, { status: status === 429 ? 429 : 502 });
  }

  // Pipe Anthropic's SSE stream through as plain text deltas.
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const upstreamBody = upstream.body;

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode("{")); // re-attach the prefill
      const reader = upstreamBody.getReader();
      let buffer = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop();
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const event = JSON.parse(line.slice(6));
              if (event.type === "content_block_delta" && event.delta?.text) {
                controller.enqueue(encoder.encode(event.delta.text));
              }
            } catch {
              // ignore malformed SSE lines
            }
          }
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" },
  });
}
