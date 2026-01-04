import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const PERMISSIONS = [
  {
    id: "admin_users.access",
    label: "Access Admin Users (Read only)",
    category: "Admin Users",
  },
  {
    id: "admin_users.create",
    label: "Create Admin Users",
    category: "Admin Users",
  },
  {
    id: "admin_users.update",
    label: "Update Admin Users",
    category: "Admin Users",
  },
  {
    id: "admin_users.delete",
    label: "Delete Admin Users",
    category: "Admin Users",
  },
  {
    id: "admin_users.manage",
    label: "Manage Admin User Operations",
    category: "Admin Users",
  },
  {
    id: "entities.access",
    label: "Access Entities (Read only)",
    category: "Entities",
  },
  {
    id: "entities.delete",
    label: "Delete Entities",
    category: "Entities",
  },
  {
    id: "entities.manage",
    label: "Create/Update Entities",
    category: "Entities",
  },
  {
    id: "tasks.access",
    label: "Access Tasks (Read only)",
    category: "Tasks",
  },
  {
    id: "tasks.manage",
    label: "Create/Update Tasks",
    category: "Tasks",
  },
  {
    id: "tasks.delete",
    label: "Delete Tasks",
    category: "Tasks",
  },
  {
    id: "task_assignments.manage",
    label: "Assign or Reassign Tasks to Users",
    category: "Task Assignments",
  },
  {
    id: "bookings.access",
    label: "Access Bookings",
    category: "Bookings",
  },
  {
    id: "bookings.create_new_link",
    label: "Create New Payment Link",
    category: "Bookings",
  },
  {
    id: "payment_link.access",
    label: "Access to Payment Links",
    category: "Bookings",
  },
  {
    id: "bookings.reject_refund",
    label: "Reject Booking Refunds",
    category: "Bookings",
  },
  {
    id: "bookings.initiate_refund",
    label: "Initiate Booking Refunds",
    category: "Bookings",
  },
  {
    id: "bookings.assign_member",
    label: "Assign Members to Bookings",
    category: "Bookings",
  },
  {
    id: "bookings.mark_fulfilled",
    label: "Mark Bookings As Fulfilled",
    category: "Bookings",
  },
  {
    id: "bookings.unmark_fulfilled",
    label: "Un-Mark Bookings As Fulfilled",
    category: "Bookings",
  },
  {
    id: "service_pricing.access",
    label: "Access Service Pricing ",
    category: "Service Pricing",
  },
  {
    id: "service_pricing.update",
    label: "Update Service Pricing",
    category: "Service Pricing",
  },
  {
    id: "payments.access",
    label: "Access Payments ",
    category: "Payments",
  },
  {
    id: "influencers.access",
    label: "Access Influencers ",
    category: "Influencers",
  },
  {
    id: "influencers.create",
    label: "Create Influencers",
    category: "Influencers",
  },
  {
    id: "influencers.update",
    label: "Update Influencers",
    category: "Influencers",
  },
  {
    id: "influencers.delete",
    label: "Delete Influencers",
    category: "Influencers",
  },
  {
    id: "customers.access",
    label: "Access Customers ",
    category: "Customers",
  },
  {
    id: "customers.create",
    label: "Create Customers",
    category: "Customers",
  },
  {
    id: "customers.update",
    label: "Update Customers",
    category: "Customers",
  },
  {
    id: "commissions.access",
    label: "Access Commissions ",
    category: "Commissions",
  },
  {
    id: "commissions.update_paid_status",
    label: "Update Paid Status",
    category: "Commissions",
  },
  {
    id: "coupons.access",
    label: "Access Coupons ",
    category: "Coupons",
  },
  {
    id: "coupons.create",
    label: "Create Coupons",
    category: "Coupons",
  },
  {
    id: "coupons.update",
    label: "Update Coupons",
    category: "Coupons",
  },
  {
    id: "coupons.delete",
    label: "Delete Coupons",
    category: "Coupons",
  },
  {
    id: "firm.access",
    label: "Access Task Managment Dashboard",
    category: "Firm",
  },
  {
    id: "tasks.charge.manage",
    label: "Add/Delete/Update Task Charges",
    category: "Tasks",
  },
];

async function main() {
  for (const p of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: p.id }, // use your string id as code
      create: {
        code: p.id, // save there
        label: p.label,
        category: p.category,
      },
      update: {
        label: p.label,
        category: p.category,
      },
    });
  }

  console.log("Permissions seeded with id + label + category");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
