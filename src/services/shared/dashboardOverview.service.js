import { PrismaClient } from "@prisma/client";
import { NotFoundError } from "../../utils/server/errors.js";

const prisma = new PrismaClient();

const OPEN_STATUSES = [
  "PENDING",
  "IN_PROGRESS",
  "ON_HOLD",
  "PENDING_CLIENT_INPUT",
];

const SUPERADMIN_ROLE = "SUPERADMIN";

/**
 * Main service - returns dashboard overview based on user role
 */
export const getDashboardOverview = async (user_id) => {
  const user = await prisma.adminUser.findUnique({
    where: { id: user_id },
    select: { id: true, name: true },
  });

  if (!user) {
    throw new NotFoundError("User not found");
  }

  const roles = await prisma.adminUserRole.findMany({
    where: { admin_user_id: user_id },
    include: { role: true },
  });

  const roleNames = roles.map((r) => r.role.name);
  const isSuperAdmin = roleNames.includes(SUPERADMIN_ROLE);

  if (isSuperAdmin) {
    return getSuperAdminOverview();
  } else {
    return getEmployeeOverview(user_id);
  }
};

/* -------------------------------------------------------------------------- */
/*                          SUPER ADMIN DASHBOARD                             */
/* -------------------------------------------------------------------------- */

const getSuperAdminOverview = async () => {
  const [
    taskSnapshot,
    complianceSnapshot,
    workloadSnapshot,
    entitySnapshot,
    registrationSnapshot,
    recentActivity,
    taskSourceStats,
    alerts,
  ] = await Promise.all([
    buildTaskSnapshotSuperAdmin(),
    buildComplianceSnapshotSuperAdmin(),
    buildWorkloadSnapshotSuperAdmin(),
    buildEntitySnapshotSuperAdmin(),
    buildRegistrationSnapshotSuperAdmin(),
    buildRecentActivitySuperAdmin(),
    buildTaskSourceStats(),
    buildAlertsAndExceptionsSuperAdmin(),
  ]);

  return {
    role_view: "SUPERADMIN",
    task_snapshot: taskSnapshot,
    compliance_snapshot: complianceSnapshot,
    workload_snapshot: workloadSnapshot,
    entity_snapshot: entitySnapshot,
    registration_snapshot: registrationSnapshot,
    recent_activity: recentActivity,
    task_source_stats: taskSourceStats,
    alerts_and_exceptions: alerts,
  };
};

/* -------------------------------------------------------------------------- */
/*                           EMPLOYEE DASHBOARD                               */
/* -------------------------------------------------------------------------- */

const getEmployeeOverview = async (user_id) => {
  const [
    taskSnapshot,
    complianceSnapshot,
    recentActivity,
    alerts,
    taskSourceStats,
  ] = await Promise.all([
    buildTaskSnapshotEmployee(user_id),
    buildComplianceSnapshotEmployee(user_id),
    buildRecentActivityEmployee(user_id),
    buildAlertsAndExceptionsEmployee(user_id),
    buildTaskSourceStats(),
  ]);

  return {
    role_view: "EMPLOYEE",
    task_snapshot: taskSnapshot,
    compliance_snapshot: complianceSnapshot,
    recent_activity: recentActivity,
    alerts_and_exceptions: alerts,
    task_source_stats: taskSourceStats,
  };
};

/* -------------------------------------------------------------------------- */
/*                          SHARED QUERY HELPERS                              */
/* -------------------------------------------------------------------------- */

const getToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const getTodayEnd = () => {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
};

const addDays = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
};

const getMonthStart = () => {
  return new Date(new Date().getFullYear(), new Date().getMonth(), 1);
};

const getMonthEnd = () => {
  return new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1);
};

/* -------------------------------------------------------------------------- */
/*                        SUPERADMIN TASK SNAPSHOT                            */
/* -------------------------------------------------------------------------- */

const buildTaskSnapshotSuperAdmin = async () => {
  const [
    totalOpen,
    overdue,
    dueToday,
    dueNext7,
    noDueDate,
    highPriorityOpen,
    highPriorityOverdueList,
    highPriorityDueNext7List,
    noDueDateList,
  ] = await Promise.all([
    prisma.task.count({
      where: { status: { in: OPEN_STATUSES } },
    }),

    prisma.task.count({
      where: {
        status: { in: OPEN_STATUSES },
        due_date: { lt: getToday() },
      },
    }),

    prisma.task.count({
      where: {
        status: { in: OPEN_STATUSES },
        due_date: { gte: getToday(), lte: getTodayEnd() },
      },
    }),

    prisma.task.count({
      where: {
        status: { in: OPEN_STATUSES },
        due_date: { gte: getToday(), lte: addDays(7) },
      },
    }),

    prisma.task.count({
      where: {
        status: { in: OPEN_STATUSES },
        due_date: null,
      },
    }),

    prisma.task.count({
      where: {
        status: { in: OPEN_STATUSES },
        priority: "HIGH",
      },
    }),

    prisma.task.findMany({
      where: {
        status: { in: OPEN_STATUSES },
        priority: "HIGH",
        due_date: { lt: getToday() },
      },
      orderBy: { due_date: "asc" },
      take: 10,
      select: {
        id: true,
        title: true,
        due_date: true,
        status: true,
        priority: true,
        entity: { select: { name: true, pan: true } },
      },
    }),

    prisma.task.findMany({
      where: {
        status: { in: OPEN_STATUSES },
        priority: "HIGH",
        due_date: { gte: getToday(), lte: addDays(7) },
      },
      orderBy: { due_date: "asc" },
      take: 10,
      select: {
        id: true,
        title: true,
        due_date: true,
        status: true,
        priority: true,
        entity: { select: { name: true, pan: true } },
      },
    }),

    prisma.task.findMany({
      where: {
        status: { in: OPEN_STATUSES },
        due_date: null,
      },
      orderBy: { created_at: "asc" },
      take: 10,
      select: {
        id: true,
        title: true,
        created_at: true,
        status: true,
        priority: true,
        entity: { select: { name: true, pan: true } },
      },
    }),
  ]);

  return {
    cards: {
      total_open_tasks: totalOpen,
      overdue_tasks: overdue,
      due_today_tasks: dueToday,
      due_next_7_days: dueNext7,
      tasks_without_due_date: noDueDate,
      high_priority_open_tasks: highPriorityOpen,
    },
    lists: {
      high_priority_overdue_tasks: highPriorityOverdueList,
      high_priority_due_next_7_days: highPriorityDueNext7List,
      tasks_without_due_dates_oldest_first: noDueDateList,
    },
  };
};

/* -------------------------------------------------------------------------- */
/*                        SUPERADMIN COMPLIANCE SNAPSHOT                      */
/* -------------------------------------------------------------------------- */

const buildComplianceSnapshotSuperAdmin = async () => {
  const [
    totalOpen,
    overdue,
    dueToday,
    dueNext7,
    dueThisMonth,
    noDueDate,
    dueTodayList,
    dueThisWeekList,
    dueThisMonthList,
  ] = await Promise.all([
    prisma.task.count({
      where: {
        status: { in: OPEN_STATUSES },
        compliance_rule_id: { not: null },
      },
    }),

    prisma.task.count({
      where: {
        status: { in: OPEN_STATUSES },
        compliance_rule_id: { not: null },
        due_date: { lt: getToday() },
      },
    }),

    prisma.task.count({
      where: {
        status: { in: OPEN_STATUSES },
        compliance_rule_id: { not: null },
        due_date: { gte: getToday(), lte: getTodayEnd() },
      },
    }),

    prisma.task.count({
      where: {
        status: { in: OPEN_STATUSES },
        compliance_rule_id: { not: null },
        due_date: { gte: getToday(), lte: addDays(7) },
      },
    }),

    prisma.task.count({
      where: {
        status: { in: OPEN_STATUSES },
        compliance_rule_id: { not: null },
        due_date: { gte: getMonthStart(), lt: getMonthEnd() },
      },
    }),

    prisma.task.count({
      where: {
        status: { in: OPEN_STATUSES },
        compliance_rule_id: { not: null },
        due_date: null,
      },
    }),

    prisma.task.findMany({
      where: {
        status: { in: OPEN_STATUSES },
        compliance_rule_id: { not: null },
        due_date: { gte: getToday(), lte: getTodayEnd() },
      },
      orderBy: { due_date: "asc" },
      take: 10,
      select: {
        id: true,
        title: true,
        due_date: true,
        status: true,
        entity: { select: { name: true, pan: true } },
      },
    }),

    prisma.task.findMany({
      where: {
        status: { in: OPEN_STATUSES },
        compliance_rule_id: { not: null },
        due_date: { gte: getToday(), lte: addDays(7) },
      },
      orderBy: { due_date: "asc" },
      take: 10,
      select: {
        id: true,
        title: true,
        due_date: true,
        status: true,
        entity: { select: { name: true, pan: true } },
      },
    }),

    prisma.task.findMany({
      where: {
        status: { in: OPEN_STATUSES },
        compliance_rule_id: { not: null },
        due_date: { gte: getToday(), lte: addDays(30) },
      },
      orderBy: { due_date: "asc" },
      take: 10,
      select: {
        id: true,
        title: true,
        due_date: true,
        status: true,
        entity: { select: { name: true, pan: true } },
      },
    }),
  ]);

  return {
    cards: {
      total_open_compliance_tasks: totalOpen,
      overdue_compliance_tasks: overdue,
      compliance_due_today: dueToday,
      compliance_due_next_7_days: dueNext7,
      compliance_due_this_month: dueThisMonth,
      compliance_without_due_date: noDueDate,
    },
    lists: {
      compliances_due_today: dueTodayList,
      compliances_due_this_week: dueThisWeekList,
      compliances_due_this_month: dueThisMonthList,
    },
  };
};

/* -------------------------------------------------------------------------- */
/*                         SUPERADMIN WORKLOAD SNAPSHOT                       */
/* -------------------------------------------------------------------------- */

const buildWorkloadSnapshotSuperAdmin = async () => {
  const employees = await prisma.adminUser.findMany({
    where: { deleted_at: null, status: "ACTIVE" },
    select: { id: true, name: true, email: true, status: true },
  });

  const results = await Promise.all(
    employees.map(async (emp) => {
      const [assigned, overdue, due7, completed7] = await Promise.all([
        prisma.taskAssignment.count({
          where: {
            admin_user_id: emp.id,
            task: { status: { in: OPEN_STATUSES } },
          },
        }),

        prisma.taskAssignment.count({
          where: {
            admin_user_id: emp.id,
            task: {
              status: { in: OPEN_STATUSES },
              due_date: { lt: getToday() },
            },
          },
        }),

        prisma.taskAssignment.count({
          where: {
            admin_user_id: emp.id,
            task: {
              status: { in: OPEN_STATUSES },
              due_date: { gte: getToday(), lte: addDays(7) },
            },
          },
        }),

        prisma.taskAssignment.count({
          where: {
            admin_user_id: emp.id,
            task: {
              status: "COMPLETED",
              updated_at: { gte: addDays(-7) },
            },
          },
        }),
      ]);

      return {
        employee_id: emp.id,
        name: emp.name,
        email: emp.email,
        status: emp.status,
        total_open_assigned_tasks: assigned,
        overdue_tasks: overdue,
        due_next_7_days: due7,
        completed_last_7_days: completed7,
      };
    })
  );

  return results.sort(
    (a, b) => b.total_open_assigned_tasks - a.total_open_assigned_tasks
  );
};

/* -------------------------------------------------------------------------- */
/*                         SUPERADMIN ENTITY SNAPSHOT                         */
/* -------------------------------------------------------------------------- */

const buildEntitySnapshotSuperAdmin = async () => {
  const [total, active, inactive, suspended, retainer, createdThisMonth] =
    await Promise.all([
      prisma.entity.count({ where: { deleted_at: null } }),

      prisma.entity.count({
        where: { status: "ACTIVE", deleted_at: null },
      }),

      prisma.entity.count({
        where: { status: "INACTIVE", deleted_at: null },
      }),

      prisma.entity.count({
        where: { status: "SUSPENDED", deleted_at: null },
      }),

      prisma.entity.count({
        where: { is_retainer: true, status: "ACTIVE", deleted_at: null },
      }),

      prisma.entity.count({
        where: {
          created_at: { gte: getMonthStart() },
          deleted_at: null,
        },
      }),
    ]);

  return {
    cards: {
      total_entities: total,
      active_entities: active,
      inactive_entities: inactive,
      suspended_entities: suspended,
      retainer_entities: retainer,
      entities_created_this_month: createdThisMonth,
    },
  };
};

/* -------------------------------------------------------------------------- */
/*                      SUPERADMIN REGISTRATION SNAPSHOT                      */
/* -------------------------------------------------------------------------- */

const buildRegistrationSnapshotSuperAdmin = async () => {
  const [total, active, inactive, expired, expiringSoon, expiringList] =
    await Promise.all([
      prisma.entityRegistration.count({ where: { deleted_at: null } }),

      prisma.entityRegistration.count({
        where: { status: "ACTIVE", deleted_at: null },
      }),

      prisma.entityRegistration.count({
        where: { status: "INACTIVE", deleted_at: null },
      }),

      prisma.entityRegistration.count({
        where: { status: "EXPIRED", deleted_at: null },
      }),

      prisma.entityRegistration.count({
        where: {
          status: "ACTIVE",
          effective_to: { gte: getToday(), lte: addDays(30) },
          deleted_at: null,
        },
      }),

      prisma.entityRegistration.findMany({
        where: {
          status: "ACTIVE",
          effective_to: { gte: getToday(), lte: addDays(30) },
          deleted_at: null,
        },
        orderBy: { effective_to: "asc" },
        take: 10,
        select: {
          id: true,
          registration_number: true,
          effective_to: true,
          entity: { select: { name: true, pan: true } },
          registrationType: { select: { name: true, code: true } },
        },
      }),
    ]);

  return {
    cards: {
      total_registrations: total,
      active_registrations: active,
      inactive_registrations: inactive,
      expired_registrations: expired,
      expiring_within_30_days: expiringSoon,
    },
    lists: {
      registrations_expiring_soon: expiringList,
    },
  };
};

/* -------------------------------------------------------------------------- */
/*                     SUPERADMIN RECENT ACTIVITY SNAPSHOT                    */
/* -------------------------------------------------------------------------- */

const buildRecentActivitySuperAdmin = async () => {
  const [recentCompliance, recentNonCompliance, recentStatusChanges] =
    await Promise.all([
      prisma.task.findMany({
        where: { compliance_rule_id: { not: null } },
        orderBy: { created_at: "desc" },
        take: 10,
        select: {
          id: true,
          title: true,
          created_at: true,
          due_date: true,
          status: true,
          entity: { select: { name: true } },
        },
      }),

      prisma.task.findMany({
        where: { compliance_rule_id: null },
        orderBy: { created_at: "desc" },
        take: 10,
        select: {
          id: true,
          title: true,
          created_at: true,
          due_date: true,
          status: true,
          entity: { select: { name: true } },
        },
      }),

      prisma.task.findMany({
        where: {
          has_activity: true,
          last_activity_at: { not: null },
        },
        orderBy: { last_activity_at: "desc" },
        take: 10,
        select: {
          id: true,
          title: true,
          status: true,
          last_activity_at: true,
          lastActor: { select: { name: true } },
          entity: { select: { name: true } },
        },
      }),
    ]);

  return {
    recent_compliance_tasks: recentCompliance,
    recent_non_compliance_tasks: recentNonCompliance,
    recent_status_changes: recentStatusChanges,
  };
};

/* -------------------------------------------------------------------------- */
/*                        TASK SOURCE STATS (BOTH ROLES)                      */
/* -------------------------------------------------------------------------- */

const buildTaskSourceStats = async () => {
  const [cron, manual, imported] = await Promise.all([
    prisma.task.count({ where: { task_source: "CRON_SYSTEM_GEN" } }),
    prisma.task.count({ where: { task_source: "MANUALLY" } }),
    prisma.task.count({ where: { task_source: "IMPORT" } }),
  ]);

  return {
    cron_generated_tasks_count: cron,
    manually_created_tasks_count: manual,
    imported_tasks_count: imported,
  };
};

/* -------------------------------------------------------------------------- */
/*                     SUPERADMIN ALERTS AND EXCEPTIONS                       */
/* -------------------------------------------------------------------------- */

const buildAlertsAndExceptionsSuperAdmin = async () => {
  const [
    overdue30,
    highPriorityNoDue,
    withoutAssignee,
    complianceNoDue,
    pendingClientLong,
  ] = await Promise.all([
    prisma.task.findMany({
      where: {
        status: { in: OPEN_STATUSES },
        due_date: { lt: addDays(-30) },
      },
      orderBy: { due_date: "asc" },
      take: 20,
      select: {
        id: true,
        title: true,
        due_date: true,
        status: true,
        entity: { select: { name: true } },
      },
    }),

    prisma.task.findMany({
      where: {
        status: { in: OPEN_STATUSES },
        priority: "HIGH",
        due_date: null,
      },
      take: 20,
      select: {
        id: true,
        title: true,
        priority: true,
        entity: { select: { name: true } },
      },
    }),

    prisma.task.findMany({
      where: {
        status: { in: OPEN_STATUSES },
        assignments: { none: {} },
        is_assigned_to_all: false,
      },
      take: 20,
      select: {
        id: true,
        title: true,
        due_date: true,
        priority: true,
        entity: { select: { name: true } },
      },
    }),

    prisma.task.findMany({
      where: {
        compliance_rule_id: { not: null },
        due_date: null,
        status: { in: OPEN_STATUSES },
      },
      take: 20,
      select: {
        id: true,
        title: true,
        entity: { select: { name: true } },
      },
    }),

    prisma.task.findMany({
      where: {
        status: "PENDING_CLIENT_INPUT",
        updated_at: { lt: addDays(-7) },
      },
      orderBy: { updated_at: "asc" },
      take: 20,
      select: {
        id: true,
        title: true,
        updated_at: true,
        entity: { select: { name: true, primary_phone: true } },
      },
    }),
  ]);

  return {
    tasks_overdue_more_than_30_days: overdue30,
    high_priority_without_due_date: highPriorityNoDue,
    tasks_without_assignee: withoutAssignee,
    compliance_tasks_without_due_date: complianceNoDue,
    tasks_pending_client_input_7plus_days: pendingClientLong,
  };
};

/* -------------------------------------------------------------------------- */
/*                      EMPLOYEE-SCOPED TASK SNAPSHOT                         */
/* -------------------------------------------------------------------------- */

const buildTaskSnapshotEmployee = async (user_id) => {
  const userFilter = {
    OR: [
      { is_assigned_to_all: true },
      { assignments: { some: { admin_user_id: user_id } } },
    ],
  };

  const [
    myTasksOpen,
    myOverdue,
    myToday,
    myNext7,
    myNoDue,
    myHighPriority,
    myOverdueList,
    myTodayList,
    myNext7List,
    myHighPriorityList,
  ] = await Promise.all([
    prisma.task.count({
      where: { status: { in: OPEN_STATUSES }, ...userFilter },
    }),

    prisma.task.count({
      where: {
        status: { in: OPEN_STATUSES },
        due_date: { lt: getToday() },
        ...userFilter,
      },
    }),

    prisma.task.count({
      where: {
        status: { in: OPEN_STATUSES },
        due_date: { gte: getToday(), lte: getTodayEnd() },
        ...userFilter,
      },
    }),

    prisma.task.count({
      where: {
        status: { in: OPEN_STATUSES },
        due_date: { gte: getToday(), lte: addDays(7) },
        ...userFilter,
      },
    }),

    prisma.task.count({
      where: {
        status: { in: OPEN_STATUSES },
        due_date: null,
        ...userFilter,
      },
    }),

    prisma.task.count({
      where: {
        status: { in: OPEN_STATUSES },
        priority: "HIGH",
        ...userFilter,
      },
    }),

    prisma.task.findMany({
      where: {
        status: { in: OPEN_STATUSES },
        due_date: { lt: getToday() },
        ...userFilter,
      },
      orderBy: { due_date: "asc" },
      take: 10,
      select: {
        id: true,
        title: true,
        due_date: true,
        status: true,
        priority: true,
        entity: { select: { name: true, pan: true } },
      },
    }),

    prisma.task.findMany({
      where: {
        status: { in: OPEN_STATUSES },
        due_date: { gte: getToday(), lte: getTodayEnd() },
        ...userFilter,
      },
      orderBy: { priority: "desc" },
      take: 10,
      select: {
        id: true,
        title: true,
        due_date: true,
        status: true,
        priority: true,
        entity: { select: { name: true, pan: true } },
      },
    }),

    prisma.task.findMany({
      where: {
        status: { in: OPEN_STATUSES },
        due_date: { gte: getToday(), lte: addDays(7) },
        ...userFilter,
      },
      orderBy: { due_date: "asc" },
      take: 10,
      select: {
        id: true,
        title: true,
        due_date: true,
        status: true,
        priority: true,
        entity: { select: { name: true, pan: true } },
      },
    }),

    prisma.task.findMany({
      where: {
        status: { in: OPEN_STATUSES },
        priority: "HIGH",
        ...userFilter,
      },
      orderBy: { due_date: "asc" },
      take: 10,
      select: {
        id: true,
        title: true,
        due_date: true,
        status: true,
        priority: true,
        entity: { select: { name: true, pan: true } },
      },
    }),
  ]);

  return {
    cards: {
      my_open_tasks: myTasksOpen,
      my_overdue_tasks: myOverdue,
      my_due_today_tasks: myToday,
      my_due_next_7_days: myNext7,
      my_tasks_without_due_date: myNoDue,
      my_high_priority_tasks: myHighPriority,
    },
    lists: {
      my_overdue_tasks_list: myOverdueList,
      my_due_today_list: myTodayList,
      my_due_next_7_days_list: myNext7List,
      my_high_priority_list: myHighPriorityList,
    },
  };
};

/* -------------------------------------------------------------------------- */
/*                   EMPLOYEE COMPLIANCE SNAPSHOT                             */
/* -------------------------------------------------------------------------- */

const buildComplianceSnapshotEmployee = async (user_id) => {
  const userFilter = {
    OR: [
      { is_assigned_to_all: true },
      { assignments: { some: { admin_user_id: user_id } } },
    ],
  };

  const [total, overdue, due7, dueThisMonth, dueList] = await Promise.all([
    prisma.task.count({
      where: {
        compliance_rule_id: { not: null },
        status: { in: OPEN_STATUSES },
        ...userFilter,
      },
    }),

    prisma.task.count({
      where: {
        compliance_rule_id: { not: null },
        status: { in: OPEN_STATUSES },
        due_date: { lt: getToday() },
        ...userFilter,
      },
    }),

    prisma.task.count({
      where: {
        compliance_rule_id: { not: null },
        status: { in: OPEN_STATUSES },
        due_date: { gte: getToday(), lte: addDays(7) },
        ...userFilter,
      },
    }),

    prisma.task.count({
      where: {
        compliance_rule_id: { not: null },
        status: { in: OPEN_STATUSES },
        due_date: { gte: getMonthStart(), lt: getMonthEnd() },
        ...userFilter,
      },
    }),

    prisma.task.findMany({
      where: {
        compliance_rule_id: { not: null },
        status: { in: OPEN_STATUSES },
        due_date: { gte: getToday(), lte: addDays(30) },
        ...userFilter,
      },
      orderBy: { due_date: "asc" },
      take: 10,
      select: {
        id: true,
        title: true,
        due_date: true,
        status: true,
        entity: { select: { name: true, pan: true } },
      },
    }),
  ]);

  return {
    cards: {
      my_open_compliance_tasks: total,
      my_overdue_compliance_tasks: overdue,
      my_compliance_due_next_7_days: due7,
      my_compliance_due_this_month: dueThisMonth,
    },
    lists: {
      my_upcoming_compliance_tasks: dueList,
    },
  };
};

/* -------------------------------------------------------------------------- */
/*                      EMPLOYEE RECENT ACTIVITY                              */
/* -------------------------------------------------------------------------- */

const buildRecentActivityEmployee = async (user_id) => {
  const userFilter = {
    OR: [
      { is_assigned_to_all: true },
      { assignments: { some: { admin_user_id: user_id } } },
    ],
  };

  const [recentCompliance, recentNonCompliance, recentlyAssigned] =
    await Promise.all([
      prisma.task.findMany({
        where: {
          compliance_rule_id: { not: null },
          ...userFilter,
        },
        orderBy: { created_at: "desc" },
        take: 10,
        select: {
          id: true,
          title: true,
          created_at: true,
          due_date: true,
          status: true,
          entity: { select: { name: true } },
        },
      }),

      prisma.task.findMany({
        where: {
          compliance_rule_id: null,
          ...userFilter,
        },
        orderBy: { created_at: "desc" },
        take: 10,
        select: {
          id: true,
          title: true,
          created_at: true,
          due_date: true,
          status: true,
          entity: { select: { name: true } },
        },
      }),

      prisma.taskAssignment.findMany({
        where: { admin_user_id: user_id },
        orderBy: { assigned_at: "desc" },
        take: 10,
        select: {
          assigned_at: true,
          task: {
            select: {
              id: true,
              title: true,
              status: true,
              due_date: true,
              entity: { select: { name: true } },
            },
          },
          assigner: { select: { name: true } },
        },
      }),
    ]);

  return {
    recent_compliance_tasks: recentCompliance,
    recent_non_compliance_tasks: recentNonCompliance,
    recently_assigned_to_me: recentlyAssigned,
  };
};

/* -------------------------------------------------------------------------- */
/*                     EMPLOYEE ALERTS AND EXCEPTIONS                         */
/* -------------------------------------------------------------------------- */

const buildAlertsAndExceptionsEmployee = async (user_id) => {
  const userFilter = {
    OR: [
      { is_assigned_to_all: true },
      { assignments: { some: { admin_user_id: user_id } } },
    ],
  };

  const [overdue30, pendingClientLong] = await Promise.all([
    prisma.task.findMany({
      where: {
        status: { in: OPEN_STATUSES },
        due_date: { lt: addDays(-30) },
        ...userFilter,
      },
      orderBy: { due_date: "asc" },
      take: 20,
      select: {
        id: true,
        title: true,
        due_date: true,
        status: true,
        entity: { select: { name: true } },
      },
    }),

    prisma.task.findMany({
      where: {
        status: "PENDING_CLIENT_INPUT",
        updated_at: { lt: addDays(-7) },
        ...userFilter,
      },
      orderBy: { updated_at: "asc" },
      take: 20,
      select: {
        id: true,
        title: true,
        updated_at: true,
        entity: { select: { name: true, primary_phone: true } },
      },
    }),
  ]);

  return {
    my_tasks_overdue_more_than_30_days: overdue30,
    my_tasks_pending_client_input_7plus_days: pendingClientLong,
  };
};
