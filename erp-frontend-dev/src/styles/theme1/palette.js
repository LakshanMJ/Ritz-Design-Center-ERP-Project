import { darken } from "@mui/material";
import { blue, grey } from "@mui/material/colors";

export const Palette = {
    mainBackground: '#f1f5f9',
    sidebar: {
        color: '#b8babe',
        background: '#111827',
        hover: {
            background: '#1d2432',
            color: '#ffffff'
        },
        selected: {
            color: '#ffffff',
            background: '#29303d',
            border: '#748397'
        }
    },
    topbar: {
        background: '#ffffff',
        logo: '#000000',
        color: grey[700],
        boxShadow: '0 2px 4px -1px rgba(0,0,0,.1),0 2px 4px -1px rgba(0,0,0,.06)'
    },
    footer: {
        background: '#e3e9ee',
        color: '#6a7176',
        borderColor: '#d8dfe6'
    },
    primary: {
        main: blue[700]
    },
    secondary: {
        main: grey[600]//'#2F855A'
    },
    mainBorder: darken(grey[300], 0.04)
}
