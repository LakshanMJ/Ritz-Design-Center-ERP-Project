import { createTheme } from "@mui/material";
import { Typography } from "../typography";
import { Components } from "./components";
import { Palette } from "./palette";

const theme1 = createTheme({
    name: 'theme1',
    typography: Typography,
    palette: Palette,
    components: Components,
    shape: {
        borderRadius: 10
    }
});

// overrides
theme1.shadows[1] = '0px 1px 4px 0px rgba(0,0,0,0.1), 0px 0px 1px 0px rgba(0,0,0,0.1)';

export default theme1;