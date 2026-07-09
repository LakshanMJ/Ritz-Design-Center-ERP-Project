import '@/styles/globals.scss';
import { Provider } from 'react-redux';
import store from '../states/store';
import Layout from '@/views/layout/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import RoleGuard from '@/components/RoleGuard';
import { AppProps } from 'next/app';
import Toast from '@/components/Toast';
import { useEffect, useState } from 'react';
import { AppThemeProvider } from '@/styles/ThemeContext';

const App = ({ Component, pageProps }: AppProps) => {
    // TEMP- set app states in local storage
    const [theme, setTheme] = useState<null | string>();
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const handleSidebarToggle = (state: boolean) => {
        const appSettings = JSON.parse(localStorage.getItem('appSettings'));
        localStorage.setItem('appSettings', JSON.stringify({
            ...appSettings,
            sidebarOpen: state
        }));
        setSidebarOpen(state);
    }

    useEffect(() => {
        const appSettings = JSON.parse(localStorage.getItem('appSettings'));

        const theme = appSettings && 'theme' in appSettings ? appSettings.theme : 'theme2';
        setTheme(theme);

        if (appSettings && 'sidebarOpen' in appSettings) {
            setSidebarOpen(appSettings?.sidebarOpen);
        }

        localStorage.setItem('appSettings', JSON.stringify({
            ...appSettings,
            sidebarOpen: sidebarOpen,
            theme: theme
        }));
    }, []);

    return (
        theme && (
            <AppThemeProvider savedTheme={theme}>
                <Toast />
                <Provider store={store}>
                    <ProtectedRoute>
                        <Layout sidebarOpen={sidebarOpen} setSidebarOpen={handleSidebarToggle}>
                            <RoleGuard>
                                <Component {...pageProps} />
                            </RoleGuard>
                        </Layout>
                    </ProtectedRoute>
                </Provider>
            </AppThemeProvider>
        )
    )
}

export default App;
