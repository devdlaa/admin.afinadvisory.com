export async function assignLeadPoints(
  prisma,
  leadId,
  ownerId,
  closedByUserId,
) {
  // 1. Clear old scores
  await prisma.leadUserScore.deleteMany({
    where: { lead_id: leadId },
  });

  // 2. Get activity counts per user
  const activities = await prisma.leadActivity.groupBy({
    by: ["created_by"],
    where: {
      lead_id: leadId,
      deleted_at: null,
    },
    _count: { id: true },
  });

  const totalActivities = activities.reduce((sum, a) => sum + a._count.id, 0);

  const userScores = new Map();

  // 3. Effort points (based on activity share)
  for (const a of activities) {
    userScores.set(a.created_by, {
      effort: totalActivities ? (a._count.id / totalActivities) * 60 : 0,
      closure: 0,
      ownership: 0,
    });
  }

  // 4. Closure points (even if no activity)
  if (closedByUserId) {
    const s = userScores.get(closedByUserId) || {
      effort: 0,
      closure: 0,
      ownership: 0,
    };

    s.closure += 30;
    userScores.set(closedByUserId, s);
  }

  // 5. Ownership points (even if no activity)
  if (ownerId) {
    const s = userScores.get(ownerId) || {
      effort: 0,
      closure: 0,
      ownership: 0,
    };

    s.ownership += 10;
    userScores.set(ownerId, s);
  }

  // 6. Build final data
  const data = [];

  for (const [userId, s] of userScores.entries()) {
    const total_points = s.effort + s.closure + s.ownership;

    // skip zero-score users (optional safety)
    if (total_points === 0) continue;

    data.push({
      lead_id: leadId,
      user_id: userId,
      effort_points: Number(s.effort.toFixed(2)),
      closure_points: Number(s.closure.toFixed(2)),
      ownership_points: Number(s.ownership.toFixed(2)),
      total_points: Number(total_points.toFixed(2)),
    });
  }

  // 7. Insert if any data exists
  if (data.length) {
    await prisma.leadUserScore.createMany({ data });
  }

  return data;
}
