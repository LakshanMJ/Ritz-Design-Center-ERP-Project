import axios from 'axios';
import { REFRESH_TOKEN_EXPIRED, ACCESS_TOKEN_EXPIRED } from '../helpers/constants/Constants';
import { apiBaseURL } from '@/helpers/constants/RestUrls';
import store from '../states/store';
import { setAuthState } from '@/states/Auth/AuthActions';
import Router from 'next/router';
import { AxiosPromise } from 'axios';
import { toast } from 'react-hot-toast';


declare module 'axios' {
    export interface AxiosRequestConfig {
        redirectToErrorPage?: boolean;  // redirect 403 and 404 errors to page not found
    }
}

// const api = axios.create({
//     baseURL: apiBaseURL()
// });

const api = axios.create({
    baseURL: "https://nexa-erp-project.onrender.com/THIS_SHOULD_APPEAR/"
});

api.interceptors.request.use((config) => {
    const session = JSON.parse(localStorage.getItem('session'));
    if (session?.access) {
        config.headers['Authorization'] = `Bearer ${session.access}`;
    } else {
        logout();
    }
    return config;
});

let refreshRequest: AxiosPromise | any = null;

const clearRefreshRequest = () => {
    refreshRequest = null;
};

api.interceptors.response.use(
    (response) => {
        // toast.dismiss();
        return response;
    },
    async (error) => {
        const errorConfig = error?.config;
        const { status, data } = error?.response;

        if (status === 404 && errorConfig?.redirectToErrorPage) {
            Router.replace('/404');
            return Promise.reject(error);
        }

        if (status === 403 && errorConfig?.redirectToErrorPage) {
            Router.replace('/403');
            return Promise.reject(error);
        }

        if (status === 401 && data?.code === REFRESH_TOKEN_EXPIRED) {
            logout();
            return Promise.reject(error);
        }

        if (status === 401 && data?.code === ACCESS_TOKEN_EXPIRED && !errorConfig._retry) {
            errorConfig._retry = true;

            if (!refreshRequest) {
                refreshRequest = refreshToken().finally(clearRefreshRequest);
            }

            try {
                const token = await refreshRequest;
                errorConfig.headers['Authorization'] = `Bearer ${token}`;

                // RETRY WITH NEW TOKEN ===========================================================
                try {
                    return await axios(errorConfig);
                } catch (retryErr: any) {
                    const config = retryErr?.config;
                    const status = retryErr?.response?.status;

                    if (status === 404 && config?.redirectToErrorPage) {
                        Router.replace('/404');
                        return Promise.reject(retryErr);
                    }

                    if (status === 403 && config?.redirectToErrorPage) {
                        Router.replace('/403');
                        return Promise.reject(retryErr);
                    }

                    return Promise.reject(retryErr);
                }
                // ================================================================================
            } catch (refreshErr: any) {
                // Refresh token request failed
                logout();
                return Promise.reject(refreshErr);
            }
        }

        return Promise.reject(error);
    }
);

const refreshToken = async () => {
    try {
        const session = JSON.parse(localStorage.getItem('session'));
        const refreshToken = session?.refresh;

        const resp = await api.post('/shared/token/refresh/', { refresh: refreshToken });
        const respData = resp?.data || {};
        const accessToken = respData?.access;

        if (accessToken) {
            // Store in local storage
            const session = { access: accessToken, refresh: refreshToken };
            localStorage.setItem('session', JSON.stringify(session));

            return accessToken;
        }
    } catch (error) {
        throw error;
    }
}

export const logout = () => {
    store.dispatch(setAuthState({ isLoggedIn: false }));
    localStorage.removeItem('session');
    Router.replace('/auth/login');
}

export const login = async (username: string, password: string) => {
    try {
        const resp = await api.post('shared/user/authenticate/', { username: username, password: password });

        // const resp = await api.post("HELLO_TEST/", {
        //     username,
        //     password,
        // });

        const respData = resp?.data || {};

        if (respData.access) {
            localStorage.setItem('session', JSON.stringify(respData));

            try {
                const resp = await api.get('/shared/user/info/');
                const respData = resp?.data || {};
                localStorage.setItem('authUser', JSON.stringify(respData));

                store.dispatch(setAuthState({ isLoggedIn: true, authUser: respData }));

                return { success: true };
            } catch (error) {
                throw error;
            }
        }
    } catch (error) {
        throw error;
    }
}

export default api;
