import dotenv from "dotenv";
dotenv.config();

import axios from "axios";

const BASE_URL = process.env.OSPREY_BASE_URL;
const TOKEN = process.env.OSPREY_TOKEN;
const COMPANY_ID = process.env.OSPREY_COMPANY_ID;

// 🔴 toggle this OFF in production
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

  // employee → only self
  if (role === "employee") {
    users = users.filter((u) => u.id == user_id);
  }

  // manager → employees under manager
  else if (role === "manager") {
    users = users.filter((u) => u.manager_id == user_id);
  }

  // admin → all company users
  else if (role === "admin") {
    users = users.filter((u) => u.company_id == company_id);
  }

  console.log(`Fetched Users for role=${role}:`, users);
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
 * Mock survey answers (TEMP)
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
 * MAIN METRICS FUNCTION
 */
export async function computePhase2Metrics({
  role,
  company_id,
  user_id,
}) {
  const users = await fetchUsers(role, company_id, user_id);

  if (!users.length) {
    return {
      message: "No users found for this role",
    };
  }

  const userIds = users.map((u) => u.id);
  let answers = await fetchAnswers(userIds);

  // 🔥 FALLBACK MOCK DATA
  if ((!answers.length || !answers.some(a => a.sentiment_score)) && ENABLE_MOCK_DATA) {
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
      metrics: {
        avgSentiment: 0,
        burnoutProbability: 0,
        highBurnoutCount: 0,
        participationRate: 0,
        message: "No valid sentiment scores",
      },
      totalUsers: users.length,
      totalAnswers: answers.length,
    };
  }

  const avgSentiment =
    scores.reduce((s, v) => s + v, 0) / scores.length;

  const burnoutScores = scores.map((s) => Math.max(0, 1 - s));

  return {
    role,
    company_id,
    metrics: {
      avgSentiment: +(avgSentiment * 10).toFixed(2),
      burnoutProbability: +(
        burnoutScores.reduce((s, v) => s + v, 0) /
        burnoutScores.length
      ).toFixed(2),
      highBurnoutCount: burnoutScores.filter((b) => b > 0.7).length,
      participationRate: Math.round(
        (scores.length / (userIds.length || 1)) * 100
      ),
    },
    totalUsers: users.length,
    totalAnswers: answers.length,
  };
}
