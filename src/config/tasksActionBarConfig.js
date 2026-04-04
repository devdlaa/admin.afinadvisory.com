import {  } from "lucide-react";




// Function to generate filter dropdowns config
export const createTaskFilterDropdowns = ({
  entities = [],
  categories = [],
  users = [],
  onEntitySearch = null,
  onAddCategory = null,
}) => [
  {
    filterKey: "entity_id",
    label: "Client",
    placeholder: "Select Client",
    icon: Building2,
    options: entities.map((entity) => ({
      value: entity.id,
      label: entity.name,
      subtitle: entity.pan || entity.email,
    })),
    onSearchChange: onEntitySearch,
    enableLocalSearch: !onEntitySearch,
    emptyStateMessage: "No clients found",
    hintMessage: "Start typing to search clients...",
  },
  {
    filterKey: "task_category_id",
    label: "Category",
    placeholder: "Select Category",
    icon: Tag,
    options: categories.map((cat) => ({
      value: cat.id,
      label: cat.name,
      tag: cat?._count?.tasks || null,
    })),
    enableLocalSearch: true,
    onAddNew: onAddCategory,
    addNewLabel: "New Category",
  },
  {
    filterKey: "assigned_to",
    label: "Users",
    placeholder: "Select User",
    icon: Users,
    options: users.map((user) => ({
      value: user.id,
      label: user.name,
      subtitle: user.email,
      tag: user.status || null,
    })),
    enableLocalSearch: true,
  },
];
