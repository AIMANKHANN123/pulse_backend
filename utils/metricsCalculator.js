export const calculateMetrics = (answers = []) => {
  const total = answers.length;

  if (!total) {
    return {
      ohi: 0,
      engagement: 0,
      burnout: 0,
      enps: 0,
      participation: 0,
    };
  }

  const avg = (key) =>
    answers.reduce((s, a) => s + Number(a[key] || 0), 0) / total;

  return {
    ohi: +avg("ohi").toFixed(2),
    engagement: +avg("engagement").toFixed(2),
    burnout: +avg("burnout").toFixed(2),
    enps: +avg("enps").toFixed(2),
    participation: Math.round(
      (answers.filter((a) => a.participated).length / total) * 100
    ),
  };
};
