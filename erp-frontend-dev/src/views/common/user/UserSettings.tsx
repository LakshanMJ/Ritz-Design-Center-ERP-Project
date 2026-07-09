import { useAppTheme } from "@/styles/ThemeContext";
import { Box, Button } from "@mui/material";

const UserSettings = () => {
    const { theme, toggleTheme } = useAppTheme();
    const themeName = theme.name;

    return (
        <Box>
            App theme: <Button onClick={toggleTheme}>{themeName === 'theme1' ? 'Theme1' : 'Default'}</Button>
        </Box>
    );
};

export default UserSettings;