import { darken } from "@mui/material";
import { blue, grey } from "@mui/material/colors";

export const Palette = {
    mainBackground: grey[50],
    sidebar: {
        color: grey[800],
        background: '#ffffff',
        hover: {
            background: grey[100],
            color: grey[800]
        },
        selected: {
            color: '#000000',
            background: darken(grey[100], 0.02),
            border: '#000000'
        }
    },
    topbar: {
        background: '#13428b',
        color: grey[50],
        logo: '#ffffff',
        boxShadow: 'none'
    },
    footer: {
        background: grey[100],
        color: grey[600],
        borderColor: grey[300]
    },
    primary: {
        main: blue[700]
    },
    secondary: {
        main: grey[600]
    },
    mainBorder: darken(grey[300], 0.04)
}
