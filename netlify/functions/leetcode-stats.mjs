const USERNAME = "AidenGotit";

const QUERY = `
  query profile($username: String!) {
    allQuestionsCount { difficulty count }
    matchedUser(username: $username) {
      username
      submitStatsGlobal { acSubmissionNum { difficulty count } }
      userCalendar { streak totalActiveDays submissionCalendar }
      languageProblemCount { languageName problemsSolved }
      badges { displayName }
    }
    recentAcSubmissionList(username: $username, limit: 6) { title titleSlug timestamp }
  }
`;

const toCounts = (rows = []) =>
  Object.fromEntries(rows.map(({ difficulty, count }) => [difficulty.toLowerCase(), count]));

export default async (req) => {
  if (req.method !== "GET") {
    return new Response("Method not allowed", { status: 405, headers: { Allow: "GET" } });
  }

  try {
    const response = await fetch("https://leetcode.com/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Referer: `https://leetcode.com/u/${USERNAME}/`,
        "User-Agent": "Mozilla/5.0 (portfolio stats)",
      },
      body: JSON.stringify({ query: QUERY, variables: { username: USERNAME } }),
    });

    if (!response.ok) throw new Error(`LeetCode responded ${response.status}`);

    const { data } = await response.json();
    const user = data?.matchedUser;
    if (!user) throw new Error("LeetCode user not found");

    const stats = {
      username: user.username,
      solved: toCounts(user.submitStatsGlobal?.acSubmissionNum),
      total: toCounts(data.allQuestionsCount),
      activeDays: user.userCalendar?.totalActiveDays ?? 0,
      maxStreak: user.userCalendar?.streak ?? 0,
      calendar: JSON.parse(user.userCalendar?.submissionCalendar || "{}"),
      languages: (user.languageProblemCount || [])
        .sort((a, b) => b.problemsSolved - a.problemsSolved)
        .map(({ languageName, problemsSolved }) => ({ name: languageName, solved: problemsSolved })),
      badges: (user.badges || []).map(({ displayName }) => displayName),
      recent: (data.recentAcSubmissionList || []).map(({ title, titleSlug, timestamp }) => ({
        title,
        slug: titleSlug,
        timestamp: Number(timestamp),
      })),
      fetchedAt: new Date().toISOString(),
    };

    return Response.json(stats, {
      headers: {
        // Browsers always revalidate; Netlify's CDN keeps a copy for 6 hours.
        "Cache-Control": "public, max-age=0, must-revalidate",
        "Netlify-CDN-Cache-Control": "public, durable, s-maxage=21600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    return Response.json(
      { error: "LeetCode stats unavailable" },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
};

export const config = {
  path: "/api/leetcode",
};
