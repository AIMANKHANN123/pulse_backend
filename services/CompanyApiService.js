import axios from "axios";

const API_BASE = "https://pulse-survey.ospreyibs.com/api/v1";

export const fetchUserBasicIndex = async (token, companyId = 4) => {
  return axios.get(`${API_BASE}/user/basic-index`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Company-Id": companyId,
      Accept: "application/json",
    },
  });
};
