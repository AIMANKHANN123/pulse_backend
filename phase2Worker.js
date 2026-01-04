import dotenv from "dotenv";
dotenv.config();

import axios from "axios";

const BASE_URL = process.env.OSPREY_BASE_URL;
const TOKEN = process.env.OSPREY_TOKEN;
const COMPANY_ID = process.env.OSPREY_COMPANY_ID;

// 🔴 toggle OFF in production
const ENABLE_MOCK_DATA = true;

/**
 * Axios client
 */
const axiosClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    Authorization: `Bearer ${TOKEN}`,
    "Company-Id": COMPANY_ID,
    Accept: "application/json",
  },
});

/**
 * Fetch users by role
 */
async function fetchUsers(role, company_id, user_id) {
  const res = await axiosClient.get("/user/basic-index");
  let users = res.data?.data || [];

  if (role === "employee") {
    users = users.filter((u) => u.id == user_id);
  } else if (role === "manager") {
    users = users.filter((u) => u.manager_id == user_id);
  } else if (role === "admin") {
    users = users.filter((u) => u.company_id == company_id);
  }

  console.log(`Fetched users (${role}):`, users.length);
  return users;
}

/**
 * Fetch answers for users
 */
async function fetchAnswers(userIds) {
  const allAnswers = [];

  for (const id of userIds) {
    try {
      const res = await axiosClient.get(
        `/pulse-survey-answers/index/${id}`
      );
      const data = res.data?.data || [];
      if (Array.isArray(data)) {
        allAnswers.push(...data);
      }
    } catch (err) {
      console.warn(`No answers for user ${id}`);
    }
  }

  return allAnswers;
}

/**
 * Mock answers (fallback)
 */
function generateMockAnswers(userCount) {
  const mock = [];

  for (let i = 0; i < userCount * 3; i++) {
    mock.push({
      sentiment_score: +(Math.random().toFixed(2)), // 0–1
    });
  }

  return mock;
}

/**
 * Generate weekly trend
 */
function generateTrend(avg) {
  return [
    { week: "W1", sentiment: +(avg + 1.2).toFixed(2), engagement: 6.8, burnout: 12 },
    { week: "W2", sentiment: +(avg + 0.8).toFixed(2), engagement: 6.5, burnout: 14 },
    { week: "W3", sentiment: +(avg + 0.4).toFixed(2), engagement: 6.1, burnout: 16 },
    { week: "W4", sentiment: +avg.toFixed(2), engagement: 5.9, burnout: 115 },
  ];
}

/**
 * MAIN FUNCTION
 */
export async function computePhase2Metrics({
  role,
  company_id,
  user_id,
}) {
  const users = await fetchUsers(role, company_id, user_id);

  if (!users.length) {
    return { message: "No users found for this role" };
  }

  const userIds = users.map((u) => u.id);
  let answers = await fetchAnswers(userIds);

  if (
    (!answers.length ||
      !answers.some((a) => a.sentiment_score !== undefined)) &&
    ENABLE_MOCK_DATA
  ) {
    console.warn("Using MOCK survey data");
    answers = generateMockAnswers(users.length);
  }

  const scores = answers
    .map((a) => Number(a.sentiment_score))
    .filter((s) => !isNaN(s));

  if (!scores.length) {
    return {
      role,
      company_id,
      message: "No valid sentiment scores",
    };
  }

  const avgSentiment =
    scores.reduce((s, v) => s + v, 0) / scores.length;

  const avgScaled = +(avgSentiment * 10).toFixed(2);
  const burnoutScores = scores.map((s) => Math.max(0, 1 - s));
  const burnoutRiskCount = burnoutScores.filter((b) => b > 0.7).length;
  const participationRate = Math.round(
    (scores.length / (userIds.length || 1)) * 100
  );

  let dashboard = {};

  /* ================= ADMIN ================= */
  if (role === "admin") {
    dashboard = {
      role,
      company_id,
      summary: {
        totalEmployees: users.length,
        totalResponses: answers.length,
        participationRate,
      },
      cards: [
        {
          key: "sentiment",
          name: "Avg Sentiment",
          value: avgScaled,
          direction: "down",
          progress: 48,
          status: avgScaled < 5 ? "amber" : "green",
        },
        {
          key: "burnout",
          name: "Burnout Risk",
          value: `${burnoutRiskCount} Employees`,
          direction: "up",
          progress: burnoutRiskCount * 5,
          status: burnoutRiskCount > 5 ? "red" : "amber",
        },
        {
          key: "participation",
          name: "Participation Rate",
          value: `${participationRate}%`,
          direction: "up",
          progress: participationRate,
          status: "green",
        },
        {
          key: "enps",
          name: "eNPS Score",
          value: "+32",
          direction: "up",
          progress: 70,
          status: "blue",
        },
      ],
      trendChart: generateTrend(avgScaled),
      alerts:
        burnoutRiskCount > 5
          ? [
              {
                severity: "critical",
                title: "Burnout risk increasing",
                description:
                  "Burnout indicators increased over the last few weeks",
                impact: `${burnoutRiskCount} employees at high risk`,
                recommendation:
                  "Reduce workload and review sprint scope",
              },
            ]
          : [],
    };
  }

  /* ================= MANAGER ================= */
  if (role === "manager") {
    dashboard = {
      role,
      teamSummary: {
        teamSize: users.length,
        responses: answers.length,
        participationRate,
      },
      cards: [
        {
          name: "Team Sentiment",
          value: avgScaled,
          status: avgScaled < 5 ? "amber" : "green",
        },
        {
          name: "High Burnout Employees",
          value: burnoutRiskCount,
          status: burnoutRiskCount > 2 ? "red" : "green",
        },
      ],
      teamTrend: generateTrend(avgScaled),
      recommendations:
        burnoutRiskCount > 2
          ? [
              "Schedule 1-on-1 meetings",
              "Balance workload across team",
            ]
          : ["Team wellbeing looks stable"],
    };
  }

  /* ================= EMPLOYEE ================= */
  if (role === "employee") {
    const selfScore = scores[0] || avgSentiment;

    dashboard = {
      role,
      personalSummary: {
        sentimentScore: +(selfScore * 10).toFixed(2),
        burnoutProbability: +(1 - selfScore).toFixed(2),
        participation: answers.length ? "Completed" : "Pending",
      },
      insights: [
        selfScore < 0.5
          ? "Your stress indicators are high"
          : "Your wellbeing looks stable",
      ],
      tips:
        selfScore < 0.5
          ? [
              "Take regular breaks",
              "Talk to your manager",
              "Avoid overtime this week",
            ]
          : [
              "Keep up the good work",
              "Maintain work-life balance",
            ],
    };
  }

  return dashboard;
}
