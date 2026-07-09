import NavItems from "@/views/layout/nav/NavItems";
import { useSelector } from "react-redux";
import PageNotAllow from "@/views/error/PageNotAllow";
import { useRouter } from "next/router";
import { UnprotectedRoutes } from "@/helpers/constants/UnprotectedRoutes";
import * as ROLES from "@/helpers/constants/RoleManager";

const RoleGuard = ({ children }: any) => {
    const authState = useSelector((state: any) => state.AuthReducer);
    const authUser = authState.authUser;
    const userRoles = (authUser?.role_set || []).map((i: any) => i.name);
    const router = useRouter();
    const { pathname, isFallback } = router;   // isFallback returns true for 404
    const navItems = NavItems().map((i: any) => ({ allow_roles: i.allow_roles, url: i.url, children: i.children, selected: i.selected }));
    const currentPage = navItems.find((i: any) => i.selected || i.children?.find((j: any) => j.selected));
    const pageRoles = currentPage?.allow_roles || [];
    const isAllowed = userRoles.some((role: string) => pageRoles.includes(role));
    const isUnprotected = UnprotectedRoutes.includes(pathname);


    // Redirect based on role
    if (pathname === '/') {
        if (userRoles.includes(ROLES.MERCHANT)) {
            router.replace('/costing');
        } else if (userRoles.includes(ROLES.CAD_USER_ROLE)) {
            router.replace('/costing/cad');
        } else if (userRoles.includes(ROLES.IE_USER)) {
            router.replace('/ie_interface/item_operation');
        }
        return;
    }

    if (!isFallback && !isUnprotected && !isAllowed) {
        return <PageNotAllow />
    }

    return children;
}

export default RoleGuard;