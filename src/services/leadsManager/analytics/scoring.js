export async function assignLeadPoints(
  prisma,
  leadId,
  ownerId,
  closedByUserId,
) {
  await prisma.leadUserScore.deleteMany({
    where: { lead_id: leadId },
  });

  const activities = await prisma.leadActivity.groupBy({
    by: ["created_by"],
    where: {
      lead_id: leadId,
      deleted_at: null,
    },
    _count: { id: true },
  });

  if (!activities.length) return;

  const total = activities.reduce((sum, a) => sum + a._count.id, 0);

  const userScores = new Map();

  for (const a of activities) {
    userScores.set(a.created_by, {
      effort: total ? (a._count.id / total) * 60 : 0,
      closure: 0,
      ownership: 0,
    });
  }

  if (closedByUserId) {
    const s = userScores.get(closedByUserId) || {
      effort: 0,
      closure: 0,
      ownership: 0,
    };
    s.closure += 30;
    userScores.set(closedByUserId, s);
  }

  if (ownerId) {
    const s = userScores.get(ownerId) || {
      effort: 0,
      closure: 0,
      ownership: 0,
    };
    s.ownership += 10;
    userScores.set(ownerId, s);
  }

  const data = [];

  for (const [userId, s] of userScores.entries()) {
    data.push({
      lead_id: leadId,
      user_id: userId,
      effort_points: s.effort,
      closure_points: s.closure,
      ownership_points: s.ownership,
      total_points: s.effort + s.closure + s.ownership,
    });
  }

  if (data.length) {
    await prisma.leadUserScore.createMany({ data });
  }
}
