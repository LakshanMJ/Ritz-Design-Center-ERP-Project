import { createContext, useContext, useEffect, useState } from 'react';
import { ThemeProvider } from '@mui/material';
import theme1 from './theme1/theme1';
import theme2 from './theme2/theme2';

const ThemeContext = createContext();

export const useAppTheme = () => {
    return useContext(ThemeContext);
};

export const AppThemeProvider = ({ savedTheme, children }) => {
    const [theme, setTheme] = useState();

    const toggleTheme = () => {
        setTheme((prevTheme) => {
            const newTheme = prevTheme === theme1 ? theme2 : theme1;

            const appSettings = JSON.parse(localStorage.getItem('appSettings'));
            localStorage.setItem('appSettings', JSON.stringify({
                ...appSettings,
                theme: newTheme.name
            }));

            return newTheme;
        });
    };

    useEffect(() => {
        setTheme(savedTheme === 'theme1' ? theme1 : theme2);
    }, [savedTheme]);

    return (
        (savedTheme && theme) && (
            <ThemeContext.Provider value={{ theme, toggleTheme }}>
                <ThemeProvider theme={theme}>
                    {children}
                </ThemeProvider>
            </ThemeContext.Provider>
        )
    )
}
