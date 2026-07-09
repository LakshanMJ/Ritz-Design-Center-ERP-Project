import LoginView from "@/views/auth/LoginView";
import { useSelector } from "react-redux";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";

const ProtectedRoute = ({ children }: any) => {
    const { pathname } = useRouter();
    const authState = useSelector((state: any) => state.AuthReducer);
    const isLoggedIn = authState.isLoggedIn;
    const [authChecked, setAuthChecked] = useState(false);

    // prevent flash of content before check
    useEffect(() => {
        setAuthChecked(true);
    }, []);

    if (authChecked) {
        if (!isLoggedIn || pathname === '/auth/login') {
            return <LoginView />
        }

        return children;
    }
}

export default ProtectedRoute;
