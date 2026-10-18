// Reasoning for Ask, without a generative model: the dots PolInt's storylines
// already connect (scripts/intelligence/storylines.py), read for the passages
// an answer found. Every line is a fixed sentence filled from that data: how
// widely the story was reported, the move it records (actor, action, likely
// aim), the storyline it belongs to (who drives it, the chain of moves, any
// back-and-forth, its momentum, what usually comes next) and the actor's
// current posture and most frequent dealings. Nothing is generated, so a line
// can be wrong only where the storyline rules are; each says what it rests on.

const ACTIONS = {
  ta: {
    litigate: "நீதிமன்றத்தை நாடினார்", legal_hit: "சட்ட நடவடிக்கை", legal_relief: "சட்ட நிவாரணம்", purge: "எதிராளிகளை நீக்கினார்",
    defect: "அணி மாறினார்", alliance: "கூட்டணி நகர்வு", rebut: "மறுப்பு தெரிவித்தார்", attack: "தாக்கிப் பேசினார்",
    protest: "போராட்டம்", demand: "கோரிக்கை வைத்தார்", outreach: "நல்லெண்ண அணுகல்", resign: "ராஜினாமா",
    deliver: "திட்டத்தை நிறைவேற்றினார்", promise: "வாக்குறுதி அளித்தார்", campaign: "பிரச்சாரம்", organise: "கட்சிக் கட்டமைப்பு", meet: "சந்திப்பு",
  },
};

const OBJECTIVES = {
  ta: {
    offence: "தாக்குதல் நிலை", defence: "சேதக் கட்டுப்பாடு", governance: "ஆட்சியும் பெருமை கோரலும்", mobilisation: "ஆதரவு திரட்டல்",
    coalition: "கூட்டணி அமைத்தல்", realignment: "அணி மாற்றம்", legal: "சட்ட நெருக்கடி", organisation: "கட்சியை வலுப்படுத்தல்",
    pressure: "அழுத்தம் கொடுத்தல்", goodwill: "நல்லெண்ணம் வளர்த்தல்",
  },
  en: {
    offence: "on the offensive", defence: "damage control", governance: "governing and claiming credit", mobilisation: "mobilising support",
    coalition: "coalition building", realignment: "realignment", legal: "legal exposure", organisation: "building the party",
    pressure: "applying pressure", goodwill: "building goodwill",
  },
};

const INTENTS_TA = {
  "Build a winning coalition": "வெற்றிக் கூட்டணி அமைத்தல்",
  "Build public goodwill": "மக்கள் நல்லெண்ணம் பெறுதல்",
  "Claim credit for local work": "உள்ளூர்ப் பணிக்குப் பெருமை கோருதல்",
  "Commit the government publicly": "அரசைப் பகிரங்கமாக உறுதியளிக்க வைத்தல்",
  "Consult and coordinate": "கலந்தாலோசித்து ஒருங்கிணைத்தல்",
  "Contain damage and reframe the charge": "சேதத்தைக் கட்டுப்படுத்தி குற்றச்சாட்டை மாற்றிச் சித்தரித்தல்",
  "Deliver and claim credit": "நிறைவேற்றிப் பெருமை கோருதல்",
  "Discredit a rival": "எதிராளியின் நம்பகத்தன்மையைக் குறைத்தல்",
  "Discredit the government's critics": "அரசின் விமர்சகர்களைக் குறைத்து மதிப்பிடுதல்",
  "Engage the Centre directly": "மத்திய அரசுடன் நேரடியாகப் பேசுதல்",
  "Erode the ruling party's standing": "ஆளுங்கட்சியின் செல்வாக்கைக் குறைத்தல்",
  "Fight for control inside their own camp": "சொந்த அணிக்குள் கட்டுப்பாட்டுக்குப் போராடுதல்",
  "Hold the government to account": "அரசைப் பொறுப்பேற்க வைத்தல்",
  "Lay electoral groundwork": "தேர்தலுக்கு அடித்தளம் அமைத்தல்",
  "Mobilise the base against the government": "அடிமட்டத் தொண்டர்களை அரசுக்கு எதிராகத் திரட்டுதல்",
  "Position against the BJP and the Centre": "பாஜக மற்றும் மத்திய அரசுக்கு எதிரான நிலைப்பாடு",
  "Press the Centre on Tamil Nadu's behalf": "தமிழ்நாட்டுக்காக மத்திய அரசை வலியுறுத்துதல்",
  "Pressure the Centre through the street": "வீதிப் போராட்டத்தால் மத்திய அரசுக்கு அழுத்தம்",
  "Purge dissent and consolidate control": "எதிர்ப்பாளர்களை நீக்கிக் கட்டுப்பாட்டை உறுதிப்படுத்தல்",
  "Push a demand through official channels": "அதிகாரபூர்வ வழியில் கோரிக்கையை முன்னெடுத்தல்",
  "Put an issue on the agenda": "ஒரு பிரச்சினையை விவாதத்துக்குக் கொண்டுவருதல்",
  "Rally Tamil Nadu against the Centre": "மத்திய அரசுக்கு எதிராகத் தமிழ்நாட்டைத் திரட்டுதல்",
  "Rally their own ranks": "சொந்தத் தொண்டர்களைத் திரட்டுதல்",
  "Realign for better prospects": "சிறந்த வாய்ப்புக்காக அணி மாறுதல்",
  "Set the agenda for the government": "அரசின் செயல்திட்டத்தை வகுத்தல்",
  "Show street strength": "வீதி பலத்தைக் காட்டுதல்",
  "Show the Centre's hand in Tamil Nadu": "தமிழ்நாட்டில் மத்திய அரசின் பங்கைக் காட்டுதல்",
  "Signal a possible alignment": "சாத்தியமான கூட்டணிக்குச் சமிக்ஞை",
  "Step back under pressure or reposition": "அழுத்தத்தில் பின்வாங்குதல் அல்லது நிலை மாற்றுதல்",
  "Tighten control of the party machine": "கட்சி இயந்திரத்தின் மீது பிடியை இறுக்குதல்",
  "Under legal pressure": "சட்ட அழுத்தத்தில்",
  "Use the courts to pin down a rival": "நீதிமன்றம் மூலம் எதிராளியை முடக்குதல்",
  "Win legal breathing room": "சட்ட ரீதியான அவகாசம் பெறுதல்",
  "Win voters with promises": "வாக்குறுதிகளால் வாக்காளர்களைக் கவர்தல்",
};

// What usually follows each kind of move (storylines.py _NEXT_MOVES).
const NEXT_TA = {
  litigate: "நீதிமன்றத்தின் பதிலும் எதிர் மனுவும்",
  legal_hit: "ஜாமீன் மனு, நீதிமன்ற விசாரணை அல்லது ஆதரவாளர்களின் போராட்டம்",
  legal_relief: "அரசுத் தரப்பின் மேல்முறையீடு அல்லது மீண்டும் பிரச்சாரம்",
  defect: "அதே அணியிலிருந்து மேலும் விலகல்கள் அல்லது பதிலுக்குச் சேர்க்கை",
  purge: "நீக்கப்பட்ட அணி மீண்டும் ஒன்றுகூடுதல் அல்லது நீதிமன்ற வழக்கு",
  resign: "மாற்று நியமனம், அல்லது ராஜினாமா கட்சி மாற்றமாக மாறுதல்",
  alliance: "தொகுதிப் பங்கீட்டு விவரங்கள் அல்லது எதிர் அணி உருவாதல்",
  rebut: "மறுதரப்பின் புதிய குற்றச்சாட்டு அல்லது ஆவணங்கள்",
  attack: "இலக்கானவரின் பதிலடி",
  protest: "அரசின் பதில், கைதுகள் அல்லது பேச்சுவார்த்தை",
  demand: "அரசின் பதில் அல்லது உத்தரவு",
  deliver: "நிதி அல்லது நிறைவேற்றம் குறித்த எதிர்க்கட்சிக் கேள்விகள்",
  promise: "காலக்கெடு, அல்லது தேர்தல் தந்திரம் என்ற எதிர்க்கட்சி விமர்சனம்",
  campaign: "கூட்டணி மற்றும் வேட்பாளர் அறிவிப்புகள்",
  organise: "ஓரங்கட்டப்பட்ட நிர்வாகிகளின் எதிர்வினை",
  meet: "கூட்டணி அறிவிப்பு அல்லது பேச்சுவார்த்தை மறுப்பு",
  outreach: "தொடர் நிவாரண அறிவிப்புகள்",
};

const MOMENTUM = {
  en: { escalating: "escalating", active: "active", cooling: "cooling" },
  ta: { escalating: "தீவிரமடைகிறது", active: "தொடர்கிறது", cooling: "தணிகிறது" },
};

const dateOf = (value, language) =>
  value ? new Date(value).toLocaleDateString(language === "ta" ? "ta-IN" : "en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" }) : "";

const sides = (step) => new Set([step.actor, step.actor?.replace(/^party:/, ""), step.actorParty].filter(Boolean));
const aimedAt = (from, to) => (from.counterparts || []).some((item) => sides(to).has(item.id.replace(/^@/, "")));

// Titles that open with their own quotation are not wrapped in another.
const quoted = (title) => (/^[“"‘']/.test(title) ? title : `"${title}"`);

const actionText = (step, language) => (language === "ta" ? ACTIONS.ta[step.action] : step.actionLabel?.toLowerCase()) || step.action;
const intentText = (intent, language) => (language === "ta" ? INTENTS_TA[intent] || intent : intent);
const objectiveText = (objective, language) => OBJECTIVES[language]?.[objective] || OBJECTIVES.en[objective] || objective;

// The facts behind the reasoning, gathered once from the answer's passages.
export const gatherConnections = (quotes, storylines) => {
  if (!quotes?.length) return null;
  const outlets = new Set(quotes.flatMap((quote) => [quote.source, ...(quote.corroboratedBy || [])]));
  const first = [...quotes].sort((a, b) => a.publishedAt.localeCompare(b.publishedAt))[0];
  const moves = storylines?.storyMoves || {};
  const moved = quotes.map((quote) => moves[quote.storyId] && { ...moves[quote.storyId], storyId: quote.storyId }).filter(Boolean);
  // A move the storyline rules read with low confidence is left out rather than stated.
  const move = moved.find((item) => item.confidence !== "low") || null;
  const threads = storylines?.threads || [];
  const threadIds = moved.map((item) => item.threadId).filter(Boolean);
  const byStory = new Set(quotes.map((quote) => quote.storyId));
  const thread = threads.find((item) => threadIds.includes(item.id))
    || threads.find((item) => item.steps?.some((step) => byStory.has(step.storyId)))
    || null;
  const person = move && storylines?.people?.[move.actor];
  const relation = move && (storylines?.relations || []).find((item) => item.from === move.actor || item.to === move.actor);
  return { outlets: outlets.size, first, move, thread, person, relation, windowDays: storylines?.windowDays };
};

// The reasoning as sentences in the reader's language.
export const connectionLines = (facts, language = "en") => {
  if (!facts) return [];
  const ta = language === "ta";
  const lines = [];
  const { outlets, first, move, thread, person, relation, windowDays } = facts;
  lines.push(ta
    ? `${outlets} நம்பகமான ஊடகங்கள் இதை வெளியிட்டன; முதலில் ${first.source} (${dateOf(first.publishedAt, language)}).`
    : `${outlets} trusted ${outlets === 1 ? "outlet" : "outlets"} reported this; ${first.source} was first (${dateOf(first.publishedAt, language)}).`);
  if (move) {
    lines.push(ta
      ? `நகர்வு: ${move.actorName} — ${actionText(move, language)}. நோக்கம்: ${intentText(move.intent, language)}${move.confidence === "low" ? " (உறுதி குறைவு)" : ""}.`
      : `The move: ${move.actorName} ${actionText(move, language)}, likely to ${move.intent.charAt(0).toLowerCase()}${move.intent.slice(1)}${move.confidence === "low" ? " (low confidence)" : ""}.`);
  }
  if (thread) {
    const steps = thread.steps || [];
    const counts = new Map();
    steps.forEach((step) => counts.set(step.actorName, (counts.get(step.actorName) || 0) + 1));
    const [lead, leadMoves] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0] || [];
    lines.push(ta
      ? `இது ${quoted(thread.title)} என்ற தொடரின் பகுதி: ${dateOf(thread.startedAt, language)} முதல் ${thread.stepCount} நகர்வுகள்; நிலை: ${MOMENTUM.ta[thread.momentum] || thread.momentum}.`
      : `Part of the storyline ${quoted(thread.title)}: ${thread.stepCount} moves since ${dateOf(thread.startedAt, language)}, now ${MOMENTUM.en[thread.momentum] || thread.momentum}.`);
    if (lead) {
      // The file keeps only a storyline's latest steps; say so when the counts differ.
      const of = steps.length < thread.stepCount
        ? (ta ? `அண்மைய ${steps.length} நகர்வுகளில் ${leadMoves}` : `${leadMoves} of the latest ${steps.length} moves`)
        : (ta ? `${steps.length}-இல் ${leadMoves} நகர்வுகள்` : `${leadMoves} of ${steps.length} moves`);
      lines.push(ta ? `இந்தத் தொடரை முன்னெடுப்பவர் ${lead} (${of}).` : `${lead} drives it (${of}).`);
    }
    const chain = [];
    for (const step of steps.slice(-6)) {
      if (chain.at(-1)?.actorName !== step.actorName || chain.at(-1)?.action !== step.action) chain.push(step);
    }
    if (chain.length > 1) {
      const links = chain.slice(-4).map((step) => `${step.actorName} ${actionText(step, language)} (${dateOf(step.date, language)})`);
      lines.push(ta ? `அண்மைய வரிசை: ${links.join(" → ")}.` : `Latest chain: ${links.join(" → ")}.`);
    }
    for (let index = steps.length - 1; index > 0; index -= 1) {
      const previous = steps[index - 1];
      const current = steps[index];
      // A reply is aimed back at the earlier actor (or their party), or rebuts a move aimed at the replier;
      // two attacks on the same third party are not an exchange.
      const answered = aimedAt(current, previous) || (current.action === "rebut" && aimedAt(previous, current));
      // A reply from the same party is not an exchange (Stalin and the DMK are one side).
      const sameSide = previous.actorParty && previous.actorParty === current.actorParty;
      if (previous.actor !== current.actor && !sameSide && answered && ["attack", "protest", "demand", "legal_hit"].includes(previous.action)) {
        lines.push(ta
          ? `பதிலுக்குப் பதில்: ${previous.actorName} ${actionText(previous, language)}; ${current.actorName} பதிலளித்தார்.`
          : `A back-and-forth: ${previous.actorName} ${actionText(previous, language)} and ${current.actorName} answered.`);
        break;
      }
    }
    const firstObjective = steps[0]?.objective;
    const lastObjective = steps.at(-1)?.objective;
    if (firstObjective && lastObjective && firstObjective !== lastObjective) {
      lines.push(ta
        ? `நோக்கம் மாறியுள்ளது: ${objectiveText(firstObjective, language)} → ${objectiveText(lastObjective, language)}.`
        : `Its aim has shifted from ${objectiveText(firstObjective, language)} to ${objectiveText(lastObjective, language)}.`);
    }
    const nextAction = steps.at(-1)?.action;
    if (thread.watchFor) {
      lines.push(ta ? `அடுத்து கவனிக்க: ${NEXT_TA[nextAction] || thread.watchFor}.` : `Watch for ${thread.watchFor}.`);
    }
  }
  if (person?.postureLabel) {
    const shift = person.shift && person.shift.from !== person.shift.to
      ? (ta ? ` (${objectiveText(person.shift.from, language)} → ${objectiveText(person.shift.to, language)})` : ` (shifted from ${objectiveText(person.shift.from, language)} to ${objectiveText(person.shift.to, language)})`)
      : "";
    lines.push(ta
      ? `${person.name}-இன் தற்போதைய நிலை: ${objectiveText(person.posture, language)}${shift}; ${person.moveCount} நகர்வுகள்.`
      : `${person.name} is currently ${objectiveText(person.posture, language)}${shift}, across ${person.moveCount} moves.`);
  }
  if (relation) {
    lines.push(ta
      ? `அடிக்கடி நடப்பது: ${relation.fromName} → ${relation.toName}, ${ACTIONS.ta[relation.action] || relation.label} (${windowDays || 45} நாட்களில் ${relation.count} முறை).`
      : `Most frequent: ${relation.fromName} ${relation.label.toLowerCase()} ${relation.toName} (${relation.count} times in ${windowDays || 45} days).`);
  }
  return lines;
};
