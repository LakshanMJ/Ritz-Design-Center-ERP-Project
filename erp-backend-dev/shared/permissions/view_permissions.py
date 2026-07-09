from rest_framework.permissions import IsAuthenticated

from shared.permissions.roles import ALL_USER_ROLES


class WriteRolesNotDefinedException(Exception):
    pass


class HasPermission(IsAuthenticated):

    def has_permission(self, request, view):
        authenticated = super().has_permission(request, view)

        # If user is not authenticated, don't give them access
        if not authenticated:
            return False

        # If request is of type GET, give them access
        if request.method in ['GET', 'OPTIONS']:
            return True
        has_access = False

        # Check if write_roles property is defined in view. If it is not, throw an exception
        if not getattr(view, 'write_roles', None):
            raise WriteRolesNotDefinedException('Exception raised. write_roles need to be defined at a view level')

        # print(has_access)
        if ALL_USER_ROLES in view.write_roles:
            return True

        # Loop through all the write_roles and check if the user has at least one
        for role in view.write_roles:
            if request.user.has_role(role):
                has_access = True
                break
            elif role == ALL_USER_ROLES:
                has_access = True
                break
        return has_access