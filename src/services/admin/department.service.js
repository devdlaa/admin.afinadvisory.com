import { prisma } from "@/lib/prisma";
import { ConflictError } from "@/utils/server/errors";

const departmentExistsCaseInsensitive = async (name, excludeId = null) => {
  const depts = await prisma.department.findMany({
    select: { id: true, name: true },
  });

  return depts.find(
    (d) =>
      d.name.toLowerCase() === name.toLowerCase() &&
      (!excludeId || d.id !== excludeId)
  );
};

export const createDepartment = async (name) => {
  const exists = await departmentExistsCaseInsensitive(name);
  if (exists) {
    throw new ConflictError("Department with this name already exists");
  }
  return prisma.department.create({ data: { name } });
};

export const listDepartments = () => {
  return prisma.department.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: {
          users: true,
        },
      },
    },
  });
};

export const updateDepartment = async (id, name) => {
  const exists = await departmentExistsCaseInsensitive(name, id);
  if (exists) {
    throw new ConflictError("Department with this name already exists");
  }
  return prisma.department.update({
    where: { id },
    data: { name },
  });
};

export const deleteDepartment = (id) => {
  return prisma.department.delete({ where: { id } });
};
