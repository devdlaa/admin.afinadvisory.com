// components/Permission.js
import { useSelector } from "react-redux";

export default function Permission({
  permission,
  role,
  requireAll = true,
  fallback = null,
  disable = false,
  children,
}) {
  // Select the user directly, without creating a new object
  const user = useSelector((state) => state.session.user);

  // Default to empty array/string if user is null
  const userPermissions = user?.permissions || [];
  const userRole = user?.role || "";

  // Normalize inputs
  const permsToCheck = Array.isArray(permission)
    ? permission
    : permission
    ? [permission]
    : [];
  const rolesToCheck = Array.isArray(role) ? role : role ? [role] : [];

  // Check roles
  const hasRole = rolesToCheck.length === 0 || rolesToCheck.includes(userRole);

  // Check permissions
  const hasPerm =
    permsToCheck.length === 0
      ? true
      : requireAll
      ? permsToCheck.every((p) => userPermissions.includes(p))
      : permsToCheck.some((p) => userPermissions.includes(p));

  const hasAccess = hasRole && hasPerm;

  // Hide if no access and disable=false
  if (!hasAccess && !disable) return fallback ? fallback : null;

  // Disable interactive elements if disable=true
  if (!hasAccess && disable) {
    const disableChildren = (child) => {
      if (!child) return null;
      if (typeof child !== "object") return child;

      const props = {};
      if (
        child.type === "button" ||
        child.type === "input" ||
        child.type === "select"
      ) {
        props.disabled = true;
      }

      if (child.props && child.props.children) {
        return {
          ...child,
          props: {
            ...child.props,
            ...props,
            children: Array.isArray(child.props.children)
              ? child.props.children.map(disableChildren)
              : disableChildren(child.props.children),
          },
        };
      }

      return { ...child, props: { ...child.props, ...props } };
    };

    return Array.isArray(children)
      ? children.map(disableChildren)
      : disableChildren(children);
  }

  // User has access
  return children;
}
