import type { Theme } from '@mui/material/styles';

declare module '@mui/material/styles' {
    type Overrides = typeof globalThemeOverrides;

    interface Theme extends Overrides {
        palette: Theme['palette'] & {
            custom: {};
        }
    }
}
